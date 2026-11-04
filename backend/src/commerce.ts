import { createHash } from 'node:crypto';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { site } from '@void/shared/config';
import { quoteCart } from '@void/shared/commerce';
import { checkoutSchema } from '@void/shared/schemas';
import { getDatabase } from './database';
import { serverEnv, serviceState } from './env';
import { assertOrigin, HttpError, rateLimit, readJson, requireSession } from './security';

let stripe: Stripe | undefined;
export function getStripe() { const key=serverEnv().STRIPE_SECRET_KEY; if(!key)throw new HttpError(503,'Checkout is not available yet.','CHECKOUT_UNAVAILABLE'); stripe??=new Stripe(key,{maxNetworkRetries:2,timeout:15000}); return stripe; }

export async function createCheckout(request: Request) {
  assertOrigin(request,site.urls.store);
  if(!serviceState().checkout)throw new HttpError(503,'Checkout is not available yet. Please check back later.','CHECKOUT_UNAVAILABLE');
  const session=await requireSession(request);
  await rateLimit('checkout',session.user.id,8,60);
  const input=await readJson(request,checkoutSchema);
  const db=getDatabase();
  const catalog=await db.product.findMany({where:{id:{in:input.items.map(item=>item.productId)},published:true,available:true},include:{category:true}});
  const quote=quoteCart(input.items,catalog);
  if(!quote.canCheckout || quote.lines.length!==input.items.length)throw new HttpError(409,'An item is no longer available. Please review your cart.','CART_CHANGED');
  if(catalog.some(product=>!product.stripePriceId))throw new HttpError(503,'An item is not ready for checkout.','CHECKOUT_UNAVAILABLE');
  const fingerprint=createHash('sha256').update(JSON.stringify([...input.items].sort((a,b)=>a.productId.localeCompare(b.productId)))).digest('hex');
  const checkoutKey=`${session.user.id}:${input.requestId}`;
  let order=await db.order.findUnique({where:{checkoutKey},include:{items:true}});
  if(order && order.cartFingerprint!==fingerprint)throw new HttpError(409,'Your cart changed. Start a new checkout.','CART_CHANGED');
  if(order?.status==='PAID')return {url:`${site.urls.store}/orders/${order.id}`,orderId:order.id};
  if(order && order.status!=='PENDING')throw new HttpError(409,'This checkout has closed. Start a new checkout.','CHECKOUT_CLOSED');
  if(order && (order.subtotal!==quote.total || order.currency!==quote.currency || order.items.length!==catalog.length || order.items.some(item=>{
    const product=catalog.find(candidate=>candidate.id===item.productId);
    return !product || product.price!==item.unitPrice || product.stripePriceId!==item.stripePriceId;
  })))throw new HttpError(409,'The catalog changed. Review your cart and start a new checkout.','CART_CHANGED');
  if(order?.stripeSessionId){
    const existing=await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    if(existing.status==='open' && existing.url)return {url:existing.url,orderId:order.id};
    if(existing.status==='complete')return {url:`${site.urls.store}/orders/${order.id}`,orderId:order.id};
    throw new HttpError(409,'This checkout expired. Start a new checkout.','CHECKOUT_CLOSED');
  }
  // Provider prices must agree with the database. The browser sends IDs and quantities only.
  const prices=await Promise.all(catalog.map(product=>getStripe().prices.retrieve(product.stripePriceId!)));
  for(const [index,price] of prices.entries()){
    const product=catalog[index];
    if(!product || !price.active || price.type!=='one_time' || price.unit_amount!==product.price || price.currency!==product.currency || price.billing_scheme!=='per_unit' || price.tax_behavior==='inclusive')throw new HttpError(409,'An item price has changed or needs configuration. Please contact support.','PRICE_MISMATCH');
  }
  if(!order){
    try {
      order=await db.order.create({data:{userId:session.user.id,subtotal:quote.total,total:quote.total,currency:quote.currency!,checkoutKey,cartFingerprint:fingerprint,termsAcceptedAt:new Date(),termsUrl:site.legal.terms,items:{create:input.items.map(item=>{const product=catalog.find(p=>p.id===item.productId)!;return {productId:product.id,name:product.name,quantity:item.quantity,unitPrice:product.price,stripePriceId:product.stripePriceId!};})}},include:{items:true}});
    } catch(error) {
      if(!(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002'))throw error;
      order=await db.order.findUnique({where:{checkoutKey},include:{items:true}});
      if(!order || order.cartFingerprint!==fingerprint)throw new HttpError(409,'A checkout is already in progress.');
    }
  }
  const automaticTax=serverEnv().STRIPE_AUTOMATIC_TAX_ENABLED==='true';
  const checkout=await getStripe().checkout.sessions.create({
    mode:'payment',client_reference_id:session.user.id,customer_email:session.user.email,
    line_items:order.items.map(item=>({price:item.stripePriceId,quantity:item.quantity})),
    metadata:{orderId:order.id,userId:session.user.id},payment_intent_data:{metadata:{orderId:order.id,userId:session.user.id}},
    success_url:`${site.urls.store}/orders/${order.id}`,cancel_url:`${site.urls.store}/checkout?canceled=1`,
    expires_at:Math.floor(Date.now()/1000)+30*60,allow_promotion_codes:false,
    automatic_tax:{enabled:automaticTax},billing_address_collection:automaticTax?'required':'auto',
  },{idempotencyKey:`void-order-${order.id}`});
  if(!checkout.url)throw new HttpError(503,'The payment provider could not open checkout. Please try again.');
  await db.order.update({where:{id:order.id},data:{stripeSessionId:checkout.id}});
  return {url:checkout.url,orderId:order.id};
}

/** Called only after Stripe signature verification. Event receipt and state changes are atomic. */
export async function processPaymentEvent(event: Stripe.Event) {
  const db=getDatabase();
  const supported=['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.async_payment_failed','checkout.session.expired','charge.refunded'];
  if(!supported.includes(event.type))return {received:true,ignored:true};
  try {
    await db.$transaction(async tx=>{
      await tx.paymentEvent.create({data:{id:event.id,type:event.type}});
      if(event.type==='charge.refunded'){
        const charge=event.data.object as Stripe.Charge;
        const paymentId=typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;
        if(!paymentId)throw new HttpError(400,'Payment reference is missing.');
        const payment=await tx.payment.findUnique({where:{providerPaymentId:paymentId}});
        if(!payment)throw new HttpError(409,'Payment has not been recorded yet.');
        if(charge.currency!==payment.currency || charge.amount_refunded>payment.amount)throw new HttpError(400,'Refund details do not match.');
        const refunded=Math.max(payment.refundedAmount,charge.amount_refunded);
        const full=refunded===payment.amount;
        await tx.payment.update({where:{id:payment.id},data:{refundedAmount:refunded,status:full?'refunded':'partially_refunded'}});
        await tx.order.update({where:{id:payment.orderId},data:{status:full?'REFUNDED':'PARTIALLY_REFUNDED',...(full?{fulfillmentStatus:'REVOKED'}:{})}});
        return;
      }
      const checkout=event.data.object as Stripe.Checkout.Session;
      const orderId=checkout.metadata?.orderId;
      if(!orderId)return; // A signed event for another integration in the merchant's Stripe account.
      const order=await tx.order.findUnique({where:{id:orderId}});
      if(!order)throw new HttpError(409,'Order has not been recorded yet.');
      if(checkout.metadata?.userId!==order.userId || checkout.client_reference_id!==order.userId || (order.stripeSessionId && order.stripeSessionId!==checkout.id))throw new HttpError(400,'Payment does not match the order.');
      if(event.type==='checkout.session.expired' || event.type==='checkout.session.async_payment_failed'){
        await tx.order.updateMany({where:{id:order.id,status:'PENDING'},data:{status:event.type==='checkout.session.expired'?'CANCELED':'FAILED'}}); return;
      }
      if(checkout.payment_status!=='paid')return;
      const tax=checkout.total_details?.amount_tax ?? 0;
      if(checkout.amount_subtotal!==order.subtotal || checkout.currency!==order.currency || checkout.amount_total!==order.subtotal+tax || (checkout.total_details?.amount_discount??0)!==0 || (checkout.total_details?.amount_shipping??0)!==0)throw new HttpError(400,'Payment amount does not match the order.');
      const paymentId=typeof checkout.payment_intent==='string'?checkout.payment_intent:checkout.payment_intent?.id;
      if(!paymentId)throw new HttpError(400,'Payment reference is missing.');
      await tx.payment.upsert({where:{providerPaymentId:paymentId},create:{orderId:order.id,providerPaymentId:paymentId,amount:checkout.amount_total,currency:order.currency,status:'paid'},update:{}});
      // A late completion event cannot reverse a recorded refund.
      const transitioned=await tx.order.updateMany({where:{id:order.id,status:{in:['PENDING','FAILED','CANCELED']}},data:{status:'PAID',tax,total:checkout.amount_total,stripeSessionId:checkout.id}});
      if(!transitioned.count)return;
      // Clear only the quantities purchased; preserve items added during hosted checkout.
      const cart=await tx.cart.findUnique({where:{userId:order.userId},include:{items:true}});
      if(cart){
        await tx.cart.update({where:{id:cart.id},data:{revision:{increment:1}}});
        const purchased=await tx.orderItem.findMany({where:{orderId:order.id}});
        for(const item of purchased){ const stored=cart.items.find(line=>line.productId===item.productId); if(!stored)continue;
          if(stored.quantity<=item.quantity)await tx.cartItem.delete({where:{id:stored.id}});
          else await tx.cartItem.update({where:{id:stored.id},data:{quantity:{decrement:item.quantity}}});
        }
      }
    },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
  } catch(error) {
    if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2002'){
      if(await db.paymentEvent.findUnique({where:{id:event.id}}))return {received:true,duplicate:true};
    }
    throw error;
  }
  return {received:true};
}
export function verifyPaymentEvent(body: string, signature: string | null) {
  const secret=serverEnv().STRIPE_WEBHOOK_SECRET;
  if(!secret)throw new HttpError(503,'Payment webhook is not configured.');
  if(!signature)throw new HttpError(400,'Missing signature.');
  try { return getStripe().webhooks.constructEvent(body,signature,secret); } catch { throw new HttpError(400,'Invalid payment signature.'); }
}
