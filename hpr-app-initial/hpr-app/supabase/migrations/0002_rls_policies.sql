-- =========================================================================
-- The Heat Pump Ranch & Supply Co. — Migration 0002 (idempotent)
-- Row-Level Security policies. Safe to re-run.
-- =========================================================================

-- =========================================================================
-- HELPER FUNCTIONS (create or replace = safe to re-run)
-- =========================================================================

create or replace function app_user_id()
returns bigint
language sql stable security definer set search_path = public
as $$ select id from users where auth_id = auth.uid() limit 1; $$;

create or replace function is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from users where auth_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function is_approved_contractor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from contractor_accounts ca
    join users u on u.id = ca.user_id
    where u.auth_id = auth.uid() and ca.status = 'approved'
  );
$$;

create or replace function current_user_tier_id()
returns bigint
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select ca.tier_id from contractor_accounts ca
     join users u on u.id = ca.user_id
     where u.auth_id = auth.uid() and ca.status = 'approved' limit 1),
    (select id from pricing_tiers where name = 'Retail' limit 1)
  );
$$;

-- =========================================================================
-- ENABLE RLS (safe to re-run)
-- =========================================================================
alter table users                    enable row level security;
alter table categories               enable row level security;
alter table products                 enable row level security;
alter table product_images           enable row level security;
alter table product_documents        enable row level security;
alter table system_packages          enable row level security;
alter table system_components        enable row level security;
alter table ahri_certifications      enable row level security;
alter table accessory_compatibility  enable row level security;
alter table pricing_tiers            enable row level security;
alter table product_pricing          enable row level security;
alter table price_history            enable row level security;
alter table contractor_accounts      enable row level security;
alter table quotes                   enable row level security;
alter table quote_line_items         enable row level security;
alter table orders                   enable row level security;
alter table order_line_items         enable row level security;
alter table carts                    enable row level security;
alter table cart_items               enable row level security;
alter table sync_runs                enable row level security;
alter table sync_run_items           enable row level security;
alter table notifications            enable row level security;

-- =========================================================================
-- USERS
-- =========================================================================
drop policy if exists users_self_select on users;
drop policy if exists users_self_update on users;
drop policy if exists users_admin_all   on users;

create policy users_self_select on users
  for select using (auth_id = auth.uid() or is_admin());

create policy users_self_update on users
  for update using (auth_id = auth.uid())
  with check (auth_id = auth.uid() and role = 'user');

create policy users_admin_all on users
  for all using (is_admin()) with check (is_admin());

-- =========================================================================
-- PUBLIC CATALOG
-- =========================================================================
drop policy if exists categories_public_read on categories;
drop policy if exists categories_admin_write on categories;
create policy categories_public_read on categories for select using (true);
create policy categories_admin_write on categories for all
  using (is_admin()) with check (is_admin());

drop policy if exists products_public_read on products;
drop policy if exists products_admin_write on products;
create policy products_public_read on products
  for select using (is_active or is_admin());
create policy products_admin_write on products for all
  using (is_admin()) with check (is_admin());

drop policy if exists product_images_public_read on product_images;
drop policy if exists product_images_admin_write on product_images;
create policy product_images_public_read on product_images for select using (true);
create policy product_images_admin_write on product_images for all
  using (is_admin()) with check (is_admin());

drop policy if exists product_documents_public_read on product_documents;
drop policy if exists product_documents_admin_write on product_documents;
create policy product_documents_public_read on product_documents for select using (true);
create policy product_documents_admin_write on product_documents for all
  using (is_admin()) with check (is_admin());

drop policy if exists system_packages_public_read on system_packages;
drop policy if exists system_packages_admin_write on system_packages;
create policy system_packages_public_read on system_packages
  for select using (is_active or is_admin());
create policy system_packages_admin_write on system_packages for all
  using (is_admin()) with check (is_admin());

drop policy if exists system_components_public_read on system_components;
drop policy if exists system_components_admin_write on system_components;
create policy system_components_public_read on system_components for select using (true);
create policy system_components_admin_write on system_components for all
  using (is_admin()) with check (is_admin());

drop policy if exists ahri_public_read on ahri_certifications;
drop policy if exists ahri_admin_write on ahri_certifications;
create policy ahri_public_read on ahri_certifications for select using (true);
create policy ahri_admin_write on ahri_certifications for all
  using (is_admin()) with check (is_admin());

drop policy if exists accessory_compat_public_read on accessory_compatibility;
drop policy if exists accessory_compat_admin_write on accessory_compatibility;
create policy accessory_compat_public_read on accessory_compatibility for select using (true);
create policy accessory_compat_admin_write on accessory_compatibility for all
  using (is_admin()) with check (is_admin());

drop policy if exists pricing_tiers_public_read on pricing_tiers;
drop policy if exists pricing_tiers_admin_write on pricing_tiers;
create policy pricing_tiers_public_read on pricing_tiers for select using (true);
create policy pricing_tiers_admin_write on pricing_tiers for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- PRODUCT_PRICING (tier-aware)
-- =========================================================================
drop policy if exists pricing_visible     on product_pricing;
drop policy if exists pricing_admin_write on product_pricing;
create policy pricing_visible on product_pricing
  for select using (
    is_admin()
    or tier_id = (select id from pricing_tiers where name = 'Retail' limit 1)
    or (is_approved_contractor() and tier_id = current_user_tier_id())
  );
