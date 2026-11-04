import { requireViewer } from '@void/account/lib/viewer';
import { ProfileForm } from '@void/account/components/profile-form';
export const metadata={title:'Profile'};
export default async function Profile(){const viewer=await requireViewer('/profile');return <><header className="portal-heading"><div><h1>Make it yours.</h1><p>The details that make this your space.</p></div></header><section className="portal-card portal-stack"><ProfileForm name={viewer.user.name} email={viewer.user.email} bio={viewer.profile?.bio??''} minecraftName={viewer.profile?.minecraftName??''}/></section></>;}
