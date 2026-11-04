import { test, expect } from '@playwright/test';

test('public content remains readable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    for (const route of ['/', '/about', '/faq']) {
      await page.goto(`http://localhost:3000${route}`);
      await expect(page.locator('main h1')).toBeVisible();
      const hiddenContent = await page.locator('[data-reveal]').evaluateAll(elements =>
        elements.filter(element => getComputedStyle(element).opacity === '0').length
      );
      expect(hiddenContent).toBe(0);
    }
  } finally {
    await context.close();
  }
});

test('scroll reveals stay visible after scrolling back and respect live reduced motion', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.feature-card').last();
  await expect(card).toHaveCSS('opacity', '1');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveCSS('opacity', '1');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(card).toHaveCSS('opacity', '1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion', 'true');
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'void-reveal' && animation.playState === 'running').length)).toBe(0);
  await expect(page.locator('.hero-art')).toHaveCSS('transform', 'none');
  await page.reload();
  await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'auto');
  await expect(page.locator('[data-reveal]').first()).toHaveCSS('opacity', '1');
});

test('theme controls stay synchronized, persist, and survive a desktop resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const headerToggle = page.locator('.site-header .theme-toggle-btn');
  await headerToggle.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
  const dialog = page.locator('#mobile-navigation');
  const menuToggle = dialog.locator('.theme-toggle-btn');
  await expect(menuToggle).toHaveAccessibleName('Switch to light mode');
  await menuToggle.click();
  await expect(headerToggle).toHaveAccessibleName('Switch to dark mode');
  await page.setViewportSize({ width: 1440, height: 960 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await headerToggle.click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(headerToggle).toHaveAccessibleName('Switch to light mode');
});

test('theme switching still works when local storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
    Storage.prototype.setItem = () => { throw new DOMException('Storage unavailable', 'SecurityError'); };
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.locator('.site-header .theme-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.locator('.site-header .theme-toggle-btn').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(errors).toEqual([]);
});
