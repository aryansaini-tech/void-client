import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const websites = {
  'http://localhost:3000': ['/', '/modules', '/download', '/discord', '/changelog', '/sneak-peeks', '/partners', '/faq', '/about', '/store', '/store/products', '/store/categories', '/store/search', '/store/cart', '/store/checkout', '/account/login', '/account/register', '/account/forgot-password', '/account/reset-password', '/account/verify-email'],
  'http://localhost:3001': ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'],
  'http://localhost:3002': ['/', '/products', '/categories', '/search', '/cart', '/checkout'],
};

test('built applications serve every public page, metadata and referenced local assets', { timeout: 120_000 }, async t => {
  const assets = new Set<string>();
  for (const [origin, paths] of Object.entries(websites)) {
    for (const path of paths) {
      await t.test(`${origin}${path}`, async () => {
        const response = await fetch(origin + path);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        assert.equal(response.headers.get('x-frame-options'), 'DENY');
        assert.ok(response.headers.get('content-security-policy'));
        const html = await response.text();
        assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, 'One page heading');
        assert.match(html.match(/<title>([^<]+)/)?.[1] ?? '', /[Vv]oid/);
        assert.ok(/name="description" content="[^"\s]/.test(html), 'Page description');
        assert.ok(/id="main"/.test(html), 'Main landmark');
        assert.doesNotMatch(html, /Application error: a (?:client|server)-side exception/);
        for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
          const value = match[1]?.replaceAll('&amp;', '&');
          if (value?.startsWith('/') && /\.(css|js|svg|woff2|png|webp|avif)(?:\?|$)|^\/_next\/image\?/.test(value)) assets.add(new URL(value, origin).href);
        }
      });
    }
  }
  await t.test('all referenced scripts, styles and images resolve', async () => {
    assert.ok(assets.size > 10);
    for (const url of assets) assert.equal((await fetch(url)).status, 200, url);
  });
});

test('private routes, direct links and unknown products enforce real boundaries', { timeout: 60_000 }, async () => {
  async function redirectTarget(response: Response) {
    if (response.status === 307) return response.headers.get('location') ?? '';
    // App Router can stream a public shell before returning its native redirect.
    assert.equal(response.status, 200);
    return (await response.text()).match(/id="__next-page-redirect"[^>]*content="\d+;url=([^"<>]+)/)?.[1] ?? '';
  }
  for (const path of ['/dashboard', '/profile', '/security', '/settings', '/discord', '/purchases']) {
    const response = await fetch(`http://localhost:3001${path}`, { redirect: 'manual' });
    assert.match(await redirectTarget(response), /\/login\?returnTo=/);
  }
  assert.ok((await (await fetch('http://localhost:3002/orders')).text()).includes('Sign in to view orders'));
  for (const path of ['/orders/not-real?success=1']) {
    const response = await fetch(`http://localhost:3002${path}`, { redirect: 'manual' });
    assert.match(await redirectTarget(response), /^http:\/\/localhost:3000\/account\/login\?returnTo=/);
  }
  for (const path of ['/products/not-published', '/categories/not-published']) {
    const response = await fetch(`http://localhost:3002${path}`);
    assert.ok([200, 404].includes(response.status));
    const html = await response.text();
    assert.ok(html.includes('Lost in the void.') && html.includes('noindex'), 'Missing products remain unavailable and non-indexable, including streamed 404s');
  }
  assert.equal((await fetch('http://localhost:3002/api/cart')).status, 401);
  assert.equal((await fetch('http://localhost:3002/api/orders/not-real')).status, 401);
});

test('SEO resources and original concept images are present', { timeout: 60_000 }, async () => {
  for (const origin of Object.keys(websites)) {
    for (const path of ['/robots.txt', '/icon.svg', '/opengraph-image']) assert.equal((await fetch(origin + path)).status, 200, origin + path);
  }
  for (const origin of ['http://localhost:3000', 'http://localhost:3002']) {
    const response = await fetch(`${origin}/sitemap.xml`);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<urlset/);
  }
  for (const name of ['interface-concept', 'hud-concept', 'landscape', 'visual-concept', 'settings-concept']) {
    const response = await fetch(`http://localhost:3000/media/${name}.svg`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /image\/svg\+xml/);
  }
});

test('every application serves the exact supplied transparent logos and derived icons', { timeout: 60_000 }, async () => {
  const digest=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
  for (const name of ['logo.png','void-logo.png']) {
    const source=await readFile(new URL(`../../assets/${name}`,import.meta.url));
    for (const origin of Object.keys(websites)) {
      const response=await fetch(`${origin}/brand/${name}`);
      assert.equal(response.status,200);
      assert.match(response.headers.get('content-type')??'',/image\/png/);
      assert.equal(digest(new Uint8Array(await response.arrayBuffer())),digest(source));
    }
  }
  for (const origin of Object.keys(websites)) {
    for (const path of ['/brand/favicon-64.png','/apple-icon.png']) assert.equal((await fetch(origin+path)).status,200);
  }
  assert.equal((await fetch('http://localhost:3000/media/partners/zerix.webp')).status,200);
});
