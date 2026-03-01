import {
  Controller, Post, Get, Delete, Body, Param,
  HttpCode, HttpStatus, Headers, UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { DirectSignupDto } from './dto/direct-signup.dto';
import { WaitlistSignupDto } from './dto/waitlist-signup.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { ClientIp } from './decorators/client-ip.decorator';
import { User } from '../users/entities/user.entity';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Direct signup ─────────────────────────────────────────────────────────
  /**
   * POST /auth/signup
   * Creates a PENDING user, sends OTP, returns userId for subsequent steps.
   * Includes referral flow if referralCode present in body.
   */
  @Post('signup')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: DirectSignupDto, @ClientIp() ip: string) {
    return this.authService.directSignup(dto, ip);
  }

  // ── Waitlist continuation ─────────────────────────────────────────────────
  /**
   * POST /auth/signup/waitlist
   * Accepts a signed token from the launch email link.
   * Email + username are read from the verified token — not from user input.
   */
  @Post('signup/waitlist')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(HttpStatus.CREATED)
  waitlistSignup(@Body() dto: WaitlistSignupDto, @ClientIp() ip: string) {
    return this.authService.waitlistSignup(dto, ip);
  }

  // ── OTP Verification ──────────────────────────────────────────────────────
  /**
   * POST /auth/otp/verify
   * Validates the 6-digit code. On success, activates the account.
   */
  @Post('otp/verify')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ── OTP Resend ────────────────────────────────────────────────────────────
  /**
   * POST /auth/otp/resend
   * Invalidates previous OTP, issues a new one.
   * Aggressively rate-limited: 3 per 2 minutes per IP.
   */
  @Post('otp/resend')
  @Public()
  @Throttle({ default: { ttl: 120_000, limit: 3 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  async resendOtp(@Body() dto: ResendOtpDto, @ClientIp() ip: string) {
    await this.authService.resendOtp(dto.userId, ip);
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  /**
   * POST /auth/login
   * Accepts email OR username + password.
   * Returns access token (15 min) + refresh token (7 days).
   */
  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.login(dto, { ip, userAgent });
  }

  // ── Token Refresh ─────────────────────────────────────────────────────────
  /**
   * POST /auth/token/refresh
   * Rotates refresh token — old token is immediately revoked.
   * Replay of revoked token → all sessions wiped (theft detection).
   */
  @Post('token/refresh')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  refreshTokens(
    @Body() dto: RefreshTokenDto,
    @ClientIp() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.authService.refreshTokens(dto, { ip, userAgent });
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  /**
   * POST /auth/logout
   * Revokes the provided refresh token (current session only).
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  // ── Logout All ────────────────────────────────────────────────────────────
  /**
   * DELETE /auth/sessions
   * Revokes ALL refresh tokens for the authenticated user.
   * Use on: password change, suspicious activity, "sign out everywhere".
   */
  @Delete('sessions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: User) {
    await this.authService.logoutAllDevices(user.id);
  }

  // ── Session health ────────────────────────────────────────────────────────
  /**
   * GET /auth/me
   * Validates the access token and returns the authenticated user's profile.
   * Use on app boot to check if stored access token is still valid.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: User) {
    return {
      id:            user.id,
      email:         user.email,
      username:      user.username,
      tier:          user.tier,
      status:        user.status,
      emailVerified: user.emailVerified,
      createdAt:     user.createdAt,
    };
  }
}
