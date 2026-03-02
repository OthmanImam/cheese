import { Injectable, Logger, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { randomInt } from 'crypto';
import { EmailService } from '../email/email.service';
import { EmailSendException } from '../email/exceptions/email.exceptions';

// ---------------------------------------------------------------------------
// These are representative entity stubs — replace with your actual entities.
// ---------------------------------------------------------------------------
import { User } from './entities/user.entity';
import { OtpRecord } from './entities/otp-record.entity';
import { WaitlistEntry } from './entities/waitlist-entry.entity';

interface JoinWaitlistDto {
  email: string;
  username: string;
}

interface VerifyOtpDto {
  email: string;
  otp: string;
}

interface CreateAccountDto {
  email: string;
  otp: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly emailService: EmailService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OtpRecord)
    private readonly otpRepo: Repository<OtpRecord>,
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    private readonly dataSource: DataSource,
  ) {}

  // ── 1. Waitlist join ──────────────────────────────────────────────────
  async joinWaitlist(dto: JoinWaitlistDto): Promise<{ position: number }> {
    const exists = await this.waitlistRepo.findOne({
      where: [{ email: dto.email }, { username: dto.username }],
    });
    if (exists) {
      throw new ConflictException('Email or username already on waitlist');
    }

    const entry = this.waitlistRepo.create({
      email: dto.email,
      username: dto.username,
      joinedAt: new Date(),
    });
    const saved = await this.waitlistRepo.save(entry);
    const position = await this.waitlistRepo.count();

    // Send email — fire-and-forget with logged failure
    this.emailService
      .sendWaitlistConfirmation({
        recipientEmail: dto.email,
        firstName: dto.email.split('@')[0],
        username: dto.username,
        waitlistPosition: position,
        referralLink: `https://cheese.app/ref/${dto.username}`,
        reservationExpiryDays: 90,
      })
      .catch((err: EmailSendException) =>
        this.logger.error(`Waitlist email failed for ${dto.email}`, err.message),
      );

    return { position };
  }

  // ── 2. Request OTP ────────────────────────────────────────────────────
  async requestOtp(email: string, ipAddress?: string, deviceInfo?: string): Promise<void> {
    const user = await this.userRepo.findOneBy({ email });
    if (!user) {
      // Silently succeed to prevent user enumeration
      return;
    }

    // Invalidate existing OTPs for this user
    await this.otpRepo.update({ userId: user.id, used: false }, { used: true });

    const otp = String(randomInt(100000, 999999));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await this.otpRepo.save(
      this.otpRepo.create({ userId: user.id, code: otp, expiresAt, used: false }),
    );

    await this.emailService.sendOtpConfirmation({
      recipientEmail: email,
      firstName: user.firstName,
      otp,
      expiryMinutes: 10,
      ipAddress,
      deviceInfo,
      requestedAt: new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });
  }

  // ── 3. Verify OTP ─────────────────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto): Promise<{ valid: boolean }> {
    const user = await this.userRepo.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException();

    const record = await this.otpRepo.findOne({
      where: { userId: user.id, code: dto.otp, used: false },
      order: { createdAt: 'DESC' },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    await this.otpRepo.update(record.id, { used: true });
    return { valid: true };
  }

  // ── 4. Complete account creation ──────────────────────────────────────
  async createAccount(dto: CreateAccountDto): Promise<User> {
    await this.verifyOtp({ email: dto.email, otp: dto.otp });

    const waitlistEntry = await this.waitlistRepo.findOneBy({ email: dto.email });
    const username = waitlistEntry?.username ?? dto.email.split('@')[0];

    return this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        username,
        tier: 'SILVER',
        isEmailVerified: true,
        createdAt: new Date(),
      });
      const saved = await manager.save(user);

      // Welcome email — awaited so we know it succeeded before returning
      await this.emailService.sendSuccessfulSignup({
        recipientEmail: dto.email,
        firstName: dto.firstName,
        username,
        tierName: 'Silver',
        tierColor: '#C0C0C0',
        nextSteps: [
          {
            title: 'Fund Your Wallet',
            description: 'Deposit Naira and we convert it to USDC instantly at the live rate.',
            ctaLabel: 'Add Funds',
            ctaUrl: 'https://cheese.app/wallet/fund',
          },
          {
            title: 'Set Up QR Payments',
            description: 'Your Cheese QR code lets you pay at any merchant partner instantly.',
            ctaLabel: 'Get My QR',
            ctaUrl: 'https://cheese.app/wallet/qr',
          },
          {
            title: 'Refer a Friend',
            description: 'Bring in 3 friends who fund ₦5M+ each to unlock Black tier.',
            ctaLabel: 'Share Referral Link',
            ctaUrl: `https://cheese.app/ref/${username}`,
          },
          {
            title: 'Explore Merchant Partners',
            description: 'Spend at luxury partners and earn 2–3% cashback in USDC.',
            ctaLabel: 'See Partners',
            ctaUrl: 'https://cheese.app/merchants',
          },
        ],
        referralLink: `https://cheese.app/ref/${username}`,
        dashboardUrl: 'https://cheese.app/wallet',
      });

      return saved;
    });
  }

  // ── Example: deposit hook (called from WalletService) ─────────────────
  async notifyDeposit(params: {
    user: User;
    transactionId: string;
    amountUsd: number;
    amountNgn: number;
    exchangeRate: number;
    currentBalanceUsd: number;
    currentBalanceNgn: number;
    fundingMethod: string;
  }): Promise<void> {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const fmtNgn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

    await this.emailService.sendDepositConfirmation({
      recipientEmail: params.user.email,
      firstName: params.user.firstName,
      amountUsd: fmt.format(params.amountUsd),
      amountNgn: fmtNgn.format(params.amountNgn),
      exchangeRate: `₦${params.exchangeRate.toLocaleString()} / $1`,
      transactionId: params.transactionId,
      depositedAt: new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'full',
        timeStyle: 'short',
      }),
      fundingMethod: params.fundingMethod,
      currentBalanceUsd: fmt.format(params.currentBalanceUsd),
      currentBalanceNgn: fmtNgn.format(params.currentBalanceNgn),
      dashboardUrl: 'https://cheese.app/wallet',
    });
  }

  // ── Example: withdrawal hook (called from WalletService) ──────────────
  async notifyWithdrawal(params: {
    user: User;
    transactionId: string;
    amountUsd: number;
    amountNgn: number;
    destinationBank: string;
    destinationAccount: string;
    destinationName: string;
    remainingBalanceUsd: number;
    remainingBalanceNgn: number;
  }): Promise<void> {
    const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const fmtNgn = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' });

    await this.emailService.sendWithdrawalConfirmation({
      recipientEmail: params.user.email,
      firstName: params.user.firstName,
      amountUsd: fmt.format(params.amountUsd),
      amountNgn: fmtNgn.format(params.amountNgn),
      destinationBank: params.destinationBank,
      destinationAccount: params.destinationAccount,
      destinationName: params.destinationName,
      transactionId: params.transactionId,
      initiatedAt: new Date().toLocaleString('en-NG', {
        timeZone: 'Africa/Lagos',
        dateStyle: 'full',
        timeStyle: 'short',
      }),
      estimatedArrival: '1–2 business hours',
      remainingBalanceUsd: fmt.format(params.remainingBalanceUsd),
      remainingBalanceNgn: fmtNgn.format(params.remainingBalanceNgn),
      dashboardUrl: 'https://cheese.app/wallet',
    });
  }
}
