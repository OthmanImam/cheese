import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device, DeviceStatus } from '../entities/device.entity';
import { RegisterDeviceDto } from '../dto/register-device.dto';
import { RotateKeyDto } from '../dto/rotate-key.dto';
import { RevokeDeviceDto } from '../dto/revoke-device.dto';
import { SignatureVerifierService } from './signature-verifier.service';
import {
  DeviceNotFoundException,
  DeviceAlreadyRegisteredException,
  DeviceNotAuthorizedException,
  KeyRotationProofInvalidException,
  InvalidPublicKeyException,
} from '../../common/exceptions/device.exceptions';

@Injectable()
export class DeviceService {
  private readonly logger = new Logger(DeviceService.name);

  constructor(
    @InjectRepository(Device)
    private readonly deviceRepo: Repository<Device>,
    private readonly verifier: SignatureVerifierService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Register a device's public key after OTP verification completes.
   *
   * We validate the SPKI blob before persisting — an invalid key
   * that passes registration and then fails verification on every
   * transaction request is worse than failing loudly here.
   *
   * Re-registration (same deviceId, same userId) is rejected.
   * If a user reinstalls the app, they must revoke and re-register,
   * or call rotateKey() with proof of possession of the old key.
   */
  async register(userId: string, dto: RegisterDeviceDto, ip?: string): Promise<Device> {
    // ── Validate public key before storing ────────────────────────────────
    this.verifier.validatePublicKey(dto.publicKey, dto.keyAlgorithm);

    // ── Check for existing registration ──────────────────────────────────
    const existing = await this.deviceRepo.findOne({
      where: { deviceId: dto.deviceId },
    });

    if (existing) {
      if (existing.userId !== userId) {
        // Different user claiming the same hardware ID — could be legitimate
        // (shared device) or suspicious. We reject to prevent account takeover.
        this.logger.warn(
          `Device ID claimed by different user [deviceId=${dto.deviceId}]` +
          ` [existingUser=${existing.userId}] [requestingUser=${userId}]`,
        );
        throw new DeviceAlreadyRegisteredException();
      }

      if (existing.status === DeviceStatus.ACTIVE) {
        throw new DeviceAlreadyRegisteredException();
      }

      // Device was revoked — allow re-registration of same hardware
      this.logger.log(`Re-registering previously revoked device [deviceId=${dto.deviceId}]`);
    }

    const fingerprint = this.verifier.computeFingerprint(dto.publicKey);

    const device = this.deviceRepo.create({
      userId,
      deviceId:             dto.deviceId,
      deviceName:           dto.deviceName,
      platform:             dto.platform,
      osVersion:            dto.osVersion ?? null,
      appVersion:           dto.appVersion ?? null,
      deviceModel:          dto.deviceModel ?? null,
      publicKey:            dto.publicKey,
      keyAlgorithm:         dto.keyAlgorithm,
      keyVersion:           1,
      publicKeyFingerprint: fingerprint,
      whitelisted:          true,
      status:               DeviceStatus.ACTIVE,
      registrationIp:       ip ?? null,
    });

    const saved = await this.deviceRepo.save(device);
    this.logger.log(
      `Device registered [id=${saved.id}] [userId=${userId}]` +
      ` [fingerprint=${fingerprint.slice(0, 16)}...]`,
    );
    return saved;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Key Rotation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Rotate the device's signing key in-place.
   *
   * Security invariant: to rotate a key, you must prove possession of the
   * OLD private key by signing sha256(newPublicKey) with it.
   * This closes the window where an attacker who intercepts the rotation
   * request could substitute their own public key.
   *
   * After rotation:
   *   - keyVersion is incremented
   *   - The signature guard accepts keyVersion N and N-1 for 60 seconds
   *     (ROTATION_GRACE_SECONDS) to allow in-flight requests to drain
   *   - After the grace window, old-key signatures are rejected
   *
   * Grace period implementation is in DeviceSignatureGuard.
   */
  async rotateKey(userId: string, dto: RotateKeyDto): Promise<Device> {
    const device = await this.findAuthorizedDevice(dto.deviceId, userId);

    // ── Validate the new public key ───────────────────────────────────────
    this.verifier.validatePublicKey(dto.newPublicKey, dto.newKeyAlgorithm);

    // ── Verify rotation proof of possession ──────────────────────────────
    // Client signed sha256(newPublicKey bytes) with the OLD private key
    const newKeyDigest = Buffer.from(dto.newPublicKey, 'utf8');
    const canonicalForProof = JSON.stringify({ newPublicKey: dto.newPublicKey });

    try {
      this.verifier.verify({
        canonicalPayload:  canonicalForProof,
        signature:         dto.rotationProofSignature,
        publicKeySpkiB64:  device.publicKey,         // OLD key
        algorithm:         device.keyAlgorithm,
      });
    } catch {
      this.logger.warn(`Key rotation proof failed [deviceId=${dto.deviceId}]`);
      throw new KeyRotationProofInvalidException();
    }

    const newFingerprint = this.verifier.computeFingerprint(dto.newPublicKey);

    await this.deviceRepo.update(device.id, {
      publicKey:            dto.newPublicKey,
      keyAlgorithm:         dto.newKeyAlgorithm,
      keyVersion:           device.keyVersion + 1,
      publicKeyFingerprint: newFingerprint,
    });

    this.logger.log(
      `Key rotated [deviceId=${dto.deviceId}] [userId=${userId}]` +
      ` [newVersion=${device.keyVersion + 1}] [fingerprint=${newFingerprint.slice(0, 16)}...]`,
    );

    return this.deviceRepo.findOneOrFail({ where: { id: device.id } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Revocation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Revoke a device — prevents it from initiating any further transactions.
   * Revocation is permanent for the current key; the user must re-register
   * (which issues a new key version from scratch).
   *
   * Call sites:
   *   - User: "sign out on all devices" or "remove device" in settings
   *   - Admin: manual revocation via admin API
   *   - Risk engine: automated revocation on anomaly detection
   */
  async revoke(
    deviceId: string,
    revokedBy: string,
    reason?: string,
  ): Promise<void> {
    const device = await this.deviceRepo.findOne({ where: { deviceId } });
    if (!device) throw new DeviceNotFoundException();

    await this.deviceRepo.update(device.id, {
      whitelisted:      false,
      status:           DeviceStatus.REVOKED,
      revokedAt:        new Date(),
      revocationReason: reason ?? 'Revoked by request',
      revokedBy,
    });

    this.logger.warn(
      `Device revoked [deviceId=${deviceId}] [by=${revokedBy}] [reason=${reason}]`,
    );
  }

  /** Revoke all devices for a user — called on "sign out everywhere" or security events */
  async revokeAllForUser(userId: string, revokedBy: string, reason: string): Promise<number> {
    const result = await this.deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({
        whitelisted:      false,
        status:           DeviceStatus.REVOKED,
        revokedAt:        new Date(),
        revocationReason: reason,
        revokedBy,
      })
      .where('userId = :userId AND status = :status', {
        userId,
        status: DeviceStatus.ACTIVE,
      })
      .execute();

    const count = result.affected ?? 0;
    this.logger.warn(`Revoked ${count} devices [userId=${userId}] [reason=${reason}]`);
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  async findByDeviceId(deviceId: string): Promise<Device | null> {
    return this.deviceRepo.findOne({ where: { deviceId } });
  }

  async findUserDevices(userId: string): Promise<Device[]> {
    return this.deviceRepo.find({
      where: { userId },
      order: { lastUsedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAuthorizedDevice(deviceId: string, userId: string): Promise<Device> {
    const device = await this.deviceRepo.findOne({ where: { deviceId, userId } });

    if (!device) throw new DeviceNotFoundException();
    if (!device.isAuthorized) throw new DeviceNotAuthorizedException();

    return device;
  }

  /** Record a successful signature use — fire-and-forget, non-blocking */
  async recordSignatureUse(deviceId: string): Promise<void> {
    await this.deviceRepo
      .createQueryBuilder()
      .update(Device)
      .set({
        signatureCount: () => 'signature_count + 1',
        lastUsedAt: new Date(),
      })
      .where('id = :id', { id: deviceId })
      .execute();
  }
}
