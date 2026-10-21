'use client';

import { LandingBrandLogo } from '@/components/landing/landing-brand-logo';
import { usePublicBranding } from '@/lib/hooks/use-public-branding';
import { themeToStyle } from '@/lib/theme/theme-css';
import { Spinner } from '@/components/ui';

/** Bright daytime restaurant interior */
const AUTH_BACKGROUND_IMAGE =
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2400&q=80';

export function AuthScreen({
  children,
  title,
  subtitle,
  size = 'md',
  footer,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  size?: 'md' | 'lg';
  footer?: React.ReactNode;
}) {
  const { branding, ready } = usePublicBranding();
  const maxWidth = size === 'lg' ? 'max-w-[520px]' : 'max-w-[420px]';

  if (!ready) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-100">
        <Spinner />
      </div>
    );
  }

  return (
    <div
      className="relative h-dvh w-full overflow-hidden flex flex-col items-center justify-center p-2 sm:p-6"
      style={themeToStyle(branding)}
    >
      <div className="absolute inset-0" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_BACKGROUND_IMAGE} alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-white/55 backdrop-blur-[1px]" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(135deg, ${branding.primaryColor ?? '#62B4A7'}22 0%, transparent 50%, ${branding.secondaryColor ?? '#4A9A8E'}18 100%)`,
          }}
        />
      </div>

      <div className={`relative z-10 w-full ${maxWidth} flex flex-col min-h-0 max-h-full`}>
        <div
          className="flex flex-col min-h-0 max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-3rem)] rounded-2xl border border-white/60 bg-white/95 backdrop-blur-md shadow-2xl shadow-black/10 overflow-hidden"
        >
          <div className="shrink-0 text-center px-4 pt-4 pb-3 sm:px-8 sm:pt-8 sm:pb-4 border-b border-outline-variant/10">
            <LandingBrandLogo size="md" className="mx-auto mb-3 sm:mb-5" />
            <h1 className="text-lg sm:text-2xl font-bold text-on-surface leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 sm:mt-2 leading-snug">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:px-8 sm:py-5">
            {children}
          </div>

          {footer && (
            <div className="shrink-0 px-4 py-3 sm:px-8 sm:py-4 border-t border-outline-variant/10 bg-white/80">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
