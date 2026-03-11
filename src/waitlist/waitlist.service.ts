// src/waitlist/waitlist.service.ts
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { Repository, LessThan } from 'typeorm';
import { EmailService } from '../email/email.service';
import { JoinWaitlistDto } from './dto';
import {
  WaitlistEntry,
  WaitlistStatus,
} from './entities/waitlist-entry.entity';
import { User } from '../auth/entities/user.entity';

// How many days after joining before we send the first reminder
const FIRST_REMINDER_DAYS = 7;
const SECOND_REMINDER_DAYS = 21;
const RELEASE_DAYS = 90; // unreserve if no signup after this long

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly entryRepo: Repository<WaitlistEntry>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  // ── POST /waitlist/join ───────────────────────────────────
  async join(
    dto: JoinWaitlistDto,
    ipAddress?: string,
  ): Promise<{
    message: string;
    position: number;
    username: string;
  }> {
    const emailExists = await this.entryRepo.findOne({
      where: { email: dto.email },
    });
    if (emailExists)
      throw new ConflictException('This email is already on the waitlist');

    const usernameOnWaitlist = await this.entryRepo.findOne({
      where: { username: dto.username },
    });
    if (usernameOnWaitlist)
      throw new ConflictException(`@${dto.username} is already reserved`);

    const usernameInUse = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (usernameInUse)
      throw new ConflictException(`@${dto.username} is already taken`);

    const count = await this.entryRepo.count();
    const position = count + 1;

    const entry = await this.entryRepo.save(
      this.entryRepo.create({
        email: dto.email,
        username: dto.username,
        position,
        referralSource: dto.referralSource || null,
        ipAddress: ipAddress || null,
      }),
    );

    this.emailService
      .sendWaitlistConfirmation({
        to: entry.email,
        username: entry.username,
        position: entry.position ?? undefined,
      })
      .catch((err) =>
        this.logger.error(`Waitlist confirm email failed: ${err.message}`),
      );

    this.logger.log(
      `Waitlist: @${entry.username} (${entry.email}) — #${position}`,
    );
    return {
      message: `@${entry.username} has been reserved. Check your email.`,
      position,
      username: entry.username,
    };
  }

  // ── GET /waitlist/check/:username ─────────────────────────
  async checkUsername(
    username: string,
  ): Promise<{ available: boolean; username: string }> {
    const clean = username.replace(/^@/, '').toLowerCase().trim();
    const onWaitlist = await this.entryRepo.findOne({
      where: { username: clean },
    });
    const inUse = await this.userRepo.findOne({ where: { username: clean } });
    return { available: !onWaitlist && !inUse, username: clean };
  }

  // ── GET /waitlist/stats ───────────────────────────────────
  async getStats(): Promise<{ totalReservations: number; spotsLeft: number }> {
    const total = await this.entryRepo.count();
    return { totalReservations: total, spotsLeft: Math.max(0, 10_000 - total) };
  }

  // ── Guard: called from AuthService.signup ─────────────────
  // If the requested username is reserved on the waitlist,
  // only the matching email may claim it.
  async assertUsernameClaimAllowed(
    username: string,
    email: string,
  ): Promise<void> {
    const reservation = await this.entryRepo.findOne({
      where: { username, status: WaitlistStatus.PENDING },
    });
    if (!reservation) return; // not reserved — open to anyone

    if (reservation.email !== email) {
      throw new ForbiddenException(
        `@${username} is reserved for a different email address. ` +
          `If this is your username, sign up with the email you used to reserve it.`,
      );
    }
  }

  // ── Admin: blast launch email ─────────────────────────────
  async notifyLaunch(
    appUrl: string,
  ): Promise<{ sent: number; failed: number }> {
    const entries = await this.entryRepo.find({
      where: { status: WaitlistStatus.PENDING },
    });
    let sent = 0,
      failed = 0;

    for (const entry of entries) {
      try {
        await this.emailService.sendAppLaunch({
          to: entry.email,
          username: entry.username,
          appUrl,
        });
        await this.entryRepo.update(
          { id: entry.id },
          { status: WaitlistStatus.NOTIFIED, notifiedAt: new Date() },
        );
        sent++;
        if (sent % 10 === 0) await new Promise((r) => setTimeout(r, 1000));
      } catch (err) {
        this.logger.error(
          `Launch email failed for ${entry.email}: ${err.message}`,
        );
        failed++;
      }
    }

    this.logger.log(`Launch blast: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  // ── Mark a waitlist entry as converted on full signup ─────
  async markConverted(email: string): Promise<void> {
    await this.entryRepo.update(
      { email },
      { status: WaitlistStatus.CONVERTED, convertedAt: new Date() },
    );
  }

  async getEntryByEmail(email: string): Promise<WaitlistEntry | null> {
    return this.entryRepo.findOne({ where: { email } });
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

    let sent = 0;

    for (const entry of entries) {
      const joinedAt = new Date(entry.createdAt);
      const daysOnList = Math.floor(
        (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Send 1st reminder at day 7, 2nd at day 21 (check within a 1-day window)
      const isFirstReminder =
        daysOnList >= FIRST_REMINDER_DAYS &&
        daysOnList < FIRST_REMINDER_DAYS + 1;
      const isSecondReminder =
        daysOnList >= SECOND_REMINDER_DAYS &&
        daysOnList < SECOND_REMINDER_DAYS + 1;

      if (isFirstReminder || isSecondReminder) {
        const signupUrl = `${signupBase}?username=${entry.username}&email=${encodeURIComponent(entry.email)}&ref=reminder`;

        try {
          await this.emailService.sendWaitlistReminder({
            to: entry.email,
            username: entry.username,
            signupUrl,
            daysOnList,
            position: entry.position ?? undefined,
          });
          sent++;
          this.logger.log(
            `Reminder sent → ${entry.email} (@${entry.username}, day ${daysOnList})`,
          );
        } catch (err) {
          this.logger.error(
            `Reminder failed for ${entry.email}: ${err.message}`,
          );
        }
      }

      // Release stale reservations after RELEASE_DAYS with no signup
      if (daysOnList >= RELEASE_DAYS) {
        await this.entryRepo.update(
          { id: entry.id },
          { status: WaitlistStatus.NOTIFIED },
        );
        this.logger.log(
          `Released stale reservation: @${entry.username} (${daysOnList} days)`,
        );
      }
    }

    if (sent > 0) this.logger.log(`Daily reminder run: ${sent} emails sent`);
  }
}
