import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
//   TooManyRequestsException,
} from '@nestjs/common';

/**
 * User-specific exceptions
 * Using named exception classes improves:
 * - Log filtering and alerting
 * - Error handling clarity in services
 * - Consistent error codes for clients
 */

// ================================================================
// AUTH EXCEPTIONS
// ================================================================

export class UserNotFoundException extends NotFoundException {
  constructor(identifier?: string) {
    super({
      code: 'USER_NOT_FOUND',
      message: identifier
        ? `User with identifier '${identifier}' not found`
        : 'User not found',
    });
  }
}

export class EmailAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super({
      code: 'EMAIL_ALREADY_EXISTS',
      message: `An account with email '${email}' already exists`,
    });
  }
}

export class PhoneAlreadyExistsException extends ConflictException {
  constructor(phone: string) {
    super({
      code: 'PHONE_ALREADY_EXISTS',
      message: `An account with phone number '${phone}' already exists`,
    });
  }
}

export class InvalidPasswordException extends UnauthorizedException {
  constructor() {
    super({
      code: 'INVALID_PASSWORD',
      message: 'The password provided is incorrect',
    });
  }
}

export class PasswordMismatchException extends BadRequestException {
  constructor() {
    super({
      code: 'PASSWORD_MISMATCH',
      message: 'New password and confirmation do not match',
    });
  }
}

export class SamePasswordException extends BadRequestException {
  constructor() {
    super({
      code: 'SAME_PASSWORD',
      message: 'New password must be different from your current password',
    });
  }
}

// ================================================================
// ACCOUNT STATUS EXCEPTIONS
// ================================================================

export class AccountNotVerifiedException extends ForbiddenException {
  constructor() {
    super({
      code: 'ACCOUNT_NOT_VERIFIED',
      message: 'Please verify your email address before proceeding',
    });
  }
}

export class AccountSuspendedException extends ForbiddenException {
  constructor() {
    super({
      code: 'ACCOUNT_SUSPENDED',
      message: 'Your account has been suspended. Please contact support',
    });
  }
}

export class AccountBannedException extends ForbiddenException {
  constructor() {
    super({
      code: 'ACCOUNT_BANNED',
      message: 'Your account has been permanently disabled',
    });
  }
}

export class AccountLockedException extends ForbiddenException {
  constructor(lockedUntil: Date) {
    super({
      code: 'ACCOUNT_LOCKED',
      message: `Your account is locked due to too many failed attempts. Try again after ${lockedUntil.toISOString()}`,
      lockedUntil,
    });
  }
}

export class AccountPendingApprovalException extends ForbiddenException {
  constructor() {
    super({
      code: 'ACCOUNT_PENDING_APPROVAL',
      message: 'Your account is pending KYC approval. You will be notified once reviewed',
    });
  }
}

// ================================================================
// KYC EXCEPTIONS
// ================================================================

export class KYCNotApprovedException extends ForbiddenException {
  constructor() {
    super({
      code: 'KYC_NOT_APPROVED',
      message: 'KYC verification is required to perform this action',
    });
  }
}

export class KYCAlreadySubmittedException extends ConflictException {
  constructor() {
    super({
      code: 'KYC_ALREADY_SUBMITTED',
      message: 'KYC documents have already been submitted and are under review',
    });
  }
}

// ================================================================
// TOKEN EXCEPTIONS
// ================================================================

export class InvalidTokenException extends BadRequestException {
  constructor(tokenType: string) {
    super({
      code: 'INVALID_TOKEN',
      message: `The ${tokenType} token is invalid`,
    });
  }
}

export class ExpiredTokenException extends GoneException {
  constructor(tokenType: string) {
    super({
      code: 'EXPIRED_TOKEN',
      message: `The ${tokenType} token has expired. Please request a new one`,
    });
  }
}

export class TokenAlreadyUsedException extends GoneException {
  constructor(tokenType: string) {
    super({
      code: 'TOKEN_ALREADY_USED',
      message: `The ${tokenType} token has already been used`,
    });
  }
}

// ================================================================
// 2FA EXCEPTIONS
// ================================================================

export class TwoFactorAlreadyEnabledException extends ConflictException {
  constructor() {
    super({
      code: '2FA_ALREADY_ENABLED',
      message: 'Two-factor authentication is already enabled on this account',
    });
  }
}

export class TwoFactorNotEnabledException extends BadRequestException {
  constructor() {
    super({
      code: '2FA_NOT_ENABLED',
      message: 'Two-factor authentication is not enabled on this account',
    });
  }
}

export class Invalid2FACodeException extends UnauthorizedException {
  constructor() {
    super({
      code: 'INVALID_2FA_CODE',
      message: 'The two-factor authentication code is invalid or has expired',
    });
  }
}

export class InvalidBackupCodeException extends UnauthorizedException {
  constructor() {
    super({
      code: 'INVALID_BACKUP_CODE',
      message: 'The backup code provided is invalid or has already been used',
    });
  }
}

// ================================================================
// PERMISSION EXCEPTIONS
// ================================================================

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(action?: string) {
    super({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: action
        ? `You do not have permission to ${action}`
        : 'You do not have permission to perform this action',
    });
  }
}

export class CannotModifyOwnRoleException extends ForbiddenException {
  constructor() {
    super({
      code: 'CANNOT_MODIFY_OWN_ROLE',
      message: 'You cannot modify your own role',
    });
  }
}

export class CannotDeleteOwnAccountException extends ForbiddenException {
  constructor() {
    super({
      code: 'CANNOT_DELETE_OWN_ACCOUNT',
      message: 'You cannot delete your own account',
    });
  }
}

export class CrossMerchantAccessException extends ForbiddenException {
  constructor() {
    super({
      code: 'CROSS_MERCHANT_ACCESS',
      message:
        'You do not have access to resources belonging to another merchant',
    });
  }
}

// ================================================================
// INVITE EXCEPTIONS
// ================================================================

export class InvalidInviteRoleException extends BadRequestException {
  constructor(role: string) {
    super({
      code: 'INVALID_INVITE_ROLE',
      message: `Role '${role}' cannot be assigned via team invite`,
    });
  }
}

// ================================================================
// RATE LIMIT EXCEPTIONS
// ================================================================

export class VerificationEmailRateLimitException extends BadRequestException {
  constructor(retryAfterSeconds: number) {
    super({
      code: 'VERIFICATION_EMAIL_RATE_LIMITED',
      message: `Too many verification emails sent. Please wait ${retryAfterSeconds} seconds before trying again`,
      retryAfter: retryAfterSeconds,
    });
  }
}

export class PasswordResetRateLimitException extends BadRequestException {
  constructor(retryAfterSeconds: number) {
    super({
      code: 'PASSWORD_RESET_RATE_LIMITED',
      message: `Too many password reset requests. Please wait ${retryAfterSeconds} seconds before trying again`,
      retryAfter: retryAfterSeconds,
    });
  }
}
