# Publish real content

The default repository is intentionally honest about information that has not been supplied. Empty states are functional parts of the product, not demo sales or invented client claims.

## Website source of truth

Edit `packages/shared/src/content.ts` for confirmed modules, changelog entries, FAQs, the partner list and showcase records. `packages/shared/src/config.ts` owns release requirements/instructions and the shape of public configuration. Deploy a new website build after editorial changes.

- **Modules:** Add only verified names/descriptions/categories/availability. Category filters derive from actual records; no empty Combat or Movement category is advertised by default.
- **Releases:** Supply real version, ISO date, title, update kind and the corresponding feature/improvement/fix/notice lists. Historical releases are not seeded.
- **Downloads:** Set only verified platform URLs in `.env`/hosting configuration. Add confirmed requirements and installation steps with the release. A platform slot marked Coming soon does not claim that platform is supported.
- **Discord:** Configure a genuine invitation. No counts or fabricated community activity are shown.
- **Partners:** Zerix Network has its supplied name and artwork. Add an approved description, website, invite and server address when provided; then change its status to published. Copy-address controls appear only for a real address.
- **FAQ:** Maintain the answer text as official client details change.
- **Screenshots:** The five SVG images under `apps/website/public/media` are original labelled concepts. Replace them with approved WebP/AVIF screenshots, update alt text, description and status, and remove the concept disclaimer only when the image is actually a client capture.

Prisma's Module/ChangelogEntry/Partner/FAQEntry models are prepared for a future CMS. They are **not** a second live publishing source in this version. `db:seed` prepares unpublished editorial drafts without replacing the website's version-controlled content. No CMS or admin panel is implied.

## Store catalog

The store reads published `Product` records and their `ProductCategory` relations from PostgreSQL. Unpublished products never reach the browser. Use a trusted admin workflow or Prisma Studio locally; no public product-editing endpoint exists.

Before publishing a product:

1. Supply its actual name, description, category and URL-safe slug.
2. Store a nonnegative integer price in the currency's minor units and a valid lowercase ISO currency. A cart supports a single currency.
3. Create the matching **one-time, per-unit** price in Stripe. Database amount/currency must match exactly. Inclusive tax, subscriptions, discounts and shipping are not implemented by this checkout contract.
4. Put approved images under `apps/store/public/media/` and store `/media/...` paths. Only validated local media paths are exposed. No arbitrary remote image fetches are allowed.
5. Set the real Stripe Price ID and confirmed availability. Mark `published=true` only after reviewing the details. `featured=true` sorts the product earlier in the collection.
6. Test in Stripe test mode, configure fulfillment for the actual product, then enable checkout after all launch requirements are met.

The current catalog query is capped at 200 published products. Add server pagination before exceeding that size. Category/search controls operate on the published catalog. Product and category deep links return 404 for missing/unpublished entries.

Payment confirmation is not product delivery. Connect the `UNFULFILLED` / `FULFILLED` / `REVOKED` state to a secure entitlement or fulfillment worker before selling products requiring delivery. Never grant an entitlement from a browser redirect.

## Demo data

There are no demo purchases, demo prices, demo customer accounts or fake reviews. Database integration/browser fixtures are explicitly named TEST FIXTURE and belong only in a database ending `_test`. The production seed does not insert them. Remove test fixtures through their tracked IDs; never use a production reset as cleanup.

## Legal and branding

Configure actual approved policy URLs. Empty legal URL values produce no fake links. The official V and full wordmark are supplied user assets; the voxel artwork and interface concepts are original project compositions. Run `npm run brand:prepare` to refresh distributed artwork after an intentional source change. Manrope and installed libraries retain their respective licenses. See [resource notes](resources.md).
