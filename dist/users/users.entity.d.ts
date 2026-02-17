export declare enum UserRole {
    SUPER_ADMIN = "super_admin",
    MERCHANT_OWNER = "merchant_owner",
    MERCHANT_ADMIN = "merchant_admin",
    MERCHANT_VIEWER = "merchant_viewer",
    DEVELOPER = "developer",
    FINANCE = "finance",
    SUPPORT = "support",
    CUSTOMER = "customer"
}
export declare enum UserStatus {
    PENDING_VERIFICATION = "pending_verification",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    BANNED = "banned",
    PENDING_APPROVAL = "pending_approval",
    LOCKED = "locked"
}
export declare enum KYCStatus {
    NOT_STARTED = "not_started",
    PENDING = "pending",
    SUBMITTED = "submitted",
    UNDER_REVIEW = "under_review",
    APPROVED = "approved",
    REJECTED = "rejected",
    RESUBMISSION_REQUIRED = "resubmission_required"
}
export declare enum TwoFactorMethod {
    NONE = "none",
    TOTP = "totp",
    SMS = "sms",
    EMAIL = "email"
}
export declare class User {
    id: string;
    email: string;
    password: string;
    fullName: string | null;
    phoneNumber: string | null;
    role: UserRole;
    status: UserStatus;
    merchantId: string | null;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationTokenExpiresAt: Date | null;
    phoneVerified: boolean;
    phoneVerificationCode: string | null;
    phoneVerificationCodeExpiresAt: Date | null;
    twoFactorMethod: TwoFactorMethod;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorBackupCodes: string[] | null;
    passwordResetToken: string | null;
    passwordResetTokenExpiresAt: Date | null;
    lastPasswordChangeAt: Date | null;
    kycStatus: KYCStatus;
    kycDocuments: {
        type: string;
        documentId: string;
        uploadedAt: Date;
        status: 'pending' | 'approved' | 'rejected';
        rejectionReason?: string;
    }[] | null;
    kycSubmittedAt: Date | null;
    kycApprovedAt: Date | null;
    kycRejectionReason: string | null;
    lastLoginAt: Date | null;
    lastLoginIp: string | null;
    lastLoginUserAgent: string | null;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    activeSessions: {
        sessionId: string;
        createdAt: Date;
        lastActivityAt: Date;
        ipAddress: string;
        userAgent: string;
        deviceId?: string;
    }[] | null;
    apiAccessEnabled: boolean;
    timezone: string;
    language: string;
    preferredCurrency: string;
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
    avatarUrl: string | null;
    dailyTransactionLimit: number | null;
    monthlyTransactionLimit: number | null;
    singleTransactionLimit: number | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    createdBy: string | null;
    updatedBy: string | null;
    createdFromIp: string | null;
    metadata: {
        referralSource?: string;
        utmParameters?: Record<string, string>;
        businessType?: string;
        companySize?: string;
        estimatedMonthlyVolume?: number;
        customFields?: Record<string, any>;
    } | null;
    get isLocked(): boolean;
    get canAccess(): boolean;
    get requires2FA(): boolean;
    get hasValidPasswordResetToken(): boolean;
    get hasValidEmailVerificationToken(): boolean;
    normalizeData(): Promise<void>;
    hashPassword(): Promise<void>;
    validatePassword(plainPassword: string): Promise<boolean>;
    incrementFailedLoginAttempts(maxAttempts?: number, lockDurationMinutes?: number): Promise<void>;
    resetFailedLoginAttempts(): void;
    updateLastLogin(ipAddress: string, userAgent: string): void;
    hasPermission(permission: string): boolean;
    toJSON(): Omit<this, "password" | "twoFactorSecret" | "twoFactorBackupCodes" | "emailVerificationToken" | "phoneVerificationCode" | "passwordResetToken" | "activeSessions" | "isLocked" | "canAccess" | "requires2FA" | "hasValidPasswordResetToken" | "hasValidEmailVerificationToken" | "normalizeData" | "hashPassword" | "validatePassword" | "incrementFailedLoginAttempts" | "resetFailedLoginAttempts" | "updateLastLogin" | "hasPermission" | "toJSON">;
}
