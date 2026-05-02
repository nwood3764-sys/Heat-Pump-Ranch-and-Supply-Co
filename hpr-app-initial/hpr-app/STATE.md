# Build State

Tracks where we are so any conversation can pick up cleanly. Update after
every meaningful change.

Last updated: 2026-05-01

## Done

### Database (Supabase project: HPR, id: tcnkumgqfezttiqzxsan, US East)

- [x] 0001 â initial schema, all FKs, indexes, GIN indexes for fuzzy search
- [x] 0002 â RLS policies. Public catalog readable; B2C sees Retail prices;
      approved contractors see their tier; admins see everything; sync tables
      admin-only; auto-create users row on auth signup
- [x] 0003 â security hardening (extensions out of public schema, EXECUTE
      revoked on helpers)
- [x] 0004 â `product-media` storage bucket + policies
- [x] 23 tables total (0001-0004 + later additions: `price_history`,
      `sync_runs` + `sync_run_items` replacing the original `sync_logs`)
- [x] 3 pricing tiers seeded (Retail / Contractor 30% / Wholesale 35%)
- [x] Admin user: nicholas.wood@heatpumpranch.com (id=1, role=admin)
- [x] **10 categories seeded** (ac-furnace-systems, heat-pump-systems,
      mini-splits, furnaces, air-conditioners, heat-pumps, air-handlers,
      ac-condensers, heat-pump-condensers, heat-pump-coil)
- [x] **8 ACiQ mini-split products seeded** as a smoke test of the full
      data flow (products + product_images + product_pricing). All
      visible at /catalog?category=mini-splits.

### Frontend (Next.js 15, deployed on Netlify)

- [x] Live at https://heat-pump-ranch-and-supply-co.netlify.app
- [x] App Router scaffold: storefront / auth / admin route groups
- [x] Tailwind v4, Plus Jakarta Sans, navy primary palette
- [x] shadcn-style UI primitives: Button, Card, Badge, Input
- [x] Storefront layout: utility bar, header w/ search, category nav, footer
- [x] Homepage with category-grid hero, trust strip, brands, featured
      products, "Narrow Your Cooling/Heating" sections, contractor CTA
- [x] Catalog page with working filters including ?type=systems and
      ?type=accessories
- [x] Product card component with HVAC Direct strikethrough pricing and
      savings badge. Shows: ~~HVAC Direct $X,XXX~~ / Our Price $X,XXX / You save X%
- [x] /help page (replaces Manus 404)
- [x] /rebates page (replaces Manus 404, includes IRA tax credit info)
- [x] Auth: login, signup, callback route
- [x] Middleware: refreshes Supabase session, gates /admin behind admin role
- [x] Admin layout + dashboard with real stats from DB
- [x] Supabase clients: browser, server (SSR), service-role, middleware
- [x] TypeScript types for the schema (still uses `as any` casts in a few
      places â see Tech Debt below)

### Sync (real implementations, not yet running on schedule)

- [x] Shared `sync-runner.mjs` with full reconciliation:
      tracks new/updated/unchanged/discontinued/failed; rehosts images to
      Supabase Storage; rehosts documents (manuals, spec sheets); logs
      price changes to `price_history` with delta %; posts notifications
- [x] **Pricing model**: dealer cost × 1.30 = our selling price.
      HVAC Direct internet list price stored as `msrp` for strikethrough.
      Nightly pricing report includes: SKU, Dealer Cost, Our Price,
      HVAC Direct Price, Savings, Margin %
- [x] **Real ACiQ scraper** (`scripts/sync-aciq.mjs`):
      - Source: hvacdirect.com (server-rendered Magento, public, no auth)
      - Helper lib: `scripts/lib/hvacdirect.mjs` (cheerio-based HTML parsing)
      - Walks 13 ACiQ subcategories with auto-pagination
      - Per product: SKU, model number, title, full description, 30+ specs
        from spec table (BTU, SEER2, HSPF2, AHRI, refrigerant, voltage,
        weight, dimensions, etc.), 8-11 PDFs (AHRI cert, install manual,
        service manual, warranty), thumbnail + og:image, retail price,
        MSRP, breadcrumb-derived category
      - `--dry-run`, `--limit=N`, `--category=` flags
      - Tested against live HVACDirect (~1000 ACiQ products discoverable)
