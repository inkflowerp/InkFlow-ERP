-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 045: Platform SaaS Subscription & Billing
-- Authoritative Platform Plans, Platform Subscriptions, Lifecycle Events,
-- Webhook Logs, and Strict Platform/Tenant Isolation Policies.
-- ==============================================================================

-- 1. PLATFORM SAAS PLANS TABLE
create table if not exists public.platform_saas_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    slug text unique not null,
    description text,
    monthly_price numeric(12,2) not null,
    yearly_price numeric(12,2) not null,
    currency text not null default 'BDT',
    trial_days integer not null default 14,
    features jsonb not null default '[]'::jsonb,
    limits jsonb not null default '{}'::jsonb,
    is_active boolean not null default true,
    is_public boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_saas_plans_slug on public.platform_saas_plans(slug);
create index if not exists idx_platform_saas_plans_active on public.platform_saas_plans(is_active, sort_order);

-- 2. PLATFORM SUBSCRIPTIONS TABLE
create table if not exists public.platform_subscriptions (
    id uuid primary key default gen_random_uuid(),
    platform_account_id text not null default 'platform_root',
    plan_id uuid references public.platform_saas_plans(id) on delete restrict,
    status text not null default 'TRIALING' check (status in ('TRIALING', 'PENDING_PAYMENT', 'ACTIVE', 'PAST_DUE', 'GRACE_PERIOD', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
    billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'yearly')),
    started_at timestamptz not null default now(),
    current_period_start timestamptz not null default now(),
    current_period_end timestamptz not null,
    trial_start timestamptz not null default now(),
    trial_end timestamptz,
    grace_period_end timestamptz,
    cancelled_at timestamptz,
    cancel_at_period_end boolean not null default false,
    previous_plan_id uuid references public.platform_saas_plans(id) on delete set null,
    next_plan_id uuid references public.platform_saas_plans(id) on delete set null,
    change_effective_at timestamptz,
    provider text,
    provider_customer_id text,
    provider_subscription_id text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_platform_sub_account on public.platform_subscriptions(platform_account_id);
create index if not exists idx_platform_sub_status on public.platform_subscriptions(status);
create index if not exists idx_platform_sub_lifecycle on public.platform_subscriptions(status, current_period_end, trial_end, grace_period_end);

-- 3. PLATFORM SUBSCRIPTION EVENTS TABLE
create table if not exists public.platform_subscription_events (
    id uuid primary key default gen_random_uuid(),
    subscription_id uuid references public.platform_subscriptions(id) on delete cascade,
    platform_account_id text not null,
    event_type text not null,
    previous_plan_id uuid,
    new_plan_id uuid,
    previous_status text,
    new_status text,
    reason text,
    transaction_id text,
    performed_by text,
    effective_date timestamptz,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_sub_events_sub on public.platform_subscription_events(subscription_id);
create index if not exists idx_platform_sub_events_type on public.platform_subscription_events(event_type);
create index if not exists idx_platform_sub_events_created on public.platform_subscription_events(created_at desc);

-- 4. PLATFORM WEBHOOK EVENTS TABLE
create table if not exists public.platform_webhook_events (
    id uuid primary key default gen_random_uuid(),
    provider text not null,
    event_id text,
    event_type text not null,
    transaction_id text,
    billing_context text not null default 'PLATFORM',
    verification_status text not null default 'UNVERIFIED',
    processed boolean not null default false,
    processed_at timestamptz,
    failure_reason text,
    payload jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists idx_platform_webhook_events_provider_event on public.platform_webhook_events(provider, event_id);
create index if not exists idx_platform_webhook_events_trx on public.platform_webhook_events(transaction_id);

-- 5. EXTEND GATEWAY_TRANSACTIONS WITH BILLING CONTEXT IF NOT ALREADY PRESENT
do $$
begin
    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'billing_context') then
        alter table public.gateway_transactions add column billing_context text not null default 'TENANT' check (billing_context in ('PLATFORM', 'TENANT'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'platform_account_id') then
        alter table public.gateway_transactions add column platform_account_id text;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'verification_status') then
        alter table public.gateway_transactions add column verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED', 'VERIFIED', 'REJECTED'));
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'plan_id') then
        alter table public.gateway_transactions add column plan_id uuid;
    end if;

    if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'gateway_transactions' and column_name = 'transaction_type') then
        alter table public.gateway_transactions add column transaction_type text default 'SUBSCRIPTION_PURCHASE';
    end if;
end;
$$;

