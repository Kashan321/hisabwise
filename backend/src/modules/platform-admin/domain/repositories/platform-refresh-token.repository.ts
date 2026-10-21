export interface PlatformRefreshTokenRecord {
  id: string;
  platformUserId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface PlatformRefreshTokenRepository {
  create(input: {
    platformUserId: string;
    tokenHash: string;
    familyId: string;
    expiresAt: Date;
  }): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<PlatformRefreshTokenRecord | null>;
  revokeById(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
}
