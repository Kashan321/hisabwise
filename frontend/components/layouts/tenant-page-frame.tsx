import type { ReactNode } from 'react';

/** Wraps standard tenant page content in a visible elevated frame. */
export function TenantPageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="tenant-page-frame w-full">
      <div className="tenant-page-accent" aria-hidden />
      <div className="tenant-page-body">{children}</div>
    </div>
  );
}
