'use client';

import { useState } from 'react';
import {
  DEFAULT_BUSINESS_THEME,
  isValidHexColor,
  normalizeHexColor,
  type ThemeColors,
} from '@/lib/theme/theme-css';
import { Icon } from '@/components/ui';
import { ColorField } from './color-field';

export type ThemeEditorValue = {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
};

type ThemeEditorProps = {
  value: ThemeEditorValue;
  onChange: (value: ThemeEditorValue) => void;
  compact?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export function themeFromBusiness(colors?: ThemeColors | null): ThemeEditorValue {
  return {
    primaryColor: colors?.primaryColor ?? DEFAULT_BUSINESS_THEME.primaryColor,
    secondaryColor: colors?.secondaryColor ?? DEFAULT_BUSINESS_THEME.secondaryColor,
    backgroundColor: colors?.backgroundColor ?? DEFAULT_BUSINESS_THEME.backgroundColor,
    textColor: colors?.textColor ?? DEFAULT_BUSINESS_THEME.textColor,
  };
}

export function isThemeValid(theme: ThemeEditorValue): boolean {
  return (
    isValidHexColor(theme.primaryColor) &&
    isValidHexColor(theme.secondaryColor) &&
    isValidHexColor(theme.backgroundColor) &&
    isValidHexColor(theme.textColor)
  );
}

export function normalizeTheme(theme: ThemeEditorValue): ThemeEditorValue {
  return {
    primaryColor: normalizeHexColor(theme.primaryColor),
    secondaryColor: normalizeHexColor(theme.secondaryColor),
    backgroundColor: normalizeHexColor(theme.backgroundColor),
    textColor: normalizeHexColor(theme.textColor),
  };
}

export function ThemeEditor({
  value,
  onChange,
  compact,
  collapsible,
  defaultExpanded = true,
}: ThemeEditorProps) {
  const [expanded, setExpanded] = useState(!collapsible || defaultExpanded);

  function update<K extends keyof ThemeEditorValue>(key: K, next: string) {
    onChange({ ...value, [key]: next });
  }

  const preview = (
    <div
      className="rounded-lg border border-outline-variant/20 p-3 flex items-center gap-3"
      style={{
        background: `linear-gradient(135deg, ${value.backgroundColor} 0%, ${value.primaryColor}22 100%)`,
        color: value.textColor,
      }}
    >
      <div
        className="w-10 h-10 rounded-lg border border-outline-variant/20 shrink-0"
        style={{ backgroundColor: value.primaryColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Color preview</p>
        <p className="text-xs opacity-80">How your menu and dashboard will look</p>
      </div>
      <div
        className="w-8 h-8 rounded-full border border-outline-variant/20 shrink-0"
        style={{ backgroundColor: value.secondaryColor }}
      />
    </div>
  );

  const colorFields = (
    <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
      <ColorField
        label="Primary"
        value={value.primaryColor}
        onChange={(v) => update('primaryColor', v)}
        hint={compact ? undefined : 'Buttons, links, and key accents'}
        compact={compact}
      />
      <ColorField
        label="Secondary"
        value={value.secondaryColor}
        onChange={(v) => update('secondaryColor', v)}
        hint={compact ? undefined : 'Highlights and secondary actions'}
        compact={compact}
      />
      <ColorField
        label="Background"
        value={value.backgroundColor}
        onChange={(v) => update('backgroundColor', v)}
        hint={compact ? undefined : 'Page and card backgrounds'}
        compact={compact}
      />
      <ColorField
        label="Text"
        value={value.textColor}
        onChange={(v) => update('textColor', v)}
        hint={compact ? undefined : 'Main body text color'}
        compact={compact}
      />
    </div>
  );

  if (collapsible) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
          aria-expanded={expanded}
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm">Brand colors</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {expanded ? 'Tap to hide color options' : 'Optional — tap to customize'}
            </p>
          </div>
          <Icon
            name={expanded ? 'expand_less' : 'expand_more'}
            className="text-gray-500 shrink-0"
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {preview}
            {colorFields}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      {preview}
      {colorFields}
    </div>
  );
}
