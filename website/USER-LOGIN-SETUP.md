# Discord account setup

See [README.md](README.md) for current setup and environment variable names, [DATABASE-ROLLOUT.md](docs/DATABASE-ROLLOUT.md) for the existing database and backup/migration steps, and [STATUS.md](STATUS.md) for local evidence and owner verification.

Discord is the only account provider. The website callback remains `/auth/discord/callback`; the launcher does not register another provider redirect or store a provider secret. Xbox and password-based admin sign-in are disabled. Admin authorization comes only from the private `VOID_ADMIN_DISCORD_IDS` environment allowlist.

All deployed functionality remains NOT VERIFIED until the owner tests it. Real purchasing is not live.
