import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';

/**
 * Scheduled maintenance tasks for the auth system.
 * Keeps hot tables (otps, refresh_tokens) lean — critical for query performance at scale.
 */
@Injectable()
export class AuthScheduler {
  private readonly logger = new Logger(AuthScheduler.name);

  constructor(
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  /** Purge expired OTPs every hour */
  @Cron(CronExpression.EVERY_HOUR)
  async purgeExpiredOtps() {
    const count = await this.otpService.purgeExpired();
    if (count > 0) this.logger.log(`Scheduler: purged ${count} expired OTPs`);
  }

  /** Purge old revoked refresh tokens at 3 AM daily */
  @Cron('0 3 * * *')
  async purgeExpiredRefreshTokens() {
    await this.tokenService.purgeExpired();
  }
}
