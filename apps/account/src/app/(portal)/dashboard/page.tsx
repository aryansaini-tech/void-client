import Link from 'next/link';
import { ArrowUpRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { accountUrl } from '@void/shared/config';
import { getDatabase } from '@void/backend/database';
import { Badge, ButtonLink } from '@void/ui/components';
import { DiscordIcon, VoidMark } from '@void/ui/brand';
import { requireViewer } from '@void/account/lib/viewer';

export const metadata = { title: 'Overview' };

export default async function Dashboard() {
  const viewer = await requireViewer();
  const db = getDatabase();
  const [discord, activity, orderCount] = await Promise.all([
    db.account.findFirst({ where: { userId: viewer.user.id, providerId: 'discord' }, select: { id: true } }),
    db.auditEvent.findMany({ where: { userId: viewer.user.id }, orderBy: { createdAt: 'desc' }, take: 4 }),
    db.order.count({ where: { userId: viewer.user.id, status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } } }),
  ]);

  return <>
    <header className="portal-heading">
      <div><h1>Your corner of the void.</h1><p>Welcome back, {viewer.user.name}. Everything you need, in one place.</p></div>
      <Badge gold>Email verified</Badge>
    </header>

    <section className="portal-welcome">
      <div><p className="section-kicker">Your identity</p><h2>Make yourself at home.</h2><p>Keep your profile up to date and choose how you appear to the Void community.</p><ButtonLink href={accountUrl('/profile')} variant="secondary">Edit your profile</ButtonLink></div>
      <VoidMark decorative />
    </section>

    <div className="dashboard-layout">
      <section className="dashboard-section" aria-labelledby="activity-heading">
        <h2 id="activity-heading">Recent account activity</h2>
        {activity.length ? <ul className="activity-list">{activity.map(event => <li key={event.id}><span>{event.action.replace(/[._-]/g, ' ')}</span><time dateTime={event.createdAt.toISOString()}>{event.createdAt.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' })}</time></li>)}</ul> : <div className="dashboard-empty"><p>Your recent sign-ins and account changes will appear here.</p><ButtonLink href={accountUrl('/security')} variant="ghost">Review your security</ButtonLink></div>}
      </section>

      <div className="dashboard-links">
        <Link className="dashboard-link" href={accountUrl('/discord')}><DiscordIcon width={23} height={23} /><div><h2>Connected accounts</h2><p>{discord ? 'Your Discord account is linked to Void.' : 'Bring your Discord identity into Void. Manage your connection here.'}</p></div><ArrowUpRight size={16} /></Link>
        <Link className="dashboard-link" href={accountUrl('/purchases')}><ShoppingBag size={22} strokeWidth={1.5} /><div><h2>Your collection</h2><p>{orderCount ? `${orderCount} purchase${orderCount === 1 ? '' : 's'} in your history.` : 'Your purchases and order details will be here when you need them.'}</p></div><ArrowUpRight size={16} /></Link>
        <Link className="dashboard-link" href={accountUrl('/security')}><ShieldCheck size={22} strokeWidth={1.5} /><div><h2>Keep it yours.</h2><p>Manage your password, signed-in devices, and account security.</p></div><ArrowUpRight size={16} /></Link>
      </div>
    </div>
  </>;
}
