import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'http://127.0.0.1:8789';
await mkdir(path.join(root, '.cache'), { recursive: true });
const envFile = path.join(root, '.cache/pages-verify.env');
await writeFile(envFile, 'DATABASE_URL=\nDIRECT_URL=\nBETTER_AUTH_SECRET=\nSMTP_HOST=\nSTRIPE_SECRET_KEY=\nSTORE_CHECKOUT_ENABLED=false\nVOID_LOCAL_PREVIEW=false\n');
const server = spawn(process.execPath, [
  'node_modules/wrangler/bin/wrangler.js', 'pages', 'dev', 'apps/website/out',
  '--port=8789', '--ip=127.0.0.1', '--env-file', envFile,
  '--persist-to=.cache/pages-verify-state',
], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, detached: process.platform !== 'win32' });
let logs = '';
server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-10_000); });
server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-10_000); });
let startupError;
server.on('error', error => { startupError = error; });
let checks = 0;
try {
  const deadline = Date.now() + 90_000;
  while (true) {
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`Pages preview exited with ${server.exitCode}.`);
    try { const response = await fetch(origin, { signal: AbortSignal.timeout(2_000) }); await response.body?.cancel(); break; }
    catch { if (Date.now() >= deadline) throw new Error('Pages preview did not start within 90 seconds.'); }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  const assets = new Set();
  for (const route of ['/', '/modules', '/download', '/discord', '/changelog', '/sneak-peeks', '/partners', '/faq', '/about', '/account/login', '/account/register', '/account/forgot-password', '/account/reset-password', '/account/verify-email', '/store', '/store/products', '/store/categories', '/store/search', '/store/cart', '/store/checkout']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('x-frame-options'), 'DENY', route);
    const html = await response.text();
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, route);
    assert.match(html, /<title>[^<]*[Vv]oid/, route);
    assert.doesNotMatch(html, /Application error: a (?:client|server)-side exception/, route);
    for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
      const url = match[1].replaceAll('&amp;', '&');
      if (url.startsWith('/') && /\.(css|js|svg|woff2|ttf|png|webp)(?:\?|$)/.test(url)) assets.add(url);
    }
    checks++;
  }
  for (const route of ['/void/scene.html', '/void/scene']) {
    const response = await fetch(origin + route);
    assert.equal(response.status, 200, route);
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN', route);
    assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'self'/, route);
    const html = await response.text();
    assert.match(html, /cinematic-runtime\.js/, route);
    for (const match of html.matchAll(/<script src="([^"]+)"/g)) assets.add(match[1]);
    checks++;
  }
  for (const asset of assets) {
    const response = await fetch(origin + asset);
    assert.equal(response.status, 200, asset);
    await response.body?.cancel();
  }
  checks++;
  const mesh = await fetch(origin + '/void/world-mesh.bin.gz');
  assert.equal(mesh.status, 200);
  assert.deepEqual(Array.from(new Uint8Array(await mesh.arrayBuffer()).slice(0, 2)), [0x1f, 0x8b]);
  checks++;
  const logo = await fetch(origin + '/brand/logo.png');
  assert.deepEqual(Buffer.from(await logo.arrayBuffer()), await readFile(path.join(root, 'assets/logo.png')));
  checks++;
  const cart = await fetch(origin + '/api/cart');
  assert.equal(cart.status, 503);
  assert.equal((await cart.json()).code, 'SERVICE_UNAVAILABLE');
  checks++;
  const mutation = await fetch(origin + '/api/cart', { method: 'PUT', headers: { 'content-type': 'application/json', origin: 'https://untrusted.example' }, body: '{}' });
  assert.equal(mutation.status, 403);
  await mutation.body?.cancel();
  checks++;
  const social = await fetch(origin + '/opengraph-image');
  assert.equal(social.status, 200);
  assert.match(social.headers.get('content-type') ?? '', /^image\/png/);
  await social.body?.cancel();
  checks++;
  console.log(`Pages workerd verification: ${checks} checks passed, ${assets.size} referenced assets resolved.`);
} catch (error) {
  console.error(logs);
  throw error;
} finally {
  if (process.platform === 'win32' && server.pid) {
    await new Promise(resolve => {
      const stop = spawn('taskkill.exe', ['/PID', String(server.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
      stop.on('exit', resolve); stop.on('error', resolve);
    });
  } else if (server.pid) {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* Already exited. */ }
  }
}
