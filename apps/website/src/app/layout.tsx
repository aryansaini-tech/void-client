import type { Metadata, Viewport } from 'next';
import { site } from '@void/shared/config';
import { SiteShell } from '@/components/site-shell';
import { MotionRoot } from '@void/ui/motion';
import { AppearanceScript } from '@void/ui/appearance';
import './globals.css';
import '@void/design-system/styles.css';
import '@void/design-system/polish.css';

export const metadata: Metadata = {
  metadataBase: new URL(site.urls.website),
  title: { default: 'Void Client — Play beyond limits.', template: '%s — Void Client' },
  description: site.description,
  applicationName: site.name,
  openGraph: { type: 'website', siteName: site.name, locale: 'en_US', title: 'Void Client — Play beyond limits.', description: site.description },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: '#08090b', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head><link rel="preload" href="/fonts/Monocraft.otf" as="font" type="font/otf" crossOrigin="anonymous" /><AppearanceScript /></head>
      <body>
        <MotionRoot>
          <SiteShell>{children}</SiteShell>
        </MotionRoot>
      </body>
    </html>
  );
}
