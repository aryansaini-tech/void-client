import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash,createHmac} from 'node:crypto';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {openDatabase,initializeDevelopment} from './database.mjs';
import {createVoidServer} from './server.mjs';
import {loopback,digest} from './shared-auth.mjs';
import {createAccountStore} from './account-store.mjs';

const adminId='123456789012345678',playerId='223456789012345678',outsiderId='323456789012345678';
const random=()=>randomBytes(32).toString('base64url');
async function fixture(t,{configured=true,publicOrigin}={}){
 const directory=await mkdtemp(path.join(os.tmpdir(),'void-shared-test-'));
 const db=await openDatabase({devPath:'memory://'});await initializeDevelopment(db);
 await writeFile(path.join(directory,'index.html'),'<!doctype html><title>Local account fixture</title>');
 await mkdir(path.join(directory,'assets'));await writeFile(path.join(directory,'assets/AdminPanel-fixture.js'),'window.adminFixture=true;');await writeFile(path.join(directory,'assets/AdminPanel-fixture.css'),'.fixture{color:white}');
 let time=Date.now();let who=playerId,calls=0,hold;
 const oauthFetch=async(url,init)=>{calls++;assert.equal(init.redirect,'error');assert.ok(init.signal);if(url.endsWith('/token')){if(hold){const gate=hold;hold=null;gate.enter();await gate.released;}assert.equal(new URLSearchParams(init.body).get('redirect_uri'),`${publicOrigin??base}/auth/discord/callback`);return new Response(JSON.stringify({access_token:'fixture-access-only'}),{headers:{'Content-Type':'application/json'}});}return new Response(JSON.stringify({id:who,username:'Fixture',global_name:who===adminId?'Admin Fixture':'Player Fixture',avatar:null,email:'uncollected@example.invalid'}),{headers:{'Content-Type':'application/json'}});};
 const server=await createVoidServer({db,distDir:directory,port:0,origin:publicOrigin,privateConfigPath:path.join(directory,'absent-private-config'),now:()=>time,oauthFetch,config:{VOID_ADMIN_DISCORD_IDS:adminId,VOID_DISCORD_CLIENT_ID:configured?adminId:'',VOID_DISCORD_CLIENT_SECRET:configured?'fixture-oauth-value-not-a-live-secret':'',DISCORD_CLIENT_ID:'',DISCORD_CLIENT_SECRET:'',STRIPE_WEBHOOK_SECRET:'fixture-webhook-value-not-a-live-secret'}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 t.after(async()=>{await new Promise(resolve=>{server.close(resolve);server.closeIdleConnections();});await db.close();const resolved=path.resolve(directory);assert.ok(resolved.startsWith(path.resolve(os.tmpdir())+path.sep));await rm(resolved,{recursive:true,force:true});});
 const request=async(endpoint,{method='GET',body,session,headers={}}={})=>{const mutation=!['GET','HEAD'].includes(method);const r=await fetch(base+endpoint,{method,redirect:'manual',headers:{...(mutation?{'Content-Type':'application/json',Origin:publicOrigin??base}:{}),...(session?{Cookie:session.cookie,...(session.csrfToken?{'X-CSRF-Token':session.csrfToken}:{})}:{}),...headers},...(mutation?{body:typeof body==='string'?body:JSON.stringify(body??{})}:{})});const text=await r.text();let data;try{data=JSON.parse(text);}catch{data=text;}return {status:r.status,data,headers:r.headers};};
 const signin=async(id)=>{who=id;const a=await request('/auth/discord');assert.equal(a.status,303);const u=new URL(a.headers.get('location')),cookie=a.headers.getSetCookie()[0].split(';')[0];const b=await request('/auth/discord/callback?'+new URLSearchParams({code:'fixture-code',state:u.searchParams.get('state')}),{session:{cookie}});assert.equal(b.headers.get('location'),'/account?auth=signed_in');const c=b.headers.getSetCookie().find(s=>s.startsWith('void_user=')).split(';')[0],s=await request('/api/auth/session',{session:{cookie:c}});return {cookie:c,csrfToken:s.data.csrfToken,user:s.data.user,headers:b.headers};};
 const seed=async()=>{await db.query('INSERT INTO "ProductCategory"(id,slug,name) VALUES(\'cat\',\'capes\',\'Capes\')');await db.query('INSERT INTO "Product"(id,slug,name,description,price,currency,"categoryId",available,published,"createdAt","updatedAt") VALUES(\'cape\',\'cape\',\'Fixture Cape\',\'Fixture only\',500,\'usd\',\'cat\',true,true,now(),now()),(\'item\',\'item\',\'Fixture Store Item\',\'Fixture only\',100,\'usd\',\'cat\',true,false,now(),now())');await db.query('INSERT INTO "VoidCosmetic"(item_id,kind,slot) VALUES(\'cape\',\'cape\',\'cape\')');};
 return {db,base,request,signin,seed,store:createAccountStore(db,{now:()=>time}),holdToken(){let enter,release;const reached=new Promise(r=>enter=r),released=new Promise(r=>release=r);hold={enter,released};return {reached,release};},setTime:v=>time=v,get time(){return time;},get calls(){return calls;}};
}

test('additive schema can be applied twice without losing legacy product/user records',async t=>{
 const f=await fixture(t);await f.seed();const s=await f.signin(playerId);
 const {readFile}=await import('node:fs/promises');await f.db.exec(await readFile(new URL('./database/migrations/20261125_shared_discord.sql',import.meta.url),'utf8'));
 assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "Product"')).rows[0].n,2);assert.equal((await f.store.profile(s.user.id)).discord_id,playerId);
});
test('Discord only, hashed persistent sessions, no email/IP collection, no unconfigured provider calls',async t=>{
 const f=await fixture(t);const s=await f.signin(playerId);
 assert.match(s.headers.get('set-cookie'),/HttpOnly/);assert.match(s.headers.get('set-cookie'),/SameSite=Lax/);
 const rows=(await f.db.query('SELECT * FROM "VoidSession"')).rows;assert.notEqual(rows[0].token_hash,s.cookie.split('=')[1]);assert.equal(rows[0].token_hash,digest(s.cookie.split('=')[1]));
 assert.equal((await f.db.query('SELECT email FROM "User"')).rows[0].email.endsWith('@accounts.invalid'),true);
 assert.equal('email' in (await f.request('/api/account',{session:s})).data.user,false);
 const calls=f.calls;assert.equal((await f.request('/auth/xbox')).status,403);assert.equal(f.calls,calls);
 const idle=await fixture(t,{configured:false});assert.equal((await idle.request('/auth/discord')).status,503);assert.equal(idle.calls,0);
});
test('all admin pages/endpoints deny anonymous and forged nonadmin requests; no web admin creation',async t=>{
 const f=await fixture(t),user=await f.signin(outsiderId);
 const endpoints=['/admin','/ADMIN','/%2Fadmin','//admin','/%2Fapi/admin/audit','/admin/players','/admin/audit','/adminpanel','/adminpanel/login','/api/admin/session','/api/admin/players','/api/admin/catalogue','/api/admin/audit',`/api/admin/players/${playerId}`,`/api/admin/players/${playerId}/grant`,`/api/admin/players/${playerId}/revoke`,'/api/admin/login','/api/admin/users'];
 for(const endpoint of endpoints)for(const method of ['GET','POST','DELETE'])for(const session of [undefined,user]){const r=await f.request(endpoint,{method,session,body:{role:'admin',discord_id:outsiderId,item_id:'cape',confirm:true},headers:{'X-Admin':'true','X-Discord-Id':adminId}});assert.equal(r.status,403,`${method} ${endpoint}`);assert.match(r.headers.get('cache-control'),/no-store/);}
 assert.equal((await f.request('/api/admin/session',{session:user})).status,403);
 const a=await f.signin(adminId);assert.equal((await f.request('/api/admin/users',{method:'POST',session:a,body:{discord_id:outsiderId}})).status,404);assert.equal((await f.request('/api/admin/session',{session:user})).status,403);
 assert.equal((await f.request('/assets/AdminPanel-fixture.js',{session:user})).status,403);assert.equal((await f.request('/assets/adminpanel-fixture.js',{session:user})).status,403);assert.equal((await f.request('/assets/AdminPanel-fixture.js.',{session:user})).status,404);const bundle=await f.request('/assets/AdminPanel-fixture.js',{session:a});assert.equal(bundle.status,200);assert.match(bundle.headers.get('cache-control'),/no-store/);
 assert.equal((await f.request('/assets/adminpanel-fixture.css',{session:user})).status,403);assert.match((await f.request('/assets/AdminPanel-fixture.css',{session:a})).headers.get('cache-control'),/no-store/);
});
test('grant duplicate is idempotent, revoke auto-unequips, regrant restores; audit is append-only',async t=>{
 const f=await fixture(t);await f.seed();const admin=await f.signin(adminId),player=await f.signin(playerId),endpoint=`/api/admin/players/${playerId}`;
 assert.equal((await f.request(endpoint+'/grant',{method:'POST',session:admin,body:{item_id:'cape'}})).status,400);
 assert.equal((await f.request(endpoint+'/grant',{method:'POST',session:admin,body:{item_id:'cape',confirm:true,note:'email=fixture@example.invalid'}})).status,400);
 const body={item_id:'cape',note:'Fixture grant',confirm:true};assert.equal((await f.request(endpoint+'/grant',{method:'POST',session:admin,body})).status,200);assert.equal((await f.request(endpoint+'/grant',{method:'POST',session:admin,body})).data.already_owned,true);
 assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "VoidEntitlement"')).rows[0].n,1);
 assert.equal((await f.request('/api/account/equip',{method:'POST',session:player,body:{item_id:'cape'}})).status,200);
 assert.equal((await f.request(endpoint+'/revoke',{method:'POST',session:admin,body:{item_id:'cape',reason:'Fixture revoke',confirm:true}})).status,200);
 assert.deepEqual((await f.request('/api/account',{session:player})).data.equipped,[]);
 assert.equal((await f.request('/api/account/equip',{method:'POST',session:player,body:{item_id:'cape'}})).status,403);
 await f.request(endpoint+'/grant',{method:'POST',session:admin,body});assert.equal((await f.request('/api/account',{session:player})).data.entitlements[0].status,'active');
 const audit=(await f.request('/api/admin/audit',{session:admin})).data.entries;assert.equal(audit.length,4);assert.ok(audit.some(a=>a.action==='admin.revoke'));
 await assert.rejects(f.db.query('UPDATE "VoidAudit" SET reason=\'changed\''),/append-only/);await assert.rejects(f.db.query('DELETE FROM "VoidAudit"'),/append-only/);
 await assert.rejects(f.db.query('TRUNCATE "VoidAudit"'),/append-only/);
 const list=await f.request('/api/admin/players?q='+playerId+'&sort=owned_count&order=asc&page_size=1',{session:admin});assert.equal(list.data.total,1);assert.equal(list.data.players[0].owned_count,1);
});
test('CSRF, cross-origin writes, ownership and rate limits are enforced server-side',async t=>{
 const f=await fixture(t);await f.seed();const a=await f.signin(adminId),p=await f.signin(playerId);
 for(const endpoint of ['/api/account/equip','/api/account/unequip','/api/account/delete','/api/account/launcher-tokens/revoke',`/api/admin/players/${playerId}/grant`,`/api/admin/players/${playerId}/revoke`]){
  const s=endpoint.startsWith('/api/admin')?a:p;assert.equal((await f.request(endpoint,{method:'POST',session:{cookie:s.cookie},body:{confirm:true,item_id:'cape'}})).status,403);assert.equal((await f.request(endpoint,{method:'POST',session:s,headers:{Origin:'https://forged.invalid'},body:{confirm:true,item_id:'cape'}})).status,403);
 }
 assert.equal((await f.request('/api/account/equip',{method:'POST',session:p,body:{item_id:'cape'}})).status,403);
 let throttled=false;for(let i=0;i<70;i++){const r=await f.request('/api/account/unequip',{method:'POST',session:p,body:{slot:'cape'}});if(r.status===429){throttled=true;break;}}assert.equal(throttled,true);
});
test('PKCE code is bound to verifier and exact loopback; one use; tokens are hashed, revocable and expire',async t=>{
 const f=await fixture(t);await f.seed();const p=await f.signin(playerId),a=await f.signin(adminId);
 const verifier=random(),state=random(),redirect_uri='http://127.0.0.1:49123/callback',challenge=createHash('sha256').update(verifier).digest('base64url');
 const begin=await f.request('/auth/launcher?'+new URLSearchParams({redirect_uri,state,code_challenge:challenge,code_challenge_method:'S256'}),{session:p});assert.equal(begin.status,303);const location=new URL(begin.headers.get('location'));assert.equal(location.searchParams.get('state'),state);const code=location.searchParams.get('code');
 assert.equal((await f.request('/api/launcher/exchange',{method:'POST',body:{code,code_verifier:random(),redirect_uri}})).status,401);
 const exchange=await f.request('/api/launcher/exchange',{method:'POST',body:{code,code_verifier:verifier,redirect_uri}});assert.equal(exchange.status,200);assert.equal((await f.request('/api/launcher/exchange',{method:'POST',body:{code,code_verifier:verifier,redirect_uri}})).status,401);
 const raw=exchange.data.token,row=(await f.db.query('SELECT * FROM "VoidLauncherToken"')).rows[0];assert.equal(row.token_hash,digest(raw));assert.notEqual(row.token_hash,raw);
 const headers={Authorization:`Bearer ${raw}`};await f.request(`/api/admin/players/${playerId}/grant`,{method:'POST',session:a,body:{item_id:'cape',confirm:true}});await f.request('/api/account/equip',{method:'POST',session:p,body:{item_id:'cape'}});
 assert.equal((await f.request('/api/launcher/profile',{headers})).data.equipped[0].item_id,'cape');await f.request(`/api/admin/players/${playerId}/revoke`,{method:'POST',session:a,body:{item_id:'cape',reason:'Fixture removal',confirm:true}});assert.deepEqual((await f.request('/api/launcher/profile',{headers})).data.equipped,[]);
 await f.request('/api/account/launcher-tokens/revoke',{method:'POST',session:p,body:{id:row.id}});assert.equal((await f.request('/api/launcher/profile',{headers})).status,401);
 assert.equal(loopback('http://localhost:1234/callback'),false);assert.equal(loopback('http://127.0.0.1:1234/callback?x=1'),false);assert.equal(loopback('https://127.0.0.1:1234/callback'),false);
});
test('verified webhook is idempotent by event/payment, purchase records stay read-only, refund revokes',async t=>{
 const f=await fixture(t);await f.seed();const p=await f.signin(playerId),a=await f.signin(adminId);
 await f.db.query('INSERT INTO "Order"(id,"userId",subtotal,tax,total,currency,"checkoutKey","cartFingerprint","termsAcceptedAt","termsUrl","stripeSessionId","createdAt","updatedAt") VALUES(\'order\',$1,500,0,500,\'usd\',\'fixture-checkout\',\'fixture-cart\',now(),\'https://example.invalid/terms\',\'cs_fixture\',now(),now())',[p.user.id]);
 await f.db.query('INSERT INTO "OrderItem"(id,"orderId","productId",name,quantity,"unitPrice","stripePriceId") VALUES(\'line\',\'order\',\'cape\',\'Fixture Cape\',1,500,\'price_fixture\')');
 const event={id:'evt_fixture',type:'checkout.session.completed',data:{object:{id:'cs_fixture',metadata:{orderId:'order',userId:p.user.id},client_reference_id:p.user.id,payment_intent:'pi_fixture',payment_status:'paid',currency:'usd',amount_total:500,total_details:{amount_tax:0}}}};
 const webhook=async(e,{bad=false,stale=false}={})=>{const raw=JSON.stringify(e),ts=String(Math.floor(f.time/1000)-(stale?600:0)),sig=createHmac('sha256','fixture-webhook-value-not-a-live-secret').update(`${ts}.${raw}`).digest('hex');return f.request('/api/webhooks/stripe',{method:'POST',body:raw,headers:{'Stripe-Signature':`t=${ts},v1=${bad?'0'.repeat(64):sig}`}});};
 assert.equal((await webhook(event,{bad:true})).status,400);assert.equal((await webhook(event,{stale:true})).status,400);assert.equal((await webhook(event)).status,200);assert.equal((await webhook(event)).status,200);assert.equal((await webhook({...event,id:'evt_fixture_second'})).status,200);
 assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "VoidEntitlement"')).rows[0].n,1);assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "Payment"')).rows[0].n,1);
 const detail=(await f.request(`/api/admin/players/${playerId}`,{session:a})).data;assert.equal(detail.payments[0].provider_payment_id,'pi_fixture');
 await f.request('/api/account/equip',{method:'POST',session:p,body:{item_id:'cape'}});
 assert.equal((await webhook({id:'evt_refund_fixture',type:'charge.refunded',data:{object:{payment_intent:'pi_fixture',currency:'usd',amount_refunded:500}}})).status,200);assert.deepEqual((await f.request('/api/account',{session:p})).data.equipped,[]);
 await webhook(event);assert.equal((await f.request('/api/account',{session:p})).data.entitlements[0].status,'revoked');
});
test('deletion anonymises user and disconnects Discord, sessions, launcher while retaining payment/audit records',async t=>{
 const f=await fixture(t);await f.seed();const a=await f.signin(adminId),p=await f.signin(playerId);
 await f.request(`/api/admin/players/${playerId}/grant`,{method:'POST',session:a,body:{item_id:'cape',confirm:true}});
 assert.equal((await f.request('/api/account/delete',{method:'POST',session:p,body:{confirm:true}})).status,200);
 assert.equal((await f.request('/api/auth/session',{session:p})).data.authenticated,false);assert.equal(await f.store.profile(p.user.id),null);
 const u=(await f.db.query('SELECT name,email FROM "User" WHERE id=$1',[p.user.id])).rows[0];assert.equal(u.name,'Deleted account');assert.ok(u.email.endsWith('@deleted.invalid'));
 assert.equal((await f.request('/api/admin/audit',{session:a})).data.entries[0].player_id,'Deleted account');
});

