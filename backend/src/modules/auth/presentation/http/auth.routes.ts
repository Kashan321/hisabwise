import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validateBody } from '../../../../shared/http/validate.middleware';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.validators';
import { requireAuth, requirePermission } from '../middlewares/require-auth.middleware';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' },
  },
});

export const authRouter = Router();

authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(registerSchema),
  authController.register,
);

authRouter.post('/login', authRateLimiter, validateBody(loginSchema), authController.login);

authRouter.post('/refresh', authController.refresh);

authRouter.post('/logout', authController.logout);

authRouter.get('/me', requireAuth, authController.me);

// Owner-only route used for authorization testing
authRouter.get(
  '/admin-check',
  requireAuth,
  requirePermission('business.manage'),
  (_req, res) => {
    res.json({ success: true, data: { authorized: true } });
  },
);
