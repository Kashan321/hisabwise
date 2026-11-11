import Link from 'next/link';

export const metadata = {
  title: 'Offline',
};

export default function OfflineFallbackPage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-surface px-6 text-center text-on-surface">
      <p className="font-display-md text-primary">You&apos;re offline</p>
      <p className="max-w-md font-body-base text-on-surface-variant">
        This page isn&apos;t available without a connection. If you were using the POS, go back to
        New Order — it should load from cache after you&apos;ve opened it once while online.
      </p>
      <Link
        href="/login"
        className="rounded-lg bg-primary px-4 py-2 font-body-emphasis text-on-primary"
      >
        Back to login
      </Link>
    </main>
  );
}
