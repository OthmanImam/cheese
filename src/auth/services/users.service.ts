import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { User, UserStatus, UserTier, SignupSource } from '../../users/entities/user.entity';
import { Referral, ReferralStatus } from '../../referrals/entities/referral.entity';
import {
  UserAlreadyExistsException,
  InvalidCredentialsException,
  AccountLockedException,
  AccountSuspendedException,
  EmailNotVerifiedException,
} from '../../common/exceptions/auth.exceptions';

// Argon2id — OWASP recommended settings for high-value applications
const ARGON2_CONFIG: argon2.Options & { raw?: false } = {
  type:        argon2.argon2id,
  memoryCost:  65536,   // 64 MB
  timeCost:    3,
  parallelism: 4,
  hashLength:  32,
};

const CURRENT_PASSWORD_VERSION = 1;
const MAX_LOGIN_ATTEMPTS        = 10;
const LOCK_DURATION_MS          = 30 * 60_000; // 30 minutes

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Referral)
    private readonly referralRepo: Repository<Referral>,
    private readonly dataSource: DataSource,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // Creation
  // ─────────────────────────────────────────────────────────────────────────

  async createPendingUser(params: {
    email: string;
    username: string;
    password: string;
    phone: string;
    firstName?: string;
    lastName?: string;
    signupSource: SignupSource;
    wasOnWaitlist?: boolean;
    referredById?: string;
    usernameLockedUntil?: Date;
  }): Promise<User> {
    // Uniqueness — fail fast before expensive hashing
    await this.assertEmailUnique(params.email);
    await this.assertUsernameUnique(params.username);
    if (params.phone) await this.assertPhoneUnique(params.phone);

    const passwordHash = await argon2.hash(params.password, ARGON2_CONFIG);
    const referralCode = this.generateReferralCode(params.username);

    const user = this.userRepo.create({
      email:               params.email.toLowerCase().trim(),
      username:            params.username.toLowerCase().trim(),
      phone:               params.phone ?? null,
      firstName:           params.firstName ?? null,
      lastName:            params.lastName ?? null,
      passwordHash,
      passwordVersion:     CURRENT_PASSWORD_VERSION,
      status:              UserStatus.PENDING,
      tier:                UserTier.SILVER,
      signupSource:        params.signupSource,
      wasOnWaitlist:       params.wasOnWaitlist ?? false,
      referredById:        params.referredById ?? null,
      usernameLockedUntil: params.usernameLockedUntil ?? null,
      referralCode,
    });

    return this.userRepo.save(user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Authentication
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Validate identifier (email or username) + password.
   * Handles: brute-force locking, rehashing on argon2 param upgrade,
   *          user enumeration prevention via dummy hash.
   */
  async validateCredentials(identifier: string, password: string): Promise<User> {
    const normalized = identifier.toLowerCase().trim();
    const isEmail    = normalized.includes('@');

    const user = await this.userRepo.findOne({
      where: isEmail ? { email: normalized } : { username: normalized },
    });

    if (!user) {
      // Dummy hash — prevents timing-based user enumeration
      await argon2.hash('timing-safe-dummy-value', ARGON2_CONFIG);
      throw new InvalidCredentialsException();
    }

    if (user.isLocked)                           throw new AccountLockedException(user.lockedUntil!);
    if (user.status === UserStatus.SUSPENDED ||
        user.status === UserStatus.BANNED)       throw new AccountSuspendedException();
    if (!user.emailVerified)                     throw new EmailNotVerifiedException();

    const valid = await argon2.verify(user.passwordHash, password);

    if (!valid) {
      await this.incrementFailedAttempts(user);
      throw new InvalidCredentialsException();
    }

    // Reset failure counter
    if (user.loginAttempts > 0) {
      await this.userRepo.update(user.id, { loginAttempts: 0, lockedUntil: null });
    }

    // Transparent rehash — upgrades params without forcing password reset
    if (await argon2.needsRehash(user.passwordHash, ARGON2_CONFIG)) {
      const newHash = await argon2.hash(password, ARGON2_CONFIG);
      await this.userRepo.update(user.id, {
        passwordHash:    newHash,
        passwordVersion: CURRENT_PASSWORD_VERSION,
      });
      this.logger.log(`Password rehashed on login [userId=${user.id}]`);
    }

    return user;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // State mutations
  // ─────────────────────────────────────────────────────────────────────────

  async markEmailVerified(userId: string): Promise<void> {
    await this.userRepo.update(userId, {
      emailVerified:    true,
      emailVerifiedAt:  new Date(),
      status:           UserStatus.ACTIVE,
    });
  }

  async updateLastLogin(userId: string, ip?: string): Promise<void> {
    await this.userRepo.update(userId, {
      lastLoginAt: new Date(),
      lastLoginIp: ip ?? null,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Referral
  // ─────────────────────────────────────────────────────────────────────────

  async createReferralRecord(params: {
    referrerId: string;
    refereeId:  string;
    referralCode: string;
  }): Promise<void> {
    await this.referralRepo.save(
      this.referralRepo.create({
        referrerId:   params.referrerId,
        refereeId:    params.refereeId,
        referralCode: params.referralCode,
        status:       ReferralStatus.PENDING,
      }),
    );
    this.logger.log(`Referral created [referrer=${params.referrerId}] [referee=${params.refereeId}]`);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Queries
  // ─────────────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
  }

  async findByReferralCode(code: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { referralCode: code.toUpperCase() } });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────

  private async assertEmailUnique(email: string): Promise<void> {
    const exists = await this.userRepo.findOne({ where: { email: email.toLowerCase().trim() } });
    if (exists) throw new UserAlreadyExistsException('email');
  }

  private async assertUsernameUnique(username: string): Promise<void> {
    const exists = await this.userRepo.findOne({ where: { username: username.toLowerCase().trim() } });
    if (exists) throw new UserAlreadyExistsException('username');
  }

  private async assertPhoneUnique(phone: string): Promise<void> {
    const exists = await this.userRepo.findOne({ where: { phone } });
    if (exists) throw new UserAlreadyExistsException('phone');
  }

  private async incrementFailedAttempts(user: User): Promise<void> {
    const attempts = user.loginAttempts + 1;
    const lockedUntil = attempts >= MAX_LOGIN_ATTEMPTS
      ? new Date(Date.now() + LOCK_DURATION_MS)
      : null;
    await this.userRepo.update(user.id, { loginAttempts: attempts, lockedUntil });
    if (lockedUntil) {
      this.logger.warn(`Account locked [userId=${user.id}] after ${attempts} attempts`);
    }
  }

  private generateReferralCode(username: string): string {
    const prefix = username.slice(0, 4).toUpperCase().padEnd(4, 'X');
    const suffix = randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}${suffix}`;
  }
}
