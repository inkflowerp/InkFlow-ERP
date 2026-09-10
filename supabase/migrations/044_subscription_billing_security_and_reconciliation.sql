-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 044: Subscription Billing Security & Reconciliation
-- Authoritative Billing Transactions, Webhook Idempotency Constraints,
-- Cron Performance Indexes, and Multi-Tenant Isolation Policies.
-- ==============================================================================

-- 1. ENSURE UNIQUE CONSTRAINT & INDEXES ON GATEWAY_TRANSACTIONS FOR IDEMPOTENCY
create unique index if not exists idx_gateway_tx_internal_unique 
    on public.gateway_transactions(internal_trx_id) 
    where internal_trx_id is not null;

create index if not exists idx_gateway_tx_provider_trx 
    on public.gateway_transactions(provider, provider_trx_id) 
    where provider_trx_id is not null;

create index if not exists idx_gateway_tx_payment_verification 
    on public.gateway_transactions(payment_status, verification_status);

-- 2. ENSURE COMPOSITE PERFORMANCE INDEXES FOR SUBSCRIPTION LIFECYCLE CRON
create index if not exists idx_company_sub_trial_lifecycle 
    on public.company_subscriptions(status, trial_ends_at) 
    where status = 'trial';

create index if not exists idx_company_sub_scheduled_downgrade 
    on public.company_subscriptions(change_effective_at) 
    where next_plan_id is not null;

create index if not exists idx_company_sub_period_cancel 
    on public.company_subscriptions(cancel_at_period_end, current_period_end) 
    where cancel_at_period_end = true;

-- 3. ENSURE STRICT RLS POLICIES FOR SUBSCRIPTION AND BILLING TABLES
alter table public.subscription_plans enable row level security;
alter table public.company_subscriptions enable row level security;
alter table public.subscription_events enable row level security;
alter table public.gateway_transactions enable row level security;

-- Ensure read access to active subscription plans
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'subscription_plans' and policyname = 'Public can view active subscription plans'
    ) then
        create policy "Public can view active subscription plans"
            on public.subscription_plans for select
            using (is_active = true);
    end if;
end;
$$;

-- Ensure platform super admins can manage subscription plans
do $$
begin
    if not exists (
        select 1 from pg_policies 
        where tablename = 'subscription_plans' and policyname = 'Platform admins can manage subscription plans'
    ) then
        create policy "Platform admins can manage subscription plans"
            on public.subscription_plans for all
            using (
                exists (
                    select 1 from public.platform_admins
                    where user_id = auth.uid()
                )
            );
    end if;
end;
$$;
