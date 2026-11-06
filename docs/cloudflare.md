# Cloudflare Workers Deployment with OpenNext

This document details the configuration, prerequisites, dashboard settings, and deployment steps for hosting the unified Void Client application (`apps/website`) on Cloudflare using **OpenNext for Cloudflare** (`@opennextjs/cloudflare`) and **Cloudflare Workers with Static Assets**.

## Existing Pages build failures

A log mentioning `pages_build_output_dir` is a **Pages** deployment. This repository's Wrangler files configure a **Worker**. The OpenNext output cannot be deployed by pointing a Pages project's output directory at `.next` or `.open-next/assets`; the latter contains only assets, not the application server.

The old command `npm run brand:prepare && npm run build --workspace=@void/website` also skipped Prisma generation. On a clean install, the client had no schema-specific types, causing the dashboard's `activity.map(event => ...)` to fail with an implicit `any`. Each Next.js app now has a `prebuild` hook that generates the client from `backend/prisma/schema.prisma`. The CI workflow builds the website before any other generation step to cover this exact entry point.

For the full application, connect `main` to a Worker named `voidclient-website` with repository root `/`, build command `npm run build:cloudflare`, and deploy command `npm run deploy:worker --workspace=@void/website`. A Pages project cannot be converted just by changing its build command. If only Pages exists, create the Worker project first and verify its preview before transferring the custom domain. Keep the current Pages deployment available until that check passes.

Cloudflare documents [OpenNext on Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/). This project retains its existing OpenNext integration.

---

## 1. Architecture Overview

Void Client uses a single-origin Next.js architecture hosted on `https://voidclient.org`:
- `/` — Homepage, module showcase, downloads, media assets.
- `/store` & `/store/*` — Catalog, product details, shopping cart, and Stripe checkout.
- `/account` & `/account/*` — User authentication, profile, settings, Microsoft/Discord OAuth integration.
- `/api/*` — Route handlers for Better Auth (`/api/auth/*`), cart management, checkout sessions, order retrieval, and Stripe webhooks.

### Why Legacy Cloudflare Pages (Static Export) Is Incompatible
Previous deployments used static export (`output: 'export'`), outputting HTML files to an `out/` folder. With dynamic Better Auth authentication, server-side Stripe checkout sessions, and Prisma database connectivity, static export is no longer viable. Cloudflare Pages cannot execute dynamic Node.js / Edge route handlers without a server adapter.

### The OpenNext Solution
We use `@opennextjs/cloudflare` alongside `wrangler`:
- Packages the Next.js standalone server runtime into a Cloudflare Worker (`.open-next/worker.js`).
- Uses Cloudflare's `nodejs_compat` v2 flag for Node.js standard library APIs.
- Routes static assets (`.open-next/assets`) directly via Cloudflare's global CDN before invoking the Worker, reducing compute cost and latency.

---

## 2. Prerequisites & Auxiliary Services

1. **PostgreSQL Database**:
   - A hosted PostgreSQL instance (e.g. Neon, Supabase, Cloudflare Hyperdrive, or AWS RDS).
   - Must allow SSL connections (`sslmode=require`).
   - If using Cloudflare Hyperdrive for connection pooling, set `DATABASE_URL` to the Hyperdrive connection string.
2. **Mail Worker (`@void/backend`)**:
   - Cloudflare Workers are ephemeral and event-driven. They cannot maintain continuous background polling loops for the SMTP outbox.
   - Run `backend/dist/server.mjs` on a persistent Node.js host (e.g., Railway, Render, Fly.io, or VPS) sharing the same `DATABASE_URL` and `BETTER_AUTH_SECRET`.
3. **Stripe & OAuth Accounts**:
   - Stripe account with webhook endpoint configured for `https://voidclient.org/api/webhooks/stripe`.
   - Microsoft Entra / Azure App registration with redirect URI `https://voidclient.org/api/auth/callback/microsoft`.
   - Discord Developer OAuth application with redirect URI `https://voidclient.org/api/auth/callback/discord`.

---

## 3. Cloudflare Dashboard Settings

