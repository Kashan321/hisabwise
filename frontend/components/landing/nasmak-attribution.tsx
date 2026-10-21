import Image from 'next/image';
import Link from 'next/link';
import { LANDING_BRAND_NAME } from './landing-brand-logo';

const NASMAK_URL = 'https://www.nasmaklabs.com';

type NasmakAttributionProps = {
  className?: string;
  /** Inline row for footer sub-bar; default is stacked text + logo */
  variant?: 'stacked' | 'footer-inline';
};

export function NasmakAttribution({ className = '', variant = 'stacked' }: NasmakAttributionProps) {
  if (variant === 'footer-inline') {
    return (
      <p
        className={`inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm sm:text-base text-[var(--landing-text-muted)] ${className}`}
      >
        <Link
          href="/"
          className="font-semibold text-[var(--landing-text)] hover:underline underline-offset-2"
        >
          {LANDING_BRAND_NAME}
        </Link>
        <span>a product of</span>
        <a
          href={NASMAK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          aria-label="Nasmak Labs"
        >
          <Image
            src="/landing/nasmak-logo.webp"
            alt=""
            width={160}
            height={44}
            className="h-7 sm:h-8 w-auto object-contain"
            aria-hidden
          />
        </a>
      </p>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <p className="text-xs text-[var(--landing-text-dim)]">
        A product of{' '}
        <a
          href={NASMAK_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[var(--landing-text-muted)] hover:text-[var(--landing-text)] underline-offset-2 hover:underline"
        >
          Nasmak Labs
        </a>
      </p>
      <a
        href={NASMAK_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center opacity-90 hover:opacity-100 transition-opacity w-fit"
        aria-label="Nasmak Labs"
      >
        <Image
          src="/landing/nasmak-logo.webp"
          alt="Nasmak Labs"
          width={140}
          height={36}
          className="h-8 w-auto object-contain"
        />
      </a>
    </div>
  );
}
