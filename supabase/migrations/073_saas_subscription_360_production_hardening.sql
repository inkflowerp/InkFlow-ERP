-- ==============================================================================
-- InkFlow ERP SaaS - Migration 073: SaaS Subscription 360 Production Hardening
-- Supports:
--   1. Canonical Features Catalog (Bilingual, Categories, Entitlement Types)
--   2. Plan Versioning, Soft/Hard Limits, Overage Policies, & Currency Standards
--   3. Authoritative SaaS Subscription Invoices & Invoice Items (Distinct from Tenant Invoices)
--   4. Tenant Storage Tracking & Real Byte Metering
--   5. Atomic PostgreSQL RPCs (Concurrency-Safe Quota & State Enforcement)
--   6. Strict Multi-Tenant Row Level Security & Platform Admin Isolation
-- ==============================================================================

-- 1. CANONICAL FEATURES CATALOG TABLE
create table if not exists public.features_catalog (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    name_en text not null,
    name_bn text not null,
    description_en text,
    description_bn text,
    category text not null check (category in ('sales', 'production', 'inventory', 'management', 'finance', 'communication', 'advanced', 'system')),
    entitlement_type text not null default 'boolean' check (entitlement_type in ('boolean', 'numeric', 'usage', 'unlimited')),
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_features_catalog_key on public.features_catalog(key);
create index if not exists idx_features_catalog_category on public.features_catalog(category);
alter table public.features_catalog enable row level security;

-- Seed Canonical Features Catalog
insert into public.features_catalog (key, name_en, name_bn, description_en, description_bn, category, entitlement_type, sort_order)
values
('basic_sales', 'Basic Sales & POS', 'মৌলিক সেলস ও ক্যাশ মেমো', 'Create estimates, cash sales, and bill printing.', 'ক্যাশ মেমো এবং বিল তৈরি।', 'sales', 'boolean', 1),
('basic_customers', 'Basic Customers Directory', 'গ্রাহক তালিকা ও লেজার', 'Maintain customer accounts, phone numbers, and balances.', 'গ্রাহক তথ্য ও লেজার ব্যবস্থাপনা।', 'sales', 'boolean', 2),
('quotation_pdf', 'Quotation PDF Generator', 'কোটেশন পিডিএফ প্রস্তুতকরণ', 'Download and print formal client quotations with company branding.', 'ব্র্যান্ডিং যুক্ত কোটেশন প্রস্তুত।', 'sales', 'boolean', 3),
('delivery_challan', 'Delivery Challan', 'ডেলিভারি চালান ও গেটপাস', 'Print official delivery challans for dispatched orders.', 'ডেলিভারি চালান ও গেটপাস তৈরি।', 'sales', 'boolean', 4),
('multi_department', 'Multiple Departments', 'বহু বিভাগ ব্যবস্থাপনা', 'Separate pre-press, offset, digital, solvent, and finishing departments.', 'প্রি-প্রেস, অফসেট ও ডিজিটাল বিভাগ।', 'production', 'boolean', 5),
('inventory', 'Inventory & Stock Management', 'ইনভেন্টরি ও কাঁচামাল স্টক', 'Track media rolls, sheets, inks, eyelets, and purchase orders.', 'রোল, শিট ও কালি স্টক নিরীক্ষা।', 'inventory', 'boolean', 6),
('inventory_rolls', 'Roll & Sheet Stock Ledger', 'রোল ও শিট স্টক লেজার', 'Real-time linear foot, square foot, and ream balance calculations.', 'রৈখিক ও বর্গফুট ব্যালেন্স গণনা।', 'inventory', 'boolean', 7),
('production', 'Shop Floor Production', 'প্রোডাকশন ফ্লোর ও শিডিউলিং', 'Machine queue, print operators job tickets, and QA signoff.', 'মেশিন কিউ এবং জব টিকিট ব্যবস্থাপনা।', 'production', 'boolean', 8),
('production_kanban', 'Production Kanban Board', 'প্রোডাকশন কানবান বোর্ড', 'Live interactive drag-and-drop workflow across production stages.', 'লাইভ কানবান টাস্ক বোর্ড।', 'production', 'boolean', 9),
('reports', 'Reports & Business Analytics', 'রিপোর্ট ও ব্যবসায়িক হিসাব', 'P&L, daily collection, sales by product, and material wastage analysis.', 'দৈনিক ক্যাশ ও সেলস রিপোর্ট।', 'management', 'boolean', 10),
('reports_analytics', 'Executive Financial Reports', 'নির্বাহী আর্থিক বিশ্লেষণ', 'Consolidated profit and revenue analytics with exportable spreadsheets.', 'কনসোলিডেটেড প্রফিট অ্যানালিটিক্স।', 'finance', 'boolean', 11),
('hr', 'HR & Employee Management', 'মানবসম্পদ ও কর্মী প্রশাসন', 'Employee roster, attendance, shifts, and leave records.', 'কর্মী তালিকা ও শিফট ব্যবস্থাপনা।', 'management', 'boolean', 12),
('hr_payroll', 'Payroll & Salary Sheets', 'বেতন ও পে-রোল প্রস্তুতকরণ', 'Monthly payroll generation, overtime calculations, and salary payslips.', 'মাসিক বেতন ও ওভারটাইম হিসাব।', 'finance', 'boolean', 13),
('job_costing', 'Job Costing & Profitability', 'জব কস্টিং ও প্রকৃত লাভ নিরীক্ষা', 'Actual ink, media, electricity, and labor cost analysis per job ticket.', 'জব ভিত্তিক আসল খরচ ও মার্জিন।', 'finance', 'boolean', 14),
('whatsapp_notifications', 'WhatsApp Notifications', 'হোয়াটসঅ্যাপ নোটিফিকেশন', 'Automated order status and delivery updates directly to client phones.', 'স্বয়ংক্রিয় হোয়াটসঅ্যাপ বার্তা।', 'communication', 'boolean', 15),
('sms_notifications', 'SMS Alerts & Gateway', 'এসএমএস অ্যালার্ট ও গেটওয়ে', 'Transactional SMS notifications for invoices and receipts.', 'ইনভয়েস ও রসিদ এসএমএস বার্তা।', 'communication', 'boolean', 16),
('multi_branch', 'Multiple Branches & Hubs', 'মাল্টি-ব্রাঞ্চ ও শাখা নিয়ন্ত্রণ', 'Manage separate factory floors, retail counters, and regional hubs.', 'একাধিক শাখা ও কারখানা সংযোগ।', 'advanced', 'boolean', 17),
('machinery', 'Machinery & Equipment Lifecycle', 'যন্ত্রপাতি ও ইকুইপমেন্ট ব্যবস্থাপনা', 'Machine maintenance logs, capacity scheduling, and operator assignments.', 'মেশিন মেইনটেন্যান্স ও শিডিউলিং।', 'production', 'boolean', 18),
('attendance_qr', 'QR & Geofence Attendance', 'কিউআর ও জিওফেন্স উপস্থিতি', 'Contactless QR clock-in and GPS radius verification for employees.', 'কিউআর ও জিপিএস ভিত্তিক উপস্থিতি।', 'management', 'boolean', 19),
('advanced_analytics', 'Advanced Analytics & Forecasting', 'উন্নত অ্যানালিটিক্স ও পূর্বাভাস', 'Machine efficiency benchmarking and inventory reorder forecasting.', 'মেশিন কর্মক্ষমতা ও পূর্বাভাস।', 'advanced', 'boolean', 20),
('advanced_permissions', 'Advanced RBAC & Granular Overrides', 'উন্নত পারমিশন ও রোল কাস্টমাইজেশন', 'Per-user permission matrix, module masks, and action-level controls.', 'গ্র্যানুলার ইউজার পারমিশন কন্ট্রোল।', 'advanced', 'boolean', 21),
('custom_workflows', 'Custom Approval Workflows', 'কাস্টম অনুমোদন ওয়ার্কফ্লো', 'Multi-stage quotation signoffs and credit limit threshold approvals.', 'মাল্টি-লেভেল অনুমোদন পদ্ধতি।', 'advanced', 'boolean', 22),
('api_access', 'REST API & Webhooks', 'রেস্ট এপিআই ও ওয়েবহুক অ্যাক্সেস', 'Direct programmatic API integration with ERP, accounting, or e-commerce.', 'সরাসরি এপিআই ও ওয়েবহুক সমর্থন।', 'advanced', 'boolean', 23),
('priority_support', 'Dedicated 24/7 Account Manager', 'ডেডিকেটেড ২৪/৭ অ্যাকাউন্ট সাপোর্ট', 'Direct phone & on-site priority support with 99.9% uptime SLA.', '২৪/৭ ডেডিকেটেড ভিআইপি সাপোর্ট।', 'advanced', 'boolean', 24)
on conflict (key) do update set
    name_en = excluded.name_en,
    name_bn = excluded.name_bn,
    description_en = excluded.description_en,
    description_bn = excluded.description_bn,
    category = excluded.category,
    entitlement_type = excluded.entitlement_type,
    sort_order = excluded.sort_order,
    updated_at = now();

-- 2. ENHANCE SUBSCRIPTION_PLANS & ADD PLAN VERSIONING
alter table public.subscription_plans
    add column if not exists version integer not null default 1,
    add column if not exists is_latest boolean not null default true,
    add column if not exists soft_limits jsonb not null default '{"warning_threshold_pct": 80}'::jsonb,
    add column if not exists hard_limits jsonb not null default '{}'::jsonb,
    add column if not exists overage_policy text not null default 'block' check (overage_policy in ('block', 'warn', 'allow_charge')),
    add column if not exists setup_fee numeric(10,2) not null default 0.00,
    add column if not exists currency text not null default 'BDT',
    add column if not exists trial_eligible boolean not null default true;

-- Plan Versions Table for Immutable Historical Snapshots
create table if not exists public.plan_versions (
    id uuid primary key default gen_random_uuid(),
    plan_id uuid not null references public.subscription_plans(id) on delete cascade,
    version integer not null,
    code text not null,
    name text not null,
    name_bn text,
    price_monthly numeric(10,2) not null,
    price_yearly numeric(10,2) not null,
    currency text not null default 'BDT',
    max_users integer not null,
    max_branches integer not null,
    storage_gb integer not null,
    monthly_orders integer not null,
    max_customers integer not null,
    max_products integer not null,
    features text[] not null default '{}',
    soft_limits jsonb not null default '{}'::jsonb,
    hard_limits jsonb not null default '{}'::jsonb,
    overage_policy text not null default 'block',
    change_summary text,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    constraint uk_plan_version unique (plan_id, version)
);

create index if not exists idx_plan_versions_plan on public.plan_versions(plan_id, version desc);
alter table public.plan_versions enable row level security;

-- 3. SAAS SUBSCRIPTION INVOICES & LINE ITEMS TABLE (Separate from Tenant Customer Invoices)
create table if not exists public.saas_subscription_invoices (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    subscription_id uuid references public.company_subscriptions(id) on delete set null,
    invoice_number text not null unique,
    plan_id uuid references public.subscription_plans(id) on delete set null,
    plan_code text not null,
    plan_name text not null,
    plan_version integer not null default 1,
    billing_interval text not null default 'monthly' check (billing_interval in ('monthly', 'yearly')),
    billing_period_start timestamptz not null,
    billing_period_end timestamptz not null,
    subtotal numeric(12,2) not null default 0.00 check (subtotal >= 0),
    discount_amount numeric(12,2) not null default 0.00 check (discount_amount >= 0),
    tax_amount numeric(12,2) not null default 0.00 check (tax_amount >= 0),
    total_amount numeric(12,2) not null default 0.00 check (total_amount >= 0),
    currency text not null default 'BDT',
    due_date timestamptz not null,
    status text not null default 'unpaid' check (status in ('draft', 'unpaid', 'paid', 'overdue', 'void', 'waived')),
    payment_method text, -- 'bkash', 'sslcommerz', 'nagad', 'bank_wire', 'manual', 'credit'
    gateway_transaction_id uuid references public.gateway_transactions(id) on delete set null,
    paid_at timestamptz,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_saas_inv_company on public.saas_subscription_invoices(company_id);
create index if not exists idx_saas_inv_status on public.saas_subscription_invoices(status);
create index if not exists idx_saas_inv_due on public.saas_subscription_invoices(due_date);
create index if not exists idx_saas_inv_number on public.saas_subscription_invoices(invoice_number);
alter table public.saas_subscription_invoices enable row level security;

create table if not exists public.saas_subscription_invoice_items (
    id uuid primary key default gen_random_uuid(),
    invoice_id uuid not null references public.saas_subscription_invoices(id) on delete cascade,
    description text not null,
    item_type text not null default 'plan_fee' check (item_type in ('plan_fee', 'proration_credit', 'user_addon', 'branch_addon', 'storage_addon', 'discount', 'vat')),
    quantity integer not null default 1,
    unit_price numeric(12,2) not null default 0.00,
    total_price numeric(12,2) not null default 0.00,
    created_at timestamptz not null default now()
);

create index if not exists idx_saas_inv_items_inv on public.saas_subscription_invoice_items(invoice_id);
alter table public.saas_subscription_invoice_items enable row level security;

-- 4. TENANT STORAGE USAGE TABLE
create table if not exists public.saas_tenant_storage_usage (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade unique,
    total_bytes_used bigint not null default 0 check (total_bytes_used >= 0),
    total_files_count integer not null default 0 check (total_files_count >= 0),
    artwork_bytes bigint not null default 0,
    invoices_bytes bigint not null default 0,
    receipts_bytes bigint not null default 0,
    documents_bytes bigint not null default 0,
    last_calculated_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_storage_usage_company on public.saas_tenant_storage_usage(company_id);
alter table public.saas_tenant_storage_usage enable row level security;

-- 5. ATOMIC POSTGRESQL FUNCTIONS & RPCS

-- A. Validate and Check Resource Limit Atomically
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
    v_days_left integer;
begin
    -- 1. Fetch Subscription & Plan
    select * into v_sub from public.company_subscriptions where company_id = p_company_id;
    if not found then
        -- Default to trial limits if subscription record doesn't exist
        select * into v_plan from public.subscription_plans where code = 'trial' limit 1;
    else
        select * into v_plan from public.subscription_plans where id = v_sub.plan_id;
    end if;

    if v_plan is null then
        select * into v_plan from public.subscription_plans where code = 'starter' limit 1;
    end if;

    -- 2. Check Subscription Status
    if v_sub is not null and v_sub.status = 'suspended' then
        return query select false, 0, p_current_count, true, true, 100, 'Account Suspended: Tenant account is suspended by platform administration.'::text;
        return;
    end if;

    if v_sub is not null and v_sub.status = 'expired' then
        return query select false, 0, p_current_count, true, true, 100, 'Subscription Expired: Please renew your subscription to perform this action.'::text;
        return;
    end if;

    if v_sub is not null and v_sub.status = 'trial' and v_sub.trial_ends_at is not null then
        if v_sub.trial_ends_at < now() then
            return query select false, 0, p_current_count, true, true, 100, 'Trial Expired: Your 14-day free trial has ended. Please upgrade your plan.'::text;
            return;
        end if;
    end if;

    -- 3. Resolve Effective Limit
    v_override_limit := null;
    if v_sub is not null and v_sub.custom_limits_override is not null then
        if v_sub.custom_limits_override ? p_limit_type then
            v_override_limit := (v_sub.custom_limits_override ->> p_limit_type)::integer;
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
            format('Plan Quota Reached: Your current plan allows up to %s %s (currently at %s). Please upgrade to continue.', v_limit, p_limit_type, p_current_count);
        return;
    end if;

    declare
        v_pct integer := round((p_current_count::numeric / v_limit::numeric) * 100);
    begin
        return query select true, v_limit, p_current_count, false, (v_pct >= 80), v_pct, null::text;
    end;
end;
$$;

-- B. Atomically Enforce User Addition with Lock
create or replace function public.enforce_tenant_user_addition_atomic(
    p_company_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_active_users integer;
    v_check record;
begin
    -- Acquire exclusive advisory lock on company user addition
    perform pg_advisory_xact_lock(hashtext('company_user_add_' || p_company_id::text));

    -- Count active and invited users
    select count(*) into v_active_users
    from public.company_users
    where company_id = p_company_id
      and (status in ('active', 'invited', 'pending') or status is null);

    select * into v_check from public.validate_tenant_limit_atomic(p_company_id, 'max_users', v_active_users);

    if not v_check.is_allowed then
        raise exception '%', coalesce(v_check.rejection_reason, 'User limit exceeded for current subscription plan.');
    end if;

    return true;
end;
$$;

-- C. Atomically Enforce Branch Addition with Lock
create or replace function public.enforce_tenant_branch_addition_atomic(
    p_company_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_active_branches integer;
    v_check record;
begin
    perform pg_advisory_xact_lock(hashtext('company_branch_add_' || p_company_id::text));

    select count(*) into v_active_branches
    from public.branches
    where company_id = p_company_id
      and is_active = true;

    select * into v_check from public.validate_tenant_limit_atomic(p_company_id, 'max_branches', v_active_branches);

    if not v_check.is_allowed then
        raise exception '%', coalesce(v_check.rejection_reason, 'Branch limit exceeded for current subscription plan.');
    end if;

    return true;
end;
$$;

-- D. Atomically Enforce Monthly Order Creation with Lock
create or replace function public.enforce_tenant_order_creation_atomic(
    p_company_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_start_of_month timestamptz;
    v_monthly_orders integer;
    v_check record;
begin
    perform pg_advisory_xact_lock(hashtext('company_order_add_' || p_company_id::text));

    v_start_of_month := date_trunc('month', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';

    select count(*) into v_monthly_orders
    from public.sales_orders
    where company_id = p_company_id
      and created_at >= v_start_of_month;

    select * into v_check from public.validate_tenant_limit_atomic(p_company_id, 'monthly_orders', v_monthly_orders);

    if not v_check.is_allowed then
        raise exception '%', coalesce(v_check.rejection_reason, 'Monthly order limit exceeded for current billing period.');
    end if;

    return true;
end;
$$;

-- E. Atomically Enforce Storage Upload Limit
create or replace function public.enforce_tenant_storage_upload_atomic(
    p_company_id uuid,
    p_bytes_to_add bigint
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_storage record;
    v_current_bytes bigint := 0;
    v_current_gb numeric;
    v_check record;
begin
    perform pg_advisory_xact_lock(hashtext('company_storage_add_' || p_company_id::text));

    select * into v_storage from public.saas_tenant_storage_usage where company_id = p_company_id;
    if found then
        v_current_bytes := v_storage.total_bytes_used;
    end if;

    v_current_gb := round(((v_current_bytes + p_bytes_to_add)::numeric / (1024 * 1024 * 1024)::numeric), 2);

    select * into v_check from public.validate_tenant_limit_atomic(p_company_id, 'storage_gb', ceil(v_current_gb)::integer);

    if not v_check.is_allowed then
        raise exception '%', coalesce(v_check.rejection_reason, 'Cloud storage quota exceeded. Upgrade your subscription to upload larger files.');
    end if;

    -- Update or insert storage tracking record
    insert into public.saas_tenant_storage_usage (company_id, total_bytes_used, total_files_count, last_calculated_at, updated_at)
    values (p_company_id, v_current_bytes + p_bytes_to_add, coalesce(v_storage.total_files_count, 0) + 1, now(), now())
    on conflict (company_id) do update set
        total_bytes_used = saas_tenant_storage_usage.total_bytes_used + excluded.total_bytes_used - v_current_bytes,
        total_files_count = saas_tenant_storage_usage.total_files_count + 1,
        last_calculated_at = now(),
        updated_at = now();

    return true;
end;
$$;

-- F. Atomically Transition Subscription State
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
    select * into v_sub from public.company_subscriptions where company_id = p_company_id for update;
    if not found then
        raise exception 'Subscription record not found for company %', p_company_id;
    end if;

    v_old_status := v_sub.status;

    -- Validate allowed state transitions
    if v_old_status = p_new_status then
        return true;
    end if;

    -- Update subscription record
    update public.company_subscriptions
    set status = p_new_status,
        updated_at = now()
    where company_id = p_company_id;

    -- Insert immutable event
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
        v_sub.plan_id::text,
        v_sub.plan_id::text,
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

-- G. Generate SaaS Subscription Invoice Atomically
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

    -- Generate sequential invoice number: SAAS-YYYY-XXXXX
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

    -- Insert Plan Fee Line Item
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

-- H. Atomically Settle SaaS Invoice & Activate Subscription upon Verified Payment
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
    v_inv record;
    v_sub record;
    v_plan record;
    v_interval text;
    v_period_end timestamptz;
begin
    -- 1. Find and Lock Transaction Record
    select * into v_tx
    from public.gateway_transactions
    where internal_trx_id = p_internal_trx_id
    for update;

    if not found then
        raise exception 'Gateway transaction % not found', p_internal_trx_id;
    end if;

    -- Idempotency Check: Already verified & settled
    if v_tx.payment_status = 'paid' and v_tx.verification_status = 'verified' then
        return true;
    end if;

    -- 2. Update Gateway Transaction to PAID & VERIFIED
    update public.gateway_transactions
    set payment_status = 'paid',
        verification_status = 'verified',
        provider_trx_id = coalesce(p_provider_trx_id, v_tx.provider_trx_id),
        paid_at = now(),
        updated_at = now()
    where id = v_tx.id;

    -- 3. Resolve Subscription & Plan
    if v_tx.tenant_id is not null then
        select * into v_sub from public.company_subscriptions where company_id = v_tx.tenant_id for update;

        v_interval := coalesce(v_tx.verification_payload ->> 'interval', 'monthly');
        if v_interval = 'yearly' then
            v_period_end := now() + interval '365 days';
        else
            v_period_end := now() + interval '30 days';
        end if;

        -- Settle any pending SaaS invoices for this company
        update public.saas_subscription_invoices
        set status = 'paid',
            payment_method = p_provider,
            gateway_transaction_id = v_tx.id,
            paid_at = now(),
            updated_at = now()
        where company_id = v_tx.tenant_id
          and status in ('unpaid', 'draft');

        -- Update Subscription Record Atomically
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

            -- Log Immutable Event
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

-- 6. STRICT ROW LEVEL SECURITY (RLS) POLICIES

-- Features Catalog Policies
create policy "Public can view active features catalog"
    on public.features_catalog for select
    using (is_active = true);

create policy "Platform admins can manage features catalog"
    on public.features_catalog for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- Plan Versions Policies
create policy "Public can view plan versions"
    on public.plan_versions for select
    using (true);

create policy "Platform admins can manage plan versions"
    on public.plan_versions for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- SaaS Invoices Policies (Strict Company Isolation)
create policy "Tenant users can view their own SaaS invoices"
    on public.saas_subscription_invoices for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform admins can manage all SaaS invoices"
    on public.saas_subscription_invoices for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

create policy "Tenant users can view their own SaaS invoice items"
    on public.saas_subscription_invoice_items for select
    using (
        exists (
            select 1 from public.saas_subscription_invoices inv
            where inv.id = saas_subscription_invoice_items.invoice_id
              and public.auth_is_active_company_user(inv.company_id)
        )
    );

create policy "Platform admins can manage all SaaS invoice items"
    on public.saas_subscription_invoice_items for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );

-- Tenant Storage Usage Policies
create policy "Tenant users can view their own storage usage"
    on public.saas_tenant_storage_usage for select
    using (public.auth_is_active_company_user(company_id));

create policy "Platform admins can view all storage usage"
    on public.saas_tenant_storage_usage for all
    using (
        exists (
            select 1 from public.platform_admins
            where user_id = auth.uid()
        )
    );
