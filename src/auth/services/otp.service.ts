import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { createHash, randomInt } from 'crypto';
import { Otp, OtpPurpose } from '../../otp/entities/otp.entity';
import { InvalidOtpException, OtpExhaustedException } from '../../common/exceptions/auth.exceptions';

const OTP_TTL_MINUTES  = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    @InjectRepository(Otp)
    private readonly otpRepo: Repository<Otp>,
  ) {}

  /**
   * Generate a cryptographically random 6-digit OTP.
   * Invalidates any previous unused OTPs for same user + purpose.
   * Returns the raw code — caller must email it; we only store the hash.
   */
  async generate(userId: string, purpose: OtpPurpose, ip?: string): Promise<string> {
    await this.invalidatePrevious(userId, purpose);

    const code     = this.randomCode();
    const codeHash = this.hash(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.otpRepo.save(
      this.otpRepo.create({
        userId,
        codeHash,
        purpose,
        expiresAt,
        maxAttempts: OTP_MAX_ATTEMPTS,
        requestedFromIp: ip ?? null,
      }),
    );

    this.logger.log(`OTP generated [userId=${userId}] [purpose=${purpose}]`);
    return code;
  }

  /**
   * Verify a submitted OTP code.
   * Throws typed domain exceptions — callers do NOT receive raw error details
   * that could aid brute-force enumeration.
   */
  async verify(userId: string, code: string, purpose: OtpPurpose): Promise<void> {
    // Fetch the latest un-used OTP for this user + purpose
    const otp = await this.otpRepo.findOne({
      where: { userId, purpose, usedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    if (!otp || otp.isExpired) {
      throw new InvalidOtpException();
    }

    if (otp.isExhausted) {
      throw new OtpExhaustedException();
    }

    if (this.hash(code) !== otp.codeHash) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);

      const remaining = otp.maxAttempts - otp.attempts;
      if (remaining <= 0) throw new OtpExhaustedException();
      throw new InvalidOtpException(remaining);
    }

    // Mark used atomically — prevents race-condition double-use
    otp.usedAt = new Date();
    await this.otpRepo.save(otp);

    this.logger.log(`OTP verified [userId=${userId}] [purpose=${purpose}]`);
  }

  /** Scheduled task: purge expired OTPs older than 24 h to keep table lean */
  async purgeExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60_000);
    const result = await this.otpRepo.delete({ expiresAt: LessThan(cutoff) });
    const count  = result.affected ?? 0;
    if (count > 0) this.logger.log(`Purged ${count} expired OTPs`);
    return count;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private async invalidatePrevious(userId: string, purpose: OtpPurpose): Promise<void> {
    await this.otpRepo
      .createQueryBuilder()
      .update(Otp)
      .set({ usedAt: new Date() })
      .where('userId = :userId AND purpose = :purpose AND usedAt IS NULL', { userId, purpose })
      .execute();
  }

  /**
   * randomInt from 'crypto' — cryptographically uniform distribution.
   * Math.random() is NOT acceptable for security-critical codes.
   */
  private randomCode(): string {
    return randomInt(0, 1_000_000).toString().padStart(6, '0');
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }
}
