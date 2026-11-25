import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
const one=async(db,sql,args)=>(await db.query(sql,args)).rows[0];
export function verifyStripeEvent(raw,signature,secret,now=Date.now){
 if(!secret)throw new Error('unconfigured');
 if(typeof signature!=='string'||signature.length>2048)throw new Error('invalid_signature');
 const fields=signature.split(',').map(s=>s.split('=')),ts=fields.filter(p=>p[0]==='t');
 if(ts.length!==1||!/^\d+$/.test(ts[0][1])||Math.abs(now()/1000-Number(ts[0][1]))>300)throw new Error('invalid_signature');
 const expected=createHmac('sha256',secret).update(`${ts[0][1]}.`).update(raw).digest();
 if(!fields.some(([key,v])=>key==='v1'&&/^[0-9a-f]{64}$/.test(v||'')&&timingSafeEqual(expected,Buffer.from(v,'hex'))))throw new Error('invalid_signature');
 const event=JSON.parse(raw.toString('utf8'));if(typeof event.id!=='string'||event.id.length>200||typeof event.type!=='string'||!event.data?.object)throw new Error('invalid_event');return event;
}
// No browser endpoint can invoke this; only a verified Stripe payload reaches here.
export async function processStripeEvent(db,event,{now=Date.now,HttpError}){
 const supported=['checkout.session.completed','checkout.session.async_payment_succeeded','charge.refunded'];
 if(!supported.includes(event.type))return {received:true,ignored:true};
 return db.transaction(async tx=>{
  await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))',[event.id]);
  const previous=await one(tx,'SELECT id FROM "PaymentEvent" WHERE id=$1',[event.id]);
  const checkout=event.data.object;
  if(event.type==='charge.refunded'){
   const paymentId=typeof checkout.payment_intent==='string'?checkout.payment_intent:checkout.payment_intent?.id;
   const payment=await one(tx,'SELECT * FROM "Payment" WHERE "providerPaymentId"=$1 FOR UPDATE',[paymentId??'']);
   if(!payment)throw new HttpError(409,'payment_missing','Payment has not been recorded yet.');
   if(checkout.currency!==payment.currency||!Number.isSafeInteger(checkout.amount_refunded)||checkout.amount_refunded<0||checkout.amount_refunded>payment.amount)throw new HttpError(400,'payment_mismatch','Refund does not match payment.');
   const refunded=Math.max(checkout.amount_refunded,payment.refundedAmount),full=refunded===payment.amount;
   await tx.query('UPDATE "Payment" SET "refundedAmount"=$2,status=$3,"updatedAt"=$4 WHERE id=$1',[payment.id,refunded,full?'refunded':'partially_refunded',new Date(now())]);
   await tx.query('UPDATE "Order" SET status=$2,"fulfillmentStatus"=CASE WHEN $3 THEN \'REVOKED\'::"FulfillmentStatus" ELSE "fulfillmentStatus" END,"updatedAt"=$4 WHERE id=$1',[payment.orderId,full?'REFUNDED':'PARTIALLY_REFUNDED',full,new Date(now())]);
   if(full){await tx.query('UPDATE "VoidEntitlement" SET status=\'revoked\',revoked_at=$2,reason=\'Provider refund\' WHERE provider_payment_id=$1 AND status=\'active\'',[paymentId,new Date(now())]);await tx.query('DELETE FROM "VoidEquipped" q WHERE EXISTS(SELECT 1 FROM "VoidEntitlement" e WHERE e.provider_payment_id=$1 AND e.user_id=q.user_id AND e.item_id=q.item_id) AND NOT EXISTS(SELECT 1 FROM "VoidEntitlement" e WHERE e.user_id=q.user_id AND e.item_id=q.item_id AND e.status=\'active\')',[paymentId]);}
  }else{
   if(!checkout.metadata?.orderId)return {received:true,ignored:true};
   const order=await one(tx,'SELECT * FROM "Order" WHERE id=$1 FOR UPDATE',[checkout.metadata.orderId]);
   if(!order)throw new HttpError(409,'order_missing','Order has not been recorded yet.');
   if(checkout.metadata?.userId!==order.userId||checkout.client_reference_id!==order.userId||!order.stripeSessionId||order.stripeSessionId!==checkout.id)throw new HttpError(400,'payment_mismatch','Payment does not match order.');
   if(checkout.payment_status!=='paid')return {received:true,ignored:true};
   const paymentId=typeof checkout.payment_intent==='string'?checkout.payment_intent:checkout.payment_intent?.id;
   const tax=checkout.total_details?.amount_tax??0;
   if(typeof paymentId!=='string'||paymentId.length>200||checkout.currency!==order.currency||!Number.isSafeInteger(checkout.amount_total)||!Number.isSafeInteger(tax)||tax<0||checkout.amount_total!==order.subtotal+tax)throw new HttpError(400,'payment_mismatch','Payment totals do not match order.');
   const payment=await one(tx,'SELECT * FROM "Payment" WHERE "providerPaymentId"=$1 FOR UPDATE',[paymentId]);
   if(payment&&(payment.orderId!==order.id||payment.amount!==checkout.amount_total||payment.currency!==checkout.currency))throw new HttpError(400,'payment_mismatch','Payment reference conflicts with order.');
   if(!payment)await tx.query('INSERT INTO "Payment"(id,"orderId",provider,"providerPaymentId",amount,"refundedAmount",currency,status,"createdAt","updatedAt") VALUES($1,$2,\'stripe\',$3,$4,0,$5,\'paid\',$6,$6)',[randomUUID(),order.id,paymentId,checkout.amount_total,checkout.currency,new Date(now())]);
   if(payment?.refundedAmount||['REFUNDED','PARTIALLY_REFUNDED'].includes(order.status))return {received:true,ignored:true};
   const items=(await tx.query('SELECT "productId" FROM "OrderItem" WHERE "orderId"=$1',[order.id])).rows;
   if(!items.length)throw new HttpError(400,'order_empty','Order has no items.');
   // Redelivery of an old verified event can create missing extension rows. It cannot restore revoked rows.
   for(const item of items)await tx.query('INSERT INTO "VoidEntitlement"(id,user_id,item_id,source,provider_payment_id,status,granted_at) VALUES($1,$2,$3,\'purchase\',$4,\'active\',$5) ON CONFLICT(provider_payment_id,item_id) DO NOTHING',[randomUUID(),order.userId,item.productId,paymentId,new Date(now())]);
   await tx.query('UPDATE "Order" SET status=\'PAID\',"fulfillmentStatus"=\'FULFILLED\',tax=$2,total=$3,"updatedAt"=$4 WHERE id=$1',[order.id,tax,checkout.amount_total,new Date(now())]);
  }
  if(!previous)await tx.query('INSERT INTO "PaymentEvent"(id,type,"processedAt") VALUES($1,$2,$3)',[event.id,event.type,new Date(now())]);return {received:true,duplicate:Boolean(previous)};
 });
}
