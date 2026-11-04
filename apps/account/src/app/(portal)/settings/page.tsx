import { site } from '@void/shared/config';
import { requireViewer } from '@/lib/viewer';
import { SettingsForm } from '@/components/settings-form';
export const metadata={title:'Settings'};
export default async function Settings(){const viewer=await requireViewer('/settings');return <><header className="portal-heading"><div><h1>A space that fits.</h1><p>Set your preferences and choose what you share.</p></div></header><section className="portal-card portal-stack"><SettingsForm reducedMotion={viewer.profile?.reducedMotion??false} publicProfile={viewer.profile?.publicProfile??false} profileUrl={`${site.urls.account}/players/${viewer.user.id}`}/></section></>;}
