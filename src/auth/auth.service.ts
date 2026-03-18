// src/auth/auth.service.ts
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { OtpService } from '../otp/otp.service';
import { OtpType } from '../otp/entities/otp.entity';
import { StellarService } from '../stellar/stellar.service';
import { Device } from '../devices/entities/device.entity';
import {
  ChangePinDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
  SignupDto,
  VerifyOtpDto,
  VerifyPinDto,
} from './dto';
import { EmailService } from '../email/email.service';
import { WaitlistService } from '../waitlist/waitlist.service';
import { WaitlistEntry, WaitlistStatus } from '../waitlist/entities/waitlist-entry.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { User, KycStatus, Tier } from './entities/user.entity';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly rtRepo: Repository<RefreshToken>,
    @InjectRepository(Device) private readonly deviceRepo: Repository<Device>,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly otpService: OtpService,
    private readonly stellarService: StellarService,
    private readonly emailService: EmailService,
    private readonly waitlistService: WaitlistService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── Signup ────────────────────────────────────────────────
  async signup(dto: SignupDto): Promise<{ userId: string; email: string }> {
    // Check if user already exists
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.emailVerified) {
        throw new ConflictException('Email already registered');
      }
      // User exists from previous signup attempt, check username match
      if (existingUser.username !== dto.username) {
        throw new ConflictException('Username does not match existing account');
      }
      // Update the existing user
      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      await this.userRepo.update(existingUser.id, {
        fullName: dto.fullName,
        phone: dto.phone,
        passwordHash,
        emailVerified: false, // will be verified later
      });
      const user = await this.userRepo.findOne({ where: { id: existingUser.id } });
      if (!user) throw new Error('User not found after update');
      // Create Stellar wallet if not exists
      if (!user.stellarPublicKey) {
        try {
          const wallet = await this.stellarService.createWallet();
          await this.stellarService.ensureTrustline(wallet.secretKeyEnc);
          user.stellarPublicKey = wallet.publicKey;
          user.stellarSecretEnc = wallet.secretKeyEnc;
          await this.userRepo.save(user);
        } catch (err) {
          this.logger.error(
            `Stellar wallet creation failed: ${(err as Error).message}`,
          );
        }
      }
      // Register the device only if it doesn't exist
      const existingDevice = await this.deviceRepo.findOne({
        where: { deviceId: dto.deviceId },
      });
      if (!existingDevice) {
        await this.deviceRepo.save(
          this.deviceRepo.create({
            userId: user.id,
            deviceId: dto.deviceId,
            publicKey: dto.devicePublicKey,
            deviceName: 'Primary Device',
          }),
        );
      }
      // Send email verification OTP
      const otpCode = await this.otpService.sendOtp(dto.email, OtpType.EMAIL_VERIFY, {
        fullName: dto.fullName,
      });
      this.logger.log(`OTP sent to ${dto.email} for signup: ${otpCode}`);
      return { userId: user.id, email: user.email };
    }

    // Check waitlist for reservation
    const waitlistEntry = await this.waitlistService.findByEmailAndUsername(dto.email, dto.username);
    if (waitlistEntry) {
      // Convert waitlist entry to user
      return this.convertWaitlistToUser(waitlistEntry, dto);
    }

    // New user signup
    const phoneExists = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (phoneExists) throw new ConflictException('Phone already registered');

    const usernameExists = await this.userRepo.findOne({
      where: { username: dto.username },
    });
    if (usernameExists) throw new ConflictException('Username taken');

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user
    const user = this.userRepo.create({
      fullName: dto.fullName,
      email: dto.email,
      phone: dto.phone,
      username: dto.username,
      passwordHash,
    });

    // Create Stellar custodial wallet
    try {
      const wallet = await this.stellarService.createWallet();
      await this.stellarService.ensureTrustline(wallet.secretKeyEnc);
      user.stellarPublicKey = wallet.publicKey;
      user.stellarSecretEnc = wallet.secretKeyEnc;
    } catch (err) {
      this.logger.error(
        `Stellar wallet creation failed: ${(err as Error).message}`,
      );
      // Don't block signup — wallet can be retried
    }

    await this.userRepo.save(user);

    // Register the device
    await this.deviceRepo.save(
      this.deviceRepo.create({
        userId: user.id,
        deviceId: dto.deviceId,
        publicKey: dto.devicePublicKey,
        deviceName: 'Primary Device',
      }),
    );

    // Send email verification OTP
    const otpCode = await this.otpService.sendOtp(dto.email, OtpType.EMAIL_VERIFY, {
      fullName: dto.fullName,
    });
    this.logger.log(`OTP sent to ${dto.email} for signup: ${otpCode}`);

    return { userId: user.id, email: user.email };
  }

  // ── Verify OTP ───────────────────────────────────────────
  async verifyOtp(dto: VerifyOtpDto): Promise<{ verified: boolean }> {
    await this.otpService.verifyOtp(dto.email, dto.otp, dto.type);

    if (dto.type === OtpType.EMAIL_VERIFY) {
      const user = await this.userRepo.findOne({ where: { email: dto.email } });
      await this.userRepo.update({ email: dto.email }, { emailVerified: true });
      if (user) {
        this.emailService
          .sendSignupSuccess({
            to: user.email,
            fullName: user.fullName,
            username: user.username,
            appUrl: this.config.get('app.frontendUrl') + '/wallet',
          })
          .catch(() => {});
      }
    }

    return { verified: true };
  }

  // ── Resend OTP ────────────────────────────────────────────
  async resendOtp(email: string, type: OtpType): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');
    await this.otpService.sendOtp(email, type);
  }

  // ── Login ────────────────────────────────────────────────
  async login(dto: LoginDto, meta: { userAgent?: string; ip?: string }) {
    // Find user by email or username
    const user = await this.userRepo.findOne({
      where: [{ email: dto.identifier }, { username: dto.identifier }],
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.isActive) throw new ForbiddenException('Account suspended');

    // Verify password
    if (!user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const passwordOk = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordOk) throw new UnauthorizedException('Invalid credentials');

    // Verify device signature if deviceId is provided
    if (dto.deviceId) {
      const device = await this.deviceRepo.findOne({
        where: { deviceId: dto.deviceId, userId: user.id, isActive: true },
      });

      if (device && dto.deviceSignature) {
        // Device exists and signature provided — verify it
        const signatureValid = this.stellarService.verifyDeviceSignature({
          publicKey: device.publicKey,
          signature: dto.deviceSignature,
          message: dto.deviceId, // client signs their own deviceId
        });
        // In development, skip signature check to ease testing
        if (!signatureValid && this.config.get('app.nodeEnv') === 'production') {
          throw new UnauthorizedException('Invalid device signature');
        }

        // Update device last seen
        await this.deviceRepo.update({ id: device.id }, { lastSeen: new Date() });
      }
      // If device doesn't exist or signature is empty, allow login
      // (user will register device later or re-login with valid signature)
    }

    // Issue tokens with device ID if available
    const tokens = await this.issueTokens(user, dto.deviceId || null, meta);
    return { user: this.sanitiseUser(user), tokens };
  }

  // ── Refresh tokens ───────────────────────────────────────
  async refresh(
    user: User,
    oldTokenHash: string,
    meta: { userAgent?: string; ip?: string },
  ) {
    // Revoke the used refresh token (rotation)
    await this.rtRepo.update({ tokenHash: oldTokenHash }, { isRevoked: true });
    const tokens = await this.issueTokens(user, null, meta);
    return { accessToken: tokens.accessToken };
  }

  // ── Logout ────────────────────────────────────────────────
  async logout(userId: string, tokenHash: string): Promise<void> {
    await this.rtRepo.update({ userId, tokenHash }, { isRevoked: true });
  }

  // ── Forgot password ───────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    // Don't reveal if user exists
    if (!user) return;
    await this.otpService.sendOtp(dto.email, OtpType.PASSWORD_RESET);
  }

  // ── Reset password ────────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    await this.otpService.verifyOtp(dto.email, dto.otp, OtpType.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.update({ email: dto.email }, { passwordHash });
    // Notify user of password change
    const pwUser = await this.userRepo.findOne({ where: { email: dto.email } });
    if (pwUser) {
      this.emailService
        .sendPasswordChanged({ to: dto.email, fullName: pwUser.fullName })
        .catch(() => {});
    }
    // Revoke all refresh tokens on password change
    await this.rtRepo.update(
      {
        userId: (await this.userRepo.findOne({ where: { email: dto.email } }))
          ?.id,
      },
      { isRevoked: true },
    );
  }

  // ── Verify PIN ────────────────────────────────────────────
  async verifyPin(
    userId: string,
    dto: VerifyPinDto,
  ): Promise<{ valid: boolean }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.pinHash) throw new BadRequestException('PIN not set');

    const isValid = timingSafeEqual(
      Buffer.from(user.pinHash),
      Buffer.from(dto.pinHash),
    );
    if (!isValid) {
      const err = new ForbiddenException('Incorrect PIN');
      throw err;
    }

    return { valid: true };
  }

  // ── Change PIN ────────────────────────────────────────────
  async changePin(userId: string, dto: ChangePinDto): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // If pin already set, verify current pin first
    if (user.pinHash) {
      const isValid = timingSafeEqual(
        Buffer.from(user.pinHash),
        Buffer.from(dto.currentPinHash),
      );
      if (!isValid) throw new ForbiddenException('Incorrect current PIN');
    }

    await this.userRepo.update({ id: userId }, { pinHash: dto.newPinHash });
  }

  // ── Get current user ──────────────────────────────────────
  getMe(user: User) {
    return this.sanitiseUser(user);
  }

  // ── Token issuance ────────────────────────────────────────
  private async issueTokens(
    user: User,
    deviceId: string | null,
    meta: { userAgent?: string; ip?: string },
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessExpires'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('jwt.refreshSecret'),
      expiresIn: this.config.get('jwt.refreshExpires'),
    });

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const parsed = this.jwtService.decode(refreshToken) as { exp: number };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const expiresAt = new Date(parsed.exp * 1000);

    await this.rtRepo.save(
      this.rtRepo.create({
        userId: user.id,
        tokenHash,
        deviceId,
        expiresAt,
        userAgent: meta.userAgent || null,
        ipAddress: meta.ip || null,
      }),
    );

    return { accessToken, refreshToken };
  }

  private async findWaitlistEntry(email: string, username: string) {
    const entry = await this.waitlistService.findByEmailAndUsername(email, username);
    return entry && entry.status === WaitlistStatus.PENDING ? entry : null;
  }

  private async convertWaitlistToUser(waitlistEntry: WaitlistEntry, dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Create user from waitlist entry
    const user = this.userRepo.create({
      fullName: dto.fullName,
      email: waitlistEntry.email,
      phone: dto.phone,
      username: waitlistEntry.username,
      referralCode: waitlistEntry.referralCode,
      referredBy: waitlistEntry.referredBy,
      passwordHash,
      points: 0,
      emailVerified: false,
      isFlagged: false,
      isActive: true,
      kycStatus: KycStatus.PENDING,
      tier: Tier.SILVER,
      phoneVerified: false,
    });

    // Create Stellar wallet
    try {
      const wallet = await this.stellarService.createWallet();
      await this.stellarService.ensureTrustline(wallet.secretKeyEnc);
      user.stellarPublicKey = wallet.publicKey;
      user.stellarSecretEnc = wallet.secretKeyEnc;
    } catch (err) {
      this.logger.error(
        `Stellar wallet creation failed: ${(err as Error).message}`,
      );
    }

    await this.userRepo.save(user);

    // Register device
    await this.deviceRepo.save(
      this.deviceRepo.create({
        userId: user.id,
        deviceId: dto.deviceId,
        publicKey: dto.devicePublicKey,
        deviceName: 'Primary Device',
      }),
    );

    // Update waitlist entry status
    waitlistEntry.status = WaitlistStatus.CONVERTED;
    waitlistEntry.convertedAt = new Date();
    await this.waitlistService.updateWaitlistEntry(waitlistEntry);

    // Award referral points if referred
    if (waitlistEntry.referredBy) {
      const referrer = await this.userRepo.findOne({ where: { id: waitlistEntry.referredBy } });
      if (referrer) {
        referrer.points = referrer.points + 20; // REFERRAL_POINTS
        await this.userRepo.save(referrer);

        // Create referral event (this would need a proper service/repo injection)
        // For now, just notify
        this.notificationsService.notifyReferralJoined(referrer.id, user.username).catch(() => {});
      }
    }

    // Send email verification OTP
    const otpCode = await this.otpService.sendOtp(dto.email, OtpType.EMAIL_VERIFY, {
      fullName: dto.fullName,
    });
    this.logger.log(`OTP sent to ${dto.email} for signup: ${otpCode}`);

    return { userId: user.id, email: user.email };
  }

  private sanitiseUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment
    const { passwordHash, pinHash, stellarSecretEnc, ...safe } = user as any;
    return safe as Omit<User, 'passwordHash' | 'pinHash' | 'stellarSecretEnc'>;
  }
}
