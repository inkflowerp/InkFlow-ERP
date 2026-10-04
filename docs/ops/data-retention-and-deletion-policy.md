# InkFlow ERP — Data Retention & Tenant Deletion Policy

## 1. Statutory & Business Data Retention Schedule

In compliance with the **National Board of Revenue (NBR) Bangladesh VAT and Supplementary Duty Act 2012** and international data protection standards, InkFlow ERP enforces the following data lifecycle rules:

| Data Category | Retention Period | Storage Location | Deletion / Archival Mechanism |
|---|---|---|---|
| **NBR Mushak 6.3 Tax Invoices & VAT Registers** | **6 Years (Statutory Minimum)** | `invoices`, `mushak_records`, `tax_records` | Immutable rows. Hard deletion blocked by database triggers. |
| **Double-Entry Financial Ledgers & Journals** | **7 Years** | `accounts_ledger`, `payments`, `supplier_vouchers` | Read-only ledger. Voiding creates compensating journal entries. |
| **Shop Floor Production & Job Tickets** | **3 Years** | `orders`, `job_orders`, `production_tasks` | Soft-deleted after 1 year; archived to cold storage after 3 years. |
| **Vector Artwork Proofs & Customer Files** | **180 Days post-completion** | Supabase Storage (`customer-artworks`, `prepress-proofs`) | Automated lifecycle expiration to reclaim high-cost tier-1 storage. |
| **Recycle Bin Items (Soft-Deleted Records)** | **30 Days** | `trash_items` | Daily automated cleanup via `/api/cron/trash-cleanup` (`TRASH_RETENTION_DAYS = 30`). |
| **Platform & Tenant Audit Logs** | **2 Years** | `audit_logs`, `platform_audit_logs` | Immutable audit append-only journal (`trg_prevent_audit_log_mutation`). |

---

## 2. Permanent Tenant Deletion Protocol

When a customer terminates their subscription or requests complete eradication of their workspace under "Right to be Forgotten":

### 2.1 Destructive Gating Invariants
To prevent accidental, unauthorized, or cross-tenant deletion:
1. **Platform Owner Only:** Strictly enforced fail-closed (`auth_is_platform_owner()`).
2. **Fresh MFA Challenge:** Re-authentication required within $\le 5$ minutes.
3. **Exact Slug Challenge Match:** Caller must enter exact tenant slug (e.g. `alpha-print`).
4. **Single-Phase Atomic Elimination:** Calls `public.delete_tenant_permanently(uuid, uuid, text)` RPC.
5. **Storage Cascade Purge:** Calls `StorageCleanupService.purgeCompanyStorage(companyId)` removing all files from object storage.
6. **Immutable Audit Record:** Platform audit log permanently records the deletion event with timestamp, actor email, IP address, and reason.

### 2.2 Verification Proof
- Automated end-to-end deletion verified by `tests/integration/tenant-permanent-deletion-full-audit.test.ts` (100% pass across 5 test suites).
- Confirmed zero orphan records across 34 child tables and complete preservation of neighboring tenant data integrity.
