import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnvFile } from 'node:process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
try { loadEnvFile(path.join(root, '.env')); } catch (error) { if (error.code !== 'ENOENT') throw error; }

/** @type {import('next').NextConfig} */
export const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: root,
  turbopack: { root },
  // Worker threads disabled for Cloudflare Pages / CI compatibility (--use-bundled-ca in NODE_OPTIONS).
  experimental: {
    workerThreads: false,
    cpus: 2,
    useTypeScriptCli: false,
    // Optional in-process webpack compilation for restricted Windows hosts.
    webpackBuildWorker: process.env.VOID_SINGLE_PROCESS_BUILD === 'true' ? false : undefined,
  },
  transpilePackages: ['@void/ui', '@void/shared', '@void/design-system', '@void/backend', '@void/account', '@void/store'],
  serverExternalPackages: ['@prisma/client', '.prisma/client', 'nodemailer'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ['image/avif', 'image/webp'], remotePatterns: [] },
  async headers() {
    const production = process.env.NODE_ENV === 'production';
    return [{ source: '/(.*)', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (production ? '' : " 'unsafe-eval'") + "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'" + (production ? '' : ' ws://localhost:* http://localhost:*') + "; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';" },
      ...(production ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
    ] }];
  },
};