- [x] **LG scraper structure** (`scripts/sync-lg.mjs`):
      - Public pass: Playwright on lghvac.com product-type pages
      - Dealer-pricing pass: us.lgsalesportal.com login when
        LG_PORTAL_USERNAME/PASSWORD (or LG_USER/LG_PASS) env vars are set
      - Portal pass scrolls /s/products listing, visits each PDP to
        extract Dealer Price / Net Price, matches to public-pass products
        by model number
      - Selectors based on working older repo implementation â confirm on
        first run with real credentials
- [x] **GitHub Actions workflows**:
      - `.github/workflows/sync-aciq.yml` â nightly 06:30 UTC, manual
        dispatch with dry_run/limit/category inputs
      - `.github/workflows/sync-lg.yml` â nightly 07:00 UTC, installs
        Playwright Chromium

## Not done â in priority order

### Required to launch a usable site

1. **Push these scraper changes to GitHub** so workflows pick them up
2. **Set GitHub Actions secrets**:
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required for any sync)
   - `ACIQ_PORTAL_USERNAME` / `ACIQ_PORTAL_PASSWORD` (optional, for
     wholesale-pricing augmentation later)
   - `LG_PORTAL_USERNAME` / `LG_PORTAL_PASSWORD` (optional, for LG dealer
     pricing)
3. **Run first ACiQ sync via workflow_dispatch** with `dry_run=true,
   limit=10` to verify, then full sync
4. **Product detail page** (`/product/[slug]`) â the catalog cards link
   to /product/${sku}, page not yet built
5. **System detail page** (`/system/[slug]`) â same
6. **Cart and checkout flows** (Stripe integration)
7. **Contractor application page** (form posts to contractor_accounts
   with status='pending')
8. **Real testimonials, real phone, real footer links** â replace the
   placeholders that are currently in the codebase
9. **LG sales-portal selectors**: ported from working older repo;
   confirm against live portal once dealer credentials are set

### Nice-to-have / second pass

- AI Project Advisor chat
- Build My Project wizard (7 steps)
- Equipment Selector wizard (6 steps)
- Admin pages: Products list/edit, Systems edit, Categories, Pricing
  matrix, Sync trigger UI, Orders list, Contractors approve/suspend,
  CSV Import
- AHRI scraper actual selectors (skeleton at scripts/sync-ahri.mjs)
- Mega-menu w/ category thumbnails on hover (currently a flat
  horizontal nav)
- ACiQ portal pass for true wholesale pricing (portal.aciq.com Magento
  login, augments retail data with Contractor/Wholesale tier prices)

### Decisions deferred

- Freight: request-a-quote at checkout (no real-time integration)
- AHRI: scraping carefully, not licensing the feed
- Brand color/logo: keeping current Manus visual identity

## Tech Debt

- `next.config.ts` has `typescript: { ignoreBuildErrors: true }` and
  `eslint: { ignoreDuringBuilds: true }` â needs to come off once types
  are regenerated and `as any` casts are removed
- `lib/supabase/types.ts` is a hand-written stub â should be regenerated
  from live schema via Supabase MCP `generate_typescript_types`
- `as any` casts in `app/(admin)/layout.tsx`, `lib/supabase/middleware.ts`,
  `app/(admin)/admin/page.tsx`

## Open questions

- Real phone number to replace 1-800-555-1234?
- Real customer-service email to replace `hello@heatpumpranchandsupplyco.com`?

## Files that need attention before launch

- `app/(storefront)/layout.tsx` â utility bar phone is fake
- `components/storefront/site-footer.tsx` â fake phone, fake email
- `components/storefront/utility-bar.tsx` â fake phone
- `app/(storefront)/help/page.tsx` â uses fake phone in body copy

When real contact info is available, search/replace `1-800-555-1234` and
`hello@heatpumpranchandsupplyco.com` across the repo.
