# Build State

Tracks where we are so any conversation can pick up cleanly. Update after
every meaningful change.

Last updated: 2026-05-03

## Done

### Database (Supabase project: HPR, id: tcnkumgqfezttiqzxsan, US East)

- [x] 0001 — initial schema, all FKs, indexes, GIN indexes for fuzzy search
- [x] 0002 — RLS policies. Public catalog readable; B2C sees Retail prices;
      approved contractors see their tier; admins see everything; sync tables
      admin-only; auto-create users row on auth signup
- [x] 0003 — security hardening (extensions out of public schema, EXECUTE
      revoked on helpers)
- [x] 0004 — `product-media` storage bucket + policies
- [x] 23 tables total (0001-0004 + later additions: `price_history`,
      `sync_runs` + `sync_run_items` replacing the original `sync_logs`)
- [x] 3 pricing tiers seeded (Retail / Contractor 30% / Wholesale 35%)
- [x] Admin user: nicholas.wood@heatpumpranch.com (id=1, role=admin)
- [x] **10 categories seeded** (ac-furnace-systems, heat-pump-systems,
      mini-splits, furnaces, air-conditioners, heat-pumps, air-handlers,
      ac-condensers, heat-pump-condensers, heat-pump-coil)
- [x] **Water Heaters category** (id=51) added for LG Therma V and APHWC
      products
- [x] **8 ACiQ mini-split products seeded** as a smoke test of the full
      data flow (products + product_images + product_pricing). All
      visible at /catalog?category=mini-splits.

### Product Classifications (2026-05-03)

- [x] **Spec normalizer rewrite** (`scripts/lib/spec-normalizer.mjs`):
      Comprehensive model-number-based classification for both LG and ACiQ.
      Uses model number prefixes as the primary classification key (not
      SKU numbers — model numbers are the universal HVAC identifier).
      - **LG patterns** (25+): ARNU, ARUN, ZRNU, ZRUN, KNM, KNS, KNU,
        KUMX, KUSX, KUS, KSS, LSN, LCN, LDN, LHN, LVN, LQN, LSU, LUU,
        LAU, LVU, LMU, LAN, LKMMA, APHWC, R5TT, PHDCLA, etc.
      - **ACiQ patterns** (20+): ACIQ-XXZ-HP, ACIQ-XX-EHPD, ACIQ-XX-TD-HP,
        ACIQ-XX-AHD, R5H, R4H, AQ-GLZ, ES-XXZ, SCC, EHC, EFL, EFS, etc.
      - Derives: equipment_type, product_category, system_type, mount_type,
        zone_type, cooling_btu from model number structure
      - LG BTU extraction: 3-digit model codes = hundreds of BTU
        (e.g., LVN181 = 18,100 BTU, not 181,000)
- [x] **Classification coverage** (416 active products):
      - equipment_type: 349 set (67 are accessories — correctly NONE)
      - product_category: 416 set (100%)
      - system_type: 369 set (47 accessories correctly NONE)
- [x] **SKU injection fix**: Sync scripts (sync-aciq.mjs, sync-lg.mjs)
      and rebackfill now inject the product's actual model number into
      `specs.SKU` before calling normalizeSpecs. The `specs.SKU` field
      from HVACDirect scraping often contained accessory SKUs (line sets,
      install kits) rather than the product's model number.
- [x] **Water heater classification**: APHWC, R5TT, PHDCLA models
      classified as `product_category: "water-heaters"`,
      `equipment_type: "water-heater"`, `system_type: "water-heater"`

### System Pricing Infrastructure (2026-05-03)

- [x] **system_packages table populated**: 150 multi-zone combo systems
      parsed from combo product SKUs (e.g., "KUMXB181A / 2-KNUAB091A")
- [x] **system_components table populated**: 394 component links with
      quantity and role (condenser, air_handler, etc.)
