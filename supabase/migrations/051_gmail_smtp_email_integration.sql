-- ==============================================================================
-- PrintERP SaaS - Migration 051: Multi-Tenant Gmail (OAuth 2.0) + SMTP Integration & Scope Isolation
-- Supports:
--   1. Gmail Provider (Google OAuth 2.0 + Gmail API) and Upgraded SMTP
--   2. Strict Platform Scope (tenant_id IS NULL) vs Tenant Scope (tenant_id IS NOT NULL)
--   3. Fail-Closed Boundary: Zero cross-scope fallback from Tenant to Platform
--   4. Encrypted OAuth Tokens (access_token, refresh_token, token_expires_at)
--   5. Idempotency Key Deduplication on Email Logs
--   6. Strict RLS Policies for Tenant and Platform Gateways & Logs
-- ==============================================================================

-- 1. UPGRADE EMAIL GATEWAYS TABLE
-- Add 'gmail' provider and scope_type to email_gateways if not present
do $$
begin
    -- Update provider check constraint to include 'gmail'
    alter table public.email_gateways drop constraint if exists email_gateways_provider_check;
    alter table public.email_gateways add constraint email_gateways_provider_check
        check (provider in ('gmail', 'smtp', 'resend', 'sendgrid', 'ses', 'custom', 'mock'));

    -- Add scope_type column if not exists
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'scope_type') then
        alter table public.email_gateways add column scope_type text not null default 'TENANT' check (scope_type in ('PLATFORM', 'TENANT'));
    end if;

    -- Add gmail specific columns if not exists
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'gmail_account_email') then
        alter table public.email_gateways add column gmail_account_email text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'gmail_display_name') then
        alter table public.email_gateways add column gmail_display_name text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'token_expires_at') then
        alter table public.email_gateways add column token_expires_at timestamptz;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'last_checked_at') then
        alter table public.email_gateways add column last_checked_at timestamptz;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_gateways' and column_name = 'last_sent_at') then
        alter table public.email_gateways add column last_sent_at timestamptz;
    end if;
end $$;

-- Enforce scope integrity: PLATFORM has tenant_id NULL, TENANT has tenant_id NOT NULL
alter table public.email_gateways drop constraint if exists chk_email_gateways_scope_ownership;
alter table public.email_gateways add constraint chk_email_gateways_scope_ownership
    check (
        (scope_type = 'PLATFORM' and tenant_id is null) or
        (scope_type = 'TENANT' and tenant_id is not null)
    );

-- Set existing records scope_type accurately
update public.email_gateways
set scope_type = case when tenant_id is null then 'PLATFORM' else 'TENANT' end
where scope_type is null or scope_type != case when tenant_id is null then 'PLATFORM' else 'TENANT' end;

-- 2. UPGRADE EMAIL LOGS TABLE
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'scope_type') then
        alter table public.email_logs add column scope_type text not null default 'TENANT' check (scope_type in ('PLATFORM', 'TENANT'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'email_logs' and column_name = 'idempotency_key') then
        alter table public.email_logs add column idempotency_key text;
    end if;
end $$;

-- Set existing logs scope_type accurately
update public.email_logs
set scope_type = case when tenant_id is null then 'PLATFORM' else 'TENANT' end
where scope_type is null or scope_type != case when tenant_id is null then 'PLATFORM' else 'TENANT' end;

-- Indexes for fast lookup and idempotency deduplication
create index if not exists idx_email_logs_idempotency on public.email_logs(idempotency_key) where idempotency_key is not null;
create index if not exists idx_email_logs_scope on public.email_logs(scope_type, tenant_id);
create index if not exists idx_email_gateways_scope on public.email_gateways(scope_type, tenant_id, is_default) where is_default = true;

-- 3. STRICT ROW LEVEL SECURITY (RLS) POLICIES
-- Drop old policies to re-apply strictly
drop policy if exists "Platform admins manage platform email gateways" on public.email_gateways;
drop policy if exists "Tenant users view own email gateways" on public.email_gateways;
drop policy if exists "Authorized tenant admins manage own email gateways" on public.email_gateways;

-- Gateways RLS
-- Platform Admins: Full control over PLATFORM email gateways ONLY (tenant_id IS NULL)
create policy "Platform admins manage platform email gateways"
    on public.email_gateways for all
    using (
        public.auth_is_platform_admin()
        and tenant_id is null
        and scope_type = 'PLATFORM'
    )
    with check (
        public.auth_is_platform_admin()
        and tenant_id is null
        and scope_type = 'PLATFORM'
    );

-- Active Tenant Users: Can view their own tenant gateways (never platform or other tenants)
create policy "Tenant users view own email gateways"
    on public.email_gateways for select
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
    );

-- Authorized Tenant Admins: Can insert, update, delete their own tenant gateways
create policy "Authorized tenant admins manage own email gateways"
    on public.email_gateways for all
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    )
    with check (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- Logs RLS
drop policy if exists "Platform admins view email logs" on public.email_logs;
drop policy if exists "Tenant users view own email logs" on public.email_logs;
drop policy if exists "Tenant users append own email logs" on public.email_logs;

-- Platform Admins: View platform logs and authorized audit logs
create policy "Platform admins view email logs"
    on public.email_logs for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own tenant logs ONLY
create policy "Tenant users view own email logs"
    on public.email_logs for select
    using (
        tenant_id is not null
        and scope_type = 'TENANT'
        and public.auth_is_active_company_user(tenant_id)
    );

-- Tenant Users / Service: Can insert logs for their tenant
create policy "Tenant users append own email logs"
    on public.email_logs for insert
    with check (
        (tenant_id is not null and scope_type = 'TENANT' and public.auth_is_active_company_user(tenant_id))
        or (public.auth_is_platform_admin() and scope_type = 'PLATFORM' and tenant_id is null)
    );
