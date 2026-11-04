# VOID CLIENT

**PLAY BEYOND LIMITS.**

An original black-and-gold Minecraft Bedrock ecosystem: an editorial product website, a secure account portal, and a store with server-priced Stripe Checkout. The website serves `/store` and `/account` by importing the existing app routes and services. The standalone account and store builds remain available.

The repository root is the `void-client` monorepo. It was created from an empty workspace. No Flarial code, templates, WordPress themes, or third-party component source was copied.

The visual upgrade preserves this existing ecosystem and adds the supplied official logos, an alpha-masked metallic sweep, a warmer champagne-gold theme, shared scroll effects and Microsoft login alongside email. See [the upgrade notes](docs/visual-upgrade.md) and [Microsoft configuration](docs/microsoft-login.md).

## Start locally

Use Node.js **22.15+ or 24 LTS** and npm. From this directory:

```sh
npm install
npm run db:generate
npm run dev
```

No credentials are required to preview all public pages. Account operations and checkout clearly explain their unavailable state until configured. Copy `.env.example` to `.env` to configure services; restart the apps after changing environment variables.

| Application | Local address | Production domain |
| --- | --- | --- |
| Website | http://localhost:3000 | https://voidclient.org |
| Account | http://localhost:3000/account | https://voidclient.org/account |
| Store | http://localhost:3000/store | https://voidclient.org/store |
| Backend / mail worker | http://localhost:3003/health | Private service; no public domain required |

For authentication, start PostgreSQL and a local inbox with `docker compose up -d`, set the values described in [local development](docs/development.md), then run `npm run db:deploy`. The backend worker delivers verification and recovery messages. Checkout additionally requires genuine products, approved policy URLs, and Stripe credentials.

`npm run dev:website` previews all three areas. Ports 3001 and 3002 still run the standalone account/store applications with their original root routes. The integrated website requires a Next.js server; static export cannot run authentication or checkout. See [single-origin routing and migration notes](docs/single-origin.md) before changing any hosting configuration.

## Repository

```text
apps/
  website/                 Product website and original SVG concept artwork
  account/                 Better Auth endpoints and protected account portal
  store/                   Product catalog, cart, checkout, orders, Stripe webhook
packages/
  ui/                      Shared brand, navigation, dialogs, motion, components
  design-system/           Palette, typography, responsive layout and effects
  shared/                  Editorial content, public URLs, schemas, money helpers
  config/                  Next.js, Tailwind and TypeScript configuration
backend/
  src/                     Auth, PostgreSQL, encrypted mail queue, commerce, HTTP worker
  prisma/                  Schema, initial migration, editorial draft seed
scripts/                   Workspace runner, configuration checks, test loader
tests/                     Unit, database integration and browser checks
docs/                      Architecture, setup, content, security, deployment, QA
```

## Applications and behavior

- **Website:** Home, Modules, Download, Discord, Changelog, Sneak Peeks, Partners, FAQ, About; searchable libraries, accessible filters/accordions, gallery lightbox, showcase tabs, partner-address copy controls, mobile navigation, metadata, Open Graph images, robots and sitemap.
- **Account:** Login, registration, forgot/reset password, email verification, dashboard, profile, security, settings, Discord linking, purchase history, and opt-in public profiles. Password hashing, email verification, persistent sessions, rate limits, session revocation and reset flows use Better Auth and PostgreSQL.
- **Store:** Homepage, collection, categories, category/product detail routes, search, persistent guest and account carts, checkout, order confirmation/status and purchase history. Account carts use revision checks; stale updates are rejected. Stripe receives product Price IDs from the server. Signed webhooks record payments transactionally and deduplicate events.
- **Motion:** Browser-native reveals, preview crossfades, gold shine, restrained magnetic controls, lightweight scroll-linked artwork, and route transitions. Scrolling stays native; content remains readable with reduced motion or JavaScript disabled. See [the UI repair notes](docs/ui-polish.md) and [the integration notes](docs/single-origin.md).

Technology: Next.js 16.4.4, React 19.3.1, TypeScript, Tailwind, Framer Motion, GSAP, Lucide, Prisma 6.19.3, PostgreSQL, Better Auth 1.7.15, Hono, Nodemailer and Stripe. Manrope is self-hosted; no runtime font CDN is needed. See [architecture](docs/architecture.md).

## Commands

```sh
npm run dev                  # all apps and the backend
npm run dev:website          # or dev:account, dev:store, dev:backend
npm run build                # all production builds
npm run start                # all production servers
npm run lint
npm run typecheck
npm test
npm run test:integration      # requires TEST_DATABASE_URL ending in _test
npm run test:http             # checks running production servers on 3000–3002
npm run test:e2e              # install Playwright browsers first
npm run db:generate
npm run db:deploy             # apply committed migrations
npm run db:migrate            # author a new development migration
npm run db:seed               # editorial drafts only
npm run check:config          # readiness without printing secrets
npm run brand:prepare         # distribute the supplied logos and derived artwork
```

See [the testing report](docs/testing.md) for actual results and environment limitations. The report distinguishes executed checks from tests requiring provider credentials or real devices.

## Content and launch requirements

No client modules, releases, supported versions, installation requirements, downloadable files, products, prices, reviews, community counts, or partner contact details have been invented. Zerix Network is a pending entry with supplied artwork; its links and address remain empty. The showcase contains **clearly labelled original concepts**, not actual client screenshots. The default store is empty.

The supplied logos and Discord invitation are configured. Before launch, supply verified client content and download links, real screenshots, partner details, genuine product/Stripe Price records, approved legal URLs, PostgreSQL, SMTP, a random auth secret, Microsoft application credentials, Stripe keys/webhook configuration, and optional Discord OAuth credentials. Product fulfillment needs the actual entitlement/delivery integration; payment and fulfillment statuses are deliberately separate.

Use [content editing](docs/content.md), [environment reference](docs/environment.md), [security](docs/security.md), and [deployment and DNS](docs/deployment.md). Hosting, domain registration, DNS changes, payment processing, and external email delivery are not performed by this repository setup.

Design references and licensing notes: [resources](docs/resources.md).
