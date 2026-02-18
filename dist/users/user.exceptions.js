"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordResetRateLimitException = exports.VerificationEmailRateLimitException = exports.InvalidInviteRoleException = exports.CrossMerchantAccessException = exports.CannotDeleteOwnAccountException = exports.CannotModifyOwnRoleException = exports.InsufficientPermissionsException = exports.InvalidBackupCodeException = exports.Invalid2FACodeException = exports.TwoFactorNotEnabledException = exports.TwoFactorAlreadyEnabledException = exports.TokenAlreadyUsedException = exports.ExpiredTokenException = exports.InvalidTokenException = exports.KYCAlreadySubmittedException = exports.KYCNotApprovedException = exports.AccountPendingApprovalException = exports.AccountLockedException = exports.AccountBannedException = exports.AccountSuspendedException = exports.AccountNotVerifiedException = exports.SamePasswordException = exports.PasswordMismatchException = exports.InvalidPasswordException = exports.PhoneAlreadyExistsException = exports.EmailAlreadyExistsException = exports.UserNotFoundException = void 0;
const common_1 = require("@nestjs/common");
class UserNotFoundException extends common_1.NotFoundException {
    constructor(identifier) {
        super({
            code: 'USER_NOT_FOUND',
            message: identifier
                ? `User with identifier '${identifier}' not found`
                : 'User not found',
        });
    }
}
exports.UserNotFoundException = UserNotFoundException;
class EmailAlreadyExistsException extends common_1.ConflictException {
    constructor(email) {
        super({
            code: 'EMAIL_ALREADY_EXISTS',
            message: `An account with email '${email}' already exists`,
        });
    }
}
exports.EmailAlreadyExistsException = EmailAlreadyExistsException;
class PhoneAlreadyExistsException extends common_1.ConflictException {
    constructor(phone) {
        super({
            code: 'PHONE_ALREADY_EXISTS',
            message: `An account with phone number '${phone}' already exists`,
        });
    }
}
exports.PhoneAlreadyExistsException = PhoneAlreadyExistsException;
class InvalidPasswordException extends common_1.UnauthorizedException {
    constructor() {
        super({
            code: 'INVALID_PASSWORD',
            message: 'The password provided is incorrect',
        });
    }
}
exports.InvalidPasswordException = InvalidPasswordException;
class PasswordMismatchException extends common_1.BadRequestException {
    constructor() {
        super({
            code: 'PASSWORD_MISMATCH',
            message: 'New password and confirmation do not match',
        });
    }
}
exports.PasswordMismatchException = PasswordMismatchException;
class SamePasswordException extends common_1.BadRequestException {
    constructor() {
        super({
            code: 'SAME_PASSWORD',
            message: 'New password must be different from your current password',
        });
    }
}
exports.SamePasswordException = SamePasswordException;
class AccountNotVerifiedException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'ACCOUNT_NOT_VERIFIED',
            message: 'Please verify your email address before proceeding',
        });
    }
}
exports.AccountNotVerifiedException = AccountNotVerifiedException;
class AccountSuspendedException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'ACCOUNT_SUSPENDED',
            message: 'Your account has been suspended. Please contact support',
        });
    }
}
exports.AccountSuspendedException = AccountSuspendedException;
class AccountBannedException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'ACCOUNT_BANNED',
            message: 'Your account has been permanently disabled',
        });
    }
}
exports.AccountBannedException = AccountBannedException;
class AccountLockedException extends common_1.ForbiddenException {
    constructor(lockedUntil) {
        super({
            code: 'ACCOUNT_LOCKED',
            message: `Your account is locked due to too many failed attempts. Try again after ${lockedUntil.toISOString()}`,
            lockedUntil,
        });
    }
}
exports.AccountLockedException = AccountLockedException;
class AccountPendingApprovalException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'ACCOUNT_PENDING_APPROVAL',
            message: 'Your account is pending KYC approval. You will be notified once reviewed',
        });
    }
}
exports.AccountPendingApprovalException = AccountPendingApprovalException;
class KYCNotApprovedException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'KYC_NOT_APPROVED',
            message: 'KYC verification is required to perform this action',
        });
    }
}
exports.KYCNotApprovedException = KYCNotApprovedException;
class KYCAlreadySubmittedException extends common_1.ConflictException {
    constructor() {
        super({
            code: 'KYC_ALREADY_SUBMITTED',
            message: 'KYC documents have already been submitted and are under review',
        });
    }
}
exports.KYCAlreadySubmittedException = KYCAlreadySubmittedException;
class InvalidTokenException extends common_1.BadRequestException {
    constructor(tokenType) {
        super({
            code: 'INVALID_TOKEN',
            message: `The ${tokenType} token is invalid`,
        });
    }
}
exports.InvalidTokenException = InvalidTokenException;
class ExpiredTokenException extends common_1.GoneException {
    constructor(tokenType) {
        super({
            code: 'EXPIRED_TOKEN',
            message: `The ${tokenType} token has expired. Please request a new one`,
        });
    }
}
exports.ExpiredTokenException = ExpiredTokenException;
class TokenAlreadyUsedException extends common_1.GoneException {
    constructor(tokenType) {
        super({
            code: 'TOKEN_ALREADY_USED',
            message: `The ${tokenType} token has already been used`,
        });
    }
}
exports.TokenAlreadyUsedException = TokenAlreadyUsedException;
class TwoFactorAlreadyEnabledException extends common_1.ConflictException {
    constructor() {
        super({
            code: '2FA_ALREADY_ENABLED',
            message: 'Two-factor authentication is already enabled on this account',
        });
    }
}
exports.TwoFactorAlreadyEnabledException = TwoFactorAlreadyEnabledException;
class TwoFactorNotEnabledException extends common_1.BadRequestException {
    constructor() {
        super({
            code: '2FA_NOT_ENABLED',
            message: 'Two-factor authentication is not enabled on this account',
        });
    }
}
exports.TwoFactorNotEnabledException = TwoFactorNotEnabledException;
class Invalid2FACodeException extends common_1.UnauthorizedException {
    constructor() {
        super({
            code: 'INVALID_2FA_CODE',
            message: 'The two-factor authentication code is invalid or has expired',
        });
    }
}
exports.Invalid2FACodeException = Invalid2FACodeException;
class InvalidBackupCodeException extends common_1.UnauthorizedException {
    constructor() {
        super({
            code: 'INVALID_BACKUP_CODE',
            message: 'The backup code provided is invalid or has already been used',
        });
    }
}
exports.InvalidBackupCodeException = InvalidBackupCodeException;
class InsufficientPermissionsException extends common_1.ForbiddenException {
    constructor(action) {
        super({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: action
                ? `You do not have permission to ${action}`
                : 'You do not have permission to perform this action',
        });
    }
}
exports.InsufficientPermissionsException = InsufficientPermissionsException;
class CannotModifyOwnRoleException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'CANNOT_MODIFY_OWN_ROLE',
            message: 'You cannot modify your own role',
        });
    }
}
exports.CannotModifyOwnRoleException = CannotModifyOwnRoleException;
class CannotDeleteOwnAccountException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'CANNOT_DELETE_OWN_ACCOUNT',
            message: 'You cannot delete your own account',
        });
    }
}
exports.CannotDeleteOwnAccountException = CannotDeleteOwnAccountException;
class CrossMerchantAccessException extends common_1.ForbiddenException {
    constructor() {
        super({
            code: 'CROSS_MERCHANT_ACCESS',
            message: 'You do not have access to resources belonging to another merchant',
        });
    }
}
exports.CrossMerchantAccessException = CrossMerchantAccessException;
class InvalidInviteRoleException extends common_1.BadRequestException {
    constructor(role) {
        super({
            code: 'INVALID_INVITE_ROLE',
            message: `Role '${role}' cannot be assigned via team invite`,
        });
    }
}
exports.InvalidInviteRoleException = InvalidInviteRoleException;
class VerificationEmailRateLimitException extends common_1.BadRequestException {
    constructor(retryAfterSeconds) {
        super({
            code: 'VERIFICATION_EMAIL_RATE_LIMITED',
            message: `Too many verification emails sent. Please wait ${retryAfterSeconds} seconds before trying again`,
            retryAfter: retryAfterSeconds,
        });
    }
}
exports.VerificationEmailRateLimitException = VerificationEmailRateLimitException;
class PasswordResetRateLimitException extends common_1.BadRequestException {
    constructor(retryAfterSeconds) {
        super({
            code: 'PASSWORD_RESET_RATE_LIMITED',
            message: `Too many password reset requests. Please wait ${retryAfterSeconds} seconds before trying again`,
            retryAfter: retryAfterSeconds,
        });
    }
}
exports.PasswordResetRateLimitException = PasswordResetRateLimitException;
//# sourceMappingURL=user.exceptions.js.map