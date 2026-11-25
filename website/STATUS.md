# Shared Discord account rollout

Updated: 2026-11-25. Each phase has an approximately three-hour budget. PASS below means a recorded local check only; product behavior remains NOT VERIFIED until the owner verifies it. No production database migration is authorized or has been run.

| Phase | Status | Evidence / remaining work |
| --- | --- | --- |
| 1 — Legacy inspection | NOT VERIFIED | Local inspection PASS: Next.js monorepo, PostgreSQL/Prisma, Stripe. Host not established by repo. No apparent live secret file found in main. Backup branch created locally at `eb2408c8fdb8706dea163b0f7cd026e6901f3227`; push blocked by GitHub authentication. See `docs/LEGACY_INSPECTION.md`. |
| 2 — Reuse database | NOT VERIFIED | PostgreSQL extension reuses legacy User/Account/Product/Order/OrderItem/Payment/PaymentEvent/RateBucket. Additive migration authored; initial local rerun test PASS. No production migration. Separate embedded PostgreSQL fixtures only. Backup/restore procedure in `docs/DATABASE-ROLLOUT.md`. |
| 3 — Website account | NOT VERIFIED | Discord-only account, owned/equipped items, server validation, CSRF, cookie flags, deletion, token management and rates authored. Clean publication build PASS; isolated PostgreSQL suite 13/13 PASS; synthetic browser groups 5/5 PASS. |
| 3b — Admin area | NOT VERIFIED | Private `VOID_ADMIN_DISCORD_IDS` allowlist, 403 checks on every page/API, players/search/sort/pagination, detail, confirmed grants/removals, readonly payments and append-only audit authored. Local forged-request/idempotency/audit checks passed. |
| 4 — Launcher account | NOT VERIFIED | Account-only PKCE/loopback, DPAPI, profile refresh, manual Refresh and offline state authored. Independent read-only manifest snapshot: fresh Release launcher configure/build PASS and native account/DPAPI checks 20/20 PASS. No game/DLL runtime launched. |
| 5 — Publish | FAIL | Prepared one normal replacement commit `f156b0c0bf415f3cdd63fb7072d6f7570efa06d6` on `new-site`. Exact 240-file working tree and all 240 committed blobs: secret gate PASS, zero findings. Remote backup push FAIL because GitHub authentication is unavailable; no replacement push attempted. |

## Boundaries

No edits to `Latite-master/` or client DLL source. Launcher changes are limited to account/sign-in/UI and their account-specific build dependencies. No injection, process handling, version detection, updater or signing changes. No secrets, production data, game files or reference materials may be published.

## Owner verification and operations still required

- Supply private server environment configuration through the host's secret settings, never Git or chat.
- Review the legacy database mapping, create and verify a backup, then approve a production migration separately after development checks.
- Verify real Discord login, ownership, admin access, equip/unequip, account deletion and launcher login/refresh/offline/sign-out on your own device.
- Verify provider webhook configuration and payment handling in provider test mode before enabling real purchases.
- Review the exact publication file list and any reported blockers.

## Test results and commits

Latest complete isolated PostgreSQL/server suite: 13/13 PASS. Final case-insensitive admin JS/CSS no-store/403 checks also PASS in a focused rerun. Clean publication build using Vite 7.3.8: PASS. Five final synthetic browser groups: PASS at 1440/1024/768/390/320, including 44px buttons and no horizontal overflow. Native account/DPAPI checks: 20/20 PASS; full Release build from an independent read-only manifest snapshot: PASS. npm dependency audit after patch update: zero reported vulnerabilities. Scanner self-checks: 34 assertions PASS. Exact working tree and every newly committed tree: PASS, 240 files/blobs, zero findings. Earlier fixture/path-filter and staging failures were corrected; no secret values were emitted. Remote publication is blocked. Product behavior remains NOT VERIFIED. Real purchasing is not live.

Build warnings: existing Magnet `use client`/sourcemap warning, native temp-directory warning and an existing conversion warning in untouched `discord_rpc.cpp`. No required local test is failing. The visual finish checker remains incomplete (`GATE: ERROR`), and live behavior requires the owner.

## Phase reports

Phase 1: source inspection complete within its budget; remote backup/authentication and actual database hosting remain blocked. Continue subsequent phases without production access. Legacy main hash is recorded above. Environment variable names, schema/payment findings and paths-only scan report are in `docs/LEGACY_INSPECTION.md`.

