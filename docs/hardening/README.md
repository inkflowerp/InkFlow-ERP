# InkFlow ERP Hardening & Production Safety Plan

This document outlines the systematic engineering roadmap to harden **InkFlow ERP** (Next.js 16, React 19, Supabase PostgreSQL, Vercel) for mission-critical production readiness.

---

## 🔒 The Core Invariant: One Phase = One PR

To ensure zero production downtime, zero unreviewed surface changes, and immediate reversibility, all hardening work is governed by this strict policy:

> **RULE:**  
> **1 Phase = 1 Pull Request (PR)**  
> No exceptions. Every phase must be isolated into its own branch (`hardening/phase-N`), verified independently, and merged only after passing all acceptance gates.

### Mandatory PR Checklist
Every PR submitted under this hardening initiative MUST include the following three sections:

1. **What Changed:**
   - Exhaustive list of modified files, database migrations, RPC functions, and configuration parameters.
   - Explicit rationale for why each change was necessary.
2. **How It Was Tested:**
   - Exact CLI commands executed (e.g., `npm run typecheck`, `npm run lint`, `npm test`, `npm run ui-audit`, `npm run copy-lint`, `npm run build`).
   - Automated test suites added or executed.
   - Specific assertions verifying tenant isolation, RLS constraints, and idempotency.
3. **How to Roll Back:**
   - Step-by-step command sequence to revert the PR cleanly.
   - Database rollback scripts (down-migrations or reversing SQL statements).
   - Zero-downtime mitigation strategy if a live defect is observed post-merge.

---

## 🗺️ Hardening Phases Roadmap

### Phase 0: Safety & Baseline (Current)
* **Goal:** Capture an unvarnished snapshot of repository and database health without altering runtime behavior.
* **Scope:**
  - Create branch `hardening/phase-0`.
  - Execute full suite validation (`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run ui-audit`, `npm run copy-lint`, `npm run build`) and record all findings in `docs/hardening/baseline.md`.
  - Reconcile Supabase migration tracking (`supabase_migrations.schema_migrations` vs. legacy `public._printerp_migrations` vs. filesystem `supabase/migrations/`) and establish one single source of truth in `docs/hardening/migration-drift.md`.
  - Audit Supabase API and Edge logs for the preceding 24 hours targeting high-risk RPCs (`admin_purge_*`, `mutate_inventory_stock_atomic`, `record_payment_atomic`, `increment_*`) to confirm no unauthorized or anonymous invocations.
  - Deliver idempotent multi-tenant seed script `scripts/seed-test-tenants.ts` with strict production guardrails (`ALLOW_SEED=1`).

### Phase 1: Multi-Tenant Boundary & Row-Level Security (RLS) Lockdown
* **Goal:** Mathematically guarantee zero cross-tenant data leakage.
* **Scope:**
  - Audit every table in the `public` schema for `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
  - Verify every policy enforces `company_id` isolation tied directly to `auth.uid()` via `public.company_users`.
  - Eliminate all synthetic fallbacks, missing `WHERE` clauses, and potential bypass routes.
  - Run multi-tenant penetration tests asserting that Tenant A cannot read, mutate, or delete records belonging to Tenant B or Tenant C.

### Phase 2: RPC Security, Atomic Transactions & Financial Integrity
* **Goal:** Protect critical financial and operational RPC functions against unauthorized execution and race conditions.
* **Scope:**
  - Secure `/rest/v1/rpc/admin_purge_*` functions: restrict strictly to verified `platform_admin` service roles; forbid `anon` and standard tenant execution.
  - Audit and harden `mutate_inventory_stock_atomic`, `record_payment_atomic`, and `increment_*_atomic` routines with strict `SET search_path = public`, row-level locking (`FOR UPDATE`), and balance consistency checks.
  - Implement and enforce idempotency key checking across all payment and billing mutations.

### Phase 3: Auth & Identity Chain Hardening
* **Goal:** Establish an unforgeable, authoritative identity chain from authentication to data access.
* **Scope:**
  - Enforce canonical role resolution via `platform_role_templates` and `roles`.
  - Ensure tenant membership verification occurs on every server action and route handler.
  - Audit session cookie handling, PKCE verification, and token expiration lifetimes.
  - Validate top-docked tenant session impersonation banner and auditing.

### Phase 4: Production Verification & Zero-Downtime Deployment
* **Goal:** Validate end-to-end resilience under production-like load and finalize operations runbooks.
* **Scope:**
  - Run full automated regression suite against seeded test tenants (A, B, C).
  - Verify UI compliance with design system tokens (`globals.css`, `design-spec.json`) via `npm run ui-audit`.
  - Clean up lingering copy lint warnings (`npm run copy-lint`).
  - Publish final production deployment and rollback playbook.

---

## 📋 Directory Structure

```
docs/hardening/
├── README.md               # Hardening roadmap, architecture & PR rules (this file)
├── baseline.md             # Initial test & build diagnostic recording
└── migration-drift.md      # Migration inventory, drift analysis & single source of truth
```
