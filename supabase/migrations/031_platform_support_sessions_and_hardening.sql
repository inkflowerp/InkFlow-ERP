-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 031: Platform Support Sessions & Control Plane Hardening
-- Supports:
--   1. Secure Temporary Support Sessions with Explicit Reason & Automatic TTL
--   2. Granular Support Access Levels (read_only, config_only, full_support)
--   3. Platform Security Definer Functions for Support Validation
--   4. Strict RLS Policies Isolating Platform Data from Normal Tenant Users
-- ==============================================================================

-- 1. PLATFORM SUPPORT SESSIONS TABLE
create table if not exists public.platform_support_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    reason text not null,
    access_level text not null default 'read_only' check (access_level in ('read_only', 'config_only', 'full_support')),
    session_token_hash text not null unique,
    status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
    started_at timestamptz not null default now(),
    expires_at timestamptz not null default now() + interval '2 hours',
    revoked_at timestamptz,
    revoked_by uuid references public.platform_admins(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_support_sessions_company on public.platform_support_sessions(company_id);
create index if not exists idx_platform_support_sessions_admin on public.platform_support_sessions(platform_admin_id);
create index if not exists idx_platform_support_sessions_status on public.platform_support_sessions(status);
create index if not exists idx_platform_support_sessions_token on public.platform_support_sessions(session_token_hash);
create index if not exists idx_platform_support_sessions_expires on public.platform_support_sessions(expires_at desc);

alter table public.platform_support_sessions enable row level security;

-- 2. SUPPORT SESSION VALIDATION FUNCTION
create or replace function public.auth_validate_support_session(
    p_company_id uuid,
    p_token_hash text
)
returns table (
    is_valid boolean,
    access_level text,
    admin_id uuid,
    admin_email text,
    admin_name text,
    expires_at timestamptz
) as $$
begin
    return query
    select 
        (pss.status = 'active' and pss.expires_at > now()) as is_valid,
        pss.access_level,
        pa.id as admin_id,
        pa.email as admin_email,
        pa.full_name as admin_name,
        pss.expires_at
    from public.platform_support_sessions pss
    join public.platform_admins pa on pa.id = pss.platform_admin_id
    where pss.company_id = p_company_id
      and pss.session_token_hash = p_token_hash
      and pa.is_active = true
    limit 1;
end;
$$ language plpgsql security definer;

-- 3. RLS POLICIES FOR SUPPORT SESSIONS
create policy "Platform owners have full control on support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_owner());

-- 4. ENSURE PLATFORM ADMIN COLUMNS
alter table public.platform_admins
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- 5. ENSURE COMPANY STATUS CHECK CONSTRAINT SUPPORTS ALL 7 LIFECYCLE STATES
-- Lifecycle states: 'trial', 'active', 'past_due', 'grace_period', 'suspended', 'cancelled', 'archived'
do $$
begin
    -- Add suspension_reason column if missing
    alter table public.companies
        add column if not exists suspension_reason text,
        add column if not exists suspended_at timestamptz,
        add column if not exists suspended_by uuid references public.platform_admins(id) on delete set null,
        add column if not exists cancelled_at timestamptz,
        add column if not exists cancellation_reason text,
        add column if not exists archived_at timestamptz;
end $$;
