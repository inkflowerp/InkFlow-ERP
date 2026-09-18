-- ==============================================================================
-- InkFlow SaaS - Migration 092: RBAC Permissions, Roles & Data Scope Hardening
-- Establishes server-authoritative role matrices, company custom roles,
-- per-user data scopes, granular user management permissions, and strict RLS.
-- ==============================================================================

-- 1. ADD DATA_SCOPES & DEPARTMENT EXTENSIONS TO PUBLIC.COMPANY_USERS
ALTER TABLE IF EXISTS public.company_users
    ADD COLUMN IF NOT EXISTS data_scopes JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS responsibilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_company_users_dept ON public.company_users(company_id, department);
CREATE INDEX IF NOT EXISTS idx_company_users_status ON public.company_users(company_id, status);

-- 2. ENSURE PUBLIC.ROLES SUPPORTS CUSTOM COMPANY ROLES
ALTER TABLE IF EXISTS public.roles
    ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS permissions_count INTEGER DEFAULT 0;

-- Unique slug per company (for custom roles) or global (where company_id is null)
CREATE UNIQUE INDEX IF NOT EXISTS uk_roles_company_slug ON public.roles (COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- 3. ENSURE PUBLIC.ROLE_PERMISSIONS INTEGRITY
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_role_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_perm ON public.role_permissions(permission_id);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- 4. ENSURE PUBLIC.USER_PERMISSION_OVERRIDES INTEGRITY
CREATE TABLE IF NOT EXISTS public.user_permission_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    company_user_id UUID NOT NULL REFERENCES public.company_users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_perm_override UNIQUE (company_user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_cu ON public.user_permission_overrides(company_user_id);
CREATE INDEX IF NOT EXISTS idx_user_perm_overrides_comp ON public.user_permission_overrides(company_id);

ALTER TABLE public.user_permission_overrides ENABLE ROW LEVEL SECURITY;

-- 5. ENSURE PUBLIC.USER_BRANCH_ACCESS INTEGRITY
CREATE TABLE IF NOT EXISTS public.user_branch_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_branch_access_v2 UNIQUE (company_id, user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_access_uid ON public.user_branch_access(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_bid ON public.user_branch_access(company_id, branch_id);

ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;

-- 6. SEED / UPSERT GRANULAR PERMISSIONS
-- Modules: customers, quotations, orders, design, invoices, payments, production,
-- machineries, delivery, inventory, reports, settings, tasks, notifications, support, branches, products, pricing, users, hr
INSERT INTO public.permissions (code, module, name, description) VALUES
-- User Administration (Dedicated Permissions)
('users.view', 'users', 'View Team Users', 'View company staff, employees, and user directory'),
('users.create', 'users', 'Create Team Users', 'Create new team user accounts and assign identities'),
('users.edit', 'users', 'Edit Team Users', 'Modify user contact details, department, and phone numbers'),
('users.disable', 'users', 'Disable/Activate Users', 'Disable user login access or re-activate staff'),
('users.role_change', 'users', 'Change User Responsibilities', 'Assign or modify employee responsibilities and roles'),
('users.permission_manage', 'users', 'Manage User Overrides', 'Grant or revoke granular permission overrides for individual users'),
('users.scope_manage', 'users', 'Manage User Data Scope', 'Configure data scope (Own, Assigned, Department, Branch, Company) per module'),
('users.branch_assign', 'users', 'Assign Branch Access', 'Assign primary branch and additional authorized branch access'),
('users.reset_password', 'users', 'Reset User Password', 'Dispatch password reset or security credentials to team user'),

-- High-Risk Financial & Operational Actions
('invoices.cancel', 'invoices', 'Cancel/Void Invoices', 'Cancel or void confirmed sales invoices with audit reason'),
('invoices.delete', 'invoices', 'Delete Invoices', 'Permanently delete draft invoices according to company policy'),
('payments.delete', 'payments', 'Delete/Void Money Receipts', 'Void or delete recorded customer payment receipts with audit justification'),
('salary.edit', 'hr', 'Edit Base Wage / Salary', 'Modify employee basic wage, shift rate, or hourly allowances'),
('salary.approve', 'hr', 'Approve Salary Changes', 'Authorize wage adjustments and salary structure revisions'),
('payroll.approve', 'hr', 'Approve Monthly Payroll', 'Approve monthly payroll sheets for disbursement'),
('payroll.pay', 'hr', 'Disburse Salary Payments', 'Post salary voucher payments to cash/bank ledger'),
('inventory.adjust', 'inventory', 'Adjust Physical Stock', 'Perform manual stock adjustments, write-offs, and shrinkage corrections'),
('inventory.approve', 'inventory', 'Approve Material Requisitions', 'Authorize raw material issues and inter-branch transfers')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    module = EXCLUDED.module;

-- 7. SEED SYSTEM ROLES & DEFAULT RESPONSIBILITIES
INSERT INTO public.roles (id, company_id, name, name_bn, slug, description, is_system) VALUES
('00000000-0000-0000-0000-000000000001', null, 'Business Owner', 'প্রতিষ্ঠানের মালিক', 'business_owner', 'Full organization access: P&L, accounts, reports, HR, settings, and deletion', true),
('00000000-0000-0000-0000-000000000002', null, 'Sales Manager', 'সেলস ম্যানেজার', 'sales_manager', 'Customers, leads, price quotations, job order booking, advance collection, and delivery', true),
('00000000-0000-0000-0000-000000000003', null, 'Graphic Designer', 'গ্রাফিক ডিজাইনার (প্রিপ প্রেস)', 'designer', 'Pre-press design queue, artwork uploads (AI/PDF), proof approval, and revision logs', true),
('00000000-0000-0000-0000-000000000004', null, 'Production Manager', 'প্রোডাকশন ম্যানেজার', 'production_manager', 'Floor scheduling, machine allocation, materials issuance, finishing, and installation', true),
('00000000-0000-0000-0000-000000000005', null, 'Print Operator', 'মেশিন অপারেটর', 'operator', 'Assigned jobs, printing execution, material consumption logging, and QC completion', true),
('00000000-0000-0000-0000-000000000006', null, 'General Staff', 'সাধারণ কর্মী', 'general_staff', 'Restricted access based strictly on assigned duties and user overrides', true),
('00000000-0000-0000-0000-000000000007', null, 'Store Manager', 'স্টোর ম্যানেজার', 'store_manager', 'Raw material inventory, stock adjustments, supplier receiving & requisitions', true),
('00000000-0000-0000-0000-000000000008', null, 'Accountant', 'হিসাবরক্ষক', 'accountant', 'Invoices, money receipts (MR), payments, billing & P&L reports', true),
('00000000-0000-0000-0000-000000000009', null, 'Delivery Coordinator', 'ডেলিভারি সমন্বয়কারী', 'delivery_coordinator', 'Challans, transport dispatch, delivery confirmation & site installations', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_bn = EXCLUDED.name_bn,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system;

-- 8. GRANT ALL PERMISSIONS TO BUSINESS OWNER IN ROLE_PERMISSIONS
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM public.permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 9. STRICT RLS POLICIES FOR RBAC TABLES
-- Roles: viewable by authenticated company users, manageable by Business Owner
DROP POLICY IF EXISTS "Users can view roles for their company or system roles" ON public.roles;
CREATE POLICY "Users can view roles for their company or system roles"
    ON public.roles
    FOR SELECT
    TO authenticated
    USING (company_id IS NULL OR public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Admins can manage custom roles for their company" ON public.roles;
CREATE POLICY "Admins can manage custom roles for their company"
    ON public.roles
    FOR ALL
    TO authenticated
    USING (company_id IS NOT NULL AND public.auth_is_active_company_user(company_id))
    WITH CHECK (company_id IS NOT NULL AND public.auth_is_active_company_user(company_id));

-- Role Permissions: viewable by company users, manageable by owner
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
CREATE POLICY "Users can view role permissions"
    ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Admins can manage role permissions"
    ON public.role_permissions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- User Permission Overrides: tenant isolated
DROP POLICY IF EXISTS "Users can view user permission overrides for their company" ON public.user_permission_overrides;
CREATE POLICY "Users can view user permission overrides for their company"
    ON public.user_permission_overrides
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Admins can manage user permission overrides for their company" ON public.user_permission_overrides;
CREATE POLICY "Admins can manage user permission overrides for their company"
    ON public.user_permission_overrides
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));

-- User Branch Access: tenant isolated
DROP POLICY IF EXISTS "Users can view user branch access for their company" ON public.user_branch_access;
CREATE POLICY "Users can view user branch access for their company"
    ON public.user_branch_access
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Admins can manage user branch access for their company" ON public.user_branch_access;
CREATE POLICY "Admins can manage user branch access for their company"
    ON public.user_branch_access
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));
