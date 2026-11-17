# Verification report: Void cinematic release

Verified on **17 November 2026 (Asia/Kolkata)** in the supplied Windows workspace with Node.js 24.19.0, production Next.js servers, desktop Chromium, mobile Chromium, mobile WebKit, and the disposable local PostgreSQL database. The cinematic design is integrated across the website, account, and store. Start the local preview at `http://localhost:3000` with `npm run dev:website`.

## Current release checks

| Check | Executed result |
| --- | --- |
| Production builds | Website, account, store, and backend passed after the final menu and cloth fixes |
| Cloudflare build | Production public URLs; Next.js 16.4.6, OpenNext 1.20.17, and the Worker bundle passed |
| TypeScript | Full monorepo typecheck passed; test TypeScript compilation also passed after the browser fixes |
| Lint | Passed without warnings after the application fixes |
| Unit tests | **23 passed, 0 failed** |
| PostgreSQL integration | **19 passed, 0 failed**, including actual local SMTP delivery |
| Production HTTP checks | **38 passed, 0 failed**, including authenticated account/cart operations and the cinematic document's embedding headers |
| Final browser coverage | Full 90-combination run followed by **7 passed, 0 failed, 2 intentional skips** for the corrected fixtures; see the run history below |
| Asset regeneration | `npm run cinematic:prepare` passed; production builds use the included assets without the reference folder |
| Live dependency audit | **0 vulnerabilities**, with the final report saved locally at `.cache/final-audit.json` |
| Whitespace | `git diff --check` passed |

## Browser findings and corrections

The initial **90-combination** run produced 73 passes, 15 intentional duplicate/engine skips, and two desktop failures. Both failures were corrected in application code:

- The mobile navigation's initial route effect could close a menu opened by a replayed first tap during hydration. It now closes the menu only when the pathname changes. Route navigation, Escape, outside clicks, focus restoration, and desktop resizing retain their existing behavior.
- The desktop cloth renderer's 48px bleed could expand the document after resizing to a phone width. The surface now contains that overflow, and a live viewport/pointer subscription releases the simulation on narrow layouts. Returning to desktop initializes it again. The cloth check now exercises this round trip and reduced-motion cleanup.

The earlier follow-up **36-combination** run finished with **33 passes, zero failures, and three intentional engine/duplicate skips**. It covered the affected interactions in all three browser projects: nine camera chapters, cloth resizing and cleanup, public routes/assets, mobile menu controls, logo/reveal behavior, shared navigation, mobile branding, rapid scrolling, no-JavaScript content, and theme persistence.

Finalization repeated the complete **90-combination** suite against fresh production builds. It completed with **73 passes, 15 intentional duplicate/engine skips, and two WebKit fixture failures**. The direct-route fixture collected cancelled prefetch errors during document replacement; each route now owns a separate page and asserts its errors before closing that document. The mobile reveal fixture now scrolls the last stacked landscape card into view before checking its opacity and unchanged section geometry. The configured dashboard capture also waits for its heading to render after sign-in.

The final **9-combination** rerun covered all three corrected fixtures across all browser projects and finished with **7 passes, zero failures, and two intentional duplicate skips**. Page-error, hydration, asset-response, metadata, geometry, and opacity assertions remain in place. Test lint and TypeScript checks passed after these corrections. The full suite was not repeated after these fixture-only changes. The full-run report is retained locally at `.cache/cinematic-final-full-report.html`; the final rerun report and captures are in `.cache/cinematic-signoff-report/` and `.cache/cinematic-signoff-results/`.

An initial concurrent HTTP/browser finalization attempt hit timeouts and was stopped. Sequential HTTP verification passed all **38 checks**, and the complete browser rerun used `--timeout=180000` on this Windows host. Application builds, full typecheck, lint, all 23 unit tests, all 19 integration tests, and the live zero-vulnerability audit passed again during finalization.

Desktop and mobile homepage captures, the configured account dashboard and cart, and the final mobile website/account/store captures were visually inspected. Reduced motion freezes ambient WebGL effects while retaining on-demand camera viewpoints. Software WebGL verifies behavior and cleanup; it does not measure physical-device FPS.

## Configuration and reproduction

Use the build/test commands below with the documented disposable database. Keep Prisma generation/builds separate from tests and running production servers on Windows because the native query engine can be locked while in use.

The browser config defaults to Playwright's installed Chromium, including in CI. On this Windows host the run explicitly used `VOID_E2E_CHROMIUM_CHANNEL=chrome` and `npm run test:e2e -- --timeout=180000`. Set that variable to use installed Chrome; otherwise omit it. The targeted cinematic checks are also available as `npm run verify:cinematic`.

The verified configuration is local. Production launch still requires the actual service credentials and infrastructure, approved legal/product/fulfillment information, and verified release/download content described in [the README](../README.md#content-and-launch-requirements). Microsoft/Discord exchanges, Stripe-hosted payments, external mail delivery, DNS changes, and production deployment were not performed. The Worker artifact is prepared for the documented [Cloudflare deployment](cloudflare.md).

## Historical verification: 6 November 2026

The following report retains the earlier redesign/recovery evidence. Its counts and dates are historical; the current results are above.

Verified on **6 November 2026 (Asia/Kolkata)** in the supplied Windows workspace with Node.js 24.19.0, npm 12.2.0, production Next.js servers, and the disposable local PostgreSQL database. The redesign was recovered from the existing working tree; repository screenshots and source files supplied the design context. This replaces the 5 November results. No production database operation, provider transaction, external email, or DNS change was performed.

## Clean-install deployment build follow-up

The Pages log for commit `d767b54` exposed a build entry point the original verification did not cover: `npm run brand:prepare && npm run build --workspace=@void/website`. Unlike the root build commands, it did not generate Prisma before TypeScript ran. The earlier builds had a generated client and therefore did not catch this case.

In a separate source copy with freshly installed dependencies and Prisma's default ungenerated client, the original workspace build reproduced the exact dashboard error at `page.tsx:34:72`. After applying the `prebuild` hook, the same workspace build generated Prisma 6.19.3 and completed compilation, strict TypeScript checks, page generation, and standalone output without a database or a local `.env` file. The account and store generation hooks also passed. No application types were weakened or assertions added to hide the error.

Lint, the full monorepo/test TypeScript check, and all 23 unit tests passed again. The production `npm run build:cloudflare` also passed, including Next.js compilation, strict TypeScript checks, page generation, and the final OpenNext Worker bundle. CI now explicitly skips automatic Prisma generation during installation and builds the website before any other generation step, making the missing-client case part of the normal workflow. The application behavior is unchanged; the full integration, HTTP, and browser results below are from the preceding redesign verification.

The supplied log is still from Cloudflare **Pages**. The OpenNext artifact targets **Workers**. A repository build fix does not change that external project type; see [the Cloudflare setup and troubleshooting instructions](cloudflare.md#existing-pages-build-failures).

## Redesign verification results

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
