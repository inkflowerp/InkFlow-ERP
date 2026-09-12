-- ==============================================================================
-- InkFlow SaaS - Migration 052: Strict RLS & Security Definer Hardening
-- Single Source of Truth & Authoritative Isolation Boundary:
--   1. Enforces search_path = public, pg_temp across ALL security definer functions
--   2. Enforces caller authorization on sequence & document numbering generators
--   3. Drops overly permissive RLS policies (auth.uid() is not null) from platform tables
--   4. Locks down platform-wide tables strictly to active platform admins/owners
--   5. Enforces tenant boundaries on gateway, settings, and subscription tables
-- ==============================================================================

-- 1. HARDEN SECURITY DEFINER HELPER FUNCTIONS WITH SEARCH_PATH
create or replace function public.auth_is_platform_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_platform_owner()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.platform_admins
        where user_id = v_user_id
          and role = 'platform_owner'
          and is_active = true
    );
end;
$$;

create or replace function public.auth_is_active_company_user(target_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.uid() is null or target_company_id is null then
        return false;
    end if;

    return exists (
        select 1
        from public.company_users cu
        join public.companies c on c.id = cu.company_id
        where cu.company_id = target_company_id
          and cu.user_id = auth.uid()
          and cu.status = 'active'
          and c.is_active = true
    );
end;
$$;

create or replace function public.auth_get_user_company_role(target_company_id uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_role text;
begin
    if auth.uid() is null or target_company_id is null then
        return null;
    end if;

    select r.slug into v_role
    from public.company_users cu
    join public.user_roles ur on ur.company_user_id = cu.id
    join public.roles r on r.id = ur.role_id
    where cu.company_id = target_company_id
      and cu.user_id = auth.uid()
      and cu.status = 'active'
    order by case when r.slug in ('owner', 'business_owner') then 1 else 2 end
    limit 1;

    return v_role;
end;
$$;

-- 2. HARDEN DOCUMENT NUMBERING & SEQUENCE FUNCTIONS
create or replace function public.get_next_document_number(
    p_company_id uuid,
    p_doc_type text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_prefix text;
    v_next_val bigint;
    v_padding integer;
    v_formatted text;
begin
    -- Security verification: Caller must belong to the company or be an authorized platform admin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if auth.uid() is null then
            raise exception 'Authentication required';
        end if;
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized attempt to generate company sequence for unauthorized company';
        end if;
    end if;

    -- Lock row exclusively to prevent race conditions across parallel bookings
    select prefix, current_val + 1, padding
    into v_prefix, v_next_val, v_padding
    from public.document_sequences
    where company_id = p_company_id
      and doc_type = p_doc_type
    for update;

    -- If no sequence exists yet, initialize it
    if v_next_val is null then
        v_prefix := case p_doc_type
            when 'quotation' then 'QUO'
            when 'order' then 'ORD'
            when 'invoice' then 'INV'
            when 'challan' then 'CHL'
            when 'payment' then 'PAY'
            when 'purchase' then 'PUR'
            else 'DOC'
        end;
        v_next_val := 1;
        v_padding := 6;

        insert into public.document_sequences (company_id, doc_type, prefix, current_val, padding)
        values (p_company_id, p_doc_type, v_prefix, v_next_val, v_padding);
    else
        update public.document_sequences
        set current_val = v_next_val,
            updated_at = now()
        where company_id = p_company_id
          and doc_type = p_doc_type;
    end if;

    -- Return formatted number e.g. "INV-000001"
    v_formatted := v_prefix || '-' || lpad(v_next_val::text, v_padding, '0');
    return v_formatted;
end;
$$;

create or replace function public.get_next_tenant_document_number(
    p_company_id uuid,
    p_document_type text,
    p_prefix text default null
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_year integer := extract(year from current_date);
    v_counter bigint;
    v_doc_prefix text;
    v_result text;
begin
    -- Security verification
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized attempt to generate company document sequence';
        end if;
    end if;

    -- Determine prefix
    if p_prefix is not null then
        v_doc_prefix := p_prefix;
    else
        case p_document_type
            when 'invoice' then v_doc_prefix := 'INV';
            when 'quotation' then v_doc_prefix := 'QT';
            when 'vat_mushak' then v_doc_prefix := 'MUSK';
            when 'receipt' then v_doc_prefix := 'MR';
            when 'challan' then v_doc_prefix := 'CH';
            when 'purchase_order' then v_doc_prefix := 'PO';
            else v_doc_prefix := 'DOC';
        end case;
    end if;

    -- Atomic row-level lock & increment
    insert into public.document_number_counters (company_id, document_type, year_prefix, current_counter, updated_at)
    values (p_company_id, p_document_type, v_year, 101, now())
    on conflict (company_id, document_type, year_prefix)
    do update set
        current_counter = public.document_number_counters.current_counter + 1,
        updated_at = now()
    returning current_counter into v_counter;

    -- Format: PREFIX-YYYY-NUMBER e.g. INV-2026-000101
    v_result := v_doc_prefix || '-' || v_year::text || '-' || lpad(v_counter::text, 6, '0');
    return v_result;
end;
$$;

create or replace function public.get_next_support_ticket_number()
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_next_val bigint;
begin
    v_next_val := nextval('public.support_ticket_number_seq');
    return 'SUP-' || lpad(v_next_val::text, 6, '0');
end;
$$;

-- 3. HARDEN REPORTING & ANALYTICS FUNCTIONS
create or replace function public.get_tenant_sales_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_sales numeric,
    total_orders bigint,
    avg_order_value numeric,
    total_discount numeric,
    total_vat numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company sales analytics';
        end if;
    end if;

    return query
    select
        coalesce(sum(so.final_price), 0)::numeric as total_sales,
        count(so.id)::bigint as total_orders,
        coalesce(avg(so.final_price), 0)::numeric as avg_order_value,
        coalesce(sum(so.discount_amount), 0)::numeric as total_discount,
        coalesce(sum(so.vat_amount), 0)::numeric as total_vat
    from public.sales_orders so
    where so.company_id = p_company_id
      and so.order_date between p_start_date and p_end_date;
end;
$$;

create or replace function public.get_tenant_production_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_jobs bigint,
    completed_jobs bigint,
    delayed_jobs bigint,
    rework_count bigint,
    rework_wastage_cost numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company production analytics';
        end if;
    end if;

    return query
    select
        count(pj.id)::bigint as total_jobs,
        count(pj.id) filter (where pj.status = 'completed')::bigint as completed_jobs,
        count(pj.id) filter (where pj.due_date < current_date and pj.status not in ('completed', 'cancelled'))::bigint as delayed_jobs,
        coalesce(sum(pj.rework_count), 0)::bigint as rework_count,
        coalesce(sum(pj.rework_wastage_cost), 0)::numeric as rework_wastage_cost
    from public.production_jobs pj
    where pj.company_id = p_company_id
      and pj.created_at::date between p_start_date and p_end_date;
end;
$$;

create or replace function public.get_tenant_financial_summary(
    p_company_id uuid,
    p_start_date date default current_date - interval '30 days',
    p_end_date date default current_date
)
returns table (
    total_invoiced numeric,
    total_collected numeric,
    total_outstanding numeric,
    total_expenses numeric,
    net_cashflow numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_invoiced numeric;
    v_collected numeric;
    v_outstanding numeric;
    v_expenses numeric;
begin
    if auth.role() is not null and auth.role() <> 'service_role' then
        if not (public.auth_is_active_company_user(p_company_id) or public.auth_is_platform_admin()) then
            raise exception 'Unauthorized access to company financial analytics';
        end if;
    end if;

    select coalesce(sum(i.grand_total), 0) into v_invoiced
    from public.invoices i
    where i.company_id = p_company_id
      and i.invoice_date between p_start_date and p_end_date;

    select coalesce(sum(p.amount), 0) into v_collected
    from public.payments p
    where p.company_id = p_company_id
      and p.payment_date between p_start_date and p_end_date;

    select coalesce(sum(i.due_amount), 0) into v_outstanding
    from public.invoices i
    where i.company_id = p_company_id
      and i.status not in ('paid', 'cancelled');

    select coalesce(sum(e.amount), 0) into v_expenses
    from public.expenses e
    where e.company_id = p_company_id
      and e.expense_date between p_start_date and p_end_date;

    return query select
        v_invoiced as total_invoiced,
        v_collected as total_collected,
        v_outstanding as total_outstanding,
        v_expenses as total_expenses,
        (v_collected - v_expenses) as net_cashflow;
end;
$$;

-- 4. HARDEN AUDIT LOGGING FUNCTIONS
create or replace function public.log_audit_event(
    p_company_id uuid,
    p_entity_type text,
    p_action text,
    p_old_values jsonb default null,
    p_new_values jsonb default null,
    p_entity_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_log_id uuid;
begin
    insert into public.audit_logs (
        company_id,
        user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values
    ) values (
        p_company_id,
        auth.uid(),
        p_entity_type,
        p_entity_id,
        p_action,
        p_old_values,
        p_new_values
    ) returning id into v_log_id;

    return v_log_id;
end;
$$;

create or replace function public.log_platform_audit_event(
    p_action text,
    p_entity text,
    p_entity_id text default null,
    p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_admin_id uuid;
    v_log_id uuid;
begin
    select id into v_admin_id
    from public.platform_admins
    where user_id = auth.uid()
      and is_active = true
    limit 1;

    insert into public.platform_audit_logs (
        admin_id,
        action,
        entity,
        entity_id,
        details
    ) values (
        v_admin_id,
        p_action,
        p_entity,
        p_entity_id,
        p_details
    ) returning id into v_log_id;

    return v_log_id;
end;
$$;

-- 5. REPAIR RLS POLICIES ACROSS ALL PLATFORM TABLES (DROP PERMISSIVE POLICIES)

-- Platform SaaS Plans
alter table if exists public.platform_saas_plans enable row level security;
drop policy if exists "Platform owners can view platform_saas_plans" on public.platform_saas_plans;
drop policy if exists "Platform owners can manage platform_saas_plans" on public.platform_saas_plans;
drop policy if exists "Anyone authenticated can view platform_saas_plans" on public.platform_saas_plans;

create policy "Platform admins view platform_saas_plans"
    on public.platform_saas_plans for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_saas_plans"
    on public.platform_saas_plans for all
    using (public.auth_is_platform_owner());

-- Platform Role Templates
alter table if exists public.platform_role_templates enable row level security;
drop policy if exists "Authenticated users can read platform role templates" on public.platform_role_templates;
drop policy if exists "Platform owners can manage platform role templates" on public.platform_role_templates;

create policy "Platform admins read platform role templates"
    on public.platform_role_templates for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_role_templates"
    on public.platform_role_templates for all
    using (public.auth_is_platform_owner());

-- Platform Role Template Permissions
alter table if exists public.platform_role_template_permissions enable row level security;
drop policy if exists "Authenticated users can read platform role template permissions" on public.platform_role_template_permissions;
drop policy if exists "Platform owners can manage platform role template permissions" on public.platform_role_template_permissions;

create policy "Platform admins read platform role template permissions"
    on public.platform_role_template_permissions for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage platform_role_template_permissions"
    on public.platform_role_template_permissions for all
    using (public.auth_is_platform_owner());

-- Platform Subscriptions & Events
alter table if exists public.platform_subscriptions enable row level security;
drop policy if exists "Platform owners can manage platform_subscriptions" on public.platform_subscriptions;
create policy "Platform admins manage platform_subscriptions"
    on public.platform_subscriptions for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_subscription_events enable row level security;
drop policy if exists "Platform owners can manage platform_subscription_events" on public.platform_subscription_events;
create policy "Platform admins manage platform_subscription_events"
    on public.platform_subscription_events for all
    using (public.auth_is_platform_admin());

alter table if exists public.platform_webhook_events enable row level security;
drop policy if exists "Platform owners can manage platform_webhook_events" on public.platform_webhook_events;
create policy "Platform admins manage platform_webhook_events"
    on public.platform_webhook_events for all
    using (public.auth_is_platform_admin());

-- Platform System Settings & Health
alter table if exists public.platform_system_settings enable row level security;
drop policy if exists "Platform admins can view system settings" on public.platform_system_settings;
drop policy if exists "Platform owners can manage system settings" on public.platform_system_settings;

create policy "Platform admins view system settings"
    on public.platform_system_settings for select
    using (public.auth_is_platform_admin());

create policy "Platform owners manage system settings"
    on public.platform_system_settings for all
    using (public.auth_is_platform_owner());

alter table if exists public.platform_system_health_events enable row level security;
drop policy if exists "Platform owners can view and manage system health events" on public.platform_system_health_events;
create policy "Platform admins manage system health events"
    on public.platform_system_health_events for all
    using (public.auth_is_platform_admin());

-- Platform Admins Table
alter table if exists public.platform_admins enable row level security;
drop policy if exists "Platform admins full control on platform_admins" on public.platform_admins;
create policy "Platform admins manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_admin());

-- 6. REPAIR TENANT GATEWAY & AUDIT RLS POLICIES
alter table if exists public.gateway_integrations enable row level security;
drop policy if exists "Tenant isolation on gateway_integrations" on public.gateway_integrations;
drop policy if exists "Platform owners manage global gateways" on public.gateway_integrations;

create policy "Tenant users manage own gateway_integrations"
    on public.gateway_integrations for all
    using (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or (tenant_id is null and public.auth_is_platform_admin())
    );

alter table if exists public.gateway_transactions enable row level security;
drop policy if exists "Tenant isolation on gateway_transactions" on public.gateway_transactions;

create policy "Tenant users view own gateway_transactions"
    on public.gateway_transactions for all
    using (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or (tenant_id is null and public.auth_is_platform_admin())
    );

alter table if exists public.gateway_webhooks enable row level security;
drop policy if exists "Tenant isolation on gateway_webhooks" on public.gateway_webhooks;

create policy "Tenant users view own gateway_webhooks"
    on public.gateway_webhooks for all
    using (
        (tenant_id is not null and public.auth_is_active_company_user(tenant_id))
        or (tenant_id is null and public.auth_is_platform_admin())
    );

alter table if exists public.audit_logs enable row level security;
drop policy if exists "Admins can view audit logs" on public.audit_logs;
drop policy if exists "Tenant and platform isolation on audit_logs" on public.audit_logs;

create policy "Tenant users and platform admins view audit logs"
    on public.audit_logs for select
    using (
        public.auth_is_active_company_user(company_id)
        or public.auth_is_platform_admin()
    );
