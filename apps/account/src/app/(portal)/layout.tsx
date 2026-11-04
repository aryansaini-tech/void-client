import { currentViewer } from '@void/account/lib/viewer';
import { PortalShell } from '@void/account/components/portal-shell';
export const dynamic='force-dynamic';
export default async function PortalLayout({children}:{children:React.ReactNode}){const viewer=await currentViewer();if(!viewer)return children;return <PortalShell name={viewer.user.name} reducedMotion={viewer.profile?.reducedMotion??false}>{children}</PortalShell>;}
