export interface UserEntity {
  id: string;
  businessId: string;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface UserWithRoles extends UserEntity {
  roles: string[];
  permissions: string[];
}
