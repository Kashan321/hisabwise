import { Request, Response } from 'express';
import { billingService } from '../../infrastructure/billing.service';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { fail } from '../../../../shared/http/api-response';
import { ForbiddenError } from '../../../auth/domain/errors/auth.errors';
import { ErrorCodes } from '../../../../shared/errors/error-codes';

export class BillingController {
  getSubscription = asyncHandler(async (req: Request, res: Response) => {
    const subscription = await billingService.getSubscription(req.tenantContext!.businessId);
    return success(res, { subscription });
  });

  getPaymentInstructions = asyncHandler(async (_req: Request, res: Response) => {
    const instructions = await billingService.getPaymentInstructions();
    return success(res, { instructions });
  });

  submitPayment = asyncHandler(async (req: Request, res: Response) => {
    try {
      const submission = await billingService.submitPayment(req.tenantContext!.businessId, req.body);
      return success(res, { submission }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('already pending')) {
        return fail(res, ErrorCodes.CONFLICT, error.message, 409);
      }
      throw error;
    }
  });

  listMySubmissions = asyncHandler(async (req: Request, res: Response) => {
    const submissions = await billingService.listMySubmissions(req.tenantContext!.businessId);
    return success(res, { submissions });
  });

  getSubscriptionInvoice = asyncHandler(async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.getSubscriptionInvoiceForTenant(
        req.tenantContext!.businessId,
        String(req.params.id),
      );
      return success(res, { invoice });
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return fail(res, ErrorCodes.NOT_FOUND, error.message, 404);
      }
      throw error;
    }
  });

  private dismissInvoiceAlertHandler = async (
    businessId: string,
    invoiceId: string,
    permissions: string[] | undefined,
  ) => {
    return billingService.dismissInvoiceAlert(businessId, invoiceId, {
      userPermissions: permissions,
    });
  };

  dismissSubscriptionInvoiceAlert = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.dismissInvoiceAlertHandler(
        req.tenantContext!.businessId,
        String(req.params.id),
        req.tenantContext!.permissions,
      );
      return success(res, result);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return fail(res, ErrorCodes.FORBIDDEN, error.message, 403);
      }
      if (error instanceof Error && error.message === 'Invoice not found') {
        return fail(res, ErrorCodes.NOT_FOUND, error.message, 404);
      }
      throw error;
    }
  });

  dismissSubscriptionInvoiceAlertByBody = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await this.dismissInvoiceAlertHandler(
        req.tenantContext!.businessId,
        req.body.invoiceId,
        req.tenantContext!.permissions,
      );
      return success(res, result);
    } catch (error) {
      if (error instanceof ForbiddenError) {
        return fail(res, ErrorCodes.FORBIDDEN, error.message, 403);
      }
      if (error instanceof Error && error.message === 'Invoice not found') {
        return fail(res, ErrorCodes.NOT_FOUND, error.message, 404);
      }
      throw error;
    }
  });

  stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
    const result = await billingService.handleStripeWebhook(
      req.body.type,
      req.body.data?.businessId,
    );
    return success(res, result);
  });
}

export const billingController = new BillingController();
