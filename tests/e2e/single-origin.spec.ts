import { test, expect } from '@playwright/test';

test('website, store and account share one origin and one page shell', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydration|hydrated|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.site-header .brand-asset-mark')).toHaveAttribute('data-logo-active', 'true');
  await page.locator('.footer-group').getByRole('link', { name: 'Store', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/store');
  await expect(page.locator('.site-header')).toHaveAttribute('data-app', 'store');
  await page.getByRole('link', { name: 'Shopping cart', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/store/cart');
  await page.getByRole('link', { name: 'Explore the collection', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/store/products');
  await page.locator('.site-header').getByRole('link', { name: 'Your Void account', exact: true }).click();
  await expect(page).toHaveURL(/localhost:3000\/account\/login\?returnTo=/);
  await expect(page.locator('.site-header')).toHaveAttribute('data-app', 'account');
  await page.getByRole('link', { name: 'Create an account', exact: true }).click();
  await expect(page).toHaveURL(/localhost:3000\/account\/register\?returnTo=/);
  await page.reload();
  await expect(page.locator('.site-header')).toHaveCount(1);
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('.site-footer')).toHaveCount(1);
  await page.locator('.site-header').getByRole('link', { name: 'Void Client home', exact: true }).click();
  await expect(page).toHaveURL('http://localhost:3000/');
  await expect(page.locator('.site-header')).toHaveAttribute('data-app', 'website');
  expect(errors).toEqual([]);
});

test('private routes and APIs retain their authorization and origin checks', async ({ page, request }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/login\?returnTo=/);
  for (const route of ['/api/cart', '/api/orders/not-real']) {
    const response = await request.get(route);
    expect(response.status()).toBe(401);
    expect(response.headers()['cache-control']).toBe('no-store');
  }
  for (const [route, method] of [['/api/profile', 'PATCH'], ['/api/settings', 'PATCH'], ['/api/sessions', 'DELETE'], ['/api/cart', 'PUT'], ['/api/checkout', 'POST']]) {
    const response = await request.fetch(route!, { method, headers: { origin: 'https://untrusted.example' }, data: {} });
    expect(response.status()).toBe(403);
  }
  if (!process.env.TEST_DATABASE_URL) {
    expect((await request.post('/api/auth/sign-in/email', { data: { email: 'test@example.test', password: 'test-only-password' } })).status()).toBe(503);
  }
  expect((await request.post('/api/webhooks/stripe', { data: '{}' })).status()).toBeGreaterThanOrEqual(400);
});

test('mobile branding is proportioned, centered and stable through scroll and menus', async ({ page }, info) => {
  test.setTimeout(120_000);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of ['/', '/store', '/account/login']) {
      await page.goto(route);
      await page.evaluate(() => document.fonts.ready);
      const header = page.locator('.site-header');
      const geometry = await header.evaluate(element => {
        const nav = element.querySelector('.nav-inner')!.getBoundingClientRect();
        const brand = element.querySelector('.brand-link')!.getBoundingClientRect();
        const actions = element.querySelector('.nav-actions')!.getBoundingClientRect();
        const image = element.querySelector('img')!;
        const logo = image.getBoundingClientRect();
        return { height: nav.height, brandY: brand.y + brand.height / 2, actionsY: actions.y + actions.height / 2, gap: actions.x - brand.right, logoWidth: logo.width, ratio: logo.width / logo.height, naturalRatio: image.naturalWidth / image.naturalHeight, overflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(geometry.gap).toBeGreaterThanOrEqual(8);
      expect(Math.abs(geometry.brandY - geometry.actionsY)).toBeLessThanOrEqual(1);
      expect(geometry.logoWidth).toBeGreaterThanOrEqual(34);
      expect(geometry.ratio).toBeCloseTo(geometry.naturalRatio, 2);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      await page.evaluate(() => window.scrollTo({ top: 500, behavior: 'instant' }));
      await expect(header).toHaveClass(/scrolled/);
      expect((await page.locator('.nav-inner').boundingBox())!.height).toBe(geometry.height);
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
      await expect(page.locator('#mobile-navigation')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#mobile-navigation')).not.toBeVisible();
      if (width === 390) {
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: info.outputPath(`mobile-${route.replaceAll('/', '-') || 'home'}.png`) });
      }
    }
  }
});

test('fast scrolling and resizing reveal content without moving the document layout', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const before = await page.locator('.feature-grid').evaluate(element => ({ top: (element as HTMLElement).offsetTop, height: element.getBoundingClientRect().height }));
  await page.locator('.feature-grid').scrollIntoViewIfNeeded();
  await expect(page.locator('.feature-card').last()).toHaveCSS('opacity', '1');
  const after = await page.locator('.feature-grid').evaluate(element => ({ top: (element as HTMLElement).offsetTop, height: element.getBoundingClientRect().height }));
  expect(after).toEqual(before);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('.hero-art')).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'void-reveal' && animation.playState === 'running').length)).toBe(0);
  await page.locator('.footer-brand').scrollIntoViewIfNeeded();
  await expect(page.locator('.scroll-progress > span')).not.toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)');
});

test('offscreen content animates once as it enters the viewport', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.site-header .brand-asset-mark')).toHaveAttribute('data-logo-active', 'true');
  const card = page.locator('.feature-card').first();
  await expect(card).toBeVisible();
  const result = await card.evaluate(async element => {
    const animate = element.animate;
    const animations: Animation[] = [];
    // Record actual animations without replacing their behavior. A busy browser
    // can finish a short reveal between automation frames or tool round trips.
    element.animate = function (...args) {
      const animation = animate.apply(this, args);
      animations.push(animation);
      return animation;
    };
    try {
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - innerHeight + 40, behavior: 'instant' });
      const deadline = performance.now() + 8_000;
      while (!animations.length && performance.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      if (!animations.length) return { count: 0, finished: false };
      await animations[0]!.finished;
      window.scrollTo({ top: 0, behavior: 'instant' });
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
      // Allow the longest reveal duration to finish, so a replay is counted too.
      await new Promise(resolve => setTimeout(resolve, 600));
      const reveals = animations.filter(animation => animation.id === 'void-reveal');
      return { count: reveals.length, finished: reveals[0]?.playState === 'finished' };
    } finally {
      element.animate = animate;
    }
  });
  expect(result).toEqual({ count: 1, finished: true });
  await expect(card).toHaveCSS('opacity', '1');
});
