import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NonceService } from './services/nonce.service';

@Injectable()
export class DevicesScheduler {
  private readonly logger = new Logger(DevicesScheduler.name);

  constructor(private readonly nonceService: NonceService) {}

  /** Purge expired nonces every 10 minutes — keeps the nonce table lean */
  @Cron('*/10 * * * *')
  async purgeExpiredNonces() {
    const count = await this.nonceService.purgeExpired();
    if (count > 0) this.logger.log(`Scheduler: purged ${count} expired nonces`);
  }
}
