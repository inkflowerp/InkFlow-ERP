-- ==============================================================================
-- Migration: 046_enable_realtime_synchronization.sql
-- Description: Enables PostgreSQL Realtime replication for all PrintERP tables
-- Sets REPLICA IDENTITY FULL and adds operational tables to supabase_realtime publication
-- ==============================================================================

DO $$
BEGIN
  -- 1. Ensure supabase_realtime publication exists
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
DECLARE
  tbl_name text;
  tables text[] := ARRAY[
    'companies',
    'company_users',
    'company_subscriptions',
    'subscription_events',
    'subscription_invoices',
    'roles',
    'branches',
    'customers',
    'customer_communications',
    'suppliers',
    'supplier_material_prices',
    'sales_orders',
    'sales_order_items',
    'job_orders',
    'order_timeline_events',
    'quotations',
    'quotation_items',
    'quotation_activities',
    'products',
    'product_price_history',
    'materials',
    'inventory_rolls',
    'stock_ledger',
    'material_wastages',
    'production_jobs',
    'production_reworks',
    'invoices',
    'invoice_items',
    'payments',
    'payment_adjustments',
    'expenses',
    'bank_accounts',
    'cash_book_entries',
    'purchase_orders',
    'purchase_order_items',
    'delivery_challans',
    'delivery_challan_items',
    'installations',
    'job_costings',
    'design_jobs',
    'design_versions',
    'employees',
    'attendance',
    'salary_advances',
    'daily_labor_logs',
    'payroll_periods',
    'payroll_items',
    'in_app_notifications',
    'communication_logs',
    'message_templates',
    'channel_configs',
    'company_tax_settings',
    'document_numbering',
    'document_templates',
    'notification_settings',
    'automation_rules',
    'audit_logs',
    'platform_companies',
    'platform_plans',
    'platform_feature_flags',
    'platform_users',
    'platform_incidents',
    'platform_system_settings'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl_name
    ) THEN
      -- Enable REPLICA IDENTITY FULL so UPDATE and DELETE events include full row payloads
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL;', tbl_name);

      -- Add table to supabase_realtime publication if not already a member
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = tbl_name
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', tbl_name);
      END IF;
    END IF;
  END LOOP;
END $$;
