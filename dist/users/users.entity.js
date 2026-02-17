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
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = exports.TwoFactorMethod = exports.KYCStatus = exports.UserStatus = exports.UserRole = void 0;
const typeorm_1 = require("typeorm");
const class_transformer_1 = require("class-transformer");
const bcrypt = __importStar(require("bcrypt"));
const swagger_1 = require("@nestjs/swagger");
var UserRole;
(function (UserRole) {
    UserRole["SUPER_ADMIN"] = "super_admin";
    UserRole["MERCHANT_OWNER"] = "merchant_owner";
    UserRole["MERCHANT_ADMIN"] = "merchant_admin";
    UserRole["MERCHANT_VIEWER"] = "merchant_viewer";
    UserRole["DEVELOPER"] = "developer";
    UserRole["FINANCE"] = "finance";
    UserRole["SUPPORT"] = "support";
    UserRole["CUSTOMER"] = "customer";
})(UserRole || (exports.UserRole = UserRole = {}));
var UserStatus;
(function (UserStatus) {
    UserStatus["PENDING_VERIFICATION"] = "pending_verification";
    UserStatus["ACTIVE"] = "active";
    UserStatus["SUSPENDED"] = "suspended";
    UserStatus["BANNED"] = "banned";
    UserStatus["PENDING_APPROVAL"] = "pending_approval";
    UserStatus["LOCKED"] = "locked";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var KYCStatus;
(function (KYCStatus) {
    KYCStatus["NOT_STARTED"] = "not_started";
    KYCStatus["PENDING"] = "pending";
    KYCStatus["SUBMITTED"] = "submitted";
    KYCStatus["UNDER_REVIEW"] = "under_review";
    KYCStatus["APPROVED"] = "approved";
    KYCStatus["REJECTED"] = "rejected";
    KYCStatus["RESUBMISSION_REQUIRED"] = "resubmission_required";
})(KYCStatus || (exports.KYCStatus = KYCStatus = {}));
var TwoFactorMethod;
(function (TwoFactorMethod) {
    TwoFactorMethod["NONE"] = "none";
    TwoFactorMethod["TOTP"] = "totp";
    TwoFactorMethod["SMS"] = "sms";
    TwoFactorMethod["EMAIL"] = "email";
})(TwoFactorMethod || (exports.TwoFactorMethod = TwoFactorMethod = {}));
let User = class User {
    id;
    email;
    password;
    fullName;
    phoneNumber;
    role;
    status;
    merchantId;
    emailVerified;
    emailVerificationToken;
    emailVerificationTokenExpiresAt;
    phoneVerified;
    phoneVerificationCode;
    phoneVerificationCodeExpiresAt;
    twoFactorMethod;
    twoFactorEnabled;
    twoFactorSecret;
    twoFactorBackupCodes;
    passwordResetToken;
    passwordResetTokenExpiresAt;
    lastPasswordChangeAt;
    kycStatus;
    kycDocuments;
    kycSubmittedAt;
    kycApprovedAt;
    kycRejectionReason;
    lastLoginAt;
    lastLoginIp;
    lastLoginUserAgent;
    failedLoginAttempts;
    lockedUntil;
    activeSessions;
    apiAccessEnabled;
    timezone;
    language;
    preferredCurrency;
    notificationPreferences;
    avatarUrl;
    dailyTransactionLimit;
    monthlyTransactionLimit;
    singleTransactionLimit;
    createdAt;
    updatedAt;
    deletedAt;
    createdBy;
    updatedBy;
    createdFromIp;
    metadata;
    get isLocked() {
        if (!this.lockedUntil)
            return false;
        return new Date() < this.lockedUntil;
    }
    get canAccess() {
        return (this.status === UserStatus.ACTIVE &&
            this.emailVerified &&
            !this.isLocked &&
            this.kycStatus === KYCStatus.APPROVED);
    }
    get requires2FA() {
        return this.twoFactorEnabled && this.twoFactorMethod !== TwoFactorMethod.NONE;
    }
    get hasValidPasswordResetToken() {
        if (!this.passwordResetToken || !this.passwordResetTokenExpiresAt) {
            return false;
        }
        return new Date() < this.passwordResetTokenExpiresAt;
    }
    get hasValidEmailVerificationToken() {
        if (!this.emailVerificationToken || !this.emailVerificationTokenExpiresAt) {
            return false;
        }
        return new Date() < this.emailVerificationTokenExpiresAt;
    }
    async normalizeData() {
        if (this.email) {
            this.email = this.email.toLowerCase().trim();
        }
        if (this.phoneNumber) {
            this.phoneNumber = this.phoneNumber.replace(/\s+/g, '');
        }
    }
    async hashPassword() {
        if (this.password && !this.password.startsWith('$2b$')) {
            const saltRounds = 12;
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }
    async validatePassword(plainPassword) {
        return bcrypt.compare(plainPassword, this.password);
    }
    async incrementFailedLoginAttempts(maxAttempts = 5, lockDurationMinutes = 30) {
        this.failedLoginAttempts += 1;
        if (this.failedLoginAttempts >= maxAttempts) {
            this.status = UserStatus.LOCKED;
            this.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
        }
    }
    resetFailedLoginAttempts() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
        if (this.status === UserStatus.LOCKED) {
            this.status = UserStatus.ACTIVE;
        }
    }
    updateLastLogin(ipAddress, userAgent) {
        this.lastLoginAt = new Date();
        this.lastLoginIp = ipAddress;
        this.lastLoginUserAgent = userAgent;
    }
    hasPermission(permission) {
        const rolePermissions = {
            [UserRole.SUPER_ADMIN]: ['*'],
            [UserRole.MERCHANT_OWNER]: [
                'merchant:read', 'merchant:write', 'merchant:delete',
                'payment:read', 'payment:create',
                'settlement:read', 'settlement:initiate',
                'api-key:read', 'api-key:create', 'api-key:delete',
                'user:read', 'user:invite', 'user:manage',
                'webhook:manage',
            ],
            [UserRole.CUSTOMER]: [
                'profile:read',
                'profile:write',
                'payment:create',
                'payment:read',
                'wallet:read',
                'wallet:connect',
            ],
            [UserRole.MERCHANT_ADMIN]: [
                'merchant:read', 'merchant:write',
                'payment:read', 'payment:create',
                'settlement:read', 'settlement:initiate',
                'api-key:read', 'user:read', 'webhook:read',
            ],
            [UserRole.MERCHANT_VIEWER]: [
                'merchant:read', 'payment:read', 'settlement:read',
            ],
            [UserRole.DEVELOPER]: [
                'merchant:read', 'payment:read', 'payment:create',
                'api-key:read', 'webhook:read',
            ],
            [UserRole.FINANCE]: [
                'merchant:read', 'payment:read',
                'settlement:read', 'settlement:initiate', 'settlement:approve',
            ],
            [UserRole.SUPPORT]: [
                'merchant:read', 'payment:read', 'user:read',
            ],
        };
        const userPermissions = rolePermissions[this.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
    }
    toJSON() {
        const { password, twoFactorSecret, twoFactorBackupCodes, emailVerificationToken, phoneVerificationCode, passwordResetToken, activeSessions, ...sanitized } = this;
        return sanitized;
    }
};
exports.User = User;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique user identifier (UUID)' }),
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User email address', example: 'merchant@example.com' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, unique: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User full name', example: 'John Doe' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "fullName", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User phone number', example: '+2348012345678' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], User.prototype, "phoneNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User role in the system', enum: UserRole }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserRole,
        default: UserRole.MERCHANT_OWNER,
    }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'User account status', enum: UserStatus }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: UserStatus,
        default: UserStatus.PENDING_VERIFICATION,
    }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Associated merchant ID for multi-tenancy' }),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    (0, typeorm_1.Index)(),
    __metadata("design:type", Object)
], User.prototype, "merchantId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether email is verified' }),
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "emailVerified", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "emailVerificationTokenExpiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether phone number is verified' }),
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "phoneVerified", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "phoneVerificationCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "phoneVerificationCodeExpiresAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: '2FA method enabled', enum: TwoFactorMethod }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: TwoFactorMethod,
        default: TwoFactorMethod.NONE,
    }),
    __metadata("design:type", String)
], User.prototype, "twoFactorMethod", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether 2FA is enabled' }),
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "twoFactorEnabled", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "twoFactorSecret", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "twoFactorBackupCodes", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'varchar', length: 255, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordResetToken", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "passwordResetTokenExpiresAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastPasswordChangeAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'KYC verification status', enum: KYCStatus }),
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: KYCStatus,
        default: KYCStatus.NOT_STARTED,
    }),
    __metadata("design:type", String)
], User.prototype, "kycStatus", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'KYC document IDs or references' }),
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "kycDocuments", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "kycSubmittedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "kycApprovedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'KYC rejection reason' }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "kycRejectionReason", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Last successful login timestamp' }),
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Last login IP address' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastLoginIp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Last login user agent' }),
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lastLoginUserAgent", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Failed login attempts counter' }),
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], User.prototype, "failedLoginAttempts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "lockedUntil", void 0);
__decorate([
    (0, class_transformer_1.Exclude)(),
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "activeSessions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether user has API access enabled' }),
    (0, typeorm_1.Column)({ type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], User.prototype, "apiAccessEnabled", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User timezone', example: 'Africa/Lagos' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'UTC' }),
    __metadata("design:type", String)
], User.prototype, "timezone", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Preferred language', example: 'en' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 10, default: 'en' }),
    __metadata("design:type", String)
], User.prototype, "language", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Preferred fiat currency', example: 'USD' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 3, default: 'USD' }),
    __metadata("design:type", String)
], User.prototype, "preferredCurrency", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User notification preferences' }),
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "notificationPreferences", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User avatar/profile picture URL' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "avatarUrl", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Daily transaction limit in USD' }),
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "dailyTransactionLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Monthly transaction limit in USD' }),
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "monthlyTransactionLimit", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Single transaction limit in USD' }),
    (0, typeorm_1.Column)({ type: 'decimal', precision: 20, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "singleTransactionLimit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Record creation timestamp' }),
    (0, typeorm_1.CreateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Record last update timestamp' }),
    (0, typeorm_1.UpdateDateColumn)({ type: 'timestamp' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Soft delete timestamp' }),
    (0, typeorm_1.DeleteDateColumn)({ type: 'timestamp', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "deletedAt", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User who created this record' }),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "createdBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'User who last updated this record' }),
    (0, typeorm_1.Column)({ type: 'uuid', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "updatedBy", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'IP address of creation' }),
    (0, typeorm_1.Column)({ type: 'varchar', length: 45, nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "createdFromIp", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Additional metadata in JSON format' }),
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "normalizeData", null);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], User.prototype, "hashPassword", null);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users'),
    (0, typeorm_1.Index)(['email'], { unique: true }),
    (0, typeorm_1.Index)(['merchantId', 'status']),
    (0, typeorm_1.Index)(['role', 'status']),
    (0, typeorm_1.Index)(['createdAt']),
    (0, typeorm_1.Index)(['lastLoginAt'])
], User);
//# sourceMappingURL=users.entity.js.map