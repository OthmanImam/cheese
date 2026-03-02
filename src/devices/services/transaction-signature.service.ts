import { Injectable, Logger } from '@nestjs/common';
import { SignedTransactionRequestDto } from '../../transactions/dto/signed-transaction-request.dto';
import { DeviceService } from './device.service';
import { SignatureVerifierService } from './signature-verifier.service';
import { NonceService } from './nonce.service';
import {
  RequestExpiredException,
  DeviceNotFoundException,
  DeviceNotAuthorizedException,
} from '../../common/exceptions/device.exceptions';

const SIGNATURE_WINDOW_SECONDS = 300; // 5 minutes — must match client contract

export interface VerifiedTransactionContext {
  /** DB UUID of the device (not the hardware deviceId) */
  deviceDbId: string;
  userId: string;
  /** The canonical payload that was successfully verified */
  canonicalPayload: string;
}

@Injectable()
export class TransactionSignatureService {
  private readonly logger = new Logger(TransactionSignatureService.name);

  constructor(
    private readonly deviceService: DeviceService,
    private readonly verifier: SignatureVerifierService,
    private readonly nonceService: NonceService,
  ) {}

  /**
   * Full verification pipeline for a signed transaction request.
   *
   * Checks in order (fail-fast, cheapest first):
   *   1. Timestamp freshness          — no DB access needed
   *   2. Device exists + whitelisted  — single indexed lookup
   *   3. Nonce uniqueness             — indexed INSERT (throws on duplicate)
   *   4. Signature validity           — CPU-intensive, done last
   *
   * On success, updates signatureCount + lastUsedAt (non-blocking).
   * Returns context object for the calling service to use.
   */
  async verify(
    dto: SignedTransactionRequestDto,
    userId: string,
  ): Promise<VerifiedTransactionContext> {
    // ── Step 1: Timestamp freshness ──────────────────────────────────────
    const nowSeconds = Math.floor(Date.now() / 1000);
    const age = Math.abs(nowSeconds - dto.timestamp);

    if (age > SIGNATURE_WINDOW_SECONDS) {
      this.logger.warn(
        `Expired signed request [deviceId=${dto.deviceId}]` +
        ` [age=${age}s] [window=${SIGNATURE_WINDOW_SECONDS}s]`,
      );
      throw new RequestExpiredException();
    }

    // ── Step 2: Device authorization ─────────────────────────────────────
    const device = await this.deviceService.findAuthorizedDevice(dto.deviceId, userId);

    // ── Step 3: Nonce claim (replay prevention) ───────────────────────────
    // This INSERT will throw NonceReplayException if nonce was already seen.
    await this.nonceService.claim({
      nonce:    dto.nonce,
      deviceId: device.id,
      userId,
      action:   dto.action,
    });

    // ── Step 4: Signature verification ────────────────────────────────────
    const canonicalPayload = this.verifier.buildCanonicalPayload({
      action:      dto.action,
      amount:      dto.amount,
      currency:    dto.currency,
      destination: dto.destination,
      nonce:       dto.nonce,
      timestamp:   dto.timestamp,
      userId,
    });

    // Throws InvalidSignatureException on failure — not a boolean
    this.verifier.verify({
      canonicalPayload,
      signature:        dto.signature,
      publicKeySpkiB64: device.publicKey,
      algorithm:        device.keyAlgorithm,
    });

    // ── Audit (non-blocking) ──────────────────────────────────────────────
    void this.deviceService.recordSignatureUse(device.id);

    this.logger.log(
      `Signature verified [deviceId=${dto.deviceId}] [userId=${userId}]` +
      ` [action=${dto.action}] [amount=${dto.amount}${dto.currency}]`,
    );

    return {
      deviceDbId:      device.id,
      userId,
      canonicalPayload,
    };
  }
}
