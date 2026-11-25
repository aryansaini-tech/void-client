# Account and admin UI review

Product behavior and deployment remain **NOT VERIFIED** until the owner verifies
them. Browser checks use synthetic API responses and do not exercise Discord,
Stripe or the existing production database.

The account, admin and store interfaces consume the documented server endpoints.
Every website mutation sends the current session CSRF value. Xbox has a disabled
Coming soon control with no request handler. The public navigation has no admin
link. The catalogue comes from the server; purchasing is unavailable and no
browser action grants ownership.

Catalogue prices and payment amounts are integer minor currency units, as in the
legacy schema. The UI converts them using the currency fraction digits before
formatting them. Legacy players with unknown provider-specific last-login time
show a dash. Missing avatars use an initial or account symbol.
Owned items collapse repeated active purchases by item ID, keeping the first
server-sorted record. Administrator player detail retains every entitlement row.

## Local checks

`npm.cmd run build` checks the React production bundle. The existing Magnet
component's ignored `use client` directive produces a warning.

`node scripts/verify-account-admin-ui.mjs` uses isolated browser contexts and
synthetic responses for:

- Disabled Xbox, no Xbox request and no public admin link.
- Account equip/unequip, manual refresh after removal, token revocation review
  and confirmation, duplicate purchase display, and account deletion review/cancel.
- A non-admin 403 reply, forbidden screen and no player/catalogue/audit requests.
- Admin search, sort, pagination, player detail, purchase warning, mandatory
  removal reason, grant/removal confirmations, restoration and audit display.
- A server-supplied catalogue, disabled purchases and no game-character preview.
- Document overflow and 44px button targets at 1440, 1024, 768, 390 and 320px.

Results and synthetic screenshots are written only under excluded `qa/`. These
checks verify browser contracts and layout, not payment or authorization logic.
Server authorization is covered separately by `shared-account.test.mjs`.
Screenshot failures are recorded separately as NOT VERIFIED; functional,
responsive width and button-target assertions remain mandatory.

## Design finish gate

The taste-skill gate was run against the current built account page on an
isolated local preview with anonymous synthetic API replies, without live
credentials or a database. Its exact result was:

```text
GATE: ERROR (the copy (the page showed no <main>, <section> or <h1> to lint); consistency.mjs could not walk 1440, 390; check.mjs could not run (exit 2: check: timed out))
```

The gate did not finish its copy, consistency or layout checks, so those design
checks are NOT VERIFIED. The gate's instruction was to report the result and
not rerun it. No design waivers were added. Separate mandatory browser contract
checks cover responsive document width and control targets.

## Backend review follow-ups

The server owner must verify the following regression cases with local fixtures
before production rollout; no production migration is run by these UI checks.

- Hold the Discord provider response, sign out, then release it. The pending
  callback must not create a fresh authenticated session.
- Hold the Discord provider response, delete the account, then release it. The
  pending callback must not recreate the deleted identity or grant launcher access.
- Send anonymous and forged non-admin requests to encoded/repeated-slash aliases
  of the protected paths: `/%2Fadmin`, `/%2Fadmin/audit`,
  `/%2Fapi/admin/session`, and `/%2Fapi/admin/players`. Also test
  `/admin%2F%2Fplayers` and repeated slashes before grant/removal APIs. Equivalent
  admin routes must retain server-side access checks and no-store responses.
- Protected AdminPanel bundles must use no-store caching alongside admin pages
  and APIs.
- Before the additive migration, detect whether multiple legacy Discord Account
  rows share one User. The new identity table's unique user mapping must not
  silently skip historical players through `ON CONFLICT DO NOTHING`; ambiguous
  links require explicit owner resolution.

The live allowlist, historical account mappings, real purchase replay, retention
policy, browser sign-in and launcher refresh all require owner verification.
