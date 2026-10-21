import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { success } from '../../../../shared/http/api-response';
import { demoService } from '../../infrastructure/demo.service';
import {
  createDemoRequestSchema,
  listPlatformDemoQuerySchema,
  updateDemoRequestStatusSchema,
} from './demo.validators';

type ListPlatformDemoQuery = z.infer<typeof listPlatformDemoQuerySchema>;

export class DemoController {
  getPricing = asyncHandler(async (_req: Request, res: Response) => {
    const pricing = await demoService.getPublicPricing();
    return success(res, { pricing });
  });

  getDemoConfig = asyncHandler(async (_req: Request, res: Response) => {
    const demo = await demoService.getPublicDemoConfig();
    return success(res, { demo });
  });

  createRequest = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as z.infer<typeof createDemoRequestSchema>;
    const request = await demoService.createRequest(body);
    return success(res, { request }, 201);
  });

  calendlyWebhook = asyncHandler(async (req: Request, res: Response) => {
    const request = await demoService.handleCalendlyWebhook(req.body as Record<string, unknown>);
    return success(res, { request });
  });
}

export class PlatformDemoController {
  listRequests = asyncHandler(async (req: Request, res: Response) => {
    const { status } = req.validatedQuery as ListPlatformDemoQuery;
    const requests = await demoService.listPlatformRequests({ status });
    return success(res, { requests });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const { status, adminNote } = req.body as z.infer<typeof updateDemoRequestStatusSchema>;
    const request = await demoService.updateRequestStatus(
      String(req.params.id),
      req.platformContext!.platformUserId,
      status,
      adminNote,
    );
    return success(res, { request });
  });
}

export const demoController = new DemoController();
export const platformDemoController = new PlatformDemoController();
