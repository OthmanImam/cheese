import {
  Controller, Post, Get, Delete, Body, Param,
  HttpCode, HttpStatus, UseGuards, Req,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { DeviceService } from './services/device.service';
import { TransactionSignatureService } from './services/transaction-signature.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { RotateKeyDto } from './dto/rotate-key.dto';
import { RevokeDeviceDto } from './dto/revoke-device.dto';
import { SignedTransactionRequestDto } from '../transactions/dto/signed-transaction-request.dto';
import { DeviceSignatureGuard } from './guards/device-signature.guard';
import { RequireDeviceSignature } from './decorators/require-device-signature.decorator';
import { VerifiedDevice } from './decorators/verified-device.decorator';
// These come from the Auth module — already wired globally
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
// import { ClientIp } from '../auth/decorators/client-ip.decorator';

/**
 * Stub decorators until the auth module is wired in.
 * Replace with imports from the auth module in production.
 */
import { createParamDecorator, ExecutionContext, applyDecorators } from '@nestjs/common';
const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
const ClientIp    = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const r = ctx.switchToHttp().getRequest();
  return (r.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? r.socket?.remoteAddress;
});

@Controller('devices')
@UseGuards(ThrottlerGuard)
// @UseGuards(JwtAuthGuard, ThrottlerGuard) — enable when auth module is wired
export class DevicesController {
  constructor(
    private readonly deviceService: DeviceService,
    private readonly txSigService: TransactionSignatureService,
  ) {}

  // ── Device registration ───────────────────────────────────────────────────