- [x] **System pricing computed from components**: For each combo system,
      sum all component dealer costs × 1.30 = system retail price.
      Individual model number pricing from dealer portals is the single
      source of truth. System pricing is always derived.
- [x] **Pricing coverage**: 408/416 active products have pricing.
      8 LG products (7 concealed duct LD*/LDN* + 1 water heater R5TT20F)
      need pricing from next LG portal Excel download.
- [x] **populate-system-pricing.mjs**: Script to create/update system
      packages, components, and computed pricing from component costs.
      Handles quantity prefixes (e.g., "2-KNUAB091A" = qty 2).

### Pricing Audit & Integrity (2026-05-03)

- [x] **audit-pricing-integrity.mjs**: Comprehensive audit script that
      checks 7 categories:
      1. Active products without pricing (action items, NOT deactivated)
      2. Below 30% markup (dealer cost × 1.30 minimum)
      3. Negative savings (our price > MSRP — hide strikethrough)
      4. System price vs component sum mismatch
      5. Stale pricing (>30 days without update)
      6. R-410A refrigerant products (should be deleted per policy)
      7. Zero dealer cost anomalies
      - `--fix` mode: only deactivates R-410A products (no-price stays active)
      - `--json` mode: outputs JSON for programmatic consumption
      - R-410A detection: trusts spec field over title (titles can be
        misleading, e.g., "R410A Inverter" in title but actual refrigerant
        is R-454B)
- [x] **sync-runner.mjs updated**:
      - Auto-recalculates system prices when component prices change
      - Collects audit action items after each sync
      - Passes action items to nightly email report
      - System price changes logged to price_history with
        source="portal-system-recalc"
- [x] **email-notify.mjs updated**:
      - New "Action Items" section in nightly email with:
        - Missing Pricing (hidden from storefront until resolved)
        - No Strikethrough Price (our price > MSRP, expected behavior)
        - R-410A Products Still Active (policy violation)
        - Stale Pricing (>30 days, may indicate discontinued)

### Pricing Rules (permanent)

- **Individual equipment**: dealer cost from portal Excel × 1.30
- **System combos**: sum of component dealer costs × 1.30
- **MSRP/strikethrough**: HVAC Direct internet list price. Only shown
  when our price < MSRP. When our price >= MSRP, show our price only
  with no strikethrough.
- **Floor price**: MAX(dealer cost × 1.30, HVAC Direct price) — never
  sell below either threshold
- **No-price products**: remain is_active=true but hidden from storefront
  via product_pricing join. Flagged as action items in nightly report.
- **R-410A**: completely excluded. Never imported, never displayed.
- **No "low price guarantee" or "free shipping" messaging** on the site.

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
- [x] **Filter sidebar** (`components/storefront/filter-sidebar.tsx`):
      - 12 filter groups: Product Category, System Type (Ducted/Non-Ducted),
        Equipment Type, Mount Type, Cooling Capacity (BTU + tonnage),
        Heating Capacity (BTU only), Energy Star, Cold Climate, SEER2,
        Zones, Brand, Voltage
      - Info tooltips (i) on every group with plain-language explanations
      - Dynamic cascade logic (Ducted hides ductless options, etc.)
      - URL-based state via search params (shareable, bookmarkable)
      - Multi-select within groups (OR), AND across groups
      - Active filter pill tags with remove buttons
      - Collapsible groups, sticky sidebar
      - Filter schema: `lib/filters.ts`
- [x] **Spec normalizer** (`scripts/lib/spec-normalizer.mjs`):
      - Normalizes raw scraped specs into canonical filter fields
      - Integrated into sync-aciq.mjs, sync-lg.mjs, upload-portal-products.mjs
      - Backfill script: `scripts/backfill-filter-specs.mjs`
      - Rebackfill script: `scripts/rebackfill-terminology.mjs`
- [x] Product card component with HVAC Direct strikethrough pricing and
      savings badge. Shows: ~~HVAC Direct $X,XXX~~ / Our Price $X,XXX / You save X%
