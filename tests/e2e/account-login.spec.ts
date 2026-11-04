import { test, expect } from '@playwright/test';

const account = 'http://localhost:3000/account';

test('password visibility preserves entered values and toggles each field independently', async ({ page }) => {
  await page.goto(account + '/register');
  const password = page.getByLabel('Password', { exact: true });
  const confirmation = page.getByLabel('Confirm password', { exact: true });
  await password.fill('test-only passphrase');
  await confirmation.fill('test-only confirmation');

  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await expect(password).toHaveValue('test-only passphrase');
  await expect(confirmation).toHaveAttribute('type', 'password');

  await page.getByRole('button', { name: 'Show confirm password', exact: true }).click();
  await expect(confirmation).toHaveAttribute('type', 'text');
  await expect(confirmation).toHaveValue('test-only confirmation');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'password');
  await expect(confirmation).toHaveAttribute('type', 'text');
  await expect(page.locator('#auth-error')).toBeEmpty();
});

test('recovery and verification retain a trusted checkout destination', async ({ page }) => {
  const destination = 'http://localhost:3000/store/checkout';
  const query = '?returnTo=' + encodeURIComponent(destination);
  await page.goto(account + '/login' + query);

  await page.getByRole('link', { name: 'Forgot password?', exact: true }).click();
  await expect(page).toHaveURL(account + '/forgot-password' + query);
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click();
  await expect(page).toHaveURL(account + '/login' + query);

  await page.getByRole('link', { name: 'Need to verify your email?', exact: true }).click();
  await expect(page).toHaveURL(account + '/verify-email' + query);
  await page.getByRole('link', { name: 'Back to sign in', exact: true }).click();
  await expect(page).toHaveURL(account + '/login' + query);

  await page.goto(account + '/reset-password' + query);
  await expect(page.getByRole('link', { name: 'Back to sign in', exact: true })).toHaveAttribute('href', account + '/login' + query);
});

test('untrusted return destinations are discarded throughout recovery', async ({ page }) => {
  const fallback = '?returnTo=' + encodeURIComponent(account + '/dashboard');
  for (const path of ['/login', '/forgot-password', '/verify-email', '/reset-password']) {
    await page.goto(account + path + '?returnTo=https%3A%2F%2Funtrusted.example%2Fcheckout');
    if (path === '/login') {
      await expect(page.getByRole('link', { name: 'Forgot password?', exact: true })).toHaveAttribute('href', account + '/forgot-password' + fallback);
    } else {
      await expect(page.getByRole('link', { name: 'Back to sign in', exact: true })).toHaveAttribute('href', account + '/login' + fallback);
    }
  }
});

test('invalid credentials identify and focus the field without a network request', async ({ page }) => {
  test.skip(!process.env.TEST_DATABASE_URL, 'Requires the configured account fixture to enable sign-in.');
  const signInRequests: string[] = [];
  page.on('request', request => {
    if (request.url().includes('/api/auth/sign-in/')) signInRequests.push(request.url());
  });
  await page.goto(account + '/login');
  const email = page.getByLabel('Email address', { exact: true });
  const password = page.getByLabel('Password', { exact: true });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAccessibleDescription('Enter a valid email address.');

  await email.fill('player@example.test');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(password).toBeFocused();
  await expect(password).toHaveAccessibleDescription('Enter your password.');
  expect(signInRequests).toEqual([]);
});
