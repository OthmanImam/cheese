import { UserRole } from './users.entity';
export interface RequestContext {
    userId: string;
    merchantId: string | null;
    role: UserRole;
    ipAddress: string;
    userAgent: string;
    sessionId?: string;
}
export interface PaginatedResult<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}
export interface TokenResult {
    token: string;
    hashedToken: string;
    expiresAt: Date;
}
export interface TwoFactorSetupResult {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
export interface AuditLogEntry {
    action: UserAuditAction;
    performedBy: string;
    targetUserId: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
    timestamp: Date;
}
export declare enum UserAuditAction {
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    USER_DELETED = "USER_DELETED",
    USER_RESTORED = "USER_RESTORED",
    EMAIL_VERIFIED = "EMAIL_VERIFIED",
    PHONE_VERIFIED = "PHONE_VERIFIED",
    PASSWORD_CHANGED = "PASSWORD_CHANGED",
    PASSWORD_RESET_REQUESTED = "PASSWORD_RESET_REQUESTED",
    PASSWORD_RESET_COMPLETED = "PASSWORD_RESET_COMPLETED",
    ROLE_CHANGED = "ROLE_CHANGED",
    STATUS_CHANGED = "STATUS_CHANGED",
    TWO_FACTOR_ENABLED = "TWO_FACTOR_ENABLED",
    TWO_FACTOR_DISABLED = "TWO_FACTOR_DISABLED",
    TWO_FACTOR_BACKUP_CODE_USED = "TWO_FACTOR_BACKUP_CODE_USED",
    LOGIN_SUCCESS = "LOGIN_SUCCESS",
    LOGIN_FAILED = "LOGIN_FAILED",
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
    ACCOUNT_UNLOCKED = "ACCOUNT_UNLOCKED",
    KYC_SUBMITTED = "KYC_SUBMITTED",
    KYC_APPROVED = "KYC_APPROVED",
    KYC_REJECTED = "KYC_REJECTED",
    API_ACCESS_ENABLED = "API_ACCESS_ENABLED",
    API_ACCESS_DISABLED = "API_ACCESS_DISABLED",
    TRANSACTION_LIMITS_UPDATED = "TRANSACTION_LIMITS_UPDATED",
    TEAM_MEMBER_INVITED = "TEAM_MEMBER_INVITED",
    VERIFICATION_EMAIL_RESENT = "VERIFICATION_EMAIL_RESENT"
}
export declare enum UserEvent {
    USER_REGISTERED = "user.registered",
    EMAIL_VERIFIED = "user.email_verified",
    PHONE_VERIFIED = "user.phone_verified",
    PASSWORD_RESET_REQUESTED = "user.password_reset_requested",
    PASSWORD_CHANGED = "user.password_changed",
    ACCOUNT_LOCKED = "user.account_locked",
    TWO_FACTOR_ENABLED = "user.two_factor_enabled",
    TWO_FACTOR_DISABLED = "user.two_factor_disabled",
    KYC_SUBMITTED = "user.kyc_submitted",
    KYC_STATUS_CHANGED = "user.kyc_status_changed",
    TEAM_MEMBER_INVITED = "user.team_member_invited",
    STATUS_CHANGED = "user.status_changed"
}
export declare const INTERNAL_ONLY_ROLES: UserRole[];
export declare const MERCHANT_SCOPED_ROLES: UserRole[];
export declare const TOKEN_EXPIRY: {
    readonly EMAIL_VERIFICATION: number;
    readonly PASSWORD_RESET: number;
    readonly PHONE_VERIFICATION: number;
    readonly TEAM_INVITE: number;
};
export declare const RATE_LIMIT: {
    readonly VERIFICATION_EMAIL_RESEND_SECONDS: 60;
    readonly PASSWORD_RESET_RESEND_SECONDS: 120;
    readonly MAX_FAILED_LOGIN_ATTEMPTS: 5;
    readonly ACCOUNT_LOCK_DURATION_MINUTES: 30;
};
