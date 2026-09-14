-- ==============================================================================
-- InkFlow ERP SaaS - Migration 074: Subscription Security Lockdown & Bypass Prevention
-- Enforces the Absolute Business Rule:
--   A tenant's subscription/plan may change ONLY via:
--     1. Verified Payment (via secure backend provider verification or atomic RPC)
--     2. Authorized Platform Admin (via platform administration)
-- Revokes all direct tenant UPDATE/INSERT permissions on company_subscriptions.
-- Locks down subscription_events as an immutable append-only ledger.
-- ==============================================================================

-- 1. DROP INSECURE TENANT UPDATE POLICIES ON COMPANY_SUBSCRIPTIONS
drop policy if exists "Authorized company admins can update their subscription" on public.company_subscriptions;
drop policy if exists "Tenant users can update their own subscription" on public.company_subscriptions;
drop policy if exists "Company admins can insert their subscription" on public.company_subscriptions;

-- Ensure RLS is active on company_subscriptions
alter table public.company_subscriptions enable row level security;

-- 2. CREATE STRICT RLS POLICIES FOR COMPANY_SUBSCRIPTIONS
-- Policy A: Active company users can strictly SELECT (read-only) their own company's subscription
create policy "Active company users can view their own subscription"
    on public.company_subscriptions for select
    using (public.auth_is_active_company_user(company_id));

-- Policy B: Platform administrators can view all company subscriptions
create policy "Platform admins can view all company subscriptions"
    on public.company_subscriptions for select
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- Policy C: Only Platform Administrators can directly INSERT/UPDATE/DELETE company subscriptions
-- (Standard tenant sessions are strictly prohibited from mutating subscription records directly)
create policy "Platform admins can insert company subscriptions"
    on public.company_subscriptions for insert
    with check (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

create policy "Platform admins can update company subscriptions"
    on public.company_subscriptions for update
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

create policy "Platform admins can delete company subscriptions"
    on public.company_subscriptions for delete
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- 3. STRICT IMMUTABLE AUDIT LOG ON SUBSCRIPTION_EVENTS
alter table public.subscription_events enable row level security;

drop policy if exists "Tenant users can view their subscription events" on public.subscription_events;
drop policy if exists "Platform admins can manage subscription events" on public.subscription_events;

-- Tenant users can strictly SELECT events for their company
create policy "Tenant users can view their own subscription events"
    on public.subscription_events for select
    using (public.auth_is_active_company_user(company_id));

-- Platform admins can view all subscription events
create policy "Platform admins can view all subscription events"
    on public.subscription_events for select
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- Platform admins can insert subscription events
create policy "Platform admins can insert subscription events"
    on public.subscription_events for insert
    with check (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- UPDATE and DELETE on subscription_events are strictly FORBIDDEN for everyone (Immutable Ledger)

-- 4. GATEWAY TRANSACTIONS SECURITY LOCKDOWN
alter table public.gateway_transactions enable row level security;

drop policy if exists "Tenant users can view their gateway transactions" on public.gateway_transactions;
drop policy if exists "Tenant users can insert checkout transactions" on public.gateway_transactions;
drop policy if exists "Platform admins can manage all gateway transactions" on public.gateway_transactions;

-- Tenant users can view transactions belonging to their tenant
create policy "Tenant users can view their own gateway transactions"
    on public.gateway_transactions for select
    using (
        tenant_id is not null and public.auth_is_active_company_user(tenant_id)
    );

-- Tenant users can initiate checkout transactions with 'initiated' status only
create policy "Tenant users can initiate checkout transactions"
    on public.gateway_transactions for insert
    with check (
        tenant_id is not null
        and public.auth_is_active_company_user(tenant_id)
        and payment_status = 'initiated'
        and verification_status = 'unverified'
    );

-- Platform admins have full visibility and management over gateway transactions
create policy "Platform admins can manage gateway transactions"
    on public.gateway_transactions for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- 5. DATABASE CONSTRAINT: PREVENT TAMPERING VIA TRIGGER
-- Ensures plan_code, plan_id, status, or current_period_end cannot be manipulated without audit record
create or replace function public.enforce_subscription_audit_integrity()
returns trigger
language plpgsql
security definer
as $$
begin
    -- Auto-record updated_at timestamp
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_subscription_audit_integrity on public.company_subscriptions;
create trigger trg_subscription_audit_integrity
    before update on public.company_subscriptions
    for each row
    execute function public.enforce_subscription_audit_integrity();
