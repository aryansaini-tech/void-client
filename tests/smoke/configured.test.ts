import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

// Opt in only when the running account/store servers use this same disposable
// database and auth secret. No provider email or payment is sent by this test.
test('compiled account and store complete a real authenticated HTTP round trip', {
  skip: process.env.VOID_HTTP_CONFIGURED !== 'true', timeout: 60_000,
}, async () => {
  const database = process.env.TEST_DATABASE_URL;
  assert.ok(database, 'TEST_DATABASE_URL is required');
  assert.match(new URL(database).pathname, /_test$/);
  assert.equal(process.env.DATABASE_URL, database);
  assert.ok(process.env.BETTER_AUTH_SECRET);
  const [{ getDatabase }, { decryptEmail }] = await Promise.all([
    import('../../backend/src/database'), import('../../backend/src/mail'),
  ]);
  const db = getDatabase();
  const email = `http-${randomUUID()}@example.test`;
  const password = `TEST-only-${randomUUID()}`;
  const started = new Date();
  const account = 'http://localhost:3001';
  const store = 'http://localhost:3002';
  let userId = '';
  let categoryId = '';
  let productId = '';
  let cookie = '';
  const mailIds = new Set<string>();
  async function request(origin: string, path: string, body: unknown, method = 'POST') {
    return fetch(origin + path, {
      method, redirect: 'manual',
      headers: { origin, 'content-type': 'application/json', cookie },
      body: JSON.stringify(body),
    });
  }
  try {
    const registration = await request(account, '/api/auth/sign-up/email', {
      name: 'TEST HTTP PLAYER', email, password, callbackURL: account + '/login',
    });
    assert.equal(registration.status, 200);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    userId = user.id;
    assert.equal(user.emailVerified, false);
    const unverified = await request(account, '/api/auth/sign-in/email', { email, password });
    assert.equal(unverified.status, 403);
    const jobs = await db.emailOutbox.findMany({ where: { createdAt: { gte: started } } });
    let verification: string | undefined;
    for (const job of jobs) {
      try {
        const mail = decryptEmail(job.payload);
        if (mail.to !== email) continue;
        mailIds.add(job.id);
        verification ??= mail.text.match(/http:\/\/localhost:3001\/api\/auth\/verify-email[^\s]+/)?.[0];
      } catch { /* Ignore messages from other isolated test runs. */ }
    }
    assert.ok(verification);
    const verified = await fetch(verification, { redirect: 'manual' });
    assert.ok([200, 302].includes(verified.status));
    const login = await request(account, '/api/auth/sign-in/email', { email, password });
    assert.equal(login.status, 200);
    const cookies = login.headers.getSetCookie();
    assert.ok(cookies.some(value => /HttpOnly/i.test(value)));
    cookie = cookies.map(value => value.split(';')[0]).join('; ');

    for (const path of ['/dashboard', '/profile', '/settings', '/security', '/discord', '/purchases']) {
      const response = await fetch(account + path, { headers: { cookie }, redirect: 'manual' });
      assert.equal(response.status, 200);
      const html = await response.text();
      assert.doesNotMatch(html, /__next-page-redirect|Application error/);
      assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
    }
    const profile = await request(account, '/api/profile', {
      name: 'TEST HTTP UPDATED', bio: 'Disposable HTTP fixture.', minecraftName: '',
    }, 'PATCH');
    assert.equal(profile.status, 200);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: userId } })).name, 'TEST HTTP UPDATED');
    assert.equal((await fetch(store + '/api/cart', { headers: { cookie } })).status, 200,
      'The store resolves the real account session');

    const slug = `http-fixture-${randomUUID()}`;
    const category = await db.productCategory.create({ data: { slug, name: 'TEST HTTP CATEGORY' } });
    categoryId = category.id;
    const product = await db.product.create({ data: {
      slug, name: 'TEST HTTP FIXTURE — NOT FOR SALE', description: 'Deleted after the HTTP check.',
      price: 1250, currency: 'usd', categoryId, published: true, available: true,
    } });
    productId = product.id;
    for (const path of [`/products/${slug}`, `/categories/${slug}`]) {
      const response = await fetch(store + path);
      assert.equal(response.status, 200);
      assert.ok((await response.text()).includes(product.name));
    }
    const saved = await request(store, '/api/cart', {
      items: [{ productId, quantity: 2 }], revision: 0,
    }, 'PUT');
    assert.equal(saved.status, 200);
    assert.equal((await db.cartItem.findFirstOrThrow({ where: { productId } })).quantity, 2);
    const history = await fetch(store + '/orders', { headers: { cookie } });
    assert.equal(history.status, 200);
    assert.doesNotMatch(await history.text(), /Sign in to view orders|Application error/);
    assert.equal((await request(account, '/api/auth/sign-out', {})).status, 200);
    assert.equal((await fetch(store + '/api/cart', { headers: { cookie } })).status, 401);
  } finally {
    // Delete only records belonging to this explicitly labelled test fixture.
    const jobs = await db.emailOutbox.findMany({ where: { createdAt: { gte: started } } });
    for (const job of jobs) {
      try { if (decryptEmail(job.payload).to === email) mailIds.add(job.id); } catch { /* Another test's key. */ }
    }
    if (mailIds.size) await db.emailOutbox.deleteMany({ where: { id: { in: [...mailIds] } } });
    if (productId) {
      await db.cartItem.deleteMany({ where: { productId } });
      await db.product.deleteMany({ where: { id: productId } });
    }
    if (categoryId) await db.productCategory.deleteMany({ where: { id: categoryId } });
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await db.$disconnect();
  }
});
