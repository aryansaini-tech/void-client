# Void cinematic transformation

The existing Next.js ecosystem now adapts the supplied `website/website` reference. The website continues to expose its established `/account`, `/store` and `/api` routes; the standalone account and store builds remain intact.

## Reference analysis

Inspected the README, generated `void.html` and `void-scene.html`, `void.css`, native UI CSS/JS, Monocraft attribution and SIL Open Font License, `minecraft-world.js` and its baked runtime, runtime ownership, shader warm-up, mesh loader, Champagne artwork generator, camera adapter, geometry preparation, and live verification scripts. The reference was served locally and its hero and second chapter were inspected in Chrome with a working WebGL scene and no page errors.

The live reference uses a pinned local Three.js runtime, Catmull-Rom position/target curves, frame-independent camera damping, compressed lossless terrain geometry, instanced foliage with vertex animation, a shader sky panorama and cached planar water reflection. Its bright glass controls balance ivory text against a natural forest and atmospheric blue-grey landscape. The offline `champagne-scene.js` artwork generator is separate from the live valley.

Monocraft is embedded unchanged under SIL OFL 1.1. Its license and attribution are shipped in every application's `/void/fonts/`. The existing official V PNGs remain unchanged. Three.js retains its license header and the full r149 MIT license is shipped as `/void/LICENSE-Three.txt`; Minecraft texture attribution is included in `/void/textures/`. See `/void/CREDITS.txt` for the supplied reference credits.

## Route and integration audit

| Area | Existing routes | Retained behavior |
| --- | --- | --- |
| Website | `/`, `/modules`, `/download`, `/discord`, `/changelog`, `/sneak-peeks`, `/partners`, `/faq`, `/about`, `/admin` | Configured downloads and invitation, live content storage, module search/categories, gallery, FAQs, admin editing |
| Authentication | `/account/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` below `/account` | Better Auth, validation, return destinations, verification/recovery outbox, Microsoft availability |
| Account | `/account/dashboard`, `/profile`, `/security`, `/settings`, `/discord`, `/purchases`, `/players/[id]` below `/account` | Authorization, profile/preferences, password/session management, linked accounts, purchase history |
| Store | `/store`, `/products`, `/products/[slug]`, `/categories`, `/categories/[slug]`, `/search`, `/cart`, `/checkout`, `/orders`, `/orders/[id]` below `/store` | Prisma catalog, search/filters, cart persistence, server quotes, Stripe hosted checkout, authoritative order states |
| APIs | `/api/auth/[...all]`, `/profile`, `/settings`, `/sessions`, `/cart`, `/checkout`, `/orders/[id]`, `/webhooks/stripe` below `/api` | Existing validation, origin checks, authentication, database/mail/payment services |

No backend or payment implementation was replaced. No products, modules, performance statistics, release requirements, or executable URLs were invented. The homepage uses the existing module catalog and labels design studies as concepts. Unconfigured downloads remain disabled.

## Adaptation

- `scripts/prepare-cinematic.mjs` extracts the renderer, camera interpolation, post passes and cloth equations from the supplied source with checked boundaries. It copies original world geometry, textures, loaders and lifecycle code, and emits a small isolated scene document. Generated assets are included in the project; a normal build does not require the reference folder.
- Nine camera waypoints correspond to opening, landscape, why Void, experience, modules, customization/HUD, release/performance information, community and download. Scroll updates write directly to the renderer and CSS variables without React state updates on every frame. Startup uses the current scroll position. Camera interpolation is the reference's authored approach.
- The world owns one frame loop, hidden/inactive pauses, adaptive pixel ratio, reflection cache, shader warm-up, context loss fallback and GPU cleanup. React unmount disposes the scene. Reduced motion retains on-demand camera rendering while freezing ambient animation. Phones use the reference's lower quality mode and aspect adjustment.
- Three landscape cards lazily initialize the original cloth simulation near their section on wider devices with a fine pointer. Each card owns its listeners, observers and GPU resources. Switching to a narrow viewport releases the simulation; coarse pointers and reduced motion retain the static landscape card. Canvas bleed is contained without changing the document width.
- Shared tokens use `#DAC8AD`, `#1F201E`, `#535653`, forest green, ivory and sky. Shared CSS, navigation and captured landscapes apply across the website, account and store. Existing concept SVG compositions are updated to the same landscape and Champagne materials.
- Security headers allow the same-origin decorative scene document; sensitive application routes retain their embedding protection. Cloudflare static headers include the corresponding scene exception.

## Local operation and checks

Use the existing `npm run dev:website` or normal build/start commands. The homepage works immediately with a captured landscape while the live world initializes. `?nogl=1` exercises the attractive fallback. No loading screen hides the content.

`npm run cinematic:prepare` regenerates derived assets when the supplied reference is present. `npm run verify:cinematic` runs targeted browser verification. The existing public, authentication and configured commerce suites continue to cover actual interactions; configured tests require the documented disposable database and never initiate a payment.

Final verification evidence is recorded in `docs/testing.md`, local `.cache/cinematic-qa/` screenshots and `test-results/` captures. Software WebGL confirms renderer behavior, not real-device frame rate or driver compatibility. Payment-provider/OAuth operations require genuine configured services.
