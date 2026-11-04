'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from '@void/ui/navigation';
import { Footer } from '@void/ui/footer';

/** Keep one header and footer across all three areas during client navigation. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = /^\/account(?:\/|$)/.test(pathname) ? 'account' : /^\/store(?:\/|$)/.test(pathname) ? 'store' : 'website';
  return <><Navigation app={app} />{children}<Footer app={app} /></>;
}
