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
import { ReferralEvent } from './entities/referral-event.entity';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RegisterDto, ShareDto } from './dto/waitlist.dto';
import { WaitlistEntry, WaitlistStatus } from './entities/waitlist-entry.entity';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

const RESERVED_USERNAMES = new Set([
  'admin', 'cheese', 'support', 'help', 'api', 'www', 'app',
  'mail', 'official', 'team', 'staff', 'moderator', 'mod',
  'security', 'legal', 'billing', 'payments', 'wallet', 'system',
  'root', 'null', 'undefined', 'anonymous', 'guest',
]);
// How many days after joining before we send the first reminder
const FIRST_REMINDER_DAYS = 7;
const SECOND_REMINDER_DAYS = 21;
const RELEASE_DAYS = 90; // unreserve if no signup after this long

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
    private readonly config: ConfigService,
    @InjectRepository(WaitlistEntry)
    private readonly entryRepo: Repository<WaitlistEntry>,
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
      const takenUsername = await queryRunner.manager.findOne(WaitlistEntry, {
        where: { username },
        lock: { mode: 'pessimistic_write' },
      });
      if (takenUsername) throw new ConflictException('This username is already reserved');

      const takenEmail = await queryRunner.manager.findOne(WaitlistEntry, {
        where: { email },
      });
      if (takenEmail) throw new ConflictException('This email is already on the waitlist');

      // Only check User table for active users
      const userWithUsername = await queryRunner.manager.findOne(User, {
        where: { username, emailVerified: true },
      });
      if (userWithUsername) throw new ConflictException('This username is already taken');

      let referrer: User | null = null;
      if (referralCode) {
        referrer = await queryRunner.manager.findOne(User, {
          where: { referralCode },
        });
        // Silently ignore invalid referral codes — don't block registration
      }

      // Calculate position (total waitlist entries + 1)
      const totalEntries = await queryRunner.manager.count(WaitlistEntry);
      const position = totalEntries + 1;

      const newWaitlistEntry = await queryRunner.manager.save(
        queryRunner.manager.create(WaitlistEntry, {
          email,
          username,
          status: WaitlistStatus.PENDING,
          referralSource: referralCode || null,
          referrerId: referrer?.id || null,
          referralCode: nanoid(8),
          ipAddress,
          position,
        }),
      );

      // NOTE: Referral points are awarded during signup, not waitlist registration
      // This prevents double-counting and ensures points are only given for actual conversions

      await queryRunner.commitTransaction();

      // Fire-and-forget side effects
      this.emailService.sendWaitlistConfirmation({
        to: newWaitlistEntry.email,
        username: newWaitlistEntry.username,
        position: newWaitlistEntry.position || undefined,
        referralCode: newWaitlistEntry.referralCode || undefined,
      }).then(async () => {
        // Update notifiedAt when email is successfully sent
        await this.entryRepo.update(newWaitlistEntry.id, {
          notifiedAt: new Date(),
        });
      }).catch((err) =>
        this.logger.error('Waitlist confirmation email failed', err),
      );

      const frontendUrl = this.config.get<string>('app.frontendUrl', 'https://cheesepay.xyz');
      const referralLink = `${frontendUrl}/waitlist?ref=${newWaitlistEntry.referralCode}`;

      return {
        user: {
          id: newWaitlistEntry.id,
          email: newWaitlistEntry.email,
          username: newWaitlistEntry.username,
          referralCode: newWaitlistEntry.referralCode,
          points: 0, // New users start with 0 points
          createdAt: newWaitlistEntry.createdAt.toISOString(),
        },
        referralLink,
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

  async getEntryByEmail(email: string): Promise<WaitlistEntry | null> {
    return this.entryRepo.findOne({ where: { email } });
  }

  /**
   * Return a small summary of a user's current point totals, along with
   * share/referral counts and a timestamp for cache invalidation.
   */
  async getUserPoints(userId: string): Promise<{
    points: number;
    shareCount: number;
    referralCount: number;
    timestamp: string;
  }> {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['points'] });
    if (!user) throw new NotFoundException('User not found');

    const shareCount = await this.shareRepo.count({ where: { userId, verified: true } });
    const referralCount = await this.referralRepo.count({ where: { referrerId: userId } });

    return {
      points: user.points,
      shareCount,
      referralCount,
      timestamp: new Date().toISOString(),
    };
  }

  async getTotalRegisteredUsers(): Promise<number> {
    return this.userRepo.count();
  }

  async getTotalReservedUsernames(): Promise<number> {
    const count = await this.entryRepo.count();
    this.logger.log(`Total reserved usernames: ${count}`);
    return count;
  }

  // ────────────────────────────────────────────────────────
  // SCHEDULED: Send reminders to unconverted waitlist entries
  // Runs every day at 9 AM WAT (8 AM UTC)
  // ────────────────────────────────────────────────────────
  @Cron('0 8 * * *', { timeZone: 'UTC' })
  async sendReminders(): Promise<void> {
    const appUrl = this.config.get<string>(
      'app.frontendUrl',
      'https://cheesepay.xyz',
    );
    const signupBase = `${appUrl}/signup`;
    const now = new Date();

    // Fetch all pending (not converted, not yet released) entries
    const entries = await this.entryRepo.find({
      where: { status: WaitlistStatus.PENDING },
    });

    // iterate entries and send reminder emails or notifications as needed
    for (const entry of entries) {
      // placeholder just logs for now
      this.logger.debug(`Reminding waitlist entry ${entry.email}`);
      // actual reminder logic would use emailService/notificationsService
    }
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