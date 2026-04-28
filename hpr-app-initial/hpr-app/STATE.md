# Build State

Tracks where we are so any conversation can pick up cleanly. Update after
every meaningful change.

Last updated: 2026-04-28

## Done

### Database (Supabase project: HPR, Pro plan, US East)

- [x] 0001 — initial schema, 22 tables, all FKs, indexes, GIN indexes for
      fuzzy search on titles/models
- [x] 0002 — RLS policies. Public catalog readable; B2C sees Retail prices;
      approved contractors see their tier; admins see everything; sync tables
      admin-only; auto-create users row on auth signup
- [x] 0003 — security hardening (extensions out of public schema, EXECUTE
      revoked on helpers)
- [x] 0004 — `product-media` storage bucket + policies
- [x] 3 pricing tiers seeded (Retail / Contractor / Wholesale)
- [x] Admin user: nicholas.wood@heatpumpranch.com (id=1, role=admin)
- [x] Zero security advisor warnings

### Frontend (Next.js 15 codebase, not yet deployed)

- [x] App Router scaffold: storefront / auth / admin route groups
- [x] Tailwind v4, Plus Jakarta Sans, navy primary palette (carried over
      from Manus)
- [x] shadcn-style UI primitives: Button, Card, Badge, Input
- [x] Storefront layout: utility bar, header w/ search, category nav, footer
- [x] Homepage with category-grid hero, trust strip, brands, featured
      products, "Narrow Your Cooling/Heating" sections, contractor CTA
- [x] Catalog page with working filters including ?type=systems and
      ?type=accessories (the Manus no-ops)
- [x] Product card component with Was/Sale pricing and savings badge
- [x] /help page (replaces Manus 404)
- [x] /rebates page (replaces Manus 404, includes IRA tax credit info)
- [x] Auth: login, signup, callback route
- [x] Middleware: refreshes Supabase session, gates /admin behind admin role
- [x] Admin layout + dashboard with real stats from DB
- [x] Supabase clients: browser, server (SSR), service-role, middleware
- [x] TypeScript types for the schema

### Sync (GitHub Actions, not yet running)

- [x] Workflow files for LG (nightly), ACIQ (nightly), AHRI (weekly)
- [x] Shared `sync-runner.mjs` with full reconciliation:
      - tracks new/updated/unchanged/discontinued/failed
      - rehosts images to Supabase Storage
      - rehosts documents (manuals, spec sheets)
      - logs price changes to price_history with delta %
      - posts notifications on success/failure
- [x] Per-portal scraper skeletons (sync-lg.mjs, sync-aciq.mjs, sync-ahri.mjs)
      — login flows + product enumeration are TODOs awaiting first manual
      test against live portals

## Not done — in priority order

### Required to launch a usable site

1. **Push code to github.com/nwood3764-sys/Heat-Pump-Ranch-and-Supply-Co**
2. **Deploy to Netlify** with environment variables set
3. **Implement LG scraper logic** (live portal access required)
4. **Implement ACIQ scraper logic** (live portal access + dealer login)
5. **Run first sync** to populate the catalog
6. **Product detail page** (`/product/[slug]`) — currently links exist but
   page not yet built
7. **System detail page** (`/system/[slug]`) — same
8. **Cart and checkout flows** (Stripe integration)
9. **Contractor application page** (form posts to contractor_accounts with
   status='pending')
10. **Real testimonials, real phone, real footer links** — replace the
    placeholders that are currently in the codebase

### Nice-to-have / second pass

- AI Project Advisor chat
- Build My Project wizard (7 steps)
- Equipment Selector wizard (6 steps)
- Admin pages: Products list/edit, Systems edit, Categories, Pricing matrix,
  Sync trigger UI, Orders list, Contractors approve/suspend, CSV Import
- AHRI scraper actual selectors
- HVACDirect ACiQ MSRP scraper
- Mega-menu w/ category thumbnails on hover (currently a flat horizontal nav)
- Image search/replace in admin

### Decisions deferred

- Freight: request-a-quote at checkout (no real-time integration)
- AHRI: scraping carefully, not licensing the feed
- Brand color/logo: keeping current Manus visual identity

## Open questions

- Should we extract the Manus database (4,189 products) and import it as a
  seed, or wait for the LG/ACIQ syncs to repopulate fresh?
- Real phone number to replace 1-800-555-1234?
- Real customer-service email to replace `hello@heatpumpranchandsupplyco.com`?

## Files that need attention before launch

- `app/(storefront)/layout.tsx` → utility bar phone is fake
- `components/storefront/site-footer.tsx` → fake phone, fake email
- `components/storefront/utility-bar.tsx` → fake phone
- `app/(storefront)/help/page.tsx` → uses fake phone in body copy

When real contact info is available, search/replace `1-800-555-1234` and
`hello@heatpumpranchandsupplyco.com` across the repo.
