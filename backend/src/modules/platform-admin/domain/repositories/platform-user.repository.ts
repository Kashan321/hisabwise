import { PlatformRole } from '@prisma/client';

export interface PlatformUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePlatformUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: PlatformRole;
}

export interface UpdatePlatformUserInput {
  name?: string;
  role?: PlatformRole;
  isActive?: boolean;
}

export interface PlatformUserRepository {
  findByEmail(email: string): Promise<PlatformUserRecord | null>;
  findById(id: string): Promise<PlatformUserRecord | null>;
  list(): Promise<PlatformUserRecord[]>;
  create(input: CreatePlatformUserInput): Promise<PlatformUserRecord>;
  update(id: string, input: UpdatePlatformUserInput): Promise<PlatformUserRecord>;
  updateLastLogin(id: string): Promise<void>;
  countByRole(role: PlatformRole): Promise<number>;
}
