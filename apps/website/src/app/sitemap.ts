import type { MetadataRoute } from 'next';
import { site } from '@void/shared/config';

export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/modules','/download','/discord','/changelog','/sneak-peeks','/partners','/faq','/about','/store'].map(path => ({url:`${site.urls.website}${path}`,changeFrequency:path === '/changelog' ? 'weekly' : 'monthly',priority:path === '' ? 1 : .7}));
}
