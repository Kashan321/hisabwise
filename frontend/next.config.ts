import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

/**
 * When the browser calls same-origin `/api/v1/*`, forward to the Express API.
 * Set NEXT_PUBLIC_API_URL=/api/v1 and API_PROXY_TARGET=http://127.0.0.1:4000 in .env.local.
 */
const apiProxyTarget = (process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000').replace(
  /\/$/,
  '',
);

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
      {
        source: '/ws/:path*',
        destination: `${apiProxyTarget}/ws/:path*`,
      },
    ];
  },
};

export default withSerwist(nextConfig);
