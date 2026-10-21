'use client';

import { useState } from 'react';

export function PasswordInput({
  label,
  hint,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="font-caption text-on-surface-variant font-bold block">{label}</label>
      )}
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={`w-full h-11 px-4 pr-11 bg-surface border border-outline-variant/30 rounded-lg font-body-base transition-all focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center justify-center w-11 text-on-surface-variant hover:text-on-surface transition-colors"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          <span className="material-symbols-outlined text-xl">
            {visible ? 'visibility_off' : 'visibility'}
          </span>
        </button>
      </div>
      {hint && <p className="font-caption text-on-surface-variant">{hint}</p>}
    </div>
  );
}
