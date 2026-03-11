import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { nanoid } from 'nanoid';
import { User } from '../auth/entities/user.entity';
import { ShareEvent, SharePlatform, PLATFORM_POINTS } from './entities/share-event.entity';
import { ReferralEvent, REFERRAL_POINTS } from './entities/referral-event.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto, ShareDto } from './dto/waitlist.dto';

const RESERVED_USERNAMES = new Set([
  'admin', 'cheese', 'support', 'help', 'api', 'www', 'app',
  'mail', 'official', 'team', 'staff', 'moderator', 'mod',
  'security', 'legal', 'billing', 'payments', 'wallet', 'system',
  'root', 'null', 'undefined', 'anonymous', 'guest',
]);

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(ShareEvent)
    private readonly shareRepo: Repository<ShareEvent>,
    @InjectRepository(ReferralEvent)
    private readonly referralRepo: Repository<ReferralEvent>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    @Optional()
    @InjectQueue('share-tracking')
    private readonly shareQueue?: Queue,
    @Optional()
    @InjectQueue('fraud-detection')
    private readonly fraudQueue?: Queue,
  ) {}

  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, ipAddress: string) {
    const { email, username, referralCode } = dto;

    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      throw new ConflictException('This username is reserved');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    try {
      // Pessimistic write lock prevents race conditions on username
      const takenUsername = await queryRunner.manager.findOne(User, {
        where: { username },
        lock: { mode: 'pessimistic_write' },
      });
      if (takenUsername) throw new ConflictException('This username is already taken');

      const takenEmail = await queryRunner.manager.findOne(User, {
        where: { email },
      });
      if (takenEmail) throw new ConflictException('This email is already registered');

      let referrer: User | null = null;
      if (referralCode) {
        referrer = await queryRunner.manager.findOne(User, {
          where: { referralCode },
        });
        // Silently ignore invalid referral codes — don't block registration
      }

      const newUser = await queryRunner.manager.save(
        queryRunner.manager.create(User, {
          email: email,
          username: username,
          referralCode: nanoid(8),
          referredBy: referrer?.id || null,
          ipAddress: ipAddress,
          points: 0,
          emailVerified: false,
          isFlagged: false,
          isActive: true,
          kycStatus: 'pending' as any,
          tier: 'silver' as any,
          phoneVerified: false,
        }),
      );

      // Award referral points to referrer inside same transaction
      if (referrer) {
        // Use QueryBuilder to reliably increment referrer's points
        await queryRunner.manager
          .createQueryBuilder()
          .update(User)
          .set({ points: () => `points + ${REFERRAL_POINTS}` })
          .where('id = :id', { id: referrer.id })
          .execute();

        const referralEvent = queryRunner.manager.create(ReferralEvent, {
          referrerId: referrer.id,
          referredUserId: newUser.id,
          pointsAwarded: REFERRAL_POINTS,
        });
        await queryRunner.manager.save(referralEvent);

        // Notify referrer
        this.notificationsService.notifyReferralJoined(referrer.id, newUser.username).catch(() => {});
      }

      await queryRunner.commitTransaction();

      // Fire-and-forget side effects
      this.emailService.sendRegistrationEmail(newUser).catch((err) =>
        this.logger.error('Registration email failed', err),
      );

      if (this.fraudQueue) {
        this.fraudQueue
          .add('check-registration', { type: 'check-registration', userId: newUser.id, ipAddress }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          })
          .catch((err) => this.logger.error('Fraud queue error', err));
      }

      return {
        success: true,
        user: this.sanitizeUser(newUser),
        referralLink: this.buildReferralLink(newUser.referralCode!),
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Track Share ──────────────────────────────────────────────────────────

  async trackShare(dto: ShareDto, ipAddress: string, userAgent: string) {
    const { userId, platform } = dto;

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.isFlagged) {
      throw new BadRequestException('Account is flagged. Please contact support.');
    }

    // Max 1 share per platform per user per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alreadyShared = await this.shareRepo
      .createQueryBuilder('se')
      .where('se.userId = :userId', { userId })
      .andWhere('se.platform = :platform', { platform })
      .andWhere('se.createdAt >= :today', { today })
      .andWhere('se.isFraud = :fraud', { fraud: false })
      .getOne();

    if (alreadyShared) {
      throw new ConflictException(
        `You have already shared on ${platform} today. Come back tomorrow!`,
      );
    }

    const shareEvent = this.shareRepo.create({
      userId,
      platform,
      verified: false,
      pointsAwarded: 0,
      ipAddress,
      userAgent,
      isFraud: false,
    });
    await this.shareRepo.save(shareEvent);

    if (this.shareQueue) {
      await this.shareQueue.add(
        'verify-share',
        { shareEventId: shareEvent.id, userId, platform },
        { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
      );
    }

    // Check for fraud
    if (this.fraudQueue) {
      this.fraudQueue
        .add('check-share', { type: 'check-share', shareEventId: shareEvent.id, ipAddress }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        })
        .catch((err) => this.logger.error('Fraud queue error', err));
    }

    return {
      success: true,
      shareEventId: shareEvent.id,
      message: 'Share recorded. Points will be awarded after verification.',
      pendingPoints: PLATFORM_POINTS[platform as SharePlatform] ?? 0,
    };
  }

  // ── Check Username ───────────────────────────────────────────────────────

  async checkUsername(username: string) {
    if (RESERVED_USERNAMES.has(username.toLowerCase())) {
      return { available: false, username, reason: 'This username is reserved' };
    }
    const existing = await this.userRepo.findOne({ where: { username } });
    return {
      available: !existing,
      username,
      reason: existing ? 'Username is already taken' : undefined,
    };
  }

  // ── Referral Info ─────────────────────────────────────────────────────────

  async getReferralInfo(code: string) {
    const user = await this.userRepo.findOne({
      where: { referralCode: code },
      select: ['id', 'username', 'referralCode'],
    });
    if (!user) throw new NotFoundException('Referral code not found');
    return { valid: true, referrerUsername: user.username, referralCode: user.referralCode };
  }

  // ── User Points ───────────────────────────────────────────────────────────

  async getUserPoints(userId: string) {
    // Force read from primary DB (bypass any read replicas) to ensure latest points
    const user = await this.userRepo.findOne({
      where: { id: userId },
      select: ['id', 'username', 'points'],
    });
    if (!user) throw new NotFoundException('User not found');

    const shareCount = await this.shareRepo.count({ where: { userId, verified: true } });
    const referralCount = await this.referralRepo.count({ where: { referrerId: userId } });

    return { 
      points: user.points, 
      shareCount, 
      referralCount,
      // Add a timestamp to help with cache invalidation on the frontend
      timestamp: new Date().toISOString(),
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private buildReferralLink(code: string): string {
    return `${process.env.FRONTEND_URL || 'https://cheese.app'}/waitlist?ref=${code}`;
  }

  private sanitizeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      referralCode: user.referralCode,
      points: user.points,
      createdAt: user.createdAt,
    };
  }
}