import { Request, Response } from 'express';
import { AUTH } from '../../../../config/constants';
import { API_BASE_PATH } from '../../../../shared/http/project-info';
import { PLATFORM_AUTH } from '../../../../config/platform.constants';
import { asyncHandler } from '../../../../shared/http/async-handler';
import { fail, success } from '../../../../shared/http/api-response';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import { billingService } from '../../../billing/infrastructure/billing.service';
import { platformSettingsRepository } from '../../infrastructure/platform-settings.repository';
import { platformAdminModule } from '../../infrastructure/platform-admin.module';

function setPlatformRefreshCookieOptions(expiresAt: Date) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    expires: expiresAt,
    path: `${API_BASE_PATH}/platform/auth`,
    maxAge: AUTH.REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
}

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(
    PLATFORM_AUTH.REFRESH_COOKIE_NAME,
    token,
    setPlatformRefreshCookieOptions(expiresAt),
  );
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(PLATFORM_AUTH.REFRESH_COOKIE_NAME, {
    path: `${API_BASE_PATH}/platform/auth`,
  });
}

export class PlatformAuthController {
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await platformAdminModule.loginPlatformUser.execute(req.body);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[PLATFORM_AUTH.REFRESH_COOKIE_NAME] as string | undefined;
    const result = await platformAdminModule.refreshPlatformToken.execute(refreshToken);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[PLATFORM_AUTH.REFRESH_COOKIE_NAME] as string | undefined;
    await platformAdminModule.logoutPlatformUser.execute(refreshToken);
    clearRefreshCookie(res);
    return success(res, { message: 'Logged out successfully' });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const user = await platformAdminModule.getCurrentPlatformUser.execute(
      req.platformContext!.platformUserId,
    );
    return success(res, { user });
  });
}

export class PlatformBusinessController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const businesses = await platformAdminModule.listBusinesses.execute();
    return success(res, { businesses });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.createBusiness.execute(
      req.platformContext!.platformUserId,
      req.body,
    );
    return success(res, { business }, 201);
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.getBusiness.execute(String(req.params.id));
    return success(res, { business });
  });

  updateSubscription = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.updateBusinessSubscription.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
      req.body.subscriptionStatus,
    );
    return success(res, { business });
  });

  suspend = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.suspendBusiness.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
    );
    return success(res, { business });
  });

  reactivate = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.reactivateBusiness.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
    );
    return success(res, { business });
  });

  blockSubscription = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.blockBusinessSubscription.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
    );
    return success(res, { business });
  });

  unblockSubscription = asyncHandler(async (req: Request, res: Response) => {
    const business = await platformAdminModule.unblockBusinessSubscription.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
    );
    return success(res, { business });
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    await platformAdminModule.deleteBusiness.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
    );
    return success(res, { message: 'Business deleted' });
  });
}

export class PlatformAdminManagementController {
  list = asyncHandler(async (_req: Request, res: Response) => {
    const admins = await platformAdminModule.listPlatformAdmins.execute();
    return success(res, { admins });
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    const admin = await platformAdminModule.createPlatformAdmin.execute(
      req.platformContext!.platformUserId,
      req.body,
    );
    return success(res, { admin }, 201);
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    const admin = await platformAdminModule.updatePlatformAdmin.execute(
      req.platformContext!.platformUserId,
      String(req.params.id),
      req.body,
    );
    return success(res, { admin });
  });
}

export class PlatformMetricsController {
  get = asyncHandler(async (_req: Request, res: Response) => {
    const metrics = await platformAdminModule.getPlatformMetrics.execute();
    return success(res, { metrics });
  });

  auditLogs = asyncHandler(async (req: Request, res: Response) => {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = await platformAdminModule.listAuditLogs.execute(limit);
    return success(res, { logs });
  });
}

export class PlatformTenantAnalyticsController {
  list = asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as { from: string; to: string };
    const tenants = await platformAdminModule.listTenantAnalytics.execute(from, to);
    return success(res, { tenants, period: { from, to } });
  });

  detail = asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as { from: string; to: string };
    const detail = await platformAdminModule.getTenantAnalyticsDetail.execute(
      String(req.params.businessId),
      from,
      to,
    );
    return success(res, detail);
  });
}

