import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteCart,formatMoney,type PublicProduct } from '../../packages/shared/src/commerce';
import { cartSchema,checkoutSchema,profileSchema,registerSchema } from '../../packages/shared/src/schemas';
// TEST FIXTURES ONLY. Never imported by application code or production seeds.
const product:PublicProduct={id:'test-item',slug:'test-item',name:'TEST FIXTURE ONLY',description:'Synthetic test fixture, never a real store listing.',price:1250,currency:'usd',images:[],available:true,category:{id:'test-category',slug:'test-category',name:'Test category'}};
test('cart totals use integer minor units',()=>{const quote=quoteCart([{productId:product.id,quantity:3}],[product]);assert.equal(quote.total,3750);assert.equal(quote.lines[0]?.subtotal,3750);assert.ok(quote.canCheckout);});
test('unknown items cannot be silently charged',()=>{const quote=quoteCart([{productId:'missing',quantity:1}],[product]);assert.equal(quote.canCheckout,false);assert.deepEqual(quote.unavailable,['missing']);});
test('unavailable products are excluded and block checkout',()=>{const quote=quoteCart([{productId:product.id,quantity:1}],[{...product,available:false}]);assert.equal(quote.total,0);assert.equal(quote.canCheckout,false);});
test('empty carts have no fabricated currency and cannot check out',()=>{const quote=quoteCart([],[]);assert.equal(quote.currency,null);assert.equal(quote.canCheckout,false);});
test('invalid quantities are rejected',()=>{for(const quantity of [0,-1,1.5,11])assert.throws(()=>quoteCart([{productId:product.id,quantity}],[product]));});
test('mixed currencies cannot produce an ambiguous total',()=>{assert.throws(()=>quoteCart([{productId:product.id,quantity:1},{productId:'other',quantity:1}],[product,{...product,id:'other',currency:'eur'}]));});
test('money formatting respects currency minor units',()=>{assert.equal(formatMoney(1250,'usd'),'$12.50');assert.match(formatMoney(1250,'jpy'),/1,250/);});
test('duplicate and oversized carts are rejected',()=>{assert.equal(cartSchema.safeParse([{productId:'a',quantity:1},{productId:'a',quantity:2}]).success,false);assert.equal(cartSchema.safeParse(Array.from({length:26},(_,i)=>({productId:String(i),quantity:1}))).success,false);});
test('checkout accepts only product identities, quantities, idempotency key and consent',()=>{const input={items:[{productId:'test',quantity:1}],requestId:'5f1f9c37-6d73-44e7-97d2-5c996bbf65d1',acceptedTerms:true};assert.ok(checkoutSchema.safeParse(input).success);assert.equal(checkoutSchema.safeParse({...input,total:1}).success,false);assert.equal(checkoutSchema.safeParse({...input,acceptedTerms:false}).success,false);});
test('profile input cannot change authorization or email',()=>{assert.equal(profileSchema.safeParse({name:'Player',bio:'',minecraftName:'',role:'admin'}).success,false);assert.equal(profileSchema.safeParse({name:'Player',bio:'',minecraftName:'',email:'other@example.test'}).success,false);});
test('registration validates and normalizes email without weakening passwords',()=>{const parsed=registerSchema.parse({name:' Player ',email:' User@Example.test ',password:'a long unique passphrase'});assert.equal(parsed.email,'user@example.test');assert.equal(parsed.name,'Player');assert.equal(registerSchema.safeParse({...parsed,password:'short'}).success,false);});
