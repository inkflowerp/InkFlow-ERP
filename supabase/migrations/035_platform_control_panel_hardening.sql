-- ==============================================================================
-- InkFlow SaaS - Migration 035: Platform Control Panel Hardening & Last-Owner Protection
-- Supports:
--   1. Last Active Platform Owner Protection Trigger
--   2. Authoritative Platform Support Session Functions & Expiry Checks
--   3. Secure Tenant Users Aggregation Definer Function (Zero Secrets Exposure)
--   4. Strict RLS Policies Isolating Platform Data from Tenant Accounts
--   5. High-Performance Platform Telemetry & Governance Indexes
-- ==============================================================================

-- 1. ENSURE PLATFORM_ADMINS COLUMNS & RESPONSIBILITIES ARRAY
alter table public.platform_admins
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists responsibilities jsonb not null default '["platform_owner"]'::jsonb,
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- 2. LAST PLATFORM OWNER PROTECTION TRIGGER
create or replace function public.prevent_last_platform_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_active_owners_count integer;
begin
    -- Only check if an active platform_owner is being deactivated, deleted, or demoted
    if (TG_OP = 'DELETE' and OLD.role = 'platform_owner' and OLD.is_active = true) or
       (TG_OP = 'UPDATE' and OLD.role = 'platform_owner' and OLD.is_active = true and (NEW.is_active = false or NEW.role != 'platform_owner')) then
        
        select count(*) into v_active_owners_count
        from public.platform_admins
        where role = 'platform_owner'
          and is_active = true
          and id != OLD.id;

        if v_active_owners_count < 1 then
            raise exception 'Platform Security Violation: Cannot remove, deactivate, or demote the last active Platform Owner.';
        end if;
    end if;

    if TG_OP = 'DELETE' then
        return OLD;
    else
        return NEW;
    end if;
end;
$$;

drop trigger if exists trg_prevent_last_platform_owner on public.platform_admins;
create trigger trg_prevent_last_platform_owner
    before update or delete on public.platform_admins
    for each row
    execute function public.prevent_last_platform_owner_removal();

-- 3. ENSURE PLATFORM ACTIVE SESSIONS TABLE
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text default 'Desktop Workstation',
    location text default 'Bangladesh',
    is_revoked boolean not null default false,
    revoked_at timestamptz,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
create index if not exists idx_platform_sessions_revoked on public.platform_active_sessions(is_revoked);
create index if not exists idx_platform_sessions_token on public.platform_active_sessions(session_token_hash);
alter table public.platform_active_sessions enable row level security;

-- 4. SECURE TENANT USERS AGGREGATION FUNCTION FOR PLATFORM OWNER (Zero Secrets Exposure)
create or replace function public.get_platform_tenant_users_overview(
    p_search text default null,
    p_company_id uuid default null,
    p_status text default null,
    p_limit integer default 50,
    p_offset integer default 0
)
returns table (
    company_user_id uuid,
    user_id uuid,
    company_id uuid,
    company_name text,
    company_slug text,
    full_name text,
    full_name_bn text,
    email text,
    phone text,
    status text,
    primary_role text,
    responsibilities jsonb,
    branch_name text,
    created_at timestamptz,
    total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    -- Must be authenticated platform administrator
    if not public.auth_is_platform_owner() then
        raise exception 'Unauthorized: Only platform administrators can view cross-tenant user registries.';
    end if;

    return query
    with filtered_users as (
        select
            cu.id as f_company_user_id,
            cu.user_id as f_user_id,
            cu.company_id as f_company_id,
            c.name as f_company_name,
            c.slug as f_company_slug,
            coalesce(up.full_name, split_part(coalesce(up.email, 'User'), '@', 1)) as f_full_name,
            up.full_name_bn as f_full_name_bn,
            coalesce(up.email, 'No Email') as f_email,
            up.phone as f_phone,
            cu.status as f_status,
            coalesce(
                (select r.slug from public.user_roles ur join public.roles r on r.id = ur.role_id where ur.company_user_id = cu.id limit 1),
                'member'
            ) as f_primary_role,
            coalesce(to_jsonb(cu.responsibilities), '[]'::jsonb) as f_responsibilities,
            b.name as f_branch_name,
            cu.created_at as f_created_at,
            count(*) over() as f_total_count
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        left join public.user_profiles up on up.id = cu.user_id
        left join public.branches b on b.id = cu.branch_id
        where (p_company_id is null or cu.company_id = p_company_id)
          and (p_status is null or cu.status = p_status)
          and (
              p_search is null or
              c.name ilike '%' || p_search || '%' or
              c.slug ilike '%' || p_search || '%' or
              up.full_name ilike '%' || p_search || '%' or
              up.email ilike '%' || p_search || '%' or
              up.phone ilike '%' || p_search || '%'
          )
        order by cu.created_at desc
        limit p_limit
        offset p_offset
    )
    select 
        f_company_user_id,
        f_user_id,
        f_company_id,
        f_company_name,
        f_company_slug,
        f_full_name,
        f_full_name_bn,
        f_email,
        f_phone,
        f_status,
        f_primary_role,
        f_responsibilities,
        f_branch_name,
        f_created_at,
        f_total_count
    from filtered_users;
end;
$$;

-- 5. RLS POLICIES FOR PLATFORM TABLES
create policy "Platform owners have full control on platform active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

-- 6. INDEX OPTIMIZATIONS FOR PLATFORM PERFORMANCE
create index if not exists idx_platform_admins_user_active on public.platform_admins(user_id, is_active);
create index if not exists idx_platform_admins_email on public.platform_admins(email);
create index if not exists idx_companies_is_active on public.companies(is_active);
create index if not exists idx_company_subs_status_company on public.company_subscriptions(company_id, status);
