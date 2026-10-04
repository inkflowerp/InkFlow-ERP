# Supabase Migration Drift & State Reconciliation

## Executive Summary

As part of **Hardening Phase 0 (Safety & Baseline)**, an audit of database schema migrations was conducted on October 3, 2026. This audit compared:
1. Filesystem migrations in `supabase/migrations/` (111 SQL migration files).
2. The standard Supabase CLI migration registry in `supabase_migrations.schema_migrations`.
3. The custom legacy migration tracker table in `public._printerp_migrations` (populated by `scripts/migrate.js`).
4. The live Supabase PostgreSQL schema (`db.liqhihsqcblddqfjmmse.supabase.co`).

---

## 1. Inventory & Comparison

| Source | Count | Range | Status |
| :--- | :--- | :--- | :--- |
| **Filesystem (`supabase/migrations/*.sql`)** | **111** | `001_initial_schema.sql` → `111_enforce_forced_rls_and_tenant_immutability.sql` | Canonical files present |
| **Supabase CLI (`supabase_migrations.schema_migrations`)** | **111** | `001 (initial_schema)` → `111 (enforce_forced_rls_and_tenant_immutability)` | **100% In Sync** |
| **Legacy Custom (`public._printerp_migrations`)** | **94** | `001_initial_schema.sql` → `094_production_commercial_workflow_gates.sql` | **17 Migrations Missing (Drifted)** |
| **Live Database Objects (`public` schema)** | **184 Tables** | All tables, columns, indexes, triggers, and RPCs | Matches Migration 111 |

---

## 2. Identified Drift: Missing vs Extra vs Drifted

### Missing Rows in `public._printerp_migrations` (17 Files)
The following 17 migrations exist in `supabase/migrations/` and in `supabase_migrations.schema_migrations`, but are **NOT** recorded in `public._printerp_migrations`:

1. `095_designer_panel_dual_intake.sql`
2. `096_admin_purge_invoices_and_financial_reset.sql`
3. `097_admin_purge_customers_requests_and_work_orders.sql`
4. `098_tenant_domains_and_subdomain_routing.sql`
5. `099_tenant_permanent_deletion_trigger_and_cascade_hardening.sql`
6. `100_admin_purge_products_invoices_quotations_works.sql`
7. `101_fix_company_users_is_active_and_payment_atomic_rpcs.sql`
8. `102_username_and_phone_uniqueness.sql`
9. `103_platform_branding_and_identity.sql`
10. `104_customer_id_and_code.sql`
11. `105_fix_companies_owner_id_and_payment_atomic_rpcs.sql`
12. `106_workflow_security_definer_and_performance_indexes.sql`
13. `107_tenant_whatsapp_gateway_and_communication_infrastructure.sql`
14. `108_billing_and_inventory_atomic_integrity.sql`
15. `109_drop_abandoned_subsystem_tables.sql`
16. `110_data_integrity_and_concurrency_hardening.sql`
17. `111_enforce_forced_rls_and_tenant_immutability.sql`

### Extra Rows in Database
- **0 rows**: There are no orphan migration records in either database tracking table that lack a corresponding SQL file in `supabase/migrations/`.

### Schema Drift Verification
Verification of live database objects confirmed that the schema changes defined in migrations 095 through 111 **are physically present in the live database**. Specifically:
- **Tables:** `public.tenant_domains` (introduced in migration 098) exists and is active.
- **RPC Functions:** 
  - `admin_purge_all_company_invoices` (migration 096)
  - `admin_purge_all_company_operational_data` (migration 097)
  - `admin_purge_all_company_catalog_and_orders` (migration 100)
  - `record_payment_atomic` (hardened in 101, 105, 108)
  - `mutate_inventory_stock_atomic` (hardened in 108)
  - `increment_account_balance_atomic` (hardened in 105)
  - `increment_customer_balance_atomic` (hardened in 105)
- **RLS & Security:** Forced RLS policies and tenant immutability constraints from migrations 110 and 111 are active on production tables.

### Root Cause of Drift
On September 18, 2026, deployment methodology transitioned from manual invocation of the custom script (`node scripts/migrate.js`) to the standard Supabase CLI workflow (`supabase db push` / `supabase migration up`). The Supabase CLI records its migration history exclusively in `supabase_migrations.schema_migrations`. Consequently, `public._printerp_migrations` stopped receiving insert statements after migration 094.

---

## 3. Decision: Canonical Source of Truth

Going forward, **ONE SINGLE MIGRATION SOURCE OF TRUTH** is established and enforced:

> ### **Canonical Source of Truth:**
> **`supabase/migrations/` + `supabase_migrations.schema_migrations`**  
> All future schema changes MUST be authored as sequential SQL files in `supabase/migrations/` and applied exclusively via the official Supabase CLI:
> ```bash
> npx supabase db push
> ```
> 
> ### **Deprecations:**
> - `public._printerp_migrations` is declared **DEPRECATED**.
> - `scripts/migrate.js` is declared **DEPRECATED** and must not be used for production migrations to prevent dual-tracking inconsistencies.

---

## 4. Remediation & Reconciliation Script

To reconcile `public._printerp_migrations` with `supabase_migrations.schema_migrations` for historical reporting consistency, the following SQL snippet backfills the missing 17 records:

```sql
INSERT INTO public._printerp_migrations (name, applied_at)
VALUES
  ('095_designer_panel_dual_intake.sql', NOW()),
  ('096_admin_purge_invoices_and_financial_reset.sql', NOW()),
  ('097_admin_purge_customers_requests_and_work_orders.sql', NOW()),
  ('098_tenant_domains_and_subdomain_routing.sql', NOW()),
  ('099_tenant_permanent_deletion_trigger_and_cascade_hardening.sql', NOW()),
  ('100_admin_purge_products_invoices_quotations_works.sql', NOW()),
  ('101_fix_company_users_is_active_and_payment_atomic_rpcs.sql', NOW()),
  ('102_username_and_phone_uniqueness.sql', NOW()),
  ('103_platform_branding_and_identity.sql', NOW()),
  ('104_customer_id_and_code.sql', NOW()),
  ('105_fix_companies_owner_id_and_payment_atomic_rpcs.sql', NOW()),
  ('106_workflow_security_definer_and_performance_indexes.sql', NOW()),
  ('107_tenant_whatsapp_gateway_and_communication_infrastructure.sql', NOW()),
  ('108_billing_and_inventory_atomic_integrity.sql', NOW()),
  ('109_drop_abandoned_subsystem_tables.sql', NOW()),
  ('110_data_integrity_and_concurrency_hardening.sql', NOW()),
  ('111_enforce_forced_rls_and_tenant_immutability.sql', NOW())
ON CONFLICT (name) DO NOTHING;
```
