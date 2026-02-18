"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const ioredis_1 = require("@nestjs-modules/ioredis");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcrypt"));
const speakeasy = __importStar(require("speakeasy"));
const qrcode = __importStar(require("qrcode"));
const class_transformer_1 = require("class-transformer");
const users_entity_1 = require("./users.entity");
const user_dto_1 = require("./user.dto");
const user_exceptions_1 = require("./user.exceptions");
const user_types_1 = require("./user.types");
let UserService = UserService_1 = class UserService {
    userRepository;
    dataSource;
    eventEmitter;
    redis;
    logger = new common_1.Logger(UserService_1.name);
    constructor(userRepository, dataSource, eventEmitter, redis) {
        this.userRepository = userRepository;
        this.dataSource = dataSource;
        this.eventEmitter = eventEmitter;
        this.redis = redis;
    }
    generateToken(expiryMs) {
        const token = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + expiryMs);
        return { token, hashedToken, expiresAt };
    }
    hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }
    generateBackupCodes(count = 10) {
        const plain = [];
        const hashed = [];
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(5).toString('hex').toUpperCase();
            const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
            plain.push(formatted);
            hashed.push(crypto.createHash('sha256').update(formatted).digest('hex'));
        }
        return { plain, hashed };
    }
    toResponseDto(user) {
        return (0, class_transformer_1.plainToInstance)(user_dto_1.UserResponseDto, user, {
            excludeExtraneousValues: true,
        });
    }
    buildPaginatedResponse(data, total, page, limit) {
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
    async audit(entry) {
        this.logger.log(`AUDIT [${entry.action}] by=${entry.performedBy} target=${entry.targetUserId} ip=${entry.ipAddress ?? 'N/A'}`);
        this.eventEmitter.emit('audit.log', entry);
    }
    rateLimitKey(type, identifier) {
        return `rate_limit:${type}:${identifier}`;
    }
    async enforceRateLimit(type, identifier, cooldownSeconds) {
        const key = this.rateLimitKey(type, identifier);
        const exists = await this.redis.get(key);
        if (exists) {
            const ttl = await this.redis.ttl(key);
            if (type === 'verification_email') {
                throw new user_exceptions_1.VerificationEmailRateLimitException(ttl);
            }
            else {
                throw new user_exceptions_1.PasswordResetRateLimitException(ttl);
            }
        }
        await this.redis.setex(key, cooldownSeconds, '1');
    }
    assertMerchantScope(ctx, targetUser) {
        if (ctx.role === users_entity_1.UserRole.SUPER_ADMIN)
            return;
        if (ctx.userId === targetUser.id)
            return;
        if (user_types_1.MERCHANT_SCOPED_ROLES.includes(ctx.role) &&
            targetUser.merchantId !== ctx.merchantId) {
            throw new user_exceptions_1.CrossMerchantAccessException();
        }
    }
    assertAccountAccessible(user) {
        if (user.status === users_entity_1.UserStatus.BANNED)
            throw new user_exceptions_1.AccountBannedException();
        if (user.status === users_entity_1.UserStatus.SUSPENDED)
            throw new user_exceptions_1.AccountSuspendedException();
        if (user.status === users_entity_1.UserStatus.PENDING_APPROVAL)
            throw new user_exceptions_1.AccountPendingApprovalException();
        if (user.isLocked)
            throw new user_exceptions_1.AccountLockedException(user.lockedUntil);
        if (!user.emailVerified)
            throw new user_exceptions_1.AccountNotVerifiedException();
    }
    async createUser(dto, ctx = {}) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        const existingByEmail = await this.userRepository.findOne({
            where: { email: normalizedEmail },
            withDeleted: true,
        });
        if (existingByEmail) {
            throw new user_exceptions_1.EmailAlreadyExistsException(normalizedEmail);
        }
        if (dto.phoneNumber) {
            const normalizedPhone = dto.phoneNumber.replace(/\s+/g, '');
            const existingByPhone = await this.userRepository.findOne({
                where: { phoneNumber: normalizedPhone },
                withDeleted: false,
            });
            if (existingByPhone) {
                throw new user_exceptions_1.PhoneAlreadyExistsException(normalizedPhone);
            }
        }
        if (dto.role && user_types_1.INTERNAL_ONLY_ROLES.includes(dto.role)) {
            throw new user_exceptions_1.InsufficientPermissionsException('assign this role');
        }
        if (dto.role &&
            user_types_1.MERCHANT_SCOPED_ROLES.includes(dto.role) &&
            !dto.merchantId) {
            throw new user_exceptions_1.InsufficientPermissionsException('create merchant-scoped user without a merchantId');
        }
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const { token, hashedToken, expiresAt } = this.generateToken(user_types_1.TOKEN_EXPIRY.EMAIL_VERIFICATION);
            const user = queryRunner.manager.create(users_entity_1.User, {
                email: normalizedEmail,
                password: dto.password,
                fullName: dto.fullName ?? null,
                phoneNumber: dto.phoneNumber ?? null,
                role: dto.role ?? users_entity_1.UserRole.MERCHANT_OWNER,
                status: users_entity_1.UserStatus.PENDING_VERIFICATION,
                merchantId: dto.merchantId ?? null,
                timezone: dto.timezone ?? 'UTC',
                language: dto.language ?? 'en',
                preferredCurrency: dto.preferredCurrency ?? 'USD',
                emailVerificationToken: hashedToken,
                emailVerificationTokenExpiresAt: expiresAt,
                createdBy: ctx.userId ?? null,
                createdFromIp: ctx.ipAddress ?? null,
                metadata: dto.metadata ?? null,
                kycStatus: users_entity_1.KYCStatus.NOT_STARTED,
                twoFactorEnabled: false,
                twoFactorMethod: users_entity_1.TwoFactorMethod.NONE,
                apiAccessEnabled: false,
                emailVerified: false,
                phoneVerified: false,
                failedLoginAttempts: 0,
            });
            const savedUser = await queryRunner.manager.save(users_entity_1.User, user);
            await queryRunner.commitTransaction();
            this.eventEmitter.emit(user_types_1.UserEvent.USER_REGISTERED, {
                userId: savedUser.id,
                email: savedUser.email,
                fullName: savedUser.fullName,
                verificationToken: token,
            });
            await this.audit({
                action: user_types_1.UserAuditAction.USER_CREATED,
                performedBy: ctx.userId ?? savedUser.id,
                targetUserId: savedUser.id,
                ipAddress: ctx.ipAddress,
                userAgent: ctx.userAgent,
                timestamp: new Date(),
            });
            this.logger.log(`User created: ${savedUser.id} (${savedUser.email})`);
            return this.toResponseDto(savedUser);
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            if (error instanceof user_exceptions_1.EmailAlreadyExistsException ||
                error instanceof user_exceptions_1.PhoneAlreadyExistsException ||
                error instanceof user_exceptions_1.InsufficientPermissionsException) {
                throw error;
            }
            this.logger.error(`Failed to create user: ${error.message}`, error.stack);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async findById(id, ctx) {
        const user = await this.userRepository.findOne({
            where: { id },
        });
        if (!user)
            throw new user_exceptions_1.UserNotFoundException(id);
        if (ctx)
            this.assertMerchantScope(ctx, user);
        return this.toResponseDto(user);
    }
    async findByIdRaw(id) {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user)
            throw new user_exceptions_1.UserNotFoundException(id);
        return user;
    }
    async findByEmail(email) {
        return this.userRepository.findOne({
            where: { email: email.toLowerCase().trim() },
        });
    }
    async findAll(query, ctx) {
        const { search, role, status, kycStatus, merchantId, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', } = query;
        const qb = this.userRepository.createQueryBuilder('user');
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            qb.andWhere('user.merchantId = :merchantId', {
                merchantId: ctx.merchantId,
            });
        }
        else if (merchantId) {
            qb.andWhere('user.merchantId = :merchantId', { merchantId });
        }
        if (search) {
            qb.andWhere('(LOWER(user.email) LIKE :search OR LOWER(user.fullName) LIKE :search OR user.phoneNumber LIKE :search)', { search: `%${search.toLowerCase()}%` });
        }
        if (role)
            qb.andWhere('user.role = :role', { role });
        if (status)
            qb.andWhere('user.status = :status', { status });
        if (kycStatus)
            qb.andWhere('user.kycStatus = :kycStatus', { kycStatus });
        const allowedSortColumns = [
            'createdAt', 'updatedAt', 'lastLoginAt', 'email', 'fullName', 'status', 'role',
        ];
        const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'createdAt';
        qb.orderBy(`user.${safeSortBy}`, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);
        const [users, total] = await qb.getManyAndCount();
        const result = this.buildPaginatedResponse(users.map((u) => this.toResponseDto(u)), total, page, limit);
        return result;
    }
    async updateUser(targetUserId, dto, ctx) {
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        const isSelf = ctx.userId === targetUserId;
        const isAdmin = ctx.role === users_entity_1.UserRole.SUPER_ADMIN ||
            ctx.role === users_entity_1.UserRole.MERCHANT_ADMIN ||
            ctx.role === users_entity_1.UserRole.MERCHANT_OWNER;
        if (!isSelf && !isAdmin) {
            throw new user_exceptions_1.InsufficientPermissionsException('update this user');
        }
        if (dto.fullName !== undefined)
            user.fullName = dto.fullName;
        if (dto.timezone !== undefined)
            user.timezone = dto.timezone;
        if (dto.language !== undefined)
            user.language = dto.language;
        if (dto.preferredCurrency !== undefined)
            user.preferredCurrency = dto.preferredCurrency;
        if (dto.avatarUrl !== undefined)
            user.avatarUrl = dto.avatarUrl;
        if (dto.notificationPreferences !== undefined)
            user.notificationPreferences = dto.notificationPreferences;
        if (dto.phoneNumber !== undefined && dto.phoneNumber !== user.phoneNumber) {
            const normalizedPhone = dto.phoneNumber.replace(/\s+/g, '');
            const existing = await this.userRepository.findOne({
                where: { phoneNumber: normalizedPhone },
            });
            if (existing && existing.id !== user.id) {
                throw new user_exceptions_1.PhoneAlreadyExistsException(normalizedPhone);
            }
            user.phoneNumber = normalizedPhone;
            user.phoneVerified = false;
        }
        user.updatedBy = ctx.userId;
        const updated = await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.USER_UPDATED,
            performedBy: ctx.userId,
            targetUserId: user.id,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: { fields: Object.keys(dto) },
        });
        return this.toResponseDto(updated);
    }
    async deleteUser(targetUserId, ctx) {
        if (ctx.userId === targetUserId) {
            throw new user_exceptions_1.CannotDeleteOwnAccountException();
        }
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('delete users');
        }
        if (user.role === users_entity_1.UserRole.MERCHANT_OWNER && user.merchantId) {
            const ownerCount = await this.userRepository.count({
                where: {
                    merchantId: user.merchantId,
                    role: users_entity_1.UserRole.MERCHANT_OWNER,
                    status: (0, typeorm_2.Not)(users_entity_1.UserStatus.BANNED),
                },
            });
            if (ownerCount <= 1) {
                throw new user_exceptions_1.InsufficientPermissionsException('delete the only merchant owner of a merchant organization');
            }
        }
        await this.userRepository.softDelete(targetUserId);
        await this.audit({
            action: user_types_1.UserAuditAction.USER_DELETED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        this.logger.warn(`User soft-deleted: ${targetUserId} by ${ctx.userId}`);
        return { message: 'User account has been deleted successfully' };
    }
    async restoreUser(targetUserId, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('restore deleted users');
        }
        const user = await this.userRepository.findOne({
            where: { id: targetUserId },
            withDeleted: true,
        });
        if (!user)
            throw new user_exceptions_1.UserNotFoundException(targetUserId);
        if (!user.deletedAt) {
            return { message: 'User is not deleted' };
        }
        await this.userRepository.restore(targetUserId);
        await this.audit({
            action: user_types_1.UserAuditAction.USER_RESTORED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return { message: 'User account has been restored successfully' };
    }
    async verifyEmail(dto) {
        const hashedToken = this.hashToken(dto.token);
        const user = await this.userRepository.findOne({
            where: { emailVerificationToken: hashedToken },
        });
        if (!user)
            throw new user_exceptions_1.InvalidTokenException('email verification');
        if (user.emailVerified) {
            return { message: 'Email is already verified' };
        }
        if (!user.hasValidEmailVerificationToken) {
            throw new user_exceptions_1.ExpiredTokenException('email verification');
        }
        user.emailVerified = true;
        user.emailVerificationToken = null;
        user.emailVerificationTokenExpiresAt = null;
        if (user.status === users_entity_1.UserStatus.PENDING_VERIFICATION) {
            user.status =
                user.role === users_entity_1.UserRole.CUSTOMER
                    ? users_entity_1.UserStatus.ACTIVE
                    : users_entity_1.UserStatus.PENDING_APPROVAL;
        }
        await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.EMAIL_VERIFIED, {
            userId: user.id,
            email: user.email,
            role: user.role,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.EMAIL_VERIFIED,
            performedBy: user.id,
            targetUserId: user.id,
            timestamp: new Date(),
        });
        return { message: 'Email verified successfully' };
    }
    async resendVerificationEmail(dto) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        await this.enforceRateLimit('verification_email', normalizedEmail, user_types_1.RATE_LIMIT.VERIFICATION_EMAIL_RESEND_SECONDS);
        const user = await this.findByEmail(normalizedEmail);
        if (!user || user.emailVerified) {
            return {
                message: 'If this email is registered and unverified, a verification email has been sent',
            };
        }
        if (user.status === users_entity_1.UserStatus.BANNED ||
            user.status === users_entity_1.UserStatus.SUSPENDED) {
            return {
                message: 'If this email is registered and unverified, a verification email has been sent',
            };
        }
        const { token, hashedToken, expiresAt } = this.generateToken(user_types_1.TOKEN_EXPIRY.EMAIL_VERIFICATION);
        user.emailVerificationToken = hashedToken;
        user.emailVerificationTokenExpiresAt = expiresAt;
        await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.USER_REGISTERED, {
            userId: user.id,
            email: user.email,
            fullName: user.fullName,
            verificationToken: token,
            isResend: true,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.VERIFICATION_EMAIL_RESENT,
            performedBy: user.id,
            targetUserId: user.id,
            timestamp: new Date(),
        });
        return {
            message: 'If this email is registered and unverified, a verification email has been sent',
        };
    }
    async sendPhoneVerificationCode(userId, ctx) {
        const user = await this.findByIdRaw(userId);
        this.assertMerchantScope(ctx, user);
        if (!user.phoneNumber) {
            throw new user_exceptions_1.InvalidTokenException('no phone number set on this account');
        }
        if (user.phoneVerified) {
            return { message: 'Phone number is already verified' };
        }
        await this.enforceRateLimit('phone_otp', userId, user_types_1.RATE_LIMIT.VERIFICATION_EMAIL_RESEND_SECONDS);
        const code = crypto.randomInt(100000, 999999).toString();
        const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
        const expiresAt = new Date(Date.now() + user_types_1.TOKEN_EXPIRY.PHONE_VERIFICATION);
        user.phoneVerificationCode = hashedCode;
        user.phoneVerificationCodeExpiresAt = expiresAt;
        await this.userRepository.save(user);
        this.eventEmitter.emit('notification.sms', {
            to: user.phoneNumber,
            code,
            userId: user.id,
        });
        return { message: 'Verification code sent to your phone number' };
    }
    async verifyPhone(userId, dto, ctx) {
        const user = await this.findByIdRaw(userId);
        this.assertMerchantScope(ctx, user);
        if (user.phoneVerified) {
            return { message: 'Phone number is already verified' };
        }
        if (!user.phoneVerificationCode || !user.phoneVerificationCodeExpiresAt) {
            throw new user_exceptions_1.InvalidTokenException('phone verification');
        }
        if (new Date() > user.phoneVerificationCodeExpiresAt) {
            throw new user_exceptions_1.ExpiredTokenException('phone verification');
        }
        const hashedInput = crypto
            .createHash('sha256')
            .update(dto.code)
            .digest('hex');
        if (hashedInput !== user.phoneVerificationCode) {
            throw new user_exceptions_1.InvalidTokenException('phone verification');
        }
        user.phoneVerified = true;
        user.phoneVerificationCode = null;
        user.phoneVerificationCodeExpiresAt = null;
        await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.PHONE_VERIFIED, {
            userId: user.id,
            phoneNumber: user.phoneNumber,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.PHONE_VERIFIED,
            performedBy: user.id,
            targetUserId: user.id,
            timestamp: new Date(),
        });
        return { message: 'Phone number verified successfully' };
    }
    async changePassword(userId, dto, ctx) {
        if (ctx.userId !== userId && ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('change another user\'s password');
        }
        if (dto.newPassword !== dto.confirmNewPassword) {
            throw new user_exceptions_1.PasswordMismatchException();
        }
        const user = await this.findByIdRaw(userId);
        const isCurrentPasswordValid = await user.validatePassword(dto.currentPassword);
        if (!isCurrentPasswordValid)
            throw new user_exceptions_1.InvalidPasswordException();
        const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
        if (isSamePassword)
            throw new user_exceptions_1.SamePasswordException();
        user.password = dto.newPassword;
        user.lastPasswordChangeAt = new Date();
        user.updatedBy = ctx.userId;
        await this.userRepository.save(user);
        await this.invalidateAllSessions(userId);
        this.eventEmitter.emit(user_types_1.UserEvent.PASSWORD_CHANGED, {
            userId: user.id,
            email: user.email,
            ipAddress: ctx.ipAddress,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.PASSWORD_CHANGED,
            performedBy: ctx.userId,
            targetUserId: userId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return { message: 'Password changed successfully. Please log in again.' };
    }
    async forgotPassword(dto) {
        const normalizedEmail = dto.email.toLowerCase().trim();
        await this.enforceRateLimit('password_reset', normalizedEmail, user_types_1.RATE_LIMIT.PASSWORD_RESET_RESEND_SECONDS);
        const user = await this.findByEmail(normalizedEmail);
        const genericResponse = {
            message: 'If this email is registered, you will receive a password reset link shortly',
        };
        if (!user)
            return genericResponse;
        if (user.status === users_entity_1.UserStatus.BANNED)
            return genericResponse;
        const { token, hashedToken, expiresAt } = this.generateToken(user_types_1.TOKEN_EXPIRY.PASSWORD_RESET);
        user.passwordResetToken = hashedToken;
        user.passwordResetTokenExpiresAt = expiresAt;
        await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.PASSWORD_RESET_REQUESTED, {
            userId: user.id,
            email: user.email,
            fullName: user.fullName,
            resetToken: token,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.PASSWORD_RESET_REQUESTED,
            performedBy: user.id,
            targetUserId: user.id,
            timestamp: new Date(),
        });
        return genericResponse;
    }
    async resetPassword(dto) {
        if (dto.newPassword !== dto.confirmNewPassword) {
            throw new user_exceptions_1.PasswordMismatchException();
        }
        const hashedToken = this.hashToken(dto.token);
        const user = await this.userRepository.findOne({
            where: { passwordResetToken: hashedToken },
        });
        if (!user)
            throw new user_exceptions_1.InvalidTokenException('password reset');
        if (!user.hasValidPasswordResetToken)
            throw new user_exceptions_1.ExpiredTokenException('password reset');
        const isSamePassword = await bcrypt.compare(dto.newPassword, user.password);
        if (isSamePassword)
            throw new user_exceptions_1.SamePasswordException();
        user.password = dto.newPassword;
        user.passwordResetToken = null;
        user.passwordResetTokenExpiresAt = null;
        user.lastPasswordChangeAt = new Date();
        if (user.status === users_entity_1.UserStatus.LOCKED) {
            user.status = users_entity_1.UserStatus.ACTIVE;
            user.lockedUntil = null;
            user.failedLoginAttempts = 0;
        }
        await this.userRepository.save(user);
        await this.invalidateAllSessions(user.id);
        this.eventEmitter.emit(user_types_1.UserEvent.PASSWORD_CHANGED, {
            userId: user.id,
            email: user.email,
            isReset: true,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.PASSWORD_RESET_COMPLETED,
            performedBy: user.id,
            targetUserId: user.id,
            timestamp: new Date(),
        });
        return { message: 'Password reset successfully. Please log in with your new password.' };
    }
    async setup2FA(userId, dto, ctx) {
        if (ctx.userId !== userId) {
            throw new user_exceptions_1.InsufficientPermissionsException('configure 2FA for another user');
        }
        const user = await this.findByIdRaw(userId);
        if (user.twoFactorEnabled) {
            throw new user_exceptions_1.TwoFactorAlreadyEnabledException();
        }
        if (dto.method === users_entity_1.TwoFactorMethod.NONE) {
            throw new user_exceptions_1.InsufficientPermissionsException('set 2FA method to none during setup');
        }
        if (dto.method === users_entity_1.TwoFactorMethod.TOTP) {
            const secret = speakeasy.generateSecret({
                name: `Cheese (${user.email})`,
                length: 32,
            });
            const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
            await this.redis.setex(`2fa_setup:${userId}`, 600, JSON.stringify({ secret: secret.base32, method: dto.method }));
            return {
                qrCode: qrCodeUrl,
                secret: secret.base32,
                message: 'Scan the QR code with your authenticator app, then verify with a code',
            };
        }
        if (dto.method === users_entity_1.TwoFactorMethod.SMS) {
            if (!user.phoneNumber || !user.phoneVerified) {
                throw new user_exceptions_1.InvalidTokenException('verified phone number required for SMS 2FA');
            }
            await this.redis.setex(`2fa_setup:${userId}`, 600, JSON.stringify({ method: dto.method }));
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
        await this.redis.setex(`2fa_setup:${userId}`, 600, JSON.stringify({ method: dto.method }));
        return {
            message: '2FA setup initiated. Check your email for a verification code.',
        };
    }
    async confirm2FA(userId, dto, ctx) {
        if (ctx.userId !== userId) {
            throw new user_exceptions_1.InsufficientPermissionsException('confirm 2FA for another user');
        }
        const setupDataStr = await this.redis.get(`2fa_setup:${userId}`);
        if (!setupDataStr) {
            throw new user_exceptions_1.InvalidTokenException('2FA setup session expired');
        }
        const setupData = JSON.parse(setupDataStr);
        const user = await this.findByIdRaw(userId);
        let isValid = false;
        if (setupData.method === users_entity_1.TwoFactorMethod.TOTP) {
            isValid = speakeasy.totp.verify({
                secret: setupData.secret,
                encoding: 'base32',
                token: dto.code,
                window: 1,
            });
        }
        else if (setupData.method === users_entity_1.TwoFactorMethod.SMS ||
            setupData.method === users_entity_1.TwoFactorMethod.EMAIL) {
            const storedCode = await this.redis.get(`2fa_otp:${userId}`);
            isValid = storedCode === dto.code;
            if (isValid)
                await this.redis.del(`2fa_otp:${userId}`);
        }
        if (!isValid)
            throw new user_exceptions_1.Invalid2FACodeException();
        const { plain: backupCodes, hashed: hashedBackupCodes } = this.generateBackupCodes(10);
        user.twoFactorEnabled = true;
        user.twoFactorMethod = setupData.method;
        user.twoFactorSecret = setupData.secret
            ? this.encryptSecret(setupData.secret)
            : null;
        user.twoFactorBackupCodes = hashedBackupCodes;
        await this.userRepository.save(user);
        await this.redis.del(`2fa_setup:${userId}`);
        this.eventEmitter.emit(user_types_1.UserEvent.TWO_FACTOR_ENABLED, {
            userId: user.id,
            email: user.email,
            method: setupData.method,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.TWO_FACTOR_ENABLED,
            performedBy: ctx.userId,
            targetUserId: userId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: { method: setupData.method },
        });
        return {
            backupCodes,
            message: 'Two-factor authentication enabled. Save your backup codes securely — they will not be shown again.',
        };
    }
    async verify2FACode(userId, code) {
        const user = await this.findByIdRaw(userId);
        if (!user.twoFactorEnabled)
            return true;
        if (user.twoFactorMethod === users_entity_1.TwoFactorMethod.TOTP) {
            const decryptedSecret = this.decryptSecret(user.twoFactorSecret);
            return speakeasy.totp.verify({
                secret: decryptedSecret,
                encoding: 'base32',
                token: code,
                window: 1,
            });
        }
        if (user.twoFactorMethod === users_entity_1.TwoFactorMethod.SMS ||
            user.twoFactorMethod === users_entity_1.TwoFactorMethod.EMAIL) {
            const storedCode = await this.redis.get(`2fa_login_otp:${userId}`);
            const isValid = storedCode === code;
            if (isValid)
                await this.redis.del(`2fa_login_otp:${userId}`);
            return isValid;
        }
        return false;
    }
    async use2FABackupCode(userId, dto) {
        const user = await this.findByIdRaw(userId);
        if (!user.twoFactorEnabled)
            throw new user_exceptions_1.TwoFactorNotEnabledException();
        if (!user.twoFactorBackupCodes?.length) {
            throw new user_exceptions_1.InvalidBackupCodeException();
        }
        const hashedInput = crypto
            .createHash('sha256')
            .update(dto.backupCode.trim().toUpperCase())
            .digest('hex');
        const codeIndex = user.twoFactorBackupCodes.indexOf(hashedInput);
        if (codeIndex === -1)
            throw new user_exceptions_1.InvalidBackupCodeException();
        user.twoFactorBackupCodes.splice(codeIndex, 1);
        await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.TWO_FACTOR_BACKUP_CODE_USED,
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
    async disable2FA(userId, dto, ctx) {
        if (ctx.userId !== userId && ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('disable 2FA for another user');
        }
        const user = await this.findByIdRaw(userId);
        if (!user.twoFactorEnabled)
            throw new user_exceptions_1.TwoFactorNotEnabledException();
        const isPasswordValid = await user.validatePassword(dto.password);
        if (!isPasswordValid)
            throw new user_exceptions_1.InvalidPasswordException();
        const is2FAValid = await this.verify2FACode(userId, dto.code);
        if (!is2FAValid)
            throw new user_exceptions_1.Invalid2FACodeException();
        user.twoFactorEnabled = false;
        user.twoFactorMethod = users_entity_1.TwoFactorMethod.NONE;
        user.twoFactorSecret = null;
        user.twoFactorBackupCodes = null;
        await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.TWO_FACTOR_DISABLED, {
            userId: user.id,
            email: user.email,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.TWO_FACTOR_DISABLED,
            performedBy: ctx.userId,
            targetUserId: userId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return { message: 'Two-factor authentication has been disabled' };
    }
    async invalidateAllSessions(userId) {
        await this.redis.setex(`sessions_invalidated:${userId}`, 7 * 24 * 60 * 60, new Date().toISOString());
        await this.userRepository.update(userId, { activeSessions: null });
        this.logger.log(`All sessions invalidated for user: ${userId}`);
    }
    async isSessionValid(userId, tokenIssuedAt) {
        const invalidationTime = await this.redis.get(`sessions_invalidated:${userId}`);
        if (!invalidationTime)
            return true;
        const invalidatedAt = new Date(invalidationTime);
        return tokenIssuedAt > invalidatedAt;
    }
    async updateUserRole(targetUserId, dto, ctx) {
        if (ctx.userId === targetUserId)
            throw new user_exceptions_1.CannotModifyOwnRoleException();
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        if (user_types_1.INTERNAL_ONLY_ROLES.includes(dto.role) &&
            ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('assign this role');
        }
        if (ctx.role === users_entity_1.UserRole.MERCHANT_ADMIN &&
            dto.role === users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('promote a user to merchant owner');
        }
        const previousRole = user.role;
        user.role = dto.role;
        user.updatedBy = ctx.userId;
        const updated = await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.ROLE_CHANGED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: { previousRole, newRole: dto.role },
        });
        return this.toResponseDto(updated);
    }
    async updateUserStatus(targetUserId, dto, ctx) {
        if (ctx.userId === targetUserId) {
            throw new user_exceptions_1.InsufficientPermissionsException('change your own account status');
        }
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        if (dto.status === users_entity_1.UserStatus.BANNED && ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('ban users');
        }
        if (user.status === users_entity_1.UserStatus.BANNED &&
            ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('reactivate a banned user');
        }
        const previousStatus = user.status;
        user.status = dto.status;
        user.updatedBy = ctx.userId;
        if (dto.status === users_entity_1.UserStatus.SUSPENDED ||
            dto.status === users_entity_1.UserStatus.BANNED) {
            await this.invalidateAllSessions(targetUserId);
        }
        const updated = await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.STATUS_CHANGED, {
            userId: user.id,
            email: user.email,
            previousStatus,
            newStatus: dto.status,
            reason: dto.reason,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.STATUS_CHANGED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: { previousStatus, newStatus: dto.status, reason: dto.reason },
        });
        return this.toResponseDto(updated);
    }
    async updateTransactionLimits(targetUserId, dto, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('update transaction limits');
        }
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        if (dto.dailyTransactionLimit !== undefined)
            user.dailyTransactionLimit = dto.dailyTransactionLimit;
        if (dto.monthlyTransactionLimit !== undefined)
            user.monthlyTransactionLimit = dto.monthlyTransactionLimit;
        if (dto.singleTransactionLimit !== undefined)
            user.singleTransactionLimit = dto.singleTransactionLimit;
        if (user.singleTransactionLimit &&
            user.dailyTransactionLimit &&
            user.singleTransactionLimit > user.dailyTransactionLimit) {
            throw new user_exceptions_1.InvalidTokenException('single transaction limit cannot exceed daily limit');
        }
        if (user.dailyTransactionLimit &&
            user.monthlyTransactionLimit &&
            user.dailyTransactionLimit > user.monthlyTransactionLimit) {
            throw new user_exceptions_1.InvalidTokenException('daily transaction limit cannot exceed monthly limit');
        }
        user.updatedBy = ctx.userId;
        const updated = await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.TRANSACTION_LIMITS_UPDATED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: dto,
        });
        return this.toResponseDto(updated);
    }
    async unlockUser(targetUserId, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER &&
            ctx.role !== users_entity_1.UserRole.SUPPORT) {
            throw new user_exceptions_1.InsufficientPermissionsException('unlock user accounts');
        }
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        user.resetFailedLoginAttempts();
        user.updatedBy = ctx.userId;
        await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.ACCOUNT_UNLOCKED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return { message: 'User account has been unlocked' };
    }
    async inviteTeamMember(dto, ctx) {
        if (ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_ADMIN &&
            ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('invite team members');
        }
        if (user_types_1.INTERNAL_ONLY_ROLES.includes(dto.role)) {
            throw new user_exceptions_1.InvalidInviteRoleException(dto.role);
        }
        if (dto.role === users_entity_1.UserRole.CUSTOMER) {
            throw new user_exceptions_1.InvalidInviteRoleException(dto.role);
        }
        if (ctx.role === users_entity_1.UserRole.MERCHANT_ADMIN &&
            dto.role === users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('invite users with merchant owner role');
        }
        if (!ctx.merchantId) {
            throw new user_exceptions_1.InsufficientPermissionsException('invite team members without a merchant context');
        }
        const normalizedEmail = dto.email.toLowerCase().trim();
        const existingUser = await this.findByEmail(normalizedEmail);
        if (existingUser) {
            if (existingUser.merchantId === ctx.merchantId) {
                return {
                    message: 'This user is already a member of your organization',
                };
            }
            if (existingUser.merchantId && existingUser.merchantId !== ctx.merchantId) {
                throw new user_exceptions_1.EmailAlreadyExistsException(normalizedEmail);
            }
        }
        const { token, hashedToken, expiresAt } = this.generateToken(user_types_1.TOKEN_EXPIRY.TEAM_INVITE);
        const tempPassword = crypto.randomBytes(16).toString('hex');
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            const invitedUser = queryRunner.manager.create(users_entity_1.User, {
                email: normalizedEmail,
                password: tempPassword,
                fullName: dto.fullName ?? null,
                role: dto.role,
                status: users_entity_1.UserStatus.PENDING_VERIFICATION,
                merchantId: ctx.merchantId,
                emailVerificationToken: hashedToken,
                emailVerificationTokenExpiresAt: expiresAt,
                createdBy: ctx.userId,
                createdFromIp: ctx.ipAddress,
                kycStatus: users_entity_1.KYCStatus.NOT_STARTED,
                twoFactorEnabled: false,
                twoFactorMethod: users_entity_1.TwoFactorMethod.NONE,
                apiAccessEnabled: dto.role === users_entity_1.UserRole.DEVELOPER ? true : false,
                emailVerified: false,
                phoneVerified: false,
                failedLoginAttempts: 0,
                timezone: 'UTC',
                language: 'en',
                preferredCurrency: 'USD',
            });
            await queryRunner.manager.save(users_entity_1.User, invitedUser);
            await queryRunner.commitTransaction();
            this.eventEmitter.emit(user_types_1.UserEvent.TEAM_MEMBER_INVITED, {
                userId: invitedUser.id,
                email: invitedUser.email,
                fullName: invitedUser.fullName,
                role: invitedUser.role,
                inviteToken: token,
                invitedBy: ctx.userId,
                merchantId: ctx.merchantId,
            });
            await this.audit({
                action: user_types_1.UserAuditAction.TEAM_MEMBER_INVITED,
                performedBy: ctx.userId,
                targetUserId: invitedUser.id,
                ipAddress: ctx.ipAddress,
                timestamp: new Date(),
                metadata: { role: dto.role, email: normalizedEmail },
            });
            return {
                message: `Invitation sent to ${normalizedEmail}`,
            };
        }
        catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    async approveKYC(targetUserId, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.SUPPORT) {
            throw new user_exceptions_1.InsufficientPermissionsException('approve KYC');
        }
        const user = await this.findByIdRaw(targetUserId);
        if (user.kycStatus === users_entity_1.KYCStatus.APPROVED) {
            return this.toResponseDto(user);
        }
        user.kycStatus = users_entity_1.KYCStatus.APPROVED;
        user.kycApprovedAt = new Date();
        user.kycRejectionReason = null;
        user.status = users_entity_1.UserStatus.ACTIVE;
        user.updatedBy = ctx.userId;
        const updated = await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.KYC_STATUS_CHANGED, {
            userId: user.id,
            email: user.email,
            kycStatus: users_entity_1.KYCStatus.APPROVED,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.KYC_APPROVED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return this.toResponseDto(updated);
    }
    async rejectKYC(targetUserId, reason, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.SUPPORT) {
            throw new user_exceptions_1.InsufficientPermissionsException('reject KYC');
        }
        const user = await this.findByIdRaw(targetUserId);
        user.kycStatus = users_entity_1.KYCStatus.REJECTED;
        user.kycRejectionReason = reason;
        user.status = users_entity_1.UserStatus.PENDING_APPROVAL;
        user.updatedBy = ctx.userId;
        const updated = await this.userRepository.save(user);
        this.eventEmitter.emit(user_types_1.UserEvent.KYC_STATUS_CHANGED, {
            userId: user.id,
            email: user.email,
            kycStatus: users_entity_1.KYCStatus.REJECTED,
            reason,
        });
        await this.audit({
            action: user_types_1.UserAuditAction.KYC_REJECTED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
            metadata: { reason },
        });
        return this.toResponseDto(updated);
    }
    async toggleApiAccess(targetUserId, enable, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.role !== users_entity_1.UserRole.MERCHANT_OWNER) {
            throw new user_exceptions_1.InsufficientPermissionsException('manage API access');
        }
        const user = await this.findByIdRaw(targetUserId);
        this.assertMerchantScope(ctx, user);
        user.apiAccessEnabled = enable;
        user.updatedBy = ctx.userId;
        await this.userRepository.save(user);
        await this.audit({
            action: enable
                ? user_types_1.UserAuditAction.API_ACCESS_ENABLED
                : user_types_1.UserAuditAction.API_ACCESS_DISABLED,
            performedBy: ctx.userId,
            targetUserId,
            ipAddress: ctx.ipAddress,
            timestamp: new Date(),
        });
        return {
            message: `API access has been ${enable ? 'enabled' : 'disabled'} for this user`,
        };
    }
    async recordSuccessfulLogin(userId, ipAddress, userAgent) {
        const user = await this.findByIdRaw(userId);
        user.updateLastLogin(ipAddress, userAgent);
        user.resetFailedLoginAttempts();
        await this.userRepository.save(user);
        await this.audit({
            action: user_types_1.UserAuditAction.LOGIN_SUCCESS,
            performedBy: userId,
            targetUserId: userId,
            ipAddress,
            userAgent,
            timestamp: new Date(),
        });
    }
    async recordFailedLogin(email, ipAddress) {
        const user = await this.findByEmail(email);
        if (!user)
            return;
        await user.incrementFailedLoginAttempts(user_types_1.RATE_LIMIT.MAX_FAILED_LOGIN_ATTEMPTS, user_types_1.RATE_LIMIT.ACCOUNT_LOCK_DURATION_MINUTES);
        await this.userRepository.save(user);
        if (user.status === users_entity_1.UserStatus.LOCKED) {
            this.eventEmitter.emit(user_types_1.UserEvent.ACCOUNT_LOCKED, {
                userId: user.id,
                email: user.email,
                lockedUntil: user.lockedUntil,
                ipAddress,
            });
            await this.audit({
                action: user_types_1.UserAuditAction.ACCOUNT_LOCKED,
                performedBy: user.id,
                targetUserId: user.id,
                ipAddress,
                timestamp: new Date(),
                metadata: {
                    failedAttempts: user.failedLoginAttempts,
                    lockedUntil: user.lockedUntil,
                },
            });
        }
        else {
            await this.audit({
                action: user_types_1.UserAuditAction.LOGIN_FAILED,
                performedBy: user.id,
                targetUserId: user.id,
                ipAddress,
                timestamp: new Date(),
                metadata: { failedAttempts: user.failedLoginAttempts },
            });
        }
    }
    async sendLoginOtp(userId) {
        const user = await this.findByIdRaw(userId);
        if (!user.twoFactorEnabled) {
            throw new user_exceptions_1.TwoFactorNotEnabledException();
        }
        if (user.twoFactorMethod === users_entity_1.TwoFactorMethod.TOTP) {
            return;
        }
        const rateLimitKey = `rate_limit:login_otp:${userId}`;
        const isRateLimited = await this.redis.get(rateLimitKey);
        if (isRateLimited) {
            const ttl = await this.redis.ttl(rateLimitKey);
            throw new user_exceptions_1.TooManyRequestsException({
                code: 'LOGIN_OTP_RATE_LIMITED',
                message: `Too many OTP requests. Please wait ${ttl} seconds.`,
                retryAfter: ttl,
            });
        }
        const code = crypto.randomInt(100000, 999999).toString();
        await this.redis.setex(`2fa_login_otp:${userId}`, 300, code);
        await this.redis.setex(rateLimitKey, 60, '1');
        if (user.twoFactorMethod === users_entity_1.TwoFactorMethod.SMS) {
            if (!user.phoneNumber || !user.phoneVerified) {
                this.logger.error(`User ${userId} has SMS 2FA but no verified phone`);
                throw new user_exceptions_1.TwoFactorNotEnabledException();
            }
            this.eventEmitter.emit('notification.sms', {
                to: user.phoneNumber,
                code,
                userId: user.id,
                context: '2fa_login',
            });
        }
        if (user.twoFactorMethod === users_entity_1.TwoFactorMethod.EMAIL) {
            this.eventEmitter.emit('notification.email', {
                to: user.email,
                userId: user.id,
                context: '2fa_login',
                code,
            });
        }
    }
    async getUsersByMerchantId(merchantId, ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN &&
            ctx.merchantId !== merchantId) {
            throw new user_exceptions_1.CrossMerchantAccessException();
        }
        const users = await this.userRepository.find({
            where: {
                merchantId,
                role: (0, typeorm_2.Not)(users_entity_1.UserRole.CUSTOMER),
            },
            order: {
                createdAt: 'DESC',
            },
            take: 500,
        });
        return users.map((user) => this.toResponseDto(user));
    }
    encryptSecret(plaintext) {
        const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');
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
    decryptSecret(ciphertext) {
        const key = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'hex');
        const buf = Buffer.from(ciphertext, 'base64');
        const iv = buf.subarray(0, 16);
        const authTag = buf.subarray(16, 32);
        const encrypted = buf.subarray(32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(encrypted) + decipher.final('utf8');
    }
    async getUserStats(ctx) {
        if (ctx.role !== users_entity_1.UserRole.SUPER_ADMIN) {
            throw new user_exceptions_1.InsufficientPermissionsException('view platform statistics');
        }
        const [total, active, pendingVerification, pendingApproval, suspended, banned, locked, kycApproved, kycPending,] = await Promise.all([
            this.userRepository.count(),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.ACTIVE } }),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.PENDING_VERIFICATION } }),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.PENDING_APPROVAL } }),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.SUSPENDED } }),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.BANNED } }),
            this.userRepository.count({ where: { status: users_entity_1.UserStatus.LOCKED } }),
            this.userRepository.count({ where: { kycStatus: users_entity_1.KYCStatus.APPROVED } }),
            this.userRepository.count({ where: { kycStatus: users_entity_1.KYCStatus.UNDER_REVIEW } }),
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
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(users_entity_1.User)),
    __param(3, (0, ioredis_1.InjectRedis)()),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.DataSource,
        event_emitter_1.EventEmitter2, Function])
], UserService);
//# sourceMappingURL=user.service.js.map