# VOID website and launcher

Shared Discord account implementation; owner verification is pending. Real purchasing and Minecraft cape rendering are not live.

- [Setup and environment variable names](website/README.md)
- [Phase status, tests, commits and owner checklist](website/STATUS.md)
- [Existing database, backup and additive migration](website/docs/DATABASE-ROLLOUT.md)
- [Legacy repository inspection](website/docs/LEGACY_INSPECTION.md)
- [Launcher account integration](launcher/ACCOUNT-INTEGRATION.md)
- [DLL cosmetic handoff — design only](launcher/COSMETICS-HANDOFF-DESIGN.md)
- [Dependencies and licenses](website/THIRD_PARTY_NOTICES.md)
- [Exact release filenames](website/docs/RELEASE_FILES.txt)

The website is React/Vite with a Node 24/PostgreSQL server. The native Windows launcher is C++20/Win32/ImGui/D3D11. Discord credentials stay on the website; launcher tokens are protected by DPAPI. The existing catalogue/payment records remain in PostgreSQL, with additive account/cosmetic/audit tables.

Website build:

```sh
cd website
npm ci
npm run build
```

Configure private environment settings and the separate development database as described in the website README before running `npm start`. Production migrations require a verified backup and explicit approval; server startup never migrates the database. Only Discord sign-in is enabled. `/admin` access comes solely from the private `VOID_ADMIN_DISCORD_IDS` allowlist.

Native launcher build from the repository root:

```sh
cmake -S launcher/standalone -B build-launcher -A x64
cmake --build build-launcher --config Release --target void_launcher void_account_checks
```

Configure the public `VOID_WEBSITE_ORIGIN` for the launcher. No provider secrets, private data, environment files, client DLL source, Latite source, Mojang assets, reference/disassembly material or compiled binaries belong in this release.