create index if not exists idx_gateway_tx_billing_context on public.gateway_transactions(billing_context, platform_account_id);

-- 6. SEED STANDARD SAAS PLATFORM PLANS
insert into public.platform_saas_plans (id, name, slug, description, monthly_price, yearly_price, currency, trial_days, features, limits, is_active, is_public, sort_order)
values
(
    '11111111-1111-1111-1111-111111111001',
    'SaaS Starter Cluster',
    'saas_starter',
    'Essential cloud ERP platform infrastructure for launching localized SaaS operations.',
    14999.00,
    149990.00,
    'BDT',
    14,
    '["multi_tenant", "basic_analytics", "automated_backups", "email_gateway", "sms_gateway"]'::jsonb,
    '{"max_tenants": 25, "max_total_users": 150, "storage_gb": 50, "monthly_api_calls": 250000}'::jsonb,
    true,
    true,
    1
),
(
    '11111111-1111-1111-1111-111111111002',
    'SaaS Growth Pro',
    'saas_growth',
    'High-throughput infrastructure with multi-gateway payments, WhatsApp & Telegram bots, and automated scaling.',
    34999.00,
    349990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger"]'::jsonb,
    '{"max_tenants": 100, "max_total_users": 750, "storage_gb": 250, "monthly_api_calls": 1000000}'::jsonb,
    true,
    true,
    2
),
(
    '11111111-1111-1111-1111-111111111003',
    'SaaS Enterprise Scale',
    'saas_enterprise',
    'Full enterprise SaaS cluster with white-labeling, dedicated compute nodes, 99.9% uptime SLA, and custom domain routing.',
    79999.00,
    799990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger", "white_label", "priority_sla_99_9", "dedicated_compute", "custom_billing_rules"]'::jsonb,
    '{"max_tenants": 500, "max_total_users": 3500, "storage_gb": 1000, "monthly_api_calls": 5000000}'::jsonb,
    true,
    true,
    3
),
(
    '11111111-1111-1111-1111-111111111004',
    'Dedicated Cloud Sovereign',
    'saas_sovereign',
    'Single-tenant isolated cloud cluster, custom database encryption, on-premise sync, and 24/7 VIP engineer escalation.',
    149999.00,
    1499990.00,
    'BDT',
    14,
    '["multi_tenant", "advanced_analytics", "automated_backups", "email_gateway", "sms_gateway", "whatsapp_gateway", "telegram_bot", "custom_domains", "api_gateway", "audit_ledger", "white_label", "priority_sla_99_9", "dedicated_compute", "custom_billing_rules", "dedicated_database", "source_escrow", "vip_support_24_7"]'::jsonb,
    '{"max_tenants": 2000, "max_total_users": 20000, "storage_gb": 5000, "monthly_api_calls": 25000000}'::jsonb,
    true,
    true,
    4
)
on conflict (slug) do update set
    name = excluded.name,
    description = excluded.description,
    monthly_price = excluded.monthly_price,
    yearly_price = excluded.yearly_price,
    features = excluded.features,
    limits = excluded.limits,
    is_active = excluded.is_active,
    updated_at = now();

-- 7. SEED INITIAL PLATFORM SUBSCRIPTION (TRIAL / INITIAL ACTIVE CLUSTER)
insert into public.platform_subscriptions (
    id,
    platform_account_id,
    plan_id,
    status,
    billing_cycle,
    started_at,
    current_period_start,
    current_period_end,
    trial_start,
    trial_end,
    metadata
)
values (
    '00000000-0000-0000-0000-000000000001',
    'platform_root',
    '11111111-1111-1111-1111-111111111002', -- SaaS Growth Pro
    'ACTIVE',
    'yearly',
    now() - interval '30 days',
    now() - interval '30 days',
    now() + interval '335 days',
    now() - interval '30 days',
    now() - interval '16 days',
    '{"cluster_region": "ap-southeast-1", "edition": "production_enterprise"}'::jsonb
)
on conflict (id) do nothing;

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.platform_saas_plans enable row level security;
alter table public.platform_subscriptions enable row level security;
alter table public.platform_subscription_events enable row level security;
alter table public.platform_webhook_events enable row level security;

-- Platform Super Admin policies
create policy "Platform owners can view platform_saas_plans"
    on public.platform_saas_plans for select
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Platform owners can manage platform_saas_plans"
    on public.platform_saas_plans for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_subscriptions"
    on public.platform_subscriptions for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_subscription_events"
    on public.platform_subscription_events for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_webhook_events"
    on public.platform_webhook_events for all
    using (public.auth_is_platform_owner());
