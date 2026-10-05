-- ==============================================================================
-- PrintFlow SaaS - Migration 122: Optimize Supabase Realtime Publication
-- & Optimistic Concurrency Control (OCC) Version Triggers
-- ==============================================================================
-- 1. Restricts supabase_realtime publication to only authoritative live operational tables:
--    invoices, payments, sales_orders, quotations, job_orders, production_tasks,
--    design_jobs, inventory_stock_balances, stock_ledger, in_app_notifications,
--    support_messages, attendance_records, delivery_challans, platform_notifications, companies.
-- 2. Removes sensitive/high-churn tables (payroll_*, salary_*, audit_logs, workforce_audit_logs, etc.)
-- 3. Sets REPLICA IDENTITY FULL on all live operational tables.
-- 4. Ensures `version` and `updated_at` columns and automatic version increment triggers
--    on core transactional tables for stale write detection (OCC).
-- ==============================================================================

-- 1. Ensure supabase_realtime publication exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- 2. Set authoritative table list for supabase_realtime publication
ALTER PUBLICATION supabase_realtime SET TABLE 
  public.invoices,
  public.payments,
  public.sales_orders,
  public.quotations,
  public.job_orders,
  public.production_tasks,
  public.design_jobs,
  public.inventory_stock_balances,
  public.stock_ledger,
  public.in_app_notifications,
  public.support_messages,
  public.attendance_records,
  public.delivery_challans,
  public.platform_notifications,
  public.companies;

-- 3. Enable REPLICA IDENTITY FULL on all approved operational tables
ALTER TABLE public.invoices REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.sales_orders REPLICA IDENTITY FULL;
ALTER TABLE public.quotations REPLICA IDENTITY FULL;
ALTER TABLE public.job_orders REPLICA IDENTITY FULL;
ALTER TABLE public.production_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.design_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_stock_balances REPLICA IDENTITY FULL;
ALTER TABLE public.stock_ledger REPLICA IDENTITY FULL;
ALTER TABLE public.in_app_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.attendance_records REPLICA IDENTITY FULL;
ALTER TABLE public.delivery_challans REPLICA IDENTITY FULL;
ALTER TABLE public.platform_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.companies REPLICA IDENTITY FULL;

-- 4. Optimistic Concurrency Control (OCC): Add version and updated_at columns
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.production_tasks ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.production_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.design_jobs ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.design_jobs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.inventory_stock_balances ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.inventory_stock_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.delivery_challans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. Trigger function to auto-increment version and update timestamp on update
CREATE OR REPLACE FUNCTION public.fn_auto_bump_version_and_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach trigger to each OCC transactional table
DO $$
DECLARE
  tbl_name TEXT;
  occ_tables TEXT[] := ARRAY[
    'sales_orders',
    'invoices',
    'quotations',
    'job_orders',
    'production_tasks',
    'design_jobs',
    'inventory_stock_balances',
    'delivery_challans',
    'payments'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY occ_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = 'trg_bump_version_' || tbl_name
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_bump_version_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fn_auto_bump_version_and_updated_at();',
        tbl_name, tbl_name
      );
    END IF;
  END LOOP;
END $$;