Phase 2: additive schema/model and development setup are authored. The web server no longer accepts SQLite preview users or password admins. Existing production data is untouched. Historic purchases need a verified Stripe redelivery or allowlisted admin grant; no unsigned bulk entitlement backfill. The owner must verify backup restoration, dev migration, legacy Discord mapping and retention policy before production rollout.

Phase 3/3b: account and admin code implemented. Legacy Discord links are mapped additively; ambiguous mappings stop migration. Legacy provider-specific last-login timestamps are unknown until the next sign-in. Browser interaction checks use synthetic API responses; live server/provider behavior remains unverified. Design-taste finish gate returned `GATE: ERROR` (page content/consistency checks unavailable and checker timed out); it must not be reported as PASS.

Phase 4: native account implementation and design-only DLL handoff note completed for review. The client UI marks Cosmetics unavailable and inspection found no account-linked cape renderer. No renderer changes implemented. Offline ownership is display-only and may be stale until refresh; server revocation is unconfirmed if launcher sign-out occurs without network access. DPAPI does not protect against malware running as the same Windows user.

## Feature verification checklist

Every live feature below is NOT VERIFIED until the owner tests it; local evidence is listed separately.

| Item | Owner status | Local evidence / required verification |
| --- | --- | --- |
| Legacy framework/schema/purchase/provider inventory | NOT VERIFIED | Read-only inventory completed; actual hosting remains unknown. |
| Remote legacy backup branch at recorded main hash | NOT VERIFIED | Local branch exists; GitHub login required. |
| Reuse legacy PostgreSQL and additive-only migration | NOT VERIFIED | Legacy tables preserved; local migration rerun and ambiguous-mapping guards checked. |
| Real DB backup and restoration | NOT VERIFIED | Procedure documented; owner must perform and verify. |
| Production migration | NOT VERIFIED | Never run in this task; requires owner approval after dev restore checks. |
| Legacy Discord account/purchase continuity | NOT VERIFIED | Local original-user mapping checked; provider redelivery required for historic entitlements. |
| Minimal identity and persistent hashed sessions | NOT VERIFIED | Synthetic Discord/session/no-email checks PASS. |
| Verified/idempotent payments and refund revocation | NOT VERIFIED | Signed fixture, stale/bad signature, replay and full refund checks PASS. Real checkout is not live. |
| Admin grant/revoke/regrant and read-only payment IDs | NOT VERIFIED | Server transaction checks PASS; removal does not refund. |
| Append-only admin audit | NOT VERIFIED | Entries checked; SQL UPDATE/DELETE denied locally. |
| Account deletion/anonymisation and retained payment records | NOT VERIFIED | Local identity/session/data checks PASS; owner retention policy required. |
| Discord only; Xbox button cannot request sign-in | NOT VERIFIED | Server rejects Xbox; synthetic UI checks pending final isolated run. |
| Owned equipment persists across sessions/devices | NOT VERIFIED | Server ownership/equip tests PASS; live device verification required. |
| CSRF, secure cookie flags and state-change rate limits | NOT VERIFIED | Synthetic HTTP checks PASS. |
| Every admin page/API returns 403 for nonadmins/forgeries | NOT VERIFIED | HTTP namespace/method/alias checks PASS; final Windows path checks included. |
| Private environment allowlist, no website admin creation | NOT VERIFIED | `VOID_ADMIN_DISCORD_IDS`; forged role and old account-creation APIs denied locally. |
| Players/avatar/name/ID/times/count/search/sort/page | NOT VERIFIED | Model and synthetic UI; legacy last login deliberately unknown. |
| Admin details, confirmations, notes and refund warning | NOT VERIFIED | UI implemented; note input rejects obvious credentials/email/IP patterns. |
| Admin no-store responses, no public personal/admin APIs | NOT VERIFIED | HTTP checks and source review; live host/cache verification required. |
| Website-only Discord OAuth and launcher PKCE loopback | NOT VERIFIED | Local code/state/verifier/loopback tests and native tests PASS. |
| One-time code expiry/replay/verifier and token hashing | NOT VERIFIED | Server fixture checks PASS. |
| DPAPI storage, expiry and revocation | NOT VERIFIED | 20 native checks; live Windows/browser and Account revocation required. |
| Manual launcher Refresh, owned/equipped updates, guest/offline | NOT VERIFIED | Native model/UI authored; live grant/removal/offline/guest tests required. |
| DLL cape rendering investigation and design-only note | NOT VERIFIED | No account-linked renderer found; no DLL edits. |
| No secrets, private material or build/game files in release | NOT VERIFIED | Local exact 240-file allowlist and committed-blob gate PASS, zero findings; owner review still required. |
| README/setup/dependency notices | NOT VERIFIED | Authored; isolated clean build and tests PASS. |
| One normal replacement commit/no force-push | NOT VERIFIED | One local commit based on old main; remote backup/publication blocked by authentication. |

