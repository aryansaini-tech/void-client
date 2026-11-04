import type { MetadataRoute } from 'next';
import { site } from '@void/shared/config';

export const dynamic = 'force-static';
export default function robots(): MetadataRoute.Robots { return {rules:{userAgent:'*',allow:'/'},sitemap:`${site.urls.website}/sitemap.xml`}; }
