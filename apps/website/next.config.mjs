import { nextConfig } from '@void/config/next';

/** @type {import('next').NextConfig} */
const websiteConfig = {
  ...nextConfig,
  experimental: {
    ...nextConfig.experimental,
    workerThreads: false,
  },
  images: {
    ...nextConfig.images,
    unoptimized: true,
  },
  async headers() {
    const defaults = await nextConfig.headers();
    return [
      ...defaults.map(rule => ({ ...rule, headers: rule.headers.map(header => header.key === 'Content-Security-Policy' ? { ...header, value: header.value.replace("frame-src 'none'", "frame-src 'self'") } : header) })),
      // Only the decorative world document can be embedded. Account/store routes retain DENY.
      { source: '/void/scene.html', headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'Content-Security-Policy', value: "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'; base-uri 'none'; object-src 'none';" },
      ] },
    ];
  },
};

export default websiteConfig;
