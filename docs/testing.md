# Verification report: single-origin store and account

Verified on **5 November 2026 (Asia/Kolkata)** in the supplied Windows workspace with Node.js 24.19.0, npm 12.2.0, production Next.js servers, and a fresh disposable PostgreSQL database. This replaces the 3 November report; browser execution was available for this round through Playwright. No deployment, DNS change, or production database operation was performed.

## Results

| Check | Executed result |
| --- | --- |
| Production builds | Website, account, store, and backend all passed after the final application fixes |
| Monorepo typecheck | Passed for all applications and backend |
| Test TypeScript compilation | `npx tsc --project tsconfig.tests.json --noEmit` passed |
| Lint | `npm run lint` passed |
| Unit tests | **23 passed, 0 failed** |
| PostgreSQL integration | **19 passed, 0 failed** |
| Production HTTP smoke tests | **37 passed, 0 failed**, including configured authentication and cart flow |
| Browser coverage | **66 distinct test/project combinations passed across the full run and targeted reruns**; 6 intentional duplicate skips |
| Final browser rerun | **6 passed, 0 failed**: single-origin navigation and actual reveal/replay checks on all three browser projects |
| Patch whitespace | `git diff --check` passed |

Node's test counts include parent groups. Browser counts refer to test/project combinations, not individual assertions. The six skips run the viewport matrix, configured account flow, and configured catalog flow only once instead of duplicating them on both mobile projects.

### Browser run history and fixes

The first full run executed 72 combinations: 59 passed, 7 failed, and 6 intentionally skipped. The failures exposed homepage content hidden behind a streamed root loading boundary without JavaScript, WebKit input entered before hydration, an insufficient timeout for the multi-page public-route matrix, and an animation assertion that could miss a short reveal.

The root website loader was removed, interactive fields wait until handlers are attached, the multi-page test has a bounded 120-second timeout, and the animation test records real Web Animations API calls while preserving their behavior. It checks that the reveal finishes and does not replay on a return scroll. Navigation testing waits for fonts and the initialized shell before jumping straight to the footer.

A 21-combination targeted rerun passed 17 with 2 intentional skips and 2 intermittent WebKit navigation/animation failures. Both checks then passed twice in a focused WebKit run. After tightening the test synchronization, the final six-combination run passed on desktop Chromium, mobile Chromium, and mobile WebKit. **A fresh full 72-combination run was not performed after those corrections.**

## Coverage

- Single-origin navigation through `/`, `/store`, cart, products, `/account/login`, registration, and home; direct loads, refresh/history, one header/footer/main, and hydration errors.
- Protected account pages and existing root API paths, trusted origins and return destinations, verified-email requirements, session ownership, and unauthenticated responses.
- Real disposable-user registration, verification, sign-in, profile/settings changes, private pages, cart persistence, and logout. HTTP checks also cover the original standalone applications on ports 3001 and 3002.
- Password visibility and recovery, input validation, search/filter controls, accordions, gallery/lightbox controls, mobile menu focus/scroll lock/Escape, theme persistence, and missing-provider states.
- Widths **320, 375, 390, 430, 768, 1024, 1440, and 1920px**. Mobile logo geometry on the website, store, and account at 320/375/390/430px in Chromium and WebKit verifies proportions, alignment, spacing, overflow, and stable header height during scrolling. Desktop and mobile screenshots were visually inspected.
- Content readability without JavaScript, reveal completion and no replay, large scroll jumps, unchanged document geometry, resizing, live reduced-motion preferences, and disabled mobile depth effects.

Database integration includes real password hashing, verification delivered to a local SMTP sink, HttpOnly sessions, forged-cookie rejection, profile authorization, concurrent cart revisions, rate limits, signed Stripe event fixtures, idempotency, order ownership, refunds, recovery token replay protection, session revocation, and OAuth state/PKCE/origin rejection.

## Reproduce

On Windows use `npm.cmd` / `npx.cmd` when PowerShell script execution is restricted. Install dependencies and browser binaries as needed, then run:

```sh
npm ci
npm run db:generate
npm run lint
npm run typecheck
npx tsc --project tsconfig.tests.json --noEmit
npm test
```

For local production browser fixtures, set the following **before building**, since public URLs are embedded in client bundles:

```powershell
$env:VOID_LOCAL_PREVIEW='true'
$env:NEXT_PUBLIC_WEBSITE_URL='http://localhost:3000'
$env:NEXT_PUBLIC_ACCOUNT_URL='http://localhost:3000/account'
$env:NEXT_PUBLIC_STORE_URL='http://localhost:3000/store'
npm.cmd run build
```

Create a disposable PostgreSQL database whose name ends in `_test`. Apply the existing migration with `DATABASE_URL` pointing to it, then supply that same URL as `TEST_DATABASE_URL` for `npm run test:integration` and `npm run test:e2e`. The integration suite uses a localhost SMTP sink on port 2526. Playwright configures and starts the built servers with local fixture credentials; leave `VOID_E2E_REUSE_SERVERS` unset unless deliberately reusing servers with matching configuration.

For configured HTTP tests, run the production servers on ports 3000–3002 with the same disposable database, auth secret, localhost public URLs, `BETTER_AUTH_URL=http://localhost:3000`, empty `AUTH_COOKIE_DOMAIN`, and local email queuing configured. Keep the mail worker stopped for this scenario. Run `npm run test:http` with that same environment, `TEST_DATABASE_URL`, and `VOID_HTTP_CONFIGURED=true`; it reads only its own queued verification message. Never use customer data for these fixtures.

## Limits

The browser checks use emulated desktop/mobile layouts, not physical phones. No measured FPS, Lighthouse score, real Microsoft/Discord exchange, Stripe-hosted payment, external email delivery, Docker image build, or production hosting validation is claimed. Provider security paths were tested with local fixtures; live credentials were unavailable. Test identities and products are explicitly synthetic and cleaned up by their tests.

The integrated website now requires a server runtime; static Cloudflare Pages `out` hosting cannot serve the account/store APIs. See [single-origin implementation and future hosting requirements](single-origin.md). No hosting settings, provider registrations, webhook endpoints, DNS, or production deployment were changed.
