import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
export const digest=v=>createHash('sha256').update(v).digest('hex');
const token=()=>randomBytes(32).toString('base64url');
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const one=async(db,sql,args)=>(await db.query(sql,args)).rows[0];
export function loopback(value){
 if(typeof value!=='string'||value.length>160)return false;
 try{const u=new URL(value);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port!==''&&Number(u.port)>=1&&Number(u.port)<=65535&&!u.username&&!u.password&&u.pathname==='/callback'&&!u.search&&!u.hash&&u.href===value;}catch{return false;}
}
export function createUserAuth({store,getOrigin,discord={},fetchImpl=fetch,readJson,json,HttpError,now=Date.now,limit}){
 const db=store?.db,flows=new Map(),browsers=new Map();
 const available=()=>Boolean(db&&/^\d{17,20}$/.test(discord.clientId||'')&&typeof discord.clientSecret==='string'&&discord.clientSecret.length>=16);
 const providers=()=>({discord:{available:available()},xbox:{available:false,comingSoon:true}});
 const cookie=(name,value,max)=>`${name}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${max}${getOrigin().startsWith('https:')?'; Secure':''}`;
 const readCookie=(req,name)=>{const a=(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(`${name}=`));const v=a.length===1?a[0].slice(name.length+1):null;return valid(v)?v:null;};
 const invalidate=req=>{const raw=readCookie(req,'void_oauth_browser');if(!raw)return;const key=digest(raw),b=browsers.get(key);if(b)b.generation++;for(const[k,f]of flows)if(f.browser===key)flows.delete(k);};
 async function sessionFor(req){if(!db)return null;const raw=readCookie(req,'void_user');if(!raw)return null;const s=await one(db,'SELECT * FROM "VoidSession" WHERE token_hash=$1 AND expires_at>$2',[digest(raw),new Date(now())]);if(!s||!await store.profile(s.user_id))return null;return {...s,csrfToken:createHash('sha256').update(`${raw}:${s.csrf_nonce}`).digest('base64url')};}
 async function requireUser(req,mutation=false){const s=await sessionFor(req);if(!s)throw new HttpError(401,'auth_required','Sign in with Discord.');if(mutation){if(req.headers.origin!==getOrigin())throw new HttpError(403,'origin_rejected','Use the website to perform this action.');const c=req.headers['x-csrf-token'];if(!valid(c)||!timingSafeEqual(Buffer.from(c),Buffer.from(s.csrfToken)))throw new HttpError(403,'csrf_rejected','Refresh your session and try again.');await limit(`user:${s.user_id}`,60,60);}return s;}
 const redirect=(res,location)=>{res.writeHead(303,{Location:location,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();};
 const issueCode=async(res,userId,launcher)=>{const code=token();await db.query('INSERT INTO "VoidLauncherCode"(code_hash,user_id,challenge,redirect_uri,expires_at) VALUES($1,$2,$3,$4,$5)',[digest(code),userId,launcher.challenge,launcher.redirect_uri,new Date(now()+60000)]);const u=new URL(launcher.redirect_uri);u.search=new URLSearchParams({code,state:launcher.state}).toString();redirect(res,u.href);};
 const start=async(req,res,launcher=null)=>{
  if(!available())throw new HttpError(503,'provider_unavailable','Discord sign-in is not configured.');
  if(req.headers.origin&&req.headers.origin!==getOrigin())throw new HttpError(403,'origin_rejected','Open sign-in from VOID.');
  await limit('oauth',20,600,req);for(const [key,flow]of flows)if(flow.expires<now())flows.delete(key);for(const[k,b]of browsers)if(b.expires<now())browsers.delete(k);if(flows.size>=5000||browsers.size>=5000)throw new HttpError(429,'rate_limited','Try again later.');
  const browser=readCookie(req,'void_oauth_browser')??token(),state=token(),verifier=token(),browserKey=digest(browser),b=browsers.get(browserKey)??{generation:0};b.expires=now()+600000;browsers.set(browserKey,b);
  flows.set(digest(state),{browser:browserKey,generation:b.generation,sessionHash:(await sessionFor(req))?.token_hash??null,verifier,expires:now()+600000,launcher});res.setHeader('Set-Cookie',cookie('void_oauth_browser',browser,600));
  const u=new URL('https://discord.com/oauth2/authorize');u.search=new URLSearchParams({client_id:discord.clientId,response_type:'code',redirect_uri:`${getOrigin()}/auth/discord/callback`,scope:'identify',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();redirect(res,u.href);
 };
 const providerJson=async(url,init)=>{
  try{const r=await fetchImpl(url,{...init,redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok||!/^application\/json/i.test(r.headers.get('content-type')||''))throw new Error();const reader=r.body.getReader();let size=0;const chunks=[];try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>262144){await reader.cancel();throw new Error();}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}return JSON.parse(Buffer.concat(chunks));}catch{throw new HttpError(502,'provider_failed','Discord could not complete sign-in.');}
 };
 function generationValid(req,f){const raw=readCookie(req,'void_oauth_browser');return Boolean(raw&&digest(raw)===f.browser&&f.expires>now()&&browsers.get(f.browser)?.generation===f.generation);}
 async function flowValid(req,f){if(!generationValid(req,f))return false;const s=await sessionFor(req);return (s?.token_hash??null)===f.sessionHash&&generationValid(req,f);}
 async function launcherSession(req){
  if(!db)throw new HttpError(503,'database_unavailable','The account service is not configured.');const match=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization||'');if(!match)throw new HttpError(401,'token_required','Sign in from the launcher.');const s=await one(db,'SELECT * FROM "VoidLauncherToken" WHERE token_hash=$1 AND revoked_at IS NULL AND expires_at>$2',[digest(match[1]),new Date(now())]);if(!s||!await store.profile(s.user_id))throw new HttpError(401,'token_expired','Launcher sign-in expired or was revoked.');if(req.headers.origin&&req.headers.origin!==getOrigin())throw new HttpError(403,'origin_rejected','Request origin rejected.');await limit(`launcher:${s.id}`,120,60);await db.query('UPDATE "VoidLauncherToken" SET last_used_at=$2 WHERE id=$1',[s.id,new Date(now())]);return s;
 }
 const launcherProfile=async(s)=>({user:await store.profile(s.user_id),entitlements:(await store.entitlements(s.user_id)).map(e=>({item_id:e.item_id,name:e.name,kind:e.kind,slot:e.slot,source:e.source,status:e.status,granted_at:e.granted_at,revoked_at:e.revoked_at})),equipped:await store.equipped(s.user_id),expires_at:new Date(s.expires_at).getTime()});
 return {sessionFor,requireUser,providers,launcherSession,invalidate,async handle(req,res,pathname){
  if(pathname==='/api/auth/session'&&req.method==='GET'){const s=await sessionFor(req);json(res,200,s?{authenticated:true,user:await store.profile(s.user_id),csrfToken:s.csrfToken,providers:providers()}:{authenticated:false,providers:providers()});return true;}
  if(pathname==='/api/auth/logout'&&req.method==='POST'){const s=await requireUser(req,true);await readJson(req);if((await requireUser(req,true)).token_hash!==s.token_hash)throw new HttpError(401,'session_changed','Your session changed.');invalidate(req);await db.query('DELETE FROM "VoidSession" WHERE token_hash=$1',[s.token_hash]);res.setHeader('Set-Cookie',[cookie('void_user','',0),cookie('void_oauth_browser','',0)]);json(res,200,{signedOut:true});return true;}
  if(pathname==='/api/auth/link'||/^\/auth\/xbox(?:\/|$)/.test(pathname))throw new HttpError(403,'provider_disabled','Xbox is coming soon. Discord is the only sign-in provider.');
  if(pathname==='/auth/discord'&&req.method==='GET'){await start(req,res);return true;}
  if(pathname==='/auth/launcher'&&req.method==='GET'){
   const p=new URL(getOrigin()+req.url).searchParams;if(['redirect_uri','state','code_challenge','code_challenge_method'].some(k=>p.getAll(k).length!==1)||!loopback(p.get('redirect_uri'))||!valid(p.get('state'))||!valid(p.get('code_challenge'))||p.get('code_challenge_method')!=='S256')throw new HttpError(400,'invalid_launcher_flow','Invalid launcher sign-in request.');
   const launcher={redirect_uri:p.get('redirect_uri'),state:p.get('state'),challenge:p.get('code_challenge')},s=await sessionFor(req);if(s){await limit(`launcher-code:${s.user_id}`,20,600);await issueCode(res,s.user_id,launcher);}else await start(req,res,launcher);return true;
  }
  if(pathname==='/auth/discord/callback'&&req.method==='GET'){
   const p=new URL(getOrigin()+req.url).searchParams,state=p.get('state'),browser=readCookie(req,'void_oauth_browser'),f=valid(state)?flows.get(digest(state)):null;
   if(!f||!browser||p.getAll('state').length!==1||!await flowValid(req,f)){redirect(res,'/account?auth=expired');return true;}flows.delete(digest(state));
   if(p.has('error')){redirect(res,'/account?auth=cancelled');return true;}if(p.getAll('code').length!==1||!p.get('code')||p.get('code').length>4096){redirect(res,'/account?auth=failed');return true;}
   try{
    const body=new URLSearchParams({client_id:discord.clientId,client_secret:discord.clientSecret,grant_type:'authorization_code',code:p.get('code'),redirect_uri:`${getOrigin()}/auth/discord/callback`,code_verifier:f.verifier});const a=await providerJson('https://discord.com/api/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()});
    if(!await flowValid(req,f)||typeof a.access_token!=='string'||a.access_token.length>32000||/[\r\n]/.test(a.access_token))throw new Error();const u=await providerJson('https://discord.com/api/v10/users/@me',{method:'GET',headers:{Authorization:`Bearer ${a.access_token}`}});
    if(typeof u.id!=='string'||!/^\d{17,20}$/.test(u.id)||typeof u.username!=='string'||u.username.length>64)throw new Error();const name=u.global_name||u.username;if(typeof name!=='string'||!name.length||name.length>100||/[\u0000-\u001f]/.test(name))throw new Error();
    if(!await flowValid(req,f))throw new Error();const userId=await store.saveDiscord({discord_id:u.id,display_name:name,avatar_hash:typeof u.avatar==='string'&&/^(a_)?[a-f0-9]{32}$/.test(u.avatar)?u.avatar:null},()=>generationValid(req,f),f.sessionHash);if(!await flowValid(req,f))throw new Error();
    const raw=token(),code=f.launcher?token():null;
    await db.transaction(async tx=>{
     await tx.query('SELECT id FROM "User" WHERE id=$1 FOR UPDATE',[userId]);
     const identity=await one(tx,'SELECT user_id FROM "VoidDiscordIdentity" WHERE user_id=$1',[userId]);
     const initiating=f.sessionHash?await one(tx,'SELECT token_hash FROM "VoidSession" WHERE token_hash=$1 AND expires_at>$2',[f.sessionHash,new Date(now())]):true;
     if(!identity||!initiating||!generationValid(req,f))throw new Error();
     await tx.query('INSERT INTO "VoidSession"(token_hash,user_id,csrf_nonce,expires_at) VALUES($1,$2,$3,$4)',[digest(raw),userId,token(),new Date(now()+604800000)]);
     if(code)await tx.query('INSERT INTO "VoidLauncherCode"(code_hash,user_id,challenge,redirect_uri,expires_at) VALUES($1,$2,$3,$4,$5)',[digest(code),userId,f.launcher.challenge,f.launcher.redirect_uri,new Date(now()+60000)]);
     if(f.sessionHash)await tx.query('DELETE FROM "VoidSession" WHERE token_hash=$1',[f.sessionHash]);
     if(!generationValid(req,f))throw new Error();
    });
    if(!generationValid(req,f)){await db.query('DELETE FROM "VoidSession" WHERE token_hash=$1',[digest(raw)]);if(code)await db.query('DELETE FROM "VoidLauncherCode" WHERE code_hash=$1',[digest(code)]);throw new Error();}
    invalidate(req);res.setHeader('Set-Cookie',[cookie('void_user',raw,604800),cookie('void_oauth_browser','',0)]);
    if(code){const destination=new URL(f.launcher.redirect_uri);destination.search=new URLSearchParams({code,state:f.launcher.state}).toString();redirect(res,destination.href);}else redirect(res,'/account?auth=signed_in');
   }catch{redirect(res,'/account?auth=failed');}return true;
  }
  if(pathname==='/api/launcher/exchange'&&req.method==='POST'){
   if(!db)throw new HttpError(503,'database_unavailable','The account service is not configured.');await limit('exchange',30,60,req);if(req.headers.origin&&req.headers.origin!==getOrigin())throw new HttpError(403,'origin_rejected','Request origin rejected.');const b=await readJson(req);if(!valid(b.code)||typeof b.code_verifier!=='string'||!/^[A-Za-z0-9._~-]{43,128}$/.test(b.code_verifier)||!loopback(b.redirect_uri))throw new HttpError(400,'invalid_code','Invalid launcher exchange.');
   const result=await db.transaction(async tx=>{const c=await one(tx,'SELECT * FROM "VoidLauncherCode" WHERE code_hash=$1 FOR UPDATE',[digest(b.code)]),challenge=createHash('sha256').update(b.code_verifier).digest('base64url');if(!c||new Date(c.expires_at).getTime()<=now()||c.redirect_uri!==b.redirect_uri||!valid(c.challenge)||!timingSafeEqual(Buffer.from(c.challenge),Buffer.from(challenge)))throw new HttpError(401,'invalid_code','The code expired, was used, or could not be verified.');await tx.query('DELETE FROM "VoidLauncherCode" WHERE code_hash=$1',[digest(b.code)]);const raw=token(),expires_at=now()+2592000000;await tx.query('INSERT INTO "VoidLauncherToken"(id,token_hash,user_id,expires_at) VALUES($1,$2,$3,$4)',[randomUUID(),digest(raw),c.user_id,new Date(expires_at)]);return {token:raw,expires_at,user_id:c.user_id};});json(res,200,{token:result.token,expires_at:result.expires_at,profile:await launcherProfile({user_id:result.user_id,expires_at:result.expires_at})});return true;
  }
  if(pathname==='/api/launcher/profile'&&req.method==='GET'){json(res,200,await launcherProfile(await launcherSession(req)));return true;}
  if(pathname==='/api/launcher/logout'&&req.method==='POST'){const s=await launcherSession(req);await readJson(req);await db.query('UPDATE "VoidLauncherToken" SET revoked_at=$2 WHERE id=$1',[s.id,new Date(now())]);json(res,200,{signedOut:true});return true;}
  return false;
 },clearCookie:res=>res.setHeader('Set-Cookie',[cookie('void_user','',0),cookie('void_oauth_browser','',0)]),close:()=>{flows.clear();browsers.clear();}};
}