test('existing Discord account retains legacy user ID and production cookies are Secure',async t=>{
 const f=await fixture(t,{publicOrigin:'https://accounts.example.invalid'});
 await f.db.query('INSERT INTO "User"(id,name,email,"createdAt","updatedAt") VALUES(\'legacy-user\',\'Former name\',\'legacy-fixture@example.invalid\',now(),now())');
 await f.db.query('INSERT INTO "Account"(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES(\'legacy-account\',$1,\'discord\',\'legacy-user\',now(),now())',[playerId]);
 const {readFile}=await import('node:fs/promises');await f.db.exec(await readFile(new URL('./database/migrations/20261125_shared_discord.sql',import.meta.url),'utf8'));
 const migrated=(await f.db.query('SELECT * FROM "VoidDiscordIdentity" WHERE discord_id=$1',[playerId])).rows[0];assert.equal(migrated.user_id,'legacy-user');assert.equal(migrated.last_login,null);
 const p=await f.signin(playerId);assert.equal(p.user.id,'legacy-user');assert.match(p.headers.get('set-cookie'),/; Secure/);
 assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "User"')).rows[0].n,1);
});

test('launcher and browser credentials expire; sign-out revokes bearer; expired one-time code is rejected',async t=>{
 const f=await fixture(t),p=await f.signin(playerId);
 const redirect_uri='http://127.0.0.1:49124/callback',verifier=random(),state=random(),code_challenge=createHash('sha256').update(verifier).digest('base64url');
 const code=async()=>new URL((await f.request('/auth/launcher?'+new URLSearchParams({redirect_uri,state,code_challenge,code_challenge_method:'S256'}),{session:p})).headers.get('location')).searchParams.get('code');
 const exchange=async(c)=>f.request('/api/launcher/exchange',{method:'POST',body:{code:c,code_verifier:verifier,redirect_uri}});
 const first=(await exchange(await code())).data;const headers={Authorization:`Bearer ${first.token}`};
 assert.equal((await f.request('/api/launcher/logout',{method:'POST',headers})).status,200);assert.equal((await f.request('/api/launcher/profile',{headers})).status,401);
 const expired=await code();f.setTime(f.time+61000);assert.equal((await exchange(expired)).status,401);
 const second=(await exchange(await code())).data;f.setTime(f.time+2592000001);assert.equal((await f.request('/api/launcher/profile',{headers:{Authorization:`Bearer ${second.token}`}})).status,401);assert.equal((await f.request('/api/auth/session',{session:p})).data.authenticated,false);
});

