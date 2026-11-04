import { nextConfig } from '@void/config/next';

/** @type {import('next').NextConfig} */
const websiteConfig = {
  ...nextConfig,
  output: 'export',
  images: {
    ...nextConfig.images,
    unoptimized: true,
  },
};

export default websiteConfig;
