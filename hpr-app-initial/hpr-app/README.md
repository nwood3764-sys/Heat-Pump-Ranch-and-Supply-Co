# The Heat Pump Ranch & Supply Co.

E-commerce + PIM platform for residential and light-commercial HVAC equipment.
Two brands carried: LG and ACiQ. B2C customers and B2B contractor accounts.

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS v4 + shadcn/ui
- **Database & Auth**: Supabase (Postgres, RLS, Auth, Storage)
- **Hosting**: Netlify
- **Sync**: GitHub Actions running Playwright nightly
- **Payments**: Stripe (B2C) + Stripe Invoicing (B2B net terms) — _coming online_
- **Email**: Resend — _coming online_
- **Errors**: Sentry — _coming online_

## Local development

```bash
npm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY at minimum
npm run dev
```

Open <http://localhost:3000>.

## Project structure

```
app/
  (storefront)/        Public-facing pages (home, catalog, product, cart, checkout)
  (auth)/              Login, signup
  (admin)/             Admin dashboard (gated by middleware)
  api/                 API route handlers
components/
  ui/                  shadcn primitives (Button, Card, Input, Badge)
  storefront/          Header, footer, nav, product card, trust strip
  admin/               Admin-only components
lib/
  supabase/            Client (browser), server (SSR), middleware (cookie refresh), types
  utils.ts             cn(), formatPrice(), calculateSavings()
scripts/
  sync-runner.mjs      Shared logic: reconciliation, image rehosting, price diff
  sync-lg.mjs          LG portal scraper
  sync-aciq.mjs        ACIQ portal scraper
  sync-ahri.mjs        AHRI directory scraper
supabase/
  migrations/          SQL migrations (0001–0004 already applied to the live project)
.github/
  workflows/           Nightly cron jobs for the three syncs
```

## Database

The schema lives in `supabase/migrations/`. All tables have RLS enabled.
Pricing visibility is tier-aware:

- Anyone can see Retail prices
- Approved contractors can also see their assigned tier's prices
- Admins see everything

To make a user admin, run in the Supabase SQL editor:

```sql
update public.users set role = 'admin' where email = 'you@example.com';
```

## Environment variables

| Variable | Where it goes | Why |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Netlify + GitHub Secrets + `.env.local` | Frontend + sync scripts |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Netlify + `.env.local` | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Netlify + GitHub Secrets | Server-side admin ops, syncs |
| `LG_PORTAL_USERNAME` / `_PASSWORD` | GitHub Secrets only | Nightly LG sync |
| `ACIQ_PORTAL_USERNAME` / `_PASSWORD` | GitHub Secrets only | Nightly ACIQ sync |

Never commit `.env.local`. Never paste secrets into chat tools.

## Sync workflows

Nightly GitHub Actions:

- `sync-lg.yml` — 02:00 Central, every night
- `sync-aciq.yml` — 03:00 Central, every night
- `sync-ahri.yml` — 04:00 Central, Sundays

Each writes a row to `sync_runs`, per-product rows to `sync_run_items`,
and any price changes to `price_history`. Admin dashboard surfaces the results.

## Deployment

The `main` branch auto-deploys to Netlify on push.
