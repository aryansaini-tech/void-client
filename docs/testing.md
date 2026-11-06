# Verification report: Void redesign and recovery

Verified on **6 November 2026 (Asia/Kolkata)** in the supplied Windows workspace with Node.js 24.19.0, npm 12.2.0, production Next.js servers, and the disposable local PostgreSQL database. The redesign was recovered from the existing working tree; repository screenshots and source files supplied the design context. This replaces the 5 November results. No production database operation, provider transaction, external email, or DNS change was performed.

## Results

| Check | Executed result |
| --- | --- |
| Production builds | Website, account, store, and backend all passed after the final application fixes |
| Cloudflare build | `npm run build:cloudflare` passed with the production public URLs and generated the OpenNext Worker bundle |
| Monorepo typecheck | Passed for all applications and backend |
| Test TypeScript compilation | `npx tsc --project tsconfig.tests.json --noEmit` passed |
| Lint | `npm run lint` passed |
| Unit tests | **23 passed, 0 failed** |
| PostgreSQL integration | **19 passed, 0 failed** |
| Production HTTP smoke tests | **37 passed, 0 failed**, including configured authentication and cart flow |
| Complete browser suite | **67 passed, 0 failed, 8 intentional duplicate skips**, in one fresh 75-combination run on desktop Chromium, mobile Chromium, and mobile WebKit |
| Migration configuration | `npm run db:deploy` passed with `DATABASE_URL` and `DIRECT_URL` set to the same local test database; CI now supplies both |
| Visual and interaction review | 28 state checks and 34 account/store captures passed; local screenshots were visually inspected |
| Patch whitespace | `git diff --check` passed |

Node's test counts include parent groups. Browser counts refer to test/project combinations, not individual assertions. The eight skips run the viewport matrix, official-logo geometry matrix, configured account flow, and configured catalog flow once instead of duplicating them on both mobile projects.

### Browser run history and fixes

The interrupted redesign session left a 75-combination browser report with 64 passes, three WebKit failures, and eight intentional skips. The failures concerned unfinished route prefetches during document teardown, gallery focus restoration, and a reduced-motion assertion made before the preference update completed.

The saved implementation already restored focus to the lightbox trigger, and the saved tests waited for route assets and the live motion preference. Recovery rebuilt those files and ran the entire suite successfully. No failed checks were removed or changed to skips. Existing checks continue to cover readable HTML without JavaScript, hydration-ready fields, native scrolling, and actual Web Animations API reveal completion without replay.

The first recovery build encountered a Windows file lock from local preview servers. Stopping those processes resolved it; website, account, store, and backend then built successfully.

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

Create a disposable PostgreSQL database whose name ends in `_test`. Apply the existing migration with both `DATABASE_URL` and `DIRECT_URL` pointing to it, then supply that same URL as `TEST_DATABASE_URL` for `npm run test:integration` and `npm run test:e2e`. The integration suite uses a localhost SMTP sink on port 2526. Playwright configures and starts the built servers with local fixture credentials; leave `VOID_E2E_REUSE_SERVERS` unset unless deliberately reusing servers with matching configuration.

For configured HTTP tests, run the production servers on ports 3000–3002 with the same disposable database, auth secret, localhost public URLs, `BETTER_AUTH_URL=http://localhost:3000`, empty `AUTH_COOKIE_DOMAIN`, and local email queuing configured. Keep the mail worker stopped for this scenario. Run `npm run test:http` with that same environment, `TEST_DATABASE_URL`, and `VOID_HTTP_CONFIGURED=true`; it reads only its own queued verification message. Never use customer data for these fixtures.

## Limits

The browser checks use emulated desktop/mobile layouts, not physical phones. No measured FPS, Lighthouse score, real Microsoft/Discord exchange, Stripe-hosted payment, external email delivery, Docker image build, or production hosting validation is claimed. Provider security paths were tested with local fixtures; live credentials were unavailable. Test identities and products are explicitly synthetic and cleaned up by their tests.

The integrated website now requires a server runtime; static Cloudflare Pages `out` hosting cannot serve the account/store APIs. See [single-origin implementation and future hosting requirements](single-origin.md). No hosting settings, provider registrations, webhook endpoints, DNS, or production deployment were changed.
