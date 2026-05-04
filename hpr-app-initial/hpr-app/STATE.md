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
      sum all component dealer costs × 1.20 = system retail price.
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
      2. Below 20% markup (dealer cost × 1.20 minimum)
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

- **Individual equipment**: dealer cost from portal Excel × 1.20
- **System combos**: sum of component dealer costs × 1.20
- **MSRP/strikethrough**: HVAC Direct internet list price. Only shown
  when our price < MSRP. When our price >= MSRP, show our price only
  with no strikethrough.
- **Floor price**: dealer cost × 1.20 (minimum 20% markup over cost)
- **No-price products**: remain is_active=true but hidden from storefront
  via product_pricing join. Flagged as action items in nightly report.
- **R-410A**: completely excluded. Never imported, never displayed.
- **No "low price guarantee" or "free shipping" messaging** on the site.
- **No promotional comparison pricing** on the site — no SAVE badges,
  no List Price strikethrough, no "You save X%", no "contractor-direct"
  language. Price is shown cleanly without comparison framing.

### Frontend (Next.js 15, deployed on Netlify)

- [x] Live at https://heat-pump-ranch-and-supply-co.netlify.app
- [x] App Router scaffold: storefront / auth / admin route groups
- [x] Tailwind v4, Plus Jakarta Sans, navy primary palette
- [x] shadcn-style UI primitives: Button, Card, Badge, Input
- [x] Storefront layout: utility bar, header w/ search, category nav, footer
- [x] Homepage with category-grid hero, trust strip, brands, featured
      products, contractor CTA
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
- [x] Product card component — clean pricing display (price only, no
      strikethrough or savings badges)
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
- [x] **Pricing model** (corrected 2026-05-03):
      - Our selling price = dealer cost × 1.20 (ALWAYS, no MAX formula)
      - HVAC Direct internet list price stored as `msrp` for strikethrough
      - Strikethrough shown ONLY when msrp > our price
      - System prices = sum of component dealer costs × 1.20
      - Previous bug: `computeRetailPrice` used MAX(dealer×1.30, hvacDirect)
        which inflated 98 product prices. Fixed in DB + sync-runner.
      - Nightly pricing report includes: SKU, Dealer Cost, Our Price,
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
- [x] **Portal session persistence** (2026-05-04):
      - `lib/session-store.mjs`: saves/loads/validates portal session
        cookies to `.aciq-session.json` (gitignored)
      - `refresh-aciq-session.mjs`: standalone script for manual session
        refresh, supports `--import-cookie`, `--force`, `--validate-only`
      - `sync-aciq.mjs`: tries cached session first → validates against
        portal → falls through to fresh 2Captcha login if expired
      - GitHub Actions cache: `.aciq-session.json` persisted across runs
        via `actions/cache` so valid sessions survive between nightly syncs
      - New workflow: `refresh-aciq-session.yml` for manual session refresh
        via workflow_dispatch (paste PHPSESSID or trigger automated login)
- [x] **Portal fail-red behavior** (2026-05-04):
      - `sync-aciq.mjs`: portal failures now throw instead of silently
        falling back to public-only pricing (which produced wrong prices)
      - Zero-product guard: if portal returns 0 products, sync aborts
      - GitHub Actions job goes red on portal auth failure
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
        dispatch with dry_run/limit/category/force_login inputs,
        Playwright install, session cache restore/save,
        TWOCAPTCHA_API_KEY + RESEND_API_KEY env vars
      - `.github/workflows/sync-lg.yml` — nightly 07:00 UTC, Playwright
        Chromium, RESEND_API_KEY env var
      - `.github/workflows/refresh-aciq-session.yml` — manual dispatch
        for session refresh (automated or manual cookie import)
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
   - `STRIPE_SECRET_KEY` (Stripe secret key for server-side API)
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (Stripe publishable key for client)
   - `STRIPE_WEBHOOK_SECRET` (Stripe webhook signing secret)
3. **Run first sync via workflow_dispatch** with `dry_run=true,
   limit=10` to verify, then full sync
4. **Run backfill-filter-specs.mjs** after first sync to enrich existing
   products with filter fields
