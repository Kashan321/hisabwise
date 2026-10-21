import { UserWithRoles } from '../entities/user.entity';

export interface CreateUserInput {
  businessId: string;
  name: string;
  email: string;
  passwordHash: string;
  roleName: string;
}

export interface UserAccountWithSlug extends UserWithRoles {
  businessSlug: string;
}

export interface UserRepository {
  findByEmail(businessId: string, email: string): Promise<UserWithRoles | null>;
  findByEmailAndSlug(email: string, businessSlug: string): Promise<UserWithRoles | null>;
  findAccountsByEmail(email: string): Promise<UserAccountWithSlug[]>;
  emailExists(email: string): Promise<boolean>;
  findById(userId: string): Promise<UserWithRoles | null>;
  createWithRole(input: CreateUserInput): Promise<UserWithRoles>;
  updateLastLogin(userId: string): Promise<void>;
}