- [x] /help page (replaces Manus 404)
- [x] /rebates page (replaces Manus 404, includes IRA tax credit info)
- [x] Auth: login, signup, callback route
- [x] Middleware: refreshes Supabase session, gates /admin behind admin role
- [x] Admin layout + dashboard with real stats from DB
- [x] Supabase clients: browser, server (SSR), service-role, middleware
- [x] TypeScript types for the schema (still uses `as any` casts in a few
      places — see Tech Debt below)

### Sync (real implementations, not yet running on schedule)

- [x] Shared `sync-runner.mjs` with full reconciliation:
      tracks new/updated/unchanged/discontinued/failed; rehosts images to
      Supabase Storage; rehosts documents (manuals, spec sheets); logs
      price changes to `price_history` with delta %; posts notifications;
      **auto-recalculates system prices from component costs**;
      **collects audit action items for nightly email**
- [x] **Pricing model**: dealer cost × 1.30 = our selling price.
      HVAC Direct internet list price stored as `msrp` for strikethrough.
      System prices = sum of component dealer costs × 1.30.
      Nightly pricing report includes: SKU, Dealer Cost, Our Price,
      HVAC Direct Price, Savings, Margin %, Action Items
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
- [x] **LG scraper** (`scripts/sync-lg.mjs`):
      - Public pass: Playwright on lghvac.com product-type pages
      - Dealer-pricing pass: logs into us.lgsalesportal.com, navigates to
        Price List page, downloads Excel file, parses with xlsx library
      - No CAPTCHA on LG portal — standard Salesforce Community login
      - Model-specific image scraping from lghvac.com (replaces old
        type-based generic images from upload-lg-images.mjs)
      - `lib/lg-excel-parser.mjs`: auto-detects columns, filters to
        residential models, returns dealer_cost + list_price
      - `lib/lg-image-scraper.mjs`: visits product detail pages on
        lghvac.com to get actual product photos per model number
- [x] **ACiQ portal CAPTCHA solving** (2Captcha integration):
      - `lib/captcha-solver.mjs`: 2Captcha v2/v3 API wrapper
      - `lib/aciq-portal-playwright.mjs`: Playwright login fallback when
        reCAPTCHA is detected on portal.aciq.com login page
      - `aciq-portal.mjs`: auto-detects CAPTCHA, delegates to Playwright
        + 2Captcha when present (~$0.003/solve), falls through to fast
        fetch-based login when no CAPTCHA
- [x] **Email notifications** (Resend integration):
      - `lib/email-notify.mjs`: sends HTML pricing report email on sync
        completion or failure
      - Integrated into `sync-runner.mjs` — fires after DB notification
      - Includes: status, summary stats, pricing table (top 50 SKUs),
        **action items section** (no-pricing, negative savings, R-410A,
        stale pricing), error details on failure
      - Env: RESEND_API_KEY + NOTIFY_EMAIL_TO
- [x] **GitHub Actions workflows**:
      - `.github/workflows/sync-aciq.yml` — nightly 06:30 UTC, manual
        dispatch with dry_run/limit/category inputs, Playwright install,
        TWOCAPTCHA_API_KEY + RESEND_API_KEY env vars
      - `.github/workflows/sync-lg.yml` — nightly 07:00 UTC, Playwright
        Chromium, RESEND_API_KEY env var
      - **NOTE**: Workflow files need manual update via GitHub UI (the
        GitHub App lacks `workflows` permission)

## Not done — in priority order

### Required to launch a usable site

1. **Update workflow files via GitHub UI** — copy the updated YAML from
   the repo's local `.github/workflows/` (can't push via API due to
   `workflows` permission restriction)
