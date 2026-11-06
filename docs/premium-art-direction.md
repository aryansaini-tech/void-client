# Void: premium art direction

## Design plan

The official, source-supplied V is the focal point. Its gold face and dark metal edge already communicate the product's identity; the environment should give it depth and space without adding architecture or imitation branding.

- Palette: Void `#08090B`, Charcoal `#111316`, Graphite `#191C20`, Champagne `#D2B57B`, Ivory `#F2F0EA`, Mist `#A5A8AD`.
- Typography: self-hosted Manrope, with light, tightly set display headlines and readable 14–16px body text. Monocraft stays confined to the existing brand wordmark. Labels use sentence case.
- Layout: an asymmetric hero pairs a concise, left-aligned introduction with a larger, unframed official mark. A full-width preview follows an editorial introduction. Linked stories, an open module index, and an intimate community section replace repeated feature cards.
- Surfaces: largely open charcoal space. Soft tonal changes separate sections; glass belongs to navigation, preview controls, and dialogs. Product images have their own display area, and account forms remain practical and legible.
- Motion: one entrance, user-responsive light, small magnetic displacement, image crossfades, and native scroll. All effects honor reduced motion and keyboard navigation.

```text
Hero                    Editorial + preview          Account
┌─────────────────────┐ ┌─────────────────────────┐ ┌───────────────────────┐
│  quiet floating nav │ │ heading      explanation│ │ identity  / workspace │
│                     │ │                         │ │ nav       welcome     │
│ Play beyond.   V    │ │      immersive image    │ │           connections │
│ copy        official│ │      contextual controls│ │           activity    │
│ actions        logo │ │                         │ │           settings    │
└─────────────────────┘ └─────────────────────────┘ └───────────────────────┘
```

## Review against the brief

An initial product-style direction could still become a repeated dark card kit. The revised composition removes the voxel scene and grid outright, eliminates fake module skeletons, uses an open editorial feature index, and gives download, gallery, release history, and account pages different structures. Gold is concentrated in the original logo and primary actions. No generated replacement logo or decorative square motif is used.

Existing functionality, verified availability, authentication boundaries, checkout behavior, and responsive accessibility remain part of the design requirements. A saved light-mode preference remains supported, while the default experience follows the requested charcoal direction.

## Verification

Recovered and verified on 6 November 2026. The previous session's 34 modified files and this untracked design plan were preserved before work continued. A local recovery patch is stored under `.cache/recovery-20261106/`. The existing single-origin routes, backend, official brand assets, and Cloudflare configuration were retained.

All four production builds, lint, application/test TypeScript checks, 23 unit tests, 19 PostgreSQL integration checks, and 37 HTTP checks passed. A fresh complete browser run passed 67 checks with eight intentional duplicate skips and no failures across desktop Chromium, mobile Chromium, and mobile WebKit. See [the verification report](testing.md) for coverage and reproduction steps.

The existing Cloudflare build also completed with the production public URLs, generating the OpenNext Worker bundle. This verifies packaging; live hosting and service credentials were not exercised. The CI migration step now supplies the schema's required `DIRECT_URL` alongside `DATABASE_URL`.

Screenshots were reopened directly from the repository, with fresh local captures covering hero widths 320–1920px, light mode, input focus, mobile navigation, FAQ expansion, and the gallery. Pointer lighting leaves the official logo's geometry unchanged; reduced motion disables the ambient and magnetic effects. Additional disposable fixtures verified all account pages, mobile navigation to the selected account section, product/category pages, cart thumbnails, disabled checkout, and pending/paid order layouts. Fixtures were removed after review.

Local visual evidence is under `.cache/premium-art-direction/`: `states/report.json`, `private-report.json`, and the `desktop`, `mobile`, and `states` screenshot folders. These generated artifacts remain outside Git. Live OAuth, external email delivery, and provider-hosted payments require their actual service configuration; no simulated purchase is presented as a real product.
