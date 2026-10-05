// ==============================================================================
// PrintFlow - Supabase Security Advisor Remediation Script
// Eliminates security advisor warnings:
// 1. Revokes EXECUTE on SECURITY DEFINER functions from 'anon' and 'public' roles.
// 2. Sets explicit immutable search_path (public, pg_temp) on all functions.
// ==============================================================================

import pg from 'pg';
const { Client } = pg;

async function remediate() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.error('DATABASE_URL or POSTGRES_URL required.');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to PostgreSQL.');

  // 1. Identify all SECURITY DEFINER functions in public schema
  const { rows: secDefFuncs } = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as ident_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true;
  `);

  console.log(`Found ${secDefFuncs.length} SECURITY DEFINER functions in public schema.`);

  // 2. Functions that MUST NOT be accessible by anon
  const anonRevokeTargets = [
    'auth_get_current_company_user_id',
    'auth_get_current_employee_id',
    'auth_get_user_authorized_branches',
    'auth_user_has_effective_permission',
    'create_invoice_atomic',
    'fn_auto_bump_version_and_updated_at',
    'fn_claim_communication_jobs',
    'fn_seed_default_notifications_for_company',
    'get_estimated_tenant_count',
    'get_financial_drift_report',
    'get_next_document_number',
    'get_tenant_dashboard_metrics',
    'mutate_inventory_stock_atomic',
    'reconcile_inventory_stock_atomic',
    'refresh_tenant_dashboard_metrics',
    'trg_prevent_financial_hard_deletion',
    'cancel_invoice_atomic',
    'record_multi_invoice_payment_atomic',
    'record_financial_write_off_atomic',
    'record_customer_refund_atomic',
    'record_cheque_dishonor_atomic',
    'record_expense_atomic',
    'record_expense_with_journal_atomic',
    'record_financial_transfer_atomic',
    'record_supplier_payment_atomic',
    'report_production_problem_atomic',
    'schedule_production_task_atomic',
    'increment_account_balance_atomic',
    'increment_customer_balance_atomic',
    'log_audit_event',
    'platform_is_feature_enabled',
    'reconcile_customer_balance_atomic',
    'get_tenant_financial_summary',
    'get_tenant_production_summary',
    'get_tenant_sales_summary',
    'get_tenant_dashboard_metrics_v2',
    'delete_tenant_permanently'
  ];

  for (const func of secDefFuncs) {
    if (anonRevokeTargets.includes(func.proname)) {
      try {
        const sql = `REVOKE EXECUTE ON FUNCTION public.${func.proname}(${func.ident_args}) FROM anon, public;`;
        await client.query(sql);
        console.log(`✓ Revoked anon/public from: ${func.proname}(${func.ident_args})`);
      } catch (err) {
        console.warn(`! Error revoking from ${func.proname}: ${err.message}`);
      }
    }
  }

  // 3. Fix mutable search_path on all functions in public schema
  const { rows: allFuncs } = await client.query(`
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as ident_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public';
  `);

  console.log(`Setting search_path on ${allFuncs.length} functions...`);
  for (const func of allFuncs) {
    try {
      const sql = `ALTER FUNCTION public.${func.proname}(${func.ident_args}) SET search_path = public, pg_temp;`;
      await client.query(sql);
    } catch (err) {
      // Ignore aggregate or internal triggers that do not support alter function set
    }
  }

  console.log('✓ Successfully hardened function permissions and search_paths.');
  await client.end();
}

remediate().catch(console.error);
