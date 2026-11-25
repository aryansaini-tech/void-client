# VOID website and launcher account

Implementation awaits owner verification. See [STATUS.md](STATUS.md) for local test evidence, blockers, commits and the verification checklist. Real purchasing is not live. The client DLL and cape rendering are outside this change.

The website uses React/Vite and a Node.js HTTP server. It is the only Discord OAuth client. The existing PostgreSQL catalogue and commerce schema is preserved, with additive account/cosmetic/session/audit tables. The native Windows launcher signs in through the website with PKCE and stores its launcher session using Windows DPAPI.

## Website setup

Use Node.js 24 LTS and an isolated development database. From the `website` directory:

```sh
npm ci
npm run build
```

Set private server configuration using your host's environment/secret settings. For local use, a restricted `private-data/oauth.env` file is supported; it must stay outside the served `dist` directory and Git. Never use `VITE_*` for credentials. No credential values belong in commands saved to history, logs, screenshots or source.

For a NEW local embedded PostgreSQL database, configure `VOID_DEV_DATABASE_PATH` to a new directory under private data, leave `DATABASE_URL` unset, then run:

```sh
npm run db:dev
npm start
```

The development initializer refuses an existing directory and production mode. It uses the archived legacy initial schema only for new development data. It never opens production. Embedded development mode needs dev dependencies installed. Alternatively, use a separate PostgreSQL database restored from an encrypted verified backup.

Production uses the existing `DATABASE_URL` after the explicitly approved additive migration. Startup checks the migration version and never runs migrations. Read [DATABASE-ROLLOUT.md](docs/DATABASE-ROLLOUT.md) before any real database change. The old Cloudflare static/Workers hosting instructions do not apply to this Node/PG server unchanged; choose a host supporting Node 24 and PostgreSQL connectivity, with HTTPS at the public origin. Hosting migration and deployed configuration are NOT VERIFIED.

Configure Discord's existing website callback at `/auth/discord/callback` for the public website origin. The launcher uses that website flow and requires no additional Discord redirect. OAuth requests only `identify`, never email. Xbox is disabled and shows Coming soon.

Before live use, configure host/proxy logging to omit authentication callback query strings and redact Authorization, Cookie and CSRF headers. Do not log auth, token-exchange, webhook or admin request/response bodies. The Node application emits fixed startup errors and does not log request URLs or tokens; the external hosting configuration still needs owner verification.

## Environment variable names

| Names | Purpose |
| --- | --- |
| `DATABASE_URL` | Existing production PostgreSQL connection or separate PostgreSQL development connection; private. |
| `DIRECT_URL` | Legacy Prisma direct connection used by legacy deployment tooling; not used by this Node runtime. |
| `VOID_DEV_DATABASE_PATH` | Explicit local embedded PostgreSQL path; cannot be used in production. |
| `VOID_ORIGIN`, `VOID_HOST`, `VOID_PORT`, `NODE_ENV` | Public HTTPS origin and server binding/mode. |
| `VOID_DISCORD_CLIENT_ID`, `VOID_DISCORD_CLIENT_SECRET` | Server-only Discord OAuth app configuration. |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Supported legacy configuration aliases when VOID names are absent. |
| `VOID_ADMIN_DISCORD_IDS` | Private comma-separated Discord ID allowlist. It is the sole source of admin access. |
| `STRIPE_WEBHOOK_SECRET` | Server-only Stripe signature-verification secret. |
| `STRIPE_SECRET_KEY`, `STORE_CHECKOUT_ENABLED` | Legacy provider/checkout settings; new checkout is not implemented or enabled by them. |
| `VOID_INSTALLER_PATH` | Private installer location, outside public build assets. |
| `VOID_WEBSITE_ORIGIN` | Public launcher website origin (launcher environment or CMake cache option). |

Legacy environment names are inventoried separately in [LEGACY_INSPECTION.md](docs/LEGACY_INSPECTION.md). No Microsoft credentials are used by the new website account flow.

## Account and admin

Sign in with Discord at `/account`. Owned items, equipped state and device tokens come from authenticated server endpoints. Equipment requires active ownership; ordinary store items without an equip slot cannot be equipped. Account deletion disconnects identities and sessions and anonymises personal data while retaining legally required commerce records.

The admin area is `/admin`, with no public navigation link. Every page and API checks `VOID_ADMIN_DISCORD_IDS` server-side. There is no password admin, role-edit form or admin-creation API. Search/sort/page through players, inspect read-only payment references, confirm grants/removals and review the immutable audit log. Removing a purchase does not refund it; revoked equipment is cleared. Admin responses use no-store caching. Never put secrets or personal contact/IP data into grant notes or revocation reasons.

The Stripe webhook is `/api/webhooks/stripe`. It checks the raw-body signature, timestamp, order/user/session references and totals, then handles entitlements transactionally and idempotently. Historic purchases require verified provider event redelivery or an allowlisted owner/admin grant. No browser or launcher button grants purchases. Production payment processing must be verified in provider test mode before activation; there is no live checkout in this release.

## Launcher setup

Build from the repository root with x64 MSVC, CMake 3.22+ and Windows SDK:

```sh
cmake -S launcher/standalone -B build-launcher -A x64
cmake --build build-launcher --config Release --target void_launcher void_account_checks
```

Configure the public `VOID_WEBSITE_ORIGIN` privately in the launcher's environment or CMake cache. The launcher contains no provider secret. Read [ACCOUNT-INTEGRATION.md](../launcher/ACCOUNT-INTEGRATION.md) for protocol, encrypted storage, refresh, guest/offline behavior and verification. Optional reference UI captures are disabled and not included in the release. Launcher account/UI changes do not change injection, process/version handling, updates or signing. No client DLL is published by this source rollout.

## Local verification

```sh
npm run test:server
npm run verify:accounts
npm run release:manifest
npm run release:scan
```

The server tests use isolated embedded PostgreSQL fixtures and synthetic provider replies. Browser tests use synthetic API responses and check account/admin/store interactions at desktop and phone widths. They establish local code behavior only. A real Discord login, deployed DB, provider webhook, launcher browser/DPAPI flow, device sharing and ownership changes still require owner verification. Run `void_account_checks` with an explicit temporary directory for native protocol/DPAPI checks; build outputs remain private and excluded.

Publishing requires a reviewed exact manifest, working-file and every-new-commit secret checks, a verified remote backup branch and a normal single replacement commit based on old main. Never force-push. See [RELEASE_FILES.txt](docs/RELEASE_FILES.txt) and [STATUS.md](STATUS.md).

## Dependencies

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the included dependency licenses. No Mojang game assets, client DLL source, private data, environment files, reference captures, disassembly or build binaries are part of the proposed release.
