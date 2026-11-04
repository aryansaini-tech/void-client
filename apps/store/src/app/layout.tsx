import type { Metadata, Viewport } from 'next';
import { site } from '@void/shared/config';
import { Navigation } from '@void/ui/navigation';
import { Footer } from '@void/ui/footer';
import { MotionRoot } from '@void/ui/motion';
import { AppearanceScript } from '@void/ui/appearance';
import { StoreProvider } from '../components/store-provider';
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
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><link rel="preload" href="/fonts/Monocraft.otf" as="font" type="font/otf" crossOrigin="anonymous" /><AppearanceScript /></head>
      <body>
        <MotionRoot>
          <StoreProvider>
            <Navigation app="store" />
            {children}
            <Footer app="store" />
          </StoreProvider>
        </MotionRoot>
      </body>
    </html>
  );
}
