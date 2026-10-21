'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/ui';

type ToastType = 'success' | 'error';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  const value = useMemo(
    () => ({
      success: (message: string) => push('success', message),
      error: (message: string) => push('error', message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[110] flex flex-col gap-2 pointer-events-none max-w-sm w-[min(100vw-2rem,24rem)] top-[calc(var(--app-header-height)+env(safe-area-inset-top,0px)+0.75rem)]"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.08)] border ${
              t.type === 'success'
                ? 'bg-surface border-tertiary-fixed-dim/50 text-on-surface'
                : 'bg-error-container border-error/20 text-on-error-container'
            }`}
          >
            <Icon
              name={t.type === 'success' ? 'check_circle' : 'error'}
              filled
              className={t.type === 'success' ? 'text-tertiary-container' : ''}
            />
            <span className="font-body-emphasis text-sm">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
