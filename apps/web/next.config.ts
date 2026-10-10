import type { NextConfig } from 'next';
import path from 'node:path';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  devIndicators: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
        ],
      },
    ];
  },
};
export default function (phase: string): NextConfig {
  return { ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next' };
}
