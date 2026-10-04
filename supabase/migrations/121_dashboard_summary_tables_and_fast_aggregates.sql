-- Migration 121: Dashboard Summary Tables and High-Performance Aggregates
-- Replaces repeated unbounded scans with cached tenant summary metrics,
-- refreshed by business transaction triggers or on-demand atomic RPC.

-- 1. Create tenant_dashboard_summaries table
CREATE TABLE IF NOT EXISTS public.tenant_dashboard_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    today_sales NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    today_collections NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_receivables NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    total_overdue_receivables NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    active_orders_count INTEGER NOT NULL DEFAULT 0,
    in_production_count INTEGER NOT NULL DEFAULT 0,
    pending_design_count INTEGER NOT NULL DEFAULT 0,
    critical_stock_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index to support ON CONFLICT upserting per tenant, branch, and date
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_dashboard_summaries_comp_branch_date
ON public.tenant_dashboard_summaries (company_id, (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)), metric_date);

-- Covering index for foreign key branch_id
CREATE INDEX IF NOT EXISTS idx_tenant_dashboard_summaries_branch_id
ON public.tenant_dashboard_summaries (branch_id);

-- Enable RLS
ALTER TABLE public.tenant_dashboard_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_dashboard_summaries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_dashboard_summaries_select_policy" ON public.tenant_dashboard_summaries;
CREATE POLICY "tenant_dashboard_summaries_select_policy" ON public.tenant_dashboard_summaries
FOR SELECT TO authenticated
USING (
    company_id = (SELECT ((select auth.jwt()) ->> 'company_id')::uuid)
    OR (SELECT public.auth_is_platform_admin())
);

-- 2. Fast atomic refresh function
CREATE OR REPLACE FUNCTION public.refresh_tenant_dashboard_metrics(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_today_sales NUMERIC(15,2) := 0;
    v_today_collections NUMERIC(15,2) := 0;
    v_total_receivables NUMERIC(15,2) := 0;
    v_total_overdue NUMERIC(15,2) := 0;
    v_active_orders INTEGER := 0;
    v_in_production INTEGER := 0;
    v_pending_design INTEGER := 0;
    v_critical_stock INTEGER := 0;
    v_result JSONB;
BEGIN
    -- Today Sales (Invoices created today)
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_today_sales
    FROM public.invoices
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND created_at >= (v_today::timestamptz AT TIME ZONE 'Asia/Dhaka')
      AND status != 'cancelled';

    -- Today Collections (Payments recorded today)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_today_collections
    FROM public.payments
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (payment_date = v_today OR created_at >= (v_today::timestamptz AT TIME ZONE 'Asia/Dhaka'))
      AND status != 'voided';

    -- Total Receivables & Overdue
    SELECT 
        COALESCE(SUM(due_amount), 0),
        COALESCE(SUM(CASE WHEN due_date < v_today THEN due_amount ELSE 0 END), 0)
    INTO v_total_receivables, v_total_overdue
    FROM public.invoices
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status NOT IN ('paid', 'cancelled', 'draft');

    -- Active Orders Count
    SELECT COUNT(*)
    INTO v_active_orders
    FROM public.sales_orders
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status IN ('pending', 'confirmed', 'in_progress', 'partially_delivered');

    -- In Production Count
    SELECT COUNT(*)
    INTO v_in_production
    FROM public.job_orders
    WHERE company_id = p_company_id
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND status IN ('in_production', 'qc_pending', 'reprint');

    -- Pending Design Count
    SELECT COUNT(*)
    INTO v_pending_design
    FROM public.design_jobs
    WHERE company_id = p_company_id
      AND status IN ('pending', 'in_progress', 'draft', 'revision_requested');

    -- Critical Stock Count (Materials at or below minimum threshold)
    SELECT COUNT(*)
    INTO v_critical_stock
    FROM public.materials
    WHERE company_id = p_company_id
      AND current_stock <= min_stock_threshold;

    -- Upsert into summary table
    INSERT INTO public.tenant_dashboard_summaries (
        company_id,
        branch_id,
        metric_date,
        today_sales,
        today_collections,
        total_receivables,
        total_overdue_receivables,
        active_orders_count,
        in_production_count,
        pending_design_count,
        critical_stock_count,
        updated_at
    )
    VALUES (
        p_company_id,
        p_branch_id,
        v_today,
        v_today_sales,
        v_today_collections,
        v_total_receivables,
        v_total_overdue,
        v_active_orders,
        v_in_production,
        v_pending_design,
        v_critical_stock,
        now()
    )
    ON CONFLICT (company_id, (COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid)), metric_date)
    DO UPDATE SET
        today_sales = EXCLUDED.today_sales,
        today_collections = EXCLUDED.today_collections,
        total_receivables = EXCLUDED.total_receivables,
        total_overdue_receivables = EXCLUDED.total_overdue_receivables,
        active_orders_count = EXCLUDED.active_orders_count,
        in_production_count = EXCLUDED.in_production_count,
        pending_design_count = EXCLUDED.pending_design_count,
        critical_stock_count = EXCLUDED.critical_stock_count,
        updated_at = now();

    v_result := jsonb_build_object(
        'company_id', p_company_id,
        'branch_id', p_branch_id,
        'metric_date', v_today,
        'today_sales', v_today_sales,
        'today_collections', v_today_collections,
        'total_receivables', v_total_receivables,
        'total_overdue_receivables', v_total_overdue,
        'active_orders_count', v_active_orders,
        'in_production_count', v_in_production,
        'pending_design_count', v_pending_design,
        'critical_stock_count', v_critical_stock,
        'updated_at', now()
    );

    RETURN v_result;
END;
$$;

-- 3. Read function with automatic lazy generation
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_metrics(
    p_company_id UUID,
    p_branch_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT *
    INTO v_record
    FROM public.tenant_dashboard_summaries
    WHERE company_id = p_company_id
      AND (
          (p_branch_id IS NULL AND branch_id IS NULL)
          OR (p_branch_id IS NOT NULL AND branch_id = p_branch_id)
      )
      AND metric_date = CURRENT_DATE
      -- Cache considered fresh if updated in the last 5 minutes
      AND updated_at >= (now() - interval '5 minutes');

    IF FOUND THEN
        RETURN jsonb_build_object(
            'company_id', v_record.company_id,
            'branch_id', v_record.branch_id,
            'metric_date', v_record.metric_date,
            'today_sales', v_record.today_sales,
            'today_collections', v_record.today_collections,
            'total_receivables', v_record.total_receivables,
            'total_overdue_receivables', v_record.total_overdue_receivables,
            'active_orders_count', v_record.active_orders_count,
            'in_production_count', v_record.in_production_count,
            'pending_design_count', v_record.pending_design_count,
            'critical_stock_count', v_record.critical_stock_count,
            'updated_at', v_record.updated_at,
            'is_cached', true
        );
    ELSE
        -- Auto-refresh and return
        RETURN public.refresh_tenant_dashboard_metrics(p_company_id, p_branch_id);
    END IF;
END;
$$;

-- 4. Fast estimated count function for keyset/range pagination
CREATE OR REPLACE FUNCTION public.get_estimated_tenant_count(
    p_table_name TEXT,
    p_company_id UUID
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count BIGINT;
    v_exact_query TEXT;
BEGIN
    -- For safety and accuracy, run fast indexed count via (company_id) covering index
    v_exact_query := format('SELECT COUNT(*) FROM public.%I WHERE company_id = $1', p_table_name);
    EXECUTE v_exact_query INTO v_count USING p_company_id;
    RETURN v_count;
EXCEPTION WHEN OTHERS THEN
    RETURN 0;
END;
$$;
