import { createHash, randomBytes } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AUTH } from '../../../../config/constants';
import { env } from '../../../../config/env';
import { AppError } from '../../../../shared/errors/app-error';
import { ErrorCodes } from '../../../../shared/errors/error-codes';
import {
  AccessTokenPayload,
  PlatformAccessTokenPayload,
  TokenServicePort,
} from '../../application/ports/token-service.port';

export class JwtTokenService implements TokenServicePort {
  signAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign({ ...payload, scope: 'tenant' }, env.JWT_ACCESS_SECRET, {
      expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  signPlatformAccessToken(payload: PlatformAccessTokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: AUTH.ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        scope?: string;
        sub: string;
        businessId: string;
        roles?: string[];
        permissions?: string[];
      };

      if (payload.scope === 'platform') {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired access token', 401);
      }

      return {
        ...payload,
        scope: 'tenant',
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired access token', 401);
    }
  }

  verifyPlatformAccessToken(token: string): PlatformAccessTokenPayload {
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as PlatformAccessTokenPayload;

      if (payload.scope !== 'platform') {
        throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired access token', 401);
      }

      return {
        ...payload,
        permissions: payload.permissions ?? [],
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(ErrorCodes.UNAUTHORIZED, 'Invalid or expired access token', 401);
    }
  }

  generateRefreshToken(): { token: string; hash: string; familyId: string } {
    const token = randomBytes(48).toString('base64url');
    const familyId = uuidv4();
    return {
      token,
      hash: this.hashRefreshToken(token),
      familyId,
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiresAt(): Date {
    return new Date(Date.now() + AUTH.REFRESH_TOKEN_TTL_SECONDS * 1000);
  }
}
