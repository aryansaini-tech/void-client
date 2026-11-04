import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import Stripe from 'stripe';

const databaseUrl=process.env.TEST_DATABASE_URL;
test('PostgreSQL authentication, authorization and payment integration', {skip:!databaseUrl,timeout:120000},async t=>{
  assert.ok(databaseUrl);assert.match(new URL(databaseUrl).pathname,/_test$/,'Integration tests require a dedicated database ending in _test.');
  process.env.DATABASE_URL=databaseUrl;process.env.NODE_ENV='test';process.env.BETTER_AUTH_SECRET=`TEST-ONLY-${randomUUID()}-${randomUUID()}`;
  process.env.BETTER_AUTH_URL='http://localhost:3001';process.env.AUTH_COOKIE_DOMAIN='';process.env.SMTP_HOST='127.0.0.1';process.env.SMTP_PORT='2526';process.env.SMTP_SECURE='false';process.env.EMAIL_FROM='Void Test <noreply@example.test>';
  // Authorization-URL and rejection checks only: these are not real credentials
  // and the suite never exchanges a code or calls Microsoft's servers.
  process.env.MICROSOFT_CLIENT_ID='00000000-1111-4222-8333-000000000000';
  process.env.MICROSOFT_CLIENT_SECRET='TEST-ONLY-NO-MICROSOFT-PROVIDER-CALLS';
  process.env.MICROSOFT_TENANT_ID='consumers';
  process.env.STRIPE_SECRET_KEY='sk_test_local_fixture_no_provider_calls';process.env.STRIPE_WEBHOOK_SECRET=`whsec_test_${randomUUID()}`;
  const [{getDatabase},{getAuth,getSession},{decryptEmail,deliverNextEmail},{rateLimit},{processPaymentEvent:applyPaymentEvent,verifyPaymentEvent},{GET,POST}]=await Promise.all([import('../../backend/src/database'),import('../../backend/src/auth'),import('../../backend/src/mail'),import('../../backend/src/security'),import('../../backend/src/commerce'),import('../../apps/account/src/app/api/auth/[...all]/route')]);
  const db=getDatabase();const email=`integration-${randomUUID()}@example.test`;const password='TEST-only-long-passphrase-314';let cookie='';let userId='';let orderId='';let productId='';let categoryId='';let message='';
  // A local SMTP sink: accepts test messages only, never forwards email.
  const smtp=createServer(socket=>{socket.setEncoding('utf8');socket.write('220 localhost Void test sink\r\n');let buffer='',data=false;socket.on('data',chunk=>{buffer+=chunk;while(buffer.includes('\r\n')){const end=buffer.indexOf('\r\n');const line=buffer.slice(0,end);buffer=buffer.slice(end+2);if(data){if(line==='.'){data=false;socket.write('250 Accepted for local test\r\n');}else message+=line+'\n';continue;}if(/^EHLO|^HELO/.test(line))socket.write('250-localhost\r\n250 8BITMIME\r\n');else if(/^MAIL FROM|^RCPT TO|^RSET|^NOOP/.test(line))socket.write('250 OK\r\n');else if(line==='DATA'){data=true;socket.write('354 End with dot\r\n');}else if(line==='QUIT'){socket.end('221 Bye\r\n');}else socket.write('250 OK\r\n');}});});
  await new Promise<void>(resolve=>smtp.listen(2526,'127.0.0.1',resolve));
  const started=new Date();const mailIds=new Set<string>();const eventIds=new Set<string>();let settledEvent:Stripe.Event|undefined;
  async function processPaymentEvent(event:Stripe.Event){eventIds.add(event.id);return applyPaymentEvent(event);}
  function testMail(job:{payload:string}){try{const mail=decryptEmail(job.payload);return mail.to===email?mail:null;}catch{return null;}}
  const ipSegment=1+parseInt(randomUUID().slice(0,2),16)%250;let requestNumber=0;
  async function authRequest(path:string,body:unknown,withCookie=''){requestNumber++;return POST(new Request(`http://localhost:3001/api/auth/${path}`,{method:'POST',headers:{origin:'http://localhost:3001','content-type':'application/json','x-real-ip':`127.0.${ipSegment}.${requestNumber}`,...(withCookie?{cookie:withCookie}:{})},body:JSON.stringify(body)}));}
  try{
    await t.test('registration hashes the password, queues email, and blocks unverified login',async()=>{const response=await authRequest('sign-up/email',{name:'TEST FIXTURE',email,password,callbackURL:'http://localhost:3001/login'});assert.ok(response.ok,await response.text());const user=await db.user.findUniqueOrThrow({where:{email}});userId=user.id;assert.equal(user.emailVerified,false);const account=await db.account.findFirstOrThrow({where:{userId,providerId:'credential'}});assert.notEqual(account.password,password);assert.ok((account.password?.length??0)>50);const signIn=await authRequest('sign-in/email',{email,password});assert.equal(signIn.status,403);});
    await t.test('verification email is delivered to local SMTP and verifies the account',async()=>{const jobs=await db.emailOutbox.findMany({where:{status:'PENDING'},orderBy:{createdAt:'asc'}});const job=jobs.find(job=>Boolean(testMail(job)));assert.ok(job);const content=decryptEmail(job.payload);const link=content.text.match(/http:\/\/localhost:3001\/api\/auth\/verify-email[^\s]+/)?.[0];assert.ok(link);mailIds.add(job.id);await deliverNextEmail(job.id);assert.ok(message.includes('Message-ID:')||message.includes('Message-Id:'));const response=await GET(new Request(link));assert.ok(response.status===302||response.ok);assert.equal((await db.user.findUniqueOrThrow({where:{id:userId}})).emailVerified,true);});
    await t.test('login establishes an HttpOnly session and forged cookies fail',async()=>{const response=await authRequest('sign-in/email',{email,password});assert.ok(response.ok,await response.text());const cookies=response.headers.getSetCookie();assert.ok(cookies.some(value=>/HttpOnly/i.test(value)));cookie=cookies.map(value=>value.split(';')[0]).join('; ');const session=await getSession(new Headers({cookie}));assert.equal(session?.user.id,userId);assert.equal(await getSession(new Headers({cookie:'void.session_token=forged-token'})),null);});
    await t.test('Microsoft authorization uses state and PKCE; cancellation never creates a session',async()=>{
      const before=await db.session.count();
      const response=await authRequest('sign-in/social',{provider:'microsoft',callbackURL:'http://localhost:3001/dashboard',errorCallbackURL:'http://localhost:3001/login',disableRedirect:true});
      assert.equal(response.status,200);
      const body=await response.json();
      const url=new URL(body.url);
      assert.equal(url.origin,'https://login.microsoftonline.com');
      assert.equal(url.pathname,'/consumers/oauth2/v2.0/authorize');
      assert.equal(url.searchParams.get('redirect_uri'),'http://localhost:3001/api/auth/callback/microsoft');
      assert.equal(url.searchParams.get('response_type'),'code');
      assert.equal(url.searchParams.get('code_challenge_method'),'S256');
      assert.ok((url.searchParams.get('code_challenge')?.length??0)>=43);
      assert.ok((url.searchParams.get('state')?.length??0)>=24);
      assert.deepEqual(url.searchParams.get('scope')?.split(' ').sort(),['email','openid','profile']);
      assert.equal(body.url.includes(process.env.MICROSOFT_CLIENT_SECRET!),false);
      const stateCookies=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
      const cancelled=await GET(new Request(`http://localhost:3001/api/auth/callback/microsoft?error=access_denied&state=${encodeURIComponent(url.searchParams.get('state')!)}`,{headers:{cookie:stateCookies}}));
      const location=new URL(cancelled.headers.get('location')!);
      assert.equal(location.origin,'http://localhost:3001');
      assert.equal(location.pathname,'/login');
      assert.equal(location.searchParams.get('error'),'access_denied');
      assert.equal(await db.session.count(),before);
    });
    await t.test('Microsoft rejects forged tokens, untrusted redirects and missing or tampered callback state',async()=>{
      const before=await db.session.count();
      const forged=await authRequest('sign-in/social',{provider:'microsoft',idToken:{token:'TEST-FORGED-ID-TOKEN'},callbackURL:'http://localhost:3001/dashboard'});
      assert.equal(forged.ok,false);
      const redirect=await authRequest('sign-in/social',{provider:'microsoft',callbackURL:'https://untrusted.example/steal',disableRedirect:true});
      assert.equal(redirect.status,403);
      const crossSite=await POST(new Request('http://localhost:3001/api/auth/sign-in/social',{method:'POST',headers:{origin:'https://untrusted.example','content-type':'application/json'},body:JSON.stringify({provider:'microsoft',callbackURL:'http://localhost:3001/dashboard'})}));
      assert.equal(crossSite.status,403);
      for(const query of ['code=TEST-FAKE-CODE','code=TEST-FAKE-CODE&state=TEST-FORGED-STATE']){
        const result=await GET(new Request(`http://localhost:3001/api/auth/callback/microsoft?${query}`));
        assert.ok([302,303].includes(result.status));
        assert.equal(new URL(result.headers.get('location')!).pathname,'/login');
        assert.ok(new URL(result.headers.get('location')!).searchParams.get('error'));
      }
      assert.equal(await db.session.count(),before);
    });
    await t.test('Microsoft linking requires a verified fresh session and missing setup fails clearly',async()=>{
      const link={provider:'microsoft',callbackURL:'http://localhost:3001/security',disableRedirect:true};
      assert.equal((await authRequest('link-social',link)).status,401);
      const session=await getSession(new Headers({cookie}));assert.ok(session);
      await db.user.update({where:{id:userId},data:{emailVerified:false}});
      try{assert.equal((await authRequest('link-social',link,cookie)).status,403);}
      finally{await db.user.update({where:{id:userId},data:{emailVerified:true}});}
      await db.session.update({where:{id:session.session.id},data:{createdAt:new Date(Date.now()-660_000)}});
      try{assert.equal((await authRequest('link-social',link,cookie)).status,401);}
      finally{await db.session.update({where:{id:session.session.id},data:{createdAt:session.session.createdAt}});}
      const secret=process.env.MICROSOFT_CLIENT_SECRET;
      delete process.env.MICROSOFT_CLIENT_SECRET;
      try{const unavailable=await authRequest('sign-in/social',{provider:'microsoft'});assert.equal(unavailable.status,503);assert.equal((await unavailable.json()).code,'MICROSOFT_UNAVAILABLE');}
      finally{process.env.MICROSOFT_CLIENT_SECRET=secret;}
    });
    await t.test('a Discord connection cannot permit removing the only usable sign-in method',async()=>{
      const credential=await db.account.findFirstOrThrow({where:{userId,providerId:'credential'}});
      const microsoft=await db.account.create({data:{userId,providerId:'microsoft',accountId:'TEST-ONLY-'+randomUUID()}});
      const discord=await db.account.create({data:{userId,providerId:'discord',accountId:'TEST-ONLY-'+randomUUID()}});
      try{
        await db.account.update({where:{id:credential.id},data:{password:null}});
        const blocked=await authRequest('unlink-account',{accountId:microsoft.id},cookie);
        assert.equal(blocked.status,400);assert.equal((await blocked.json()).code,'LAST_SIGN_IN_METHOD');
        const formAttempt=await POST(new Request('http://localhost:3001/api/auth/unlink-account',{method:'POST',headers:{origin:'http://localhost:3001','content-type':'application/x-www-form-urlencoded',cookie},body:`accountId=${microsoft.id}`}));
        assert.equal(formAttempt.status,415);
        await db.account.update({where:{id:credential.id},data:{password:credential.password}});
        assert.equal((await authRequest('unlink-account',{accountId:credential.id},cookie)).status,400);
        assert.equal((await authRequest('unlink-account',{accountId:microsoft.id},cookie)).status,200);
        assert.equal(await db.account.findUnique({where:{id:microsoft.id}}),null);
      }finally{
        await db.account.update({where:{id:credential.id},data:{password:credential.password}});
        await db.account.deleteMany({where:{id:{in:[microsoft.id,discord.id]}}});
      }
    });
    await t.test('an account without a password can add email sign-in through a real recovery token',async()=>{
      const socialEmail='social-fixture-'+randomUUID()+'@example.test';
      const social=await db.user.create({data:{name:'TEST SOCIAL FIXTURE',email:socialEmail,emailVerified:true,accounts:{create:{providerId:'microsoft',accountId:'TEST-ONLY-'+randomUUID()}}}});
      try{
        assert.equal((await authRequest('request-password-reset',{email:socialEmail,redirectTo:'http://localhost:3001/reset-password'})).status,200);
        const jobs=await db.emailOutbox.findMany({where:{createdAt:{gte:started}}});
        const job=jobs.find(candidate=>{try{return decryptEmail(candidate.payload).to===socialEmail;}catch{return false;}});assert.ok(job);mailIds.add(job.id);
        const link=decryptEmail(job.payload).text.match(/http:\/\/localhost:3001\/[^\s]+/)?.[0];assert.ok(link);
        const reset=await GET(new Request(link));const token=new URL(reset.headers.get('location')!).searchParams.get('token');assert.ok(token);
        const newPassword='TEST-SOCIAL-NEW-password-721';
        assert.equal((await authRequest('reset-password',{token,newPassword})).status,200);
        const credential=await db.account.findFirstOrThrow({where:{userId:social.id,providerId:'credential'}});
        assert.ok(credential.password);assert.notEqual(credential.password,newPassword);
        assert.equal((await authRequest('sign-in/email',{email:socialEmail,password:newPassword})).status,200);
      }finally{await db.user.delete({where:{id:social.id}});}
    });
    await t.test('profile mutations require the correct origin and an authenticated owner',async()=>{
      const {PATCH}=await import('../../apps/account/src/app/api/profile/route');
      const body=JSON.stringify({name:'TEST UPDATED PLAYER',bio:'A test profile.',minecraftName:''});
      const request=(origin:string,sessionCookie:string)=>new Request('http://localhost:3001/api/profile',{method:'PATCH',headers:{origin,'content-type':'application/json',cookie:sessionCookie},body});
      assert.equal((await PATCH(request('https://untrusted.example',''))).status,403);
      assert.equal((await PATCH(request('http://localhost:3001',''))).status,401);
      assert.equal((await PATCH(request('http://localhost:3001',cookie))).status,200);
      assert.equal((await db.user.findUniqueOrThrow({where:{id:userId}})).name,'TEST UPDATED PLAYER');
    });
    await t.test('account cart updates reject stale and concurrent revisions',async()=>{
      const {GET:getCart,PUT:updateCart}=await import('../../apps/store/src/app/api/cart/route');
      const category=await db.productCategory.create({data:{slug:'cart-test-'+randomUUID(),name:'TEST CATEGORY ONLY'}});
      const product=await db.product.create({data:{slug:'cart-test-'+randomUUID(),name:'TEST FIXTURE ONLY',description:'Disposable cart test.',price:1250,currency:'usd',published:true,available:true,categoryId:category.id}});
      try {
        assert.equal((await getCart(new Request('http://localhost:3002/api/cart'))).status,401);
        const update=(quantity:number,revision:number)=>updateCart(new Request('http://localhost:3002/api/cart',{method:'PUT',headers:{origin:'http://localhost:3002','content-type':'application/json',cookie},body:JSON.stringify({items:[{productId:product.id,quantity}],revision})}));
        assert.equal((await update(1,0)).status,200);
        assert.equal((await update(2,0)).status,409);
        const outcomes=await Promise.all([update(2,1),update(3,1)]);
        assert.deepEqual(outcomes.map(result=>result.status).sort(),[200,409]);
        const cart=await db.cart.findUniqueOrThrow({where:{userId},include:{items:true}});
        assert.equal(cart.revision,2);
        assert.equal(cart.items[0]?.quantity,outcomes[0]?.status===200?2:3);
      } finally {
        await db.cartItem.deleteMany({where:{productId:product.id}});
        await db.product.delete({where:{id:product.id}});
        await db.productCategory.delete({where:{id:category.id}});
      }
    });
    await t.test('incorrect and unknown credentials return the same public error',async()=>{
      const known=await authRequest('sign-in/email',{email,password:'TEST-wrong-passphrase'});
      const unknown=await authRequest('sign-in/email',{email:'missing-'+randomUUID()+'@example.test',password:'TEST-wrong-passphrase'});
      assert.equal(known.status,401);assert.equal(unknown.status,401);
      assert.equal((await known.json()).code,(await unknown.json()).code);
    });
    await t.test('duplicate registration does not expose the existing identity',async()=>{
      const response=await authRequest('sign-up/email',{name:'TEST GENERIC RESPONSE',email,password,callbackURL:'http://localhost:3001/login'});
      assert.equal(response.status,200);const body=await response.json();
      assert.equal(body.token,null);assert.notEqual(body.user.id,userId);
      assert.equal(await db.user.count({where:{email}}),1);
    });
    await t.test('shared rate limits remain atomic under concurrent requests',async()=>{const results=await Promise.allSettled(Array.from({length:10},()=>rateLimit('integration',email,3,60)));assert.equal(results.filter(result=>result.status==='fulfilled').length,3);assert.ok(results.filter(result=>result.status==='rejected').every(result=>result.status==='rejected'&&result.reason.status===429));});
    await t.test('an order remains pending until a valid signed, matching provider event',async()=>{const category=await db.productCategory.create({data:{name:'TEST FIXTURE ONLY',slug:`test-${randomUUID()}`}});categoryId=category.id;const product=await db.product.create({data:{slug:`test-${randomUUID()}`,name:'TEST FIXTURE — NOT FOR SALE',description:'Disposable integration-test record only.',price:1250,currency:'usd',stripePriceId:`price_test_${randomUUID().replaceAll('-','')}`,categoryId,published:false,available:false}});productId=product.id;const order=await db.order.create({data:{userId,subtotal:1250,total:1250,currency:'usd',checkoutKey:`test-${randomUUID()}`,cartFingerprint:'test',termsAcceptedAt:new Date(),termsUrl:'https://example.test/terms',stripeSessionId:'cs_test_local_fixture',items:{create:{productId,name:product.name,quantity:1,unitPrice:1250,stripePriceId:product.stripePriceId!}}}});orderId=order.id;
      const cart=await db.cart.upsert({where:{userId},create:{userId},update:{}});await db.cartItem.create({data:{cartId:cart.id,productId,quantity:2}});
      const event={id:`evt_test_${randomUUID()}`,object:'event',type:'checkout.session.completed',data:{object:{id:'cs_test_local_fixture',object:'checkout.session',metadata:{orderId,userId},client_reference_id:userId,payment_status:'paid',currency:'usd',amount_subtotal:1250,amount_total:1250,total_details:{amount_tax:0,amount_shipping:0,amount_discount:0},payment_intent:'pi_test_local_fixture'}}};
      const payload=JSON.stringify(event);assert.throws(()=>verifyPaymentEvent(payload,'invalid-signature'));assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).status,'PENDING');
      const stripe=new Stripe(process.env.STRIPE_SECRET_KEY!);const signature=stripe.webhooks.generateTestHeaderString({payload,secret:process.env.STRIPE_WEBHOOK_SECRET!});const verified=verifyPaymentEvent(payload,signature);settledEvent=verified;await processPaymentEvent(verified);assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).status,'PAID');await processPaymentEvent(verified);assert.equal(await db.payment.count({where:{orderId}}),1);await processPaymentEvent({...verified,id:'evt_second_success_'+randomUUID()});assert.equal((await db.cartItem.findFirstOrThrow({where:{productId}})).quantity,1);
      const expired={...event,id:`evt_test_${randomUUID()}`,type:'checkout.session.expired'} as unknown as Stripe.Event;await processPaymentEvent(expired);assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).status,'PAID');
    });
    await t.test('order APIs return only records owned by the authenticated account',async()=>{
      const {GET:readOrder}=await import('../../apps/store/src/app/api/orders/[id]/route');
      const stranger=await db.user.create({data:{name:'TEST OTHER OWNER',email:'other-'+randomUUID()+'@example.test',emailVerified:true}});
      const other=await db.order.create({data:{userId:stranger.id,subtotal:0,total:0,currency:'usd',checkoutKey:'ownership-'+randomUUID(),cartFingerprint:'TEST-ONLY',termsAcceptedAt:new Date(),termsUrl:'https://example.test/terms'}});
      try {
        const read=(id:string,sessionCookie:string)=>readOrder(new Request('http://localhost:3002/api/orders/'+id,{headers:{cookie:sessionCookie}}),{params:Promise.resolve({id})});
        assert.equal((await read(orderId,'')).status,401);
        assert.equal((await read(other.id,cookie)).status,404);
        const response=await read(orderId,cookie);assert.equal(response.status,200);assert.equal((await response.json()).order.status,'PAID');
      } finally {await db.order.delete({where:{id:other.id}});await db.user.delete({where:{id:stranger.id}});}
    });
    await t.test('refunds are monotonic and late completion cannot reverse them',async()=>{
      const refund=(amount:number)=>({id:'evt_refund_'+randomUUID(),type:'charge.refunded',data:{object:{payment_intent:'pi_test_local_fixture',amount_refunded:amount,currency:'usd'}}}) as unknown as Stripe.Event;
      await processPaymentEvent(refund(500));assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).status,'PARTIALLY_REFUNDED');
      await processPaymentEvent(refund(100));assert.equal((await db.payment.findFirstOrThrow({where:{orderId}})).refundedAmount,500);
      await processPaymentEvent(refund(1250));assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).fulfillmentStatus,'REVOKED');
      assert.ok(settledEvent);await processPaymentEvent({...settledEvent,id:'evt_after_refund_'+randomUUID()});assert.equal((await db.order.findUniqueOrThrow({where:{id:orderId}})).status,'REFUNDED');
    });
    await t.test('password reset revokes sessions and reset tokens cannot be replayed',async()=>{const response=await authRequest('request-password-reset',{email,redirectTo:'http://localhost:3001/reset-password'});assert.ok(response.ok);const jobs=await db.emailOutbox.findMany({where:{status:'PENDING'},orderBy:{createdAt:'desc'}});const job=jobs.find(job=>testMail(job)?.subject.includes('Reset'));assert.ok(job);const link=decryptEmail(job.payload).text.match(/http:\/\/localhost:3001\/[^\s]+/)?.[0];assert.ok(link);const redirected=await GET(new Request(link));const target=redirected.headers.get('location');assert.ok(target);const token=new URL(target).searchParams.get('token');assert.ok(token);const result=await authRequest('reset-password',{token,newPassword:'TEST-only-new-passphrase-718'});assert.ok(result.ok,await result.text());assert.equal(await getSession(new Headers({cookie})),null);const replay=await authRequest('reset-password',{token,newPassword:'TEST-only-another-passphrase'});assert.equal(replay.ok,false);});
    await t.test('sign-out revokes a real session',async()=>{const response=await authRequest('sign-in/email',{email,password:'TEST-only-new-passphrase-718'});assert.ok(response.ok);cookie=response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');const result=await authRequest('sign-out',{},cookie);assert.ok(result.ok);assert.equal(await getSession(new Headers({cookie})),null);});
    assert.ok(getAuth());
  }finally{
    // Remove only this test's explicitly tracked records, never reset the database.
    if(eventIds.size)await db.paymentEvent.deleteMany({where:{id:{in:[...eventIds]}}});
    const mailJobs=await db.emailOutbox.findMany({where:{createdAt:{gte:started}}});for(const job of mailJobs){if(testMail(job))mailIds.add(job.id);}if(mailIds.size)await db.emailOutbox.deleteMany({where:{id:{in:[...mailIds]}}});
    if(orderId){await db.payment.deleteMany({where:{orderId}});await db.orderItem.deleteMany({where:{orderId}});await db.order.deleteMany({where:{id:orderId}});}
    if(productId)await db.product.deleteMany({where:{id:productId}});if(categoryId)await db.productCategory.deleteMany({where:{id:categoryId}});if(userId)await db.user.deleteMany({where:{id:userId}});
    await new Promise<void>(resolve=>smtp.close(()=>resolve()));await db.$disconnect();
  }
});
