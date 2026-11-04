# UI repairs — 4 November 2026

The website, account portal, and store retain the existing Void logos, Monocraft wordmark, gold accents, and light/dark appearance.

## Changes

- Replaced overlapping reveal and parallax implementations with one shared motion lifecycle. Scrolling stays native, updates run through animation frames, and offscreen logo effects pause.
- Content is visible by default. JavaScript prepares only offscreen reveals; keyboard focus, reduced motion, restored scrolling, and pages without JavaScript retain readable content.
- Rebuilt the website and store heroes as responsive grids so artwork has its own space. Removed fixed mobile artwork offsets.
- Made buttons, forms, navigation, filters, notices, galleries, and the footer use consistent theme colors. Improved text contrast, input text sizes, focus indicators, and touch targets.
- Synchronized the header and mobile theme controls, guarded unavailable local storage, and applied saved appearance before first paint.
- Fixed menu cleanup on navigation and desktop resizing. Added shorter preview transitions, uncropped showcase images, and progressive accordion transitions.
- Fixed admin state initialization, draft selection, notification timers, module types, and invalid availability/category values.
- Excluded generated static exports from linting. Added an optional in-process webpack build setting for restricted Windows hosts.

## Verification

- ESLint: no errors or warnings across applications, packages, backend, tests, and scripts.
- TypeScript: shared UI and browser tests passed. All three application production builds also passed their TypeScript checks.
- Existing unit suite: 21 passed.
- Production builds: website, account, and store passed with webpack.
- HTTP verification: all 21 public pages and 84 referenced assets returned successfully; the shared stylesheets parsed successfully.
- Added browser regressions for no-JavaScript rendering, scroll reveals, reduced motion, theme synchronization, storage restrictions, and menu resizing. Updated the existing logo test to match the current wordmark.

Browser interaction and visual checks remain unverified: the in-app browser had no connected backend, the environment rejected headless Chrome process creation, and desktop browser access timed out awaiting app approval. No claim of measured frame rate or real-device verification is made.

For production-build verification in this workspace, set `VOID_SINGLE_PROCESS_BUILD=true` and run `next build --webpack` from each application directory. Normal builds retain their default worker configuration unless that environment variable is set.

Original files from the main UI pass were retained in `.cache/ui-polish-before`. Local preview and HTTP verification helpers are in `.cache/ui-preview.mjs` and `.cache/ui-verify.mjs`.
