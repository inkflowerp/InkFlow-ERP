# Supabase Production Deployment & Hardening Checklist

This document provides the step-by-step verification checklist for provisioning, securing, and maintaining the production PostgreSQL database, Supabase Auth, Storage, and Realtime infrastructure for **PrintERP SaaS**.

---

## 1. Database Migrations Execution (Sequential Order)

All 29 migration scripts located in [`supabase/migrations/`](file:///f:/Antigravity/PrintERP/supabase/migrations/) must be applied sequentially.

### Migration Order:
1. `001_initial_schema.sql` - Base schemas, UUID extensions, `companies`, `users`
2. `002_bangladesh_geo.sql` - 8 Divisions, 64 Districts, Thanas, Postal codes
3. `003_multitenant_rls.sql` - Core multi-tenant tenant boundary functions
4. `004_printing_catalog_enums.sql` - Substrates, printing processes, finishing types
5. `005_core_multitenant_entities.sql` - Master tenant tables
6. `006_strict_rls_policies.sql` - Strict RLS boundary enforcement
7. `007_rbac_matrix_and_platform_owner.sql` - Roles, permissions, Platform Owner
8. `008_settings_and_document_sequences.sql` - Atomic sequences (`QT-`, `ORD-`, `INV-`, `JOB-`)
9. `009_customers_and_suppliers.sql` - CRM, B2B/B2C, normalized Bangladesh phones
10. `010_products_and_pricing_engine.sql` - Products, SFT/RFT/GSM pricing models
11. `011_quotations_workflow.sql` - Quotations, versioning, customer approvals
12. `012_orders_and_job_orders.sql` - Order lifecycle & production tickets
13. `013_design_management.sql` - Vector artwork uploads, prepress proofs
14. `014_production_management.sql` - Press queues, Konica/Heidelberg machine states
15. `015_inventory_and_stock_ledger.sql` - Immutable inventory journal, negative stock locks
16. `016_purchase_management.sql` - POs, vendor bills, goods receiving notes (GRN)
17. `017_invoicing_and_payments.sql` - Mushak 6.3 invoices, bKash/cash money receipts
18. `018_delivery_and_installation.sql` - Delivery challans, vehicle dispatches
19. `019_expenses_and_accounting.sql` - Double-entry ledger, expense vouchers
20. `020_employees_and_payroll.sql` - BD Labor Law 208-hr overtime, salary advances
21. `021_job_costing_and_profitability.sql` - COGS, material wastage, gross profit %
22. `022_reporting_and_analytics.sql` - Sales, receivables aging, machine metrics
23. `023_communication_and_notifications.sql` - BulkSMSBD, SSLWireless, WhatsApp API
24. `024_vat_tax_and_document_settings.sql` - NBR 15%, 7.5%, 5% Mushak tax settings
25. `025_saas_subscriptions.sql` - Plans (Starter, Growth, Enterprise), usage limits
26. `026_platform_administration.sql` - Cross-tenant health, feature flags, global audit
27. `027_security_audit_and_data_integrity.sql` - Audit event stream, non-destructive voids
28. `028_workflow_automation.sql` - Deterministic business automation engine
29. `029_production_performance_optimization.sql` - Composite indexes & server-side KPI aggregation

### Deploying via Supabase CLI:
```bash
# Link to your production Supabase project
npx supabase link --project-ref your-project-ref

# Push all migrations
npx supabase db push
```

---

## 2. Row Level Security (RLS) Verification

Verify that Row Level Security is active on 100% of public tenant tables:

```sql
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = false;
```
> **Expected Result**: 0 rows returned. (Every table must have `rowsecurity = true`).

---

## 3. Storage Buckets & Policies

Create the following 4 private storage buckets in Supabase Studio -> **Storage**:

| Bucket Name | Privacy Level | Allowed MIME Types | Max Size |
| :--- | :---: | :--- | :---: |
| `customer-artworks` | **Private** | `application/pdf`, `image/tiff`, `image/png`, `application/postscript` | 100 MB |
| `prepress-proofs` | **Private** | `application/pdf`, `image/png`, `image/jpeg` | 25 MB |
| `invoices` | **Private** | `application/pdf` | 10 MB |
| `payment-receipts` | **Private** | `image/jpeg`, `image/png`, `application/pdf` | 10 MB |

### Storage Security Policies:
Ensure signed URL access is enforced. Disallow public bucket read access. All file downloads must pass through [`getSignedFileUrl`](file:///f:/Antigravity/PrintERP/lib/security/storage-security.ts).

---

## 4. Supabase Auth Production Settings

Navigate to **Authentication -> Settings** in Supabase Studio:

- [x] **Email Confirmation**: Enabled (Users must confirm email before logging in).
- [x] **Secure Password Policy**: Min 8 characters, requiring numbers and symbols.
- [x] **Site URL**: `https://your-production-domain.com`
- [x] **Redirect URLs**: Add `https://your-production-domain.com/auth/callback`
- [x] **JWT Expiry**: Set to `3600` seconds (1 hour).
- [x] **Refresh Token Rotation**: Enabled with 10-second reuse interval.
- [x] **MFA (Multi-Factor Authentication)**: Enabled (TOTP Authenticator app support).

---

## 5. Realtime Publication Settings

In **Database -> Publications -> supabase_realtime**:

- **DO NOT** publish whole-database wildcards.
- Only enable realtime for tenant-isolated operational tables:
  - `orders`
  - `production_jobs`
  - `workflow_execution_logs`
  - `notifications`
- Frontend components must connect strictly via [`realtimeManager.subscribe`](file:///f:/Antigravity/PrintERP/lib/realtime/subscription-manager.ts) to `company:${companyId}:${topic}`.

---

## 6. High-Availability & Backups

- [x] **Automated Daily Backups**: Enabled (retained for 30 days).
- [x] **Point-in-Time Recovery (PITR)**: Enable for Enterprise/Production databases (permits restoration to any precise second in the last 7 days).
- [x] **Connection Pooling**: Use Supavisor connection pooler on port `6543` in Transaction Mode for high-concurrency serverless connections from Vercel.