5. ~~**Storefront: hide products without pricing**~~ ✅ DONE (2026-05-03)
   — `lib/pricing.ts` exports `getUnpricedProductIds()` and
   `getUnpricedSystemIds()`. Catalog + homepage queries now exclude
   products/systems without a Retail pricing row with total_price > 0.
   Currently hides 8 LG products (IDs 1281-1287, 1295).
6. ~~**Storefront: hide MSRP strikethrough when our price > MSRP**~~ ✅
   DONE — was already correctly implemented: `calculateSavings()` in
   `lib/utils.ts` returns null when msrp ≤ price, and both product-card
   and product detail page only render strikethrough when savings is
   truthy. 195 products correctly show no strikethrough.
7. **Get pricing for 8 missing LG products** — 7 concealed duct units
   (LD097HV4, LD127HV4, LD187HV4, LD187HHV4, LDN097HV4, LDN127HV4,
   LDN187HV4) + 1 water heater (R5TT20F-SA0). Need LG portal Excel.
8. ~~**Product detail page** (`/product/[sku]`)~~ ✅ DONE (prior session)
   — full detail page at `app/(storefront)/product/[sku]/page.tsx`
9. ~~**System detail page** (`/system/[sku]`)~~ ✅ DONE (2026-05-03)
   — `app/(storefront)/system/[sku]/page.tsx` with component list,
   pricing, specs tabs. Also fixed catalog system href encoding.
10. ~~**Fix catalog filter: systems in Individual Equipment**~~ ✅ DONE (2026-05-03)
    — Added `resolveSpecsProductCategory()` to catalog query. When
    'Individual Equipment' is selected, only products with
    `specs.product_category = 'individual-equipment'` appear.
11. ~~**Fix system SKU logic**~~ ✅ DONE (2026-05-03)
    — DB updated: 190 products + 150 system_packages now use proper
    format: `LG-KUMXA421A-3-KNUAB091A` or `ACIQ-ES-27Z-M4C`.
    Manufacturer prefix + all component models concatenated.
12. ~~**Remove Request Quote buttons**~~ ✅ DONE (2026-05-03)
    — Removed from product detail + system detail pages. No quotes
    anywhere on the site.
13. ~~**Fix pricing formula (MAX bug)**~~ ✅ DONE (2026-05-03)
    — `computeRetailPrice` in sync-runner.mjs now returns dealer×1.20
    (removed MAX formula). Recalculated 98 inflated prices in DB.
14. ~~**Cart and checkout flows**~~ ✅ DONE (2026-05-03)
    — Full "Add to My Project" cart system with Stripe integration.
    Components: CartProvider context, CartDrawer flyout, CartBadge header
    icon, AddToProjectButton (wired into product detail, system detail,
    and product cards). Pages: /project (full cart view), /checkout
    (payment method selection with ACH vs CC surcharge), /checkout/success.
    API routes: /api/cart (GET/POST/PATCH/DELETE), /api/checkout (creates
    Stripe Checkout Session), /api/webhooks/stripe (payment confirmation).
    Credit card surcharge: 2.9% + $0.30 added as line item when CC
    selected. ACH: no surcharge. Guest carts via session cookie; auth
    users via user_id. Stripe webhook handles checkout.session.completed,
    async_payment_succeeded (ACH), async_payment_failed.
15. **Contractor application page** (form posts to contractor_accounts
    with status='pending')
16. **Real testimonials, real phone, real footer links** — replace the
    placeholders that are currently in the codebase

### Branding Cleanup (2026-05-03)

- [x] **Removed all promotional pricing language** from storefront:
      - Utility bar: "Contractor-direct HVAC equipment pricing" → "HVAC Equipment & Supplies"
      - Homepage subtitle: "at contractor-direct pricing" → "system packages, and supplies"
      - Product card: removed SAVE badge, List Price strikethrough, "You save X%"
      - Product detail page: removed SAVE badge, List Price strikethrough, "Contractor pricing available"
      - System detail page: removed SAVE badge, List Price strikethrough, "Contractor pricing available"
      - Root layout SEO description: removed "contractor pricing" mention
      - Cleaned up unused imports (Badge, calculateSavings, Card/CardContent)
- [ ] **Cowboy-themed Heat Pump Ranch & Supply Co. branding** — pending brand assets from owner

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

- Freight: request-a-quote at checkout or flat-rate shipping (no real-time integration yet)
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
