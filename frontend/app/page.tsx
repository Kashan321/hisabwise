import { LandingPage } from '@/components/landing/landing-page';
import { fetchPublicBranding } from '@/lib/api/public-branding';

export default async function HomePage() {
  const branding = await fetchPublicBranding();

  return <LandingPage branding={branding} />;
}
