import { HttpException, HttpStatus } from '@nestjs/common';

export class DeviceNotFoundException extends HttpException {
  constructor() {
    super(
      { code: 'DEVICE_NOT_FOUND', message: 'Device not registered' },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DeviceNotAuthorizedException extends HttpException {
  constructor() {
    super(
      {
        code: 'DEVICE_NOT_AUTHORIZED',
        message: 'This device is not authorized to perform this action',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvalidSignatureException extends HttpException {
  constructor() {
    super(
      { code: 'INVALID_SIGNATURE', message: 'Cryptographic signature verification failed' },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class RequestExpiredException extends HttpException {
  constructor() {
    super(
      { code: 'REQUEST_EXPIRED', message: 'Signed request has expired. Reconstruct and retry.' },
      HttpStatus.GONE,
    );
  }
}

export class NonceReplayException extends HttpException {
  constructor() {
    super(
      { code: 'NONCE_REPLAY', message: 'This nonce has already been used. Generate a new request.' },
      HttpStatus.CONFLICT,
    );
  }
}

export class InvalidPublicKeyException extends HttpException {
  constructor(detail?: string) {
    super(
      {
        code: 'INVALID_PUBLIC_KEY',
        message: 'The provided public key is invalid or cannot be imported',
        ...(detail && { detail }),
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class KeyRotationProofInvalidException extends HttpException {
  constructor() {
    super(
      {
        code: 'ROTATION_PROOF_INVALID',
        message: 'Key rotation proof of possession failed',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class DeviceAlreadyRegisteredException extends HttpException {
  constructor() {
    super(
      { code: 'DEVICE_ALREADY_REGISTERED', message: 'This device is already registered' },
      HttpStatus.CONFLICT,
    );
  }
}
