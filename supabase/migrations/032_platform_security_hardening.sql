-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 032: Platform Security & Root Control Plane Hardening
-- Single Source of Truth: Supabase Auth + PostgreSQL RLS + Explicit Platform RBAC
-- ==============================================================================

-- 1. Ensure all required columns exist on platform_admins
alter table public.platform_admins
    add column if not exists mfa_enabled boolean not null default false,
    add column if not exists last_login_at timestamptz,
    add column if not exists phone text,
    add column if not exists avatar_url text,
    add column if not exists preferences jsonb not null default '{"language": "en", "timezone": "Asia/Dhaka", "date_format": "YYYY-MM-DD", "currency": "BDT"}'::jsonb;

-- Ensure indexes on platform_admins
create index if not exists idx_platform_admins_user on public.platform_admins(user_id);
create index if not exists idx_platform_admins_email on public.platform_admins(email);
create index if not exists idx_platform_admins_active on public.platform_admins(is_active);

-- 2. Ensure platform_support_sessions table & constraints
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

-- 3. Ensure platform_active_sessions table
create table if not exists public.platform_active_sessions (
    id uuid primary key default gen_random_uuid(),
    platform_admin_id uuid not null references public.platform_admins(id) on delete cascade,
    session_token_hash text not null unique,
    ip_address text,
    user_agent text,
    device_name text,
    location text,
    is_revoked boolean not null default false,
    last_seen_at timestamptz not null default now(),
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sessions_admin on public.platform_active_sessions(platform_admin_id);
create index if not exists idx_platform_sessions_token on public.platform_active_sessions(session_token_hash);
create index if not exists idx_platform_sessions_revoked on public.platform_active_sessions(is_revoked);

alter table public.platform_active_sessions enable row level security;

-- 4. Fail-Closed Platform Security Definer Functions

-- Canonical check for Platform Owner
create or replace function public.auth_is_platform_owner()
returns boolean as $$
begin
    return exists (
        select 1
        from public.platform_admins
        where user_id = auth.uid()
          and is_active = true
    );
end;
$$ language plpgsql security definer;

-- Strict Server-Side Support Session Validator
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

-- 5. RLS Policies for Platform Tables (Tenant users are completely quarantined)
drop policy if exists "Platform owners have full control on support sessions" on public.platform_support_sessions;
create policy "Platform owners have full control on support sessions"
    on public.platform_support_sessions for all
    using (public.auth_is_platform_owner());

drop policy if exists "Platform owners have full control on active sessions" on public.platform_active_sessions;
create policy "Platform owners have full control on active sessions"
    on public.platform_active_sessions for all
    using (public.auth_is_platform_owner());

drop policy if exists "Platform owners can view and manage platform_admins" on public.platform_admins;
create policy "Platform owners can view and manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_owner());
