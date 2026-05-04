-- =========================================================================
-- The Heat Pump Ranch & Supply Co. — Migration: Named Projects
-- Adds a `projects` table so authenticated users (HVAC dealers,
-- multi-family property owners) can organize equipment into named
-- projects before checkout.
--
-- Design:
--   - Each project belongs to a user (user_id NOT NULL — accounts only)
--   - A project has a name (e.g., "Smith Residence", "123 Main St Unit 4")
--   - cart_items gains an optional project_id FK
--   - Guest carts continue to work as before (project_id = NULL)
--   - At checkout, items are grouped by project for the order
-- =========================================================================

-- =========================================================================
-- PROJECTS TABLE
-- =========================================================================
create table if not exists projects (
  id          bigserial primary key,
  user_id     bigint not null references users(id) on delete cascade,
  name        text not null,
  description text,
  status      text not null default 'active'
    check (status in ('active', 'archived', 'checked_out')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_projects_user on projects (user_id);
create index if not exists idx_projects_status on projects (user_id, status);

-- =========================================================================
-- ADD project_id TO cart_items
-- Nullable: guest carts and legacy items have no project assignment.
-- =========================================================================
alter table cart_items
  add column if not exists project_id bigint references projects(id) on delete set null;

create index if not exists idx_cart_items_project on cart_items (project_id);

-- =========================================================================
-- RLS POLICIES FOR PROJECTS
-- =========================================================================
alter table projects enable row level security;

drop policy if exists projects_self on projects;
create policy projects_self on projects
  for all using (
    is_admin()
    or user_id = app_user_id()
  ) with check (
    is_admin()
    or user_id = app_user_id()
  );

-- =========================================================================
-- UPDATE cart_items RLS to also allow access via project ownership
-- (The existing cart_items_via_cart policy still works for guest carts.
--  We add a second policy for project-based access.)
-- =========================================================================
drop policy if exists cart_items_via_project on cart_items;
create policy cart_items_via_project on cart_items
  for all using (
    is_admin() or exists (
      select 1 from projects p
      where p.id = cart_items.project_id
        and p.user_id = app_user_id()
    )
  ) with check (
    is_admin() or exists (
      select 1 from projects p
      where p.id = cart_items.project_id
        and p.user_id = app_user_id()
    )
  );
