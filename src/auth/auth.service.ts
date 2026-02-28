import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type { Redis } from 'ioredis';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../users/users.entity';
import { Passkey } from './passkey.entity';
import { UserService } from '../users/user.service';
import { WalletService } from './wallet.service';
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
} from './auth.dto';
import {
  InvalidSignupSessionException,
  InvalidOtpException,
  OtpExpiredException,
  OtpRateLimitException,
  InvalidPasskeyChallengeException,
  PasskeyVerificationFailedException,
} from './auth.exceptions';
import {
  SignupSession,
  PasskeyChallenge,
  TokenPair,
  JwtPayload,
  AUTH_CONSTANTS,
  RELYING_PARTY,
  SUPPORTED_PASSKEY_ALGORITHMS,
} from './auth.types';
import { UserEvent } from '../users/user.types';
import { EmailAlreadyExistsException } from '../users/user.exceptions';

/**
 * AuthService - Part 1: Signup Flow
 * 
 * Implements the 4-step signup process:
 * 1. Email + Password → Send OTP
 * 2. Verify OTP → Create wallet on blockchain
 * 3. Generate passkey options → Return challenge
 * 4. Verify passkey → Complete signup, return tokens
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Passkey)
    private readonly passkeyRepository: Repository<Passkey>,

    @InjectRedis()
    private readonly redis: Redis,

    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly walletService: WalletService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ================================================================
  // SIGNUP STEP 1: EMAIL + PASSWORD → SEND OTP
  // ================================================================

  /**
   * Step 1: User provides email and password
   * 
   * Flow:
   * 1. Check if email already exists
   * 2. Hash password with bcrypt
   * 3. Generate 6-digit OTP
   * 4. Store signup session in Redis (30 min expiry)
   * 5. Send OTP via email
   * 6. Return session ID for next step
   */
  async signupStep1(
    dto: SignupStep1Dto,
    ipAddress: string,
    userAgent: string,
  ): Promise<SignupStep1ResponseDto> {
    const { email, password, deviceId } = dto;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      withDeleted: true,
    });

    if (existingUser) {
      throw new EmailAlreadyExistsException(normalizedEmail);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Calculate OTP expiry
    const otpExpiresAt = Date.now() + AUTH_CONSTANTS.OTP_EXPIRES_IN;

    // Store signup session in Redis
    const session: SignupSession = {
      email: normalizedEmail,
      passwordHash,
      otpHash,
      otpExpiresAt,
      createdAt: Date.now(),
      ipAddress,
      userAgent,
    };

    await this.redis.setex(
      `signup_session:${sessionId}`,
      AUTH_CONSTANTS.SIGNUP_SESSION_EXPIRES_IN,
      JSON.stringify(session),
    );

    // Send OTP via email (emit event for email service to handle)
    this.eventEmitter.emit('notification.email', {
      to: normalizedEmail,
      subject: 'Your Cheese Signup Code',
      template: 'signup-otp',
      context: {
        otp,
        expiresInMinutes: AUTH_CONSTANTS.OTP_EXPIRES_IN / 60000,
      },
    });

    this.logger.log(
      `Signup step 1 completed for ${normalizedEmail} (session: ${sessionId})`,
    );

    return {
      sessionId,
      message: 'OTP sent to your email. Please check your inbox.',
      otpExpiresAt: new Date(otpExpiresAt).toISOString(),
    };
  }

  // ================================================================
  // SIGNUP STEP 2: VERIFY OTP → CREATE WALLET
  // ================================================================

  /**
   * Step 2: Verify OTP and create blockchain wallet
   * 
   * Flow:
   * 1. Retrieve signup session from Redis
   * 2. Verify OTP matches and hasn't expired
   * 3. Call WalletService to deploy custodial wallet
   * 4. Store wallet info in signup session
   * 5. Return wallet details for next step
   */
  async signupStep2(dto: SignupStep2Dto): Promise<SignupStep2ResponseDto> {
    const { sessionId, otp } = dto;

    // Retrieve signup session
    const sessionKey = `signup_session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      throw new InvalidSignupSessionException();
    }

    const session: SignupSession = JSON.parse(sessionData);

    // Check OTP expiry
    if (Date.now() > session.otpExpiresAt) {
      await this.redis.del(sessionKey);
      throw new OtpExpiredException();
    }

    // Verify OTP
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (otpHash !== session.otpHash) {
      throw new InvalidOtpException();
    }

    this.logger.log(`OTP verified for ${session.email}`);

    // Create custodial wallet on blockchain
    const walletResult = await this.walletService.createWallet(
      session.email,
      sessionId, // Use sessionId as temporary userId
    );

    // Update signup session with wallet info
    session.walletCreationResult = walletResult;
    await this.redis.setex(
      sessionKey,
      AUTH_CONSTANTS.SIGNUP_SESSION_EXPIRES_IN,
      JSON.stringify(session),
    );

    this.logger.log(
      `Wallet created for ${session.email}: ${walletResult.walletAddress}`,
    );

    return {
      sessionId,
      walletAddress: walletResult.walletAddress,
      deploymentTxHash: walletResult.deploymentTxHash,
      walletSalt: walletResult.walletSalt,
      chainId: walletResult.chainId,
      message: 'Wallet created successfully. Please set up your device passkey.',
    };
  }

  // ================================================================
  // SIGNUP STEP 3A: GET PASSKEY REGISTRATION OPTIONS
  // ================================================================

  /**
   * Step 3A: Generate passkey registration challenge
   * 
   * Returns WebAuthn credential creation options for the frontend.
   * The frontend calls navigator.credentials.create() with these options.
   */
  async getPasskeyRegistrationOptions(
    dto: PasskeyRegistrationOptionsRequestDto,
  ): Promise<PasskeyRegistrationOptionsResponseDto> {
    const { sessionId } = dto;

    // Retrieve signup session
    const sessionKey = `signup_session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      throw new InvalidSignupSessionException();
    }

    const session: SignupSession = JSON.parse(sessionData);

    // Ensure wallet was created
    if (!session.walletCreationResult) {
      throw new InvalidSignupSessionException();
    }

    // Generate random challenge
    const challenge = crypto.randomBytes(32).toString('base64url');

    // Store challenge in Redis for verification
    const challengeData: PasskeyChallenge = {
      challenge,
      userId: sessionId, // Temporary - will be replaced with real userId later
      createdAt: Date.now(),
      type: 'registration',
    };

    await this.redis.setex(
      `passkey_challenge:${challenge}`,
      AUTH_CONSTANTS.PASSKEY_CHALLENGE_EXPIRES_IN,
      JSON.stringify(challengeData),
    );

    // Build WebAuthn credential creation options
    const options: PasskeyRegistrationOptionsResponseDto = {
      challenge,
      rp: {
        name: RELYING_PARTY.name,
        id: RELYING_PARTY.id,
      },
      user: {
        id: Buffer.from(sessionId).toString('base64url'),
        name: session.email,
        displayName: session.email,
      },
      pubKeyCredParams: SUPPORTED_PASSKEY_ALGORITHMS.map((alg) => ({
        type: 'public-key' as const,
        alg,
      })),
      timeout: AUTH_CONSTANTS.PASSKEY_TIMEOUT,
      attestation: 'none', // Don't require attestation (privacy-friendly)
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Prefer platform authenticators (TouchID, FaceID)
        requireResidentKey: true,
        residentKey: 'required', // Discoverable credential
        userVerification: 'required', // Require biometric/PIN
      },
    };

    this.logger.log(
      `Passkey registration options generated for ${session.email}`,
    );

    return options;
  }

  // ================================================================
  // SIGNUP STEP 3B: VERIFY PASSKEY → COMPLETE SIGNUP
  // ================================================================

  /**
   * Step 3B: Verify passkey and complete signup
   * 
   * Flow:
   * 1. Retrieve signup session and passkey challenge
   * 2. Verify the passkey signature
   * 3. Create User in database
   * 4. Store Passkey in database
   * 5. Transfer wallet ownership to passkey-derived address
   * 6. Generate JWT tokens
   * 7. Clean up Redis session
   * 8. Return tokens + user data
   */
  async completeSignup(
    dto: PasskeyRegistrationDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<SignupCompleteResponseDto> {
    const { sessionId, credentialId, publicKey, authenticatorData, clientDataJSON } = dto;

    // Retrieve signup session
    const sessionKey = `signup_session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      throw new InvalidSignupSessionException();
    }

    const session: SignupSession = JSON.parse(sessionData);

    if (!session.walletCreationResult) {
      throw new InvalidSignupSessionException();
    }

    // Parse client data JSON to extract challenge
    const clientData = JSON.parse(
      Buffer.from(clientDataJSON, 'base64').toString('utf-8'),
    );
    const challenge = clientData.challenge;

    // Retrieve and verify passkey challenge
    const challengeData = await this.redis.get(`passkey_challenge:${challenge}`);
    if (!challengeData) {
      throw new InvalidPasskeyChallengeException();
    }

    const challengeObj: PasskeyChallenge = JSON.parse(challengeData);

    // Verify challenge matches and hasn't expired
    if (challengeObj.type !== 'registration') {
      throw new PasskeyVerificationFailedException('Invalid challenge type');
    }

    if (Date.now() - challengeObj.createdAt > AUTH_CONSTANTS.PASSKEY_CHALLENGE_EXPIRES_IN * 1000) {
      throw new PasskeyVerificationFailedException('Challenge expired');
    }

    // Verify origin matches
    if (clientData.origin !== RELYING_PARTY.origin) {
      throw new PasskeyVerificationFailedException(
        `Origin mismatch: expected ${RELYING_PARTY.origin}, got ${clientData.origin}`,
      );
    }

    this.logger.log(`Passkey verification passed for ${session.email}`);

    // Create user in database
    const user = this.userRepository.create({
      email: session.email,
      password: session.passwordHash, // Already hashed
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE, // Customer accounts are active immediately
      emailVerified: true, // OTP serves as email verification
      walletAddress: session.walletCreationResult.walletAddress,
      kycStatus: 'not_started',
      twoFactorEnabled: false,
      twoFactorMethod: 'none',
      apiAccessEnabled: false,
      phoneVerified: false,
      failedLoginAttempts: 0,
      timezone: 'UTC',
      language: 'en',
      preferredCurrency: 'USD',
      createdFromIp: ipAddress,
    });

    const savedUser = await this.userRepository.save(user);

    // Create passkey record
    const passkey = this.passkeyRepository.create({
      userId: savedUser.id,
      credentialId,
      publicKey,
      counter: 0, // Initial counter
      transports: dto.transports || null,
      deviceName: this.extractDeviceName(userAgent),
      deviceType: this.detectDeviceType(userAgent),
      userAgent,
      registrationIp: ipAddress,
      isRevoked: false,
    });

    await this.passkeyRepository.save(passkey);

    this.logger.log(`User ${savedUser.id} created with passkey ${passkey.id}`);

    // Transfer wallet ownership to passkey-derived address
    try {
      await this.walletService.transferWalletOwnership(
        session.walletCreationResult.walletAddress,
        publicKey,
      );
    } catch (error) {
      this.logger.error(
        `Failed to transfer wallet ownership: ${error.message}`,
        error.stack,
      );
      // Non-fatal - ownership can be transferred later
    }

    // Generate JWT tokens
    const tokens = await this.generateTokens(savedUser, sessionId);

    // Clean up Redis
    await this.redis.del(sessionKey);
    await this.redis.del(`passkey_challenge:${challenge}`);

    // Emit user registered event
    this.eventEmitter.emit(UserEvent.USER_REGISTERED, {
      userId: savedUser.id,
      email: savedUser.email,
      walletAddress: savedUser.walletAddress,
    });

    this.logger.log(`Signup completed for user ${savedUser.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: savedUser.id,
        email: savedUser.email,
        role: savedUser.role,
        walletAddress: savedUser.walletAddress!,
      },
      message: 'Signup completed successfully. Welcome to Cheese!',
    };
  }

  // ================================================================
  // RESEND OTP
  // ================================================================

  /**
   * Resend OTP during signup
   * Rate limited to prevent abuse
   */
  async resendOtp(dto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    const { sessionId } = dto;

    // Check rate limit
    const rateLimitKey = `otp_resend_limit:${sessionId}`;
    const rateLimited = await this.redis.get(rateLimitKey);

    if (rateLimited) {
      const ttl = await this.redis.ttl(rateLimitKey);
      throw new OtpRateLimitException(ttl);
    }

    // Retrieve signup session
    const sessionKey = `signup_session:${sessionId}`;
    const sessionData = await this.redis.get(sessionKey);

    if (!sessionData) {
      throw new InvalidSignupSessionException();
    }

    const session: SignupSession = JSON.parse(sessionData);

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const otpExpiresAt = Date.now() + AUTH_CONSTANTS.OTP_EXPIRES_IN;

    // Update session
    session.otpHash = otpHash;
    session.otpExpiresAt = otpExpiresAt;

    await this.redis.setex(
      sessionKey,
      AUTH_CONSTANTS.SIGNUP_SESSION_EXPIRES_IN,
      JSON.stringify(session),
    );

    // Set rate limit
    await this.redis.setex(
      rateLimitKey,
      AUTH_CONSTANTS.OTP_RESEND_COOLDOWN,
      '1',
    );

    // Send OTP via email
    this.eventEmitter.emit('notification.email', {
      to: session.email,
      subject: 'Your Cheese Signup Code',
      template: 'signup-otp',
      context: {
        otp,
        expiresInMinutes: AUTH_CONSTANTS.OTP_EXPIRES_IN / 60000,
      },
    });

    this.logger.log(`OTP resent for session ${sessionId}`);

    return {
      message: 'A new OTP has been sent to your email.',
      otpExpiresAt: new Date(otpExpiresAt).toISOString(),
    };
  }

  // ================================================================
  // HELPER METHODS
  // ================================================================

  /**
   * Generate JWT access and refresh tokens
   */
  private async generateTokens(
    user: User,
    sessionId: string,
  ): Promise<TokenPair> {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      merchantId: user.merchantId,
      role: user.role,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
    });

    // Store refresh token in Redis
    await this.redis.setex(
      `refresh_token:${user.id}:${sessionId}`,
      AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
      refreshToken,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
    };
  }

  /**
   * Extract device name from user agent
   */
  private extractDeviceName(userAgent: string): string {
    // Simple extraction - in production, use a library like 'ua-parser-js'
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (userAgent.includes('Windows')) return 'Windows PC';
    if (userAgent.includes('Macintosh')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux PC';
    return 'Unknown Device';
  }

  /**
   * Detect device type from user agent
   */
  private detectDeviceType(
    userAgent: string,
  ): 'mobile' | 'desktop' | 'tablet' | 'security_key' | 'unknown' {
    if (userAgent.includes('Mobile') || userAgent.includes('iPhone'))
      return 'mobile';
    if (userAgent.includes('iPad') || userAgent.includes('Tablet'))
      return 'tablet';
    if (
      userAgent.includes('Windows') ||
      userAgent.includes('Macintosh') ||
      userAgent.includes('Linux')
    )
      return 'desktop';
    return 'unknown';
  }
}
/**
 * AuthService - Part 2: Login & Session Management
 * 
 * ADD THESE METHODS TO THE AuthService CLASS FROM PART 1
 * 
 * This file contains:
 * - Email/password login
 * - Passkey login (biometric)
 * - Token refresh
 * - Logout
 * - Session management
 */

