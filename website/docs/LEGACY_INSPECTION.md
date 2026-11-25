# Legacy repository inspection

Status: source inspection completed locally; hosting, database contents, OAuth, payment delivery and remote backup publication are **NOT VERIFIED** by the owner.

Repository: https://github.com/aryansaini-tech/void-client

Inspected `origin/main`: `eb2408c8fdb8706dea163b0f7cd026e6901f3227`.

An unchanged detached checkout was cloned into an operating-system temporary folder outside this project. A local `legacy-site-backup` branch points to that commit. Its push awaited GitHub authentication and did not complete during the bounded inspection. No force push occurred. Authenticate, then verify the remote backup before replacement publication.

## Framework and hosting evidence

The old site is a Next.js 16.4.6 / React 19.3.1 npm workspace monorepo. `apps/website` hosts public pages plus account and store routes; `apps/account` and `apps/store` also support separate deployments. Shared UI/config/design packages live under `packages/`. The backend uses Hono, Better Auth 1.7.15, Prisma 6.19.3, Stripe 20 and Nodemailer.

The checked-in deployment configuration targets Cloudflare Pages advanced mode or Workers using OpenNext. Deployment documents explicitly distinguish instructions from a verified deployment. An actual production database host/provider, database state and current hosting settings cannot be determined from source alone. PostgreSQL 17 is the supplied local development database. Hosted PostgreSQL providers are suggestions in the documents, not evidence of the existing host.

## Existing database and migration

`backend/prisma/schema.prisma` uses PostgreSQL with `DATABASE_URL` and `DIRECT_URL`. The checked-in initial migration is `backend/prisma/migrations/20261102000000_initial/migration.sql`; `migration_lock.toml` locks PostgreSQL. The replacement keeps copies under `website/database/` for local schema rehearsal. They must never be replayed over an already populated production database.

Existing table names are case-sensitive Prisma names:

| Table | Relevant columns and behavior |
| --- | --- |
| `User` | String `id`, required `name`, required unique `email`, `emailVerified`, nullable `image`, `createdAt`, `updatedAt`. Existing email records must be preserved; new Discord-only sign-ins must avoid collecting email. |
| `Account` | `accountId`, `providerId`, `userId`, unique provider/account pair, nullable provider token/password fields. Discord mappings already associated with a user can connect that user's historical purchases. Never link accounts by guessed display name or email. |
| `Session` | Unique legacy `token`, `expiresAt`, `userId`, timestamps, nullable `ipAddress` and `userAgent`. Legacy token storage and personal fields require a separate safe new-session mapping rather than collecting IPs. |
| `AccountProfile` | User profile/settings extension. No cosmetics ownership. |
| `ProductCategory` / `Product` | Existing catalogue: category, unique slug, name, description, integer price, currency, nullable unique `stripePriceId`, image paths, publication/availability flags and timestamps. |
| `Cart` / `CartItem` | User cart, product quantities and revision. No ownership grants. |
| `Order` / `OrderItem` | User, payment/fulfillment state, amounts, currency, unique checkout key/session ID, recorded product/price/quantity and terms acceptance. |
| `Payment` | `orderId`, provider, unique `providerPaymentId`, amount/refunded amount, currency, status and timestamps. Payment records must be retained as required by the owner's retention policy. |
| `PaymentEvent` | Provider event ID primary key, event type, processing time. Enables webhook replay detection. |
| `AuditEvent` | User, action and timestamp; too limited for complete append-only admin grants/revocations. |
| Other tables | `Verification`, `RateLimit`, `RateBucket`, `EmailOutbox`, `Module`, `ChangelogEntry`, `Partner`, `FAQEntry`. |

Orders have `PENDING`, `PAID`, `FAILED`, `CANCELED`, `REFUNDED` and `PARTIALLY_REFUNDED` states. Fulfillment is `UNFULFILLED`, `FULFILLED` or `REVOKED`.

No cape rendering, cape ownership, entitlement, equipped-cosmetic or launcher-token table exists in the inspected schema. Catalogue queries read published products. The seed creates draft FAQ/partner records only; it creates no users, passwords, products, purchases or demo ownership. Actual catalogue and purchase contents require owner-approved database inspection.

## Payment and authentication evidence

