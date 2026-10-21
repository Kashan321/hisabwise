import { CreateStaffInput, StaffMember, UpdateStaffInput } from '../entities/staff.entity';

export interface StaffRepository {
  findAllByBusiness(businessId: string): Promise<StaffMember[]>;
  findById(businessId: string, userId: string): Promise<StaffMember | null>;
  create(input: CreateStaffInput): Promise<StaffMember>;
  update(businessId: string, userId: string, input: UpdateStaffInput): Promise<StaffMember>;
  setActive(businessId: string, userId: string, isActive: boolean): Promise<StaffMember>;
  delete(businessId: string, userId: string): Promise<void>;
  countOwners(businessId: string): Promise<number>;
}
