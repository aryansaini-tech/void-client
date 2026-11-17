'use client';

import { usePathname } from 'next/navigation';
import { Navigation } from '@void/ui/navigation';
import { Footer } from '@void/ui/footer';
import { Atmosphere } from '@void/ui/scene';

/** Keep one header and footer across all three areas during client navigation. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const app = /^\/account(?:\/|$)/.test(pathname) ? 'account' : /^\/store(?:\/|$)/.test(pathname) ? 'store' : 'website';
  const variant = pathname.includes('download') || app === 'account' ? 'grove' : pathname.includes('modules') || app === 'store' ? 'light' : pathname.includes('changelog') ? 'highlands' : 'valley';
  return <><Navigation app={app} />{pathname !== '/' && <Atmosphere variant={variant} />}{children}<Footer app={app} /></>;
}
