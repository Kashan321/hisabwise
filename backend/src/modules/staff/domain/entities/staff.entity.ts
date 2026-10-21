export interface StaffMember {
  id: string;
  businessId: string;
  name: string;
  email: string;
  isActive: boolean;
  roles: string[];
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface CreateStaffInput {
  businessId: string;
  name: string;
  email: string;
  passwordHash: string;
  roleName: string;
}

export interface UpdateStaffInput {
  name?: string;
  roleName?: string;
  passwordHash?: string;
}
