-- ==============================================================================
-- InkFlow ERP SaaS - Migration 076: Sync Canonical Plan Features & Business Entitlements
-- Fixes missing canonical features in subscription_plans for Business & Enterprise tiers.
--
-- Feature Distribution:
--   Starter (4):
--     basic_sales, basic_customers, quotation_pdf, delivery_challan
--   Business (18):
--     Starter (4) + multi_department, inventory, inventory_rolls, production,
--     production_kanban, reports, reports_analytics, hr, hr_payroll, job_costing,
--     whatsapp_notifications, sms_notifications, machinery, attendance_qr
--   Enterprise (24):
--     Business (18) + multi_branch, advanced_analytics, advanced_permissions,
--     custom_workflows, api_access, priority_support
--   Trial (24):
--     All 24 canonical features
-- ==============================================================================

-- 1. Update Starter Plan
update public.subscription_plans
set features = array[
    'basic_sales',
    'basic_customers',
    'quotation_pdf',
    'delivery_challan'
],
updated_at = now()
where code = 'starter';

-- 2. Update Business Plan
update public.subscription_plans
set features = array[
    'basic_sales',
    'basic_customers',
    'quotation_pdf',
    'delivery_challan',
    'multi_department',
    'inventory',
    'inventory_rolls',
    'production',
    'production_kanban',
    'reports',
    'reports_analytics',
    'hr',
    'hr_payroll',
    'job_costing',
    'whatsapp_notifications',
    'sms_notifications',
    'machinery',
    'attendance_qr'
],
updated_at = now()
where code = 'business';

-- 3. Update Enterprise Plan
update public.subscription_plans
set features = array[
    'basic_sales',
    'basic_customers',
    'quotation_pdf',
    'delivery_challan',
    'multi_department',
    'inventory',
    'inventory_rolls',
    'production',
    'production_kanban',
    'reports',
    'reports_analytics',
    'hr',
    'hr_payroll',
    'job_costing',
    'whatsapp_notifications',
    'sms_notifications',
    'machinery',
    'attendance_qr',
    'multi_branch',
    'advanced_analytics',
    'advanced_permissions',
    'custom_workflows',
    'api_access',
    'priority_support'
],
updated_at = now()
where code = 'enterprise';

-- 4. Update Trial Plan
update public.subscription_plans
set features = array[
    'basic_sales',
    'basic_customers',
    'quotation_pdf',
    'delivery_challan',
    'multi_department',
    'inventory',
    'inventory_rolls',
    'production',
    'production_kanban',
    'reports',
    'reports_analytics',
    'hr',
    'hr_payroll',
    'job_costing',
    'whatsapp_notifications',
    'sms_notifications',
    'machinery',
    'attendance_qr',
    'multi_branch',
    'advanced_analytics',
    'advanced_permissions',
    'custom_workflows',
    'api_access',
    'priority_support'
],
updated_at = now()
where code = 'trial';

-- 5. Update Plan Versions if present
do $$
begin
    if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'plan_versions') then
        update public.plan_versions pv
        set features = sp.features
        from public.subscription_plans sp
        where pv.plan_id = sp.id;
    end if;
end;
$$;
