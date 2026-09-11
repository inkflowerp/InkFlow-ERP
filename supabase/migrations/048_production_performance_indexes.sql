-- ==============================================================================
-- PrintERP / InkFlow SaaS - Migration 048: Production Performance Indexes & Scalability Hardening
-- Adds schema-verified composite covering indexes, foreign key index coverage,
-- and hardened server-side PL/pgSQL aggregation function for 100k+ record scalability.
-- ==============================================================================

-- 1. SALES ORDER ITEMS & TIMELINE
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order_id
  ON public.sales_order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_timeline_events_order_id
  ON public.order_timeline_events (order_id, created_at ASC);

-- 2. JOB ORDERS & PRODUCTION
CREATE INDEX IF NOT EXISTS idx_job_orders_company_order_status
  ON public.job_orders (company_id, order_id, status);

CREATE INDEX IF NOT EXISTS idx_production_reworks_job_id
  ON public.production_reworks (production_job_id, created_at DESC);

-- 3. CRM, CUSTOMERS & COMMUNICATIONS
CREATE INDEX IF NOT EXISTS idx_customers_company_name
  ON public.customers (company_id, name);

CREATE INDEX IF NOT EXISTS idx_customer_comms_company_cust_created
  ON public.customer_communications (company_id, customer_id, created_at DESC);

-- 4. QUOTATIONS & ACTIVITIES
CREATE INDEX IF NOT EXISTS idx_quotation_items_quotation_id
  ON public.quotation_items (quotation_id);

CREATE INDEX IF NOT EXISTS idx_quotation_activities_quotation_created
  ON public.quotation_activities (quotation_id, created_at DESC);

-- 5. INVOICES, PAYMENTS & BILLING
CREATE INDEX IF NOT EXISTS idx_invoices_company_invoice_number
  ON public.invoices (company_id, invoice_number);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id
  ON public.invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_payments_company_customer_date
  ON public.payments (company_id, customer_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_invoice
  ON public.payment_allocations (payment_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_financial_write_offs_company_invoice
  ON public.financial_write_offs (company_id, invoice_id);

-- 6. INVENTORY & STOCK LEDGER
CREATE INDEX IF NOT EXISTS idx_materials_company_sku
  ON public.materials (company_id, sku);

CREATE INDEX IF NOT EXISTS idx_inventory_rolls_material_status
  ON public.inventory_rolls (material_id, status);

-- 7. HR, ATTENDANCE & PAYROLL
CREATE INDEX IF NOT EXISTS idx_attendance_records_company_employee_date
  ON public.attendance_records (company_id, employee_id, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_records_company_date_status
  ON public.attendance_records (company_id, attendance_date DESC, verification_status);

CREATE INDEX IF NOT EXISTS idx_attendance_locations_company_active
  ON public.attendance_locations (company_id, is_active);

CREATE INDEX IF NOT EXISTS idx_payroll_items_period_employee
  ON public.payroll_items (payroll_period_id, employee_id);

-- 8. COMMUNICATIONS, GATEWAYS & LOGS
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_status_created
  ON public.email_logs (tenant_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_queue_tenant_status_attempts
  ON public.email_queue (tenant_id, status, attempts, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_tenant_status_created
  ON public.gateway_transactions (tenant_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_company_user_read
  ON public.in_app_notifications (company_id, user_id, is_read, created_at DESC);

-- 9. PLATFORM & MULTI-TENANT SUBSCRIPTIONS
CREATE INDEX IF NOT EXISTS idx_company_users_company_user_status
  ON public.company_users (company_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company_status
  ON public.company_subscriptions (company_id, status, plan_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_account_status
  ON public.platform_subscriptions (platform_account_id, status, plan_id);

CREATE INDEX IF NOT EXISTS idx_platform_subscription_events_account_created
  ON public.platform_subscription_events (platform_account_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_target_created
  ON public.platform_audit_logs (target_company_id, created_at DESC);

-- 10. OPTIMIZED SERVER-SIDE DASHBOARD AGGREGATION RPC
CREATE OR REPLACE FUNCTION public.get_tenant_dashboard_metrics_v2(
  p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  -- Verify caller authorization if called from an authenticated client session
  IF auth.role() IS NOT NULL AND auth.role() <> 'service_role' THEN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Authentication required';
    END IF;
    IF NOT (public.auth_is_active_company_user(p_company_id) OR public.auth_is_platform_admin()) THEN
      RAISE EXCEPTION 'Unauthorized cross-tenant dashboard access denied';
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'today_sales', COALESCE((
      SELECT SUM(final_price)
      FROM public.sales_orders
      WHERE company_id = p_company_id
        AND status NOT IN ('cancelled', 'draft')
        AND created_at >= CURRENT_DATE
    ), 0),
    'today_collections', COALESCE((
      SELECT SUM(amount)
      FROM public.payments
      WHERE company_id = p_company_id
        AND payment_date >= CURRENT_DATE
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
        AND status IN ('queued', 'in_progress', 'printing', 'finishing')
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

-- Revoke default public execution & grant strictly to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_dashboard_metrics_v2(UUID) TO service_role;

