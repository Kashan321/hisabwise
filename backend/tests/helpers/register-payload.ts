const DEFAULT_PASSWORD = 'password123';

export function registerPayload(
  overrides: {
    businessName?: string;
    businessSlug: string;
    name?: string;
    email: string;
    password?: string;
    phone?: string;
    city?: string;
    restaurantAddress?: string;
    branchNumber?: string;
  },
) {
  const slug = overrides.businessSlug;
  return {
    businessName: overrides.businessName ?? `Cafe ${slug}`,
    businessSlug: slug,
    phone: overrides.phone ?? '03009876543',
    city: overrides.city ?? 'Karachi',
    restaurantAddress: overrides.restaurantAddress ?? '123 Restaurant Street',
    branchNumber: overrides.branchNumber ?? '1',
    name: overrides.name ?? 'Owner User',
    email: overrides.email,
    password: overrides.password ?? DEFAULT_PASSWORD,
  };
}
