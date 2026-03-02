import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { SignatureNonce } from '../../nonces/entities/nonce.entity';
import { NonceReplayException } from '../../common/exceptions/device.exceptions';

const SIGNATURE_WINDOW_SECONDS = 300; // 5 minutes

@Injectable()
export class NonceService {
  private readonly logger = new Logger(NonceService.name);

  constructor(
    @InjectRepository(SignatureNonce)
    private readonly nonceRepo: Repository<SignatureNonce>,
  ) {}

  /**
   * Claim a nonce — atomically insert or throw on duplicate.
   *
   * The INSERT will throw a unique constraint violation if the nonce was
   * already seen. We catch that specific error and map it to NonceReplayException.
   *
   * This approach is race-condition safe: two concurrent requests with the
   * same nonce cannot both succeed because the DB constraint is the authority.
   *
   * Production alternative (preferred at scale):
   *   const result = await redis.set(`nonce:${nonce}`, '1', 'EX', 300, 'NX');
   *   if (!result) throw new NonceReplayException();
   */
  async claim(params: {
    nonce: string;
    deviceId: string;
    userId: string;
    action: string;
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + SIGNATURE_WINDOW_SECONDS * 1000);

    try {
      await this.nonceRepo.save(
        this.nonceRepo.create({
          nonce:    params.nonce,
          deviceId: params.deviceId,
          userId:   params.userId,
          action:   params.action,
          expiresAt,
        }),
      );
    } catch (err: any) {
      // PostgreSQL unique violation code: 23505
      if (err?.code === '23505') {
        this.logger.warn(
          `Nonce replay attempt [nonce=${params.nonce}] [deviceId=${params.deviceId}]`,
        );
        throw new NonceReplayException();
      }
      throw err;
    }
  }

  /** Purge expired nonces — run hourly via scheduler */
  async purgeExpired(): Promise<number> {
    const result = await this.nonceRepo.delete({
      expiresAt: LessThan(new Date()),
    });
    const count = result.affected ?? 0;
    if (count > 0) this.logger.log(`Purged ${count} expired nonces`);
    return count;
  }
}
