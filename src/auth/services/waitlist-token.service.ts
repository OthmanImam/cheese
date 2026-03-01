import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, createHash, timingSafeEqual, randomBytes } from 'crypto';
import { WaitlistReservation, WaitlistStatus } from '../../waitlist/entities/waitlist-reservation.entity';
import { InvalidWaitlistTokenException } from '../../common/exceptions/auth.exceptions';

export interface WaitlistContinuationPayload {
  email: string;
  username: string;
  reservationId: string;
}

const TOKEN_TTL_DAYS = 7;

@Injectable()
export class WaitlistTokenService {
  private readonly logger = new Logger(WaitlistTokenService.name);

  constructor(
    @InjectRepository(WaitlistReservation)
    private readonly reservationRepo: Repository<WaitlistReservation>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue a signed continuation token for a waitlist reservation.
   *
   * Format:  base64url(jsonPayload).hex(hmac-sha256)
   * HMAC key: WAITLIST_TOKEN_SECRET from environment.
   *
   * The raw token lives only in the email link.
   * We store its SHA-256 hash in the DB.
   */
  async issue(reservationId: string): Promise<string> {
    const reservation = await this.reservationRepo.findOneOrFail({
      where: { id: reservationId },
    });

    if (reservation.status === WaitlistStatus.CONVERTED) {
      throw new Error('Reservation already converted');
    }

    const expiresAt = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60_000);
    const nonce     = randomBytes(16).toString('hex');

    const payloadObj = {
      rid:   reservation.id,
      em:    reservation.email,
      un:    reservation.username,
      exp:   Math.floor(expiresAt.getTime() / 1000),
      iat:   Math.floor(Date.now() / 1000),
      nonce,
    };

    const payloadB64 = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const sig        = this.sign(payloadB64);
    const rawToken   = `${payloadB64}.${sig}`;

    reservation.continuationTokenHash = createHash('sha256').update(rawToken).digest('hex');
    reservation.tokenExpiresAt = expiresAt;
    reservation.status         = WaitlistStatus.NOTIFIED;
    reservation.notifiedAt     = new Date();

    await this.reservationRepo.save(reservation);
    this.logger.log(`Continuation token issued [reservationId=${reservationId}]`);

    return rawToken;
  }

  /**
   * Verify and decode a continuation token.
   * - HMAC integrity check (timing-safe)
   * - Expiry check
   * - DB hash match (timing-safe)
   * - Reservation status check
   */
  async verify(rawToken: string): Promise<WaitlistContinuationPayload> {
    const parts = rawToken.split('.');
    if (parts.length !== 2) throw new InvalidWaitlistTokenException();
    const [payloadB64, providedSig] = parts;

    // ── Step 1: HMAC integrity ─────────────────────────────────────────────
    const expectedSig = this.sign(payloadB64);
    if (!this.safeCompareHex(providedSig, expectedSig)) {
      throw new InvalidWaitlistTokenException();
    }

    // ── Step 2: Decode payload ─────────────────────────────────────────────
    let obj: any;
    try {
      obj = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new InvalidWaitlistTokenException();
    }

    // ── Step 3: Expiry ─────────────────────────────────────────────────────
    if (Math.floor(Date.now() / 1000) > obj.exp) {
      throw new InvalidWaitlistTokenException();
    }

    // ── Step 4: DB hash match ──────────────────────────────────────────────
    const reservation = await this.reservationRepo.findOne({ where: { id: obj.rid } });
    if (!reservation || !reservation.continuationTokenHash) {
      throw new InvalidWaitlistTokenException();
    }
    if (reservation.status === WaitlistStatus.CONVERTED) {
      throw new InvalidWaitlistTokenException();
    }

    const incomingHash = createHash('sha256').update(rawToken).digest('hex');
    if (!this.safeCompareHex(incomingHash, reservation.continuationTokenHash)) {
      throw new InvalidWaitlistTokenException();
    }

    return { email: obj.em, username: obj.un, reservationId: obj.rid };
  }

  async markConverted(reservationId: string, userId: string): Promise<void> {
    await this.reservationRepo.update(reservationId, {
      status:                WaitlistStatus.CONVERTED,
      convertedAt:           new Date(),
      convertedUserId:       userId,
      continuationTokenHash: null, // Invalidate — one-time use
    });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private sign(data: string): string {
    const secret = this.config.getOrThrow<string>('WAITLIST_TOKEN_SECRET');
    return createHmac('sha256', secret).update(data).digest('hex');
  }

  private safeCompareHex(a: string, b: string): boolean {
    try {
      if (a.length !== b.length) return false;
      return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }
}
