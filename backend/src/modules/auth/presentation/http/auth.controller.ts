import { Request, Response } from 'express';
import { AUTH } from '../../../../config/constants';
import { API_BASE_PATH } from '../../../../shared/http/project-info';
import { authModule } from '../../infrastructure/auth.module';
import { setRefreshCookieOptions } from '../../application/use-cases/register-user.use-case';
import { success } from '../../../../shared/http/api-response';
import { asyncHandler } from '../../../../shared/http/async-handler';

function setRefreshCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(AUTH.REFRESH_COOKIE_NAME, token, setRefreshCookieOptions(expiresAt));
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(AUTH.REFRESH_COOKIE_NAME, { path: `${API_BASE_PATH}/auth` });
}

export class AuthController {
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await authModule.registerUser.execute(req.body);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    return success(
      res,
      {
        user: result.user,
        accessToken: result.accessToken,
      },
      201,
    );
  });

  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await authModule.loginUser.execute(req.body);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  refresh = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[AUTH.REFRESH_COOKIE_NAME] as string | undefined;
    const result = await authModule.refreshToken.execute(refreshToken);
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);

    return success(res, {
      user: result.user,
      accessToken: result.accessToken,
    });
  });

  logout = asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies[AUTH.REFRESH_COOKIE_NAME] as string | undefined;
    await authModule.logoutUser.execute(refreshToken);
    clearRefreshCookie(res);
    return success(res, { message: 'Logged out successfully' });
  });

  me = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.tenantContext!.userId;
    const user = await authModule.getCurrentUser.execute(userId);
    return success(res, { user });
  });
}

export const authController = new AuthController();