2. **Set GitHub Actions secrets** (if not already done):
   - `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (required for any sync)
   - `ACIQ_PORTAL_USERNAME` / `ACIQ_PORTAL_PASSWORD`
   - `LG_PORTAL_USERNAME` / `LG_PORTAL_PASSWORD`
   - `TWOCAPTCHA_API_KEY` (~$0.003/night for ACIQ portal CAPTCHA)
   - `RESEND_API_KEY` (for email notifications)
   - `NOTIFY_EMAIL_TO` (e.g. nicholas.wood@heatpumpranch.com)
3. **Run first sync via workflow_dispatch** with `dry_run=true,
   limit=10` to verify, then full sync
4. **Run backfill-filter-specs.mjs** after first sync to enrich existing
   products with filter fields
5. **Storefront: hide products without pricing** — catalog query should
   join on product_pricing and only display products with total_price > 0.
   Products without pricing remain is_active=true but are hidden until
   pricing is added via the next portal sync.
6. **Storefront: hide MSRP strikethrough when our price > MSRP** — 90
   products have dealer×1.30 > HVAC Direct price. Per pricing rules,
   show our price only with no comparison.
7. **Get pricing for 8 missing LG products** — 7 concealed duct units
   (LD097HV4, LD127HV4, LD187HV4, LD187HHV4, LDN097HV4, LDN127HV4,
   LDN187HV4) + 1 water heater (R5TT20F-SA0). Need LG portal Excel.
8. **Product detail page** (`/product/[slug]`) — the catalog cards link
   to /product/${sku}, page not yet built
9. **System detail page** (`/system/[slug]`) — same
10. **Cart and checkout flows** (Stripe integration)
11. **Contractor application page** (form posts to contractor_accounts
    with status='pending')
12. **Real testimonials, real phone, real footer links** — replace the
    placeholders that are currently in the codebase

### Nice-to-have / second pass

- Facet counts on filter options (requires additional Supabase queries)
- Sort dropdown functionality (Price Low/High, Newest)
- Mobile responsive filter (slide-out drawer)
- AI Project Advisor chat
- Build My Project wizard (7 steps)
- Equipment Selector wizard (6 steps)
- Admin pages: Products list/edit, Systems edit, Categories, Pricing
  matrix, Sync trigger UI, Orders list, Contractors approve/suspend,
  CSV Import
- AHRI scraper actual selectors (skeleton at scripts/sync-ahri.mjs)
- Mega-menu w/ category thumbnails on hover (currently a flat
  horizontal nav)
- ACiQ portal pass for true wholesale pricing — NOW IMPLEMENTED with
  2Captcha (portal.aciq.com Magento login, augments retail data with
  Contractor/Wholesale tier prices)

### Decisions deferred

- Freight: request-a-quote at checkout (no real-time integration)
- AHRI: scraping carefully, not licensing the feed
- Brand color/logo: keeping current Manus visual identity

## Tech Debt

- `next.config.ts` has `typescript: { ignoreBuildErrors: true }` and
  `eslint: { ignoreDuringBuilds: true }` — needs to come off once types
  are regenerated and `as any` casts are removed
- `lib/supabase/types.ts` is a hand-written stub — should be regenerated
  from live schema via Supabase MCP `generate_typescript_types`
- `as any` casts in `app/(admin)/layout.tsx`, `lib/supabase/middleware.ts`,
  `app/(admin)/admin/page.tsx`, `app/(storefront)/catalog/page.tsx`

## Open questions

- Real phone number to replace 1-800-555-1234?
- Real customer-service email to replace `hello@heatpumpranchandsupplyco.com`?

## Files that need attention before launch

- `app/(storefront)/layout.tsx` — utility bar phone is fake
- `components/storefront/site-footer.tsx` — fake phone, fake email
- `components/storefront/utility-bar.tsx` — fake phone
- `app/(storefront)/help/page.tsx` — uses fake phone in body copy

When real contact info is available, search/replace `1-800-555-1234` and
`hello@heatpumpranchandsupplyco.com` across the repo.
