# Security and operations

## Authentication and authorization

Better Auth hashes passwords using its maintained credential implementation; the application never stores plaintext passwords. Email verification is required before password sign-in. Recovery tokens expire, cannot be replayed, and password reset revokes sessions. Sessions are database-backed with HTTP-only SameSite=Lax cookies, secure cookies over production HTTPS, a seven-day lifetime and disabled browser-cookie session caching.

Every private page resolves the server session. Custom mutation APIs require a verified session, server-side schemas and ownership checks. Client-provided user IDs, roles, prices or payment status cannot authorize actions. The session-management endpoint accepts owned session IDs and does not expose other session tokens.

Custom APIs and non-callback auth POST requests enforce the exact origin of their application and reject cross-site requests. Better Auth origin/CSRF checks are explicitly enabled in test and production. OAuth callbacks retain provider state and PKCE validation. JSON inputs have a 16 KiB bound; Stripe webhook inputs have a separate bounded raw-body reader. React escapes user-visible text; user HTML is not rendered.

Microsoft login and email login share the verified-user boundary. Microsoft connections are explicit, require matching emails and a fresh verified session, and never rely on an unverified Microsoft email claim to merge existing accounts. Removing Microsoft requires a usable password credential; a Discord link alone is insufficient. See [Microsoft security and setup](microsoft-login.md).

## Proxy configuration is part of deployment

Rate limits use shared PostgreSQL storage, including an atomic address/identity limiter across instances. Configure `AUTH_IP_HEADER` to a header supplied by your hosting platform, and ensure the reverse proxy **overwrites** incoming values. Never trust a client-supplied forwarded IP header. Apply an additional platform/WAF IP limit before the application for distributed abusive traffic.

For Nginx, overwrite `X-Real-IP` with the connection address, forward the public Host, and set `X-Forwarded-Proto` from the trusted listener. Behind another proxy/CDN, configure its documented trusted ranges first; do not blindly trust arbitrary `X-Forwarded-For` chains. Direct untrusted access to the application port should be blocked in production.

## Cookies across the three domains

With `AUTH_COOKIE_DOMAIN=voidclient.org`, all sibling applications can receive the shared auth cookie. Use that scope only when **every** subdomain is controlled and trusted. A compromised or user-controlled sibling changes the risk. The three apps must use the same auth secret and database, and `BETTER_AUTH_URL` must match the account origin. Keep `VOID_LOCAL_PREVIEW=false` publicly.

## Email and secrets

Verification/reset emails are persisted in an AES-256-GCM encrypted outbox before an auth request completes. A backend process claims jobs, sends SMTP, retries failures and removes payloads after successful delivery. Public SMTP requires TLS; only a localhost test sink may omit authentication/TLS. Monitor failed jobs and the backend readiness endpoint. Permanently failed jobs require operator review/requeue; they are not silently considered delivered.

Store secrets in the hosting platform's secret manager. The auth secret also derives the outbox encryption key and encrypts OAuth tokens. Rotate with a plan for session invalidation and queued messages. Use database least-privilege credentials, provider-required TLS, backups and point-in-time recovery. Restrict admin access; Prisma Studio is not a public admin application.

## Payments

Stripe-hosted Checkout collects card data; Void never receives raw card details. Server-priced orders, active Stripe Price verification, exact currency/subtotal checks and unique checkout IDs protect the commercial boundary. Pending snapshots reject changed product pricing. Terms acceptance time and URL are recorded with an order.

The webhook validates the signature against the raw request body, then deduplicates provider events and applies transactional state changes. A return URL or `?success=1` cannot create a paid order. Refunds cannot be reversed by late completion events. Cart revision checks protect changes racing with checkout completion. Stripe's retries handle transient serialization/database errors; monitor failed deliveries in the provider dashboard.

Connect real fulfillment before selling. The database's payment and fulfillment statuses are separate on purpose. Do not add a frontend-only delivery flag. Use test mode and signed webhook fixtures until credentials and genuine products are ready.

## Response headers and practical limits

The apps set a restrictive CSP, frame denial, MIME-sniffing protection, referrer policy, permissions policy and production HSTS. The CSP permits inline scripts/styles needed by this App Router configuration; it is not a nonce-based strict CSP. If introducing third-party embeds or remote image hosts, review both CSP and Next image allowlists. No third-party analytics/tracking is installed.

Automated tests are not a penetration test. Before public launch, review proxy headers, DNS/cookie scope, production email delivery, dependency advisories, refund/fulfillment policy, provider webhooks, database backups and monitoring in the actual hosting environment.
