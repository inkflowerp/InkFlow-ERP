-- ==============================================================================
-- PrintERP SaaS - Migration 025: SaaS Subscription System & Feature Gating
-- Supports:
--   1. 3 SaaS Plans (Starter, Business, Enterprise) with Configurable Limits
--   2. 6 Subscription States (Trial, Active, Past Due, Suspended, Cancelled, Expired)
--   3. Monthly & Yearly Billing Intervals with Decoupled Payment Architecture
--   4. Platform Owner Administration & Tenant Suspension Controls
--   5. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. SUBSCRIPTION PLANS TABLE
create table if not exists public.subscription_plans (
    id uuid primary key default gen_random_uuid(),
    code text not null unique, -- 'starter', 'business', 'enterprise'
    name text not null,
    name_bn text,
    description text,
    price_monthly numeric(10,2) not null,
    price_yearly numeric(10,2) not null,
    max_users integer not null,
    max_branches integer not null,
    storage_gb integer not null,
    monthly_orders integer not null,
    max_customers integer not null,
    max_products integer not null,
    features text[] not null default '{}',
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Seed Initial 3 Plans
insert into public.subscription_plans (code, name, name_bn, description, price_monthly, price_yearly, max_users, max_branches, storage_gb, monthly_orders, max_customers, max_products, features, sort_order)
values
(
    'starter',
    'Starter Plan',
    'স্টার্টার প্ল্যান',
    'For small printing and retail sign shops needing basic quotations and orders.',
    1999.00,
    19990.00,
    3,
    1,
    1,
    50,
    100,
    100,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    1
),
(
    'business',
    'Business Plan',
    'বিজনেস প্ল্যান',
    'Complete production, inventory rolls, job costing, and HR for growing factories.',
    4999.00,
    49990.00,
    10,
    3,
    10,
    500,
    1000,
    1000,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'multi_department', 'inventory_rolls', 'production_kanban', 'job_costing', 'hr_payroll', 'reports_analytics', 'whatsapp_notifications'],
    2
),
(
    'enterprise',
    'Enterprise Plan',
    'এন্টারপ্রাইজ প্ল্যান',
    'Unlimited branches, advanced permissions, and dedicated support for large firms.',
    9999.00,
    99990.00,
    999,
    999,
    100,
    99999,
    99999,
    99999,
    array['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'multi_department', 'inventory_rolls', 'production_kanban', 'job_costing', 'hr_payroll', 'reports_analytics', 'whatsapp_notifications', 'multi_branch', 'custom_workflows', 'api_access', 'priority_support'],
    3
)
on conflict (code) do update set
    price_monthly = excluded.price_monthly,
    price_yearly = excluded.price_yearly,
    features = excluded.features;

-- 2. COMPANY SUBSCRIPTIONS TABLE
create table if not exists public.company_subscriptions (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade unique,
    plan_id uuid not null references public.subscription_plans(id) on delete restrict,
    status text not null default 'trial' check (
        status in ('trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')
    ),
    billing_interval text not null default 'monthly' check (
        billing_interval in ('monthly', 'yearly')
    ),
    current_period_start timestamptz not null default now(),
    current_period_end timestamptz not null default now() + interval '30 days',
    trial_ends_at timestamptz default now() + interval '14 days',
    cancelled_at timestamptz,
    payment_method_type text, -- 'bkash', 'sslcommerz', 'nagad', 'bank_wire'
    last_payment_reference text,
    custom_limits_override jsonb default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_company_sub_company on public.company_subscriptions(company_id);
create index if not exists idx_company_sub_status on public.company_subscriptions(status);
alter table public.company_subscriptions enable row level security;

-- 3. PLATFORM ADMINS TABLE (For cross-tenant super-admin management)
create table if not exists public.platform_admins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade unique,
    role text not null default 'super_admin' check (role in ('super_admin', 'billing_admin', 'support_agent')),
    created_at timestamptz not null default now()
);

-- 4. RLS POLICIES
create policy "Anyone can view active subscription plans"
    on public.subscription_plans for select
    using (is_active = true);

create policy "Active company users can view their subscription"
    on public.company_subscriptions for select
    using (public.auth_is_active_company_user(company_id));

create policy "Authorized company admins can update their subscription"
    on public.company_subscriptions for update
    using (
        public.auth_is_active_company_user(company_id)
        and public.auth_user_has_permission(company_id, 'settings.edit')
    );
