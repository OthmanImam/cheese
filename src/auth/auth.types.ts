import { UserRole } from '../users/users.entity';

/**
 * JWT Payload Structure
 * 
 * Encoded in the access token and refresh token.
 * Keep this minimal to reduce token size.
 */
export interface JwtPayload {
  userId: string;
  merchantId: string | null;
  role: UserRole;
  sessionId: string;
  iat: number; // Issued at (unix timestamp)
  exp: number; // Expires at (unix timestamp)
}

/**
 * Token pair returned after successful authentication
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // Seconds until accessToken expires
}

/**
 * Passkey credential from WebAuthn
 * 
 * Returned by the browser's navigator.credentials.create() API.
 * This is what we store in the database.
 */
export interface PasskeyCredential {
  credentialId: string; // Base64-encoded credential ID
  publicKey: string;    // Base64-encoded public key
  counter: number;      // Signature counter (for replay protection)
  transports?: ('usb' | 'nfc' | 'ble' | 'internal')[]; // How device connects
  aaguid?: string;      // Authenticator AAGUID
}

/**
 * Passkey challenge session stored in Redis
 * 
 * When initiating passkey registration or authentication,
 * we generate a challenge and store it temporarily.
 */
export interface PasskeyChallenge {
  challenge: string;    // Random challenge bytes (base64)
  userId: string;       // Who this challenge is for
  createdAt: number;    // Unix timestamp
  type: 'registration' | 'authentication';
}

/**
 * Wallet creation result from smart contract
 * 
 * Returned by the custodial wallet contract after creating
 * a new wallet for the user.
 */
export interface WalletCreationResult {
  walletAddress: string;        // EVM address of the wallet
  deploymentTxHash: string;     // Transaction hash of deployment
  walletSalt: string;           // Salt used for deterministic deployment
  chainId: number;              // Which chain the wallet is on
  contractVersion: string;      // Version of the wallet contract
}

/**
 * Signup flow state stored in Redis
 * 
 * Multi-step signup requires maintaining state between steps.
 * This is the shape of data we store in Redis during signup.
 */
export interface SignupSession {
  email: string;
  passwordHash: string;         // Bcrypt hash
  otpHash: string;              // SHA256 hash of the OTP code
  otpExpiresAt: number;         // Unix timestamp
  walletCreationResult?: WalletCreationResult; // Set after step 2
  createdAt: number;            // Unix timestamp
  ipAddress: string;
  userAgent: string;
}

/**
 * Login attempt tracking for rate limiting
 */
export interface LoginAttempt {
  email: string;
  ipAddress: string;
  timestamp: number;
  success: boolean;
  failureReason?: string;
}

/**
 * Session metadata stored alongside JWT in Redis
 */
export interface SessionMetadata {
  userId: string;
  sessionId: string;
  deviceInfo: {
    userAgent: string;
    ipAddress: string;
    deviceId?: string;
  };
  createdAt: number;
  lastActivityAt: number;
  expiresAt: number;
}

/**
 * Passkey registration options
 * Sent to the frontend for navigator.credentials.create()
 */
export interface PasskeyRegistrationOptions {
  challenge: string;            // Base64-encoded random challenge
  rp: {
    name: string;               // "Cheese"
    id: string;                 // "cheese.app" (your domain)
  };
  user: {
    id: string;                 // User ID (base64)
    name: string;               // User email
    displayName: string;        // User full name or email
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;                // -7 (ES256) or -257 (RS256)
  }>;
  timeout?: number;             // Milliseconds (default 60000)
  attestation?: 'none' | 'direct' | 'indirect';
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
}

/**
 * Passkey authentication options
 * Sent to the frontend for navigator.credentials.get()
 */
export interface PasskeyAuthenticationOptions {
  challenge: string;
  rpId: string;
  allowCredentials?: Array<{
    type: 'public-key';
    id: string;                 // Base64-encoded credential ID
    transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  }>;
  timeout?: number;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

/**
 * Constants for session and token management
 */
export const AUTH_CONSTANTS = {
  // Token lifetimes
  ACCESS_TOKEN_EXPIRES_IN: 15 * 60,           // 15 minutes
  REFRESH_TOKEN_EXPIRES_IN: 7 * 24 * 60 * 60, // 7 days
  
  // OTP settings
  OTP_LENGTH: 6,
  OTP_EXPIRES_IN: 10 * 60 * 1000,             // 10 minutes in milliseconds
  OTP_RESEND_COOLDOWN: 60,                    // 60 seconds
  
  // Passkey settings
  PASSKEY_CHALLENGE_EXPIRES_IN: 5 * 60,       // 5 minutes
  PASSKEY_TIMEOUT: 60000,                     // 60 seconds for user interaction
  
  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_LOCKOUT_DURATION: 15 * 60,            // 15 minutes
  
  // Session management
  MAX_SESSIONS_PER_USER: 5,                   // Max concurrent sessions
  
  // Signup session
  SIGNUP_SESSION_EXPIRES_IN: 30 * 60,         // 30 minutes
} as const;

/**
 * Supported passkey algorithms
 * -7 = ES256 (ECDSA with SHA-256)
 * -257 = RS256 (RSASSA-PKCS1-v1_5 with SHA-256)
 */
export const SUPPORTED_PASSKEY_ALGORITHMS = [-7, -257] as const;

/**
 * WebAuthn relying party info
 * Update these with your actual domain
 */
export const RELYING_PARTY = {
  name: 'Cheese',
  id: process.env.RP_ID || 'localhost',       // Your domain (e.g., 'cheese.app')
  origin: process.env.RP_ORIGIN || 'http://localhost:3000',
} as const;
