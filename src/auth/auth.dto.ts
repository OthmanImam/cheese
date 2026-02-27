import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  IsOptional,
  IsObject,
  ValidateNested,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Password validation regex from user module
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#^])[A-Za-z\d@$!%*?&_\-#^]{8,128}$/;

const PASSWORD_RULES =
  'Must be 8–128 chars, include uppercase, lowercase, number, and special character';

// ================================================================
// STEP 1: EMAIL + PASSWORD (Initial Signup)
// ================================================================

export class SignupStep1Dto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'SecurePass@123', description: PASSWORD_RULES })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_RULES })
  password: string;

  @ApiPropertyOptional({ description: 'Device fingerprint or ID for tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class SignupStep1ResponseDto {
  @ApiProperty({ description: 'Session ID for subsequent steps' })
  sessionId: string;

  @ApiProperty({ description: 'Message confirming OTP was sent' })
  message: string;

  @ApiProperty({ description: 'When the OTP expires (ISO 8601)' })
  otpExpiresAt: string;
}

// ================================================================
// STEP 2: VERIFY OTP + CREATE WALLET
// ================================================================

export class SignupStep2Dto {
  @ApiProperty({ description: 'Session ID from step 1' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp: string;
}

export class SignupStep2ResponseDto {
  @ApiProperty({ description: 'Session ID (same as input, for chaining)' })
  sessionId: string;

  @ApiProperty({ description: 'Blockchain wallet address created for user' })
  walletAddress: string;

  @ApiProperty({ description: 'Transaction hash of wallet deployment' })
  deploymentTxHash: string;

  @ApiProperty({ description: 'Salt used for wallet creation' })
  walletSalt: string;

  @ApiProperty({ description: 'Chain ID where wallet was deployed' })
  chainId: number;

  @ApiProperty({ description: 'Message prompting passkey setup' })
  message: string;
}

// ================================================================
// STEP 3: REGISTER PASSKEY (Device Biometric)
// ================================================================

export class PasskeyRegistrationOptionsRequestDto {
  @ApiProperty({ description: 'Session ID from step 2' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class PasskeyRegistrationOptionsResponseDto {
  @ApiProperty({ description: 'Challenge to sign (base64)' })
  challenge: string;

  @ApiProperty({ description: 'Relying party info' })
  rp: {
    name: string;
    id: string;
  };

  @ApiProperty({ description: 'User info for the credential' })
  user: {
    id: string;
    name: string;
    displayName: string;
  };

  @ApiProperty({ description: 'Supported public key algorithms' })
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;

  @ApiProperty({ description: 'Timeout in milliseconds' })
  timeout: number;

  @ApiProperty({ description: 'Attestation preference' })
  attestation: string;

  @ApiPropertyOptional({ description: 'Authenticator selection criteria' })
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

export class PasskeyRegistrationDto {
  @ApiProperty({ description: 'Session ID from step 2' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ description: 'Credential ID (base64)' })
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty({ description: 'Public key (base64)' })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({ description: 'Authenticator data (base64)' })
  @IsString()
  @IsNotEmpty()
  authenticatorData: string;

  @ApiProperty({ description: 'Client data JSON (base64)' })
  @IsString()
  @IsNotEmpty()
  clientDataJSON: string;

  @ApiPropertyOptional({ description: 'Attestation object (base64)', required: false })
  @IsOptional()
  @IsString()
  attestationObject?: string;

  @ApiPropertyOptional({ description: 'Transports supported by the authenticator' })
  @IsOptional()
  @IsArray()
  transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
}

export class SignupCompleteResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Seconds until access token expires' })
  expiresIn: number;

  @ApiProperty({ description: 'User details' })
  user: {
    id: string;
    email: string;
    role: string;
    walletAddress: string;
  };

  @ApiProperty({ description: 'Success message' })
  message: string;
}

// ================================================================
// RESEND OTP
// ================================================================

export class ResendOtpDto {
  @ApiProperty({ description: 'Session ID from step 1' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

export class ResendOtpResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;

  @ApiProperty({ description: 'New OTP expiration time (ISO 8601)' })
  otpExpiresAt: string;
}

// ================================================================
// LOGIN WITH EMAIL + PASSWORD
// ================================================================

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePass@123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ description: '2FA code if 2FA is enabled' })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;

  @ApiPropertyOptional({ description: 'Device ID for session tracking' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Seconds until access token expires' })
  expiresIn: number;

  @ApiProperty({ description: 'User details' })
  user: {
    id: string;
    email: string;
    role: string;
    walletAddress?: string;
  };

  @ApiPropertyOptional({ description: 'Whether 2FA is required (if not provided in request)' })
  requires2FA?: boolean;
}

// ================================================================
// LOGIN WITH PASSKEY (Biometric)
// ================================================================

export class PasskeyAuthenticationOptionsRequestDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;
}

export class PasskeyAuthenticationOptionsResponseDto {
  @ApiProperty({ description: 'Challenge to sign (base64)' })
  challenge: string;

  @ApiProperty({ description: 'Relying party ID' })
  rpId: string;

  @ApiPropertyOptional({ description: 'Allowed credentials for this user' })
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;
    transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  }>;

  @ApiProperty({ description: 'Timeout in milliseconds' })
  timeout: number;

  @ApiProperty({ description: 'User verification requirement' })
  userVerification: string;
}

export class PasskeyAuthenticationDto {
  @ApiProperty({ description: 'Credential ID used (base64)' })
  @IsString()
  @IsNotEmpty()
  credentialId: string;

  @ApiProperty({ description: 'Authenticator data (base64)' })
  @IsString()
  @IsNotEmpty()
  authenticatorData: string;

  @ApiProperty({ description: 'Client data JSON (base64)' })
  @IsString()
  @IsNotEmpty()
  clientDataJSON: string;

  @ApiProperty({ description: 'Signature (base64)' })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({ description: 'User handle (base64, optional)' })
  @IsOptional()
  @IsString()
  userHandle?: string;
}

// ================================================================
// REFRESH TOKEN
// ================================================================

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token from login response' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class RefreshTokenResponseDto {
  @ApiProperty({ description: 'New JWT access token' })
  accessToken: string;

  @ApiProperty({ description: 'New JWT refresh token' })
  refreshToken: string;

  @ApiProperty({ description: 'Seconds until access token expires' })
  expiresIn: number;
}

// ================================================================
// LOGOUT
// ================================================================

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Logout from all devices' })
  @IsOptional()
  @IsBoolean()
  allDevices?: boolean;
}

export class LogoutResponseDto {
  @ApiProperty({ description: 'Success message' })
  message: string;
}

// ================================================================
// SESSION MANAGEMENT
// ================================================================

export class GetSessionsResponseDto {
  @ApiProperty({ description: 'List of active sessions' })
  sessions: Array<{
    sessionId: string;
    deviceInfo: {
      userAgent: string;
      ipAddress: string;
      deviceId?: string;
    };
    createdAt: string;
    lastActivityAt: string;
    isCurrent: boolean;
  }>;
}

export class RevokeSessionDto {
  @ApiProperty({ description: 'Session ID to revoke' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;
}

// ================================================================
// COMMON RESPONSES
// ================================================================

export class MessageResponseDto {
  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  data?: any;
}
