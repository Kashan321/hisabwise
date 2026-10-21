export interface AccessTokenPayload {
  scope?: 'tenant';
  sub: string;
  businessId: string;
  roles: string[];
  permissions: string[];
}

export interface PlatformAccessTokenPayload {
  scope: 'platform';
  sub: string;
  platformRole: string;
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  familyId: string;
}

export interface TokenServicePort {
  signAccessToken(payload: AccessTokenPayload): string;
  signPlatformAccessToken(payload: PlatformAccessTokenPayload): string;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyPlatformAccessToken(token: string): PlatformAccessTokenPayload;
  generateRefreshToken(): { token: string; hash: string; familyId: string };
  hashRefreshToken(token: string): string;
  getRefreshTokenExpiresAt(): Date;
}
