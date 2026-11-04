import type { Metadata, Viewport } from 'next';
import { site } from '@void/shared/config';
import { Navigation } from '@void/ui/navigation';
import { Footer } from '@void/ui/footer';
import { MotionRoot } from '@void/ui/motion';
import { AppearanceScript } from '@void/ui/appearance';
import { CartProvider } from '@/components/cart-provider';
import { getCatalog, getViewer } from '@/lib/data';
import './globals.css';
import '@void/design-system/styles.css';
import '@void/design-system/polish.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.urls.store),
  title: { default: 'The Void Store — Coming soon', template: '%s — Void Store' },
  description: 'The official Void Client store. Discover genuine products as they become available.',
  openGraph: { siteName: 'Void Store', type: 'website', title: 'The Void Store', description: 'A new chapter for your Void collection.' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#E5ECF6', width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [catalog, viewer] = await Promise.all([getCatalog(), getViewer()]);
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><AppearanceScript /></head>
      <body>
        <MotionRoot>
          <CartProvider catalog={catalog.products} userId={viewer?.user.id ?? null}>
            <Navigation app="store" />
            {children}
            <Footer app="store" />
          </CartProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
