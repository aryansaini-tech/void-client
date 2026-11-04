# Microsoft and email sign-in

Microsoft uses the existing Better Auth server, PostgreSQL accounts and secure sessions. Email/password registration, verification, recovery and logout are retained. No frontend password gate, browser secret, Microsoft password collection or separate auth stack is introduced.

## Configure the provider

1. In [Microsoft Entra app registrations](https://entra.microsoft.com/), register an application with **personal Microsoft accounts** enabled. Choose the **Web** platform for this server-side authorization-code flow.
2. Register `http://localhost:3001/api/auth/callback/microsoft` for local development and `https://account.voidclient.org/api/auth/callback/microsoft` for the intended production account domain. Change these if your actual account origin differs. Callback strings must match exactly.
3. Set `MICROSOFT_CLIENT_ID` to the Application (client) ID. Set `MICROSOFT_CLIENT_SECRET` to the secret **value**, not its identifier. Keep these in the account deployment's server environment, never `NEXT_PUBLIC_*` or committed files.
4. Keep `MICROSOFT_TENANT_ID=consumers` for personal accounts. `common` also permits work/school accounts; `organizations` or a tenant UUID restricts them. The registration's supported account types must agree with this value. Tenant tokens are validated by the installed provider.
5. Configure `DATABASE_URL`, a random `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, SMTP and `EMAIL_FROM`. Apply existing migrations and run the backend mail worker. Microsoft is intentionally unavailable until account services and verification email are configured.
6. Restart the account server. Use `npm run check:config` to inspect readiness without printing credentials. Check actual delivery and callback handling on HTTPS before launch; renew expiring Microsoft secrets through your hosting secret manager.

Only `openid`, `profile` and `email` scopes are requested. Void does not request Microsoft Graph profile photos, Xbox access or Minecraft ownership. This login does not assert that a person owns Minecraft. If Microsoft does not supply an email address, the UI asks the person to use another account or email sign-in.

Reference: [Microsoft authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow) and [Better Auth Microsoft provider](https://www.better-auth.com/docs/authentication/microsoft).

## Account behavior

- Login and registration offer **Continue with Microsoft** alongside the existing email forms. Unconfigured Microsoft buttons are disabled with an honest explanation. No success is simulated.
- New Microsoft accounts must meet Void's verified-email requirement. Microsoft does not reliably attest email ownership; when needed, Void sends its own verification email. After verification, continue with Microsoft again.
- Existing email accounts are **not automatically merged** by matching email. Sign in with email first, then connect Microsoft from **Security**. Explicit linking requires the same email and a verified session created within the last ten minutes.
- Provider identities use Microsoft's stable account identifier. Provider tokens and account ownership checks remain server-side. Authorization uses state and PKCE; frontend ID-token sign-in is disabled. Untrusted return URLs and cross-site mutations are rejected.
- Microsoft-only accounts can request a recovery link from Security to establish a normal email password. The existing single-use reset flow adds the credential and revokes other sessions.
- Microsoft cannot be disconnected until an email password exists, even when Discord is linked. The server enforces this; hiding or disabling a button is not the authorization boundary. The generic unlink endpoint cannot remove the password credential.
- Disconnecting a provider requires a fresh session. Cancellation, mismatched emails, unverified email and expired requests have fixed public error messages; raw provider error descriptions are not rendered.

`trustedProviders: ['microsoft']` permits explicit linking when Microsoft omits `email_verified`. It does not enable implicit account merging (`disableImplicitLinking` stays true), relax matching emails, or mark an email verified. The local verification boundary remains in place.

## Test boundaries

The local database suite checks authorization URL generation, state/PKCE, cancellation, forged-token rejection, origin/redirect rejection, fresh verified linking, safe disconnection and real password recovery. Provider IDs in those fixtures are synthetic and are removed afterward. The suite does **not** contact Microsoft or represent a successful Microsoft OAuth exchange.

Complete a real provider sign-in, new-account verification, explicit connection and disconnection with your configured application before public release. No real Microsoft credentials were supplied during this upgrade.
