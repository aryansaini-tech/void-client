import { test, expect, type Frame, type Page } from '@playwright/test';

type SceneState = {
  ready: boolean; mode: string; progress: number; target: number; frame: number;
  time: number; position: number[]; reflectionUpdates: number; meshSource: string;
  resources: { disposed: boolean; frames: number; timers: number; resources: number };
};
type SceneWindow = Window & { __voidScene: {
  state: SceneState; setActive(active: boolean): void; dispose(): void;
} };
async function world(page: Page) {
  await expect(page.locator('.cinematic-world iframe')).toHaveCount(1);
  await expect.poll(() => page.frames().some(item => item.url().includes('/void/scene.html'))).toBe(true);
  const frame = page.frames().find(item => item.url().includes('/void/scene.html'))!;
  await expect.poll(() => frame.evaluate(() => (window as unknown as SceneWindow).__voidScene?.state.ready), { timeout: 90_000 }).toBe(true);
  return frame;
}
const state = (frame: Frame) => frame.evaluate(() => (window as unknown as SceneWindow).__voidScene.state);
async function chapter(page: Page, index: number) {
  await page.locator('[data-camera]').nth(index).evaluate((element, i) => {
    const top = i === 0 ? 0 : element.getBoundingClientRect().top + scrollY + (element as HTMLElement).offsetHeight * .35 - innerHeight * .35;
    window.scrollTo({ top, behavior: 'instant' });
  }, index);
}

test('content arrives before geometry and the camera starts at the current scroll chapter', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Software WebGL startup is verified once.');
  test.setTimeout(120_000);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/void/world-mesh.bin.gz', async route => { await gate; await route.continue(); });
  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Play beyond limits.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Download Client', exact: true }).first()).toBeVisible();
    await expect(page.locator('.world-still')).toBeVisible();
    await chapter(page, 5);
    release();
    const frame = await world(page);
    expect((await state(frame)).mode).toBe('webgl');
    await expect.poll(async () => (await state(frame)).progress).toBeGreaterThan(4.9);
    expect((await state(frame)).meshSource).toBe('baked');
  } finally { release(); }
});

test('nine camera chapters move smoothly, reverse, animate water and release the world', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('chromium'), 'WebKit receives the landscape fallback when WebGL is unavailable.');
  test.setTimeout(150_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  const frame = await world(page);
  expect((await state(frame)).mode).toBe('webgl');
  const positions: number[][] = [];
  for (let i = 0; i < 9; i++) {
    await chapter(page, i);
    await expect.poll(async () => Math.abs((await state(frame)).progress - i), { timeout: 12_000 }).toBeLessThan(.12);
    positions.push((await state(frame)).position);
    await expect(page.locator('[data-camera]').nth(i).locator('h1, h2').first()).toHaveCSS('opacity', '1');
  }
  for (let i = 1; i < positions.length; i++) {
    const distance = Math.hypot(...positions[i]!.map((value, axis) => value - positions[i - 1]![axis]!));
    expect(distance).toBeGreaterThan(2);
  }
  await chapter(page, 4);
  await expect.poll(async () => Math.abs((await state(frame)).progress - 4)).toBeLessThan(.12);
  await chapter(page, 0);
  await expect.poll(async () => (await state(frame)).progress).toBeLessThan(.12);
  const before = await state(frame);
  await expect.poll(async () => (await state(frame)).time).toBeGreaterThan(before.time);
  await expect.poll(async () => (await state(frame)).reflectionUpdates).toBeGreaterThan(before.reflectionUpdates);
  expect((await state(frame)).resources.frames).toBeLessThanOrEqual(1);
  await frame.evaluate(() => (window as unknown as SceneWindow).__voidScene.setActive(false));
  const stopped = await state(frame);
  await page.waitForTimeout(350);
  expect((await state(frame)).frame).toBe(stopped.frame);
  // Deterministically exercise the browser's visibility event contract.
  await frame.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    (window as unknown as SceneWindow).__voidScene.setActive(true);
  });
  await page.waitForTimeout(350);
  expect((await state(frame)).frame).toBe(stopped.frame);
  await frame.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await state(frame)).frame).toBeGreaterThan(stopped.frame);
  await page.evaluate(() => {
    const control = (document.querySelector('iframe') as HTMLIFrameElement).contentWindow as SceneWindow;
    const dispose = control.__voidScene.dispose;
    control.__voidScene.dispose = () => {
      dispose();
      (window as Window & { releasedWorld?: SceneState }).releasedWorld = control.__voidScene.state;
    };
  });
  // Client navigation must trigger the component's cleanup before removing its iframe.
  await page.locator('.world-feature[href="/modules"]').click();
  await expect(page).toHaveURL(/\/modules$/);
  const released = await page.evaluate(() => (window as Window & { releasedWorld?: SceneState }).releasedWorld);
  expect(released?.resources).toMatchObject({ disposed: true, frames: 0, timers: 0, resources: 0 });
  expect(errors).toEqual([]);
});

test('reduced motion freezes ambient effects but renders scroll viewpoints on demand', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Reduced WebGL rendering is verified once.');
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const frame = await world(page);
  await chapter(page, 2);
  await expect.poll(async () => (await state(frame)).progress).toBeCloseTo(2, 1);
  const before = await state(frame);
  await page.waitForTimeout(500);
  const after = await state(frame);
  expect(after.frame).toBe(before.frame);
  expect(after.time).toBe(0);
  await chapter(page, 6);
  await expect.poll(async () => (await state(frame)).progress).toBeCloseTo(6, 1);
  expect((await state(frame)).position).not.toEqual(before.position);
  await expect(page.locator('.cloth-canvas')).toHaveCount(0);
});

test('WebGL fallback, Monocraft and module details remain usable', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?nogl=1');
  const frame = await world(page);
  expect((await state(frame)).mode).toBe('fallback');
  await expect(page.locator('.world-still')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('18px Monocraft'))).toBe(true);
  expect(await page.locator('.site-header .wordmark-title').evaluate(node => getComputedStyle(node).fontFamily)).toContain('Monocraft');
  await page.goto('/modules');
  await page.locator('main:visible .module-detail-button').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('configured inside Minecraft');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('main:visible .module-detail-button').first()).toBeFocused();
  expect(errors).toEqual([]);
});

test('cloth initializes near its section and releases when motion preference changes', async ({ page }, info) => {
  test.skip(info.project.name !== 'chromium-desktop', 'Touch devices use the lightweight landscape cards.');
  test.setTimeout(120_000);
  await page.goto('/');
  await expect(page.locator('.cloth-canvas')).toHaveCount(0);
  await chapter(page, 3);
  await expect(page.locator('[data-cloth="active"]')).toHaveCount(3, { timeout: 30_000 });
  await page.locator('.landscape-card').first().hover();
  await expect(page.locator('.cloth-canvas').first()).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator('.cloth-canvas')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.locator('.landscape-card').first().scrollIntoViewIfNeeded();
  await expect(page.locator('[data-cloth="active"]')).toHaveCount(3, { timeout: 30_000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.cloth-canvas')).toHaveCount(0);
  await expect(page.locator('.cloth-still').first()).toBeVisible();
});
