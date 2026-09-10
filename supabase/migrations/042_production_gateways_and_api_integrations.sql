-- ==============================================================================
-- PrintERP SaaS - Migration 042: Production Gateways, API Integrations & Webhooks
-- Supports:
--   1. Unified Gateway Integrations Table (Email, SMS, Payment, WhatsApp, Telegram)
--   2. Strict Platform Owner vs Tenant Isolation with RLS & Encrypted Credentials
--   3. Financial Payment Transaction Ledger (bKash, SSLCOMMERZ, Nagad, UddoktaPay, Stripe)
--   4. Universal Communication Logs (Email, SMS, WhatsApp, Telegram, In-App)
--   5. Webhook Events Ledger (Signature Verification & Replay Protection)
--   6. Gateway Security Audit Ledger (Non-secret audit trail)
-- ==============================================================================

-- 1. GATEWAY INTEGRATIONS TABLE
create table if not exists public.gateway_integrations (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform Global Gateways
    category text not null check (category in ('email', 'sms', 'payment', 'whatsapp', 'telegram')),
    provider text not null, -- 'smtp', 'resend', 'sendgrid', 'ses', 'greenweb', 'bulksmsbd', 'ssl_wireless', 'twilio', 'bkash', 'sslcommerz', 'nagad', 'uddoktapay', 'stripe', 'meta_whatsapp', 'telegram_bot'
    name text not null,
    is_enabled boolean not null default false,
    is_default boolean not null default false,
    environment text not null default 'sandbox' check (environment in ('sandbox', 'live')),
    encrypted_credentials text, -- AES-256-GCM encrypted JSON containing API keys, secrets, tokens, passwords
    public_config jsonb not null default '{}'::jsonb, -- Non-sensitive configuration (hosts, ports, senders, IDs, URLs)
    status text not null default 'not_configured' check (status in ('not_configured', 'configured', 'testing', 'connected', 'error', 'disabled')),
    last_tested_at timestamptz,
    last_test_status text,
    last_test_error text,
    last_test_latency_ms integer default 0,
    failure_count integer not null default 0,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique index to prevent duplicate provider configurations per scope (platform or tenant)
create unique index if not exists idx_gateway_integrations_platform_provider
    on public.gateway_integrations(provider)
    where tenant_id is null;

create unique index if not exists idx_gateway_integrations_tenant_provider
    on public.gateway_integrations(tenant_id, provider)
    where tenant_id is not null;

create index if not exists idx_gateway_integrations_tenant on public.gateway_integrations(tenant_id);
create index if not exists idx_gateway_integrations_category on public.gateway_integrations(category);
create index if not exists idx_gateway_integrations_status on public.gateway_integrations(status);
create index if not exists idx_gateway_integrations_enabled on public.gateway_integrations(is_enabled);
alter table public.gateway_integrations enable row level security;

-- 2. FINANCIAL PAYMENT TRANSACTIONS TABLE
create table if not exists public.gateway_transactions (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform SaaS billing
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    provider text not null,
    invoice_id text,
    customer_id text,
    subscription_id text,
    amount numeric(12,2) not null,
    currency text not null default 'BDT',
    internal_trx_id text not null unique,
    provider_trx_id text,
    payment_status text not null default 'initiated' check (payment_status in ('initiated', 'pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired')),
    idempotency_key text unique,
    payment_url text,
    callback_payload jsonb,
    webhook_payload jsonb,
    verification_payload jsonb,
    error_message text,
    initiated_at timestamptz not null default now(),
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_gateway_tx_tenant on public.gateway_transactions(tenant_id);
create index if not exists idx_gateway_tx_status on public.gateway_transactions(payment_status);
create index if not exists idx_gateway_tx_internal on public.gateway_transactions(internal_trx_id);
create index if not exists idx_gateway_tx_provider on public.gateway_transactions(provider_trx_id);
create index if not exists idx_gateway_tx_created on public.gateway_transactions(created_at desc);
alter table public.gateway_transactions enable row level security;

-- 3. WEBHOOK EVENTS LEDGER TABLE
create table if not exists public.gateway_webhooks (
    id uuid primary key default gen_random_uuid(),
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    provider text not null,
    event_type text not null,
    provider_event_id text,
    signature text,
    is_verified boolean not null default false,
    payload jsonb not null default '{}'::jsonb,
    status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
    error_message text,
    processed_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists idx_gateway_webhooks_provider on public.gateway_webhooks(provider);
create index if not exists idx_gateway_webhooks_status on public.gateway_webhooks(status);
create index if not exists idx_gateway_webhooks_created on public.gateway_webhooks(created_at desc);
alter table public.gateway_webhooks enable row level security;

-- 4. GATEWAY SECURITY AUDIT LOGS TABLE
create table if not exists public.gateway_audit_logs (
    id uuid primary key default gen_random_uuid(),
    tenant_id uuid references public.companies(id) on delete cascade, -- NULL for Platform owner actions
    gateway_id uuid references public.gateway_integrations(id) on delete set null,
    action text not null, -- 'created', 'updated', 'enabled', 'disabled', 'credentials_replaced', 'test_connection', 'test_message_sent', 'environment_switched', 'deleted'
    details jsonb not null default '{}'::jsonb, -- Sanitized context, NEVER secrets
    ip_address text,
    performed_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_gateway_audit_tenant on public.gateway_audit_logs(tenant_id);
create index if not exists idx_gateway_audit_created on public.gateway_audit_logs(created_at desc);
alter table public.gateway_audit_logs enable row level security;

-- 5. UPGRADE / EXPAND COMMUNICATION LOGS TABLE
-- (Check if exists from 023/039, or ensure all columns are present)
do $$
begin
    if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'communication_logs') then
        create table public.communication_logs (
            id uuid primary key default gen_random_uuid(),
            company_id uuid references public.companies(id) on delete cascade,
            gateway_id uuid references public.gateway_integrations(id) on delete set null,
            channel text not null check (channel in ('in_app', 'whatsapp', 'sms', 'email', 'telegram')),
            recipient_name text,
            recipient_destination text not null,
            provider_used text not null,
            message_content text not null,
            status text not null default 'sent' check (status in ('sent', 'delivered', 'failed', 'queued', 'cancelled')),
            provider_message_id text,
            error_message text,
            retry_count integer not null default 0,
            metadata jsonb default '{}'::jsonb,
            sent_by uuid references auth.users(id) on delete set null,
            sent_at timestamptz,
            delivered_at timestamptz,
            failed_at timestamptz,
            created_at timestamptz not null default now()
        );
    else
        -- Add any missing columns to existing communication_logs safely
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'gateway_id') then
            alter table public.communication_logs add column gateway_id uuid references public.gateway_integrations(id) on delete set null;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'provider_message_id') then
            alter table public.communication_logs add column provider_message_id text;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'retry_count') then
            alter table public.communication_logs add column retry_count integer not null default 0;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'metadata') then
            alter table public.communication_logs add column metadata jsonb default '{}'::jsonb;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'sent_by') then
            alter table public.communication_logs add column sent_by uuid references auth.users(id) on delete set null;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'sent_at') then
            alter table public.communication_logs add column sent_at timestamptz;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'delivered_at') then
            alter table public.communication_logs add column delivered_at timestamptz;
        end if;
        if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'communication_logs' and column_name = 'failed_at') then
            alter table public.communication_logs add column failed_at timestamptz;
        end if;
    end if;
