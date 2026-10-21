import { Request, Response } from 'express';
import { staffModule } from '../../infrastructure/staff.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

export class StaffController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const staff = await staffModule.listStaff.execute(req.tenantContext!.businessId);
    return success(res, { staff });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const member = await staffModule.createStaff.execute({
      businessId: req.tenantContext!.businessId,
      actorRoles: req.tenantContext!.roles,
      ...req.body,
    });
    return success(res, { staff: member }, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const member = await staffModule.updateStaff.execute({
      businessId: req.tenantContext!.businessId,
      actorId: req.tenantContext!.userId,
      actorRoles: req.tenantContext!.roles,
      staffId: String(req.params.id),
      ...req.body,
    });
    return success(res, { staff: member });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const member = await staffModule.updateStaffStatus.execute({
      businessId: req.tenantContext!.businessId,
      actorId: req.tenantContext!.userId,
      staffId: String(req.params.id),
      isActive: req.body.isActive,
    });
    return success(res, { staff: member });
  });

  delete = asyncHandler(async (req: Request, res: Response) => {
    await staffModule.deleteStaff.execute({
      businessId: req.tenantContext!.businessId,
      actorId: req.tenantContext!.userId,
      staffId: String(req.params.id),
    });
    return success(res, { deleted: true });
  });
}

export const staffController = new StaffController();
