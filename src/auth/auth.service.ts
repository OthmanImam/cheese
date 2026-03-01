import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignupSource } from '../users/entities/user.entity';
import { OtpPurpose } from '../otp/entities/otp.entity';
import { WaitlistReservation } from '../waitlist/entities/waitlist-reservation.entity';
import { UsersService } from './services/users.service';
import { OtpService } from './services/otp.service';
import { TokenService } from './services/token.service';
import { WaitlistTokenService } from './services/waitlist-token.service';
import { DirectSignupDto } from './dto/direct-signup.dto';
import { WaitlistSignupDto } from './dto/waitlist-signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  SignupResponse,
  OtpVerifyResponse,
  TokenPair,
  LoginResponse,
} from './types/auth-response.interface';

/** Stub — inject the real EmailService in production */
interface IEmailService {
  sendOtpEmail(email: string, name: string, otp: string): Promise<void>;
}

const USERNAME_LOCK_DAYS = 90;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(WaitlistReservation)
    private readonly reservationRepo: Repository<WaitlistReservation>,
    private readonly usersService: UsersService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
    private readonly waitlistTokenService: WaitlistTokenService,
    // Uncomment and inject your real EmailService:
    // private readonly emailService: IEmailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // FLOW 1 — Waitlist Continuation Signup
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Called when a waitlist user clicks their signed launch email link.
   *
   * Sequence:
   *   1. Verify HMAC-signed token → extract locked email + username
   *   2. Create pending user (username immutable for 90 days)
   *   3. Generate OTP → send email
   *   4. Mark reservation as pending conversion (not yet converted — wait for OTP)
   */
  async waitlistSignup(dto: WaitlistSignupDto, ip?: string): Promise<SignupResponse> {
    const payload = await this.waitlistTokenService.verify(dto.token);

    const usernameLockedUntil = new Date();
    usernameLockedUntil.setDate(usernameLockedUntil.getDate() + USERNAME_LOCK_DAYS);

    const user = await this.usersService.createPendingUser({
      email:               payload.email,
      username:            payload.username,
      password:            dto.password,
      phone:               dto.phone,
      firstName:           dto.firstName,
      lastName:            dto.lastName,
      signupSource:        SignupSource.WAITLIST,
      wasOnWaitlist:       true,
      usernameLockedUntil,
    });

    const otp = await this.otpService.generate(user.id, OtpPurpose.EMAIL_VERIFICATION, ip);

    // await this.emailService.sendOtpEmail(user.email, user.firstName ?? user.username, otp);
    this.logger.log(`[DEV] OTP for waitlist signup [userId=${user.id}]: ${otp}`);

    this.logger.log(`Waitlist signup initiated [userId=${user.id}] [username=${user.username}]`);
    return { userId: user.id, email: user.email, username: user.username, message: 'OTP sent to your email address.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FLOW 2 — Direct Signup  (also handles FLOW 3 — Referral)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Standard sign-up path. If referralCode is present and valid,
   * automatically creates a referral record and sets referredById.
   * Invalid referral codes are silently ignored — never block signup.
   */
  async directSignup(dto: DirectSignupDto, ip?: string): Promise<SignupResponse> {
    let referredById:       string | undefined;
    let resolvedReferralCode: string | undefined;

    if (dto.referralCode) {
      const referrer = await this.usersService.findByReferralCode(dto.referralCode);
      if (referrer) {
        referredById         = referrer.id;
        resolvedReferralCode = dto.referralCode;
        this.logger.log(`Referral code validated [referrerId=${referrer.id}]`);
      }
      // Else: silently ignore — do not leak whether code is valid
    }

    const signupSource = referredById ? SignupSource.REFERRAL : SignupSource.DIRECT;

    const user = await this.usersService.createPendingUser({
      email:        dto.email,
      username:     dto.username,
      password:     dto.password,
      phone:        dto.phone,
      firstName:    dto.firstName,
      lastName:     dto.lastName,
      signupSource,
      referredById,
    });

    // Create referral tracking record (non-blocking)
    if (referredById && resolvedReferralCode) {
      await this.usersService.createReferralRecord({
        referrerId:   referredById,
        refereeId:    user.id,
        referralCode: resolvedReferralCode,
      }).catch((err) => this.logger.error('Failed to create referral record', err));
    }

    const otp = await this.otpService.generate(user.id, OtpPurpose.EMAIL_VERIFICATION, ip);

    // await this.emailService.sendOtpEmail(user.email, user.firstName ?? user.username, otp);
    this.logger.log(`[DEV] OTP for direct signup [userId=${user.id}]: ${otp}`);

    this.logger.log(`Direct signup initiated [userId=${user.id}] [source=${signupSource}]`);
    return { userId: user.id, email: user.email, username: user.username, message: 'OTP sent to your email address.' };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OTP Verification
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verify email OTP.
   * On success: marks emailVerified = true, transitions status → ACTIVE.
   * If user came from waitlist, marks the reservation as converted.
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<OtpVerifyResponse> {
    await this.otpService.verify(dto.userId, dto.code, dto.purpose);
    await this.usersService.markEmailVerified(dto.userId);

    // If this was a waitlist user, mark reservation as fully converted
    const reservation = await this.reservationRepo.findOne({
      where: { convertedUserId: dto.userId },
    });
    if (reservation) {
      await this.waitlistTokenService.markConverted(reservation.id, dto.userId);
    }

    this.logger.log(`Email verified [userId=${dto.userId}]`);
    return { userId: dto.userId, emailVerified: true, status: 'active' };
  }

  /** Resend OTP — invalidates previous, issues new. Rate-limited at controller level. */
  async resendOtp(userId: string, ip?: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (!user) return; // Silent — don't expose user existence

    const otp = await this.otpService.generate(user.id, OtpPurpose.EMAIL_VERIFICATION, ip);
    // await this.emailService.sendOtpEmail(user.email, user.firstName ?? user.username, otp);
    this.logger.log(`[DEV] OTP resent [userId=${user.id}]: ${otp}`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Login
  // ─────────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, context?: { ip?: string; userAgent?: string }): Promise<LoginResponse> {
    const user = await this.usersService.validateCredentials(dto.identifier, dto.password);

    await this.usersService.updateLastLogin(user.id, context?.ip);

    const tokens = await this.tokenService.issuePair(user, context);

    this.logger.log(`Login successful [userId=${user.id}] [ip=${context?.ip}]`);
    return {
      tokens,
      user: {
        id:       user.id,
        email:    user.email,
        username: user.username,
        tier:     user.tier,
        status:   user.status,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Token Management
  // ─────────────────────────────────────────────────────────────────────────

  async refreshTokens(dto: RefreshTokenDto, context?: { ip?: string; userAgent?: string }): Promise<TokenPair> {
    const result = await this.tokenService.rotate(dto.refreshToken, context);
    return {
      accessToken:      result.accessToken,
      refreshToken:     result.refreshToken,
      expiresIn:        result.expiresIn,
      refreshExpiresIn: result.refreshExpiresIn,
    };
  }

  async logout(refreshToken: string): Promise<void> {
    await this.tokenService.revoke(refreshToken);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.tokenService.revokeAllForUser(userId);
  }
}
