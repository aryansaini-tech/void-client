# Actual verification report

Verified on **3 November 2026 (Asia/Kolkata)** in the supplied Windows workspace, using Node.js 24.19.0, npm 12.2.0 and an isolated PostgreSQL 17.11 database. This report includes the official-logo, theme, motion and Microsoft-login upgrade. Results describe executed checks, not a claim of a completed production deployment.

## Passed checks

| Check | Actual result |
| --- | --- |
| Dependency installation | Completed; compatible workspace dependencies recorded in `package-lock.json` |
| Prisma | Client generated; committed initial migration generated and applied to the disposable PostgreSQL database |
| `npm run build` | Website, account and store production builds passed, including Next.js TypeScript checking; backend compiled successfully |
| Production startup | All three Next standalone servers started with their static/public assets; compiled `backend/dist/server.mjs` started successfully |
| `npm run typecheck` | Passed for all applications, backend, shared/UI packages, test files and TypeScript configuration scripts |
| `npm run lint` | Passed |
| `npm test` | **21 passed, 0 failed** |
| `npm run test:integration` | **19 passed, 0 failed, 0 skipped** with a migrated disposable database |
| Configured HTTP smoke suite | **26 passed, 0 failed, 0 skipped** against the actual production servers |
| Worker health/readiness | `/health` returned 200; `/ready` returned 200 with the connected database and 503 while unavailable |
| `npm run check:config` | Ran successfully; reported missing credentials and disabled checkout without printing secrets |
| Official logo assets | Both original PNGs served byte-for-byte by all three apps, verified by SHA-256; icons and supplied partner image returned 200 |
| Concept artwork | Updated visual/interface concept SVGs rendered with Sharp and visually inspected; these are asset renders, not browser screenshots |
| Playwright discovery | **33 test/project combinations discovered in two files** |

Node's counts include parent test groups: the database run contains 18 scenario tests plus its parent. The HTTP run includes its route group and subtests. Counts are not an estimate of every individual assertion.

## Executed coverage

Unit checks cover integer-money totals, currency precision, missing/unavailable products, invalid quantities, duplicate/oversized carts, mixed currencies, checkout schemas, profile/registration validation, origin checks, bounded JSON input, redacted errors, authenticated email encryption, safe public/return URLs and local media paths.

Database integration checks exercise real password hashing, blocked unverified sign-in, verification mail delivered to a **localhost SMTP sink**, verification tokens, HttpOnly sessions, forged-cookie rejection, profile authorization, stale/concurrent cart revisions, generic credential errors, duplicate-account privacy, atomic rate limiting, signed payment event validation, event replay/idempotency, order ownership, monotonic refunds, reset-token replay protection, session revocation and logout.

New Microsoft scenarios validate personal-account authorization URLs, requested scopes, PKCE/state, cancellation without a session, forged ID-token rejection, untrusted origins/redirects, invalid callback state, fresh verified linking requirements and unconfigured-provider responses. A synthetic provider account exercises the last-sign-in-method guard and the real recovery flow that adds a hashed email credential. No code is exchanged with Microsoft, and no Microsoft sign-in success is simulated. The first test run exposed a library test-mode origin default; explicit checks were enabled and the final rerun passed.

The HTTP suite requests all **20 public application pages**, their metadata and referenced local scripts/styles/images. It checks security headers, main headings, protected-route redirects, unauthorized APIs, unknown products/categories, robots, sitemaps and original concept artwork. It accepts Next's native streamed redirect/not-found responses where applicable; it does not treat a streamed 200 alone as successful private access.

The configured HTTP scenario uses the actual compiled account and store servers. It registers and verifies a disposable account, signs in, reads all six private portal pages, updates the profile, authenticates the store with the same session, renders real database-backed category/product routes, persists a cart, reads purchase history and proves logout revokes store access. This also verifies that Prisma works inside the standalone deployment output.

Synthetic products, prices, identities and signed Stripe events exist **only as explicitly labelled test fixtures**. Tests remove their tracked records. No real sale, provider payment, external email or client download occurred. The default catalog and production seed contain no products or purchases.

## Browser execution remains blocked

The Playwright suite is written and its discovery ran, but **browser tests did not execute successfully in this environment**. The local browser bridge had no available backend, and a fresh desktop/browser inventory reported an unavailable browser host and missing Computer Use native pipe. Earlier Chrome/headless-shell startup failed with Windows `Access is denied (0x5)`. The upgrade's targeted logo/motion test again failed to launch its Playwright worker with `spawn EPERM`. These are not passing UI results; no security settings were changed to bypass the restriction.

Consequently, visual quality, interactive browser behavior, client console errors, animation smoothness/FPS, Lighthouse scores and real device behavior remain unverified. The source and suite include responsive/reduced-motion support, but no claim is made that the 320, 375, 390, 430, 768, 1024, 1440 and 1920 pixel layouts were visually tested. Physical iOS Safari and Android testing is still required.

The pending suite covers page rendering, overflow at the requested widths, mobile menu focus/scroll lock/Escape/outside click, filters/search/accordions, download availability, keyboard showcase tabs, gallery lightbox, history/refresh/direct links, official-logo masking/proportions, offscreen animation pausing, live reduced motion, Microsoft unavailable/callback states, account flows and store/cart interactions. Projects target desktop Chromium, mobile Chromium and mobile WebKit. Some configuration-dependent cases intentionally skip without a test database.

## Reproduce the checks

```sh
npm ci
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
```

For database tests, create a **disposable database ending in `_test`**, migrate it using `npm run db:deploy` with `DATABASE_URL` set to that database, then supply its URL as `TEST_DATABASE_URL` to `npm run test:integration`. Port 2526 must be free for the local SMTP sink.

With production servers running on ports 3000–3002, `npm run test:http` runs public HTTP checks. The optional configured scenario normally skips. To include it, run account/store with the same disposable `DATABASE_URL`, sufficiently random `BETTER_AUTH_SECRET`, local public origins, `BETTER_AUTH_URL=http://localhost:3001`, `AUTH_COOKIE_DOMAIN=` and `VOID_LOCAL_PREVIEW=true`. Configure local email queuing, keep the mail worker stopped for this scenario, and pass that same environment plus `TEST_DATABASE_URL` and `VOID_HTTP_CONFIGURED=true` to the test process. It reads only its own queued verification message. Never enable this fixture scenario against a real customer database.

On a host that permits browser processes:

```sh
npx playwright install chromium webkit
npm run test:e2e
```

Set `TEST_DATABASE_URL` for configured browser cases. Playwright starts the built servers itself; leave `VOID_E2E_REUSE_SERVERS` unset unless intentionally testing matching existing servers. The CI workflow includes PostgreSQL, migration, checks, builds and browser execution. That workflow has been prepared, **not run remotely** in this session.

## Environment-specific notes

Windows locked Prisma's native DLL while preview/tool processes held it. Those owned processes were released before client generation; no type checking was disabled. Restarting the interrupted disposable PostgreSQL instance initially failed its checkpoint signal in this restricted environment. A standard single-user checkpoint completed recovery, the database restarted successfully, and the final integration/HTTP reruns passed. No production database was involved.

Additional release work requires the real environment: Docker image builds, hosting and DNS/HTTPS validation, cross-subdomain secure cookies, actual SMTP delivery, Microsoft and Discord OAuth exchanges, Stripe-hosted test checkout/webhook retries, product fulfillment, security review and physical-device/browser QA. None of those is represented as completed here. See [Microsoft configuration](microsoft-login.md) and [the visual upgrade](visual-upgrade.md).
