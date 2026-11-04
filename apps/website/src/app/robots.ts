import type { MetadataRoute } from 'next';
import { site } from '@void/shared/config';

export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/account', '/api', '/store/cart', '/store/checkout', '/store/orders', '/store/search'] },
    sitemap: [`${site.urls.website}/sitemap.xml`, `${site.urls.store}/sitemap.xml`],
  };
}
