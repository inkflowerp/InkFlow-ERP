-- ==============================================================================
-- InkFlow ERP SaaS - Migration 075: Subscription Security Audit & RPC Hardening
-- Enforces:
--   1. Strict fail-closed semantics in validate_tenant_limit_atomic (No fallback to trial/starter)
--   2. Strict server timestamp expiry checks on active subscriptions past current_period_end
--   3. Privilege lockdown inside transition_subscription_state_atomic, record_saas_payment_and_settle_atomic, and generate_saas_subscription_invoice_atomic
--   4. Explicit REVOKE of EXECUTE from PUBLIC/anon/authenticated on privileged RPCs
-- ==============================================================================

-- 1. HARDEN VALIDATE_TENANT_LIMIT_ATOMIC (FAIL-CLOSED & EXPIRY ENFORCEMENT)
create or replace function public.validate_tenant_limit_atomic(
    p_company_id uuid,
    p_limit_type text,
    p_current_count integer
)
returns table (
    is_allowed boolean,
    effective_limit integer,
    current_count integer,
    is_exceeded boolean,
    is_warning boolean,
    usage_percentage integer,
    rejection_reason text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_sub record;
    v_plan record;
    v_limit integer;
    v_override_limit integer;
begin
    -- 0. Multi-Tenant Authorization Check
    if current_user <> 'service_role' and not public.auth_is_active_company_user(p_company_id) and not exists (
        select 1 from public.platform_admins where user_id = auth.uid()
    ) then
        return query select false, 0, p_current_count, true, true, 100, 'Access Denied: You do not have permission to inspect this tenant.'::text;
        return;
    end if;

    -- 1. Fetch Subscription & Plan (FAIL-CLOSED: NO FALLBACK TO TRIAL/STARTER)
    select * into v_sub from public.company_subscriptions where company_id = p_company_id;
    if not found or v_sub is null then
        return query select false, 0, p_current_count, true, true, 100, 'No Active Subscription: Tenant has no registered subscription record.'::text;
        return;
    end if;

    select * into v_plan from public.subscription_plans where id = v_sub.plan_id;
    if not found or v_plan is null then
        return query select false, 0, p_current_count, true, true, 100, 'Invalid Plan: Associated subscription plan definition not found.'::text;
        return;
    end if;

    -- 2. Check Subscription Status & Strict Server Timestamp Expiry
    if v_sub.status = 'suspended' then
        return query select false, 0, p_current_count, true, true, 100, 'Account Suspended: Tenant account is suspended by platform administration.'::text;
        return;
    end if;

    if v_sub.status = 'expired' then
        return query select false, 0, p_current_count, true, true, 100, 'Subscription Expired: Please renew your subscription to perform this action.'::text;
        return;
    end if;

    -- Trial Expiry Evaluation
    if (v_sub.status in ('trial', 'trialing') or v_sub.plan_code = 'trial') and v_sub.trial_ends_at is not null then
        if v_sub.trial_ends_at < now() then
            return query select false, 0, p_current_count, true, true, 100, 'Trial Expired: Your free evaluation period has ended. Please upgrade your plan.'::text;
            return;
        end if;
    end if;

    -- Active Subscription Expiry Evaluation (current_period_end past now with grace period check)
    if v_sub.status = 'active' and v_sub.current_period_end is not null then
        if v_sub.current_period_end < now() then
            if v_sub.grace_period_ends_at is null or v_sub.grace_period_ends_at < now() then
                return query select false, 0, p_current_count, true, true, 100, 'Subscription Expired: Current billing cycle has ended. Please renew to continue.'::text;
                return;
            end if;
        end if;
    end if;

    -- Cancelled Subscription past billing period
    if v_sub.status = 'cancelled' and v_sub.current_period_end is not null then
        if v_sub.current_period_end < now() then
            return query select false, 0, p_current_count, true, true, 100, 'Subscription Cancelled: Billing period has elapsed.'::text;
            return;
        end if;
    end if;

    -- 3. Resolve Effective Limit & Check Overrides
    v_override_limit := null;
    if v_sub.custom_limits_override is not null then
        if ((v_sub.custom_limits_override ->> 'is_active') is null or (v_sub.custom_limits_override ->> 'is_active')::boolean = true) then
            if ((v_sub.custom_limits_override ->> 'expires_at') is null or (v_sub.custom_limits_override ->> 'expires_at')::timestamptz >= now()) then
                if v_sub.custom_limits_override ? p_limit_type then
                    v_override_limit := (v_sub.custom_limits_override ->> p_limit_type)::integer;
                end if;
            end if;
        end if;
    end if;

    if v_override_limit is not null then
        v_limit := v_override_limit;
    else
        case p_limit_type
            when 'max_users' then v_limit := v_plan.max_users;
            when 'max_branches' then v_limit := v_plan.max_branches;
            when 'storage_gb' then v_limit := v_plan.storage_gb;
            when 'monthly_orders' then v_limit := v_plan.monthly_orders;
            when 'max_customers' then v_limit := v_plan.max_customers;
            when 'max_products' then v_limit := v_plan.max_products;
            else v_limit := 99999;
        end case;
    end if;

    -- Negative, zero, or >= 99999 represents unlimited
    if v_limit <= 0 or v_limit >= 99999 then
        return query select true, -1, p_current_count, false, false, 0, null::text;
        return;
    end if;

    if p_current_count >= v_limit then
        return query select false, v_limit, p_current_count, true, true, 100,
            format('Plan Quota Reached: Current plan allows up to %s %s (currently at %s). Please upgrade to continue.', v_limit, p_limit_type, p_current_count);
        return;
    end if;

    declare
        v_pct integer := round((p_current_count::numeric / v_limit::numeric) * 100);
    begin
        return query select true, v_limit, p_current_count, false, (v_pct >= 80), v_pct, null::text;
    end;
end;
$$;

-- 2. HARDEN TRANSITION_SUBSCRIPTION_STATE_ATOMIC WITH STRICT AUTH
create or replace function public.transition_subscription_state_atomic(
    p_company_id uuid,
    p_new_status text,
    p_reason text default null,
    p_actor_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_sub record;
    v_old_status text;
begin
    -- Strict Authorization Check
    if current_user <> 'service_role' and not exists (
        select 1 from public.platform_admins where user_id = auth.uid()
    ) then
        raise exception 'Unauthorized: Subscription state mutation strictly requires platform administrator or service role credentials.';
    end if;

    select * into v_sub from public.company_subscriptions where company_id = p_company_id for update;
    if not found then
        raise exception 'Subscription record not found for company %', p_company_id;
    end if;

    v_old_status := v_sub.status;

    if v_old_status = p_new_status then
        return true;
    end if;

    update public.company_subscriptions
    set status = p_new_status,
        updated_at = now()
    where company_id = p_company_id;

    insert into public.subscription_events (
        subscription_id,
        company_id,
        previous_plan_code,
        new_plan_code,
        previous_status,
        new_status,
        event_type,
        reason,
        effective_at,
        performed_by,
        created_at
    )
    values (
        v_sub.id,
        p_company_id,
        v_sub.plan_code,
        v_sub.plan_code,
        v_old_status,
        p_new_status,
        case p_new_status
            when 'active' then 'REACTIVATED'
            when 'suspended' then 'SUSPENDED'
            when 'cancelled' then 'CANCELLED'
            when 'expired' then 'EXPIRED'
            when 'past_due' then 'PAYMENT_FAILED'
            else 'SUBSCRIPTION_CREATED'
        end,
        coalesce(p_reason, format('State transitioned from %s to %s', v_old_status, p_new_status)),
        now(),
        p_actor_id,
        now()
    );

    return true;
end;
$$;

-- 3. HARDEN RECORD_SAAS_PAYMENT_AND_SETTLE_ATOMIC WITH STRICT AUTH
create or replace function public.record_saas_payment_and_settle_atomic(
    p_internal_trx_id text,
    p_provider_trx_id text,
    p_provider text,
    p_paid_amount numeric,
    p_actor_id uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_tx record;
    v_sub record;
    v_interval text;
    v_period_end timestamptz;
begin
    -- Strict Authorization Check
    if current_user <> 'service_role' and not exists (
        select 1 from public.platform_admins where user_id = auth.uid()
    ) then
        raise exception 'Unauthorized: SaaS payment settlement strictly requires platform administrator or service role credentials.';
    end if;

    select * into v_tx
    from public.gateway_transactions
    where internal_trx_id = p_internal_trx_id
    for update;

    if not found then
        raise exception 'Gateway transaction % not found', p_internal_trx_id;
    end if;

    if v_tx.payment_status = 'paid' and v_tx.verification_status = 'verified' then
        return true;
    end if;

    update public.gateway_transactions
    set payment_status = 'paid',
        verification_status = 'verified',
        provider_trx_id = coalesce(p_provider_trx_id, v_tx.provider_trx_id),
        paid_at = now(),
        updated_at = now()
    where id = v_tx.id;

    if v_tx.tenant_id is not null then
        select * into v_sub from public.company_subscriptions where company_id = v_tx.tenant_id for update;

        v_interval := coalesce(v_tx.verification_payload ->> 'interval', 'monthly');
        if v_interval = 'yearly' then
            v_period_end := now() + interval '365 days';
        else
            v_period_end := now() + interval '30 days';
        end if;

        update public.saas_subscription_invoices
        set status = 'paid',
            payment_method = p_provider,
            gateway_transaction_id = v_tx.id,
            paid_at = now(),
            updated_at = now()
        where company_id = v_tx.tenant_id
          and status in ('unpaid', 'draft');

        if v_sub is not null then
            update public.company_subscriptions
            set status = 'active',
                billing_interval = v_interval,
                current_period_start = now(),
                current_period_end = v_period_end,
                trial_ends_at = null,
                cancelled_at = null,
                cancel_at_period_end = false,
                next_plan_id = null,
                change_effective_at = null,
                payment_method_type = p_provider,
                last_payment_reference = coalesce(p_provider_trx_id, v_tx.internal_trx_id),
                updated_at = now()
            where id = v_sub.id;

            insert into public.subscription_events (
                subscription_id,
                company_id,
                previous_status,
                new_status,
                event_type,
                reason,
                transaction_id,
                amount,
                currency,
                effective_at,
                performed_by,
                created_at
            )
            values (
                v_sub.id,
                v_tx.tenant_id,
                v_sub.status,
                'active',
                'PAYMENT_VERIFIED',
                format('Payment of ৳%s settled via %s (Ref: %s)', p_paid_amount, upper(p_provider), coalesce(p_provider_trx_id, v_tx.internal_trx_id)),
                v_tx.id,
                p_paid_amount,
                'BDT',
                now(),
                p_actor_id,
                now()
            );
        end if;
    end if;

    return true;
end;
$$;

-- 4. HARDEN GENERATE_SAAS_SUBSCRIPTION_INVOICE_ATOMIC WITH STRICT AUTH
create or replace function public.generate_saas_subscription_invoice_atomic(
    p_company_id uuid,
    p_plan_id uuid,
    p_interval text,
    p_amount numeric,
    p_discount numeric default 0.00,
    p_tax numeric default 0.00,
    p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_plan record;
    v_sub record;
    v_seq_num integer;
    v_inv_num text;
    v_period_start timestamptz := now();
    v_period_end timestamptz;
    v_inv_id uuid;
begin
    -- Strict Authorization Check
    if current_user <> 'service_role' and not exists (
        select 1 from public.platform_admins where user_id = auth.uid()
    ) then
        raise exception 'Unauthorized: SaaS invoice generation strictly requires platform administrator or service role credentials.';
    end if;

    select * into v_plan from public.subscription_plans where id = p_plan_id;
    if not found then
        raise exception 'Invalid plan ID %', p_plan_id;
    end if;

    select * into v_sub from public.company_subscriptions where company_id = p_company_id;

    if p_interval = 'yearly' then
        v_period_end := v_period_start + interval '365 days';
    else
        v_period_end := v_period_start + interval '30 days';
    end if;

    select count(*) + 1 into v_seq_num from public.saas_subscription_invoices;
    v_inv_num := format('SAAS-INV-%s-%s', to_char(now(), 'YYYY'), lpad(v_seq_num::text, 5, '0'));

    insert into public.saas_subscription_invoices (
        company_id,
        subscription_id,
        invoice_number,
        plan_id,
        plan_code,
        plan_name,
        plan_version,
        billing_interval,
        billing_period_start,
        billing_period_end,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        currency,
        due_date,
        status,
        notes,
        created_at,
        updated_at
    )
    values (
        p_company_id,
        v_sub.id,
        v_inv_num,
        p_plan_id,
        v_plan.code,
        v_plan.name,
        coalesce(v_plan.version, 1),
        p_interval,
        v_period_start,
        v_period_end,
        p_amount,
        p_discount,
        p_tax,
        greatest(0.00, (p_amount - p_discount + p_tax)),
        'BDT',
        v_period_start + interval '3 days',
        'unpaid',
        p_notes,
        now(),
        now()
    )
    returning id into v_inv_id;

    insert into public.saas_subscription_invoice_items (
        invoice_id,
        description,
        item_type,
        quantity,
        unit_price,
        total_price
    )
    values (
        v_inv_id,
        format('%s (%s cycle)', v_plan.name, initcap(p_interval)),
        'plan_fee',
        1,
        p_amount,
        p_amount
    );

    return v_inv_id;
end;
$$;

-- 5. REVOKE PRIVILEGED EXECUTE PERMISSIONS FROM PUBLIC/ANON/AUTHENTICATED
revoke execute on function public.transition_subscription_state_atomic(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.transition_subscription_state_atomic(uuid, text, text, uuid) to service_role;

revoke execute on function public.record_saas_payment_and_settle_atomic(text, text, text, numeric, uuid) from public, anon, authenticated;
grant execute on function public.record_saas_payment_and_settle_atomic(text, text, text, numeric, uuid) to service_role;

revoke execute on function public.generate_saas_subscription_invoice_atomic(uuid, uuid, text, numeric, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.generate_saas_subscription_invoice_atomic(uuid, uuid, text, numeric, numeric, numeric, text) to service_role;

-- Limit enforcement functions are granted to authenticated users but evaluate caller tenant authorization internally
grant execute on function public.validate_tenant_limit_atomic(uuid, text, integer) to authenticated, service_role;
grant execute on function public.enforce_tenant_user_addition_atomic(uuid) to authenticated, service_role;
grant execute on function public.enforce_tenant_branch_addition_atomic(uuid) to authenticated, service_role;
grant execute on function public.enforce_tenant_order_creation_atomic(uuid) to authenticated, service_role;
grant execute on function public.enforce_tenant_storage_upload_atomic(uuid, bigint) to authenticated, service_role;
