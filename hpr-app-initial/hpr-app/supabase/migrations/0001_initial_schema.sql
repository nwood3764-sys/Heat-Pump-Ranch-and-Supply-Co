-- =========================================================================
-- The Heat Pump Ranch & Supply Co. — Supabase initial schema
-- Postgres translation of the Manus MySQL schema, with additions for:
--   - real reconciliation (vs. Manus's stub)
--   - price-change history
--   - sync run items (per-product audit trail)
-- Run this in the Supabase SQL editor.
-- =========================================================================

-- Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive emails/SKUs
create extension if not exists "pg_trgm";    -- fuzzy search on titles/models

-- =========================================================================
-- ENUMS
-- =========================================================================
create type user_role           as enum ('user', 'admin');
create type product_type        as enum ('equipment', 'accessory', 'part');
create type doc_type            as enum ('spec_sheet', 'installation_manual', 'warranty', 'brochure', 'other');
create type compatibility_rule  as enum ('required', 'recommended', 'optional');
create type pricing_entity      as enum ('product', 'system');
create type contractor_status   as enum ('pending', 'approved', 'suspended');
create type quote_status        as enum ('draft', 'sent', 'accepted', 'converted', 'expired');
create type order_status        as enum ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
create type payment_method      as enum ('stripe', 'net_terms', 'invoice');
create type payment_status      as enum ('pending', 'paid', 'partial', 'overdue', 'refunded');
create type sync_status         as enum ('running', 'completed', 'failed', 'partial');
create type sync_portal         as enum ('lg', 'aciq', 'ahri', 'hvacdirect', 'manual');
create type sync_item_action    as enum ('created', 'updated', 'unchanged', 'discontinued', 'failed');
create type notification_type   as enum (
  'sync_complete', 'sync_failed', 'new_products', 'price_change',
  'new_accessories', 'discontinued_products', 'order', 'quote', 'system'
);

-- =========================================================================
-- USERS
-- Supabase Auth manages auth.users; this is our app-side profile/role table.
-- Linked 1:1 to auth.users via auth_id.
-- =========================================================================
create table users (
  id            bigserial primary key,
  auth_id       uuid unique references auth.users(id) on delete cascade,
  name          text,
  email         citext unique,
  role          user_role not null default 'user',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  last_signed_in timestamptz not null default now()
);
create index idx_users_email on users (email);

-- =========================================================================
-- CATEGORIES
-- =========================================================================
create table categories (
  id          bigserial primary key,
  name        text not null,
  slug        text not null unique,
  parent_id   bigint references categories(id) on delete set null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_categories_parent on categories (parent_id);

-- =========================================================================
-- PRODUCTS
-- =========================================================================
create table products (
  id                bigserial primary key,
  sku               citext not null unique,
  brand             text not null,                 -- 'LG', 'ACiQ', etc.
  model_number      text,
  title             text not null,
  short_description text,
  description       text,
  category_id       bigint references categories(id) on delete set null,
  product_type      product_type not null default 'equipment',
  specs             jsonb,                          -- BTU, SEER2, HSPF2, voltage, refrigerant, etc.
  weight            numeric(10,2),
  width             numeric(10,2),
  height            numeric(10,2),
  depth             numeric(10,2),
  thumbnail_url     text,
  is_active         boolean not null default true,
  source_portal     sync_portal,
  source_id         text,                           -- distributor's internal product id
  source_url        text,                           -- canonical URL on the portal
  last_synced_at    timestamptz,
  discontinued_at   timestamptz,                    -- set when no longer found in portal
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index idx_products_brand          on products (brand);
create index idx_products_category       on products (category_id);
create index idx_products_active         on products (is_active);
create index idx_products_source         on products (source_portal, source_id);
create index idx_products_title_trgm     on products using gin (title gin_trgm_ops);
create index idx_products_model_trgm     on products using gin (model_number gin_trgm_ops);
create index idx_products_specs          on products using gin (specs);

-- =========================================================================
-- PRODUCT IMAGES
-- url = public Supabase Storage URL after rehosting
-- file_key = storage path inside the bucket (e.g. 'products/sku/main.jpg')
-- source_url = original portal URL (for re-download / audit)
-- =========================================================================
create table product_images (
  id          bigserial primary key,
  product_id  bigint not null references products(id) on delete cascade,
  url         text not null,
  file_key    text,
  source_url  text,
  alt_text    text,
  sort_order  int not null default 0,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index idx_product_images_product on product_images (product_id);

-- =========================================================================
-- PRODUCT DOCUMENTS (spec sheets, manuals, warranties)
-- =========================================================================
create table product_documents (
  id          bigserial primary key,
  product_id  bigint not null references products(id) on delete cascade,
  url         text not null,
  file_key    text,
  source_url  text,
  file_name   text not null,
  doc_type    doc_type not null default 'other',
  created_at  timestamptz not null default now()
);
create index idx_product_documents_product on product_documents (product_id);

-- =========================================================================
-- SYSTEM PACKAGES (bundled equipment with AHRI cert)
-- =========================================================================
create table system_packages (
  id            bigserial primary key,
  system_sku    citext not null unique,
  title         text not null,
  description   text,
  ahri_number   text,                               -- references ahri_certifications(ahri_number) by value (data may arrive separately)
  specs         jsonb,
  thumbnail_url text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index idx_system_packages_ahri on system_packages (ahri_number);

create table system_components (
  id          bigserial primary key,
  system_id   bigint not null references system_packages(id) on delete cascade,
  product_id  bigint not null references products(id) on delete restrict,
  quantity    int not null default 1,
  role        text                                  -- 'condenser', 'air_handler', 'furnace', 'coil'
);
create index idx_system_components_system  on system_components (system_id);
create index idx_system_components_product on system_components (product_id);

-- =========================================================================
-- AHRI CERTIFICATIONS
-- =========================================================================
create table ahri_certifications (
  id                    bigserial primary key,
  ahri_number           text not null unique,
  outdoor_model_number  text,
  indoor_model_number   text,
  furnace_model_number  text,
  seer2                 numeric(5,2),
  eer2                  numeric(5,2),
  hspf2                 numeric(5,2),
  cooling_capacity      int,
  heating_capacity      int,
  refrigerant_type      text,
  cert_data             jsonb,
  source_url            text,
  last_verified_at      timestamptz,
  created_at            timestamptz not null default now()
);
create index idx_ahri_outdoor on ahri_certifications (outdoor_model_number);
create index idx_ahri_indoor  on ahri_certifications (indoor_model_number);

-- =========================================================================
-- ACCESSORY COMPATIBILITY
-- =========================================================================
create table accessory_compatibility (
  id                     bigserial primary key,
  accessory_product_id   bigint not null references products(id) on delete cascade,
  compatible_product_id  bigint references products(id) on delete cascade,
  compatible_system_id   bigint references system_packages(id) on delete cascade,
  rule_type              compatibility_rule not null default 'recommended',
  notes                  text,
  created_at             timestamptz not null default now(),
  check (compatible_product_id is not null or compatible_system_id is not null)
);
create index idx_accessory_compat_acc on accessory_compatibility (accessory_product_id);
create index idx_accessory_compat_prod on accessory_compatibility (compatible_product_id);
create index idx_accessory_compat_sys on accessory_compatibility (compatible_system_id);

-- =========================================================================
-- PRICING TIERS (Retail / Contractor / Wholesale)
-- =========================================================================
create table pricing_tiers (
  id          bigserial primary key,
  name        text not null unique,                  -- 'Retail', 'Contractor', 'Wholesale'
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Per-tier price for either a product or a system package
create table product_pricing (
  id              bigserial primary key,
  entity_type     pricing_entity not null,
  entity_id       bigint not null,
  tier_id         bigint not null references pricing_tiers(id) on delete cascade,
  cost_equipment  numeric(12,2) not null default 0,
  cost_freight    numeric(12,2) not null default 0,
  cost_parts      numeric(12,2) not null default 0,
  cost_tax        numeric(12,2) not null default 0,
  total_price     numeric(12,2) not null default 0,
  msrp            numeric(12,2),
  updated_at      timestamptz not null default now(),
  unique (entity_type, entity_id, tier_id)
);
create index idx_pricing_lookup on product_pricing (entity_type, entity_id, tier_id);

-- Price-change history. Written by the reconciliation step of every sync.
-- Used for the admin "price changes" notification + audit reports.
create table price_history (
  id          bigserial primary key,
  entity_type pricing_entity not null,
  entity_id   bigint not null,
  tier_id     bigint not null references pricing_tiers(id) on delete cascade,
  old_price   numeric(12,2),
  new_price   numeric(12,2),
  delta_pct   numeric(6,2),                          -- positive = price went up
  source      sync_portal,
  sync_run_id bigint,                                -- FK added after sync_runs is created
  changed_at  timestamptz not null default now()
);
create index idx_price_history_entity on price_history (entity_type, entity_id, changed_at desc);

-- =========================================================================
-- CONTRACTORS (B2B)
-- =========================================================================
create table contractor_accounts (
  id               bigserial primary key,
  user_id          bigint not null references users(id) on delete cascade,
  company_name     text not null,
  contact_name     text,
  phone            text,
  address          text,
  city             text,
  state            text,
  zip              text,
  license_number   text,
  tier_id          bigint references pricing_tiers(id),
  credit_limit     numeric(12,2) default 0,
  current_balance  numeric(12,2) default 0,
  net_terms_days   int default 30,
  status           contractor_status not null default 'pending',
  approved_at      timestamptz,
  approved_by      bigint references users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index idx_contractor_user on contractor_accounts (user_id);
create index idx_contractor_status on contractor_accounts (status);

-- =========================================================================
-- QUOTES (B2B)
-- =========================================================================
create table quotes (
  id                    bigserial primary key,
  quote_number          text not null unique,
  user_id               bigint not null references users(id) on delete restrict,
  contractor_account_id bigint references contractor_accounts(id) on delete set null,
  status                quote_status not null default 'draft',
  subtotal              numeric(12,2) not null default 0,
  tax_amount            numeric(12,2) not null default 0,
  shipping_amount       numeric(12,2) not null default 0,
  total_amount          numeric(12,2) not null default 0,
  notes                 text,
  expires_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index idx_quotes_user on quotes (user_id);
create index idx_quotes_contractor on quotes (contractor_account_id);
create index idx_quotes_status on quotes (status);

create table quote_line_items (
  id          bigserial primary key,
  quote_id    bigint not null references quotes(id) on delete cascade,
  entity_type pricing_entity not null,
  entity_id   bigint not null,
  sku         text not null,
  title       text not null,
  quantity    int not null default 1,
  unit_price  numeric(12,2) not null,
  line_total  numeric(12,2) not null
);
create index idx_quote_lines_quote on quote_line_items (quote_id);

-- =========================================================================
-- ORDERS
-- =========================================================================
create table orders (
  id                       bigserial primary key,
  order_number             text not null unique,
  user_id                  bigint not null references users(id) on delete restrict,
  contractor_account_id    bigint references contractor_accounts(id) on delete set null,
  quote_id                 bigint references quotes(id) on delete set null,
  status                   order_status not null default 'pending',
  payment_method           payment_method not null,
  payment_status           payment_status not null default 'pending',
  stripe_payment_intent_id text,
  subtotal                 numeric(12,2) not null default 0,
  tax_amount               numeric(12,2) not null default 0,
  shipping_amount          numeric(12,2) not null default 0,
  total_amount             numeric(12,2) not null default 0,
  shipping_address         jsonb,
  billing_address          jsonb,
  tracking_number          text,
  freight_quote_requested  boolean not null default false,
  freight_quote_provided   numeric(12,2),
  notes                    text,
  due_date                 timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_orders_user on orders (user_id);
create index idx_orders_contractor on orders (contractor_account_id);
create index idx_orders_status on orders (status);
create index idx_orders_payment_status on orders (payment_status);

create table order_line_items (
  id          bigserial primary key,
  order_id    bigint not null references orders(id) on delete cascade,
  entity_type pricing_entity not null,
  entity_id   bigint not null,
  sku         text not null,
  title       text not null,
  quantity    int not null default 1,
  unit_price  numeric(12,2) not null,
  line_total  numeric(12,2) not null
);
create index idx_order_lines_order on order_line_items (order_id);

-- =========================================================================
-- CART
-- =========================================================================
create table carts (
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,
  session_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index idx_carts_user on carts (user_id);
create index idx_carts_session on carts (session_id);

create table cart_items (
  id          bigserial primary key,
  cart_id     bigint not null references carts(id) on delete cascade,
  entity_type pricing_entity not null,
  entity_id   bigint not null,
  quantity    int not null default 1,
  created_at  timestamptz not null default now()
);
create index idx_cart_items_cart on cart_items (cart_id);

-- =========================================================================
-- SYNC RUNS (renamed from sync_logs; structure expanded)
-- One row per nightly sync run.
-- =========================================================================
create table sync_runs (
  id                     bigserial primary key,
  portal                 sync_portal not null,
  status                 sync_status not null,
  triggered_by           text,                       -- 'cron', 'admin:<user_id>', 'manual'
  products_seen          int not null default 0,    -- total found in portal
  products_added         int not null default 0,
  products_updated       int not null default 0,
  products_unchanged     int not null default 0,
  products_discontinued  int not null default 0,
  products_failed        int not null default 0,
  price_changes          int not null default 0,
  images_rehosted        int not null default 0,
  documents_added        int not null default 0,
  error_message          text,
  details                jsonb,
  started_at             timestamptz not null default now(),
  completed_at           timestamptz
);
create index idx_sync_runs_portal_started on sync_runs (portal, started_at desc);
create index idx_sync_runs_status on sync_runs (status);

-- Per-item audit row for every product touched in a sync.
-- This is what makes "reconciliation" real instead of the Manus stub.
create table sync_run_items (
  id            bigserial primary key,
  sync_run_id   bigint not null references sync_runs(id) on delete cascade,
  source_id     text,                                -- portal's product id
  product_id    bigint references products(id) on delete set null,
  sku           text,
  action        sync_item_action not null,
  changes       jsonb,                               -- {"price": {"old": 1200, "new": 1100}, "title": {...}}
  error_message text,
  created_at    timestamptz not null default now()
);
create index idx_sync_run_items_run on sync_run_items (sync_run_id);
create index idx_sync_run_items_product on sync_run_items (product_id);
create index idx_sync_run_items_action on sync_run_items (sync_run_id, action);

-- Add the deferred FK from price_history → sync_runs
alter table price_history
  add constraint fk_price_history_sync_run
  foreign key (sync_run_id) references sync_runs(id) on delete set null;

-- =========================================================================
-- NOTIFICATIONS
-- =========================================================================
create table notifications (
  id          bigserial primary key,
  user_id     bigint references users(id) on delete cascade,    -- null = broadcast to all admins
  type        notification_type not null,
  title       text not null,
  message     text,
  is_read     boolean not null default false,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index idx_notifications_user_unread on notifications (user_id, is_read, created_at desc);

-- =========================================================================
-- updated_at TRIGGERS
-- Postgres doesn't have MySQL's "ON UPDATE CURRENT_TIMESTAMP".
-- =========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_users_updated         before update on users         for each row execute function set_updated_at();
create trigger trg_categories_updated    before update on categories    for each row execute function set_updated_at();
create trigger trg_products_updated      before update on products      for each row execute function set_updated_at();
create trigger trg_systems_updated       before update on system_packages for each row execute function set_updated_at();
create trigger trg_pricing_updated       before update on product_pricing for each row execute function set_updated_at();
create trigger trg_contractors_updated   before update on contractor_accounts for each row execute function set_updated_at();
create trigger trg_quotes_updated        before update on quotes        for each row execute function set_updated_at();
create trigger trg_orders_updated        before update on orders        for each row execute function set_updated_at();
create trigger trg_carts_updated         before update on carts         for each row execute function set_updated_at();

-- =========================================================================
-- SEED: pricing tiers
-- =========================================================================
insert into pricing_tiers (name, description, sort_order) values
  ('Retail',      'Standard retail pricing for B2C customers',     1),
  ('Contractor',  'Approved contractor pricing — 30% off retail',  2),
  ('Wholesale',   'High-volume wholesale pricing — 35% off retail',3)
on conflict (name) do nothing;
