-- ==============================================================================
-- InkFlow ERP - Migration 111: Enforce Forced RLS & Tenant Immutability
-- 
-- 1. Adds missing tenant RLS policies for:
--    - public.sales_order_items (joins to sales_orders.company_id)
--    - public.goods_received_notes (direct company_id)
--    - public.document_number_counters (direct company_id)
--    - public.material_issue_items (direct company_id)
-- 2. Enforces FORCE ROW LEVEL SECURITY across all 191 tables in public schema
--    so table owners and internal queries cannot accidentally bypass RLS.
-- 3. Attaches tenant immutability trigger to all tables with company_id
--    to prevent cross-tenant record hijacking via company_id updates.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. MISSING RLS POLICIES FOR 4 UNCOVERED TABLES
-- ------------------------------------------------------------------------------

-- A. SALES ORDER ITEMS
ALTER TABLE IF EXISTS public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sales_order_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active company users can view sales order items" ON public.sales_order_items;
CREATE POLICY "Active company users can view sales order items"
    ON public.sales_order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_orders o
            WHERE o.id = sales_order_items.order_id
              AND public.auth_is_active_company_user(o.company_id)
        )
    );

DROP POLICY IF EXISTS "Authorized company users can insert sales order items" ON public.sales_order_items;
CREATE POLICY "Authorized company users can insert sales order items"
    ON public.sales_order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sales_orders o
            WHERE o.id = sales_order_items.order_id
              AND public.auth_is_active_company_user(o.company_id)
              AND public.auth_user_has_permission(o.company_id, 'order.create')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can update sales order items" ON public.sales_order_items;
CREATE POLICY "Authorized company users can update sales order items"
    ON public.sales_order_items FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_orders o
            WHERE o.id = sales_order_items.order_id
              AND public.auth_is_active_company_user(o.company_id)
              AND public.auth_user_has_permission(o.company_id, 'order.edit')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can delete sales order items" ON public.sales_order_items;
CREATE POLICY "Authorized company users can delete sales order items"
    ON public.sales_order_items FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.sales_orders o
            WHERE o.id = sales_order_items.order_id
              AND public.auth_is_active_company_user(o.company_id)
              AND public.auth_user_has_permission(o.company_id, 'order.delete')
        )
    );

-- B. GOODS RECEIVED NOTES
ALTER TABLE IF EXISTS public.goods_received_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.goods_received_notes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active company users can view goods received notes" ON public.goods_received_notes;
CREATE POLICY "Active company users can view goods received notes"
    ON public.goods_received_notes FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can insert goods received notes" ON public.goods_received_notes;
CREATE POLICY "Authorized company users can insert goods received notes"
    ON public.goods_received_notes FOR INSERT
    WITH CHECK (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.create')
            OR public.auth_user_has_permission(company_id, 'purchase.create')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can update goods received notes" ON public.goods_received_notes;
CREATE POLICY "Authorized company users can update goods received notes"
    ON public.goods_received_notes FOR UPDATE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'purchase.edit')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can delete goods received notes" ON public.goods_received_notes;
CREATE POLICY "Authorized company users can delete goods received notes"
    ON public.goods_received_notes FOR DELETE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.delete')
            OR public.auth_user_has_permission(company_id, 'purchase.delete')
        )
    );

-- C. DOCUMENT NUMBER COUNTERS
ALTER TABLE IF EXISTS public.document_number_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.document_number_counters FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active company users can view document number counters" ON public.document_number_counters;
CREATE POLICY "Active company users can view document number counters"
    ON public.document_number_counters FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can insert document number counters" ON public.document_number_counters;
CREATE POLICY "Active company users can insert document number counters"
    ON public.document_number_counters FOR INSERT
    WITH CHECK (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Active company users can update document number counters" ON public.document_number_counters;
CREATE POLICY "Active company users can update document number counters"
    ON public.document_number_counters FOR UPDATE
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can delete document number counters" ON public.document_number_counters;
CREATE POLICY "Authorized company users can delete document number counters"
    ON public.document_number_counters FOR DELETE
    USING (
        public.auth_is_active_company_user(company_id)
        AND public.auth_user_has_permission(company_id, 'settings.edit')
    );

-- D. MATERIAL ISSUE ITEMS
ALTER TABLE IF EXISTS public.material_issue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.material_issue_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active company users can view material issue items" ON public.material_issue_items;
CREATE POLICY "Active company users can view material issue items"
    ON public.material_issue_items FOR SELECT
    USING (public.auth_is_active_company_user(company_id));

DROP POLICY IF EXISTS "Authorized company users can insert material issue items" ON public.material_issue_items;
CREATE POLICY "Authorized company users can insert material issue items"
    ON public.material_issue_items FOR INSERT
    WITH CHECK (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.create')
            OR public.auth_user_has_permission(company_id, 'production.create')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can update material issue items" ON public.material_issue_items;
CREATE POLICY "Authorized company users can update material issue items"
    ON public.material_issue_items FOR UPDATE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.edit')
            OR public.auth_user_has_permission(company_id, 'production.edit')
        )
    );

DROP POLICY IF EXISTS "Authorized company users can delete material issue items" ON public.material_issue_items;
CREATE POLICY "Authorized company users can delete material issue items"
    ON public.material_issue_items FOR DELETE
    USING (
        public.auth_is_active_company_user(company_id)
        AND (
            public.auth_user_has_permission(company_id, 'inventory.delete')
            OR public.auth_user_has_permission(company_id, 'production.delete')
        )
    );

-- ------------------------------------------------------------------------------
-- 2. FORCE ROW LEVEL SECURITY ON ALL PUBLIC SCHEMA TABLES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', tbl.tablename);
    END LOOP;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TENANT IMMUTABILITY: PREVENT RE-ASSIGNING RECORDS ACROSS TENANTS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_enforce_tenant_immutability()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.company_id IS NOT NULL AND NEW.company_id IS DISTINCT FROM OLD.company_id THEN
        RAISE EXCEPTION 'Security Violation: Modifying tenant ownership (company_id) is strictly forbidden.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    col RECORD;
BEGIN
    FOR col IN (
        SELECT table_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND column_name = 'company_id'
          AND table_name NOT IN ('companies')
    ) LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_prevent_tenant_switch ON public.%I;
            CREATE TRIGGER trg_prevent_tenant_switch
            BEFORE UPDATE ON public.%I
            FOR EACH ROW
            EXECUTE FUNCTION public.trg_enforce_tenant_immutability();
        ', col.table_name, col.table_name);
    END LOOP;
END $$;
