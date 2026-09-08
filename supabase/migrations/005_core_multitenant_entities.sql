-- ==============================================================================
-- PrintERP SaaS - Migration 005: Core Multi-Tenant Entities & RBAC
-- Entities: companies (extended), company_settings, branches, user_profiles,
--           roles, permissions, role_permissions, company_users, user_roles
-- Every tenant-owned table contains company_id referencing companies(id).
-- ==============================================================================

-- 1. EXTEND COMPANIES TABLE
alter table if exists public.companies
    add column if not exists whatsapp text,
    add column if not exists area text;

-- 2. COMPANY SETTINGS (1:1 per company)
create table if not exists public.company_settings (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null unique references public.companies(id) on delete cascade,
    invoice_prefix text not null default 'INV',
    quotation_prefix text not null default 'QT',
    challan_prefix text not null default 'CH',
    vat_enabled boolean not null default true,
    vat_rate numeric(5,2) not null default 7.50,
    default_currency text not null default 'BDT',
    default_language text not null default 'bn',
    phone text,
    whatsapp text,
    email text,
    logo_url text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_company_settings_company on public.company_settings(company_id);

-- 3. BRANCHES (1:N per company)
create table if not exists public.branches (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    name text not null,
    name_bn text,
    code text not null,
    phone text,
    address text,
    is_main boolean not null default false,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_branch_code unique (company_id, code)
);

create index if not exists idx_branches_company on public.branches(company_id);
create index if not exists idx_branches_is_active on public.branches(is_active);

-- 4. USER PROFILES (Global user profile attached to auth.users)
create table if not exists public.user_profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    full_name text not null,
    full_name_bn text,
    phone text,
    avatar_url text,
    preferred_locale text not null default 'bn',
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_email on public.user_profiles(email);
create index if not exists idx_user_profiles_phone on public.user_profiles(phone);

-- 5. ROLES (System default roles + custom company roles)
create table if not exists public.roles (
    id uuid primary key default gen_random_uuid(),
    company_id uuid references public.companies(id) on delete cascade, -- null indicates global system role
    name text not null,
    name_bn text,
    slug text not null,
    description text,
    is_system boolean not null default false,
    created_at timestamptz not null default now(),
    constraint unique_company_role_slug unique nulls not distinct (company_id, slug)
);

create index if not exists idx_roles_company on public.roles(company_id);
create index if not exists idx_roles_slug on public.roles(slug);

-- 6. PERMISSIONS
create table if not exists public.permissions (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    module text not null,
    name text not null,
    description text,
    created_at timestamptz not null default now()
);

create index if not exists idx_permissions_code on public.permissions(code);
create index if not exists idx_permissions_module on public.permissions(module);

-- 7. ROLE_PERMISSIONS
create table if not exists public.role_permissions (
    id uuid primary key default gen_random_uuid(),
    role_id uuid not null references public.roles(id) on delete cascade,
    permission_id uuid not null references public.permissions(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint unique_role_permission unique (role_id, permission_id)
);

create index if not exists idx_role_permissions_role on public.role_permissions(role_id);
create index if not exists idx_role_permissions_perm on public.role_permissions(permission_id);

-- 8. COMPANY_USERS (Multi-tenant membership with status and branch assignment)
create table if not exists public.company_users (
    id uuid primary key default gen_random_uuid(),
    company_id uuid not null references public.companies(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    branch_id uuid references public.branches(id) on delete set null,
    status text not null default 'active' check (status in ('active', 'disabled', 'invited')),
    invited_email text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint unique_company_user_membership unique (company_id, user_id)
);

create index if not exists idx_company_users_company on public.company_users(company_id);
create index if not exists idx_company_users_user on public.company_users(user_id);
create index if not exists idx_company_users_status on public.company_users(status);
create index if not exists idx_company_users_branch on public.company_users(branch_id);

-- 9. USER_ROLES (Association between company_users and roles)
create table if not exists public.user_roles (
    id uuid primary key default gen_random_uuid(),
    company_user_id uuid not null references public.company_users(id) on delete cascade,
    role_id uuid not null references public.roles(id) on delete cascade,
    company_id uuid not null references public.companies(id) on delete cascade,
    created_at timestamptz not null default now(),
    constraint unique_company_user_role unique (company_user_id, role_id)
);

create index if not exists idx_user_roles_user on public.user_roles(company_user_id);
create index if not exists idx_user_roles_role on public.user_roles(role_id);
create index if not exists idx_user_roles_company on public.user_roles(company_id);

-- SEED SYSTEM ROLES
insert into public.roles (id, company_id, name, name_bn, slug, description, is_system) values
('00000000-0000-0000-0000-000000000001', null, 'Owner', 'মালিক', 'owner', 'Full organization access including billing, deletion, and settings', true),
('00000000-0000-0000-0000-000000000002', null, 'Administrator', 'অ্যাডমিনিস্ট্রেটর', 'admin', 'Manage users, branches, inventory, and financial settings', true),
('00000000-0000-0000-0000-000000000003', null, 'Shop Manager', 'ম্যানেজার', 'manager', 'Oversee quotations, jobs, and shop-floor scheduling', true),
('00000000-0000-0000-0000-000000000004', null, 'Machine Operator', 'অপারেটর', 'operator', 'View assigned print/fabrication jobs and update stage statuses', true),
('00000000-0000-0000-0000-000000000005', null, 'Accountant', 'হিসাবরক্ষক', 'accountant', 'Manage customer billing, payments, due collection, and expenses', true),
('00000000-0000-0000-0000-000000000006', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার', 'designer', 'Manage prepress artwork, proof approvals, and customer files', true),
('00000000-0000-0000-0000-000000000007', null, 'Installation Technician', 'ইন্সটলার', 'installer', 'Handle on-site signage fitting, delivery challans, and completion signoffs', true)
on conflict (id) do update set
    name = excluded.name,
    name_bn = excluded.name_bn,
    description = excluded.description;

-- SEED GRANULAR PERMISSIONS
insert into public.permissions (code, module, name, description) values
('orders.view', 'job_orders', 'View Job Orders', 'View all job orders across assigned branches'),
('orders.create', 'job_orders', 'Create Job Orders', 'Create new print and fabrication job orders'),
('orders.edit', 'job_orders', 'Edit Job Orders', 'Modify job order specifications and rates'),
('orders.delete', 'job_orders', 'Delete Job Orders', 'Delete or cancel job orders'),
('quotations.view', 'quotations', 'View Quotations', 'View price quotations'),
('quotations.create', 'quotations', 'Create Quotations', 'Calculate area/running feet and generate quotations'),
('quotations.approve', 'quotations', 'Approve Quotations', 'Approve quotations and convert to job orders'),
('production.view', 'production', 'View Production Floor', 'Monitor active machines and job queues'),
('production.update_status', 'production', 'Update Job Status', 'Progress job from design to print, QC, and ready'),
('inventory.view', 'inventory', 'View Inventory', 'Check raw material stock levels (flex, vinyl, paper, LED, ACP)'),
('inventory.manage', 'inventory', 'Manage Inventory', 'Add stock purchases, adjustments, and supplier bills'),
('billing.view', 'billing', 'View Invoices', 'View invoices and payment records'),
('billing.create', 'billing', 'Create Invoices', 'Generate tax invoices and challans'),
('billing.collect_payment', 'billing', 'Collect Payments', 'Record cash, bKash, Nagad, and bank payments'),
('users.view', 'user_management', 'View Users', 'View company members and branches'),
('users.manage', 'user_management', 'Manage Users', 'Invite, add, disable, activate, and assign roles to users'),
('branches.manage', 'branch_management', 'Manage Branches', 'Add and edit commercial branches/factories'),
('settings.manage', 'settings', 'Manage Company Settings', 'Modify company details, prefixes, and VAT preferences')
on conflict (code) do update set
    name = excluded.name,
    description = excluded.description;

-- SEED OWNER PERMISSIONS (Owner gets all permissions)
insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-0000-0000-000000000001', p.id
from public.permissions p
on conflict (role_id, permission_id) do nothing;
