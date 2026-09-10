-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 043: SaaS Subscription Lifecycle & Events
-- Comprehensive Subscription State Machine, Immutable Event Ledger, Downgrade Scheduling,
-- and Verification Status on Financial Transactions.
-- ==============================================================================

-- 1. ENHANCE COMPANY_SUBSCRIPTIONS TABLE
alter table public.company_subscriptions
    add column if not exists next_plan_id uuid references public.subscription_plans(id) on delete set null,
    add column if not exists change_effective_at timestamptz,
    add column if not exists cancel_at_period_end boolean not null default false,
    add column if not exists grace_period_ends_at timestamptz,
    add column if not exists started_at timestamptz not null default now();

create index if not exists idx_company_sub_next_plan on public.company_subscriptions(next_plan_id);
create index if not exists idx_company_sub_cancel_period on public.company_subscriptions(cancel_at_period_end);

-- 2. ENHANCE GATEWAY_TRANSACTIONS WITH VERIFICATION STATUS
alter table public.gateway_transactions
    add column if not exists verification_status text not null default 'unverified' check (
        verification_status in ('unverified', 'verified', 'rejected')
    );

create index if not exists idx_gateway_tx_verification on public.gateway_transactions(verification_status);

-- 3. CREATE IMMUTABLE SUBSCRIPTION EVENTS LEDGER
create table if not exists public.subscription_events (
    id uuid primary key default gen_random_uuid(),
    subscription_id uuid references public.company_subscriptions(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    previous_plan_code text,
    new_plan_code text,
    previous_status text,
    new_status text,
    event_type text not null check (
        event_type in (
            'TRIAL_STARTED',
            'TRIAL_EXTENDED',
            'SUBSCRIPTION_CREATED',
            'PLAN_UPGRADED',
            'PLAN_DOWNGRADED',
            'RENEWED',
            'PAYMENT_PENDING',
            'PAYMENT_VERIFIED',
            'PAYMENT_FAILED',
            'CANCELLED',
            'REACTIVATED',
            'EXPIRED',
            'SUSPENDED'
        )
    ),
    reason text,
    transaction_id uuid references public.gateway_transactions(id) on delete set null,
    amount numeric(12,2),
    currency text not null default 'BDT',
    effective_at timestamptz not null default now(),
    performed_by uuid,
    created_at timestamptz not null default now()
);

create index if not exists idx_sub_events_company on public.subscription_events(company_id);
create index if not exists idx_sub_events_sub on public.subscription_events(subscription_id);
create index if not exists idx_sub_events_type on public.subscription_events(event_type);
create index if not exists idx_sub_events_created on public.subscription_events(created_at desc);

alter table public.subscription_events enable row level security;

-- 4. RLS POLICIES FOR SUBSCRIPTION EVENTS
create policy "Tenant users can view their subscription events"
    on public.subscription_events for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform super admins can view all subscription events"
    on public.subscription_events for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );
