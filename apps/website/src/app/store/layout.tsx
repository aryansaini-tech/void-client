import type { Metadata } from 'next';
import { site } from '@void/shared/config';
import { StoreProvider } from '@void/store/components/store-provider';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'The Void Store', template: '%s — Void Store' },
  description: 'The official Void Client store. Discover genuine products as they become available.',
  openGraph: { title: 'The Void Store', url: site.urls.store },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreProvider>{children}</StoreProvider>;
}
