import test from 'node:test';
import assert from 'node:assert/strict';
import { publicUrl,safeReturnUrl,localMediaPath } from '../../packages/shared/src/urls';
const account='https://account.voidclient.org',store='https://store.voidclient.org';
test('public links accept HTTPS and loopback development only',()=>{assert.equal(publicUrl('https://voidclient.org/'),'https://voidclient.org');assert.equal(publicUrl('http://localhost:3000/'),'http://localhost:3000');for(const value of ['javascript:alert(1)','data:text/html,test','http://evil.example','https://user:secret@example.com','//example.com','not a URL'])assert.equal(publicUrl(value),'');});
test('empty configuration stays empty',()=>{assert.equal(publicUrl(undefined),'');assert.equal(publicUrl('   '),'');assert.equal(publicUrl('',account),account);});
test('cross-application return URLs preserve an authorized destination',()=>{assert.equal(safeReturnUrl(`${store}/checkout`,account,store),`${store}/checkout`);assert.equal(safeReturnUrl('/security',account,store),`${account}/security`);});
test('return URLs reject lookalike origins, schemes and unsafe paths',()=>{for(const url of ['https://store.voidclient.org.evil.example/checkout','//evil.example/checkout','javascript:alert(1)','/api/auth/sign-out','/\\evil.example/checkout','https://evil.example/orders/123'])assert.equal(safeReturnUrl(url,account,store),`${account}/dashboard`);});
test('media paths reject traversal and remote hosts',()=>{assert.ok(localMediaPath('/media/previews/official.webp'));for(const value of ['/media/../secret.svg','https://example.com/image.webp','/media/test.html','//example.com/media/a.png'])assert.equal(localMediaPath(value),false);});
