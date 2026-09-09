-- ==============================================================================
-- InkFlow / PrintERP SaaS - Migration 040: Seed Trial Plan & Repair Subscriptions
-- Ensures 'trial' is a first-class citizen in subscription_plans and repairs
-- any trial subscriptions that were linked to starter plan.
-- ==============================================================================

-- 1. Insert 'trial' into subscription_plans if not present
insert into public.subscription_plans (
    code,
    name,
    name_bn,
    description,
    price_monthly,
    price_yearly,
    max_users,
    max_branches,
    storage_gb,
    monthly_orders,
    max_customers,
    max_products,
    trial_days,
    features,
    is_active,
    sort_order
) values (
    'trial',
    'Free Trial (14 Days)',
    '১৪ দিনের ফ্রি ট্রায়াল',
    '14-day evaluation with full access to all ERP modules. No credit card required.',
    0.00,
    0.00,
    5,
    1,
    2,
    100,
    200,
    200,
    14,
    array[
        'basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan',
        'multi_department', 'inventory', 'inventory_rolls', 'production',
        'production_kanban', 'reports', 'reports_analytics', 'hr', 'hr_payroll',
        'job_costing', 'whatsapp_notifications', 'multi_branch', 'advanced_analytics',
        'advanced_permissions', 'custom_workflows', 'api_access', 'priority_support'
    ],
    true,
    0
)
on conflict (code) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description,
    trial_days = excluded.trial_days,
    features = excluded.features,
    sort_order = excluded.sort_order;

-- 2. Repair existing trial subscriptions:
-- If a company subscription has status = 'trial' and currently points to a non-trial plan_id,
-- point it to the trial plan_id.
do $$
declare
    v_trial_plan_id uuid;
begin
    select id into v_trial_plan_id
    from public.subscription_plans
    where code = 'trial'
    limit 1;

    if v_trial_plan_id is not null then
        update public.company_subscriptions
        set plan_id = v_trial_plan_id,
            updated_at = now()
        where status = 'trial'
          and plan_id != v_trial_plan_id;
    end if;
end;
$$;
