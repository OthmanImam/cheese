import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, DeleteDateColumn, Index, OneToMany, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Otp } from '../../otp/entities/otp.entity';
import { RefreshToken } from '../../tokens/entities/refresh-token.entity';
import { Referral } from '../../referrals/entities/referral.entity';

export enum UserStatus {
  PENDING   = 'pending',
  ACTIVE    = 'active',
  SUSPENDED = 'suspended',
  BANNED    = 'banned',
}

export enum UserTier {
  SILVER = 'silver',
  GOLD   = 'gold',
  BLACK  = 'black',
}

export enum SignupSource {
  WAITLIST = 'waitlist',
  DIRECT   = 'direct',
  REFERRAL = 'referral',
}

@Entity('users')
@Index('UQ_users_email_active',    ['email'],    { unique: true, where: '"deleted_at" IS NULL' })
@Index('UQ_users_username_active', ['username'], { unique: true, where: '"deleted_at" IS NULL' })
@Index('UQ_users_phone_active',    ['phone'],    { unique: true, where: '"deleted_at" IS NULL AND "phone" IS NOT NULL' })
@Index('IDX_users_status',         ['status'])
@Index('IDX_users_created_at',     ['createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ── Identity ──────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 30 })
  username: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string | null;

  // ── Security ──────────────────────────────────────────────────────────────
  @Column({ type: 'text' })
  @Exclude({ toPlainOnly: true })
  passwordHash: string;

  /**
   * Argon2 config version — increment when tuning parameters.
   * On next login, re-hash transparently if version < current.
   */
  @Column({ type: 'smallint', default: 1 })
  @Exclude({ toPlainOnly: true })
  passwordVersion: number;

  @Column({ type: 'boolean', default: false })
  emailVerified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  // ── Account state ─────────────────────────────────────────────────────────
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ type: 'enum', enum: UserTier, default: UserTier.SILVER })
  tier: UserTier;

  @Column({ type: 'enum', enum: SignupSource })
  signupSource: SignupSource;

  // ── Waitlist data ─────────────────────────────────────────────────────────
  @Column({ type: 'boolean', default: false })
  wasOnWaitlist: boolean;

  /** Username cannot be changed for 90 days for waitlist users */
  @Column({ type: 'timestamptz', nullable: true })
  usernameLockedUntil: Date | null;

  // ── Referral ──────────────────────────────────────────────────────────────
  @Column({ type: 'varchar', length: 16, unique: true })
  referralCode: string;

  @Column({ type: 'uuid', nullable: true })
  @Index('IDX_users_referred_by')
  referredById: string | null;

  // ── Brute-force protection ────────────────────────────────────────────────
  @Column({ type: 'smallint', default: 0 })
  @Exclude({ toPlainOnly: true })
  loginAttempts: number;

  @Column({ type: 'timestamptz', nullable: true })
  @Exclude({ toPlainOnly: true })
  lockedUntil: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ type: 'inet', nullable: true })
  @Exclude({ toPlainOnly: true })
  lastLoginIp: string | null;

  // ── Timestamps ────────────────────────────────────────────────────────────
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  // ── Relations ─────────────────────────────────────────────────────────────
  @OneToMany(() => Otp, (otp) => otp.user)
  otps: Otp[];

  @OneToMany(() => RefreshToken, (rt) => rt.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Referral, (r) => r.referrer)
  referrals: Referral[];

  // ── Hooks ─────────────────────────────────────────────────────────────────
  @BeforeInsert()
  @BeforeUpdate()
  normalizeFields() {
    if (this.email)    this.email    = this.email.toLowerCase().trim();
    if (this.username) this.username = this.username.toLowerCase().trim();
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  get isLocked(): boolean {
    return this.lockedUntil !== null && this.lockedUntil > new Date();
  }

  get isActive(): boolean {
    return this.status === UserStatus.ACTIVE && !this.isLocked;
  }
}
