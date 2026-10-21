import { Poppins } from 'next/font/google';
import { MicrosoftClarity } from '@/components/analytics/microsoft-clarity';
import { APP_NAME, APP_TAGLINE } from '@/lib/config';
import { Providers } from './providers';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: APP_NAME,
  description: APP_TAGLINE,
  icons: {
    icon: [{ url: '/logo/favicon.jpg', type: 'image/jpeg' }],
    shortcut: '/logo/favicon.jpg',
    apple: '/logo/favicon.jpg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-on-surface font-body-base font-sans">
        <MicrosoftClarity />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
