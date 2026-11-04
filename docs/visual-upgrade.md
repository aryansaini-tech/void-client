# Visual and motion upgrade

The existing applications, routes, content, database models and store flows are retained. The upgrade extends their shared UI and theme rather than replacing the project. No additional animation library was installed.

## Official artwork

`assets/logo.png` is the transparent **450 × 450** V. `assets/void-logo.png` is the transparent **1024 × 341** wordmark. Both are copied unchanged into each app's `public/brand/` directory. Navbar, hero, account/store artwork, footer and loading states render these files with their intrinsic aspect ratios. Icons and Open Graph artwork are resized derivatives of the same sources.

Run `npm run brand:prepare` after intentionally replacing supplied artwork. The script also prepares the supplied Zerix image and updates only the provisional branding inside the existing concept illustrations. Concept scenes remain clearly labelled; they are not client screenshots. Source SVGs, public URLs and the rest of each composition are preserved.

The shared logo component is `packages/ui/src/brand.tsx`. A narrow champagne reflection passes through an alpha mask made from the actual PNG. The approximately 1.9-second sweep repeats on a 5.8-second cycle; a separate restrained sweep enhances hover. Offscreen logos and hidden tabs pause the loop. Reduced-motion users receive the crisp static artwork.

## Color and typography

`packages/design-system/tokens.css` is authoritative. Warm black `#080706`, surfaces `#15120f`, gold `#e8bd62`, metallic `#c7973e` and champagne `#ffe4a4` are matched to the supplied artwork. Manrope and the existing editorial hierarchy remain. Black dominates; light gold is reserved for brand detail, focus, navigation and actions.

Shared refinements live in `packages/design-system/polish.css`, imported by all three applications after the existing layout stylesheet. Page structure and responsive layout rules remain intact.

## Motion system

`packages/ui/src/motion.tsx` coordinates the existing Framer Motion, GSAP and browser APIs:

- IntersectionObserver reveals sections, cards, timeline/FAQ entries, order rows, installation steps and portal panels. A MutationObserver registers filtered or streamed content. Staggers are capped at 195 ms.
- `data-reveal` supports `rise`, `left`, `right`, `scale`, `card`, `mask` and `heading`. `RevealText` provides masked words while retaining one uninterrupted accessible heading.
- GSAP applies desktop hero depth/fade, showcase perspective, background lighting and bounded `data-parallax` movement. It is loaded only for a fine pointer at widths of at least 900 px. Match-media contexts revert on navigation, preference changes and unmount.
- CSS handles the actual-logo reflection, hover elevation, button sweeps, page entrances, menu movement and responsive reductions. Independent transform properties prevent reveal and hover effects from competing.
- A throttled scroll indicator follows native page progress. No wheel interception, scroll replacement, pinning or artificial route delays are used.
- OS reduced motion and the account's saved local preference are respected, including live changes. Focused content is revealed immediately, and restored history positions do not hide content above the viewport.

The same behavior covers the nine website pages, authentication and protected account pages, catalog/category/product pages, cart, checkout and order screens. Existing filters, tabs, dialogs, validation and backend requests continue to use their existing components.

## Configuration and verification

The user-supplied Discord invitation is configured as `https://discord.com/invite/fRs86qQXCT`. Microsoft login is added alongside email/password; see [Microsoft setup](microsoft-login.md). Products, prices, downloads and partner addresses remain unpublished until supplied.

See [actual test results](testing.md). Responsive and reduced-motion browser tests are included; performance and visual quality must be assessed in a working browser. No 60 FPS or Lighthouse score is asserted without measurement.
