import { nextConfig } from '@void/config/next';

/** @type {import('next').NextConfig} */
const websiteConfig = {
  ...nextConfig,
  output: 'export',
  experimental: {
    ...nextConfig.experimental,
    workerThreads: false,
  },
  images: {
    ...nextConfig.images,
    unoptimized: true,
  },
};

export default websiteConfig;
