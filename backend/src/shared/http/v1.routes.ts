import { Router } from 'express';
import { authRouter } from '../../modules/auth/presentation/http/auth.routes';
import { businessRouter } from '../../modules/tenants/presentation/http/business.routes';
import { staffRouter } from '../../modules/staff/presentation/http/staff.routes';
import { menuRouter } from '../../modules/menu/presentation/http/menu.routes';
import { floorPlanRouter } from '../../modules/floor-plan/presentation/http/floor-plan.routes';
import { ordersRouter, deliveryRouter, riderRouter, waiterRouter } from '../../modules/orders/presentation/http/orders.routes';
import { kitchenRouter } from '../../modules/kitchen-display/presentation/http/kitchen.routes';
import { reservationsRouter } from '../../modules/reservations/presentation/http/reservations.routes';
import { customersRouter } from '../../modules/customers/presentation/http/customers.routes';
import { promotionsRouter } from '../../modules/promotions/presentation/http/promotions.routes';
import { qrRouter } from '../../modules/qr-code/presentation/http/qr.routes';
import { publicRouter } from '../../modules/qr-code/presentation/http/public.routes';
import { notificationsRouter } from '../../modules/notifications/presentation/http/notifications.routes';
import { billingRouter } from '../../modules/billing/presentation/http/billing.routes';
import { platformRouter } from '../../modules/platform-admin/presentation/http/platform.routes';
import { reportsRouter } from '../../modules/reports/presentation/http/reports.routes';
import { filesRouter } from '../../modules/files/presentation/http/files.routes';
import { auditRouter } from './audit.routes';
import { inventoryRouter } from '../../modules/inventory/presentation/http/inventory.routes';
import { cashShiftRouter } from '../../modules/cash-shift/presentation/http/cash-shift.routes';
import { businessDayRouter } from '../../modules/business-day/presentation/http/business-day.routes';
import { feedbackRouter } from '../../modules/feedback/presentation/http/feedback.routes';

export function createV1Router(): Router {
  const router = Router();

  router.use('/auth', authRouter);
  router.use('/business', businessRouter);
  router.use('/staff', staffRouter);
  router.use('/menu', menuRouter);
  router.use('/floor-plan', floorPlanRouter);
  router.use('/orders', ordersRouter);
  router.use('/waiter', waiterRouter);
  router.use('/delivery', deliveryRouter);
  router.use('/rider', riderRouter);
  router.use('/kitchen', kitchenRouter);
  router.use('/reservations', reservationsRouter);
  router.use('/customers', customersRouter);
  router.use('/promotions', promotionsRouter);
  router.use('/qr', qrRouter);
  router.use('/public', publicRouter);
  router.use('/notifications', notificationsRouter);
  router.use('/billing', billingRouter);
  router.use('/reports', reportsRouter);
  router.use('/files', filesRouter);
  router.use('/audit-logs', auditRouter);
  router.use('/inventory', inventoryRouter);
  router.use('/cash-shifts', cashShiftRouter);
  router.use('/business-days', businessDayRouter);
  router.use('/feedback', feedbackRouter);
  router.use('/platform', platformRouter);

  return router;
}