create policy pricing_admin_write on product_pricing for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- PRICE HISTORY (admin-only)
-- =========================================================================
drop policy if exists price_history_admin on price_history;
create policy price_history_admin on price_history for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- CONTRACTORS
-- =========================================================================
drop policy if exists contractor_self_select on contractor_accounts;
drop policy if exists contractor_self_insert on contractor_accounts;
drop policy if exists contractor_self_update on contractor_accounts;
drop policy if exists contractor_admin_all   on contractor_accounts;

create policy contractor_self_select on contractor_accounts
  for select using (user_id = app_user_id() or is_admin());

create policy contractor_self_insert on contractor_accounts
  for insert with check (
    user_id = app_user_id()
    and status = 'pending'
    and tier_id is null
    and (credit_limit is null or credit_limit = 0)
  );

create policy contractor_self_update on contractor_accounts
  for update using (user_id = app_user_id())
  with check (
    user_id = app_user_id()
    and status = (select status from contractor_accounts ca2 where ca2.id = contractor_accounts.id)
    and tier_id is not distinct from (select tier_id from contractor_accounts ca2 where ca2.id = contractor_accounts.id)
    and credit_limit is not distinct from (select credit_limit from contractor_accounts ca2 where ca2.id = contractor_accounts.id)
  );

create policy contractor_admin_all on contractor_accounts for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- QUOTES
-- =========================================================================
drop policy if exists quotes_self_select on quotes;
drop policy if exists quotes_self_insert on quotes;
drop policy if exists quotes_self_update on quotes;
drop policy if exists quotes_admin_all   on quotes;

create policy quotes_self_select on quotes
  for select using (user_id = app_user_id() or is_admin());
create policy quotes_self_insert on quotes
  for insert with check (user_id = app_user_id());
create policy quotes_self_update on quotes
  for update using (user_id = app_user_id() and status in ('draft','sent'))
  with check (user_id = app_user_id());
create policy quotes_admin_all on quotes for all
  using (is_admin()) with check (is_admin());

drop policy if exists quote_lines_via_quote on quote_line_items;
drop policy if exists quote_lines_self_write on quote_line_items;
drop policy if exists quote_lines_admin     on quote_line_items;

create policy quote_lines_via_quote on quote_line_items
  for select using (
    is_admin() or exists (
      select 1 from quotes q
      where q.id = quote_line_items.quote_id and q.user_id = app_user_id()
    )
  );
create policy quote_lines_self_write on quote_line_items
  for all using (
    exists (select 1 from quotes q
            where q.id = quote_line_items.quote_id and q.user_id = app_user_id())
  ) with check (
    exists (select 1 from quotes q
            where q.id = quote_line_items.quote_id and q.user_id = app_user_id())
  );
create policy quote_lines_admin on quote_line_items for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- ORDERS
-- =========================================================================
drop policy if exists orders_self_select  on orders;
drop policy if exists orders_self_insert  on orders;
drop policy if exists orders_admin_update on orders;
drop policy if exists orders_admin_delete on orders;

create policy orders_self_select on orders
  for select using (user_id = app_user_id() or is_admin());
create policy orders_self_insert on orders
  for insert with check (user_id = app_user_id());
create policy orders_admin_update on orders for update
  using (is_admin()) with check (is_admin());
create policy orders_admin_delete on orders for delete
  using (is_admin());

drop policy if exists order_lines_via_order on order_line_items;
drop policy if exists order_lines_admin     on order_line_items;

create policy order_lines_via_order on order_line_items
  for select using (
    is_admin() or exists (
      select 1 from orders o
      where o.id = order_line_items.order_id and o.user_id = app_user_id()
    )
  );
create policy order_lines_admin on order_line_items for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- CARTS
-- =========================================================================
drop policy if exists carts_self        on carts;
drop policy if exists cart_items_via_cart on cart_items;

create policy carts_self on carts
  for all using (
    is_admin()
    or (user_id is not null and user_id = app_user_id())
    or (user_id is null)
  ) with check (
    is_admin()
    or (user_id is not null and user_id = app_user_id())
    or (user_id is null)
  );

create policy cart_items_via_cart on cart_items
  for all using (
    is_admin() or exists (
      select 1 from carts c
      where c.id = cart_items.cart_id
        and (c.user_id = app_user_id() or c.user_id is null)
    )
  ) with check (
    is_admin() or exists (
      select 1 from carts c
      where c.id = cart_items.cart_id
        and (c.user_id = app_user_id() or c.user_id is null)
    )
  );

-- =========================================================================
-- SYNC TABLES (admin-only)
-- =========================================================================
drop policy if exists sync_runs_admin       on sync_runs;
drop policy if exists sync_run_items_admin  on sync_run_items;

create policy sync_runs_admin on sync_runs for all
  using (is_admin()) with check (is_admin());
create policy sync_run_items_admin on sync_run_items for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- NOTIFICATIONS
-- =========================================================================
drop policy if exists notifications_self_select on notifications;
drop policy if exists notifications_self_update on notifications;
drop policy if exists notifications_admin       on notifications;

create policy notifications_self_select on notifications
  for select using (
    is_admin() or user_id = app_user_id() or user_id is null
  );
create policy notifications_self_update on notifications
  for update using (user_id = app_user_id())
  with check (user_id = app_user_id());
create policy notifications_admin on notifications for all
  using (is_admin()) with check (is_admin());

-- =========================================================================
-- AUTO-CREATE app users row when a new auth user signs up
-- =========================================================================
create or replace function handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into users (auth_id, email, name, role)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'name', null),
    'user'
  )
  on conflict (auth_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
