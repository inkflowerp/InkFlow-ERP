-- ==============================================================================
-- InkFlow SaaS - Migration 064: V3 Advanced Inventory Management
-- Supports:
--   1. Inventory Locations / Multi-Warehouse per tenant and branch
--   2. Enhanced Material Master (SKUs, Specifications, Dimensions, Reorder Thresholds)
--   3. Partitioned Stock Balances with Zero-Negative Database Constraints
--   4. Material Requests & Approvals linked to Production Tasks
--   5. Material Issuance & Production Floor Release
--   6. Actual Consumption, Remnants, Wastage & Returns Accounting
--   7. Discrete Reusable Remnant Tracking (W x L with barcode readiness)
--   8. Inter-Location Stock Transfers & Stock Adjustment Counts
--   9. Immutable Stock Ledger & Atomic PostgreSQL Concurrency Protection
--   10. Strict Multi-Tenant Row Level Security
-- ==============================================================================

-- 1. INVENTORY LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_locations_company_code UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_locations_company ON public.inventory_locations(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_locations_branch ON public.inventory_locations(company_id, branch_id);
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;

-- 2. ENHANCE MATERIALS TABLE
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS color TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS thickness NUMERIC(8,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS width NUMERIC(10,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS length NUMERIC(10,2);
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS dimension_unit TEXT DEFAULT 'inch';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS base_unit TEXT DEFAULT 'pcs';
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS reorder_level NUMERIC(12,2) DEFAULT 0;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Remove category/unit check constraint if exists to allow flexible print/signage categories
DO $$
BEGIN
    ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_category_check;
    ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_unit_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_materials_branch ON public.materials(company_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_materials_active ON public.materials(company_id, is_active);

-- 3. INVENTORY STOCK BALANCES TABLE (Per Location)
CREATE TABLE IF NOT EXISTS public.inventory_stock_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    available_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    issued_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (issued_quantity >= 0),
    damaged_quantity NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (damaged_quantity >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_stock_balances_loc UNIQUE (company_id, material_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_company ON public.inventory_stock_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_material ON public.inventory_stock_balances(company_id, material_id);
CREATE INDEX IF NOT EXISTS idx_stock_balances_location ON public.inventory_stock_balances(company_id, location_id);
ALTER TABLE public.inventory_stock_balances ENABLE ROW LEVEL SECURITY;

-- 4. PRODUCTION TASK MATERIAL REQUIREMENTS TABLE
CREATE TABLE IF NOT EXISTS public.production_task_material_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    production_task_id UUID NOT NULL REFERENCES public.production_tasks(id) ON DELETE CASCADE,
    material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
    material_name TEXT NOT NULL,
    required_quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (required_quantity > 0),
    unit TEXT NOT NULL DEFAULT 'pcs',
    width NUMERIC(10,2),
    height NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_mat_req_task ON public.production_task_material_requirements(company_id, production_task_id);
ALTER TABLE public.production_task_material_requirements ENABLE ROW LEVEL SECURITY;

-- 5. MATERIAL REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.material_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    request_number TEXT NOT NULL,
    production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
    requested_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requested_by_name TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'urgent', 'very_urgent')),
    status TEXT NOT NULL DEFAULT 'requested' CHECK (
        status IN ('draft', 'requested', 'approved', 'rejected', 'partially_issued', 'issued', 'cancelled')
    ),
    notes TEXT,
    approved_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by_name TEXT,
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_material_requests_company_number UNIQUE (company_id, request_number)
);

CREATE INDEX IF NOT EXISTS idx_material_requests_company ON public.material_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON public.material_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_material_requests_task ON public.material_requests(company_id, production_task_id);
ALTER TABLE public.material_requests ENABLE ROW LEVEL SECURITY;

-- 6. MATERIAL REQUEST ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.material_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.material_requests(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    requested_quantity NUMERIC(12,2) NOT NULL CHECK (requested_quantity > 0),
    approved_quantity NUMERIC(12,2) DEFAULT 0,
    issued_quantity NUMERIC(12,2) DEFAULT 0,
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (
        status IN ('pending', 'approved', 'rejected', 'partially_issued', 'issued', 'cancelled')
    ),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_material_req_items_req ON public.material_request_items(company_id, request_id);
ALTER TABLE public.material_request_items ENABLE ROW LEVEL SECURITY;

-- 7. MATERIAL ISSUES TABLE
CREATE TABLE IF NOT EXISTS public.material_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    issue_number TEXT NOT NULL,
    request_id UUID REFERENCES public.material_requests(id) ON DELETE SET NULL,
    production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE SET NULL,
    issued_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issued_by_name TEXT NOT NULL,
    issued_to_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issued_to_name TEXT,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_material_issues_company_number UNIQUE (company_id, issue_number)
);

CREATE INDEX IF NOT EXISTS idx_material_issues_company ON public.material_issues(company_id);
CREATE INDEX IF NOT EXISTS idx_material_issues_task ON public.material_issues(company_id, production_task_id);
ALTER TABLE public.material_issues ENABLE ROW LEVEL SECURITY;

-- 8. MATERIAL ISSUE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.material_issue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    issue_id UUID NOT NULL REFERENCES public.material_issues(id) ON DELETE CASCADE,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    issued_quantity NUMERIC(12,2) NOT NULL CHECK (issued_quantity > 0),
    unit TEXT NOT NULL,
    unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_material_issue_items_issue ON public.material_issue_items(company_id, issue_id);
ALTER TABLE public.material_issue_items ENABLE ROW LEVEL SECURITY;

-- 9. INVENTORY REMNANTS TABLE (Discrete Reusable Offcuts)
CREATE TABLE IF NOT EXISTS public.inventory_remnants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    remnant_code TEXT NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    original_roll_id UUID REFERENCES public.inventory_rolls(id) ON DELETE SET NULL,
    width NUMERIC(10,2) NOT NULL,
    length NUMERIC(10,2) NOT NULL,
    dimension_unit TEXT NOT NULL DEFAULT 'inch' CHECK (dimension_unit IN ('inch', 'ft', 'mm', 'cm', 'm')),
    area_sft NUMERIC(10,2) NOT NULL DEFAULT 0,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    condition TEXT NOT NULL DEFAULT 'usable' CHECK (condition IN ('prime', 'usable', 'blemished')),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'consumed', 'scrapped')),
    created_from_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_remnants_code UNIQUE (company_id, remnant_code)
);

