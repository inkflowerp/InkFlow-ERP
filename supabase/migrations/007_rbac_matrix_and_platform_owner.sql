-- ==============================================================================
-- PrintERP SaaS - Migration 007: Complete RBAC Matrix & Platform Owner
-- Fine-grained Module / Resource / Action permissions system
-- 7 Primary Roles:
--   1. Platform Owner (Platform-level Superadmin)
--   2. Business Owner (Tenant Executive)
--   3. Sales Manager
--   4. Graphic Designer
--   5. Production Manager
--   6. Print Operator
--   7. General Staff
-- ==============================================================================

-- 1. PLATFORM OWNER / SUPERADMIN TABLE (Completely isolated from tenant data)
create table if not exists public.platform_admins (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references auth.users(id) on delete cascade,
    email text not null unique,
    full_name text not null,
    role text not null default 'platform_owner' check (role in ('platform_owner', 'platform_support')),
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- 2. EXPAND PERMISSIONS SCHEMA (Module / Resource / Action)
alter table public.permissions
    add column if not exists resource text,
    add column if not exists action text check (action in ('view', 'create', 'edit', 'delete', 'approve', 'full_control'));

-- 3. USER PERMISSION OVERRIDES (User-level overrides: grant or revoke)
create table if not exists public.user_permission_overrides (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    company_user_id uuid not null references public.company_users(id) on delete cascade,
    permission_id uuid not null references public.permissions(id) on delete cascade,
    is_granted boolean not null default true, -- true = grant, false = explicit deny
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_user_permission_override unique (company_user_id, permission_id)
);

create index if not exists idx_user_perm_overrides_user on public.user_permission_overrides(company_user_id);
create index if not exists idx_user_perm_overrides_comp on public.user_permission_overrides(company_id);
alter table public.user_permission_overrides enable row level security;

-- 4. PLATFORM SUBSCRIPTION PLANS & FEATURE FLAGS
create table if not exists public.platform_plans (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code text unique not null,
    price_bdt_monthly numeric(10,2) not null,
    price_bdt_yearly numeric(10,2) not null,
    max_users integer not null,
    max_branches integer not null,
    features jsonb not null default '[]'::jsonb,
    is_active boolean not null default true,
    created_at timestamptz not null default now()
);

create table if not exists public.platform_feature_flags (
    id uuid primary key default gen_random_uuid(),
    key text unique not null,
    name text not null,
    description text,
    is_enabled boolean not null default false,
    created_at timestamptz not null default now()
);

alter table public.platform_plans enable row level security;
alter table public.platform_feature_flags enable row level security;

-- 5. SEED PRIMARY ROLES
delete from public.role_permissions;
delete from public.roles where is_system = true;

insert into public.roles (id, company_id, name, name_bn, slug, description, is_system) values
('00000000-0000-0000-0000-000000000001', null, 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'business_owner', 'Full organization access: P&L, accounts, reports, HR, settings, and deletion', true),
('00000000-0000-0000-0000-000000000002', null, 'Sales Manager', 'সেলস ম্যানেজার', 'sales_manager', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true),
('00000000-0000-0000-0000-000000000003', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'designer', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true),
('00000000-0000-0000-0000-000000000004', null, 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'production_manager', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true),
('00000000-0000-0000-0000-000000000005', null, 'Print Operator', 'মেশিন অপারেটর', 'operator', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true),
('00000000-0000-0000-0000-000000000006', null, 'General Staff', 'সাধারণ কর্মী', 'general_staff', 'Restricted access based strictly on assigned duties and user overrides', true)
on conflict (id) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    slug = excluded.slug,
    description = excluded.description;

-- 6. POPULATE COMPLETE MODULE / RESOURCE / ACTION PERMISSIONS
-- Resources: Customer, Quotation, Order, Invoice, Payment, Production, Inventory, Purchase, Supplier, Delivery, HR, Payroll, Reports, Settings
delete from public.role_permissions;
delete from public.permissions;

do $$
declare
    rec record;
    act text;
    perm_code text;
    perm_name text;
    perm_id uuid;
begin
    -- Standard Resources
    for rec in (
        select 'sales' as mod, 'customer' as res, 'Customer' as label union all
        select 'sales', 'quotation', 'Quotation' union all
        select 'sales', 'order', 'Job Order' union all
        select 'billing', 'invoice', 'Invoice' union all
        select 'billing', 'payment', 'Payment' union all
        select 'production', 'production', 'Production Floor' union all
        select 'inventory', 'inventory', 'Material Inventory' union all
        select 'inventory', 'purchase', 'Stock Purchase' union all
        select 'inventory', 'supplier', 'Supplier' union all
        select 'fulfillment', 'delivery', 'Delivery & Installation' union all
        select 'hr', 'hr', 'Human Resources' union all
        select 'hr', 'payroll', 'Payroll' union all
        select 'analytics', 'reports', 'Reports & Analytics' union all
        select 'settings', 'settings', 'Company Settings'
    ) loop
        for act in select unnest(array['view', 'create', 'edit', 'delete', 'approve', 'full_control']) loop
            perm_code := rec.res || '.' || act;
            perm_name := initcap(act) || ' ' || rec.label;
            insert into public.permissions (code, module, resource, action, name, description)
            values (
                perm_code,
                rec.mod,
                rec.res,
                act,
                perm_name,
                'Ability to ' || act || ' ' || rec.label
            );
        end loop;
    end loop;
end $$;

-- 7. SEED ROLE PERMISSION PRESETS
-- Business Owner gets full_control on everything
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001', id from public.permissions;

-- Sales Manager gets view/create/edit/approve on Customer, Quotation, Order, Payment, Delivery
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000002', id from public.permissions
where resource in ('customer', 'quotation', 'order', 'payment', 'delivery', 'reports')
  and action in ('view', 'create', 'edit', 'approve');

-- Designer gets view/create/edit/approve on Quotation, Order, Production
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000003', id from public.permissions
where resource in ('order', 'production', 'quotation')
  and action in ('view', 'create', 'edit', 'approve');

-- Production Manager gets view/create/edit/approve/full_control on Production, Inventory, Delivery, Supplier
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000004', id from public.permissions
where resource in ('production', 'inventory', 'purchase', 'supplier', 'delivery')
  and action in ('view', 'create', 'edit', 'approve', 'full_control');

-- Print Operator gets view & edit on Production and Inventory (for logging consumption)
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000005', id from public.permissions
where resource in ('production', 'inventory')
  and action in ('view', 'edit');

-- General Staff gets view on Order and Delivery
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000006', id from public.permissions
where resource in ('order', 'delivery')
  and action in ('view');

-- 8. SEED DEFAULT PLATFORM PLANS & FLAGS
insert into public.platform_plans (name, code, price_bdt_monthly, price_bdt_yearly, max_users, max_branches, features) values
('Starter Press', 'starter', 2500.00, 25000.00, 3, 1, '["Basic Quotations", "Job Orders", "Thermal Print Receipts", "1 Branch"]'::jsonb),
('Growth Signage', 'growth', 6000.00, 60000.00, 10, 3, '["Everything in Starter", "Bilingual Invoices", "Production Floor Board", "Material Inventory", "3 Branches", "SMS Alerts"]'::jsonb),
('Enterprise Factory', 'enterprise', 15000.00, 150000.00, 50, 10, '["Everything in Growth", "Unlimited Branches", "Custom RBAC Matrix", "Audit Logs", "WhatsApp API", "Mushak 6.3 Tax Invoicing"]'::jsonb)
on conflict (code) do nothing;

insert into public.platform_feature_flags (key, name, description, is_enabled) values
('whatsapp_notifications', 'WhatsApp Cloud API Order Status', 'Send automated PDF challans and proof previews to customer WhatsApp numbers', true),
('mushak_6_3', 'NBR Mushak 6.3 Automated Tax Invoicing', 'Formal National Board of Revenue VAT invoice layout', true),
('ai_job_estimator', 'AI Dimensional Print Estimator', 'Smart cost estimation for flex, acrylic, and offset jobs', true),
('bd_sms_gateway', 'Bangladeshi SMS Gateway', 'OTP and delivery readiness alerts via Greenweb/SSL Wireless', true)
on conflict (key) do nothing;

-- 9. POSTGRESQL RLS FUNCTIONS

-- Verifies if user is a Platform Owner (Superadmin)
create or replace function public.auth_is_platform_owner()
returns boolean as $$
begin
    return exists (
        select 1
        from public.platform_admins
        where user_id = auth.uid()
          and is_active = true
    );
end;
$$ language plpgsql security definer;

-- Enhanced Permission Check (Checks User Overrides first, then Role Permissions)
create or replace function public.auth_user_has_permission(target_company_id uuid, required_permission text)
returns boolean as $$
declare
    v_company_user_id uuid;
    v_user_role text;
    v_override boolean;
begin
    -- 1. Platform Owners always have system-wide permission
    if public.auth_is_platform_owner() then
        return true;
    end if;

    -- 2. Find company user
    select id into v_company_user_id
    from public.company_users
    where company_id = target_company_id
      and user_id = auth.uid()
      and status = 'active';

    if v_company_user_id is null then
        return false;
    end if;

    -- 3. Business Owners always have full permission in their company
    if public.auth_get_user_company_role(target_company_id) in ('business_owner', 'owner') then
        return true;
    end if;

    -- 4. Check User-Level Permission Overrides
    select upo.is_granted into v_override
    from public.user_permission_overrides upo
    join public.permissions p on p.id = upo.permission_id
    where upo.company_user_id = v_company_user_id
      and (p.code = required_permission or p.code = split_part(required_permission, '.', 1) || '.full_control')
    limit 1;

    if v_override is not null then
        return v_override;
    end if;

    -- 5. Check Role-Level Permissions
    return exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.permissions p on p.id = rp.permission_id
        where ur.company_user_id = v_company_user_id
          and (
              p.code = required_permission
              or p.code = split_part(required_permission, '.', 1) || '.full_control'
          )
    );
end;
$$ language plpgsql security definer;

-- 10. RLS POLICIES FOR PLATFORM TABLES
create policy "Platform owners can view and manage platform_admins"
    on public.platform_admins for all
    using (public.auth_is_platform_owner());

create policy "Platform owners can manage platform_plans"
    on public.platform_plans for all
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Platform owners can manage platform_feature_flags"
    on public.platform_feature_flags for all
    using (public.auth_is_platform_owner() or auth.uid() is not null);

create policy "Users can view overrides in their company"
    on public.user_permission_overrides for select
    using (public.auth_is_active_company_user(company_id));

create policy "Admins can manage user_permission_overrides"
    on public.user_permission_overrides for all
    using (
        public.auth_is_active_company_user(company_id)
        and (
            public.auth_get_user_company_role(company_id) in ('business_owner', 'owner', 'admin')
            or public.auth_is_platform_owner()
        )
    );