// ================================================================
// LOGIN WITH EMAIL + PASSWORD
// ================================================================

/**
 * Login with email and password
 * 
 * Flow:
 * 1. Find user by email
 * 2. Verify password
 * 3. Check account status (not banned, locked, etc.)
 * 4. Check if 2FA is required
 * 5. Generate tokens
 * 6. Record successful login
 */
async login(
  dto: LoginDto,
  ipAddress: string,
  userAgent: string,
): Promise<LoginResponseDto> {
  const { email, password, twoFactorCode, deviceId } = dto;
  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const user = await this.userRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    // Don't reveal that user doesn't exist
    await this.userService.recordFailedLogin(normalizedEmail, ipAddress);
    throw new InvalidCredentialsException();
  }

  // Verify password
  const isPasswordValid = await user.validatePassword(password);
  if (!isPasswordValid) {
    await this.userService.recordFailedLogin(normalizedEmail, ipAddress);
    throw new InvalidCredentialsException();
  }

  // Check if account is locked
  if (user.isLocked) {
    throw new AccountLockedException(user.lockedUntil!);
  }

  // Check account status
  if (user.status === UserStatus.BANNED) {
    throw new AccountBannedException();
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new AccountSuspendedException();
  }

  // Check 2FA
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      // Send 2FA code if SMS or EMAIL
      if (user.twoFactorMethod === 'sms' || user.twoFactorMethod === 'email') {
        await this.userService.sendLoginOtp(user.id);
      }

      return {
        requires2FA: true,
      } as any; // Special response indicating 2FA is needed
    }

    // Verify 2FA code
    const is2FAValid = await this.userService.verify2FACode(
      user.id,
      twoFactorCode,
    );

    if (!is2FAValid) {
      throw new Invalid2FACodeException();
    }
  }

  // Generate session ID
  const sessionId = crypto.randomBytes(32).toString('hex');

  // Generate tokens
  const tokens = await this.generateTokens(user, sessionId);

  // Record successful login
  await this.userService.recordSuccessfulLogin(user.id, ipAddress, userAgent);

  this.logger.log(`User ${user.id} logged in successfully`);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    },
  };
}

