export interface PlatformContext {
  platformUserId: string;
  platformRole: string;
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      platformContext?: PlatformContext;
    }
  }
}

export {};
