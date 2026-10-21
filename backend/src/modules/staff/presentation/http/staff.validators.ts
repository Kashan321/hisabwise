import { z } from 'zod';
import { PASSWORD, ROLES } from '../../../../config/constants';

const roleEnum = z.enum([
  ROLES.OWNER,
  ROLES.MANAGER,
  ROLES.EMPLOYEE,
  ROLES.CHEF,
  ROLES.WAITER,
  ROLES.RIDER,
]);

export const createStaffSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD.MIN_LENGTH),
  roleName: roleEnum,
});

export const updateStaffSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    roleName: roleEnum.optional(),
    password: z.string().min(PASSWORD.MIN_LENGTH).optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined || data.roleName !== undefined || data.password !== undefined,
    { message: 'At least one field must be provided' },
  );

export const updateStaffStatusSchema = z.object({
  isActive: z.boolean(),
});

export type CreateStaffBody = z.infer<typeof createStaffSchema>;
export type UpdateStaffBody = z.infer<typeof updateStaffSchema>;
export type UpdateStaffStatusBody = z.infer<typeof updateStaffStatusSchema>;
