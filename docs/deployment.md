# Deployment and DNS

> The default website now includes `/store` and `/account` on `voidclient.org`. For Cloudflare deployment instructions, see the dedicated [Cloudflare Deployment Guide](cloudflare.md). See [single-origin routing](single-origin.md) for current URLs and server requirements. Standalone app instructions below remain available for separate hosting.

These are deployment instructions, not a record of a completed deployment. No hosting project, production database, DNS target, IP address, certificate or payment account has been created.

## Recommended Cloudflare Deployment (Single-Origin)

The unified website (`apps/website`) supports the existing Cloudflare Pages Git project through advanced-mode server packaging, as well as **Cloudflare Workers + OpenNext** (`@opennextjs/cloudflare`). For Pages, use `npm run build:pages` and output `apps/website/out`; the existing website workspace build also prepares that artifact automatically when Cloudflare sets `CF_PAGES=1`. See [Pages build recovery and configuration](cloudflare.md#existing-pages-build-failures).

- **Deployment Guide**: [docs/cloudflare.md](cloudflare.md)
- **Build command**: `npm run build:cloudflare`
- **Deploy command**: `npm run deploy:cloudflare` (or `npx wrangler deploy` from `apps/website`)
- **Worker Configuration**: `apps/website/wrangler.jsonc`
- **Worker Bundle**: `apps/website/.open-next/worker.js`
- **Assets**: `apps/website/.open-next/assets`
- **Domain**: `voidclient.org`

## Suitable hosting

Use hosting that supports Next.js App Router with SSR, Node.js route handlers, outgoing database connections and environment secrets. The account/store cannot be exported as static HTML. Typical shared PHP/WordPress hosting is insufficient.

One suitable arrangement is three Vercel projects for the apps, managed PostgreSQL, and a persistent Node/Docker worker on a service such as Render, Railway or Fly.io. Another is three separate app containers plus the worker behind an HTTPS reverse proxy. Review current provider plans, runtime limits, deployment regions and database connection limits when choosing hosting; no paid plan is assumed.

Do not place the email loop inside a short-lived serverless function. Build with `npm run build --workspace=@void/backend`, then run `npm run start --workspace=@void/backend` as a persistent process or adapt the persisted outbox to a provider-supported scheduled/queue worker. The production entry point is `backend/dist/server.mjs`. Keep it in the database region.

## Three Next.js projects

Create three projects connected to this repository:

| Project | Root directory | Build command from that root | Domain |
| --- | --- | --- | --- |
| Website | `apps/website` | `cd ../.. && npm run db:generate && npm run build --workspace=@void/website` | `voidclient.org` |
| Account | `apps/account` | `cd ../.. && npm run db:generate && npm run build --workspace=@void/account` | `account.voidclient.org` |
| Store | `apps/store` | `cd ../.. && npm run db:generate && npm run build --workspace=@void/store` | `store.voidclient.org` |

Use `cd ../.. && npm ci` as the install command where needed, enable access to shared files outside the app root, and retain the provider's Next.js output handling. Set Node 22.15+ or 24 LTS. Shared packages must be included in each build; deploying only an `apps/*` folder without the workspace packages will fail.

Set all three public origins consistently in every project **before building**. The website needs no server secrets. Account/store/worker share the database and auth secret. Account/worker need email configuration. Store alone needs Stripe credentials. Configure Microsoft login and optional Discord linking in the account app only. See [environment](environment.md) and [Microsoft setup](microsoft-login.md).

Run `npm run db:deploy` once as a release job using the provider's direct migration connection if its pooled connection does not support migrations. Do not let three parallel frontend builds race to author migrations. Never use `migrate dev` or `db reset` in production.

## Containers

The root Dockerfile builds one independent Next standalone app using `--build-arg APP=website`, `account` or `store`. Its runtime is non-root and includes that app's server, static assets and public files. All public `NEXT_PUBLIC_*` values must be provided as build arguments. Server secrets belong in runtime environment injection, never build args or image layers.

```sh
docker build --build-arg APP=website -t void-website .
docker build --build-arg APP=account -t void-account .
docker build --build-arg APP=store -t void-store .
docker build -f backend/Dockerfile -t void-backend .
```

Defaults target the three requested HTTPS domains. Add public invite/download/release/policy build arguments only when confirmed. Each frontend container listens on port 3000 internally; map separate internal services through the reverse proxy. The worker listens on 3003. PostgreSQL and worker ports should stay private. The supplied `docker-compose.yml` is for **local PostgreSQL/Mailpit**, not a production deployment with production credentials.

You can also deploy the generated `.next/standalone` directory manually. Include `apps/<app>/.next/static` and `apps/<app>/public` in the corresponding standalone app folder. Start `node apps/<app>/server.js` from the standalone root. `scripts/start-app.mjs` performs these copies for local production previews.

## DNS and HTTPS

First add each exact custom domain to its own hosting project. Use only the record values returned by that provider:

| DNS name | Record type | Target |
| --- | --- | --- |
| `@` / `voidclient.org` | Provider-required A, ALIAS or ANAME | Exact website target assigned by the host |
| `account` | Usually CNAME, or the provider's specified type | Exact account-project target assigned by the host |
| `store` | Usually CNAME, or the provider's specified type | Exact store-project target assigned by the host |
| Provider verification names | TXT/CNAME as instructed | Exact verification values from the relevant service |

No example IP or fictitious CNAME is supplied. Preserve existing mail/DNS records. Configure the three applications separately; creating subdomain DNS records does not deploy their applications. Wait for verification, issue HTTPS certificates for all names and check certificate renewal. Redirect HTTP to HTTPS. Add `www` only if explicitly desired and configured.

For SMTP, publish the actual SPF/DKIM/DMARC records supplied by the email provider and verify the `EMAIL_FROM` domain. Do not invent mail DNS values.

## Authentication and Stripe activation

Use `AUTH_COOKIE_DOMAIN=voidclient.org` only after verifying every sibling domain is controlled. Ensure the proxy overwrites the configured client-IP header. Register Discord's callback as `https://account.voidclient.org/api/auth/callback/discord` in the real OAuth application; test linking and unlinking with matching verified emails.

For Microsoft, register the Web callback `https://account.voidclient.org/api/auth/callback/microsoft`. Configure personal Microsoft accounts to match the default `consumers` tenant, then test new registration, Void email verification, existing-account linking and safe disconnection. Keep provider secrets server-side and configure their expiry/rotation in the hosting platform.

Configure the Stripe endpoint `https://store.voidclient.org/api/webhooks/stripe` with these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

Use the endpoint's own signing secret. Begin in test mode and verify actual hosted checkout, canceled/failed/delayed payments, retries, refunds, order ownership and fulfillment. Keep `STORE_CHECKOUT_ENABLED=false` until genuine products/prices, approved legal policies, taxes and product delivery are configured. Never create a fake success page or grant delivery based on the URL.

## Release verification

Run lint, type checking, unit tests, migrated-database integration tests, the production builds and browser suite. Validate health/readiness, email delivery, cross-subdomain sessions, direct/refresh/back navigation, CSP, legal/download links and mobile layouts on the real HTTPS domains. Browser emulation is not a substitute for physical mobile Safari/Android testing. Establish error monitoring, webhook monitoring, database backups and a rollback plan before announcing launch.

Docker builds, provider deployments, DNS verification and live payment/email/device checks must be performed in the chosen production environment. See [actual local test results](testing.md).
