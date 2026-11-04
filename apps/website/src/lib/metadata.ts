import type { Metadata } from 'next';
import { site } from '@void/shared/config';
export function pageMeta(title: string, description: string, path: string): Metadata {
  return { title: { absolute: `${title} — Void Client` }, description, alternates: { canonical: `${site.urls.website}${path}` }, openGraph: { title: `${title} — Void Client`, description, url: `${site.urls.website}${path}`, images: [{url: '/opengraph-image', width: 1200, height: 630, alt: 'Void Client — Play beyond limits.'}] } };
}
