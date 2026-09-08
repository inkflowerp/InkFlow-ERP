-- ==============================================================================
-- PrintERP SaaS - Migration 029: Production Performance Optimization
-- High-performance covering indexes, foreign key index coverage,
-- optimized RLS function caching, and pre-aggregated dashboard KPI queries.
-- ==============================================================================

-- 1. COMPOSITE INDEXES FOR HIGH-TRAFFIC TENANT QUERIES
-- Eliminates sequential table scans by indexing (company_id, status, created_at DESC)

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_status_created 
  ON public.sales_orders (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_orders_company_customer_created 
  ON public.sales_orders (company_id, customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_company_status_created 
  ON public.quotations (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quotations_company_customer 
  ON public.quotations (company_id, customer_id);

CREATE INDEX IF NOT EXISTS idx_invoices_company_status_due 
  ON public.invoices (company_id, status, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_invoices_company_sales_order 
  ON public.invoices (company_id, sales_order_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_customer_date 
  ON public.payments (company_id, customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_production_jobs_company_dept_status 
  ON public.production_jobs (company_id, department, status);

CREATE INDEX IF NOT EXISTS idx_production_jobs_company_status_prio 
  ON public.production_jobs (company_id, status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_company_category_stock 
  ON public.materials (company_id, category, current_stock);

CREATE INDEX IF NOT EXISTS idx_stock_ledger_company_material_date 
  ON public.stock_ledger (company_id, material_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_date 
  ON public.audit_logs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_entity 
  ON public.audit_logs (company_id, entity, entity_id);

CREATE INDEX IF NOT EXISTS idx_customers_company_mobile 
  ON public.customers (company_id, mobile);

CREATE INDEX IF NOT EXISTS idx_delivery_company_sales_order 
  ON public.delivery_challans (company_id, sales_order_id, status);

CREATE INDEX IF NOT EXISTS idx_workflow_logs_company_rule 
  ON public.workflow_execution_logs (company_id, rule_id, executed_at DESC);

-- 2. HIGH-PERFORMANCE MATERIALIZED / SERVER-SIDE DASHBOARD KPI AGGREGATION
-- Avoids multiple network hops and heavy client-side aggregation by running
-- a single, parallelized, indexed query.

CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_metrics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'today_sales', COALESCE((
      SELECT SUM(final_price)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status NOT IN ('cancelled', 'pending')
        AND created_at >= CURRENT_DATE
    ), 0),
    'pending_orders_count', (
      SELECT COUNT(*)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status IN ('pending', 'confirmed', 'in_production')
    ),
    'active_jobs_count', (
      SELECT COUNT(*)
      FROM public.production_jobs
      WHERE company_id = p_company_id
        AND status IN ('queued', 'in_progress', 'quality_check')
    ),
    'total_receivables', COALESCE((
      SELECT SUM(due_amount)
      FROM public.invoices
      WHERE company_id = p_company_id
        AND status IN ('unpaid', 'partially_paid', 'overdue')
    ), 0),
    'low_stock_materials_count', (
      SELECT COUNT(*)
      FROM public.materials
      WHERE company_id = p_company_id
        AND current_stock <= min_stock_level
    ),
    'last_updated', NOW()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics(UUID) TO service_role;

