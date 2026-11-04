# Website, store and account on one origin

The website now serves the store at `/store` and the account portal at `/account`. Thin route entrypoints import the implementations in `apps/store` and `apps/account`; there is no duplicated commerce or authentication backend. Explicit package exports replace app-local `@/` imports so modules resolve correctly in both builds.

The website has one shared header, footer and motion root. Its store layout reuses `StoreProvider` to load the catalog and verified viewer in parallel and preserve the cart across store navigation. Store/account child layouts retain the existing authentication forms, protected portal, product details, orders, loading and error boundaries.

## Routes and configuration

| Area | Public URL | API paths |
| --- | --- | --- |
| Website | `https://voidclient.org` | Shared services below |
| Account | `https://voidclient.org/account` | `/api/auth/*`, `/api/profile`, `/api/settings`, `/api/sessions` |
| Store | `https://voidclient.org/store` | `/api/cart`, `/api/checkout`, `/api/orders/*`, `/api/webhooks/stripe` |

Run `npm run dev:website` for all three areas at localhost:3000. `npm run dev` also starts the original standalone applications on ports 3001/3002 and the mail worker. Standalone route paths and APIs remain available. To use separate deployments, explicitly configure the existing `NEXT_PUBLIC_ACCOUNT_URL` and `NEXT_PUBLIC_STORE_URL` overrides to their standalone origins.

Production defaults and Docker build arguments point at the single origin. Local defaults use `http://localhost:3000/account` and `/store`. All public URL values must match between build time and runtime. `VOID_LOCAL_PREVIEW=true` is only for production builds tested on loopback; CI sets it while building its browser fixtures.

Better Auth stays at **`/api/auth`**, independent of the account page prefix. `BETTER_AUTH_URL` is the public origin (`https://voidclient.org`), and trusted origins are normalized to origins. Return destinations are restricted to the correct account/store route prefixes, including checkout and order details. Existing origin checks, CSRF protection, verified-email requirements, session ownership, rate limits, Stripe signatures and server-side prices are preserved.

## Hosting migration notes (no deployment performed)

The website uses Next.js standalone output instead of static export. A static Cloudflare Pages `out` directory cannot serve these API handlers; use a compatible server runtime when deployment is separately authorized. The existing Dockerfile builds the integrated application with `APP=website`. PostgreSQL, auth secrets, mail configuration and optional payment/OAuth credentials must be available to that server. Keep the mail worker running.

Before a future migration, update the public URL environment variables consistently. Register `https://voidclient.org/api/auth/callback/microsoft` and `/api/auth/callback/discord` with the providers, and point the Stripe webhook at `https://voidclient.org/api/webhooks/stripe`. Keep old callbacks/endpoints active during any transition. This change does not alter provider registrations, webhook configuration, DNS, or hosting settings.

Keep the existing database, auth secret, cookie prefix and any already configured `AUTH_COOKIE_DOMAIN` to preserve existing domain-scoped sessions. Host-only cookies on an old account subdomain cannot be read on the apex domain; those users must sign in on the new origin. A new single-origin installation can use host-only cookies by leaving `AUTH_COOKIE_DOMAIN` empty.

## Header and motion

The mobile wordmark uses a square 36px official mark and a fixed text measure with Monocraft preloaded. The header keeps one height while scrolling, with separate nonshrinking controls and 44px targets. The source artwork, colors, and typography are retained.

Reveals use the Web Animations API without modifying React-owned HTML during streaming. Content is visible by default, reveals start just before the viewport, and large scroll jumps reveal their destination immediately. Mobile reveals use shorter durations. Scroll depth batches work in one animation frame, caches layout measurements between resizes/content changes, and avoids writing unchanged transforms. Motion stops with the OS/account preference, cleans up during navigation and remains keyboard-accessible.

See `tests/e2e/single-origin.spec.ts` for navigation, API protection, mobile logo geometry and stable-layout regression checks. The existing public, account and configured commerce suites exercise the integrated routes; HTTP smoke tests also retain standalone app coverage. Database/provider-dependent checks require the documented local fixtures and are reported separately.