end $$;

create index if not exists idx_comm_logs_channel on public.communication_logs(channel);
create index if not exists idx_comm_logs_status on public.communication_logs(status);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES

-- A. Gateway Integrations Policies
-- Platform Admins: Complete control over Platform Integrations (tenant_id is null)
create policy "Platform admins manage platform gateway integrations"
    on public.gateway_integrations for all
    using (public.auth_is_platform_admin() and tenant_id is null);

-- Tenant Users: Read only their own company gateway integrations
create policy "Tenant users view own gateway integrations"
    on public.gateway_integrations for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- Tenant Admins: Manage their own company gateway integrations
create policy "Authorized tenant admins manage own gateway integrations"
    on public.gateway_integrations for all
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and public.auth_user_has_permission(tenant_id, 'settings.edit')
    );

-- B. Gateway Transactions Policies
-- Platform Admins: View all transactions
create policy "Platform admins view all gateway transactions"
    on public.gateway_transactions for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own company transactions
create policy "Tenant users view own gateway transactions"
    on public.gateway_transactions for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );

-- System / Platform Service: Insert and Update transactions
create policy "Service and admins insert gateway transactions"
    on public.gateway_transactions for insert
    with check (
        public.auth_is_platform_admin()
        or (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
    );

create policy "Service and admins update gateway transactions"
    on public.gateway_transactions for update
    using (
        public.auth_is_platform_admin()
        or (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
    );

-- C. Gateway Webhooks Policies
-- Platform Admins: View webhook logs
create policy "Platform admins view gateway webhooks"
    on public.gateway_webhooks for select
    using (public.auth_is_platform_admin());

-- D. Gateway Audit Logs Policies
-- Platform Admins: View all audit logs
create policy "Platform admins view all gateway audit logs"
    on public.gateway_audit_logs for select
    using (public.auth_is_platform_admin());

-- Tenant Users: View their own company audit logs
create policy "Tenant users view own gateway audit logs"
    on public.gateway_audit_logs for select
    using (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
    );
