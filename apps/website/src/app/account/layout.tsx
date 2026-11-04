import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: { default: 'Your account — Void Client', template: '%s — Void Account' },
  description: 'Your place in Void. Manage your profile, security, linked accounts, and purchases.',
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
