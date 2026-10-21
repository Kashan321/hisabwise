import type { CSSProperties } from 'react';
import { BRANDING } from '@/lib/config';

export const DEFAULT_BRAND_COLOR = BRANDING.defaultBrandColor;

export const DEFAULT_BUSINESS_THEME = {
  primaryColor: DEFAULT_BRAND_COLOR,
  secondaryColor: '#4A9A8E',
  backgroundColor: '#F9F9F8',
  textColor: '#1A1C1C',
} as const;

export type ThemeColors = {
  primaryColor?: string | null;
  secondaryColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
};

export type ResolvedTheme = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(hex1: string, hex2: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const w = weight;
  return rgbToHex(r1 * (1 - w) + r2 * w, g1 * (1 - w) + g2 * w, b1 * (1 - w) + b2 * w);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function onColor(bg: string): string {
  return luminance(bg) > 0.5 ? '#1A1C1C' : '#FFFFFF';
}

export function resolveTheme(colors?: ThemeColors | null): ResolvedTheme {
  return {
    primaryColor: colors?.primaryColor ?? DEFAULT_BUSINESS_THEME.primaryColor,
    secondaryColor: colors?.secondaryColor ?? DEFAULT_BUSINESS_THEME.secondaryColor,
    backgroundColor: colors?.backgroundColor ?? DEFAULT_BUSINESS_THEME.backgroundColor,
    textColor: colors?.textColor ?? DEFAULT_BUSINESS_THEME.textColor,
  };
}

/** Kitchen display board — derives accent colors from tenant theme. */
export function kitchenBoardThemeStyle(colors?: ThemeColors | null): CSSProperties {
  const theme = resolveTheme(colors);
  const primary = theme.primaryColor;
  const secondary = theme.secondaryColor;
  const background = theme.backgroundColor;

  return {
    ...themeToStyle(colors),
    '--kds-primary': primary,
    '--kds-secondary': secondary,
    '--kds-primary-soft': mix(primary, '#FFFFFF', 0.9),
    '--kds-primary-muted': mix(primary, '#FFFFFF', 0.82),
    '--kds-primary-border': mix(primary, '#FFFFFF', 0.62),
    '--kds-primary-dark': mix(primary, '#000000', 0.18),
    '--kds-secondary-soft': mix(secondary, '#FFFFFF', 0.9),
    '--kds-secondary-muted': mix(secondary, '#FFFFFF', 0.82),
    '--kds-secondary-border': mix(secondary, '#FFFFFF', 0.62),
    '--kds-secondary-dark': mix(secondary, '#000000', 0.18),
    '--kds-surface': mix(background, '#F3F5F7', 0.35),
    '--kds-on-primary': onColor(primary),
    '--kds-on-secondary': onColor(secondary),
  } as CSSProperties;
}

export function themeToStyle(colors?: ThemeColors | null): CSSProperties {
  const theme = resolveTheme(colors);
  const primary = theme.primaryColor;
  const secondary = theme.secondaryColor;
  const background = theme.backgroundColor;
  const text = theme.textColor;

  return {
    '--primary': primary,
    '--on-primary': onColor(primary),
    '--primary-container': mix(primary, '#FFFFFF', 0.85),
    '--on-primary-container': mix(primary, '#000000', 0.55),
    '--secondary': secondary,
    '--on-secondary': onColor(secondary),
    '--secondary-container': mix(secondary, '#FFFFFF', 0.8),
    '--on-secondary-container': mix(secondary, '#000000', 0.55),
    '--background': background,
    '--on-background': text,
    '--surface': background,
    '--on-surface': text,
    '--surface-bright': background,
    '--surface-container-lowest': '#FFFFFF',
    '--surface-container-low': mix(background, '#FFFFFF', 0.5),
    '--surface-container': mix(background, '#FFFFFF', 0.35),
  } as CSSProperties;
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function normalizeHexColor(value: string): string {
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) return `#${trimmed.toUpperCase()}`;
  return trimmed;
}
