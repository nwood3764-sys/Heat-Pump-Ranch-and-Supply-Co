-- Migration 0003: security hardening
-- Move citext and pg_trgm out of public schema, pin search_path on
-- set_updated_at, revoke EXECUTE on helper functions from anon/authenticated.

create schema if not exists extensions;
alter extension citext  set schema extensions;
alter extension pg_trgm set schema extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;

create or replace function set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.app_user_id()             from anon, authenticated, public;
revoke execute on function public.is_admin()                from anon, authenticated, public;
revoke execute on function public.is_approved_contractor()  from anon, authenticated, public;
revoke execute on function public.current_user_tier_id()    from anon, authenticated, public;
revoke execute on function public.handle_new_auth_user()    from anon, authenticated, public;

grant execute on function public.app_user_id()             to postgres, service_role;
grant execute on function public.is_admin()                to postgres, service_role;
grant execute on function public.is_approved_contractor()  to postgres, service_role;
grant execute on function public.current_user_tier_id()    to postgres, service_role;
grant execute on function public.handle_new_auth_user()    to postgres, service_role;