## Remaining owner steps

1. Run `git credential-manager github login` in normal Windows PowerShell and complete browser authentication for an account with push access. GitHub CLI alternative and exact backup/publish steps are in the legacy report; remote backup must succeed before replacing main.
2. Privately configure the existing database host/connection, Discord app, public HTTPS origin and `VOID_ADMIN_DISCORD_IDS`. Never send these values in chat. Choose a host supporting the Node/PostgreSQL server; old static/Workers settings are not automatically compatible. Verify host/proxy logs omit auth query strings and redact cookies, authorization/CSRF headers and sensitive bodies.
3. Take/restore the encrypted DB backup, inspect ambiguous legacy links and real catalogue metadata, verify the additive migration on the dev restore, then separately approve production migration. Define legal retention periods.
4. Verify Discord login, new/legacy account continuity, default avatar, logout/cancellation/replay, cross-device persistence and deletion. Configure/replay real provider test-mode webhooks and verify historic purchases/refunds. Real buying remains disabled.
5. Verify admin allowlist denial/forged requests, pagination/details, confirmed grant/revoke/regrant, audit entries and purchase no-refund warning with two Discord accounts.
6. Verify launcher browser login, encrypted restart restore, manual refresh after grants/removals, Account token revocation, token/code expiry, offline display/sign-out and guest launch. Verify no removed item remains equipped after online refresh. Rendering capes in Minecraft is a separate task.
7. Review exact release filenames and the final secret/commit gate, then publish the normal commit or the new-site PR. Do not force-push. Exact authenticated commands, safe-directory scope and protected-main/fork steps are in `docs/PUBLISH.md`.

## Publication checkpoint

Checkout: `C:\Users\musta\AppData\Local\Temp\void-new-site-publication-20261125`. Remote: `https://github.com/aryansaini-tech/void-client.git`. Branch: `new-site`; parent/base and local `legacy-site-backup`: `eb2408c8fdb8706dea163b0f7cd026e6901f3227`.

The committed copy identifies the replacement by its own HEAD; the final hash is recorded in this delivered local STATUS after committing, avoiding a circular self-hash. No extra main commit is needed for that local report. No force-push or production migration occurred.

Pre-commit gate: exact working-file allowlist scan PASS, 240 files, zero findings. Git whitespace check reports existing trailing whitespace in unchanged launcher/core sources and upstream license text; these were retained to avoid unrelated/protected-source changes or editing upstream license material. Local Git identity was absent; the implementation commit uses the agent identity `Codex` and its noreply address, not an inferred owner identity. GitHub login/push remains blocked. Every commit to be pushed is scanned after creation.

Final replacement commit: `f156b0c0bf415f3cdd63fb7072d6f7570efa06d6` (one parent: `eb2408c8fdb8706dea163b0f7cd026e6901f3227`). Final committed-tree scanner: PASS; one new commit, 240 inspected blobs, zero findings. `legacy-site-backup` remains local at the base hash. Backup push attempted using noninteractive Git, then retried with the host credential context: FAIL, credentials unavailable / interactive login required. No main/new-site push or force-push occurred.

This delivered workspace STATUS contains the post-commit hash/gate result and is intentionally newer than the committed snapshot. The publication checkout stays clean; do not copy this post-commit report into it without creating a revised commit and rescanning. Exact release filenames: `docs/RELEASE_FILES.txt` (240 paths). Publication instructions: `docs/PUBLISH.md`.

All five phases were processed within their approximate three-hour phase budgets. Blocking external steps are GitHub authentication/write rights, actual hosting/private configuration, approved backed-up production migration, and owner/live-provider/device verification. Remaining independent implementation, documentation and local checks have been completed. The visual finish gate could not complete; its exact error is above and in `docs/UI-API-REVIEW.md`.
