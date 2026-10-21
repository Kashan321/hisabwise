import { z } from 'zod';
import { BRANDING } from '../../config/branding';

export const DEFAULT_BRAND_COLOR = BRANDING.defaultBrandColor;

export const DEFAULT_BUSINESS_THEME = {
  primaryColor: DEFAULT_BRAND_COLOR,
  secondaryColor: '#4A9A8E',
  backgroundColor: '#F9F9F8',
  textColor: '#1A1C1C',
} as const;

export type BusinessThemeInput = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
};

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color e.g. #62B4A7');

export const businessThemeSchema = z.object({
  primaryColor: hexColorSchema.optional(),
  secondaryColor: hexColorSchema.optional(),
  backgroundColor: hexColorSchema.optional(),
  textColor: hexColorSchema.optional(),
});

export type ResolvedBusinessTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

/** Fallback chain: explicit values → hardcoded product defaults (not platform DB). */
export function resolveBusinessTheme(input?: BusinessThemeInput | null): ResolvedBusinessTheme {
  return {
    primaryColor: input?.primaryColor ?? DEFAULT_BUSINESS_THEME.primaryColor,
    secondaryColor: input?.secondaryColor ?? DEFAULT_BUSINESS_THEME.secondaryColor,
    backgroundColor: input?.backgroundColor ?? DEFAULT_BUSINESS_THEME.backgroundColor,
    textColor: input?.textColor ?? DEFAULT_BUSINESS_THEME.textColor,
  };
}

/** Tenant display theme: per-business overrides, then platform admin settings, then product defaults. */
export function resolveBusinessThemeWithPlatform(
  business?: BusinessThemeInput | null,
  platform?: BusinessThemeInput | null,
): ResolvedBusinessTheme {
  const platformTheme = resolveBusinessTheme(platform);
  return {
    primaryColor: business?.primaryColor ?? platformTheme.primaryColor,
    secondaryColor: business?.secondaryColor ?? platformTheme.secondaryColor,
    backgroundColor: business?.backgroundColor ?? platformTheme.backgroundColor,
    textColor: business?.textColor ?? platformTheme.textColor,
  };
}

export function withResolvedBusinessTheme<T extends BusinessThemeInput>(
  business: T,
  platform: BusinessThemeInput,
): T & ResolvedBusinessTheme {
  return { ...business, ...resolveBusinessThemeWithPlatform(business, platform) };
}
