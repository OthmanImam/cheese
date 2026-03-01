import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from '../../tokens/entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';
import { JwtAccessPayload, JwtRefreshPayload } from '../types/jwt-payload.interface';
import { TokenPair } from '../types/auth-response.interface';
import {
  TokenExpiredException,
  RefreshTokenReplayException,
} from '../../common/exceptions/auth.exceptions';

const ACCESS_TTL_SECONDS  = 15 * 60;       // 15 min
const REFRESH_TTL_SECONDS = 7 * 24 * 3600; // 7 days

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Issue a fresh access + refresh token pair.
   * Refresh token is an opaque random string — only its SHA-256 hash is stored.
   * The access token is a short-lived JWT signed with the access secret.
   */
  async issuePair(
    user: User,
    context?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair> {
    // ── Access token ──────────────────────────────────────────────────────
    const accessPayload: JwtAccessPayload = {
      sub:      user.id,
      email:    user.email,
      username: user.username,
      tier:     user.tier,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret:    this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: ACCESS_TTL_SECONDS,
    });

    // ── Refresh token ─────────────────────────────────────────────────────
    // Opaque 64-byte random hex string — not a JWT
    const rawToken  = randomBytes(64).toString('hex');
    const tokenHash = this.hash(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TTL_SECONDS * 1000);

    const record = this.rtRepo.create({
      userId:       user.id,
      tokenHash,
      issuedFromIp: context?.ip ?? null,
      userAgent:    context?.userAgent ?? null,
      expiresAt,
    });

    const saved = await this.rtRepo.save(record);

    // Embed DB record ID as `jti` in a signed wrapper — O(1) revocation lookup
    const refreshPayload: JwtRefreshPayload = { sub: user.id, jti: saved.id };
    const signedRefresh = this.jwtService.sign(refreshPayload, {
      secret:    this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: REFRESH_TTL_SECONDS,
    });

    // Update stored hash to be the hash of the *signed JWT* (what we'll receive on rotation)
    await this.rtRepo.update(saved.id, { tokenHash: this.hash(signedRefresh) });

    this.logger.log(`Tokens issued [userId=${user.id}] [jti=${saved.id}]`);

    return {
      accessToken,
      refreshToken:    signedRefresh,
      expiresIn:       ACCESS_TTL_SECONDS,
      refreshExpiresIn: REFRESH_TTL_SECONDS,
    };
  }

  /**
   * Rotate a refresh token.
   * Revokes old record, issues new pair, links chain for audit.
   * On replay of a revoked token → revoke entire user session (security response).
   */
  async rotate(
    refreshToken: string,
    context?: { ip?: string; userAgent?: string },
  ): Promise<TokenPair & { userId: string }> {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new TokenExpiredException();
    }

    const record = await this.rtRepo.findOne({
      where: { id: payload.jti },
      relations: ['user'],
    });

    if (!record) throw new TokenExpiredException();

    // Replay attack — token already used
    if (record.isRevoked) {
      this.logger.warn(`[SECURITY] Refresh token replay [userId=${record.userId}] [jti=${payload.jti}]`);
      await this.revokeAllForUser(record.userId);
      throw new RefreshTokenReplayException();
    }

    if (record.isExpired) throw new TokenExpiredException();

    // Constant-time hash comparison
    if (!this.safeCompare(this.hash(refreshToken), record.tokenHash)) {
      throw new TokenExpiredException();
    }

    // Revoke old token
    record.revokedAt = new Date();
    await this.rtRepo.save(record);

    // Issue new pair
    const newPair = await this.issuePair(record.user, context);

    // Link chain: oldRecord.replacedByTokenId → new record
    const newRecord = await this.rtRepo.findOne({
      where: { tokenHash: this.hash(newPair.refreshToken) },
    });
    if (newRecord) {
      await this.rtRepo.update(record.id, { replacedByTokenId: newRecord.id });
    }

    return { ...newPair, userId: record.userId };
  }

  /** Revoke a single refresh token (logout from current session) */
  async revoke(refreshToken: string): Promise<void> {
    try {
      const payload = this.jwtService.verify<JwtRefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      await this.rtRepo.update(payload.jti, { revokedAt: new Date() });
    } catch {
      // Invalid/expired token — nothing to revoke
    }
  }

  /** Revoke all active sessions for a user (logout all / security event) */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.rtRepo
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: new Date(), rotationAttackDetected: true })
      .where('userId = :userId AND revokedAt IS NULL', { userId })
      .execute();
    this.logger.warn(`All sessions revoked [userId=${userId}]`);
  }

  /** Scheduled task: purge expired refresh tokens older than 30 days */
  async purgeExpired(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000);
    const { affected } = await this.rtRepo
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :cutoff AND revokedAt IS NOT NULL', { cutoff })
      .execute();
    if (affected) this.logger.log(`Purged ${affected} expired refresh tokens`);
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  /** Timing-safe string comparison to prevent timing oracle on hash checks */
  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return require('crypto').timingSafeEqual(bufA, bufB);
  }
}