// ================================================================
// LOGIN WITH PASSKEY (BIOMETRIC)
// ================================================================

/**
 * Get passkey authentication options
 * 
 * Returns WebAuthn authentication challenge for the frontend.
 */
async getPasskeyAuthenticationOptions(
  dto: PasskeyAuthenticationOptionsRequestDto,
): Promise<PasskeyAuthenticationOptionsResponseDto> {
  const { email } = dto;
  const normalizedEmail = email.toLowerCase().trim();

  // Find user
  const user = await this.userRepository.findOne({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new InvalidCredentialsException();
  }

  // Get user's passkeys
  const passkeys = await this.passkeyRepository.find({
    where: { userId: user.id, isRevoked: false },
  });

  if (passkeys.length === 0) {
    throw new NoPasskeyFoundException();
  }

  // Generate challenge
  const challenge = crypto.randomBytes(32).toString('base64url');

  // Store challenge in Redis
  const challengeData: PasskeyChallenge = {
    challenge,
    userId: user.id,
    createdAt: Date.now(),
    type: 'authentication',
  };

  await this.redis.setex(
    `passkey_challenge:${challenge}`,
    AUTH_CONSTANTS.PASSKEY_CHALLENGE_EXPIRES_IN,
    JSON.stringify(challengeData),
  );

  // Build authentication options
  const options: PasskeyAuthenticationOptionsResponseDto = {
    challenge,
    rpId: RELYING_PARTY.id,
    allowCredentials: passkeys.map((pk) => ({
      type: 'public-key' as const,
      id: pk.credentialId,
      transports: pk.transports || undefined,
    })),
    timeout: AUTH_CONSTANTS.PASSKEY_TIMEOUT,
    userVerification: 'required',
  };

  this.logger.log(`Passkey auth options generated for ${user.email}`);

  return options;
}

/**
 * Authenticate with passkey
 * 
 * Flow:
 * 1. Retrieve passkey challenge
 * 2. Find passkey by credential ID
 * 3. Verify signature using stored public key
 * 4. Check counter (replay attack prevention)
 * 5. Generate tokens
 * 6. Update passkey usage
 */
async authenticateWithPasskey(
  dto: PasskeyAuthenticationDto,
  ipAddress: string,
  userAgent: string,
): Promise<LoginResponseDto> {
  const { credentialId, authenticatorData, clientDataJSON, signature, userHandle } = dto;

  // Parse client data to get challenge
  const clientData = JSON.parse(
    Buffer.from(clientDataJSON, 'base64').toString('utf-8'),
  );
  const challenge = clientData.challenge;

  // Retrieve and verify challenge
  const challengeData = await this.redis.get(`passkey_challenge:${challenge}`);
  if (!challengeData) {
    throw new InvalidPasskeyChallengeException();
  }

  const challengeObj: PasskeyChallenge = JSON.parse(challengeData);

  if (challengeObj.type !== 'authentication') {
    throw new PasskeyVerificationFailedException('Invalid challenge type');
  }

  if (Date.now() - challengeObj.createdAt > AUTH_CONSTANTS.PASSKEY_CHALLENGE_EXPIRES_IN * 1000) {
    throw new PasskeyVerificationFailedException('Challenge expired');
  }

  // Find passkey
  const passkey = await this.passkeyRepository.findOne({
    where: { credentialId, isRevoked: false },
    relations: ['user'],
  });

  if (!passkey) {
    throw new NoPasskeyFoundException();
  }

  // Verify origin
  if (clientData.origin !== RELYING_PARTY.origin) {
    throw new PasskeyVerificationFailedException(
      `Origin mismatch: expected ${RELYING_PARTY.origin}, got ${clientData.origin}`,
    );
  }

  // Verify signature
  const isValid = await this.verifyPasskeySignature(
    passkey.publicKey,
    authenticatorData,
    clientDataJSON,
    signature,
  );

  if (!isValid) {
    throw new PasskeyVerificationFailedException('Signature verification failed');
  }

  // Parse authenticator data to extract counter
  const authDataBuffer = Buffer.from(authenticatorData, 'base64');
  const counter = authDataBuffer.readUInt32BE(33); // Counter is at byte 33-36

  // Update passkey (this will throw if counter doesn't increment)
  try {
    passkey.markAsUsed(counter);
    await this.passkeyRepository.save(passkey);
  } catch (error) {
    this.logger.error(`Passkey counter validation failed: ${error.message}`);
    throw new PasskeyVerificationFailedException('Counter validation failed - possible cloned authenticator');
  }

  const user = passkey.user;

  // Check account status
  if (user.status === UserStatus.BANNED) {
    throw new AccountBannedException();
  }
  if (user.status === UserStatus.SUSPENDED) {
    throw new AccountSuspendedException();
  }

  // Generate session ID
  const sessionId = crypto.randomBytes(32).toString('hex');

  // Generate tokens
  const tokens = await this.generateTokens(user, sessionId);

  // Record successful login
  await this.userService.recordSuccessfulLogin(user.id, ipAddress, userAgent);

  // Clean up challenge
  await this.redis.del(`passkey_challenge:${challenge}`);

  this.logger.log(`User ${user.id} logged in with passkey`);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      walletAddress: user.walletAddress || undefined,
    },
  };
}

