import { test, expect, type Page } from '@playwright/test';

const websiteRoutes = ['/', '/modules', '/download', '/discord', '/changelog', '/sneak-peeks', '/partners', '/faq', '/about'];
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

test('every public route renders with metadata and no broken local assets', async ({ context }) => {
  test.setTimeout(120_000);
  for (const url of [
    ...websiteRoutes,
    'http://localhost:3000/account/login', 'http://localhost:3000/account/register',
    'http://localhost:3000/account/forgot-password', 'http://localhost:3000/account/reset-password',
    'http://localhost:3000/account/verify-email', 'http://localhost:3000/store/',
    'http://localhost:3000/store/products', 'http://localhost:3000/store/categories',
    'http://localhost:3000/store/search', 'http://localhost:3000/store/cart', 'http://localhost:3000/store/checkout',
  ]) {
    // Each direct route owns a document. Assert its errors before intentionally
    // closing it; WebKit reports cancelled teardown prefetches as access errors.
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (message.type() === 'error' && /hydration|hydrated|Minified React error/i.test(message.text())) errors.push(message.text());
    });
    page.on('response', response => {
      if (response.status() >= 400 && /\/_next\/|\/media\/|\/brand\/|\/void\/|\/fonts\//.test(response.url())) errors.push(`${response.status()} ${response.url()}`);
    });
    expect((await page.goto(url, { waitUntil: 'networkidle' }))?.status()).toBe(200);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/Void/i);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
    await noOverflow(page);
    expect(errors, url).toEqual([]);
    await page.close();
  }
});

test('deliberate layouts at all requested widths', async ({ page }, info) => {
  test.setTimeout(120_000);
  test.skip(info.project.name !== 'chromium-desktop', 'The width matrix runs once; device projects cover engine-specific interactions.');
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    for (const url of ['http://localhost:3000/', 'http://localhost:3000/faq', 'http://localhost:3000/account/register', 'http://localhost:3000/store/']) {
      await page.goto(url);
      await expect(page.locator('main h1')).toBeVisible();
      await noOverflow(page);
    }
  }
});

test('mobile navigation traps focus, locks scrolling and closes by Escape/outside click', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'Open navigation menu' });
  await trigger.click();
  const dialog = page.locator('#mobile-navigation');
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');
  await page.keyboard.press('Tab');
  expect(await dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(3, 300);
  await expect(dialog).not.toBeVisible();
  await trigger.click();
  await page.getByRole('navigation', { name: 'Mobile navigation', exact: true }).getByRole('link', { name: 'Modules', exact: true }).click();
  await expect(page).toHaveURL(/\/modules$/);
  await expect(dialog).not.toBeVisible();
});

