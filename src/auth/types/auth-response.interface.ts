export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;        // access token TTL in seconds
  refreshExpiresIn: number; // refresh token TTL in seconds
}

export interface SignupResponse {
  userId: string;
  email: string;
  username: string;
  message: string;
}

export interface OtpVerifyResponse {
  userId: string;
  emailVerified: boolean;
  status: string;
}

export interface LoginResponse {
  tokens: TokenPair;
  user: {
    id: string;
    email: string;
    username: string;
    tier: string;
    status: string;
  };
}
