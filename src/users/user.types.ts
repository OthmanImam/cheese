// import { User } from './users.entity';
import { UserRole } from './users.entity';

/**
 * Context passed down from auth guard / request interceptor
 * Contains the currently authenticated user for scoping operations
 */
export interface RequestContext {
  userId: string;
  merchantId: string | null;
  role: UserRole;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Token generation result
 */
export interface TokenResult {
  token: string;
  hashedToken: string;
  expiresAt: Date;
}

/**
 * 2FA setup result
 */
export interface TwoFactorSetupResult {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

/**
 * Audit log entry shape
 */
export interface AuditLogEntry {
  action: UserAuditAction;
  performedBy: string;        // userId who performed action
  targetUserId: string;       // userId the action was performed on
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * All auditable actions on the User domain
 */
export enum UserAuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_RESTORED = 'USER_RESTORED',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  PHONE_VERIFIED = 'PHONE_VERIFIED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  TWO_FACTOR_ENABLED = 'TWO_FACTOR_ENABLED',
  TWO_FACTOR_DISABLED = 'TWO_FACTOR_DISABLED',
  TWO_FACTOR_BACKUP_CODE_USED = 'TWO_FACTOR_BACKUP_CODE_USED',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  KYC_SUBMITTED = 'KYC_SUBMITTED',
  KYC_APPROVED = 'KYC_APPROVED',
  KYC_REJECTED = 'KYC_REJECTED',
  API_ACCESS_ENABLED = 'API_ACCESS_ENABLED',
  API_ACCESS_DISABLED = 'API_ACCESS_DISABLED',
  TRANSACTION_LIMITS_UPDATED = 'TRANSACTION_LIMITS_UPDATED',
  TEAM_MEMBER_INVITED = 'TEAM_MEMBER_INVITED',
  VERIFICATION_EMAIL_RESENT = 'VERIFICATION_EMAIL_RESENT',
}

/**
 * Events emitted by the UserService for async processing
 */
export enum UserEvent {
  USER_REGISTERED = 'user.registered',
  EMAIL_VERIFIED = 'user.email_verified',
  PHONE_VERIFIED = 'user.phone_verified',
  PASSWORD_RESET_REQUESTED = 'user.password_reset_requested',
  PASSWORD_CHANGED = 'user.password_changed',
  ACCOUNT_LOCKED = 'user.account_locked',
  TWO_FACTOR_ENABLED = 'user.two_factor_enabled',
  TWO_FACTOR_DISABLED = 'user.two_factor_disabled',
  KYC_SUBMITTED = 'user.kyc_submitted',
  KYC_STATUS_CHANGED = 'user.kyc_status_changed',
  TEAM_MEMBER_INVITED = 'user.team_member_invited',
  STATUS_CHANGED = 'user.status_changed',
}

/**
 * Roles that are only assignable internally (not via public invite)
 */
export const INTERNAL_ONLY_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.SUPPORT,
];

/**
 * Roles that belong to the merchant organization (scoped to merchantId)
 */
export const MERCHANT_SCOPED_ROLES: UserRole[] = [
  UserRole.MERCHANT_OWNER,
  UserRole.MERCHANT_ADMIN,
  UserRole.MERCHANT_VIEWER,
  UserRole.DEVELOPER,
  UserRole.FINANCE,
];

/**
 * Token expiration constants
 */
export const TOKEN_EXPIRY = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,    // 24 hours
  PASSWORD_RESET: 60 * 60 * 1000,              // 1 hour
  PHONE_VERIFICATION: 10 * 60 * 1000,          // 10 minutes
  TEAM_INVITE: 7 * 24 * 60 * 60 * 1000,       // 7 days
} as const;

/**
 * Rate limit windows
 */
export const RATE_LIMIT = {
  VERIFICATION_EMAIL_RESEND_SECONDS: 60,       // 60 seconds between resends
  PASSWORD_RESET_RESEND_SECONDS: 120,          // 2 minutes between reset requests
  MAX_FAILED_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MINUTES: 30,
} as const;