export class PlatformBillingController {
  getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await billingService.getBillingSettings();
    return success(res, { settings });
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const settings = await billingService.updateBillingSettings(req.body);
    return success(res, { settings });
  });

  listPayments = asyncHandler(async (req: Request, res: Response) => {
    const businessId = req.query.businessId ? String(req.query.businessId) : undefined;
    const status = req.query.status
      ? (String(req.query.status) as 'PENDING' | 'APPROVED' | 'REJECTED')
      : undefined;
    const submissions = await billingService.listPaymentSubmissions({ businessId, status });
    return success(res, { submissions });
  });

  approvePayment = asyncHandler(async (req: Request, res: Response) => {
    const submission = await billingService.reviewPaymentSubmission(
      String(req.params.id),
      req.platformContext!.platformUserId,
      'approve',
      req.body.adminNote,
    );
    return success(res, { submission });
  });

  rejectPayment = asyncHandler(async (req: Request, res: Response) => {
    const submission = await billingService.reviewPaymentSubmission(
      String(req.params.id),
      req.platformContext!.platformUserId,
      'reject',
      req.body.adminNote,
    );
    return success(res, { submission });
  });

  setTrialDays = asyncHandler(async (req: Request, res: Response) => {
    const business = await billingService.setBusinessTrialDays(
      String(req.params.id),
      req.body.trialDays,
    );
    return success(res, { business });
  });

  sendSubscriptionInvoice = asyncHandler(async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.sendSubscriptionInvoice(
        String(req.params.id),
        req.platformContext!.platformUserId,
        req.body,
      );
      return success(res, { invoice }, 201);
    } catch (error) {
      if (error instanceof Error && error.message.includes('amount')) {
        return fail(res, ErrorCodes.VALIDATION_ERROR, error.message, 400);
      }
      throw error;
    }
  });

  sendPurchaseReceipt = asyncHandler(async (req: Request, res: Response) => {
    try {
      const invoice = await billingService.sendPurchaseReceipt(
        String(req.params.id),
        req.platformContext!.platformUserId,
        req.body,
      );
      return success(res, { invoice }, 201);
    } catch (error) {
      if (error instanceof Error) {
        return fail(res, ErrorCodes.VALIDATION_ERROR, error.message, 400);
      }
      throw error;
    }
  });

  listBusinessSubscriptionInvoices = asyncHandler(async (req: Request, res: Response) => {
    const invoices = await billingService.listSubscriptionInvoicesForBusiness(String(req.params.id));
    return success(res, { invoices });
  });

  dismissBusinessSubscriptionInvoiceAlert = asyncHandler(async (req: Request, res: Response) => {
    try {
      const result = await billingService.dismissInvoiceAlert(
        String(req.params.id),
        String(req.params.invoiceId),
      );
      return success(res, result);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invoice not found') {
        return fail(res, ErrorCodes.NOT_FOUND, error.message, 404);
      }
      throw error;
    }
  });
}

export class PlatformSettingsController {
  getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await platformSettingsRepository.getOrCreate();
    return success(res, { settings });
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    const body = req.body as {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
      calendlyUrl?: string | null;
    };
    const settings = await platformSettingsRepository.update({
      ...body,
      calendlyUrl:
        body.calendlyUrl === '' || body.calendlyUrl === undefined
          ? body.calendlyUrl === ''
            ? null
            : undefined
          : body.calendlyUrl,
    });
    return success(res, { settings });
  });
}

export const platformAuthController = new PlatformAuthController();
export const platformBusinessController = new PlatformBusinessController();
export const platformAdminManagementController = new PlatformAdminManagementController();
export const platformMetricsController = new PlatformMetricsController();
export const platformTenantAnalyticsController = new PlatformTenantAnalyticsController();
export const platformBillingController = new PlatformBillingController();
export const platformSettingsController = new PlatformSettingsController();
