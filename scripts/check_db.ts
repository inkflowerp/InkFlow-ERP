import { createAdminClient } from '../lib/supabase/admin.ts';

async function checkMore() {
  const admin = createAdminClient();

  const { data: authUsers, error: authErr } = await admin.auth.admin.listUsers();
  if (authErr) {
    console.error('Auth error:', authErr);
  } else {
    console.log(`Auth users count: ${authUsers.users.length}`);
    authUsers.users.forEach(u => console.log(` - ${u.id}: ${u.email} (created: ${u.created_at})`));
  }

  const tables = [
    'companies',
    'branches',
    'company_users',
    'company_subscriptions',
    'user_roles',
    'customers',
    'suppliers',
    'products',
    'materials',
    'sales_orders',
    'quotations',
    'job_orders',
    'invoices',
    'payments',
    'expenses',
    'employees',
    'attendances',
    'delivery_challans',
    'audit_logs',
    'platform_audit_logs',
    'platform_incidents',
    'platform_background_jobs',
    'platform_system_health_events',
    'platform_support_sessions',
    'platform_active_sessions',
    'email_logs',
    'email_queue',
    'platform_system_settings'
  ];

  console.log('\nTable row counts:');
  for (const t of tables) {
    try {
      const { count, error } = await (admin as any).from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(` - ${t}: ERROR (${error.message})`);
      } else {
        console.log(` - ${t}: ${count} rows`);
      }
    } catch (e: any) {
      console.log(` - ${t}: EXCEPTION (${e.message})`);
    }
  }
}

checkMore().catch(console.error);