Stripe is the only implemented payment provider. `backend/src/commerce.ts` checks the raw body with the endpoint signing secret, processes supported events transactionally, records `PaymentEvent`, and uses a unique `Payment.providerPaymentId`. It validates order/user/session/amount/currency correspondence before marking orders paid. Full refunds mark fulfillment revoked. Existing code does not grant cosmetic entitlements.

Supported events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`. Route wrappers exist under the store and unified website API folders. Real checkout requires provider configuration, published products/prices, approved policies and the owner's payment verification.

The old authentication system centers on verified email/password accounts. Discord is configured for linking rather than direct Discord registration. Microsoft is optional. This differs from the requested Discord-only shared identity; existing Discord `Account` rows must be reused when present.

## Environment variable names only

Application/provider/database variables:

`AUTH_COOKIE_DOMAIN`, `AUTH_IP_HEADER`, `BACKEND_PORT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `DIRECT_URL`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `EMAIL_FROM`, `HOSTNAME`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID`, `NODE_ENV`, `PORT`, `SMTP_HOST`, `SMTP_PASSWORD`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `STORE_CHECKOUT_ENABLED`, `STRIPE_AUTOMATIC_TAX_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

Public site configuration:

`NEXT_PUBLIC_ACCOUNT_URL`, `NEXT_PUBLIC_CLIENT_RELEASE_DATE`, `NEXT_PUBLIC_CLIENT_VERSION`, `NEXT_PUBLIC_DISCORD_INVITE`, `NEXT_PUBLIC_DOWNLOAD_ANDROID`, `NEXT_PUBLIC_DOWNLOAD_IOS`, `NEXT_PUBLIC_DOWNLOAD_LINUX`, `NEXT_PUBLIC_DOWNLOAD_MACOS`, `NEXT_PUBLIC_DOWNLOAD_WINDOWS`, `NEXT_PUBLIC_PRIVACY_URL`, `NEXT_PUBLIC_REFUND_URL`, `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_WEBSITE_URL`.

Build/local/test variables:

`CF_PAGES`, `CF_PAGES_URL`, `CI`, `NEXT_PRIVATE_STANDALONE`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `PRISMA_SKIP_POSTINSTALL_GENERATE`, `TEST_DATABASE_URL`, `VOID_BIND_HOST`, `VOID_BUILD_PAGES`, `VOID_E2E_CHROMIUM_CHANNEL`, `VOID_E2E_REUSE_SERVERS`, `VOID_E2E_SECRET`, `VOID_HTTP_CONFIGURED`, `VOID_LOCAL_PREVIEW`, `VOID_SINGLE_PROCESS_BUILD`.

## Secret inspection and excluded material

An automated current-main text scan found no apparent live credential literals using provider-token/private-key/connection-string patterns. This is a local inspection result, not a guarantee or owner verification. The only credential-pattern candidate was an intentionally disposable local PostgreSQL CI fixture.

Candidate paths only:

- `.github/workflows/ci.yml`
- `docker-compose.yml`

No actual `.env`, `oauth.env`, `private-data/`, database dump or private key file was present in the inspected tracked tree. The `.env.example` file and fixture credential values will not be copied into the replacement release.

The old tree includes Mojang texture assets and reference/game scene material. The replacement release excludes them, including `apps/website/public/void/textures/`, Minecraft/world-mesh runtimes and reference scene assets. Old code remains in existing history; this task does not rewrite history.

## Owner steps and release boundary

Use normal Windows PowerShell to authenticate GitHub with `git credential-manager github login` and finish its browser flow. If using GitHub CLI, install it with `winget install --id GitHub.cli -e`, reopen PowerShell, run `gh auth login --hostname github.com --git-protocol https --web`, then `gh auth setup-git`. Do not paste credentials into chat.

Push and verify `legacy-site-backup` at the hash above. Confirm access to the real PostgreSQL database and its backup/restore process privately. Create a separate development database or sanitized local copy; rehearse additive migrations there. Do not run migration commands against production until the owner has been told exactly which additive migration will run and has completed a backup.

Before any replacement push, generate `website/docs/RELEASE_FILES.txt` with `node website/scripts/release-manifest.mjs --output website/docs/RELEASE_FILES.txt`, review every listed path, copy that exact list into the isolated legacy checkout, and scan both its working files and all new commit trees. The scanner emits paths and finding types, never matching values. A `PASS` from this scanner describes automated checks only; live account, purchase, administrator, launcher and hosting behavior remains **NOT VERIFIED** until the owner verifies it.
