export interface RegisterUserInput {
  businessName: string;
  businessSlug: string;
  phone: string;
  city: string;
  restaurantAddress: string;
  branchNumber: string;
  name: string;
  email: string;
  password: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface RegisterUserOutput {
  user: {
    id: string;
    name: string;
    email: string;
    businessId: string;
    businessName: string;
    businessSlug: string;
    roles: string[];
    permissions: string[];
  };
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}
