import type { Metadata, Viewport } from 'next';
import { site } from '@void/shared/config';
import { Navigation } from '@void/ui/navigation';
import { Footer } from '@void/ui/footer';
import { MotionRoot } from '@void/ui/motion';
import { AppearanceScript } from '@void/ui/appearance';
import './globals.css';
import '@void/design-system/styles.css';
import '@void/design-system/polish.css';
import '@void/design-system/cinematic.css';
import { Atmosphere } from '@void/ui/scene';

export const metadata: Metadata = {
  metadataBase: new URL(site.urls.account),
  title: { default: 'Your account — Void Client', template: '%s — Void Account' },
  description: 'Your place in Void. Manage your profile, security, linked accounts, and purchases.',
  robots: { index: false, follow: false },
  openGraph: { type: 'website', siteName: 'Void Account', title: 'Your Void account', description: 'Your place in the Void Client ecosystem.' }
};

export const viewport: Viewport = { themeColor: '#dac8ad', width: 'device-width', initialScale: 1 };

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head><link rel="preload" href="/void/fonts/Monocraft.ttf" as="font" type="font/ttf" crossOrigin="anonymous" /><AppearanceScript /></head>
      <body>
        <MotionRoot>
          <Navigation app="account" />
          <Atmosphere variant="grove" />
          {children}
          <Footer app="account" />
        </MotionRoot>
      </body>
    </html>
  );
}
