import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  SignupStep1Dto,
  SignupStep1ResponseDto,
  SignupStep2Dto,
  SignupStep2ResponseDto,
  PasskeyRegistrationOptionsRequestDto,
  PasskeyRegistrationOptionsResponseDto,
  PasskeyRegistrationDto,
  SignupCompleteResponseDto,
  ResendOtpDto,
  ResendOtpResponseDto,
  LoginDto,
  LoginResponseDto,
  PasskeyAuthenticationOptionsRequestDto,
  PasskeyAuthenticationOptionsResponseDto,
  PasskeyAuthenticationDto,
  RefreshTokenDto,
  RefreshTokenResponseDto,
  LogoutDto,
  LogoutResponseDto,
  GetSessionsResponseDto,
  RevokeSessionDto,
  MessageResponseDto,
} from './auth.dto';
import { JwtAuthGuard, CurrentUser } from './auth.guards';
import { RequestContext } from '../users/user.types';

/**
 * AuthController
 * 
 * Handles all authentication flows:
 * - Signup (4 steps: email/password → OTP → wallet → passkey)
 * - Login (email/password or passkey biometric)
 * - Token refresh
 * - Logout
 * - Session management
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ================================================================
  // SIGNUP FLOW
  // ================================================================

  @Post('signup/step1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Step 1: Email + Password → Send OTP',
    description: 'User provides email and password. System sends 6-digit OTP to email.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP sent successfully',
    type: SignupStep1ResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async signupStep1(
    @Body() dto: SignupStep1Dto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<SignupStep1ResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.signupStep1(dto, ipAddress, userAgent);
  }

  @Post('signup/step2')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Step 2: Verify OTP → Create Wallet',
    description: 'User provides OTP. System verifies and creates custodial wallet on blockchain.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'OTP verified, wallet created',
    type: SignupStep2ResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async signupStep2(
    @Body() dto: SignupStep2Dto,
  ): Promise<SignupStep2ResponseDto> {
    return this.authService.signupStep2(dto);
  }

  @Post('signup/passkey/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Step 3A: Get Passkey Registration Options',
    description: 'Returns WebAuthn challenge for passkey creation.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Passkey registration options',
    type: PasskeyRegistrationOptionsResponseDto,
  })
  async getPasskeyRegistrationOptions(
    @Body() dto: PasskeyRegistrationOptionsRequestDto,
  ): Promise<PasskeyRegistrationOptionsResponseDto> {
    return this.authService.getPasskeyRegistrationOptions(dto);
  }

  @Post('signup/complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ 
    summary: 'Step 3B: Complete Signup with Passkey',
    description: 'User registers device passkey (biometric). Signup completes, returns JWT tokens.',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Signup completed successfully',
    type: SignupCompleteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid passkey or session expired' })
  async completeSignup(
    @Body() dto: PasskeyRegistrationDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<SignupCompleteResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.completeSignup(dto, ipAddress, userAgent);
  }

  @Post('signup/resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Resend OTP',
    description: 'Resends OTP during signup. Rate limited to 1 per 60 seconds.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'New OTP sent',
    type: ResendOtpResponseDto,
  })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async resendOtp(
    @Body() dto: ResendOtpDto,
  ): Promise<ResendOtpResponseDto> {
    return this.authService.resendOtp(dto);
  }

  // ================================================================
  // LOGIN FLOWS
  // ================================================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login with Email + Password',
    description: 'Traditional login. If 2FA is enabled, returns requires2FA flag.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account locked or banned' })
  async login(
    @Body() dto: LoginDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(dto, ipAddress, userAgent);
  }

  @Post('login/passkey/options')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Get Passkey Authentication Options',
    description: 'Returns WebAuthn challenge for biometric login.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Passkey authentication options',
    type: PasskeyAuthenticationOptionsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No passkey found for this user' })
  async getPasskeyAuthenticationOptions(
    @Body() dto: PasskeyAuthenticationOptionsRequestDto,
  ): Promise<PasskeyAuthenticationOptionsResponseDto> {
    return this.authService.getPasskeyAuthenticationOptions(dto);
  }

  @Post('login/passkey')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login with Passkey (Biometric)',
    description: 'Passwordless login using device biometrics (Touch ID, Face ID, etc.).',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid passkey or signature' })
  async loginWithPasskey(
    @Body() dto: PasskeyAuthenticationDto,
    @Ip() ipAddress: string,
    @Req() req: Request,
  ): Promise<LoginResponseDto> {
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.authenticateWithPasskey(dto, ipAddress, userAgent);
  }

  // ================================================================
  // TOKEN MANAGEMENT
  // ================================================================

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Refresh Access Token',
    description: 'Get new access token using refresh token.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Token refreshed',
    type: RefreshTokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<RefreshTokenResponseDto> {
    return this.authService.refreshToken(dto);
  }

  // ================================================================
  // LOGOUT
  // ================================================================

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Logout',
    description: 'Logout from current device or all devices.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Logged out successfully',
    type: LogoutResponseDto,
  })
  async logout(
    @CurrentUser() ctx: RequestContext,
    @Body() dto: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(
      ctx.userId,
      ctx.sessionId!,
      dto.allDevices || false,
    );
  }

  // ================================================================
  // SESSION MANAGEMENT
  // ================================================================

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get Active Sessions',
    description: 'List all active sessions for the current user.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Active sessions',
    type: GetSessionsResponseDto,
  })
  async getSessions(
    @CurrentUser() ctx: RequestContext,
  ): Promise<GetSessionsResponseDto> {
    return this.authService.getSessions(ctx.userId);
  }

  @Delete('sessions/:sessionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Revoke Session',
    description: 'Logout from a specific device by revoking its session.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session revoked',
    type: MessageResponseDto,
  })
  async revokeSession(
    @CurrentUser() ctx: RequestContext,
    @Body() dto: RevokeSessionDto,
  ): Promise<MessageResponseDto> {
    return this.authService.revokeSession(ctx.userId, dto.sessionId);
  }
}
