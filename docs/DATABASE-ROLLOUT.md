# Existing PostgreSQL database and additive extension

This change targets the legacy PostgreSQL database. Production readiness is NOT VERIFIED. The server checks for migration `20261125_shared_discord` but never runs migrations on startup. No production migration has been run.

## Mapping

| Requirement | Legacy table / extension |
| --- | --- |
| Discord identity | `VoidDiscordIdentity.discord_id` is unique; links to the existing `User` through a matching Discord `Account` when available. New users have a random non-deliverable placeholder in the legacy required email field; the application requests only Discord `identify`. |
| Browser sessions | `VoidSession`, hashed session tokens and CSRF nonce. Old `Session` remains intact but is not accepted by the new application. |
| Catalogue | Existing `Product` / `ProductCategory`; optional `VoidCosmetic` identifies kind and equip slot. No invented products are seeded. |
| Purchases | Existing `Order`, `OrderItem`, `Payment`, `PaymentEvent`. No commerce data is dropped. |
| Entitlements | `VoidEntitlement`, active/revoked, source admin/purchase, purchase reference, grant/revocation fields. Unique payment-and-item pair permits a payment covering multiple items; admin grant is unique per user and item. |
| Equipped | `VoidEquipped`, server validates active ownership. Revocation unequips atomically. |
| Launcher | Hashed `VoidLauncherCode` (60 seconds, one use, PKCE/loopback binding) and hashed `VoidLauncherToken` (30 days, revocable). |
| Audit | `VoidAudit`, append-only trigger. Actor/player identifiers are opaque legacy user keys, resolved to current Discord IDs for administrators; deletion disconnects the identity. |
| Rates | Existing `RateBucket`. Identity-based keys; short-lived salted opaque transport keys for unauthenticated abuse prevention. No IP address is stored or shown. |

## Backup before a real migration

1. Identify the actual hosting provider and database owner; the repository does not establish where production is hosted.
2. Take a host-managed snapshot and an encrypted `pg_dump` of the existing database, including schema, orders, payments and catalogue. Store the dump outside Git with restricted access. Supply connection configuration privately; never paste the connection string into chat, command logs or documents.
3. Restore that backup into a separate development database. Check row counts, constraints, purchase totals and a sample of Discord links. Verify restoration, not just dump creation.
4. Apply `database/migrations/20261125_shared_discord.sql` to the development restore. Check the existing tables and migration rerun behavior. Add `VoidCosmetic` metadata only for real catalogue items and equip slots the owner approves.
5. Tell the owner before any production migration, obtain their approval for the specific backed-up target, then run the additive SQL once during a planned window. Retain the tested backup. Application startup must not perform this step.

`database/legacy-initial.sql` and `legacy-schema.prisma` document the original schema. The initial SQL is used only for a NEW isolated development database and automated fixtures; never run it against an existing/production database.

The extension imports existing verified Discord `Account` links into the player list. Their first date is the recorded Discord-link creation date; the old schema does not record a Discord-specific last login, so that field remains unknown until their next new-site sign-in. No email, IP or access token is imported. New-site sign-ins record actual first/last login times.

The migration preflight fails without applying changes if multiple legacy Discord accounts map to the same User, or a stored identity conflicts with its legacy Account mapping. The old schema permits that ambiguity. Review it on the restored development copy with the owner; never silently split, merge or discard a purchase-bearing account.

## Legacy purchases and payment activation

The old site records Stripe payments but has no cosmetic entitlements. Historic purchase fulfilment must be reconciled through a verified Stripe event redelivery or an allowlisted owner/admin grant. The new handler allows a correctly signed redelivery to insert missing entitlement rows, including when the old `PaymentEvent` already exists. It never restores an entitlement that has been revoked. Do not blindly infer purchases from browser state or unsigned imports.

The handler requires an existing order with its stored Stripe session ID, exact user/order references, matching currency and totals, and a provider payment ID. Event receipt, payment state and entitlements are transactional. Full refunds revoke only the affected payment's entitlements and clear equipment when no active entitlement remains. Partial refunds keep access pending the merchant's policy. Removing an item in admin does not refund payment.

There is no active checkout button in this rollout. `purchasing_live` is false. Configure a private Stripe webhook and verify provider test-mode delivery, refund/redelivery and catalogue/price configuration before implementing or enabling checkout. Real purchasing is not live.

## Deletion

Deletion confirms on the website, requires CSRF, removes Discord links, browser sessions, launcher credentials and equipment, clears profile fields, and anonymises the legacy User name/email/image. Entitlement rows remain revoked; legally required order/payment records remain associated with an opaque user key. The immutable audit remains, with deleted identities shown as Deleted account. Choose and document the applicable payment/audit retention period before production use. Free-text admin notes must not include secrets, emails, tokens or IP addresses.

Old authentication tables may already contain email/IP/provider-token data collected by the former site. This app does not read those into account/admin responses. Review legacy retention and lawful cleanup separately; this migration does not bulk-delete existing records.
