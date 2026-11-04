import { getDatabase } from '@void/backend/database';
import { serviceState } from '@void/backend/env';
import { Badge } from '@void/ui/components';
import { requireViewer } from '@/lib/viewer';
import { DiscordConnection } from '@/components/discord-connection';
export const metadata={title:'Linked Discord'};
export default async function Discord(){const viewer=await requireViewer('/discord');const account=await getDatabase().account.findFirst({where:{userId:viewer.user.id,providerId:'discord'},select:{id:true,accountId:true}});return <><header className="portal-heading"><div><h1>Bring your worlds together.</h1><p>Connect your Discord identity to your Void account.</p></div></header><section className="portal-card portal-stack"><Badge gold={Boolean(account)}>{account?'Connected':'Not connected'}</Badge><h2>{account?'Your Discord is linked.':'A familiar identity.'}</h2><p>{account?`Discord account ID: ${account.accountId}`:'Linking takes you to Discord to approve the connection. Only link an account you own.'}</p><div><DiscordConnection enabled={serviceState().discord} accountId={account?.id??null}/></div><p className="field-hint">Account linking requires matching verified email addresses. No Discord connection is made without your approval on Discord.</p></section></>;}