### Option A: Cloudflare Workers CI / Git Integration (Recommended)

When connecting your GitHub repository directly to Cloudflare:

1. In Cloudflare Dashboard, navigate to **Workers & Pages** > **Create application** > **Worker**.
2. Connect the GitHub repository `aryansaini-tech/void-client` and select branch `main` (or target release branch).
3. **Build Configuration**:
   - **Framework preset**: None / Custom
   - **Root directory**: `/` (repository root)
   - **Build command**:
     ```sh
     npm run build:cloudflare
     ```
   - **Deploy command** (if prompted):
     ```sh
     npm run deploy:worker --workspace=@void/website
     ```
4. **Compatibility Settings**:
   - **Compatibility date**: `2026-03-01`
   - **Compatibility flags**: `nodejs_compat`
5. **Static Assets**:
   - Binding name: `ASSETS`
   - Directory: `apps/website/.open-next/assets`

---

### Option B: Local CLI Deployment via Wrangler

You can deploy directly using Wrangler authenticated to your Cloudflare account:

```sh
# 1. Login to Cloudflare CLI
npx wrangler login

# 2. Run the production Cloudflare build
npm run build:cloudflare

# 3. Deploy the built worker and assets
npm run deploy:worker --workspace=@void/website
```

---

## 4. Environment Variables and Secrets

Set these in **Cloudflare Dashboard** under **Workers & Pages** > `voidclient-website` > **Settings** > **Variables and Secrets**:

### Encrypted Secrets (Never commit or expose in client)

| Name | Description | Example / Note |
| --- | --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection string | `postgresql://user:pass@ep-xyz-pooler.region.aws.neon.tech/neondb?sslmode=require` (must include `-pooler`) |
| `DIRECT_URL` | Direct PostgreSQL connection for migration jobs | Use the non-pooler host for hosted migrations; local PostgreSQL can use the same value as `DATABASE_URL` |
| `BETTER_AUTH_SECRET` | 32+ char secret for token signing | Generate via `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Canonical public origin | `https://voidclient.org` |
| `STRIPE_SECRET_KEY` | Stripe secret API key | `sk_live_...` (or `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` |
| `MICROSOFT_CLIENT_SECRET` | Azure OAuth Client Secret | From Azure Portal |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret | From Discord Developer Portal |

### Public Environment Variables (Plaintext)

| Name | Value | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_WEBSITE_URL` | `https://voidclient.org` | Public origin |
| `NEXT_PUBLIC_ACCOUNT_URL` | `https://voidclient.org/account` | Account route origin |
| `NEXT_PUBLIC_STORE_URL` | `https://voidclient.org/store` | Store route origin |
| `STORE_CHECKOUT_ENABLED` | `false` | Set `true` only when Stripe live payments are verified |
| `MICROSOFT_CLIENT_ID` | `<azure-client-id>` | Microsoft OAuth App ID, read by the server |
| `DISCORD_CLIENT_ID` | `<discord-client-id>` | Discord OAuth App ID, read by the server |

---

## 5. Custom Domain Configuration

To route `voidclient.org` to the Cloudflare Worker:

1. In Cloudflare Dashboard, go to **Workers & Pages** > **voidclient-website** > **Settings** > **Domains & Routes**.
2. Click **Add** > **Custom Domain**.
3. Enter `voidclient.org` and click **Add Custom Domain**.
4. Repeat for `www.voidclient.org` if desired.
5. Cloudflare will automatically provision SSL certificates and configure the DNS routing.

---

## 6. Pre-Launch Verification Checklist

- [ ] Database migrations applied once via `npm run db:deploy`.
- [ ] Mail worker running as a persistent Node service on background host.
- [ ] Cloudflare Worker environment variables and secrets populated.
- [ ] Stripe webhook endpoint `https://voidclient.org/api/webhooks/stripe` active and receiving test events.
- [ ] Microsoft and Discord redirect URIs updated with apex domain.
- [ ] Smoke test `/`, `/store`, `/account`, and `/api/auth/session` on live deployment.

