import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

async function verifyState() {
  console.log('=== VERIFYING FINAL SYSTEM STATE ===\n');

  const client = new Client({
    host: 'aws-0-ap-northeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.liqhihsqcblddqfjmmse',
    password: 'Shamol199431)!',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  // 1. Auth Users
  const usersRes = await client.query('SELECT id, email, created_at, confirmed_at FROM auth.users;');
  console.log(`Auth Users (${usersRes.rows.length}):`);
  usersRes.rows.forEach(u => console.log(`  - ${u.id} | ${u.email}`));

  // 2. Platform Admins
  const adminsRes = await client.query('SELECT id, user_id, email, full_name, role, is_active, mfa_enabled FROM public.platform_admins;');
  console.log(`\nPlatform Admins (${adminsRes.rows.length}):`);
  adminsRes.rows.forEach(a => console.log(`  - ${a.id} | ${a.email} | role: ${a.role} | active: ${a.is_active} | MFA: ${a.mfa_enabled}`));

  // 3. User Profiles
  const upRes = await client.query('SELECT count(*)::int as cnt FROM public.user_profiles;');
  console.log(`\nUser Profiles Count: ${upRes.rows[0].cnt}`);

  // 4. Companies & Tenants
  const compRes = await client.query('SELECT count(*)::int as cnt FROM public.companies;');
  console.log(`Companies Count: ${compRes.rows[0].cnt}`);

  // 5. Audit & Log counts
  const auditRes = await client.query('SELECT count(*)::int as cnt FROM public.platform_audit_logs;');
  const sessRes = await client.query('SELECT count(*)::int as cnt FROM public.platform_active_sessions;');
  const gwTxRes = await client.query('SELECT count(*)::int as cnt FROM public.gateway_transactions;');
  const subEvRes = await client.query('SELECT count(*)::int as cnt FROM public.platform_subscription_events;');
  console.log(`\nOperational Tables:`);
  console.log(`  - platform_audit_logs: ${auditRes.rows[0].cnt}`);
  console.log(`  - platform_active_sessions: ${sessRes.rows[0].cnt}`);
  console.log(`  - gateway_transactions: ${gwTxRes.rows[0].cnt}`);
  console.log(`  - platform_subscription_events: ${subEvRes.rows[0].cnt}`);

  await client.end();

  // 6. Test login via Supabase client with bdinfosky@gmail.com and password s19943101
  console.log('\n--- Testing Supabase Auth Authentication ---');
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const env = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: 'bdinfosky@gmail.com',
    password: 's19943101'
  });

  if (loginErr) {
    console.error('❌ Supabase Auth login test failed:', loginErr.message);
  } else {
    console.log('✅ Supabase Auth Login SUCCESSFUL for bdinfosky@gmail.com! User ID:', loginData.user?.id);
    await supabase.auth.signOut();
  }
}

verifyState().catch(console.error);
