import type { MetadataRoute } from 'next';
import { site } from '@void/shared/config';
import { getCatalog } from '@/lib/data';
export const revalidate = 3600;
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const catalog=await getCatalog();const categories=Array.from(new Set(catalog.products.map(product=>product.category.slug)));return ['','/products','/categories',...catalog.products.map(product=>`/products/${product.slug}`),...categories.map(slug=>`/categories/${slug}`)].map(path=>({url:`${site.urls.store}${path}`,changeFrequency:'weekly',priority:path===''?1:.6}));}
