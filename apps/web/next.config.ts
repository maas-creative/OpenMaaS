import type { NextConfig } from 'next';
import path from 'node:path';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
const nextConfig: NextConfig = { outputFileTracingRoot: path.resolve(process.cwd(), '../..') };
export default function (phase: string): NextConfig {
  return { ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next' };
}
