import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCredentialsException extends HttpException {
  constructor() {
    super(
      { code: 'INVALID_CREDENTIALS', message: 'Email/username or password is incorrect' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class AccountLockedException extends HttpException {
  constructor(lockedUntil: Date) {
    super(
      { code: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Account is temporarily locked.', lockedUntil },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class EmailNotVerifiedException extends HttpException {
  constructor() {
    super(
      { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before logging in' },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidOtpException extends HttpException {
  constructor(attemptsRemaining?: number) {
    super(
      {
        code: 'INVALID_OTP',
        message: 'The code is incorrect or has expired',
        ...(attemptsRemaining !== undefined && { attemptsRemaining }),
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class OtpExhaustedException extends HttpException {
  constructor() {
    super(
      { code: 'OTP_EXHAUSTED', message: 'Maximum verification attempts exceeded. Request a new code.' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class InvalidWaitlistTokenException extends HttpException {
  constructor() {
    super(
      { code: 'INVALID_WAITLIST_TOKEN', message: 'This signup link is invalid or has expired' },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class UserAlreadyExistsException extends HttpException {
  constructor(field: 'email' | 'username' | 'phone') {
    super(
      { code: 'USER_ALREADY_EXISTS', message: `An account with this ${field} already exists`, field },
      HttpStatus.CONFLICT,
    );
  }
}

export class AccountSuspendedException extends HttpException {
  constructor() {
    super(
      { code: 'ACCOUNT_SUSPENDED', message: 'Your account has been suspended. Contact support.' },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class TokenExpiredException extends HttpException {
  constructor() {
    super(
      { code: 'TOKEN_EXPIRED', message: 'Session has expired. Please log in again.' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RefreshTokenReplayException extends HttpException {
  constructor() {
    super(
      {
        code: 'TOKEN_REUSE_DETECTED',
        message: 'Security alert: Token reuse detected. All sessions have been revoked.',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}
