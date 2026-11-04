# Local development

## Requirements

- Node.js 22.15+ or 24 LTS and npm; versions are locked in `package-lock.json`.
- PostgreSQL 17 is the tested database version. Docker is convenient, not required.
- A local SMTP inbox for full authentication testing. No real email account is needed when using Mailpit.

## Public UI preview

```sh
npm install
npm run db:generate
npm run dev
```

Website, account and store use ports 3000, 3001 and 3002. The backend uses 3003. No fake login is provided. Without configuration, forms and commerce show explicit unavailable states. The public website remains usable.

On Windows use `npm.cmd` if PowerShell blocks the `npm.ps1` shim. Do not disable your shell's execution policy to run npm.

## PostgreSQL and a local inbox

```sh
docker compose up -d
```

Copy `.env.example` to `.env`, preserving the three localhost URLs. For the supplied **local-only** Compose configuration:

```dotenv
DATABASE_URL=postgresql://void_local:local-development-only@localhost:5432/void_local
BETTER_AUTH_URL=http://localhost:3001
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_SECURE=false
EMAIL_FROM=Void Local <noreply@example.test>
```

Generate a fresh `BETTER_AUTH_SECRET` and put it in `.env`:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
npm run db:deploy
npm run db:seed
npm run dev
```

Open http://localhost:8025 for the local Mailpit inbox. Register through the account app, open its verification email, then sign in. Run the backend alongside the account app: it sends queued messages every five seconds. SMTP credentials can stay empty only for localhost/127.0.0.1. Do not use the Compose password or trust authentication outside a disposable local environment.

`db:seed` is optional. It inserts unpublished editorial drafts without overwriting existing entries. It does not create a demo account or any purchasable item.

## Production build preview

```sh
npm run build
npm run start
```

The start scripts copy static/public assets into each Next standalone output, then start that application's generated server. To test configured authentication over local HTTP in a production build, set `VOID_LOCAL_PREVIEW=true`. This exception only works when **all three configured application origins are HTTP loopback**. Public production deployments require HTTPS and must leave it false.

On Windows, stop running apps and tools that have loaded Prisma before regenerating its client. Windows keeps the native query-engine DLL locked while those processes are alive. A build should not run against the same output directory as a running preview server.

`NEXT_PUBLIC_*` values are embedded at build time. Rebuild when they change; a server restart alone cannot update browser bundles. Secrets remain runtime-only.

The root runner tracks its child processes and shuts down only their process trees. Stop it with Ctrl+C. Individual `dev:*` scripts are available for focused work. `VOID_BIND_HOST=127.0.0.1` confines production preview listeners to loopback; container deployments normally use `0.0.0.0`.

## Database work

- Change `backend/prisma/schema.prisma`, then use `npm run db:migrate -- --name meaningful_change` in a development database.
- Commit the generated migration. Use `npm run db:deploy` in staging/production.
- Generate the client after schema changes: `npm run db:generate`.
- Back up persistent databases before a migration. Never run reset commands against production.
- Prisma Studio (`npm run db:studio`) is a development/admin tool. Do not expose its port publicly.

## Tests

```sh
npm run lint
npm run typecheck
npm test
```

Create a separate PostgreSQL database whose name ends in `_test`; set `TEST_DATABASE_URL` to it. Apply the committed migration to that database using `DATABASE_URL`, then run `npm run test:integration`. The test suite uses a local SMTP sink on port 2526, synthetic test-only records, and locally signed Stripe fixture events. No provider transaction or external email occurs.

For browser checks install Playwright's Chromium and WebKit binaries with `npx playwright install chromium webkit`, build the apps, and run `npm run test:e2e`. See [testing](testing.md) for coverage and actual environment results.

With the production servers running, `npm run test:http` checks all public routes, server-rendered metadata, referenced assets, access boundaries and SEO resources. It does not execute browser JavaScript or validate layout. The browser suite starts production servers automatically unless `VOID_E2E_REUSE_SERVERS=true`; supply `TEST_DATABASE_URL` to include the real account/cart browser fixtures.
