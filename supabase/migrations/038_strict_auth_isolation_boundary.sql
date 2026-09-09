-- ==============================================================================
-- InkFlow SaaS - Migration 038: Strict Platform vs Tenant Auth Isolation & RLS Boundary
-- Single Source of Truth & Fail-Closed Database Policies:
--   1. Platform Users -> platform_admins (is_active = true) -> Auth Context: Platform
--   2. Tenant Users -> company_users (status = 'active') + companies (is_active = true) -> Auth Context: Tenant
--   3. Cross-domain queries are rejected at PostgreSQL & RLS layer
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH EXPLICIT SEARCH_PATH
create or replace function public.auth_is_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and role = 'platform_owner'
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

-- 2. PLATFORM DATA TABLES RLS (Zero Access to Ordinary Tenant Accounts)
alter table if exists public.platform_admins enable row level security;
drop policy if exists "Platform admins full control on platform_admins" on public.platform_admins;
create policy "Platform admins full control on platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_active_sessions enable row level security;
drop policy if exists "Platform admins view active sessions" on public.platform_active_sessions;
create policy "Platform admins view active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_support_sessions enable row level security;
drop policy if exists "Platform admins manage support sessions" on public.platform_support_sessions;
create policy "Platform admins manage support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_admin());

-- 3. AUDIT LOG ISOLATION
alter table if exists public.audit_logs enable row level security;
drop policy if exists "Active tenant users can view tenant audit logs" on public.audit_logs;
create policy "Active tenant users can view tenant audit logs"
    on public.audit_logs for select
    using (public.auth_is_active_company_user(company_id));

alter table if exists public.platform_audit_logs enable row level security;
drop policy if exists "Platform admins view platform audit logs" on public.platform_audit_logs;
create policy "Platform admins view platform audit logs"
    on public.platform_audit_logs for all
    using (public.auth_is_platform_admin());
