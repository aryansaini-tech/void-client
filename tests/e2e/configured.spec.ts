import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

test('register, verify, sign in, visit private pages and sign out', async ({ page }, info) => {
  test.skip(!process.env.TEST_DATABASE_URL || info.project.name !== 'chromium-desktop', 'Requires a migrated disposable test database; runs once.');
  const { getDatabase } = await import('../../backend/src/database');
  const { decryptEmail } = await import('../../backend/src/mail');
  const db = getDatabase();
  const email = `ui-${randomUUID()}@example.test`;
  const password = `TEST-only-${randomUUID()}`;
  const started = new Date();
  let userId = '';
  const jobsToRemove: string[] = [];
  try {
    await page.goto('http://localhost:3001/register');
    await page.getByRole('button', { name: 'Create account', exact: false }).click();
    await expect(page.locator('#auth-error')).not.toBeEmpty();
    await page.getByLabel('Display name', { exact: true }).fill('TEST FIXTURE PLAYER');
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Show password', exact: true }).click();
    await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: 'Hide password', exact: true }).click();
    await page.getByRole('button', { name: 'Create account', exact: false }).click();
    await expect(page.getByRole('status')).toContainText('Check your inbox');
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    userId = user.id;
    const jobs = await db.emailOutbox.findMany({ where: { createdAt: { gte: started } } });
    const job = jobs.find(candidate => {
      try { if (decryptEmail(candidate.payload).to === email) { jobsToRemove.push(candidate.id); return true; } } catch { /* Another fixture's encryption key. */ }
      return false;
    });
    expect(job).toBeTruthy();
    const verification = decryptEmail(job!.payload).text.match(/http:\/\/localhost:3001\/api\/auth\/verify-email[^\s]+/)?.[0];
    expect(verification).toBeTruthy();
    await page.goto(verification!);
    await page.getByLabel('Email address', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in', exact: false }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto('http://localhost:3001/profile');
    await page.getByLabel('Display name', { exact: true }).fill('TEST FIXTURE UPDATED');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Profile saved.');
    expect((await db.user.findUniqueOrThrow({ where: { id: userId } })).name).toBe('TEST FIXTURE UPDATED');
    for (const path of ['/profile', '/security', '/settings', '/discord', '/purchases']) {
      expect((await page.goto(`http://localhost:3001${path}`))?.status()).toBe(200);
      await expect(page.locator('main h1')).toHaveCount(1);
    }
    await page.goto('http://localhost:3001/security');
    await expect(page.getByRole('button',{name:'Connect Microsoft',exact:true})).toBeDisabled();
    await expect(page.getByLabel('Current password',{exact:true})).toBeVisible();
    await page.goto('http://localhost:3001/settings');
    await page.getByRole('checkbox',{name:'Reduce motion',exact:true}).check();
    await page.getByRole('button',{name:'Save preferences',exact:true}).click();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto('http://localhost:3001/dashboard');
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  } finally {
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    if (jobsToRemove.length) await db.emailOutbox.deleteMany({ where: { id: { in: jobsToRemove } } });
  }
});

test('real catalog records support search, product details, cart quantities and disabled checkout', async ({ page }, info) => {
  test.skip(!process.env.TEST_DATABASE_URL || info.project.name !== 'chromium-desktop', 'Requires a migrated disposable test database; no real product is invented.');
  const { getDatabase } = await import('../../backend/src/database');
  const db = getDatabase();
  const slug = `test-fixture-${randomUUID()}`;
  const category = await db.productCategory.create({ data: { slug, name: 'TEST FIXTURE CATEGORY' } });
  const product = await db.product.create({ data: {
    slug, name: 'TEST FIXTURE ONLY — NOT FOR SALE', description: 'Synthetic browser-test record. Removed after this test.',
    price: 1250, currency: 'usd', categoryId: category.id, published: true, available: true,
  } });
  try {
    await page.goto('http://localhost:3002/products');
    await page.getByRole('searchbox', { name: 'Search products' }).fill('TEST FIXTURE ONLY');
    await expect(page.locator('.product-card')).toHaveCount(1);
    await page.getByRole('link', { name: `View ${product.name}`, exact: true }).click();
    await expect(page.locator('h1')).toHaveText(product.name);
    await page.getByRole('button', { name: 'Add to cart', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('added to your cart');
    await page.goto('http://localhost:3002/cart');
    await page.getByRole('button', { name: `Increase quantity of ${product.name}`, exact: true }).click();
    await expect(page.locator('.summary-total')).toContainText('$25.00');
    await page.reload();
    await expect(page.locator('.summary-total')).toContainText('$25.00');
    await page.getByRole('link', { name: 'Continue to checkout', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Continue to secure payment', exact: false })).toBeDisabled();
    await page.goto('http://localhost:3002/cart');
    await page.getByRole('button', { name: `Remove ${product.name}`, exact: true }).click();
    await expect(page.getByText('Your cart is empty.', { exact: false })).toBeVisible();
  } finally {
    await db.cartItem.deleteMany({ where: { productId: product.id } });
    await db.product.delete({ where: { id: product.id } });
    await db.productCategory.delete({ where: { id: category.id } });
  }
});
