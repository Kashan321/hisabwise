export interface LoginUserInput {
  businessSlug?: string;
  email: string;
  password: string;
}

export interface AuthUserOutput {
  user: {
    id: string;
    name: string;
    email: string;
    businessId: string;
    businessSlug: string;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
