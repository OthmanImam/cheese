export interface JwtAccessPayload {
  /** User UUID */
  sub: string;
  email: string;
  username: string;
  tier: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  /** User UUID */
  sub: string;
  /** RefreshToken DB record UUID — enables O(1) revocation */
  jti: string;
  iat?: number;
  exp?: number;
}
