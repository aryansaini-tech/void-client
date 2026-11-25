import http from 'node:http';
import {readFile,stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {randomBytes,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';
import {openDatabase,checkSchema} from './database.mjs';
import {createAccountStore} from './account-store.mjs';
import {createUserAuth} from './shared-auth.mjs';
import {verifyStripeEvent,processStripeEvent} from './payments.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
export class HttpError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code;}}
function json(res,status,body){const text=JSON.stringify(body);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, private','Content-Length':Buffer.byteLength(text)});res.end(text);}
async function readRaw(req,max=32768){const chunks=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>max)throw new HttpError(413,'body_too_large','Request too large.');chunks.push(chunk);}return Buffer.concat(chunks);}
async function readJson(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw new HttpError(415,'json_required','Send JSON.');try{const value=JSON.parse(await readRaw(req));if(!value||Array.isArray(value)||typeof value!=='object')throw new Error();return value;}catch(e){if(e instanceof HttpError)throw e;throw new HttpError(400,'invalid_json','Invalid JSON request.');}}
function field(v,label,max=200,optional=false){if(optional&&(v==null||v===''))return '';if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw new HttpError(400,'invalid_input',`Invalid ${label}.`);return v.trim();}
function auditText(v,optional=false){const value=field(v,'audit note/reason',500,optional);if(/(?:[A-Za-z0-9_-]{32,}|\bBearer\s+\S+|\b(?:token|secret|password|client_secret|api_key)\s*[:=]\s*\S+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:\d{1,3}\.){3}\d{1,3}\b)/i.test(value))throw new HttpError(400,'private_note_rejected','Do not include credentials, tokens, email addresses or IP addresses in audit notes.');return value;}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.jpg':'image/jpeg','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.ico':'image/x-icon','.txt':'text/plain'};
const inside=(base,file)=>{const rel=path.relative(base,file);return rel===''||(!rel.startsWith('..')&&!path.isAbsolute(rel));};
const protectedPath=p=>/^\/(?:admin|adminpanel)(?:\/|$)/i.test(p)||/^\/api\/admin(?:\/|$)/i.test(p);
export async function createVoidServer(options={}){
 const host=options.host??'127.0.0.1',port=options.port??5173;
 let origin=options.origin??`http://127.0.0.1:${port}`;
 const u=new URL(origin);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.pathname!=='/'||u.search||u.hash||(u.protocol==='http:'&&!['127.0.0.1','localhost','[::1]'].includes(u.hostname)))throw new Error('VOID_ORIGIN must be HTTPS or a local development origin.');origin=u.origin;
 if(process.env.NODE_ENV==='production'&&!origin.startsWith('https:'))throw new Error('Production requires an HTTPS origin.');
 const dist=path.resolve(options.distDir??path.join(ROOT,'dist'));
 let privateConfig={};const configPath=options.privateConfigPath??path.join(ROOT,'private-data/oauth.env');
 try{if((await stat(configPath)).size>65536)throw new Error();privateConfig=parseEnv(await readFile(configPath,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Private server configuration could not be read.');}
 const cfg={...privateConfig,...process.env,...options.config};
 const db=options.db??await openDatabase({url:cfg.DATABASE_URL,devPath:cfg.VOID_DEV_DATABASE_PATH});if(db)await checkSchema(db);
 const now=options.now??Date.now,store=db?createAccountStore(db,{now}):null;
 const admins=new Set((cfg.VOID_ADMIN_DISCORD_IDS??'').split(',').map(s=>s.trim()).filter(s=>/^\d{17,20}$/.test(s)));
 const salt=randomBytes(32),fallbackRates=new Map();
 async function limit(key,max,seconds,req){
  if(req)key=`anon:${key}:${createHash('sha256').update(salt).update(req.socket.remoteAddress??'local').digest('hex')}`;
  if(db){const r=(await db.query('INSERT INTO "RateBucket"(key,count,"resetAt") VALUES($1,1,$2) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN "RateBucket"."resetAt" <= $3 THEN 1 ELSE "RateBucket".count+1 END,"resetAt"=CASE WHEN "RateBucket"."resetAt" <= $3 THEN EXCLUDED."resetAt" ELSE "RateBucket"."resetAt" END RETURNING count',[key,new Date(now()+seconds*1000),new Date(now())])).rows[0];if(r.count>max)throw new HttpError(429,'rate_limited','Too many requests. Try again later.');}
  else{const old=fallbackRates.get(key),entry=!old||old.until<=now()?{count:0,until:now()+seconds*1000}:old;entry.count++;if(fallbackRates.size>=5000&&!old)throw new HttpError(429,'rate_limited','Try again later.');fallbackRates.set(key,entry);if(entry.count>max)throw new HttpError(429,'rate_limited','Too many requests. Try again later.');}
 }
 const auth=createUserAuth({store,getOrigin:()=>origin,discord:{clientId:cfg.VOID_DISCORD_CLIENT_ID??cfg.DISCORD_CLIENT_ID,clientSecret:cfg.VOID_DISCORD_CLIENT_SECRET??cfg.DISCORD_CLIENT_SECRET},fetchImpl:options.oauthFetch,readJson,json,HttpError,now,limit});
 async function requireAdmin(req,mutation=false){const s=await auth.sessionFor(req);const user=s?await store.profile(s.user_id):null;if(!user||!admins.has(user.discord_id))throw new HttpError(403,'admin_forbidden','Administrator access is forbidden.');if(mutation)await auth.requireUser(req,true);await limit(`admin:${s.user_id}`,120,60);return {...s,user};}
 async function mutation(req,admin=false){const s=admin?await requireAdmin(req,true):await auth.requireUser(req,true),b=await readJson(req);const again=admin?await requireAdmin(req,true):await auth.requireUser(req,true);if(again.token_hash!==s.token_hash)throw new HttpError(401,'session_changed','Your session changed.');return {s,b};}
 const pagination=p=>({page:Math.max(1,Math.min(100000,Number.parseInt(p.get('page')??'1',10)||1)),page_size:Math.max(1,Math.min(100,Number.parseInt(p.get('page_size')??'25',10)||25))});
 const timer=setInterval(()=>{for(const[k,v]of fallbackRates)if(v.until<now())fallbackRates.delete(k);if(db)db.query('DELETE FROM "RateBucket" WHERE "resetAt"<$1',[new Date(now()-3600000)]).catch(()=>{});},60000);timer.unref();
 let downloads=0;
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Vary','Cookie');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.discordapp.com; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  try{
   if(!req.url.startsWith('/'))throw new HttpError(400,'invalid_path','Invalid URL.');
   const requestURL=new URL(origin+req.url);
   let pathname;try{pathname=decodeURIComponent(requestURL.pathname).replace(/\/+/g,'/');}catch{throw new HttpError(400,'invalid_path','Invalid URL.');}
   if(/[\\\u0000]/.test(pathname)||pathname.split('/').some(p=>p==='..'||p.startsWith('.')||/[. ]$/.test(p)))throw new HttpError(404,'not_found','Not found.');
   if(!protectedPath(pathname)&&(/(?:^|\/)(?:private-data|audit|audit-private|permissions)(?:\/|$)/i.test(pathname)||/(?:oauth\.env|\.(?:env|db|sqlite3?|sql|dump|pem|key|pfx|p12|dat))(?:$|\/)/i.test(pathname)))throw new HttpError(404,'not_found','Not found.');
   const p=requestURL.searchParams;
   if(protectedPath(pathname)){res.setHeader('Cache-Control','no-store, private');await requireAdmin(req,!['GET','HEAD'].includes(req.method));}
   if(await auth.handle(req,res,pathname))return;
   if(pathname==='/api/site'&&req.method==='GET'){
    const entries=db?(await db.query('SELECT id,version,title,date,features,improvements,fixes,notices FROM "ChangelogEntry" WHERE published=true ORDER BY date DESC')).rows.map(e=>({id:e.id,version:e.version,title:e.title,date:new Date(e.date).toISOString().slice(0,10),changes:[...e.features,...e.improvements,...e.fixes,...e.notices]})):[];
    json(res,200,{entries,downloadCount:downloads,downloadAvailable:Boolean(options.installerPath??cfg.VOID_INSTALLER_PATH)});return;
   }
   if(pathname==='/api/catalogue'&&req.method==='GET'){const items=store?(await store.catalogue()).filter(i=>i.published):[];json(res,200,{items,purchasing_live:false});return;}
   if(pathname==='/api/download'&&req.method==='GET'){
    const file=options.installerPath??cfg.VOID_INSTALLER_PATH;if(!file)throw new HttpError(404,'download_unavailable','Installer is not published.');const info=await stat(file);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="VoidLauncher.exe"','Content-Length':info.size,'Cache-Control':'no-store'});res.once('finish',()=>downloads++);const stream=createReadStream(file);stream.once('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);return;
   }
   if(pathname==='/api/webhooks/stripe'&&req.method==='POST'){
    if(!db||!cfg.STRIPE_WEBHOOK_SECRET)throw new HttpError(503,'purchasing_not_live','Real purchasing is not live.');await limit('stripe-webhook',300,60,req);const raw=await readRaw(req,262144);let event;try{event=verifyStripeEvent(raw,req.headers['stripe-signature'],cfg.STRIPE_WEBHOOK_SECRET,now);}catch{throw new HttpError(400,'invalid_signature','Webhook signature or payload rejected.');}json(res,200,await processStripeEvent(db,event,{now,HttpError}));return;
   }
   if(pathname.startsWith('/api/account')){
    if(req.method==='GET'&&pathname==='/api/account'){const s=await auth.requireUser(req);json(res,200,await store.account(s.user_id));return;}
    if(req.method==='POST'){
     const {s,b}=await mutation(req);
     if(pathname==='/api/account/equip'){if(!await store.equip(s.user_id,field(b.item_id,'item ID')))throw new HttpError(403,'item_not_owned','Only an owned cosmetic can be equipped.');json(res,200,{equipped:await store.equipped(s.user_id)});return;}
     if(pathname==='/api/account/unequip'){await db.query('DELETE FROM "VoidEquipped" WHERE user_id=$1 AND slot=$2',[s.user_id,field(b.slot,'slot',40)]);json(res,200,{equipped:await store.equipped(s.user_id)});return;}
     if(pathname==='/api/account/launcher-tokens/revoke'){await db.query('UPDATE "VoidLauncherToken" SET revoked_at=$3 WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL',[field(b.id,'token ID'),s.user_id,new Date(now())]);json(res,200,{revoked:true});return;}
     if(pathname==='/api/account/delete'){if(b.confirm!==true)throw new HttpError(400,'confirmation_required','Confirm account deletion.');auth.invalidate(req);await store.deleteAccount(s.user_id);auth.clearCookie(res);json(res,200,{deleted:true});return;}
    }
   }
   if(pathname.startsWith('/api/admin/')){
    const s=await requireAdmin(req);
    if(pathname==='/api/admin/session'&&req.method==='GET'){json(res,200,{user:s.user,csrfToken:s.csrfToken});return;}
    if(pathname==='/api/admin/players'&&req.method==='GET'){json(res,200,await store.players({...pagination(p),q:field(p.get('q')??'','search',100,true),sort:p.get('sort'),order:p.get('order')}));return;}
    if(pathname==='/api/admin/catalogue'&&req.method==='GET'){json(res,200,{items:await store.catalogue()});return;}
    if(pathname==='/api/admin/audit'&&req.method==='GET'){json(res,200,await store.auditList(pagination(p)));return;}
    const match=/^\/api\/admin\/players\/(\d{17,20})(?:\/(grant|revoke))?$/.exec(pathname);
    if(match){if(req.method==='GET'&&!match[2]){const result=await store.player(match[1]);if(!result)throw new HttpError(404,'player_missing','Player not found.');json(res,200,result);return;}
     if(req.method==='POST'&&match[2]){const {s:current,b}=await mutation(req,true);if(b.confirm!==true)throw new HttpError(400,'confirmation_required','Confirm the administrator action.');const item=field(b.item_id,'item ID');const result=match[2]==='grant'?await store.grant(current.user_id,match[1],item,auditText(b.note,true)):await store.revoke(current.user_id,match[1],item,auditText(b.reason));if(!result)throw new HttpError(404,'item_or_player_missing','Player or item not found.');json(res,200,result);return;}
    }
   }
   if(pathname.startsWith('/api/')||pathname.startsWith('/auth/'))throw new HttpError(404,'not_found','Endpoint not found.');
   if(!['GET','HEAD'].includes(req.method))throw new HttpError(405,'method_not_allowed','Method not allowed.');
   let file=path.resolve(dist,`.${pathname}`);if(!inside(dist,file))throw new HttpError(404,'not_found','Not found.');
   if(/\/AdminPanel[^/]*\.(?:js|css)$/i.test(pathname))await requireAdmin(req);
   let info;try{info=await stat(file);if(!info.isFile())throw new Error();}catch{if(path.extname(pathname))throw new HttpError(404,'not_found','Not found.');file=path.join(dist,'index.html');try{info=await stat(file);}catch{throw new HttpError(503,'build_required','Build the website first.');}}
   const canonicalFile=await realpath(file);if(!inside(await realpath(dist),canonicalFile))throw new HttpError(404,'not_found','Not found.');
   const adminAsset=/^AdminPanel[^/]*\.(?:js|css)$/i.test(path.basename(canonicalFile));if(adminAsset)await requireAdmin(req);
   res.writeHead(200,{'Content-Type':mime[path.extname(file)]??'application/octet-stream','Cache-Control':protectedPath(pathname)||adminAsset?'no-store, private':'no-cache','Content-Length':info.size});if(req.method==='HEAD')res.end();else{const stream=createReadStream(file);stream.once('error',()=>res.destroy());res.once('close',()=>stream.destroy());stream.pipe(res);}
  }catch(e){if(res.headersSent){res.destroy();return;}json(res,e instanceof HttpError?e.status:500,{code:e instanceof HttpError?e.code:'server_error',error:e instanceof HttpError?e.message:'The server could not complete the request.'});}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;server.maxHeadersCount=50;
 server.once('listening',()=>{if(!options.origin&&port===0)origin=`http://127.0.0.1:${server.address().port}`;});
 server.once('close',()=>{clearInterval(timer);auth.close();if(db&&!options.db)db.close().catch(()=>{});});return server;
}
export async function startFromEnvironment(){const host=process.env.VOID_HOST??process.env.HOST??(process.env.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1'),port=Number(process.env.VOID_PORT??process.env.PORT??5173);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Invalid VOID_PORT.');const server=await createVoidServer({host,port,origin:process.env.VOID_ORIGIN});server.once('error',()=>{console.error('VOID server could not start.');process.exitCode=1;});server.listen(port,host,()=>console.log('VOID website server started.'));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();server.closeIdleConnections();});return server;}
