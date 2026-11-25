# Publish the website

The website source belongs at the root of `aryansaini-tech/void-client`. Run build and verification commands from the repository root:

```sh
npm ci
npm run build
npm run test:server
node scripts/secret-scan.mjs --root . --manifest docs/RELEASE_FILES.txt
```

Review every filename in `docs/RELEASE_FILES.txt`. Keep dependencies, build output, browser profiles, private data, environment files, database dumps and credentials out of the commit. Before replacing an existing site, retain its current commit on a backup branch. Create a normal commit containing the replacement source, then fetch and scan the new committed tree before pushing:

```sh
git fetch origin
node scripts/secret-scan.mjs --root . --repo . --manifest docs/RELEASE_FILES.txt --base origin/main --head HEAD --require-commits
git push origin HEAD:main
```

If remote main advanced, review and incorporate those changes before proceeding. If main is protected, push the replacement on a new branch and open a pull request into main. Never force-push.

## Cloudflare Pages

Configure the existing Pages project with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Build Node.js version | `24` |

The repository's `wrangler.jsonc` declares `dist` as the Pages output directory. Replace any former workspace build command or `apps/website/out` value saved in the hosting dashboard. SPA redirects are copied from `public/_redirects` into the build.

Pages serves the static frontend. The Node account/admin APIs, Discord callback, downloads and payment webhook need a Node.js 24 host and private server settings; they do not run in Pages from this source unchanged.

## Complete Node website

On a Node.js 24 host, build with `npm ci && npm run build` and start with `npm start`. Set `NODE_ENV=production`, an HTTPS `VOID_ORIGIN`, and the private environment settings described in [README.md](../README.md). Bind `VOID_HOST=0.0.0.0` on a managed hosting platform; the server uses `VOID_PORT` or the platform's `PORT`. A multi-stage Dockerfile is also included.

Configure PostgreSQL connectivity and Discord credentials privately. Review [DATABASE-ROLLOUT.md](DATABASE-ROLLOUT.md) before any real migration. Application and container startup do not migrate databases. Verify deployed login, accounts, admin access and provider callbacks before treating them as live. Real purchasing is disabled.
