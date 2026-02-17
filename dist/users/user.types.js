"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RATE_LIMIT = exports.TOKEN_EXPIRY = exports.MERCHANT_SCOPED_ROLES = exports.INTERNAL_ONLY_ROLES = exports.UserEvent = exports.UserAuditAction = void 0;
const users_entity_1 = require("./users.entity");
var UserAuditAction;
(function (UserAuditAction) {
    UserAuditAction["USER_CREATED"] = "USER_CREATED";
    UserAuditAction["USER_UPDATED"] = "USER_UPDATED";
    UserAuditAction["USER_DELETED"] = "USER_DELETED";
    UserAuditAction["USER_RESTORED"] = "USER_RESTORED";
    UserAuditAction["EMAIL_VERIFIED"] = "EMAIL_VERIFIED";
    UserAuditAction["PHONE_VERIFIED"] = "PHONE_VERIFIED";
    UserAuditAction["PASSWORD_CHANGED"] = "PASSWORD_CHANGED";
    UserAuditAction["PASSWORD_RESET_REQUESTED"] = "PASSWORD_RESET_REQUESTED";
    UserAuditAction["PASSWORD_RESET_COMPLETED"] = "PASSWORD_RESET_COMPLETED";
    UserAuditAction["ROLE_CHANGED"] = "ROLE_CHANGED";
    UserAuditAction["STATUS_CHANGED"] = "STATUS_CHANGED";
    UserAuditAction["TWO_FACTOR_ENABLED"] = "TWO_FACTOR_ENABLED";
    UserAuditAction["TWO_FACTOR_DISABLED"] = "TWO_FACTOR_DISABLED";
    UserAuditAction["TWO_FACTOR_BACKUP_CODE_USED"] = "TWO_FACTOR_BACKUP_CODE_USED";
    UserAuditAction["LOGIN_SUCCESS"] = "LOGIN_SUCCESS";
    UserAuditAction["LOGIN_FAILED"] = "LOGIN_FAILED";
    UserAuditAction["ACCOUNT_LOCKED"] = "ACCOUNT_LOCKED";
    UserAuditAction["ACCOUNT_UNLOCKED"] = "ACCOUNT_UNLOCKED";
    UserAuditAction["KYC_SUBMITTED"] = "KYC_SUBMITTED";
    UserAuditAction["KYC_APPROVED"] = "KYC_APPROVED";
    UserAuditAction["KYC_REJECTED"] = "KYC_REJECTED";
    UserAuditAction["API_ACCESS_ENABLED"] = "API_ACCESS_ENABLED";
    UserAuditAction["API_ACCESS_DISABLED"] = "API_ACCESS_DISABLED";
    UserAuditAction["TRANSACTION_LIMITS_UPDATED"] = "TRANSACTION_LIMITS_UPDATED";
    UserAuditAction["TEAM_MEMBER_INVITED"] = "TEAM_MEMBER_INVITED";
    UserAuditAction["VERIFICATION_EMAIL_RESENT"] = "VERIFICATION_EMAIL_RESENT";
})(UserAuditAction || (exports.UserAuditAction = UserAuditAction = {}));
var UserEvent;
(function (UserEvent) {
    UserEvent["USER_REGISTERED"] = "user.registered";
    UserEvent["EMAIL_VERIFIED"] = "user.email_verified";
    UserEvent["PHONE_VERIFIED"] = "user.phone_verified";
    UserEvent["PASSWORD_RESET_REQUESTED"] = "user.password_reset_requested";
    UserEvent["PASSWORD_CHANGED"] = "user.password_changed";
    UserEvent["ACCOUNT_LOCKED"] = "user.account_locked";
    UserEvent["TWO_FACTOR_ENABLED"] = "user.two_factor_enabled";
    UserEvent["TWO_FACTOR_DISABLED"] = "user.two_factor_disabled";
    UserEvent["KYC_SUBMITTED"] = "user.kyc_submitted";
    UserEvent["KYC_STATUS_CHANGED"] = "user.kyc_status_changed";
    UserEvent["TEAM_MEMBER_INVITED"] = "user.team_member_invited";
    UserEvent["STATUS_CHANGED"] = "user.status_changed";
})(UserEvent || (exports.UserEvent = UserEvent = {}));
exports.INTERNAL_ONLY_ROLES = [
    users_entity_1.UserRole.SUPER_ADMIN,
    users_entity_1.UserRole.SUPPORT,
];
exports.MERCHANT_SCOPED_ROLES = [
    users_entity_1.UserRole.MERCHANT_OWNER,
    users_entity_1.UserRole.MERCHANT_ADMIN,
    users_entity_1.UserRole.MERCHANT_VIEWER,
    users_entity_1.UserRole.DEVELOPER,
    users_entity_1.UserRole.FINANCE,
];
exports.TOKEN_EXPIRY = {
    EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
    PASSWORD_RESET: 60 * 60 * 1000,
    PHONE_VERIFICATION: 10 * 60 * 1000,
    TEAM_INVITE: 7 * 24 * 60 * 60 * 1000,
};
exports.RATE_LIMIT = {
    VERIFICATION_EMAIL_RESEND_SECONDS: 60,
    PASSWORD_RESET_RESEND_SECONDS: 120,
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCK_DURATION_MINUTES: 30,
};
//# sourceMappingURL=user.types.js.map