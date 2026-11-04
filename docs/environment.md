# Environment reference

Start from `.env.example`. It contains no real credentials. The root runner and application configuration load root `.env` for local development. Hosted applications receive environment variables through the hosting platform. Never commit `.env`, test sessions, database dumps or secret values.

## Public build-time values

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_WEBSITE_URL` | Absolute website origin; localhost:3000 locally |
| `NEXT_PUBLIC_ACCOUNT_URL` | Absolute account origin; localhost:3001 locally |
| `NEXT_PUBLIC_STORE_URL` | Absolute store origin; localhost:3002 locally |
| `NEXT_PUBLIC_DISCORD_INVITE` | Verified community invitation, or empty |
| `NEXT_PUBLIC_DOWNLOAD_WINDOWS/LINUX/MACOS/ANDROID/IOS` | Verified download URL per platform, or empty |
| `NEXT_PUBLIC_CLIENT_VERSION` | Confirmed release version, or empty |
| `NEXT_PUBLIC_CLIENT_RELEASE_DATE` | Confirmed ISO date, or empty |
| `NEXT_PUBLIC_PRIVACY_URL` | Actual approved privacy notice |
| `NEXT_PUBLIC_TERMS_URL` | Actual approved terms |
| `NEXT_PUBLIC_REFUND_URL` | Actual approved refund policy |

Use origins without a path for the three application URL variables. HTTPS is required for public URLs; HTTP is accepted only for loopback development. Missing optional links render honest unavailable states, not `#` or fabricated URLs. Unknown platform support is never implied by an empty download slot. Public configuration must match in all builds.

## Server-only values

| Variable | Required where / purpose |
| --- | --- |
| `DATABASE_URL` | Account, store and worker: PostgreSQL connection; require TLS as appropriate to the provider |
| `BETTER_AUTH_SECRET` | Account, store and worker: same random value, at least 32 characters |
| `BETTER_AUTH_URL` | Public account origin, matching `NEXT_PUBLIC_ACCOUNT_URL` |
| `AUTH_COOKIE_DOMAIN` | Production sibling-domain session scope; `voidclient.org` only when all its subdomains are trusted |
| `AUTH_IP_HEADER` | Header overwritten by your trusted reverse proxy; defaults to `x-real-ip` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mail server; use secure SMTP/STARTTLS publicly |
| `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` | SMTP credentials and verified sender |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` | Optional OAuth client for explicit Discord account linking |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` | Account app only: Microsoft Web application client ID and secret value |
| `MICROSOFT_TENANT_ID` | Defaults to `consumers`; must match the Microsoft registration's supported account types |
| `STRIPE_SECRET_KEY` | Store only: Stripe server credential; begin with test-mode keys |
| `STRIPE_WEBHOOK_SECRET` | Store only: signature secret for this webhook endpoint |
| `STORE_CHECKOUT_ENABLED` | Explicit launch switch; defaults to false |
| `STRIPE_AUTOMATIC_TAX_ENABLED` | Enable only after Stripe Tax is configured and tested |
| `BACKEND_PORT` | Worker HTTP port; defaults to 3003 |
| `VOID_BIND_HOST` | Optional local production-server bind address; defaults to 0.0.0.0 |
| `VOID_LOCAL_PREVIEW` | False by default; limited HTTP-loopback production-preview exception |
| `TEST_DATABASE_URL` | Disposable test database only; its name must end in `_test` |

The website does not need database, SMTP, OAuth or Stripe secrets. Share the auth secret with the worker because it encrypts/decrypts queued mail. Rotation invalidates sessions/tokens and makes already queued encrypted messages unreadable; drain the queue or plan a maintenance window first.

`npm run check:config` shows configured/missing service states without printing secret values. It checks configuration, not provider connectivity. Check `/ready` on the worker for actual database connectivity.

Microsoft requires account and email configuration as well as provider credentials. See [Microsoft setup](microsoft-login.md) for callbacks, local verification, explicit linking and password recovery. The provided Discord invitation is already configured; Discord OAuth credentials are a separate optional feature.

Checkout requires the explicit enable flag, database/auth setup, both Stripe secrets, and all three approved policy URLs. Product records must be published, available, and mapped to genuine active Stripe Price IDs. Disabling checkout does not disable receipt of signed webhooks for existing orders.
