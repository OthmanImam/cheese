import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import * as bcrypt from 'bcrypt';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * User Entity - Core entity for Cheese Platform
 *
 * Represents both merchant users and their team members
 * Implements security best practices, audit trails, and multi-tenancy
 *
 * @author Senior Backend Engineer
 * @version 1.0.0
 */

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  MERCHANT_OWNER = 'merchant_owner',
  MERCHANT_ADMIN = 'merchant_admin',
  MERCHANT_VIEWER = 'merchant_viewer',
  DEVELOPER = 'developer',
  FINANCE = 'finance',
  SUPPORT = 'support',
  CUSTOMER = 'customer',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_APPROVAL = 'pending_approval',
  LOCKED = 'locked',
}

export enum KYCStatus {
  NOT_STARTED = 'not_started',
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  RESUBMISSION_REQUIRED = 'resubmission_required',
}

export enum TwoFactorMethod {
  NONE = 'none',
  TOTP = 'totp',        // Time-based OTP (Google Authenticator)
  SMS = 'sms',          // SMS-based OTP
  EMAIL = 'email',      // Email-based OTP
}

@Entity('users')
@Index(['email'], { unique: true })
@Index(['merchantId', 'status'])
@Index(['role', 'status'])
@Index(['createdAt'])
@Index(['lastLoginAt'])
export class User {
  @ApiProperty({ description: 'Unique user identifier (UUID)' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ==================== IDENTITY & AUTHENTICATION ====================
  
  @ApiProperty({ description: 'User email address', example: 'merchant@example.com' })
  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  email: string;

  @Exclude() // Never expose password in API responses
  @Column({ type: 'varchar', length: 255 })
  password: string;

  @ApiPropertyOptional({ description: 'User full name', example: 'John Doe' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string | null;

  @ApiPropertyOptional({ description: 'User phone number', example: '+2348012345678' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  @Index()
  phoneNumber: string | null;

  @ApiProperty({ description: 'User role in the system', enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.MERCHANT_OWNER,
  })
  role: UserRole;

  @ApiProperty({ description: 'User account status', enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_VERIFICATION,
  })
  status: UserStatus;

  // ==================== MULTI-TENANCY ====================

  @ApiPropertyOptional({
    description: 'Associated merchant ID for multi-tenancy',
  })
  @Column({ type: 'uuid', nullable: true })
  @Index()
  merchantId: string | null;

  // ==================== SECURITY & VERIFICATION ====================

  @ApiProperty({ description: 'Whether email is verified' })
  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationTokenExpiresAt: Date | null;

  @ApiProperty({ description: 'Whether phone number is verified' })
  @Column({ type: 'boolean', default: false })
  phoneVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', length: 10, nullable: true })
  phoneVerificationCode: string | null;

  @Column({ type: 'timestamp', nullable: true })
  phoneVerificationCodeExpiresAt: Date | null;

  // ==================== TWO-FACTOR AUTHENTICATION ====================

  @ApiProperty({ description: '2FA method enabled', enum: TwoFactorMethod })
  @Column({
    type: 'enum',
    enum: TwoFactorMethod,
    default: TwoFactorMethod.NONE,
  })
  twoFactorMethod: TwoFactorMethod;

  @ApiProperty({ description: 'Whether 2FA is enabled' })
  @Column({ type: 'boolean', default: false })
  twoFactorEnabled: boolean;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  twoFactorSecret: string | null; // Encrypted TOTP secret

  @Exclude()
  @Column({ type: 'json', nullable: true })
  twoFactorBackupCodes: string[] | null; // Encrypted backup codes

  // ==================== PASSWORD RESET ====================
  
  @Exclude()
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetTokenExpiresAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastPasswordChangeAt: Date | null;

  // ==================== KYC/COMPLIANCE ====================
  
  @ApiProperty({ description: 'KYC verification status', enum: KYCStatus })
  @Column({
    type: 'enum',
    enum: KYCStatus,
    default: KYCStatus.NOT_STARTED,
  })
  kycStatus: KYCStatus;

  @ApiPropertyOptional({ description: 'KYC document IDs or references' })
  @Column({ type: 'json', nullable: true })
  kycDocuments: {
    type: string;
    documentId: string;
    uploadedAt: Date;
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
  }[] | null;

  @Column({ type: 'timestamp', nullable: true })
  kycSubmittedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  kycApprovedAt: Date | null;

  @ApiPropertyOptional({ description: 'KYC rejection reason' })
  @Column({ type: 'text', nullable: true })
  kycRejectionReason: string | null;

  // ==================== SESSION & SECURITY TRACKING ====================

  @ApiPropertyOptional({ description: 'Last successful login timestamp' })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  @ApiPropertyOptional({ description: 'Last login IP address' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  lastLoginIp: string | null;

  @ApiPropertyOptional({ description: 'Last login user agent' })
  @Column({ type: 'text', nullable: true })
  lastLoginUserAgent: string | null;

  @ApiProperty({ description: 'Failed login attempts counter' })
  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @Exclude()
  @Column({ type: 'json', nullable: true })
  activeSessions: {
    sessionId: string;
        createdAt: Date;
    lastActivityAt: Date;
    ipAddress: string;
    userAgent: string;
    deviceId?: string;
  }[] | null;

  // ==================== API ACCESS ====================
  
  @ApiProperty({ description: 'Whether user has API access enabled' })
  @Column({ type: 'boolean', default: false })
  apiAccessEnabled: boolean;

  // ==================== PREFERENCES & SETTINGS ====================

  @ApiPropertyOptional({
    description: 'User timezone',
    example: 'Africa/Lagos',
  })
  @Column({ type: 'varchar', length: 50, default: 'UTC' })
  timezone: string;

  @ApiPropertyOptional({ description: 'Preferred language', example: 'en' })
  @Column({ type: 'varchar', length: 10, default: 'en' })
  language: string;

  @ApiPropertyOptional({
    description: 'Preferred fiat currency',
    example: 'USD',
  })
  @Column({ type: 'varchar', length: 3, default: 'USD' })
  preferredCurrency: string;

  @ApiPropertyOptional({ description: 'User notification preferences' })
  @Column({ type: 'json', nullable: true })
  notificationPreferences: {
    email: {
      transactionAlerts: boolean;
      settlementNotifications: boolean;
      securityAlerts: boolean;
      productUpdates: boolean;
      marketingEmails: boolean;
    };
    sms: {
      transactionAlerts: boolean;
      securityAlerts: boolean;
    };
    push: {
      transactionAlerts: boolean;
      settlementNotifications: boolean;
    };
  } | null;

  @ApiPropertyOptional({ description: 'User avatar/profile picture URL' })
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  // ==================== FINANCIAL LIMITS & CONTROLS ====================

  @ApiPropertyOptional({ description: 'Daily transaction limit in USD' })
  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  dailyTransactionLimit: number | null;

  @ApiPropertyOptional({ description: 'Monthly transaction limit in USD' })
  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  monthlyTransactionLimit: number | null;

  @ApiPropertyOptional({ description: 'Single transaction limit in USD' })
  @Column({ type: 'decimal', precision: 20, scale: 2, nullable: true })
  singleTransactionLimit: number | null;

  // ==================== AUDIT & METADATA ====================

  @ApiProperty({ description: 'Record creation timestamp' })
  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Record last update timestamp' })
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Soft delete timestamp' })
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt: Date | null;

  @ApiPropertyOptional({ description: 'User who created this record' })
  @Column({ type: 'uuid', nullable: true })
  createdBy: string | null;

  @ApiPropertyOptional({ description: 'User who last updated this record' })
  @Column({ type: 'uuid', nullable: true })
  updatedBy: string | null;

  @ApiPropertyOptional({ description: 'IP address of creation' })
  @Column({ type: 'varchar', length: 45, nullable: true })
  createdFromIp: string | null;

  @ApiPropertyOptional({ description: 'Additional metadata in JSON format' })
  @Column({ type: 'json', nullable: true })
  metadata: {
    referralSource?: string;
    utmParameters?: Record<string, string>;
    businessType?: string;
    companySize?: string;
    estimatedMonthlyVolume?: number;
    customFields?: Record<string, any>;
  } | null;

  // ==================== COMPUTED/VIRTUAL PROPERTIES ====================

  get isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  get canAccess(): boolean {
    return (
      this.status === UserStatus.ACTIVE &&
      this.emailVerified &&
      !this.isLocked &&
      this.kycStatus === KYCStatus.APPROVED
    );
  }

  get requires2FA(): boolean {
    return (
      this.twoFactorEnabled && this.twoFactorMethod !== TwoFactorMethod.NONE
    );
  }

  get hasValidPasswordResetToken(): boolean {
    if (!this.passwordResetToken || !this.passwordResetTokenExpiresAt) {
      return false;
    }
    return new Date() < this.passwordResetTokenExpiresAt;
  }

  get hasValidEmailVerificationToken(): boolean {
    if (!this.emailVerificationToken || !this.emailVerificationTokenExpiresAt) {
      return false;
    }
    return new Date() < this.emailVerificationTokenExpiresAt;
  }

  // ==================== LIFECYCLE HOOKS ====================

  @BeforeInsert()
  @BeforeUpdate()
  async normalizeData() {
    if (this.email) {
      this.email = this.email.toLowerCase().trim();
    }
    if (this.phoneNumber) {
      this.phoneNumber = this.phoneNumber.replace(/\s+/g, '');
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2b$')) {
      const saltRounds = 12;
      this.password = await bcrypt.hash(this.password, saltRounds);
    }
  }

  // ==================== INSTANCE METHODS ====================

  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }

  async incrementFailedLoginAttempts(
    maxAttempts = 5,
    lockDurationMinutes = 30,
  ): Promise<void> {
    this.failedLoginAttempts += 1;
    if (this.failedLoginAttempts >= maxAttempts) {
      this.status = UserStatus.LOCKED;
      this.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    }
  }

  resetFailedLoginAttempts(): void {
    this.failedLoginAttempts = 0;
    this.lockedUntil = null;
    if (this.status === UserStatus.LOCKED) {
      this.status = UserStatus.ACTIVE;
    }
  }

  updateLastLogin(ipAddress: string, userAgent: string): void {
    this.lastLoginAt = new Date();
    this.lastLoginIp = ipAddress;
    this.lastLoginUserAgent = userAgent;
  }

  hasPermission(permission: string): boolean {
    const rolePermissions: Record<UserRole, string[]> = {
      [UserRole.SUPER_ADMIN]: ['*'],
      [UserRole.MERCHANT_OWNER]: [
        'merchant:read',
        'merchant:write',
        'merchant:delete',
        'payment:read', 'payment:create',
          'settlement:read',
          'settlement:initiate',
        'api-key:read',
        'api-key:create',
        'api-key:delete',
        'user:read',
        'user:invite',
        'user:manage',
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
        'api-key:read',
        'user:read',
        'webhook:read',
      ],
      [UserRole.MERCHANT_VIEWER]: [
        'merchant:read',
        'payment:read',
        'settlement:read',
      ],
      [UserRole.DEVELOPER]: [
        'merchant:read',
        'payment:read',
        'payment:create',
        'api-key:read',
        'webhook:read',
      ],
      [UserRole.FINANCE]: [
        'merchant:read', 'payment:read',
        'settlement:read',
        'settlement:initiate',
        'settlement:approve',
      ],
      [UserRole.SUPPORT]: ['merchant:read', 'payment:read', 'user:read'],
    };

    const userPermissions = rolePermissions[this.role] || [];
    return (
      userPermissions.includes('*') || userPermissions.includes(permission)
    );
  }

  toJSON() {
    const { 
      password,
      twoFactorSecret,
      twoFactorBackupCodes,
      emailVerificationToken, phoneVerificationCode,
      passwordResetToken, activeSessions,
      ...sanitized
    } = this;
    return sanitized;
  }
}
