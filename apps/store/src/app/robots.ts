import type { MetadataRoute } from 'next';
import { site } from '@void/shared/config';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/cart','/checkout','/orders','/api','/search']},sitemap:`${site.urls.store}/sitemap.xml`};}
