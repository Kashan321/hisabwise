'use client';

import { normalizeHexColor, isValidHexColor } from '@/lib/theme/theme-css';

type ColorFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  compact?: boolean;
};

export function ColorField({ label, value, onChange, hint, compact }: ColorFieldProps) {
  const pickerValue = isValidHexColor(value) ? value : '#62B4A7';
  const controlSize = compact ? 'w-10 h-10' : 'w-12 h-12';
  const inputHeight = compact ? 'h-10' : 'h-12';

  return (
    <div className="space-y-1">
      <label className="font-caption text-on-surface-variant block">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(normalizeHexColor(e.target.value))}
          className={`${controlSize} rounded-lg border border-outline-variant/30 bg-surface-container-lowest cursor-pointer shrink-0 p-1`}
          aria-label={`${label} color picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            if (isValidHexColor(value)) onChange(normalizeHexColor(value));
          }}
          placeholder="#62B4A7"
          className={`flex-1 ${inputHeight} px-3 bg-surface-bright border border-outline-variant/30 rounded-lg font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none`}
          spellCheck={false}
        />
        {!compact && (
          <div
            className={`${controlSize} rounded-lg border border-outline-variant/30 shrink-0`}
            style={{ backgroundColor: isValidHexColor(value) ? value : 'transparent' }}
            aria-hidden
          />
        )}
      </div>
      {hint && <p className="font-caption text-on-surface-variant">{hint}</p>}
      {value && !isValidHexColor(value) && (
        <p className="font-caption text-error">Enter a valid hex color like #62B4A7</p>
      )}
    </div>
  );
}
