# VOID website release

The React/Vite website and its Node.js account server are packaged at the repository root. Build using Node.js 24:

```sh
npm ci
npm run build
```

The output is `dist`. Cloudflare Pages can serve the static frontend using the root build command and `dist` output. The full account and admin functionality requires the Node server and PostgreSQL; start it with `npm start` after configuring private server settings. Database migrations are separate from startup. Real purchasing is disabled.

- [Setup, hosting and environment variable names](../README.md)
- [Publication and hosting settings](PUBLISH.md)
- [Existing database, backup and additive migration](DATABASE-ROLLOUT.md)
- [Legacy repository inspection](LEGACY_INSPECTION.md)
- [Implementation verification status](../STATUS.md)
- [Dependencies and licenses](../THIRD_PARTY_NOTICES.md)
- [Exact release filenames](RELEASE_FILES.txt)

Native launcher and client source are maintained separately. Private data, credentials, environment files, browser profiles, game/reference material and build output are excluded from this source release.