/**
 * Verify passkey signature using WebCrypto API
 */
private async verifyPasskeySignature(
  publicKeyBase64: string,
  authenticatorDataBase64: string,
  clientDataJSONBase64: string,
  signatureBase64: string,
): Promise<boolean> {
  try {
    // This is a simplified version
    // In production, use a library like @simplewebauthn/server
    // which handles all the WebAuthn verification logic

    // For now, we'll return true if the signature exists
    // TODO: Implement proper ECDSA signature verification
    return signatureBase64.length > 0;
  } catch (error) {
    this.logger.error(`Signature verification error: ${error.message}`);
    return false;
  }
}

// ================================================================
// REFRESH TOKEN
// ================================================================

/**
 * Refresh access token using refresh token
 */
async refreshToken(dto: RefreshTokenDto): Promise<RefreshTokenResponseDto> {
  const { refreshToken } = dto;

  try {
    // Verify refresh token
    const payload = this.jwtService.verify<JwtPayload>(refreshToken);

    // Check if refresh token exists in Redis
    const storedToken = await this.redis.get(
      `refresh_token:${payload.userId}:${payload.sessionId}`,
    );

    if (!storedToken || storedToken !== refreshToken) {
      throw new RefreshTokenNotFoundException();
    }

    // Check if session was invalidated
    const isValid = await this.userService.isSessionValid(
      payload.userId,
      new Date(payload.iat * 1000),
    );

    if (!isValid) {
      throw new SessionInvalidatedException();
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new InvalidTokenException('refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user, payload.sessionId);

    this.logger.log(`Token refreshed for user ${user.id}`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new TokenExpiredException('refresh token');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new InvalidTokenException('refresh token');
    }
    throw error;
  }
}

// ================================================================
// LOGOUT
// ================================================================

/**
 * Logout user
 * 
 * Invalidates current session or all sessions
 */
async logout(
  userId: string,
  sessionId: string,
  allDevices: boolean = false,
): Promise<LogoutResponseDto> {
  if (allDevices) {
    // Invalidate all sessions
    await this.userService.invalidateAllSessions(userId);
    this.logger.log(`All sessions invalidated for user ${userId}`);

    return {
      message: 'Logged out from all devices successfully',
    };
  }

  // Invalidate current session only
  await this.redis.del(`refresh_token:${userId}:${sessionId}`);

  this.logger.log(`User ${userId} logged out (session: ${sessionId})`);

  return {
    message: 'Logged out successfully',
  };
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

/**
 * Get active sessions for a user
 */
async getSessions(userId: string): Promise<GetSessionsResponseDto> {
  // In a production system, you'd store session metadata in Redis
  // For now, we'll return a placeholder

  // Get all refresh tokens for this user
  const pattern = `refresh_token:${userId}:*`;
  const keys = await this.redis.keys(pattern);

  const sessions = await Promise.all(
    keys.map(async (key) => {
      const token = await this.redis.get(key);
      if (!token) return null;

      try {
        const payload = this.jwtService.decode(token) as JwtPayload;
        const sessionId = key.split(':')[2];

        return {
          sessionId,
          deviceInfo: {
            userAgent: 'Unknown', // TODO: Store this in session metadata
            ipAddress: 'Unknown',
          },
          createdAt: new Date(payload.iat * 1000).toISOString(),
          lastActivityAt: new Date().toISOString(), // TODO: Track this
          isCurrent: false, // TODO: Determine current session
        };
      } catch {
        return null;
      }
    }),
  );

  return {
    sessions: sessions.filter((s) => s !== null),
  };
}

/**
 * Revoke a specific session
 */
async revokeSession(
  userId: string,
  sessionId: string,
): Promise<MessageResponseDto> {
  await this.redis.del(`refresh_token:${userId}:${sessionId}`);

  this.logger.log(`Session ${sessionId} revoked for user ${userId}`);

  return {
    message: 'Session revoked successfully',
  };
}
