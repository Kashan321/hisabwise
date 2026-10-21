import Image from 'next/image';
import Link from 'next/link';

/** Public marketing + auth entry (login/register). Tenant `[slug]` app uses API branding. */
export const LANDING_LOGO_SRC = '/logo/hisab-wise-black-logo.png';
export const LANDING_BRAND_NAME = 'Hisab Wise';

const SIZE = {
  sm: { className: 'h-7 w-auto', width: 140, height: 32 },
  md: { className: 'h-8 sm:h-9 w-auto', width: 168, height: 40 },
  lg: { className: 'h-10 sm:h-11 w-auto', width: 200, height: 48 },
} as const;

export function LandingBrandLogo({
  size = 'md',
  href = '/',
  className = '',
}: {
  size?: keyof typeof SIZE;
  href?: string;
  className?: string;
}) {
  const dim = SIZE[size];
  return (
    <Link href={href} className={`inline-flex items-center shrink-0 ${className}`}>
      <Image
        src={LANDING_LOGO_SRC}
        alt={LANDING_BRAND_NAME}
        width={dim.width}
        height={dim.height}
        className={`object-contain object-left ${dim.className}`}
        priority={size !== 'sm'}
      />
    </Link>
  );
}
