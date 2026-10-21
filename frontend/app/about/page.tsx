import type { Metadata } from 'next';
import { AboutPage } from '@/components/landing/about-page';
import { APP_NAME } from '@/lib/config';

export const metadata: Metadata = {
  title: `About ${APP_NAME}`,
  description: `Learn about ${APP_NAME} and Nasmak Labs, the team behind the platform.`,
};

export default function AboutRoute() {
  return <AboutPage />;
}
