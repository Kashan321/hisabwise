import { Request, Response } from 'express';
import { z } from 'zod';
import { reservationsModule } from '../../infrastructure/reservations.module';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import {
  availabilityQuerySchema,
  listReservationsQuerySchema,
} from './reservations.validators';

type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>;
type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;

export class ReservationsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const { date, status } = req.validatedQuery as ListReservationsQuery;
    const reservations = await reservationsModule.listReservations.execute(
      req.tenantContext!.businessId,
      date,
      status,
    );
    return success(res, { reservations });
  });

  getAvailability = asyncHandler(async (req: Request, res: Response) => {
    const { date, partySize } = req.validatedQuery as AvailabilityQuery;
    const slots = await reservationsModule.getAvailability.execute(
      req.tenantContext!.businessId,
      date,
      partySize,
    );
    return success(res, { slots });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsModule.createReservation.execute(
      req.tenantContext!.businessId,
      req.body,
    );
    return success(res, { reservation }, 201);
  });

  getById = asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsModule.getReservation.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
    );
    return success(res, { reservation });
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsModule.updateReservation.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body,
    );
    return success(res, { reservation });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const reservation = await reservationsModule.updateReservationStatus.execute(
      req.tenantContext!.businessId,
      String(req.params.id),
      req.body.status,
    );
    return success(res, { reservation });
  });
}

export const reservationsController = new ReservationsController();
