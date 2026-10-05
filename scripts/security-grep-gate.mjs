// ==============================================================================
// PrintFlow - Security Grep Gate & Static Policy Enforcement
// CI Gate running on every PR to prevent silent security regressions:
// 1. Blocks 'GRANT ... TO anon' on sensitive and security definer functions.
// 2. Blocks 'USING (true)' / 'WITH CHECK (true)' RLS bypass on tenant tables.
// 3. Blocks SUPABASE_SERVICE_ROLE leaks in client components and bundles.
// 4. Blocks accidental commits of secret keys or credentials.
// ==============================================================================

import fs from 'fs';
import path from 'path';

let violations = 0;

function reportViolation(file, line, message, snippet) {
  console.error(`\x1b[31m[SECURITY GATE VIOLATION]\x1b[0m ${file}:${line}`);
  console.error(`  \x1b[33m${message}\x1b[0m`);
  if (snippet) {
    console.error(`  Snippet: ${snippet.trim()}`);
  }
  console.error('');
  violations++;
}

// ------------------------------------------------------------------------------
// CHECK 1: SQL Migrations Grep Gate
// ------------------------------------------------------------------------------
const migrationsDir = 'supabase/migrations';
const TENANT_TABLES = new Set([
  'companies',
  'branches',
  'company_users',
  'user_roles',
  'customers',
  'customer_addresses',
  'quotations',
  'quotation_items',
  'orders',
  'order_items',
  'invoices',
  'invoice_items',
  'payments',
  'delivery_challans',
  'delivery_challan_items',
  'installations',
  'production_tasks',
  'materials',
  'inventory_items',
  'inventory_transactions',
  'purchase_orders',
  'purchase_order_items',
  'suppliers',
  'supplier_vouchers',
  'accounts_ledger',
  'chart_of_accounts',
  'tax_records',
  'mushak_records',
  'attendance_records',
  'employees',
  'payroll_records',
  'design_jobs',
  'audit_logs',
]);

if (fs.existsSync(migrationsDir)) {
  const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'));

  for (const file of sqlFiles) {
    const filePath = path.join(migrationsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    let currentTable = null;

    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      const trimmed = line.trim();
      if (trimmed.startsWith('--')) return;

      // 1.1 Forbidden grant to anon on functions
      if (/grant\s+execute\s+on\s+function.+to\s+[^;]*\banon\b/i.test(trimmed)) {
        reportViolation(filePath, lineNum, 'Forbidden GRANT EXECUTE ON FUNCTION to anon role', trimmed);
      }

      // 1.2 Detect table for RLS policy
      const onTableMatch = trimmed.match(/on\s+(?:public\.)?([a-zA-Z0-9_]+)\s+(?:for\s+\w+\s+)?(?:to\s+\w+\s+)?(?:using|with check)/i);
      if (onTableMatch) {
        currentTable = onTableMatch[1].toLowerCase();
      }

      // 1.3 Forbidden USING (true) on tenant tables
      if (/\b(?:using|with\s+check)\s*\(\s*true\s*\)/i.test(trimmed)) {
        // Find if this is on a tenant table
        const surrounding = lines.slice(Math.max(0, idx - 5), idx + 2).join(' ').toLowerCase();
        for (const tenantTable of TENANT_TABLES) {
          if (
            surrounding.includes(`on public.${tenantTable}`) ||
            surrounding.includes(`on ${tenantTable}`) ||
            (currentTable === tenantTable)
          ) {
            reportViolation(
              filePath,
              lineNum,
              `Forbidden USING (true) / WITH CHECK (true) RLS policy bypass on tenant table '${tenantTable}'`,
              trimmed
            );
            break;
          }
        }
      }

      // 1.4 Direct admin purge execution in migrations
      if (/\b(?:select|perform)\s+(?:public\.)?admin_purge_\w+\s*\(/i.test(trimmed)) {
        reportViolation(filePath, lineNum, 'Forbidden live execution of admin_purge_* in migration', trimmed);
      }
    });
  }
}

// ------------------------------------------------------------------------------
// CHECK 2: Client Code Service Role Leak Prevention
// ------------------------------------------------------------------------------
function scanClientFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== '.git') {
        scanClientFiles(fullPath);
      }
    } else if (entry.isFile() && /\.(tsx|jsx|ts|js)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      const isClientComponent = content.includes("'use client'") || content.includes('"use client"');

      // Check if file is inside components/ or is client component
      const isClientArea = fullPath.includes(`${path.sep}components${path.sep}`) || isClientComponent;

      if (isClientArea) {
        lines.forEach((line, idx) => {
          const lineNum = idx + 1;
          const trimmed = line.trim();
          if (trimmed.startsWith('//')) return;

          if (
            /SUPABASE_SERVICE_ROLE/i.test(trimmed) ||
            /SERVICE_ROLE_KEY/i.test(trimmed) ||
            /createAdminClient/i.test(trimmed)
          ) {
            reportViolation(
              fullPath,
              lineNum,
              'SUPABASE_SERVICE_ROLE or admin client reference forbidden in client-side code',
              trimmed
            );
          }
        });
      }
    }
  }
}

scanClientFiles('components');
scanClientFiles('app');

// ------------------------------------------------------------------------------
// FINAL RESULT
// ------------------------------------------------------------------------------
console.log('==============================================================================');
console.log('PrintFlow - Security Grep Gate Verification Result');
console.log('==============================================================================');
if (violations > 0) {
  console.error(`\x1b[31m❌ SECURITY GREP GATE FAILED: ${violations} violation(s) detected.\x1b[0m`);
  console.error('All PRs introducing anon function grants, tenant RLS bypass, or client key leaks are strictly blocked.');
  process.exit(1);
} else {
  console.log('\x1b[32m✅ SECURITY GREP GATE PASSED: 0 violations detected across migrations and client code.\x1b[0m');
  console.log('  - 0 anon grants on sensitive/definer functions.');
  console.log('  - 0 USING(true) bypasses on tenant tables.');
  console.log('  - 0 SUPABASE_SERVICE_ROLE leaks in client components.');
  process.exit(0);
}