CREATE INDEX IF NOT EXISTS idx_inventory_remnants_company ON public.inventory_remnants(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_remnants_status ON public.inventory_remnants(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_remnants_mat ON public.inventory_remnants(company_id, material_id);
ALTER TABLE public.inventory_remnants ENABLE ROW LEVEL SECURITY;

-- 10. INVENTORY TRANSFERS TABLE (Dual-entry Location Transfers)
CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    from_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    to_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    material_name TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
    unit TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    performed_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_transfers_number UNIQUE (company_id, transfer_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_company ON public.inventory_transfers(company_id);
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- 11. INVENTORY ADJUSTMENTS TABLE (Physical Count Reconciliation)
CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    adjustment_number TEXT NOT NULL,
    material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL,
    reason_code TEXT NOT NULL CHECK (
        reason_code IN ('physical_count_diff', 'damage_found', 'opening_correction', 'data_correction', 'other')
    ),
    reason_notes TEXT,
    system_quantity_before NUMERIC(12,2) NOT NULL,
    physical_quantity NUMERIC(12,2) NOT NULL,
    quantity_change NUMERIC(12,2) NOT NULL,
    unit TEXT NOT NULL,
    authorized_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_inventory_adjustments_number UNIQUE (company_id, adjustment_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_company ON public.inventory_adjustments(company_id);
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- 12. ENHANCE STOCK LEDGER
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.inventory_locations(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS production_task_id UUID REFERENCES public.production_tasks(id) ON DELETE SET NULL;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS normalized_quantity NUMERIC(14,4);
ALTER TABLE public.stock_ledger ADD COLUMN IF NOT EXISTS normalized_unit TEXT;

-- 13. ATOMIC INVENTORY MUTATION STORED PROCEDURE WITH ROW-LEVEL LOCK
CREATE OR REPLACE FUNCTION public.mutate_inventory_stock_atomic(
    p_company_id UUID,
    p_material_id UUID,
    p_location_id UUID,
    p_quantity_change NUMERIC,
    p_transaction_type TEXT,
    p_reference_id TEXT DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_task_id UUID DEFAULT NULL,
    p_unit_cost NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL,
    p_performed_by_name TEXT DEFAULT 'System'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_material RECORD;
    v_new_balance NUMERIC;
    v_loc_balance NUMERIC;
    v_ledger_id UUID;
    v_default_loc_id UUID;
BEGIN
    -- 1. Lock material record to serialize concurrent stock updates
    SELECT * INTO v_material
    FROM public.materials
    WHERE id = p_material_id AND company_id = p_company_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Material not found: %', p_material_id USING ERRCODE = 'P0002';
    END IF;

    -- Calculate new total material balance
    v_new_balance := v_material.current_stock + p_quantity_change;

    -- Prevent negative stock
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock: Material % (%) has available stock %, cannot deduct %.',
            v_material.name, v_material.sku, v_material.current_stock, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 2. Resolve or create default location if location_id not supplied
    IF p_location_id IS NULL THEN
        SELECT id INTO v_default_loc_id
        FROM public.inventory_locations
        WHERE company_id = p_company_id AND is_default = TRUE
        LIMIT 1;

        IF v_default_loc_id IS NULL THEN
            SELECT id INTO v_default_loc_id
            FROM public.inventory_locations
            WHERE company_id = p_company_id
            ORDER BY created_at ASC
            LIMIT 1;
        END IF;

        IF v_default_loc_id IS NULL THEN
            INSERT INTO public.inventory_locations (company_id, name, code, is_default, is_active)
            values (p_company_id, 'Main Store', 'MAIN', TRUE, TRUE)
            RETURNING id INTO v_default_loc_id;
        END IF;

        p_location_id := v_default_loc_id;
    END IF;

    -- 3. Upsert Location Stock Balance with Row Lock
    INSERT INTO public.inventory_stock_balances (
        company_id,
        material_id,
        location_id,
        available_quantity,
        updated_at
    ) VALUES (
        p_company_id,
        p_material_id,
        p_location_id,
        GREATEST(0, p_quantity_change),
        NOW()
    )
    ON CONFLICT (company_id, material_id, location_id)
    DO UPDATE SET
        available_quantity = public.inventory_stock_balances.available_quantity + p_quantity_change,
        updated_at = NOW()
    RETURNING available_quantity INTO v_loc_balance;

    IF v_loc_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient stock in location for material %: Cannot deduct %.',
            v_material.name, abs(p_quantity_change)
        USING ERRCODE = '23514';
    END IF;

    -- 4. Update Material master cached current_stock
    UPDATE public.materials
    SET current_stock = v_new_balance,
        updated_at = NOW()
    WHERE id = p_material_id AND company_id = p_company_id;

    -- 5. Insert immutable audit ledger record
    INSERT INTO public.stock_ledger (
        company_id,
        material_id,
        location_id,
        production_task_id,
        transaction_type,
        quantity_change,
        unit,
        balance_after,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        performed_by_name,
        created_at
    ) VALUES (
        p_company_id,
        p_material_id,
        p_location_id,
        p_task_id,
        p_transaction_type,
        p_quantity_change,
        v_material.unit,
        v_new_balance,
        p_unit_cost,
        abs(p_quantity_change) * p_unit_cost,
        p_reference_id,
        p_reference_type,
        p_notes,
        p_performed_by_name,
        NOW()
    )
    RETURNING id INTO v_ledger_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'material_id', p_material_id,
        'new_balance', v_new_balance,
        'location_balance', v_loc_balance,
        'ledger_id', v_ledger_id
    );
END;
$$;

-- 14. ROW LEVEL SECURITY POLICIES FOR NEW V3 TABLES
DROP POLICY IF EXISTS "Active company users can view inventory locations" ON public.inventory_locations;
CREATE POLICY "Active company users can view inventory locations"
    ON public.inventory_locations FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage inventory locations" ON public.inventory_locations;
CREATE POLICY "Authorized company users can manage inventory locations"
    ON public.inventory_locations FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.view')
            OR public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'inventory.create')
        )
    );

DROP POLICY IF EXISTS "Active company users can view stock balances" ON public.inventory_stock_balances;
CREATE POLICY "Active company users can view stock balances"
    ON public.inventory_stock_balances FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view material requests" ON public.material_requests;
CREATE POLICY "Active company users can view material requests"
    ON public.material_requests FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can manage material requests" ON public.material_requests;
CREATE POLICY "Authorized company users can manage material requests"
    ON public.material_requests FOR ALL
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.view')
            OR public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'production.view')
            OR public.auth_user_has_permission(company_id, 'production.edit')
        )
    );

DROP POLICY IF EXISTS "Active company users can view material request items" ON public.material_request_items;
CREATE POLICY "Active company users can view material request items"
    ON public.material_request_items FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view material issues" ON public.material_issues;
CREATE POLICY "Active company users can view material issues"
    ON public.material_issues FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view remnants" ON public.inventory_remnants;
CREATE POLICY "Active company users can view remnants"
    ON public.inventory_remnants FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view transfers" ON public.inventory_transfers;
CREATE POLICY "Active company users can view transfers"
    ON public.inventory_transfers FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view adjustments" ON public.inventory_adjustments;
CREATE POLICY "Active company users can view adjustments"
    ON public.inventory_adjustments FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can view task requirements" ON public.production_task_material_requirements;
CREATE POLICY "Active company users can view task requirements"
    ON public.production_task_material_requirements FOR SELECT
    USING (public.auth_is_active_company_user(company_id));