test('search, filters, accordions and download availability work', async ({ page }) => {
  await page.goto('/modules');
  await page.getByRole('searchbox', { name: 'Search modules' }).fill('unpublished-test-query');
  await expect(page.getByRole('heading', { name: 'No matching modules.' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(page.getByRole('searchbox', { name: 'Search modules' })).toHaveValue('');
  await page.goto('/faq');
  await page.getByRole('searchbox', { name: 'Search questions' }).fill('Bedrock or Java');
  await page.locator('summary').click();
  await expect(page.locator('details[open]')).toContainText('Minecraft Bedrock Edition');
  await page.getByRole('button', { name: 'Clear search questions' }).click();
  await page.getByRole('group', { name: 'Question categories' }).getByRole('button', { name: 'Installation', exact: true }).click();
  await expect(page.locator('summary')).toHaveCount(2);
  await page.goto('/download');
  await page.getByRole('group', { name: 'Download platform' }).getByRole('button', { name: 'Android', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Void for Android' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download coming soon' })).toBeDisabled();
  await page.goto('/changelog');
  await page.getByRole('button', { name: 'Bug fixes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No updates in this category.' })).toBeVisible();
});

test('showcase keyboard selection and gallery lightbox retain accessible controls', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'ClickGUI', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'HUD', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('HUD');
  await page.goto('/sneak-peeks');
  await page.getByRole('button', { name: 'Preview ClickGUI', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Design concept');
  await page.getByRole('button', { name: 'Next preview', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveAccessibleName('HUD');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('dialog')).toHaveAccessibleName('ClickGUI');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Preview ClickGUI', exact: true })).toBeFocused();
});

test('the official navigation logo stays sharp and separate from the cinematic copy', async ({ page }, info) => {
  test.setTimeout(120_000);
  test.skip(info.project.name !== 'chromium-desktop', 'The viewport matrix runs once.');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [320, 390, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/');
    const logo = page.locator('.site-header .brand-image');
    await expect(logo).toBeVisible();
    await expect(logo).toHaveAttribute('src', '/brand/logo.png');
    const geometry = await logo.evaluate(image => {
      const source = image as HTMLImageElement;
      const mark = image.getBoundingClientRect();
      const copy = document.querySelector('.cinematic-hero-copy')!.getBoundingClientRect();
      const art = document.querySelector('.site-header .brand-asset')!;
      return {
        loaded: source.complete && source.naturalWidth > 0,
        natural: source.naturalWidth / source.naturalHeight,
        rendered: mark.width / mark.height,
        withinViewport: mark.left >= 0 && mark.right <= innerWidth && mark.top >= 0 && mark.bottom <= innerHeight,
        overlapsCopy: mark.left < copy.right && mark.right > copy.left && mark.top < copy.bottom && mark.bottom > copy.top,
        opacity: getComputedStyle(art).opacity,
        filter: getComputedStyle(image).filter,
      };
    });
    expect(geometry.loaded).toBe(true);
    expect(geometry.rendered).toBeCloseTo(geometry.natural, 2);
    expect(geometry.withinViewport).toBe(true);
    expect(geometry.overlapsCopy).toBe(false);
    expect(geometry.opacity).toBe('1');
    expect(geometry.filter).toBe('none');
  }
});

test('direct routes, refresh, history and reduced motion remain native', async ({ page }) => {
  await page.goto('/about');
  await page.goto('/faq');
  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
  await page.goForward();
  await expect(page).toHaveURL(/\/faq$/);
  await page.reload();
  await expect(page.locator('main h1')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'void-reveal' && animation.playState === 'running').length)).toBe(0);
});

test('private routes redirect and an empty store cannot imply payment success', async ({ page }) => {
  for (const path of ['/dashboard', '/profile', '/security', '/settings', '/discord', '/purchases']) {
    await page.goto(`http://localhost:3000/account${path}`);
    await expect(page).toHaveURL(/\/login\?returnTo=/);
  }
  await page.goto('http://localhost:3000/store/orders/not-a-real-order?success=1');
  await expect(page).toHaveURL(/localhost:3000\/account\/login\?returnTo=/);
  await page.goto('http://localhost:3000/store/products/not-published');
  await expect(page.getByRole('heading', { name: 'Lost in the void.' })).toBeVisible();
  await page.goto('http://localhost:3000/store/cart');
  await expect(page.getByText('Your cart is empty.', { exact: false })).toBeVisible();
});

test('official logo masking, scroll reveals and live reduced motion survive navigation', async ({ page }) => {
  await page.goto('/');
  const navbarLogo=page.locator('.site-header .brand-asset-mark');
  await expect(navbarLogo).toHaveAttribute('data-logo-active','true');
  await expect(navbarLogo.locator('img')).toHaveAttribute('src','/brand/logo.png');
  const logoGeometry=await navbarLogo.locator('img').evaluate(image=>{
    const bounds=image.getBoundingClientRect();
    return {natural:(image as HTMLImageElement).naturalWidth/(image as HTMLImageElement).naturalHeight,rendered:bounds.width/bounds.height};
  });
  expect(logoGeometry.rendered).toBeCloseTo(logoGeometry.natural,2);
  const sheen=navbarLogo.locator('.logo-sheen').first();
  const mask=await sheen.evaluate(element=>getComputedStyle(element).maskImage);
  expect(mask).toContain('/brand/logo.png');
  expect(await sheen.evaluate(element=>getComputedStyle(element,'::before').animationName)).toBe('logo-sweep');
  await page.locator('#customization').scrollIntoViewIfNeeded();
  await expect(page.locator('#customization h2')).toHaveCSS('opacity', '1');
  await page.locator('.footer-brand').scrollIntoViewIfNeeded();
  await expect(page.locator('.footer-brand .brand-asset')).toHaveAttribute('data-logo-animated','false');
  await expect(page.locator('.cinematic-world iframe')).toHaveCount(1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('html')).toHaveAttribute('data-reduced-motion','true');
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'void-reveal' && animation.playState === 'running').length)).toBe(0);
  await expect(sheen).toHaveCSS('display','none');
  await page.goto('/faq');
  await expect(page.locator('main h1')).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().filter(animation => animation.id === 'void-reveal' && animation.playState === 'running').length)).toBe(0);
});

test('Microsoft and email options have honest setup and callback error states', async ({ page }) => {
  for (const path of ['/login','/register']) {
    await page.goto(`http://localhost:3000/account${path}`);
    await expect(page.getByRole('button',{name:'Continue with Microsoft',exact:true})).toBeDisabled();
    await expect(page.getByLabel('Email address',{exact:true})).toBeVisible();
    await expect(page.getByLabel('Password',{exact:true})).toBeVisible();
    await expect(page.locator('#microsoft-hint')).toContainText('not available yet');
  }
  await page.goto('http://localhost:3000/account/login?error=account_not_linked');
  await expect(page.locator('#auth-error')).toContainText('connect Microsoft in Security');
  await page.goto('http://localhost:3000/account/login?error=email_not_verified');
  await expect(page.locator('#auth-error')).toContainText('Verify your email');
});
