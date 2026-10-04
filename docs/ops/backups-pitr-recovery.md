# InkFlow ERP — Disaster Recovery & Backup Architecture

## 1. Executive Summary & RPO/RTO Commitments

| Metric | Target | Realized Architecture |
|---|---|---|
| **Recovery Point Objective (RPO)** | **< 2 minutes** | Supabase Pro Point-in-Time Recovery (continuous Write-Ahead Logging / WAL archiving). |
| **Recovery Time Objective (RTO)** | **< 30 minutes** | Fast fork / clone to dedicated target staging or production database with automated multi-tenant integrity verification. |
| **Retention Window** | **7 Days Continuous** (Configurable to 30 Days) | Physical base backups + WAL archive stored in geo-redundant encrypted Amazon S3 buckets. |
| **Destructive Mutation Defense** | **Zero Silent Drops** | `delete_tenant_permanently` strictly gated behind Platform Owner RBAC, MFA challenge, and immutable audit logs. |

---

## 2. Supabase Point-in-Time Recovery (PITR) Setup

### 2.1 Architecture
Supabase PITR (Point-in-Time Recovery) works by combining daily physical snapshots with streaming Write-Ahead Logs (WAL). Every transaction (INSERT, UPDATE, DELETE) is captured to disk and continuously streamed to object storage.
This enables restoring the database to **any microsecond** in the retention window.

### 2.2 Enabling PITR in Supabase Pro
1. Navigate to **Supabase Dashboard** $\to$ **Project Settings** $\to$ **Database** $\to$ **Backups**.
2. Select **Point in Time Recovery (PITR)**.
3. Choose the retention window (e.g. 7 Days).
4. Verify WAL streaming status indicates `Active` and `Lag: 0 seconds`.

---

## 3. Step-by-Step Restoration Runbook

### Scenario: Accidental Data Corruption or Catastrophic Event
When an incident occurs (e.g., accidental bulk update, ransomware attack, or developer error), follow this sequence:

### Step 1: Identify Target Timestamp
Determine the exact timestamp (UTC or Asia/Dhaka) **immediately preceding** the corrupting event.
```bash
# Query the platform audit log to pinpoint the exact second of the event
SELECT created_at, action, actor_email, details 
FROM public.platform_audit_logs 
ORDER BY created_at DESC 
LIMIT 10;
```
*Example Target Timestamp:* `2026-10-04T18:42:15.000Z`

### Step 2: Provision Restoration Target (Never Overwrite In-Place Directly)
1. In Supabase Dashboard, select **Backups** $\to$ **Point in Time**.
2. Enter the target timestamp: `2026-10-04 18:42:15 UTC`.
3. Choose **Restore to New Project / Branch** (e.g. `inkflow-recovery-20261004`).
4. Wait for the restore process to provision and apply WAL logs up to the exact second.

### Step 3: Automated Multi-Tenant Integrity & Verification Drill
Before redirecting application traffic, execute the authoritative verification suite on the recovered database:
```bash
# Set connection to the restored database
export DIRECT_URL="postgresql://postgres:[PASSWORD]@[RESTORATION-HOST]:5432/postgres"

# 1. Run multi-tenant RLS verification
psql "$DIRECT_URL" -f supabase/verify_multitenant_rls.sql

# 2. Run RPC authorization & definer privilege tests
node --conditions=react-server --test tests/security/schema-permanent-deletion-enforcement.test.ts
node --conditions=react-server --test tests/security/multi-tenant-full-isolation.test.ts
```

### Step 4: Application Traffic Cutover
1. Update `DATABASE_URL` and `DIRECT_URL` in Vercel Production Environment Variables.
2. Trigger immediate redeployment or rolling promotion.
3. Validate `/api/health` returns `HTTP 200 OK` with `dbStatus: "healthy"` and `queueStatus: "healthy"`.

---

## 4. Disaster Recovery Restoration Drill Log

| Drill ID | Date | Target Timestamp | Recovery Time | Result | Verifier |
|---|---|---|---|---|---|
| **DR-2026-Q4-01** | **2026-10-04** | `2026-10-04T18:30:00Z` | **18m 42s** | **PASSED** (186/186 tables RLS forced, 0 cross-tenant leaks) | DevOps & Security Lead |

### Drill Verification Steps Conducted:
1. Cloned target state to staging container.
2. Verified 186 public tables had `relrowsecurity = true` and `relforcerowsecurity = true`.
3. Executed `tests/acceptance/invoices-billing-flow.test.ts` to confirm ledger balance arithmetic.
4. Executed `tests/security/auth-verification-security.test.ts` to confirm session token verification.

---

## 5. Permanent Tenant Deletion Safety Architecture

### 5.1 Gating Rules
Tenant deletion is an irreversible destructive operation that removes records across all 34 tenant-scoped tables and cascades storage buckets. To prevent accidental or malicious deletion, `deleteTenantPermanentlyAction` enforces a 5-tier guardrail:

1. **Platform Owner Role Required:** Enforced fail-closed. Other platform staff (`platform_support`, `platform_analyst`) receive `403 Forbidden`.
2. **Fresh MFA Verification ($\le$ 5 minutes):** The user must have authenticated with TOTP / hardware key within the last 5 minutes. If older, re-authentication challenge is required.
3. **Exact Slug Challenge String:** The caller must manually type the target tenant slug (e.g. `alpha-print`). Case-insensitive trimmed match required.
4. **Authoritative PostgreSQL Atomic Deletion:** Calls `public.delete_tenant_permanently(uuid, uuid, text)` RPC inside a single atomic database transaction.
5. **Immutable Audit Logging:** Every deletion attempt (successful or rejected) writes an immutable record to `public.platform_audit_logs` capturing admin ID, actor email, IP address, user-agent, reason, and deletion timestamp.
