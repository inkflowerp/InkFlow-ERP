# PrintERP SaaS - Enterprise Security & Data Integrity Review

**Assessment Version**: 22.0  
**Target Architecture**: Multi-Tenant Next.js 16 App Router + Supabase PostgreSQL (v16.3)  
**Security Boundary**: Strict Tenant Quarantine & Privileged Root Governance  
**Evaluation Date**: September 2026  

---

## 1. Executive Summary

PrintERP SaaS implements an enterprise-grade, defense-in-depth security model tailored to Bangladesh's printing, packaging, and digital signage industry. The architecture guarantees:
1. **Strict Multi-Tenant Isolation**: Zero cross-tenant data leakage via PostgreSQL Row Level Security (RLS) and server-side verification guards.
2. **Financial Data Immutability**: Silent deletion of invoices, receipts, payments, and expenses is strictly blocked at the database trigger layer; all corrections execute via formal `void`, `cancel`, `reverse`, and `adjust` transaction workflows.
3. **Payment Integrity**: Historical payment records cannot be edited in place. Corrections create linked, audited `payment_adjustments` entries.
4. **Inventory Ledger Integrity**: Direct modification of material stock is blocked; every stock movement must proceed through immutable `stock_ledger` entries.
5. **Comprehensive 15-Event Audit Trail**: Append-only compliance log capturing actor attribution, before/after JSON diffs, timestamps, and device fingerprints.
6. **Application Hardening**: Sliding window rate-limiting, signed storage URLs with expiration, Zod schema validation, and automatic secret masking.

---

## 2. Row Level Security (RLS) Audit

Every multi-tenant database table in PrintERP is bound to `company_id` and protected with strict PostgreSQL RLS policies:

| Database Domain | Tables Protected | RLS Policy Mechanism | Status |
| :--- | :--- | :--- | :--- |
| **Core Tenants** | `companies`, `company_settings`, `branches` | `public.auth_is_active_company_user(company_id)` | **PASS** |
| **RBAC & Overrides** | `roles`, `permissions`, `user_roles`, `user_permission_overrides` | Evaluates company membership + `auth_user_has_permission()` | **PASS** |
| **CRM & Sales** | `customers`, `quotations`, `job_orders`, `design_files` | Quarantined to tenant workspace; cross-tenant select returns empty set | **PASS** |
| **Billing & Payments** | `invoices`, `payments`, `payment_allocations`, `payment_adjustments` | RLS ensures company isolation + anti-deletion triggers | **PASS** |
| **Inventory & Ledger** | `materials`, `inventory_rolls`, `stock_ledger`, `material_wastages` | Restricted to active tenant operators; stock updates require ledger | **PASS** |
| **Platform Root** | `platform_admins`, `platform_plans`, `platform_feature_flags`, `platform_audit_logs` | Strictly gated by `public.auth_is_platform_owner()`; inaccessible to normal tenants | **PASS** |

---

## 3. Financial Data Integrity & Anti-Deletion Safeguards

### Threat Mitigated: Accidental or Fraudulent Ledger Tampering
In conventional ERPs, deleting an invoice or modifying an old payment record can erase sales tax obligations (such as Bangladesh NBR Mushak 6.3) or conceal employee theft.

### PrintERP Architectural Defenses:
1. **Database Anti-Deletion Triggers**:
   - `prevent_invoice_deletion`: Blocks `DELETE` operations on `public.invoices`.
   - `prevent_payment_deletion`: Blocks `DELETE` operations on `public.payments`.
   - `prevent_expense_deletion`: Blocks `DELETE` operations on `public.expenses`.
2. **Immutable Reversal & Adjustment Workflows**:
   - **Voiding an Invoice**: Status changes to `'void'` with mandatory reason prompt and audit entry via `FinancialIntegrityService.voidInvoice()`.
   - **Cancelling an Order/Invoice**: Retains record in `'cancelled'` state for tax inspection.
   - **Payment Reversals**: A historical payment receipt (e.g. `MR-2026-088`) is never deleted. A reversal entry is written to `payment_adjustments` (`type = 'reversal'`, `difference_amount = -original_amount`).
   - **Payment Adjustments**: Any difference in collected amount (e.g. bKash chargeback or rounding dispute) creates a linked `payment_adjustments` record (`type = 'adjustment'`).

---

## 4. Inventory Stock Ledger Integrity

