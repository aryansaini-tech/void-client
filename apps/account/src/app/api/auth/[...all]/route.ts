import { getAuth } from '@void/backend/auth';
import { getDatabase } from '@void/backend/database';
import { serviceState } from '@void/backend/env';
import { assertOrigin, errorResponse, HttpError, rateLimit, readJson } from '@void/backend/security';
import { site } from '@void/shared/config';
import { registerSchema, loginSchema } from '@void/shared/schemas';
import { z } from 'zod';

export const runtime='nodejs';
export const dynamic='force-dynamic';
async function handler(request:Request){
  try{
    const auth=getAuth();if(!auth)throw new HttpError(503,'Account services are not configured yet.','AUTH_UNAVAILABLE');
    const path=new URL(request.url).pathname;
    if(request.method==='POST'&&!path.includes('/callback/'))assertOrigin(request,site.urls.account);
    if(['/sign-up/email','/request-password-reset','/send-verification-email'].some(endpoint=>path.endsWith(endpoint))&&!serviceState().email)throw new HttpError(503,'Email delivery is not configured yet.','EMAIL_UNAVAILABLE');
    let forwarded=request;
    const json=request.headers.get('content-type')?.toLowerCase().split(';')[0]?.trim()==='application/json';
    if(request.method==='POST'&&!path.includes('/callback/')&&!json)throw new HttpError(415,'Use a JSON request.');
    if(request.method==='POST' && json){
      const schema=path.endsWith('/sign-up/email')?registerSchema.passthrough():path.endsWith('/sign-in/email')?loginSchema.passthrough():z.record(z.unknown());
      const body=await readJson(request,schema);
      if(body.provider==='microsoft' && !serviceState().microsoft)throw new HttpError(503,'Microsoft sign-in is not available yet.','MICROSOFT_UNAVAILABLE');
      if(path.endsWith('/link-social')&&body.provider==='microsoft'){
        const session=await auth.api.getSession({headers:request.headers});
        if(!session)throw new HttpError(401,'Sign in to connect Microsoft.','UNAUTHORIZED');
        if(!session.user.emailVerified)throw new HttpError(403,'Verify your Void email first.','EMAIL_NOT_VERIFIED');
        if(Date.now()-new Date(session.session.createdAt).getTime()>600_000)throw new HttpError(401,'Sign in again before connecting Microsoft.','SESSION_NOT_FRESH');
      }
      if(path.endsWith('/unlink-account')){
        const session=await auth.api.getSession({headers:request.headers});
        if(!session)throw new HttpError(401,'Sign in to manage your connections.');
        const {accountId}=z.object({accountId:z.string().min(1).max(128)}).parse(body);
        const accounts=await getDatabase().account.findMany({where:{userId:session.user.id},select:{id:true,providerId:true,password:true}});
        const selected=accounts.find(account=>account.id===accountId);
        // Password sign-in is permanent once added. A Discord connection alone
        // must not make it possible to remove the only usable sign-in method.
        if(selected?.providerId==='credential'||selected?.providerId==='microsoft'&&!accounts.some(account=>account.providerId==='credential'&&Boolean(account.password)))throw new HttpError(400,'Keep an email password before disconnecting Microsoft.','LAST_SIGN_IN_METHOD');
      }
      if(typeof body.email==='string' && ['/sign-in/email','/sign-up/email','/request-password-reset','/send-verification-email'].some(endpoint=>path.endsWith(endpoint)))await rateLimit(`auth-address:${path}`,body.email.trim().toLowerCase(),path.endsWith('/sign-in/email')?12:5,600);
      const headers=new Headers(request.headers);headers.delete('content-length');
      forwarded=new Request(request.url,{method:request.method,headers,body:JSON.stringify(body)});
    }
    const response=await auth.handler(forwarded);
    response.headers.set('Cache-Control','no-store');return response;
  }catch(error){return errorResponse(error);}
}
export const GET=handler;
export const POST=handler;
