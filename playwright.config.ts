import { defineConfig, devices } from '@playwright/test';
import { randomBytes } from 'node:crypto';

const database = process.env.TEST_DATABASE_URL ?? '';
if (database && !new URL(database).pathname.endsWith('_test')) throw new Error('Browser fixtures require a disposable database ending in _test.');
const secret = database ? (process.env.VOID_E2E_SECRET ?? randomBytes(48).toString('base64url')) : '';
const chromiumChannel = process.env.VOID_E2E_CHROMIUM_CHANNEL || undefined;
process.env.VOID_E2E_SECRET = secret;
// Explicit test configuration takes precedence over a developer's root .env.
const environment = {
  NEXT_PUBLIC_WEBSITE_URL: 'http://localhost:3000',
  NEXT_PUBLIC_ACCOUNT_URL: 'http://localhost:3000/account',
  NEXT_PUBLIC_STORE_URL: 'http://localhost:3000/store',
  DATABASE_URL: database, DIRECT_URL: database, BETTER_AUTH_SECRET: secret,
  BETTER_AUTH_URL: 'http://localhost:3000', AUTH_COOKIE_DOMAIN: '',
  SMTP_HOST: database ? '127.0.0.1' : '', SMTP_PORT: '2527', SMTP_SECURE: 'false',
  EMAIL_FROM: database ? 'Void E2E <noreply@example.test>' : '',
  SMTP_USER: '', SMTP_PASSWORD: '', STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '',
  STORE_CHECKOUT_ENABLED: 'false', DISCORD_CLIENT_ID: '', DISCORD_CLIENT_SECRET: '',
  MICROSOFT_CLIENT_ID: '', MICROSOFT_CLIENT_SECRET: '', MICROSOFT_TENANT_ID: 'consumers',
  VOID_LOCAL_PREVIEW: 'true', VOID_BIND_HOST: '127.0.0.1',
};
Object.assign(process.env, environment);

export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  timeout: 45_000, expect: { timeout: 8_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: environment.NEXT_PUBLIC_WEBSITE_URL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], channel: chromiumChannel, viewport: { width: 1440, height: 960 }, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], channel: chromiumChannel, launchOptions: { args: ['--enable-unsafe-swiftshader'] } } },
    { name: 'webkit-mobile', use: { ...devices['iPhone 13'] } },
  ],
  webServer: ['website', 'account', 'store'].map((app, index) => ({
    command: `npm run start --workspace=@void/${app}`,
    url: `http://localhost:${3000 + index}${app === 'account' ? '/login' : '/'}`,
    env: environment, timeout: 120_000,
    reuseExistingServer: process.env.VOID_E2E_REUSE_SERVERS === 'true',
  })),
});
