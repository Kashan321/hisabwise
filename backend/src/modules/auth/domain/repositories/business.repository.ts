export interface CreateBusinessProfile {
  phone: string;
  city: string;
  location: string;
  branchNumber: string;
}

export interface BusinessRepository {
  create(
    name: string,
    slug: string,
    profile: CreateBusinessProfile,
    theme?: {
      primaryColor?: string;
      secondaryColor?: string;
      backgroundColor?: string;
      textColor?: string;
    },
  ): Promise<{ id: string; name: string; slug: string }>;
  slugExists(slug: string): Promise<boolean>;
  isSuspended(businessId: string): Promise<boolean>;
  findSlugById(businessId: string): Promise<string | null>;
}
