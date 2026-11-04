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
};

export default websiteConfig;