test('pending OAuth cannot reauthenticate after website sign-out or account deletion',async t=>{
 const f=await fixture(t);
 for(const action of ['logout','delete']){
  const s=await f.signin(playerId),start=await f.request('/auth/discord',{session:s}),u=new URL(start.headers.get('location'));
  const cookie=s.cookie+'; '+start.headers.getSetCookie()[0].split(';')[0],active={...s,cookie},gate=f.holdToken();
  const pending=f.request('/auth/discord/callback?'+new URLSearchParams({code:'fixture-pending',state:u.searchParams.get('state')}),{session:active});
  await gate.reached;
  const outcome=await f.request(action==='delete'?'/api/account/delete':'/api/auth/logout',{method:'POST',session:active,body:{confirm:true}});assert.equal(outcome.status,200);
  gate.release();const completed=await pending;assert.match(completed.headers.get('location'),/auth=(?:failed|expired)$/);assert.equal(completed.headers.has('set-cookie'),false);
  assert.equal((await f.request('/api/auth/session',{session:active})).data.authenticated,false);if(action==='delete')assert.equal(await f.store.profile(s.user.id),null);
 }
});

test('migration rejects ambiguous legacy Discord mappings without changing accounts',async t=>{
 const f=await fixture(t),s=await f.signin(playerId);
 await f.db.query('INSERT INTO "Account"(id,"accountId","providerId","userId","createdAt","updatedAt") VALUES(\'ambiguous-link\',$1,\'discord\',$2,now(),now())',[outsiderId,s.user.id]);
 const {readFile}=await import('node:fs/promises');const sql=await readFile(new URL('./database/migrations/20261125_shared_discord.sql',import.meta.url),'utf8');
 await assert.rejects(f.db.exec(sql),/Ambiguous legacy Discord/);await f.db.query('ROLLBACK');
 assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "Account"')).rows[0].n,2);assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "VoidDiscordIdentity"')).rows[0].n,1);
});

test('identity transaction cannot restore a deleted account using another device\'s revoked initiating session',async t=>{
 const f=await fixture(t),s=await f.signin(playerId),sessionHash=digest(s.cookie.split('=')[1]);
 await f.store.deleteAccount(s.user.id);
 await assert.rejects(f.store.saveDiscord({discord_id:playerId,display_name:'Stale callback',avatar_hash:null},()=>true,sessionHash),/Sign-in ended/);
 assert.equal(await f.store.profile(s.user.id),null);assert.equal((await f.db.query('SELECT name FROM "User" WHERE id=$1',[s.user.id])).rows[0].name,'Deleted account');assert.equal((await f.db.query('SELECT COUNT(*)::int AS n FROM "VoidDiscordIdentity"')).rows[0].n,0);
});
