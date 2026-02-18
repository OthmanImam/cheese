import { BadRequestException, ConflictException, ForbiddenException, GoneException, NotFoundException, UnauthorizedException } from '@nestjs/common';
export declare class UserNotFoundException extends NotFoundException {
    constructor(identifier?: string);
}
export declare class EmailAlreadyExistsException extends ConflictException {
    constructor(email: string);
}
export declare class PhoneAlreadyExistsException extends ConflictException {
    constructor(phone: string);
}
export declare class InvalidPasswordException extends UnauthorizedException {
    constructor();
}
export declare class PasswordMismatchException extends BadRequestException {
    constructor();
}
export declare class SamePasswordException extends BadRequestException {
    constructor();
}
export declare class AccountNotVerifiedException extends ForbiddenException {
    constructor();
}
export declare class AccountSuspendedException extends ForbiddenException {
    constructor();
}
export declare class AccountBannedException extends ForbiddenException {
    constructor();
}
export declare class AccountLockedException extends ForbiddenException {
    constructor(lockedUntil: Date);
}
export declare class AccountPendingApprovalException extends ForbiddenException {
    constructor();
}
export declare class KYCNotApprovedException extends ForbiddenException {
    constructor();
}
export declare class KYCAlreadySubmittedException extends ConflictException {
    constructor();
}
export declare class InvalidTokenException extends BadRequestException {
    constructor(tokenType: string);
}
export declare class ExpiredTokenException extends GoneException {
    constructor(tokenType: string);
}
export declare class TokenAlreadyUsedException extends GoneException {
    constructor(tokenType: string);
}
export declare class TwoFactorAlreadyEnabledException extends ConflictException {
    constructor();
}
export declare class TwoFactorNotEnabledException extends BadRequestException {
    constructor();
}
export declare class Invalid2FACodeException extends UnauthorizedException {
    constructor();
}
export declare class InvalidBackupCodeException extends UnauthorizedException {
    constructor();
}
export declare class InsufficientPermissionsException extends ForbiddenException {
    constructor(action?: string);
}
export declare class CannotModifyOwnRoleException extends ForbiddenException {
    constructor();
}
export declare class CannotDeleteOwnAccountException extends ForbiddenException {
    constructor();
}
export declare class CrossMerchantAccessException extends ForbiddenException {
    constructor();
}
export declare class InvalidInviteRoleException extends BadRequestException {
    constructor(role: string);
}
export declare class VerificationEmailRateLimitException extends BadRequestException {
    constructor(retryAfterSeconds: number);
}
export declare class PasswordResetRateLimitException extends BadRequestException {
    constructor(retryAfterSeconds: number);
}
