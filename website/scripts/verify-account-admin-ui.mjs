import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

// Browser contract checks use synthetic API replies. They never connect to
// Discord, a payment provider or a real database, and do not verify deployment.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist = path.join(root,'dist');
const results = [];
const visualWarnings = [];
const adminId = '123456789012345678', playerId = '223456789012345678';
const user = {id:'fixture-user',discord_id:playerId,displayName:'Fixture Player',provider:'discord'};
const admin = {id:'fixture-admin',discord_id:adminId,displayName:'Fixture Owner',provider:'discord'};
const csrf = 'fixture-csrf-value-for-browser-contract';
const items = [{id:'cape-origin',name:'Fixture Cape',kind:'cape',slot:'cape',price:19900,currency:'INR'},{id:'fixture-emote',name:'Fixture Emote',kind:'emote',slot:'emote',price:5000,currency:'INR'}];
const player = {discord_id:playerId,display_name:'Fixture Player',avatar_url:null,created_at:1700000000000,last_login:1700100000000,owned_count:1};
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const server = http.createServer(async(req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const candidate = path.resolve(dist,`.${pathname}`);
    const relative = path.relative(dist,candidate);
    if(relative.startsWith('..') || path.isAbsolute(relative)) {res.writeHead(404);res.end();return;}
    let file = candidate;
    if(!path.extname(pathname)) file = path.join(dist,'index.html');
    const data = await readFile(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});res.end(data);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const base = `http://127.0.0.1:${server.address().port}`;
let browser;

async function fixture(role = 'user') {
  const context = await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const state = {role,authenticated:role !== 'guest',requests:[],mutations:[],audit:[],equipped:[],tokens:[{id:'fixture-device',created_at:1700000000000,expires_at:1900000000000}],entitlements:[{id:'fixture-entitlement',item_id:'cape-origin',name:'Fixture Cape',kind:'cape',slot:'cape',source:'purchase',provider_payment_id:'fixture-payment',status:'active',granted_at:1700000000000,equipped:false}]};
  await context.route('**/api/**',async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    state.requests.push({path:url.pathname,method,query:url.search});
    const reply = (body,status = 200) => route.fulfill({status,contentType:'application/json',headers:{'Cache-Control':'no-store'},body:JSON.stringify(body)});
    if(method === 'POST') {
      assert.equal(request.headers()['x-csrf-token'],csrf,'Every website mutation sends its current CSRF value.');
      const body = request.postDataJSON();state.mutations.push({path:url.pathname,body});
      if(url.pathname === '/api/account/equip') {assert.equal(body.item_id,'cape-origin');state.equipped = [{slot:'cape',item_id:'cape-origin'}];state.entitlements[0].equipped = true;return reply({equipped:true});}
      if(url.pathname === '/api/account/unequip') {assert.equal(body.slot,'cape');state.equipped = [];state.entitlements[0].equipped = false;return reply({unequipped:true});}
      if(url.pathname === '/api/account/launcher-tokens/revoke') {assert.equal(body.id,'fixture-device');state.tokens = [];return reply({revoked:true});}
      if(url.pathname === '/api/account/delete') {assert.equal(body.confirm,true);state.authenticated = false;return reply({deleted:true});}
      if(url.pathname === '/api/auth/logout') {state.authenticated = false;return reply({signedOut:true});}
      if(url.pathname.endsWith('/grant')) {
        assert.equal(state.role,'admin');assert.equal(body.confirm,true);
        const active = state.entitlements.find(entry => entry.item_id === body.item_id && entry.status === 'active');
        const item = state.entitlements.find(entry => entry.item_id === body.item_id && entry.source === 'admin');
        if(!active && item) item.status = 'active';
        else if(!active) {const record = items.find(entry => entry.id === body.item_id);state.entitlements.push({...record,id:'fixture-admin-entitlement',item_id:record.id,source:'admin',status:'active',granted_at:1700200000000,equipped:false});}
        state.audit.push({id:state.audit.length+1,actor_id:adminId,player_id:playerId,item_id:body.item_id,action:'admin.grant',created_at:1700200000000,reason:body.note});
        return reply({granted:true});
      }
      if(url.pathname.endsWith('/revoke')) {
        assert.equal(state.role,'admin');assert.equal(body.confirm,true);assert.ok(body.reason);
        const item = state.entitlements.find(entry => entry.item_id === body.item_id);item.status = 'revoked';item.equipped = false;item.revoked_at = 1700200000000;
        state.audit.push({id:state.audit.length+1,actor_id:adminId,player_id:playerId,item_id:body.item_id,action:'admin.revoke',created_at:1700200000000,reason:body.reason});
        return reply({revoked:true});
      }
      throw new Error('Unexpected synthetic mutation.');
    }
    if(url.pathname === '/api/site') return reply({entries:[],downloadCount:0,downloadAvailable:false});
    if(url.pathname === '/api/auth/session') return reply({authenticated:state.authenticated,...(state.authenticated ? {user:state.role === 'admin' ? admin : user,csrfToken:csrf} : {}),providers:{discord:{available:true},xbox:{available:true}}});
    if(url.pathname === '/api/catalogue') return reply({items,purchasing_live:false});
    if(url.pathname === '/api/account') {if(state.denyAccount) {state.authenticated = false;return reply({error:'Your session ended.',code:'auth_required'},401);}return reply({user,entitlements:state.entitlements,equipped:state.equipped,launcher_tokens:state.tokens});}
    if(url.pathname.startsWith('/api/admin/')) {
      if(state.role !== 'admin') return reply({error:'Administrator access is forbidden.',code:'admin_required'},403);
      if(url.pathname === '/api/admin/session') return reply({user:admin,csrfToken:csrf});
      if(url.pathname === '/api/admin/catalogue') return reply({items});
      if(url.pathname === `/api/admin/players/${playerId}`) return reply({player,entitlements:state.entitlements,payments:[{provider_payment_id:'fixture-payment',amount:19900,currency:'INR',status:'paid',created_at:1700000000000}]});
      if(url.pathname === '/api/admin/audit') return reply({entries:state.audit,total:state.audit.length,page:Number(url.searchParams.get('page') || 1),page_size:25});
      if(url.pathname === '/api/admin/players') {
        const page = Number(url.searchParams.get('page') || 1), query = url.searchParams.get('q');
        return reply({players:query && !player.display_name.includes(query) && !playerId.includes(query) ? [] : [player],total:query ? 1 : 26,page,page_size:25});
      }
    }
    throw new Error('Unexpected synthetic endpoint.');
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror',error => errors.push(error.message));
  return {page,context,state,errors};
}
async function loaded(page,label) {await page.getByRole('heading',{name:label,exact:true}).waitFor();await page.getByText('Loading records…',{exact:true}).waitFor({state:'hidden'});}
async function viewportCheck(page,name) {
  await mkdir(path.join(root,'qa'),{recursive:true});
  for(const width of [1440,1024,768,390,320]) {
    await page.setViewportSize({width,height:width < 500 ? 844 : 900});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),true,`${name} fits ${width}px without document overflow.`);
    await page.evaluate(() => {document.activeElement?.blur?.();window.scrollTo({top:0,behavior:'instant'});});
    if(width === 1440 || width === 390) {
      try {await page.screenshot({path:path.join(root,'qa',name.toLowerCase().replaceAll(' ','-')+'-'+width+'.png'),fullPage:true,timeout:15000});}
      catch {visualWarnings.push(`${name} at ${width}px: screenshot capture NOT VERIFIED.`);}
    }
    const collision = await page.locator('button:visible').evaluateAll(elements => elements.filter(element => {const box = element.getBoundingClientRect();return box.width > 0 && box.height < 43.5;}).length);
    assert.equal(collision,0,`${name} buttons retain 44px targets at ${width}px.`);
  }
}
try {
  browser = await chromium.launch({channel:'chrome',headless:true});
  {
    const f = await fixture('guest');await f.page.goto(`${base}/account`);
    const xbox = f.page.getByRole('button',{name:'Xbox · Coming soon'});await xbox.waitFor();assert.equal(await xbox.isDisabled(),true);
    await xbox.evaluate(element => element.click());assert.equal(f.state.requests.some(request => request.path.includes('xbox')),false);
    assert.equal(await f.page.locator('a[href^="/admin"]').count(),0);
    await viewportCheck(f.page,'Guest account');f.state.authenticated = true;f.state.denyAccount = true;await f.page.reload();await f.page.getByText('Your session ended.',{exact:true}).waitFor();assert.equal(await f.page.getByRole('button',{name:'Continue with Discord',exact:true}).isEnabled(),true);
    assert.deepEqual(f.errors,[]);await f.context.close();results.push('Guest Discord options: Xbox disabled, no Xbox request, no public admin link, recover after account-session expiry; responsive targets checked.');
  }
  {
    const f = await fixture();f.state.entitlements.push({...f.state.entitlements[0],id:'duplicate-fixture-purchase'},{id:'fixture-slotless',item_id:'slotless-cape',name:'Fixture display-only cape',kind:'cape',slot:null,source:'admin',status:'active',granted_at:1700200000000});await f.page.goto(`${base}/account`);await f.page.getByRole('button',{name:'Equip item',exact:true}).waitFor();
    assert.equal(await f.page.locator('.user-item-row').filter({hasText:'Fixture Cape'}).count(),1,'Multiple active purchases for one item display once in owned items.');
    assert.equal(await f.page.locator('.user-item-row').filter({hasText:'Fixture display-only cape'}).getByRole('button').count(),0,'A cosmetic without a server-assigned slot has no equip action.');
    await f.page.getByRole('button',{name:'Equip item',exact:true}).click();await f.page.getByRole('button',{name:'Unequip item',exact:true}).waitFor();
    await f.page.getByRole('button',{name:'Unequip item',exact:true}).click();await f.page.getByRole('button',{name:'Equip item',exact:true}).waitFor();
    const beforeToken = f.state.mutations.length;await f.page.getByRole('button',{name:'Revoke access',exact:true}).click();assert.equal(f.state.mutations.length,beforeToken);
    await f.page.getByRole('button',{name:'Confirm revocation',exact:true}).click();await f.page.getByText('No active launcher sessions.',{exact:true}).waitFor();
    f.state.entitlements.forEach(item => {item.status = 'revoked';});await f.page.getByRole('button',{name:'Refresh account',exact:true}).click();await f.page.getByText('You do not own any items yet.',{exact:true}).waitFor();
    const beforeDelete = f.state.mutations.length;await f.page.getByRole('button',{name:'Delete account',exact:true}).click();assert.equal(f.state.mutations.length,beforeDelete);
    await f.page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await f.page.getByRole('button',{name:'Confirm deletion',exact:true}).count(),0);
    await viewportCheck(f.page,'Signed-in account');assert.deepEqual(f.errors,[]);await f.context.close();results.push('Account synthetic contract: equip/unequip, refresh after removal, confirmed token revocation, deletion review/cancel, CSRF header; responsive targets checked.');
  }
  {
    const f = await fixture();await f.page.goto(`${base}/admin`);await loaded(f.page,'Administrator access denied');
    assert.equal(f.state.requests.some(request => request.path.startsWith('/api/admin/') && request.path !== '/api/admin/session'),false);
    assert.equal(await f.page.getByRole('table').count(),0);assert.deepEqual(f.errors,[]);await f.context.close();results.push('Non-admin synthetic 403: denied screen and no player/catalogue/audit data requests.');
  }
  {
    const f = await fixture('admin');await f.page.goto(`${base}/admin`);await loaded(f.page,'Players');
    await f.page.getByRole('button',{name:'Next page',exact:true}).click();await f.page.getByText('Page 2 of 2 · 26 records',{exact:true}).waitFor();
    await f.page.getByLabel('Search name or Discord ID').fill(playerId);await f.page.getByRole('button',{name:'Search players',exact:true}).click();await f.page.getByText('Page 1 of 1 · 1 records',{exact:true}).waitFor();
    await f.page.getByLabel('Sort by').selectOption('display_name');await f.page.getByText('Loading records…',{exact:true}).waitFor({state:'hidden'});
    assert.ok(f.state.requests.some(request => request.path === '/api/admin/players' && new URLSearchParams(request.query).get('q') === playerId));
    await viewportCheck(f.page,'Admin player list');
    await f.page.getByRole('link',{name:'Fixture Player',exact:true}).click();await loaded(f.page,'Player account');
    assert.equal(await f.page.getByRole('button',{name:/add administrator|create administrator|change password/i}).count(),0);
    await f.page.getByRole('button',{name:'Remove item',exact:true}).click();await f.page.getByText('This item was purchased. Removing it does not refund the payment.',{exact:true}).waitFor();
    assert.equal(f.state.mutations.length,0);assert.equal(await f.page.getByRole('button',{name:'Confirm removal',exact:true}).isDisabled(),true);
    await f.page.getByLabel('Reason for removal').fill('Fixture removal reason');await f.page.getByRole('button',{name:'Confirm removal',exact:true}).click();await f.page.getByText('revoked',{exact:true}).first().waitFor();
    await f.page.getByLabel('Catalogue item').selectOption('cape-origin');await f.page.getByLabel('Note Optional').fill('Fixture restoration note');
    await f.page.getByRole('button',{name:'Review grant',exact:true}).click();assert.equal(f.state.mutations.length,1);
    await f.page.getByRole('button',{name:'Confirm grant',exact:true}).click();await f.page.getByText('active',{exact:true}).first().waitFor();
    assert.equal(f.state.mutations.length,2);assert.equal(f.state.audit.length,2);
    await f.page.getByRole('button',{name:'Remove item',exact:true}).click();await f.page.getByText('This item was purchased. Removing it does not refund the payment.',{exact:true}).waitFor();await f.page.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(f.state.mutations.length,2);
    await f.page.getByRole('cell',{name:'₹199.00',exact:true}).waitFor();
    await viewportCheck(f.page,'Admin player detail');
    await f.page.getByRole('link',{name:'Audit log',exact:true}).click();await loaded(f.page,'Administrator audit log');
    await f.page.getByText('Fixture removal reason',{exact:true}).waitFor();await f.page.getByText('Fixture restoration note',{exact:true}).waitFor();
    await viewportCheck(f.page,'Admin audit');assert.deepEqual(f.errors,[]);await f.context.close();results.push('Admin synthetic contract: search/sort/page, player detail, read-only payment table, purchased removal warning, reason/confirmation, re-grant, audit view, CSRF header; responsive targets checked.');
  }
  {
    const f = await fixture('guest');await f.page.goto(`${base}/store`);await f.page.getByRole('heading',{name:'Fixture Cape',exact:true}).waitFor();
    await f.page.getByText('₹199.00',{exact:true}).waitFor();
    await f.page.getByText('Real purchasing is not live.',{exact:true}).waitFor();assert.equal(await f.page.locator('canvas').count(),0);
    assert.equal(await f.page.getByRole('button',{name:/buy|purchase/i}).count(),0);
    await f.page.getByRole('link',{name:/Fixture Cape/}).click();await f.page.getByRole('button',{name:'Purchases unavailable',exact:true}).waitFor();
    assert.equal(await f.page.getByRole('button',{name:'Purchases unavailable',exact:true}).isDisabled(),true);
    assert.equal(await f.page.locator('.player-preview').count(),0);assert.equal(f.state.mutations.length,0);
    await viewportCheck(f.page,'Store catalogue detail');assert.deepEqual(f.errors,[]);await f.context.close();results.push('Store synthetic catalogue only: returned items, disabled purchasing, no player/Minecraft preview, no grant request; responsive targets checked.');
  }
  await mkdir(path.join(root,'qa'),{recursive:true});
  await writeFile(path.join(root,'qa','account-admin-ui-results.json'),JSON.stringify({verification:'Synthetic browser contract checks only; user and deployment verification pending.',checks:results,visualWarnings},null,2));
  console.log(`PASS: ${results.length} browser contract groups using synthetic API responses. Live user verification remains pending.`);
  if(visualWarnings.length) console.log(`NOT VERIFIED: ${visualWarnings.length} screenshot captures; see the excluded QA results.`);
} finally {
  await browser?.close();server.closeAllConnections();await new Promise(resolve => server.close(resolve));
}