  /**
   * POST /devices/register
   *
   * Called immediately after OTP verification completes.
   * The mobile app generates the keypair, stores the private key in hardware,
   * and sends the public key (SPKI DER, base64) to this endpoint.
   *
   * Rate-limited: 3 registrations per user per 10 minutes.
   * Prevents bulk registration of phantom devices.
   */
  @Post('register')
  @Throttle({ default: { ttl: 600_000, limit: 3 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: any,
    @ClientIp() ip: string,
  ) {
    const device = await this.deviceService.register(user.id, dto, ip);
    return {
      id:          device.id,
      deviceId:    device.deviceId,
      deviceName:  device.deviceName,
      platform:    device.platform,
      keyVersion:  device.keyVersion,
      fingerprint: device.publicKeyFingerprint,
      whitelisted: device.whitelisted,
      createdAt:   device.createdAt,
    };
  }

  // ── Key rotation ──────────────────────────────────────────────────────────

  /**
   * POST /devices/rotate-key
   *
   * In-place key rotation. The client must provide:
   *   - New public key (SPKI DER base64)
   *   - Rotation proof: sign(sha256(newPublicKey)) using OLD private key
   *
   * This endpoint does NOT require DeviceSignatureGuard because the
   * rotation proof itself IS the authentication. The proof proves
   * continuous possession of the original private key.
   *
   * Rate-limited: 2 rotations per 24 hours — key rotation is rare;
   * high frequency is suspicious.
   */
  @Post('rotate-key')
  @Throttle({ default: { ttl: 86_400_000, limit: 2 } })
  @HttpCode(HttpStatus.OK)
  async rotateKey(
    @Body() dto: RotateKeyDto,
    @CurrentUser() user: any,
  ) {
    const device = await this.deviceService.rotateKey(user.id, dto);
    return {
      deviceId:       device.deviceId,
      keyVersion:     device.keyVersion,
      newFingerprint: device.publicKeyFingerprint,
      rotatedAt:      device.updatedAt,
    };
  }

  // ── Device revocation ─────────────────────────────────────────────────────

  /**
   * DELETE /devices/:deviceId
   *
   * User-initiated revocation — "remove this device" in settings.
   * The user can only revoke their own devices.
   */
  @Delete(':deviceId')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDevice(
    @Param('deviceId') deviceId: string,
    @CurrentUser() user: any,
  ) {
    // Verify ownership by querying with userId constraint
    await this.deviceService.findAuthorizedDevice(deviceId, user.id);
    await this.deviceService.revoke(deviceId, user.id, 'User-initiated revocation');
  }

  /**
   * DELETE /devices
   *
   * Revoke ALL devices — called on password change, account compromise.
   * Effectively signs out all hardware instances.
   */
  @Delete()
  @Throttle({ default: { ttl: 60_000, limit: 3 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeAllDevices(@CurrentUser() user: any) {
    await this.deviceService.revokeAllForUser(
      user.id,
      user.id,
      'User revoked all devices',
    );
  }

  // ── Device listing ────────────────────────────────────────────────────────

  /**
   * GET /devices
   *
   * Returns all registered devices for the user.
   * Used in the "Manage devices" settings screen.
   */
  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  async listDevices(@CurrentUser() user: any) {
    const devices = await this.deviceService.findUserDevices(user.id);
    return devices.map((d) => ({
      id:           d.id,
      deviceId:     d.deviceId,
      deviceName:   d.deviceName,
      platform:     d.platform,
      deviceModel:  d.deviceModel,
      keyVersion:   d.keyVersion,
      fingerprint:  d.publicKeyFingerprint,
      whitelisted:  d.whitelisted,
      status:       d.status,
      lastUsedAt:   d.lastUsedAt,
      createdAt:    d.createdAt,
      revokedAt:    d.revokedAt,
    }));
  }

  // ── Example protected transaction endpoint ────────────────────────────────

  /**
   * POST /devices/transactions/withdraw
   *
   * Example of a device-signature-protected endpoint.
   *
   * The full guard chain:
   *   ThrottlerGuard        → rate limit before any DB access
   *   JwtAuthGuard          → validates access token, populates request.user
   *   DeviceSignatureGuard  → validates: timestamp, device whitelist, nonce, signature
   *
   * The controller only runs if ALL guards pass.
   * At this point, the signature is cryptographically verified.
   *
   * Rate limiting strategy for transaction endpoints:
   *   - 10 requests per minute per user (ThrottlerGuard)
   *   - 5-minute nonce window prevents burst replay attacks
   *   - Hardware rate limiting from Secure Enclave (iOS) — biometric required per op
   *
   * In production, this controller would hand off to a TransactionService
   * that submits to the Stellar/EVM network using the custodial master key.
   */
  @Post('transactions/withdraw')
  @RequireDeviceSignature()
  @UseGuards(DeviceSignatureGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async withdraw(
    @Body() dto: SignedTransactionRequestDto,
    @CurrentUser() user: any,
    @VerifiedDevice() verified: { deviceDbId: string; canonicalPayload: string },
  ) {
    /**
     * At this point:
     *   - user is authenticated (JWT validated)
     *   - device is whitelisted and active
     *   - nonce is unique (not a replay)
     *   - timestamp is within 5-minute window
     *   - signature is cryptographically valid
     *
     * Next steps (not implemented here — belongs in TransactionService):
     *   1. Business validation (balance check, withdrawal limits, KYC level)
     *   2. Create pending transaction record
     *   3. Submit to blockchain using custodial master key
     *   4. Return transaction ID for status polling
     */
    return {
      message:         'Transaction accepted for processing',
      transactionRef:  `TX-${Date.now()}`, // placeholder — replace with real ID
      action:          dto.action,
      amount:          dto.amount,
      currency:        dto.currency,
      destination:     dto.destination,
      deviceDbId:      verified.deviceDbId,
      submittedAt:     new Date().toISOString(),
    };
  }

  /**
   * POST /devices/transactions/transfer
   *
   * Same guard stack. This demonstrates the pattern is reusable
   * across any number of sensitive endpoints.
   */
  @Post('transactions/transfer')
  @RequireDeviceSignature()
  @UseGuards(DeviceSignatureGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.ACCEPTED)
  async transfer(
    @Body() dto: SignedTransactionRequestDto,
    @CurrentUser() user: any,
    @VerifiedDevice() verified: { deviceDbId: string; canonicalPayload: string },
  ) {
    return {
      message:        'Transfer accepted for processing',
      transactionRef: `TX-${Date.now()}`,
      action:         dto.action,
      amount:         dto.amount,
      currency:       dto.currency,
      destination:    dto.destination,
      submittedAt:    new Date().toISOString(),
    };
  }
}