### Threat Mitigated: Direct Overwrite of Raw Material Stock
In printing plants, direct stock quantity manipulation causes untracked roll theft, phantom wastage, and inaccurate square-foot job costing.

### PrintERP Architectural Defenses:
1. **Database Stored Function**:
   `public.record_inventory_stock_transaction(company_id, material_id, transaction_type, quantity_change, unit_cost, reference_id, notes, performed_by_name)`
2. **Atomic Ledger Insertion**:
   Stock quantity cannot be incremented or decremented without inserting a corresponding row into `public.stock_ledger`.
3. **Transaction Categories**:
   Enforces one of 7 valid transaction types: `purchase`, `consumption`, `adjustment`, `return`, `wastage`, `transfer`, `opening_stock`.
4. **Non-Negative Balance Constraint**:
   Transactions attempting to drive current stock below 0 are rejected by the database.

---

## 5. Comprehensive 15-Event Audit Trail

PrintERP's `AuditService` natively instruments and records the following 15 mission-critical events:

| # | Event Action Code | Domain | Captured Payload |
| :--- | :--- | :--- | :--- |
| 1 | `auth.login` | Auth | User ID, email, session state, IP address, device metadata |
| 2 | `auth.logout` | Auth | User ID, session termination, duration |
| 3 | `user.create` | User | Creator ID, new user email, assigned role, branch assignment |
| 4 | `permission.change` | User / RBAC | Target user ID, before/after permission override diff |
| 5 | `customer.edit` | Sales | Customer ID, previous vs new credit limits, BIN, contact info |
| 6 | `quotation.edit` | Sales | Quotation ID, line items before/after, discount changes |
| 7 | `pricing.price_override` | Sales | Item, standard price, approved discount price, authorizing supervisor |
| 8 | `order.cancel` | Sales | Order ID, previous status, cancellation justification |
| 9 | `invoice.create` | Billing | Invoice number, grand total, NBR Mushak VAT amount, customer |
| 10 | `payment.record` | Billing | Money receipt number, amount, payment method (bKash/Nagad/Bank/Cash) |
| 11 | `expense.record` | Accounting | Expense ID, category, voucher amount, authorized purpose |
| 12 | `inventory.adjustment` | Inventory | Material SKU, previous stock, quantity delta, wastage reason |
| 13 | `payroll.approve` | HR | Payroll month, total disbursement BDT, employee count, approver |
| 14 | `settings.change` | Settings | Modified setting keys, previous values vs new values |
| 15 | `subscription.change` | Platform | Previous plan tier vs new tier, billing interval, MRR |

### Append-Only Immutability Rule:
PostgreSQL trigger `prevent_audit_log_mutation` rejects any `UPDATE` or `DELETE` on `public.audit_logs`.

---

## 6. Application Security Hardening

### A. Sliding Window Rate Limiting (`lib/security/rate-limiter.ts`)
- **Authentication Tier**: 5 requests / 60 seconds per IP (defends against credential stuffing and brute-force).
- **Financial Tier**: 30 operations / 60 seconds (prevents rapid automated transaction spam).
- **API Tier**: 150 requests / 60 seconds.

### B. Secure Storage & Signed URLs (`lib/security/storage-security.ts`)
- Storage buckets (`customer-artworks`, `prepress-proofs`, `invoices`) are configured as private.
- Files are only accessible via time-expiring signed URLs (`getSignedFileUrl`, default expiry: 15 minutes).

### C. Input Validation (`lib/security/input-validation.ts`)
- All user inputs and mutation payloads are validated against strict Zod schemas before hitting business logic or the database.
- Validates Bangladeshi phone numbers (`/^(?:\+8801|01)[3-9]\d{8}$/`), positive monetary figures, and required audit justifications.

### D. Secrets Sanitization (`lib/security/secrets.ts`)
- Recursive sanitizer masks sensitive fields (`password`, `token`, `secret`, `api_key`, `merchant_secret`) before diagnostic logging or audit persistence.

### E. Origin & CSRF Guard (`lib/security/csrf.ts`)
- Verifies request `origin` and `host` consistency on state-mutating requests.

---

## 7. Security Conclusion

PrintERP SaaS Phase 22 meets enterprise standards for data security, audit compliance, and accounting integrity. Normal tenant sessions remain strictly isolated, financial records are immutable, material stock changes are fully auditable, and the platform owner possesses dedicated telemetry without violating tenant privacy.
