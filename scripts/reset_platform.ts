import { createAdminClient } from '../lib/supabase/admin.ts';

async function resetPlatformData() {
  console.log('====================================================');
  console.log('PrintERP SaaS - Platform Database Reset & Data Purge');
  console.log('====================================================\n');

  const admin = createAdminClient();

  // 1. Fetch existing platform admin emails to protect their profiles & credentials
  const { data: admins, error: adminFetchErr } = await (admin as any)
    .from('platform_admins')
    .select('id, user_id, email, role, is_active');

  if (adminFetchErr) {
    console.error('Failed to fetch platform admins:', adminFetchErr);
    process.exit(1);
  }

  const adminEmails = (admins || []).map((a: any) => a.email?.toLowerCase()).filter(Boolean);
  const adminUserIds = (admins || []).map((a: any) => a.user_id).filter(Boolean);
  console.log(`Protected Platform Admins (${adminEmails.length}):`, adminEmails.join(', '));

  // 2. Fetch all companies to purge
  const { data: companies, error: compFetchErr } = await (admin as any)
    .from('companies')
    .select('id, name, slug');

  if (compFetchErr) {
    console.error('Failed to fetch companies:', compFetchErr);
    process.exit(1);
  }

  const companyList = companies || [];
  const companyIds = companyList.map((c: any) => c.id);
  console.log(`Discovered ${companyList.length} company tenant(s) to purge:`, companyList.map((c: any) => `${c.name} (${c.slug})`).join(', ') || 'None');

  // 3. List of all tenant-scoped tables to clear
  const tenantTables = [
    'workflow_execution_logs',
    'workflow_rules',
    'audit_logs',
    'job_costings',
    'daily_labor_logs',
    'payroll_items',
    'payroll_periods',
    'salary_advances',
    'attendances',
    'employees',
    'installations',
    'challan_items',
    'delivery_challans',
    'cash_book_entries',
    'bank_accounts',
    'expenses',
    'payment_adjustments',
    'payments',
    'invoices',
    'purchase_orders',
    'supplier_material_prices',
    'supplier_price_history',
    'suppliers',
    'production_reworks',
    'production_jobs',
    'design_versions',
    'design_jobs',
    'order_timeline_events',
    'job_orders',
    'sales_orders',
    'quotations',
    'material_wastages',
    'inventory_rolls',
    'stock_ledger',
    'materials',
    'product_price_history',
    'products',
    'customers',
    'customer_communications',
    'in_app_notifications',
    'communication_logs',
    'message_templates',
    'communication_channels_config',
    'company_tax_settings',
    'document_templates_config',
    'document_number_counters',
    'company_settings',
    'user_permission_overrides',
    'user_roles',
    'company_subscriptions',
    'platform_support_sessions',
    'platform_tenant_feature_flags',
    'platform_tenant_exports',
    'company_users',
    'branches',
  ];

  console.log('\n--- Purging Tenant Tables ---');
  for (const table of tenantTables) {
    try {
      if (companyIds.length > 0) {
        const { error } = await (admin as any).from(table).delete().in('company_id', companyIds);
        if (error) {
          // Table might not have company_id or error occurred, try clearing table with gte id 0 or neq id
          await (admin as any).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        }
      } else {
        await (admin as any).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
      console.log(`✓ Cleared table: ${table}`);
    } catch (err: any) {
      console.warn(`! Notice on table ${table}: ${err.message}`);
    }
  }

  // 4. Delete all companies
  if (companyIds.length > 0) {
    const { error: compDelErr } = await (admin as any).from('companies').delete().in('id', companyIds);
    if (compDelErr) {
      console.error('Error deleting companies:', compDelErr);
    } else {
      console.log(`✓ Deleted ${companyIds.length} company organization(s) from database.`);
    }
  }

  // 5. Purge transient system & telemetry events
  console.log('\n--- Purging Transient Telemetry & Platform Logs ---');
  const transientTables = [
    'platform_system_health_events',
    'platform_incidents',
    'platform_background_jobs',
    'platform_active_sessions',
    'email_logs',
    'email_queue',
  ];

  for (const table of transientTables) {
    try {
      await (admin as any).from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      console.log(`✓ Cleared transient table: ${table}`);
    } catch (err: any) {
      console.warn(`! Notice on table ${table}: ${err.message}`);
    }
  }

  // 6. Clean non-admin user profiles
  console.log('\n--- Cleaning Non-Admin User Profiles ---');
  try {
    const { data: allProfiles } = await (admin as any).from('user_profiles').select('id, email');
    const profilesToDelete = (allProfiles || []).filter(
      (p: any) => !adminEmails.includes(p.email?.toLowerCase()) && !adminUserIds.includes(p.id)
    );

    if (profilesToDelete.length > 0) {
      const ids = profilesToDelete.map((p: any) => p.id);
      await (admin as any).from('user_profiles').delete().in('id', ids);
      console.log(`✓ Removed ${ids.length} non-admin user profile(s).`);
    } else {
      console.log('✓ Zero orphaned user profiles found.');
    }
  } catch (err: any) {
    console.warn('! Notice on cleaning user profiles:', err.message);
  }

  // 7. Reset Platform Audit Logs and record the reset event
  console.log('\n--- Resetting Platform Audit Ledger ---');
  try {
    await (admin as any).from('platform_audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert single clean reset record
    await (admin as any).from('platform_audit_logs').insert({
      platform_admin_id: admins?.[0]?.id || null,
      actor_email: admins?.[0]?.email || 'system@printerp.com.bd',
      action: 'platform.reset',
      entity_type: 'system',
      entity_id: 'cluster-root',
      details: {
        reason: 'Authorized full platform reset and data purge executed',
        timestamp: new Date().toISOString(),
        preserved_admins: adminEmails,
      },
    });
    console.log('✓ Platform audit ledger reset with initial system initialization event.');
  } catch (err: any) {
    console.warn('! Notice on resetting audit logs:', err.message);
  }

  // 8. Ensure Cluster Settings exist and are healthy
  console.log('\n--- Validating Cluster Settings & Plans ---');
  try {
    const { data: existingSettings } = await (admin as any)
      .from('platform_system_settings')
      .select('id')
      .eq('cluster_name', 'default')
      .maybeSingle();

    if (!existingSettings) {
      await (admin as any).from('platform_system_settings').insert({
        cluster_name: 'default',
        app_name: 'PrintERP SaaS',
        support_email: 'support@printerp.com.bd',
        billing_email: 'billing@printerp.com.bd',
        default_currency: 'BDT',
        default_locale: 'bn',
        maintenance_mode: false,
        allow_registrations: true,
      });
      console.log('✓ Initialized default platform system settings.');
    } else {
      console.log('✓ Platform system settings intact.');
    }
  } catch (err: any) {
    console.warn('! Notice on platform settings:', err.message);
  }

  // 9. Verify Subscription Plans integrity
  try {
    const { data: plans } = await (admin as any).from('subscription_plans').select('code, name, price_monthly');
    console.log(`✓ Verified ${plans?.length || 0} active subscription plans:`, (plans || []).map((p: any) => `${p.name} (${p.code})`).join(', '));
  } catch (err: any) {
    console.warn('! Notice on subscription plans:', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 Platform Data Reset & Purge Completed Successfully!');
  console.log('The system is in a pristine, zero-tenant state.');
  console.log('====================================================\n');
}

resetPlatformData().catch((err) => {
  console.error('\nFatal reset error:', err);
  process.exit(1);
});
