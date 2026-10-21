'use client';

import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/ui';

function useBodyLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function Overlay({
  open,
  onClose,
  children,
  align = 'center',
  mobileSheet = false,
  themeStyle,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  align?: 'center' | 'end';
  mobileSheet?: boolean;
  themeStyle?: CSSProperties;
}) {
  useBodyLock(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={themeStyle}
      className={`fixed inset-0 z-[200] flex p-0 sm:p-4 ${
        align === 'end'
          ? 'justify-end'
          : mobileSheet
            ? 'items-end sm:items-center justify-center'
            : 'items-center justify-center'
      }`}
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close overlay"
        className={`absolute inset-0 bg-primary/25 backdrop-blur-sm transition-opacity duration-200`}
        onClick={onClose}
      />
      {children}
    </div>,
    document.body,
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  themeStyle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  themeStyle?: CSSProperties;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <Overlay open={open} onClose={onClose} mobileSheet themeStyle={themeStyle}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={themeStyle}
        className={`relative w-full mobile-sheet-panel ${widths[size]} bg-surface rounded-xl sm:rounded-xl shadow-[0px_4px_12px_rgba(0,0,0,0.05),0px_1px_2px_rgba(0,0,0,0.1)] border border-outline-variant/20 flex flex-col max-h-[min(90vh,720px)] outline-none`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-outline-variant/20 shrink-0">
          <div className="min-w-0 pr-1">
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-primary leading-tight">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-on-surface-variant mt-1 break-words">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full hover:bg-surface-container-low text-on-surface-variant transition-colors shrink-0 -mr-1"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
        {footer && (
          <div className="shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 pb-safe border-t border-outline-variant/20 bg-surface sm:bg-surface-container-low/30 [&_button]:w-full sm:[&_button]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </Overlay>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'lg',
  themeStyle,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: 'md' | 'lg' | 'xl';
  themeStyle?: CSSProperties;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const widths = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <Overlay open={open} onClose={onClose} align="end" themeStyle={themeStyle}>
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={themeStyle}
        className={`relative w-full max-w-full ${widths[width]} h-full max-h-[100dvh] bg-surface shadow-2xl border-l border-outline-variant/20 flex flex-col outline-none pt-safe`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-6 border-b border-outline-variant/30 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-surface-container-low rounded-full transition-colors shrink-0"
            >
              <Icon name="close" />
            </button>
            <h2 className="font-display-md text-primary truncate">{title}</h2>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="shrink-0 p-4 pb-safe border-t border-outline-variant/30 bg-surface-container-low/40 w-full">
            {footer}
          </div>
        )}
      </div>
    </Overlay>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-lg font-body-emphasis text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-body-emphasis text-on-primary transition-all active:scale-[0.98] disabled:opacity-50 ${
              destructive ? 'bg-error hover:bg-error/90' : 'bg-primary text-on-primary hover:opacity-90'
            }`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className="font-body-base text-on-surface-variant">{message}</p>
    </Modal>
  );
}
