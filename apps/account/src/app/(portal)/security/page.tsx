import { getDatabase } from '@void/backend/database';
import { serviceState } from '@void/backend/env';
import { Badge } from '@void/ui/components';
import { requireViewer } from '@/lib/viewer';
import { PasswordForm, PasswordSetup, SessionList } from '@/components/security-forms';
import { MicrosoftConnection } from '@/components/microsoft-connection';
export const metadata={title:'Security'};
function device(agent:string|null){if(!agent)return 'Unknown device';const os=agent.includes('Android')?'Android':/iPhone|iPad/.test(agent)?'iOS':agent.includes('Windows')?'Windows':agent.includes('Mac')?'macOS':agent.includes('Linux')?'Linux':'Device';const browser=agent.includes('Edg/')?'Edge':agent.includes('Firefox/')?'Firefox':agent.includes('Chrome/')?'Chrome':agent.includes('Safari/')?'Safari':'Browser';return `${browser} on ${os}`;}
export default async function Security({searchParams}:{searchParams:Promise<{error?:string}>}){
  const viewer=await requireViewer('/security');
  const db=getDatabase();
  const [sessions,accounts,params]=await Promise.all([
    db.session.findMany({where:{userId:viewer.user.id,expiresAt:{gt:new Date()}},orderBy:{createdAt:'desc'},select:{id:true,createdAt:true,userAgent:true}}),
    db.account.findMany({where:{userId:viewer.user.id,providerId:{in:['credential','microsoft']}},select:{id:true,providerId:true,password:true}}),
    searchParams,
  ]);
  const microsoft=accounts.find(account=>account.providerId==='microsoft');
  const hasPassword=accounts.some(account=>account.providerId==='credential'&&Boolean(account.password));
  const services=serviceState();
  return <><header className="portal-heading"><div><h1>Keep it in your hands.</h1><p>Your password, your sessions, your peace of mind.</p></div><Badge gold>Email verified</Badge></header><div className="portal-stack"><section className="portal-card"><div className="connection-heading"><h2>Microsoft account</h2><Badge gold={Boolean(microsoft)}>{microsoft?'Connected':'Not connected'}</Badge></div><p className="connection-description">A familiar way to sign in. Connect the Microsoft account you want to use with Void.</p><MicrosoftConnection enabled={services.microsoft} accountId={microsoft?.id??null} hasPassword={hasPassword} error={params.error}/></section><section className="portal-card"><h2>{hasPassword?'Password':'Add email sign-in'}</h2>{hasPassword?<PasswordForm/>:<PasswordSetup email={viewer.user.email} enabled={services.email}/>}</section><section className="portal-card"><h2>Signed-in devices</h2><SessionList sessions={sessions.map(session=>({id:session.id,createdAt:session.createdAt.toISOString(),device:device(session.userAgent),current:session.id===viewer.session.id}))}/></section></div></>;
}
