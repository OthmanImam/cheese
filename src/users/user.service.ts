import {
  Injectable,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  DataSource,
  Not,
  ILike,
  IsNull,
  FindOptionsWhere,
  QueryRunner,
} from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { plainToInstance } from 'class-transformer';

import { User, UserRole, UserStatus, KYCStatus, TwoFactorMethod } from './user.entity';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  ResendVerificationEmailDto,
  VerifyPhoneDto,
  Enable2FADto,
  Verify2FADto,
  Disable2FADto,
  Use2FABackupCodeDto,
  UpdateUserRoleDto,
  UpdateUserStatusDto,
  UpdateTransactionLimitsDto,
  InviteTeamMemberDto,
  UserQueryDto,
  UserResponseDto,
  PaginatedUsersResponseDto,
  TwoFactorSetupResponseDto,
  MessageResponseDto,
} from './user.dto';
import {
  UserNotFoundException,
  EmailAlreadyExistsException,
  PhoneAlreadyExistsException,
  InvalidPasswordException,
  PasswordMismatchException,
  SamePasswordException,
  AccountNotVerifiedException,
  AccountSuspendedException,
  AccountBannedException,
  AccountLockedException,
  AccountPendingApprovalException,
  KYCAlreadySubmittedException,
  InvalidTokenException,
  ExpiredTokenException,
  TwoFactorAlreadyEnabledException,
  TwoFactorNotEnabledException,
  Invalid2FACodeException,
  InvalidBackupCodeException,
  InsufficientPermissionsException,
  CannotModifyOwnRoleException,
  CannotDeleteOwnAccountException,
  CrossMerchantAccessException,
  InvalidInviteRoleException,
  VerificationEmailRateLimitException,
  PasswordResetRateLimitException,
} from './user.exceptions';
import {
  RequestContext,
  PaginatedResult,
  TokenResult,
  TwoFactorSetupResult,
  AuditLogEntry,
  UserAuditAction,
  UserEvent,
  INTERNAL_ONLY_ROLES,
  MERCHANT_SCOPED_ROLES,
  TOKEN_EXPIRY,
  RATE_LIMIT,
} from './user.types';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly dataSource: DataSource,

    private readonly eventEmitter: EventEmitter2,

    @InjectRedis()
    private readonly redis: Redis,
  ) {}

  // ================================================================
  // PRIVATE HELPERS
  // ================================================================

  /**
   * Generate a cryptographically secure random token,
   * returning both the raw token (to send to user) and
   * a hashed version (to store in DB — never store raw tokens)
   */
  private generateToken(expiryMs: number): TokenResult {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    const expiresAt = new Date(Date.now() + expiryMs);
    return { token, hashedToken, expiresAt };
  }

  /**
   * Hash a raw token for comparison against stored hash
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate backup codes for 2FA recovery
   * Returns pairs: [plainCode, hashedCode]
   */
  private generateBackupCodes(count = 10): { plain: string[]; hashed: string[] } {
    const plain: string[] = [];
    const hashed: string[] = [];

    for (let i = 0; i < count; i++) {
      const code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10-char code
      const formatted = `${code.slice(0, 5)}-${code.slice(5)}`; // XXXXX-XXXXX format
      plain.push(formatted);
      hashed.push(crypto.createHash('sha256').update(formatted).digest('hex'));
    }

    return { plain, hashed };
  }

  /**
   * Serialize a User entity into a safe response DTO
   * Strips all sensitive fields
   */
  private toResponseDto(user: User): UserResponseDto {
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Build paginated response metadata
   */
  private buildPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  /**
   * Emit an audit log event. In production this goes to
   * a dedicated audit log service / table.
   */
  private async audit(entry: AuditLogEntry): Promise<void> {
    this.logger.log(
      `AUDIT [${entry.action}] by=${entry.performedBy} target=${entry.targetUserId} ip=${entry.ipAddress ?? 'N/A'}`,
    );
    this.eventEmitter.emit('audit.log', entry);
  }

  /**
   * Redis key helpers for rate limiting
   */
  private rateLimitKey(type: string, identifier: string): string {
    return `rate_limit:${type}:${identifier}`;
  }

  /**
   * Enforce rate limiting using Redis.
   * Throws if the action has been performed too recently.
   */
  private async enforceRateLimit(
    type: string,
    identifier: string,
    cooldownSeconds: number,
  ): Promise<void> {
    const key = this.rateLimitKey(type, identifier);
    const exists = await this.redis.get(key);
    if (exists) {
      const ttl = await this.redis.ttl(key);
      if (type === 'verification_email') {
        throw new VerificationEmailRateLimitException(ttl);
      } else {
        throw new PasswordResetRateLimitException(ttl);
      }
    }
    await this.redis.setex(key, cooldownSeconds, '1');
  }

  /**
   * Assert that the requesting user has access to the target user.
   * SUPER_ADMIN can access any user.
   * Merchant-scoped roles can only access users in the same merchant.
   * A user can always access themselves.
   */
  private assertMerchantScope(ctx: RequestContext, targetUser: User): void {
    if (ctx.role === UserRole.SUPER_ADMIN) return;
    if (ctx.userId === targetUser.id) return;

    // Merchant-scoped users can only access same-merchant users
    if (
      MERCHANT_SCOPED_ROLES.includes(ctx.role) &&
      targetUser.merchantId !== ctx.merchantId
    ) {
      throw new CrossMerchantAccessException();
    }
  }

  /**
   * Assert user account is in a valid state for login/access
   */
  private assertAccountAccessible(user: User): void {
    if (user.status === UserStatus.BANNED) throw new AccountBannedException();
    if (user.status === UserStatus.SUSPENDED) throw new AccountSuspendedException();
    if (user.status === UserStatus.PENDING_APPROVAL) throw new AccountPendingApprovalException();
    if (user.isLocked) throw new AccountLockedException(user.lockedUntil!);
    if (!user.emailVerified) throw new AccountNotVerifiedException();
  }

  // ================================================================
  // CORE CRUD
  // ================================================================

  /**
   * Create a new user account.
   * Handles email uniqueness, phone uniqueness, token generation,
   * and fires the registered event for email delivery.
   */
  async createUser(
    dto: CreateUserDto,
    ctx: Partial<RequestContext> = {},
  ): Promise<UserResponseDto> {
    // Normalize email before uniqueness check
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check email uniqueness including soft-deleted users
    // (prevent re-registration with previously deleted email)
    const existingByEmail = await this.userRepository.findOne({
      where: { email: normalizedEmail },
      withDeleted: true,
    });

    if (existingByEmail) {
      // Don't reveal if account is deleted — treat as existing
      throw new EmailAlreadyExistsException(normalizedEmail);
    }

    // Check phone uniqueness if provided
    if (dto.phoneNumber) {
      const normalizedPhone = dto.phoneNumber.replace(/\s+/g, '');
      const existingByPhone = await this.userRepository.findOne({
        where: { phoneNumber: normalizedPhone },
        withDeleted: false,
      });
      if (existingByPhone) {
        throw new PhoneAlreadyExistsException(normalizedPhone);
      }
    }

    // Prevent assigning internal-only roles via public signup
    if (dto.role && INTERNAL_ONLY_ROLES.includes(dto.role)) {
      throw new InsufficientPermissionsException('assign this role');
    }

    // Merchant-scoped roles MUST have a merchantId
    if (
      dto.role &&
      MERCHANT_SCOPED_ROLES.includes(dto.role) &&
      !dto.merchantId
    ) {
      throw new InsufficientPermissionsException(
        'create merchant-scoped user without a merchantId',
      );
    }

    // Use a transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { token, hashedToken, expiresAt } = this.generateToken(
        TOKEN_EXPIRY.EMAIL_VERIFICATION,
      );

      const user = queryRunner.manager.create(User, {
        email: normalizedEmail,
        password: dto.password, // will be hashed by @BeforeInsert hook
        fullName: dto.fullName ?? null,
        phoneNumber: dto.phoneNumber ?? null,
        role: dto.role ?? UserRole.MERCHANT_OWNER,
        status: UserStatus.PENDING_VERIFICATION,
        merchantId: dto.merchantId ?? null,
        timezone: dto.timezone ?? 'UTC',
        language: dto.language ?? 'en',
        preferredCurrency: dto.preferredCurrency ?? 'USD',
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiresAt: expiresAt,
        createdBy: ctx.userId ?? null,
        createdFromIp: ctx.ipAddress ?? null,
        metadata: dto.metadata ?? null,
        kycStatus: KYCStatus.NOT_STARTED,
        twoFactorEnabled: false,
        twoFactorMethod: TwoFactorMethod.NONE,
        apiAccessEnabled: false,
        emailVerified: false,
        phoneVerified: false,
        failedLoginAttempts: 0,
      });

      const savedUser = await queryRunner.manager.save(User, user);
      await queryRunner.commitTransaction();

      // Emit event for email delivery (handled by NotificationService)
      this.eventEmitter.emit(UserEvent.USER_REGISTERED, {
        userId: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        verificationToken: token, // raw token for email link
      });

      await this.audit({
        action: UserAuditAction.USER_CREATED,
        performedBy: ctx.userId ?? savedUser.id,
        targetUserId: savedUser.id,
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
        timestamp: new Date(),
      });

      this.logger.log(`User created: ${savedUser.id} (${savedUser.email})`);
      return this.toResponseDto(savedUser);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      // Re-throw domain exceptions as-is
      if (
        error instanceof EmailAlreadyExistsException ||
        error instanceof PhoneAlreadyExistsException ||
        error instanceof InsufficientPermissionsException
      ) {
        throw error;
      }
      this.logger.error(`Failed to create user: ${error.message}`, error.stack);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find a user by ID.
   * Throws UserNotFoundException if not found or soft-deleted.
   */
  async findById(
    id: string,
    ctx?: RequestContext,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) throw new UserNotFoundException(id);
    if (ctx) this.assertMerchantScope(ctx, user);

    return this.toResponseDto(user);
  }

  /**
   * Internal method — returns raw User entity for operations
   * that need to mutate the entity (not for returning to clients)
   */
  async findByIdRaw(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) throw new UserNotFoundException(id);
    return user;
  }

  /**
   * Find user by email. Used primarily in auth flows.
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Paginated user list with filtering.
   * Merchant-scoped users only see users in their merchant.
   */
  async findAll(
    query: UserQueryDto,
    ctx: RequestContext,
  ): Promise<PaginatedUsersResponseDto> {
    const {
      search,
      role,
      status,
      kycStatus,
      merchantId,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = query;

    const qb = this.userRepository.createQueryBuilder('user');

    // Non-super-admins are always scoped to their merchant
    if (ctx.role !== UserRole.SUPER_ADMIN) {
      qb.andWhere('user.merchantId = :merchantId', {
        merchantId: ctx.merchantId,
      });
    } else if (merchantId) {
      // Super admin can filter by merchantId
      qb.andWhere('user.merchantId = :merchantId', { merchantId });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(user.email) LIKE :search OR LOWER(user.fullName) LIKE :search OR user.phoneNumber LIKE :search)',
        { search: `%${search.toLowerCase()}%` },
      );
    }

    if (role) qb.andWhere('user.role = :role', { role });
    if (status) qb.andWhere('user.status = :status', { status });
    if (kycStatus) qb.andWhere('user.kycStatus = :kycStatus', { kycStatus });

    // Whitelist sortable columns to prevent SQL injection
    const allowedSortColumns = [
      'createdAt', 'updatedAt', 'lastLoginAt', 'email', 'fullName', 'status', 'role',
    ];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';

    qb.orderBy(`user.${safeSortBy}`, sortOrder)
      .skip((page - 1) * limit)
      .take(limit);

    const [users, total] = await qb.getManyAndCount();

    const result = this.buildPaginatedResponse(
      users.map((u) => this.toResponseDto(u)),
      total,
      page,
      limit,
    );

    return result as PaginatedUsersResponseDto;
  }

  /**
   * Update user profile fields.
   * Users can update their own profile.
   * Admins can update any user in their merchant scope.
   */
  async updateUser(
    targetUserId: string,
    dto: UpdateUserDto,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    // Only the user themselves or an admin can update profile
    const isSelf = ctx.userId === targetUserId;
    const isAdmin =
      ctx.role === UserRole.SUPER_ADMIN ||
      ctx.role === UserRole.MERCHANT_ADMIN ||
      ctx.role === UserRole.MERCHANT_OWNER;

    if (!isSelf && !isAdmin) {
      throw new InsufficientPermissionsException('update this user');
    }

    // Apply only the fields that were provided
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.timezone !== undefined) user.timezone = dto.timezone;
    if (dto.language !== undefined) user.language = dto.language;
    if (dto.preferredCurrency !== undefined) user.preferredCurrency = dto.preferredCurrency;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;
    if (dto.notificationPreferences !== undefined)
      user.notificationPreferences = dto.notificationPreferences;

    // Phone number update requires re-verification
    if (dto.phoneNumber !== undefined && dto.phoneNumber !== user.phoneNumber) {
      const normalizedPhone = dto.phoneNumber.replace(/\s+/g, '');

      // Check uniqueness
      const existing = await this.userRepository.findOne({
        where: { phoneNumber: normalizedPhone },
      });
      if (existing && existing.id !== user.id) {
        throw new PhoneAlreadyExistsException(normalizedPhone);
      }

      user.phoneNumber = normalizedPhone;
      user.phoneVerified = false; // Reset verification on change
    }

    user.updatedBy = ctx.userId;
    const updated = await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.USER_UPDATED,
      performedBy: ctx.userId,
      targetUserId: user.id,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: { fields: Object.keys(dto) },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Soft-delete a user account.
   * Cannot delete your own account.
   * Cannot delete the last MERCHANT_OWNER of a merchant.
   */
  async deleteUser(
    targetUserId: string,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    if (ctx.userId === targetUserId) {
      throw new CannotDeleteOwnAccountException();
    }

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    // Only super_admin or merchant_owner can delete users
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException('delete users');
    }

    // Prevent deletion of the last merchant owner
    if (user.role === UserRole.MERCHANT_OWNER && user.merchantId) {
      const ownerCount = await this.userRepository.count({
        where: {
          merchantId: user.merchantId,
          role: UserRole.MERCHANT_OWNER,
          status: Not(UserStatus.BANNED),
        },
      });
      if (ownerCount <= 1) {
        throw new InsufficientPermissionsException(
          'delete the only merchant owner of a merchant organization',
        );
      }
    }

    await this.userRepository.softDelete(targetUserId);

    await this.audit({
      action: UserAuditAction.USER_DELETED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    this.logger.warn(
      `User soft-deleted: ${targetUserId} by ${ctx.userId}`,
    );

    return { message: 'User account has been deleted successfully' };
  }

  /**
   * Restore a soft-deleted user (super admin only)
   */
  async restoreUser(
    targetUserId: string,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    if (ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('restore deleted users');
    }

    const user = await this.userRepository.findOne({
      where: { id: targetUserId },
      withDeleted: true,
    });

    if (!user) throw new UserNotFoundException(targetUserId);
    if (!user.deletedAt) {
      return { message: 'User is not deleted' };
    }

    await this.userRepository.restore(targetUserId);

    await this.audit({
      action: UserAuditAction.USER_RESTORED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return { message: 'User account has been restored successfully' };
  }

  // ================================================================
  // EMAIL VERIFICATION
  // ================================================================

  /**
   * Verify email using the token sent during registration.
   * Token is hashed before storage so we hash the incoming token to compare.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<MessageResponseDto> {
    const hashedToken = this.hashToken(dto.token);

    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: hashedToken },
    });

    if (!user) throw new InvalidTokenException('email verification');

    if (user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    if (!user.hasValidEmailVerificationToken) {
      throw new ExpiredTokenException('email verification');
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationTokenExpiresAt = null;

    // Transition from PENDING_VERIFICATION to PENDING_APPROVAL (awaiting KYC)
    // or ACTIVE if KYC is not required (e.g. CUSTOMER role)
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      user.status =
        user.role === UserRole.CUSTOMER
          ? UserStatus.ACTIVE
          : UserStatus.PENDING_APPROVAL;
    }

    await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.EMAIL_VERIFIED, {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    await this.audit({
      action: UserAuditAction.EMAIL_VERIFIED,
      performedBy: user.id,
      targetUserId: user.id,
      timestamp: new Date(),
    });

    return { message: 'Email verified successfully' };
  }

  /**
   * Resend verification email.
   * Rate limited to prevent abuse.
   * Does not reveal whether the email exists (security: enumeration protection).
   */
  async resendVerificationEmail(
    dto: ResendVerificationEmailDto,
  ): Promise<MessageResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Rate limit check per email
    await this.enforceRateLimit(
      'verification_email',
      normalizedEmail,
      RATE_LIMIT.VERIFICATION_EMAIL_RESEND_SECONDS,
    );

    const user = await this.findByEmail(normalizedEmail);

    // Do not leak whether email exists — always return success-like response
    if (!user || user.emailVerified) {
      return {
        message:
          'If this email is registered and unverified, a verification email has been sent',
      };
    }

    if (
      user.status === UserStatus.BANNED ||
      user.status === UserStatus.SUSPENDED
    ) {
      // Don't reveal account status
      return {
        message:
          'If this email is registered and unverified, a verification email has been sent',
      };
    }

    const { token, hashedToken, expiresAt } = this.generateToken(
      TOKEN_EXPIRY.EMAIL_VERIFICATION,
    );

    user.emailVerificationToken = hashedToken;
    user.emailVerificationTokenExpiresAt = expiresAt;
    await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.USER_REGISTERED, {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      verificationToken: token,
      isResend: true,
    });

    await this.audit({
      action: UserAuditAction.VERIFICATION_EMAIL_RESENT,
      performedBy: user.id,
      targetUserId: user.id,
      timestamp: new Date(),
    });

    return {
      message:
        'If this email is registered and unverified, a verification email has been sent',
    };
  }

  // ================================================================
  // PHONE VERIFICATION
  // ================================================================

  /**
   * Send a phone verification OTP.
   * Generates a short numeric code and stores a hashed version.
   */
  async sendPhoneVerificationCode(
    userId: string,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    const user = await this.findByIdRaw(userId);
    this.assertMerchantScope(ctx, user);

    if (!user.phoneNumber) {
      throw new InvalidTokenException('no phone number set on this account');
    }

    if (user.phoneVerified) {
      return { message: 'Phone number is already verified' };
    }

    // Rate limit per user
    await this.enforceRateLimit(
      'phone_otp',
      userId,
      RATE_LIMIT.VERIFICATION_EMAIL_RESEND_SECONDS,
    );

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.PHONE_VERIFICATION);

    user.phoneVerificationCode = hashedCode;
    user.phoneVerificationCodeExpiresAt = expiresAt;
    await this.userRepository.save(user);

    // SMS delivery handled by NotificationService
    this.eventEmitter.emit('notification.sms', {
      to: user.phoneNumber,
      code,
      userId: user.id,
    });

    return { message: 'Verification code sent to your phone number' };
  }

  /**
   * Verify phone OTP code
   */
  async verifyPhone(
    userId: string,
    dto: VerifyPhoneDto,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    const user = await this.findByIdRaw(userId);
    this.assertMerchantScope(ctx, user);

    if (user.phoneVerified) {
      return { message: 'Phone number is already verified' };
    }

    if (!user.phoneVerificationCode || !user.phoneVerificationCodeExpiresAt) {
      throw new InvalidTokenException('phone verification');
    }

    if (new Date() > user.phoneVerificationCodeExpiresAt) {
      throw new ExpiredTokenException('phone verification');
    }

    const hashedInput = crypto
      .createHash('sha256')
      .update(dto.code)
      .digest('hex');

    if (hashedInput !== user.phoneVerificationCode) {
      throw new InvalidTokenException('phone verification');
    }

    user.phoneVerified = true;
    user.phoneVerificationCode = null;
    user.phoneVerificationCodeExpiresAt = null;
    await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.PHONE_VERIFIED, {
      userId: user.id,
      phoneNumber: user.phoneNumber,
    });

    await this.audit({
      action: UserAuditAction.PHONE_VERIFIED,
      performedBy: user.id,
      targetUserId: user.id,
      timestamp: new Date(),
    });

    return { message: 'Phone number verified successfully' };
  }

  // ================================================================
  // PASSWORD MANAGEMENT
  // ================================================================

  /**
   * Authenticated password change.
   * Requires current password + new password + confirmation.
   */
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    // Can only change your own password unless super admin
    if (ctx.userId !== userId && ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('change another user\'s password');
    }

    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new PasswordMismatchException();
    }

    const user = await this.findByIdRaw(userId);

    const isCurrentPasswordValid = await user.validatePassword(dto.currentPassword);
    if (!isCurrentPasswordValid) throw new InvalidPasswordException();

    // Prevent setting the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) throw new SamePasswordException();

    user.password = dto.newPassword; // @BeforeUpdate hook will hash it
    user.lastPasswordChangeAt = new Date();
    user.updatedBy = ctx.userId;
    await this.userRepository.save(user);

    // Invalidate all active sessions on password change for security
    await this.invalidateAllSessions(userId);

    this.eventEmitter.emit(UserEvent.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      ipAddress: ctx.ipAddress,
    });

    await this.audit({
      action: UserAuditAction.PASSWORD_CHANGED,
      performedBy: ctx.userId,
      targetUserId: userId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return { message: 'Password changed successfully. Please log in again.' };
  }

  /**
   * Request a password reset email.
   * Rate limited. Never reveals whether email exists.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    await this.enforceRateLimit(
      'password_reset',
      normalizedEmail,
      RATE_LIMIT.PASSWORD_RESET_RESEND_SECONDS,
    );

    const user = await this.findByEmail(normalizedEmail);

    // Always return the same message to prevent email enumeration
    const genericResponse: MessageResponseDto = {
      message:
        'If this email is registered, you will receive a password reset link shortly',
    };

    if (!user) return genericResponse;

    // Don't send reset to banned accounts — but don't reveal why
    if (user.status === UserStatus.BANNED) return genericResponse;

    const { token, hashedToken, expiresAt } = this.generateToken(
      TOKEN_EXPIRY.PASSWORD_RESET,
    );

    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpiresAt = expiresAt;
    await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.PASSWORD_RESET_REQUESTED, {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      resetToken: token, // raw token for link
    });

    await this.audit({
      action: UserAuditAction.PASSWORD_RESET_REQUESTED,
      performedBy: user.id,
      targetUserId: user.id,
      timestamp: new Date(),
    });

    return genericResponse;
  }

  /**
   * Complete password reset using the token from email link.
   */
  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new PasswordMismatchException();
    }

    const hashedToken = this.hashToken(dto.token);

    const user = await this.userRepository.findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (!user) throw new InvalidTokenException('password reset');
    if (!user.hasValidPasswordResetToken) throw new ExpiredTokenException('password reset');

    // Prevent setting the same password
    const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
    if (isSamePassword) throw new SamePasswordException();

    user.password = dto.newPassword; // @BeforeUpdate hook hashes
    user.passwordResetToken = null;
    user.passwordResetTokenExpiresAt = null;
    user.lastPasswordChangeAt = new Date();

    // Unlock account if it was locked (password reset acts as unlock)
    if (user.status === UserStatus.LOCKED) {
      user.status = UserStatus.ACTIVE;
      user.lockedUntil = null;
      user.failedLoginAttempts = 0;
    }

    await this.userRepository.save(user);

    // Invalidate all sessions after password reset
    await this.invalidateAllSessions(user.id);

    this.eventEmitter.emit(UserEvent.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      isReset: true,
    });

    await this.audit({
      action: UserAuditAction.PASSWORD_RESET_COMPLETED,
      performedBy: user.id,
      targetUserId: user.id,
      timestamp: new Date(),
    });

    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  // ================================================================
  // TWO-FACTOR AUTHENTICATION
  // ================================================================

  /**
   * Initiate 2FA setup.
   * For TOTP: returns a QR code URL and secret.
   * The user must verify with a valid code before 2FA is activated.
   */
  async setup2FA(
    userId: string,
    dto: Enable2FADto,
    ctx: RequestContext,
  ): Promise<TwoFactorSetupResponseDto> {
    if (ctx.userId !== userId) {
      throw new InsufficientPermissionsException('configure 2FA for another user');
    }

    const user = await this.findByIdRaw(userId);

    if (user.twoFactorEnabled) {
      throw new TwoFactorAlreadyEnabledException();
    }

    if (dto.method === TwoFactorMethod.NONE) {
      throw new InsufficientPermissionsException('set 2FA method to none during setup');
    }

    if (dto.method === TwoFactorMethod.TOTP) {
      const secret = speakeasy.generateSecret({
        name: `Cheese (${user.email})`,
        length: 32,
      });

      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Store secret temporarily in Redis (not DB) until user verifies
      // This prevents storing unverified secrets
      await this.redis.setex(
        `2fa_setup:${userId}`,
        600, // 10 minutes to complete setup
        JSON.stringify({ secret: secret.base32, method: dto.method }),
      );

      return {
        qrCode: qrCodeUrl,
        secret: secret.base32,
        message: 'Scan the QR code with your authenticator app, then verify with a code',
      };
    }

    if (dto.method === TwoFactorMethod.SMS) {
      if (!user.phoneNumber || !user.phoneVerified) {
        throw new InvalidTokenException(
          'verified phone number required for SMS 2FA',
        );
      }

      // Store intent in Redis until verified
      await this.redis.setex(
        `2fa_setup:${userId}`,
        600,
        JSON.stringify({ method: dto.method }),
      );

      // Send OTP to phone
      const code = crypto.randomInt(100000, 999999).toString();
      await this.redis.setex(`2fa_otp:${userId}`, 300, code);

      this.eventEmitter.emit('notification.sms', {
        to: user.phoneNumber,
        code,
        userId: user.id,
        context: '2fa_setup',
      });

      return {
        message: 'A verification code has been sent to your phone number',
      };
    }

    // EMAIL method
    await this.redis.setex(
      `2fa_setup:${userId}`,
      600,
      JSON.stringify({ method: dto.method }),
    );

    return {
      message: '2FA setup initiated. Check your email for a verification code.',
    };
  }

  /**
   * Confirm and activate 2FA after user enters the initial code.
   * Also generates and returns backup codes.
   */
  async confirm2FA(
    userId: string,
    dto: Verify2FADto,
    ctx: RequestContext,
  ): Promise<TwoFactorSetupResponseDto> {
    if (ctx.userId !== userId) {
      throw new InsufficientPermissionsException('confirm 2FA for another user');
    }

    const setupDataStr = await this.redis.get(`2fa_setup:${userId}`);
    if (!setupDataStr) {
      throw new InvalidTokenException('2FA setup session expired');
    }

    const setupData = JSON.parse(setupDataStr) as {
      secret?: string;
      method: TwoFactorMethod;
    };

    const user = await this.findByIdRaw(userId);

    let isValid = false;

    if (setupData.method === TwoFactorMethod.TOTP) {
      isValid = speakeasy.totp.verify({
        secret: setupData.secret!,
        encoding: 'base32',
        token: dto.code,
        window: 1, // Allow 1 period drift
      });
    } else if (
      setupData.method === TwoFactorMethod.SMS ||
      setupData.method === TwoFactorMethod.EMAIL
    ) {
      const storedCode = await this.redis.get(`2fa_otp:${userId}`);
      isValid = storedCode === dto.code;
      if (isValid) await this.redis.del(`2fa_otp:${userId}`);
    }

    if (!isValid) throw new Invalid2FACodeException();

    const { plain: backupCodes, hashed: hashedBackupCodes } =
      this.generateBackupCodes(10);

    user.twoFactorEnabled = true;
    user.twoFactorMethod = setupData.method;
    user.twoFactorSecret = setupData.secret
      ? this.encryptSecret(setupData.secret) // encrypt at rest
      : null;
    user.twoFactorBackupCodes = hashedBackupCodes;
    await this.userRepository.save(user);

    // Clean up Redis setup state
    await this.redis.del(`2fa_setup:${userId}`);

    this.eventEmitter.emit(UserEvent.TWO_FACTOR_ENABLED, {
      userId: user.id,
      email: user.email,
      method: setupData.method,
    });

    await this.audit({
      action: UserAuditAction.TWO_FACTOR_ENABLED,
      performedBy: ctx.userId,
      targetUserId: userId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: { method: setupData.method },
    });

    return {
      backupCodes, // Show plain codes once — user must save them
      message:
        'Two-factor authentication enabled. Save your backup codes securely — they will not be shown again.',
    };
  }

  /**
   * Verify a 2FA code during login.
   * Returns true/false — caller (AuthService) handles the response.
   */
  async verify2FACode(userId: string, code: string): Promise<boolean> {
    const user = await this.findByIdRaw(userId);

    if (!user.twoFactorEnabled) return true; // 2FA not required

    if (user.twoFactorMethod === TwoFactorMethod.TOTP) {
      const decryptedSecret = this.decryptSecret(user.twoFactorSecret!);
      return speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token: code,
        window: 1,
      });
    }

    if (
      user.twoFactorMethod === TwoFactorMethod.SMS ||
      user.twoFactorMethod === TwoFactorMethod.EMAIL
    ) {
      const storedCode = await this.redis.get(`2fa_login_otp:${userId}`);
      const isValid = storedCode === code;
      if (isValid) await this.redis.del(`2fa_login_otp:${userId}`);
      return isValid;
    }

    return false;
  }

  /**
   * Use a backup code when 2FA device is unavailable.
   * Each backup code can only be used once.
   */
  async use2FABackupCode(
    userId: string,
    dto: Use2FABackupCodeDto,
  ): Promise<MessageResponseDto> {
    const user = await this.findByIdRaw(userId);

    if (!user.twoFactorEnabled) throw new TwoFactorNotEnabledException();
    if (!user.twoFactorBackupCodes?.length) {
      throw new InvalidBackupCodeException();
    }

    const hashedInput = crypto
      .createHash('sha256')
      .update(dto.backupCode.trim().toUpperCase())
      .digest('hex');

    const codeIndex = user.twoFactorBackupCodes.indexOf(hashedInput);
    if (codeIndex === -1) throw new InvalidBackupCodeException();

    // Remove used backup code (each code is single-use)
    user.twoFactorBackupCodes.splice(codeIndex, 1);
    await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.TWO_FACTOR_BACKUP_CODE_USED,
      performedBy: userId,
      targetUserId: userId,
      timestamp: new Date(),
      metadata: { remainingCodes: user.twoFactorBackupCodes.length },
    });

    const remainingCount = user.twoFactorBackupCodes.length;
    return {
      message: `Backup code accepted. ${remainingCount} backup code${remainingCount !== 1 ? 's' : ''} remaining.`,
      data: { remainingBackupCodes: remainingCount },
    };
  }

  /**
   * Disable 2FA. Requires current password + current 2FA code.
   */
  async disable2FA(
    userId: string,
    dto: Disable2FADto,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    if (ctx.userId !== userId && ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('disable 2FA for another user');
    }

    const user = await this.findByIdRaw(userId);
    if (!user.twoFactorEnabled) throw new TwoFactorNotEnabledException();

    const isPasswordValid = await user.validatePassword(dto.password);
    if (!isPasswordValid) throw new InvalidPasswordException();

    const is2FAValid = await this.verify2FACode(userId, dto.code);
    if (!is2FAValid) throw new Invalid2FACodeException();

    user.twoFactorEnabled = false;
    user.twoFactorMethod = TwoFactorMethod.NONE;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = null;
    await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.TWO_FACTOR_DISABLED, {
      userId: user.id,
      email: user.email,
    });

    await this.audit({
      action: UserAuditAction.TWO_FACTOR_DISABLED,
      performedBy: ctx.userId,
      targetUserId: userId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return { message: 'Two-factor authentication has been disabled' };
  }

  // ================================================================
  // SESSION MANAGEMENT
  // ================================================================

  /**
   * Invalidate all active sessions for a user.
   * Called on password change, password reset, and account suspension.
   * Sessions stored in Redis as tokens are invalidated by
   * adding user to a blacklist / bumping a session version.
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    // Store a session invalidation timestamp in Redis
    // Auth middleware checks this against token issued-at time
    await this.redis.setex(
      `sessions_invalidated:${userId}`,
      7 * 24 * 60 * 60, // 7 days TTL (longer than max token life)
      new Date().toISOString(),
    );

    // Also clear the activeSessions JSON in DB
    await this.userRepository.update(userId, { activeSessions: null });

    this.logger.log(`All sessions invalidated for user: ${userId}`);
  }

  /**
   * Check if a session is still valid.
   * Called by auth middleware on each request.
   */
  async isSessionValid(userId: string, tokenIssuedAt: Date): Promise<boolean> {
    const invalidationTime = await this.redis.get(
      `sessions_invalidated:${userId}`,
    );
    if (!invalidationTime) return true;

    const invalidatedAt = new Date(invalidationTime);
    return tokenIssuedAt > invalidatedAt;
  }

  // ================================================================
  // ADMIN OPERATIONS
  // ================================================================

  /**
   * Update a user's role.
   * Cannot change your own role.
   * Only super_admin can assign super_admin role.
   */
  async updateUserRole(
    targetUserId: string,
    dto: UpdateUserRoleDto,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    if (ctx.userId === targetUserId) throw new CannotModifyOwnRoleException();

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    // Only super_admin can assign super_admin or support roles
    if (
      INTERNAL_ONLY_ROLES.includes(dto.role) &&
      ctx.role !== UserRole.SUPER_ADMIN
    ) {
      throw new InsufficientPermissionsException('assign this role');
    }

    // merchant_owner can assign any merchant-scoped role
    // merchant_admin cannot promote to merchant_owner
    if (
      ctx.role === UserRole.MERCHANT_ADMIN &&
      dto.role === UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException(
        'promote a user to merchant owner',
      );
    }

    const previousRole = user.role;
    user.role = dto.role;
    user.updatedBy = ctx.userId;
    const updated = await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.ROLE_CHANGED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: { previousRole, newRole: dto.role },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Update user account status (suspend, ban, activate, etc.)
   */
  async updateUserStatus(
    targetUserId: string,
    dto: UpdateUserStatusDto,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    if (ctx.userId === targetUserId) {
      throw new InsufficientPermissionsException('change your own account status');
    }

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    // Only super_admin can ban
    if (dto.status === UserStatus.BANNED && ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('ban users');
    }

    // Cannot activate a banned user as non-super-admin
    if (
      user.status === UserStatus.BANNED &&
      ctx.role !== UserRole.SUPER_ADMIN
    ) {
      throw new InsufficientPermissionsException('reactivate a banned user');
    }

    const previousStatus = user.status;
    user.status = dto.status;
    user.updatedBy = ctx.userId;

    // If suspending or banning, invalidate all sessions
    if (
      dto.status === UserStatus.SUSPENDED ||
      dto.status === UserStatus.BANNED
    ) {
      await this.invalidateAllSessions(targetUserId);
    }

    const updated = await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.STATUS_CHANGED, {
      userId: user.id,
      email: user.email,
      previousStatus,
      newStatus: dto.status,
      reason: dto.reason,
    });

    await this.audit({
      action: UserAuditAction.STATUS_CHANGED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: { previousStatus, newStatus: dto.status, reason: dto.reason },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Update transaction limits for a user.
   * Only super_admin or merchant_owner can set limits.
   */
  async updateTransactionLimits(
    targetUserId: string,
    dto: UpdateTransactionLimitsDto,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException('update transaction limits');
    }

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    if (dto.dailyTransactionLimit !== undefined)
      user.dailyTransactionLimit = dto.dailyTransactionLimit;
    if (dto.monthlyTransactionLimit !== undefined)
      user.monthlyTransactionLimit = dto.monthlyTransactionLimit;
    if (dto.singleTransactionLimit !== undefined)
      user.singleTransactionLimit = dto.singleTransactionLimit;

    // Validate limit consistency: daily >= single, monthly >= daily
    if (
      user.singleTransactionLimit &&
      user.dailyTransactionLimit &&
      user.singleTransactionLimit > user.dailyTransactionLimit
    ) {
      throw new InvalidTokenException(
        'single transaction limit cannot exceed daily limit',
      );
    }

    if (
      user.dailyTransactionLimit &&
      user.monthlyTransactionLimit &&
      user.dailyTransactionLimit > user.monthlyTransactionLimit
    ) {
      throw new InvalidTokenException(
        'daily transaction limit cannot exceed monthly limit',
      );
    }

    user.updatedBy = ctx.userId;
    const updated = await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.TRANSACTION_LIMITS_UPDATED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: dto,
    });

    return this.toResponseDto(updated);
  }

  /**
   * Unlock a locked user account (admin action)
   */
  async unlockUser(
    targetUserId: string,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.MERCHANT_OWNER &&
      ctx.role !== UserRole.SUPPORT
    ) {
      throw new InsufficientPermissionsException('unlock user accounts');
    }

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    user.resetFailedLoginAttempts();
    user.updatedBy = ctx.userId;
    await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.ACCOUNT_UNLOCKED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return { message: 'User account has been unlocked' };
  }

  // ================================================================
  // TEAM MANAGEMENT
  // ================================================================

  /**
   * Invite a team member to a merchant organization.
   * Creates user in PENDING_VERIFICATION state with a temp password
   * and sends invitation email with setup link.
   */
  async inviteTeamMember(
    dto: InviteTeamMemberDto,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    // Only merchant owners and admins can invite
    if (
      ctx.role !== UserRole.MERCHANT_OWNER &&
      ctx.role !== UserRole.MERCHANT_ADMIN &&
      ctx.role !== UserRole.SUPER_ADMIN
    ) {
      throw new InsufficientPermissionsException('invite team members');
    }

    // Cannot invite to internal-only roles via this flow
    if (INTERNAL_ONLY_ROLES.includes(dto.role)) {
      throw new InvalidInviteRoleException(dto.role);
    }

    // Cannot invite as CUSTOMER via team invite
    if (dto.role === UserRole.CUSTOMER) {
      throw new InvalidInviteRoleException(dto.role);
    }

    // Merchant admins cannot invite merchant owners
    if (
      ctx.role === UserRole.MERCHANT_ADMIN &&
      dto.role === UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException(
        'invite users with merchant owner role',
      );
    }

    if (!ctx.merchantId) {
      throw new InsufficientPermissionsException(
        'invite team members without a merchant context',
      );
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.findByEmail(normalizedEmail);

    if (existingUser) {
      // If user already exists in this merchant — inform caller
      if (existingUser.merchantId === ctx.merchantId) {
        return {
          message: 'This user is already a member of your organization',
        };
      }
      // If user exists but in a different merchant — cannot poach
      if (existingUser.merchantId && existingUser.merchantId !== ctx.merchantId) {
        throw new EmailAlreadyExistsException(normalizedEmail);
      }
    }

    const { token, hashedToken, expiresAt } = this.generateToken(
      TOKEN_EXPIRY.TEAM_INVITE,
    );

    // Generate a temporary random password — user will set their own via invite link
    const tempPassword = crypto.randomBytes(16).toString('hex');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const invitedUser = queryRunner.manager.create(User, {
        email: normalizedEmail,
        password: tempPassword,
        fullName: dto.fullName ?? null,
        role: dto.role,
        status: UserStatus.PENDING_VERIFICATION,
        merchantId: ctx.merchantId,
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpiresAt: expiresAt,
        createdBy: ctx.userId,
        createdFromIp: ctx.ipAddress,
        kycStatus: KYCStatus.NOT_STARTED,
        twoFactorEnabled: false,
        twoFactorMethod: TwoFactorMethod.NONE,
        apiAccessEnabled:
          dto.role === UserRole.DEVELOPER ? true : false,
        emailVerified: false,
        phoneVerified: false,
        failedLoginAttempts: 0,
        timezone: 'UTC',
        language: 'en',
        preferredCurrency: 'USD',
      });

      await queryRunner.manager.save(User, invitedUser);
      await queryRunner.commitTransaction();

      this.eventEmitter.emit(UserEvent.TEAM_MEMBER_INVITED, {
        userId: invitedUser.id,
        email: invitedUser.email,
        fullName: invitedUser.fullName,
        role: invitedUser.role,
        inviteToken: token,
        invitedBy: ctx.userId,
        merchantId: ctx.merchantId,
      });

      await this.audit({
        action: UserAuditAction.TEAM_MEMBER_INVITED,
        performedBy: ctx.userId,
        targetUserId: invitedUser.id,
        ipAddress: ctx.ipAddress,
        timestamp: new Date(),
        metadata: { role: dto.role, email: normalizedEmail },
      });

      return {
        message: `Invitation sent to ${normalizedEmail}`,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ================================================================
  // KYC OPERATIONS
  // ================================================================

  /**
   * Admin approves KYC for a user.
   * Transitions user from PENDING_APPROVAL to ACTIVE.
   */
  async approveKYC(
    targetUserId: string,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.SUPPORT
    ) {
      throw new InsufficientPermissionsException('approve KYC');
    }

    const user = await this.findByIdRaw(targetUserId);

    if (user.kycStatus === KYCStatus.APPROVED) {
      return this.toResponseDto(user);
    }

    user.kycStatus = KYCStatus.APPROVED;
    user.kycApprovedAt = new Date();
    user.kycRejectionReason = null;
    user.status = UserStatus.ACTIVE;
    user.updatedBy = ctx.userId;

    const updated = await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.KYC_STATUS_CHANGED, {
      userId: user.id,
      email: user.email,
      kycStatus: KYCStatus.APPROVED,
    });

    await this.audit({
      action: UserAuditAction.KYC_APPROVED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return this.toResponseDto(updated);
  }

  /**
   * Admin rejects KYC with a reason.
   */
  async rejectKYC(
    targetUserId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<UserResponseDto> {
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.SUPPORT
    ) {
      throw new InsufficientPermissionsException('reject KYC');
    }

    const user = await this.findByIdRaw(targetUserId);

    user.kycStatus = KYCStatus.REJECTED;
    user.kycRejectionReason = reason;
    user.status = UserStatus.PENDING_APPROVAL;
    user.updatedBy = ctx.userId;

    const updated = await this.userRepository.save(user);

    this.eventEmitter.emit(UserEvent.KYC_STATUS_CHANGED, {
      userId: user.id,
      email: user.email,
      kycStatus: KYCStatus.REJECTED,
      reason,
    });

    await this.audit({
      action: UserAuditAction.KYC_REJECTED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
      metadata: { reason },
    });

    return this.toResponseDto(updated);
  }

  // ================================================================
  // API ACCESS MANAGEMENT
  // ================================================================

  /**
   * Toggle API access for a user.
   * Only DEVELOPER and MERCHANT_OWNER roles should have API access.
   */
  async toggleApiAccess(
    targetUserId: string,
    enable: boolean,
    ctx: RequestContext,
  ): Promise<MessageResponseDto> {
    if (
      ctx.role !== UserRole.SUPER_ADMIN &&
      ctx.role !== UserRole.MERCHANT_OWNER
    ) {
      throw new InsufficientPermissionsException('manage API access');
    }

    const user = await this.findByIdRaw(targetUserId);
    this.assertMerchantScope(ctx, user);

    user.apiAccessEnabled = enable;
    user.updatedBy = ctx.userId;
    await this.userRepository.save(user);

    await this.audit({
      action: enable
        ? UserAuditAction.API_ACCESS_ENABLED
        : UserAuditAction.API_ACCESS_DISABLED,
      performedBy: ctx.userId,
      targetUserId,
      ipAddress: ctx.ipAddress,
      timestamp: new Date(),
    });

    return {
      message: `API access has been ${enable ? 'enabled' : 'disabled'} for this user`,
    };
  }

  // ================================================================
  // LOGIN HELPERS (called from AuthService)
  // ================================================================

  /**
   * Record a successful login event.
   * Called by AuthService after successful authentication.
   */
  async recordSuccessfulLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<void> {
    const user = await this.findByIdRaw(userId);
    user.updateLastLogin(ipAddress, userAgent);
    user.resetFailedLoginAttempts();
    await this.userRepository.save(user);

    await this.audit({
      action: UserAuditAction.LOGIN_SUCCESS,
      performedBy: userId,
      targetUserId: userId,
      ipAddress,
      userAgent,
      timestamp: new Date(),
    });
  }

  /**
   * Record a failed login attempt.
   * Auto-locks account after RATE_LIMIT.MAX_FAILED_LOGIN_ATTEMPTS failures.
   */
  async recordFailedLogin(email: string, ipAddress: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) return; // Don't reveal whether user exists

    await user.incrementFailedLoginAttempts(
      RATE_LIMIT.MAX_FAILED_LOGIN_ATTEMPTS,
      RATE_LIMIT.ACCOUNT_LOCK_DURATION_MINUTES,
    );
    await this.userRepository.save(user);

    if (user.status === UserStatus.LOCKED) {
      this.eventEmitter.emit(UserEvent.ACCOUNT_LOCKED, {
        userId: user.id,
        email: user.email,
        lockedUntil: user.lockedUntil,
        ipAddress,
      });

      await this.audit({
        action: UserAuditAction.ACCOUNT_LOCKED,
        performedBy: user.id,
        targetUserId: user.id,
        ipAddress,
        timestamp: new Date(),
        metadata: {
          failedAttempts: user.failedLoginAttempts,
          lockedUntil: user.lockedUntil,
        },
      });
    } else {
      await this.audit({
        action: UserAuditAction.LOGIN_FAILED,
        performedBy: user.id,
        targetUserId: user.id,
        ipAddress,
        timestamp: new Date(),
        metadata: { failedAttempts: user.failedLoginAttempts },
      });
    }
  }

  // ================================================================
  // SECRET ENCRYPTION HELPERS
  // ================================================================

  /**
   * Encrypt sensitive values (TOTP secrets) at rest.
   * Uses AES-256-GCM. Key sourced from environment.
   *
   * NOTE: In production, replace with a proper KMS (AWS KMS, GCP KMS, HashiCorp Vault)
   */
  private encryptSecret(plaintext: string): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY ?? '',
      'hex',
    );
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex chars)');
    }
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  private decryptSecret(ciphertext: string): string {
    const key = Buffer.from(
      process.env.ENCRYPTION_KEY ?? '',
      'hex',
    );
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.subarray(0, 16);
    const authTag = buf.subarray(16, 32);
    const encrypted = buf.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
  }

  // ================================================================
  // STATISTICS (admin dashboard)
  // ================================================================

  /**
   * Get aggregate user statistics.
   * Used by the admin dashboard.
   */
  async getUserStats(ctx: RequestContext): Promise<Record<string, number>> {
    if (ctx.role !== UserRole.SUPER_ADMIN) {
      throw new InsufficientPermissionsException('view platform statistics');
    }

    const [
      total,
      active,
      pendingVerification,
      pendingApproval,
      suspended,
      banned,
      locked,
      kycApproved,
      kycPending,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.PENDING_VERIFICATION } }),
      this.userRepository.count({ where: { status: UserStatus.PENDING_APPROVAL } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
      this.userRepository.count({ where: { status: UserStatus.BANNED } }),
      this.userRepository.count({ where: { status: UserStatus.LOCKED } }),
      this.userRepository.count({ where: { kycStatus: KYCStatus.APPROVED } }),
      this.userRepository.count({ where: { kycStatus: KYCStatus.UNDER_REVIEW } }),
    ]);

    return {
      total,
      active,
      pendingVerification,
      pendingApproval,
      suspended,
      banned,
      locked,
      kycApproved,
      kycPending,
    };
  }
}