-- ==============================================================================
-- InkFlow SaaS - Migration 070: Multi-Branch & Advanced Management Engine (V9)
-- Extends branches table, introduces branch transfer requests, inter-branch
-- financial transfers, cross-branch employee assignments, workflow configurations,
-- and user branch access with strict multi-tenant Row Level Security.
-- ==============================================================================

-- 1. EXTEND PUBLIC.BRANCHES TABLE
ALTER TABLE IF EXISTS public.branches
    ADD COLUMN IF NOT EXISTS legal_name TEXT,
    ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS manager_name TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS division_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS district_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS upazila_id INTEGER REFERENCES public.locations_master(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS area TEXT,
    ADD COLUMN IF NOT EXISTS full_address TEXT,
    ADD COLUMN IF NOT EXISTS full_address_bn TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'archived')),
    ADD COLUMN IF NOT EXISTS operating_hours TEXT,
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Dhaka',
    ADD COLUMN IF NOT EXISTS document_numbering_config JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS financial_settings JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS production_capabilities JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT;

CREATE INDEX IF NOT EXISTS idx_branches_status ON public.branches(company_id, status);
CREATE INDEX IF NOT EXISTS idx_branches_manager ON public.branches(manager_id);
CREATE INDEX IF NOT EXISTS idx_branches_division ON public.branches(division_id);
CREATE INDEX IF NOT EXISTS idx_branches_district ON public.branches(district_id);

-- 2. BRANCH TRANSFER REQUESTS (Multi-Branch Inventory Movements)
CREATE TABLE IF NOT EXISTS public.branch_transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    from_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'requested', 'approved', 'rejected', 'dispatched', 'in_transit', 'received', 'cancelled')),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    dispatched_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    dispatched_by_name TEXT,
    dispatched_at TIMESTAMPTZ,
    received_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    received_by_name TEXT,
    received_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_branch_transfer_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_branch_transfers_company ON public.branch_transfer_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_from_branch ON public.branch_transfer_requests(company_id, from_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_to_branch ON public.branch_transfer_requests(company_id, to_branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_status ON public.branch_transfer_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_material ON public.branch_transfer_requests(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_branch_transfers_idempotency ON public.branch_transfer_requests(company_id, idempotency_key);

ALTER TABLE public.branch_transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update branch transfer requests for their company"
    ON public.branch_transfer_requests
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 3. INTER-BRANCH FINANCIAL TRANSFERS
CREATE TABLE IF NOT EXISTS public.inter_branch_financial_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    from_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
    currency TEXT NOT NULL DEFAULT 'BDT',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'requested', 'approved', 'completed', 'cancelled')),
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    reference TEXT,
    notes TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inter_branch_financial_transfer_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_company ON public.inter_branch_financial_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_from ON public.inter_branch_financial_transfers(company_id, from_branch_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_to ON public.inter_branch_financial_transfers(company_id, to_branch_id);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_status ON public.inter_branch_financial_transfers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inter_branch_fin_idempotency ON public.inter_branch_financial_transfers(company_id, idempotency_key);

ALTER TABLE public.inter_branch_financial_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update inter branch financial transfers for their company"
    ON public.inter_branch_financial_transfers
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 4. EMPLOYEE BRANCH ASSIGNMENTS (Cross-Branch Work & Temporary Deployments)
CREATE TABLE IF NOT EXISTS public.employee_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    is_temporary BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'cancelled')),
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_company ON public.employee_branch_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_emp ON public.employee_branch_assignments(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_branch ON public.employee_branch_assignments(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_emp_branch_assign_dates ON public.employee_branch_assignments(company_id, start_date, end_date);

ALTER TABLE public.employee_branch_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR INSERT
    TO authenticated
    WITH CHECK (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can update employee branch assignments for their company"
    ON public.employee_branch_assignments
    FOR UPDATE
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

-- 5. WORKFLOW CONFIGURATIONS (Declarative Routing & Approval Rules)
CREATE TABLE IF NOT EXISTS public.workflow_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    workflow_type TEXT NOT NULL CHECK (workflow_type IN ('inventory_transfer', 'cross_branch_production', 'financial_transfer', 'procurement_routing')),
    rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_workflow_config UNIQUE (company_id, branch_id, workflow_type)
);

CREATE INDEX IF NOT EXISTS idx_workflow_config_company ON public.workflow_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_workflow_config_branch ON public.workflow_configurations(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_workflow_config_type ON public.workflow_configurations(company_id, workflow_type);

ALTER TABLE public.workflow_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workflow configurations for their company"
    ON public.workflow_configurations
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Users can insert/update workflow configurations for their company"
    ON public.workflow_configurations
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));

-- 6. USER BRANCH ACCESS (Selected Branches Data Scope)
CREATE TABLE IF NOT EXISTS public.user_branch_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_user_branch_access UNIQUE (company_id, user_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_user_branch_access_user ON public.user_branch_access(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_branch_access_branch ON public.user_branch_access(company_id, branch_id);

ALTER TABLE public.user_branch_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view user branch access for their company"
    ON public.user_branch_access
    FOR SELECT
    TO authenticated
    USING (public.auth_is_active_company_user(company_id));

CREATE POLICY "Admins can manage user branch access for their company"
    ON public.user_branch_access
    FOR ALL
    TO authenticated
    USING (public.auth_is_active_company_user(company_id))
    WITH CHECK (public.auth_is_active_company_user(company_id));

-- 7. SEED BRANCH MANAGEMENT PERMISSIONS
INSERT INTO public.permissions (code, module, name, description) VALUES
('branch.view', 'branch_management', 'View Branches', 'View company branches and their operational statuses'),
('branch.create', 'branch_management', 'Create Branches', 'Add new company branches, factories, and retail outlets'),
('branch.edit', 'branch_management', 'Edit Branches', 'Modify branch details, operating parameters, and addresses'),
('branch.delete', 'branch_management', 'Delete/Archive Branches', 'Archive or deactivate existing branches'),
('branch.manage', 'branch_management', 'Manage All Branches', 'Full administrative control over all company branches'),
('branch.transfer.request', 'branch_management', 'Request Branch Transfer', 'Initiate cross-branch inventory or financial transfer requests'),
('branch.transfer.approve', 'branch_management', 'Approve Branch Transfer', 'Approve or reject pending inter-branch transfers'),
('branch.transfer.dispatch', 'branch_management', 'Dispatch Branch Transfer', 'Dispatch approved stock from source branch'),
('branch.transfer.receive', 'branch_management', 'Receive Branch Transfer', 'Acknowledge and receive transferred stock at target branch')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- Grant all new branch permissions to system Owner role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', p.id
FROM public.permissions p
WHERE p.code LIKE 'branch.%'
ON CONFLICT (role_id, permission_id) DO NOTHING;
