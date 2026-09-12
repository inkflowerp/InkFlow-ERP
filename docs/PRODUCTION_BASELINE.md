# InkFlow / PrintERP — Certified Production Baseline & Development Guardrails

## STATUS

InkFlow / PrintERP is officially:

**CERTIFIED FOR PRODUCTION**

* **Automated Tests:** 517 / 517 passed (149 test suites)
* **TypeScript:** 0 errors
* **ESLint:** 0 errors
* **Next.js Production Build:** 100% Passing (Turbopack, 98 compiled routes)

This document defines the mandatory architectural baseline for all future development.
Before implementing any feature, modification, optimization, migration, integration, or refactor, inspect and preserve this baseline.

---

# 1. DO NOT BREAK CERTIFIED FUNCTIONALITY

Future development must be cumulative.

Do NOT:
* rebuild working systems unnecessarily
* replace stable architecture without evidence
* remove existing security boundaries
* weaken RLS
* bypass server-side authorization
* remove pagination limits
* duplicate financial calculation logic
* introduce tenant-global caches
* expose sensitive telemetry
* break existing workflows

Reuse existing components, repositories, services, utilities, database functions, and patterns wherever appropriate.

---

# 2. MULTI-TENANT ISOLATION — NON-NEGOTIABLE

Architecture hierarchy:
```text
Platform
   ↓
Company / Tenant
   ↓
Branch
   ↓
Department
   ↓
User / Employee
   ↓
Responsibility
   ↓
Permission
   ↓
Data Scope
```

Every tenant-sensitive operation must enforce the correct tenant context.

Never trust:
* client-provided `company_id`
* client-provided `branch_id`
* `tenantSlug` alone
* hidden UI controls

Authorization must be enforced server-side and at the database layer.

Never permit:
```text
Tenant A → Tenant B data
```

---

# 3. DATABASE SECURITY & RLS

PostgreSQL Row-Level Security (RLS) remains a mandatory security boundary.

Do not bypass RLS for convenience.

For `SECURITY DEFINER` functions:
* explicitly define safe `search_path = public, pg_temp`
* validate authenticated caller (`auth.uid() IS NOT NULL`)
* validate company membership (`public.auth_is_active_company_user(company_id)`)
* validate branch scope where applicable
* validate platform-admin authority where applicable (`public.auth_is_platform_admin()`)
* restrict EXECUTE permissions appropriately
* prevent PUBLIC/anonymous access (`REVOKE EXECUTE ... FROM PUBLIC; REVOKE EXECUTE ... FROM anon;`)

Every database migration must be reviewed for tenant-isolation impact.

---

# 4. PAGINATION

All large datasets must remain bounded.

Maintain:
```text
MAX_PAGE_SIZE <= 100
```

Never introduce `SELECT *` for large transactional datasets without column projection.

Use:
* server-side filtering
* server-side sorting
* server-side pagination
* selected columns
* appropriate composite indexes

Never download an entire tenant dataset merely to paginate/filter it in the browser.

---

# 5. FINANCIAL INTEGRITY

Financial calculations are authoritative.

Do not create duplicate implementations for:
* invoice totals
* VAT (standard 15%, truncated 7.5%, retail POS 5%, reverse VAT extraction)
* discounts & policy discount caps
* payments
* due balances
* overpayments & excess credit
* split payments across cash, bKash, Nagad, and bank transfer

Reuse the established calculation services in `lib/payments/` and test suites in `tests/unit/payments-due.test.ts` and `tests/unit/vat-discounts.test.ts`.

Performance optimization must never compromise financial correctness.

---

# 6. TELEMETRY & LOGGING

All performance/trace metadata must use the established sanitization mechanism:
```typescript
import { sanitizeMetadata } from '@/lib/performance/logger'
```

Never log:
* passwords
* authentication tokens / refresh tokens
* API keys / secrets
* payment credentials
* unnecessary PII

Any new logger or monitoring integration must preserve equivalent redaction.

---

# 7. RATE LIMITING ARCHITECTURE

The certified architecture supports:
```text
Local Sliding Window (checkTenantRateLimit)
        +
RateLimitAdapter Interface
        +
Distributed Store (Upstash Redis / Vercel KV via checkDistributedRateLimit)
```

The local limiter must not be accidentally removed.
For production serverless/multi-region deployments, configure a shared distributed store where required.

If distributed storage is unreachable, fallback to local memory gracefully without exposing unprotected endpoints.

---

# 8. PERFORMANCE BASELINE

Future development must not introduce:
* N+1 database queries
* unbounded queries
* unnecessary API requests
* unnecessary client hydration
* huge client bundles
* browser-side processing of massive datasets
* unnecessary polling
* expensive synchronous operations

Before optimizing, measure. After optimizing, measure again.

---

# 9. FRONTEND ARCHITECTURE

Prefer:
* Server Components for server-rendered data
* Client Components only where user interactivity requires them
* streaming skeletons (`loading.tsx`)
* route-level error boundaries (`error.tsx`)
* lazy loading for heavy components (e.g. chart visualizations)
* bounded data fetching

Every major route must support the 5 key UX states:
```text
Loading → Success → Empty → Error → Retry
```

Never use an indefinite loading spinner as the only loading experience.

---

# 10. MOBILE-FIRST REQUIREMENTS

All new features must work on:
* small mobile viewports (>=320px)
* mobile browsers (Android / iOS)
* slow networks & high latency
* touch interaction (interactive touch targets >= 38px–44px)

Avoid:
* tiny controls
* dense ERP layouts that overflow without scroll containers
* unnecessary horizontal scrolling on main viewport
* oversized desktop-only interfaces

---

# 11. DATA ACCESS ARCHITECTURE

Preferred request flow:
```text
UI (Client / Server Component)
 ↓
Server Action / API Route
 ↓
Repository / Service Layer
 ↓
Supabase Client (SSR)
 ↓
PostgreSQL RLS Engine
```

Do not allow UI components to bypass established authorization/data-access boundaries.

Repositories must:
* scope data by `company_id`
* validate input
* bound queries (`MAX_PAGE_SIZE = 100`)
* select required columns
* handle errors consistently

---

# 12. DATABASE MIGRATIONS

Before creating a migration:
1. Inspect current schema.
2. Inspect existing migrations (`001` through `048`).
3. Check existing indexes.
4. Check foreign keys.
5. Check RLS policies.
6. Check constraints.
7. Check production compatibility.
8. Check migration ordering.

Never assume a column or table exists without checking migration history.

---

# 13. V1–V10 ROADMAP COMPATIBILITY

Future work must remain aligned with the modular roadmap:
* **V1:** Core Operations (CRM, Quotes, Orders, Invoices, Delivery)
* **V2:** Advanced Production & Rework Tracking
* **V3:** Inventory & Roll Management
* **V4:** Products, Pricing Matrices & Costing
* **V5:** Purchasing & Suppliers
* **V6:** Workforce, Attendance & Payroll
* **V7:** Bangladesh Localization & NBR VAT
* **V8:** Mobile, WhatsApp, SMS & Offline
* **V9:** Multi-Branch & Advanced Management
* **V10:** Multi-Tenant SaaS Platform Architecture

Do not introduce V2–V10 complexity prematurely into simple V1 workflows unless required for architectural compatibility.

# 14. PERMANENT INKFLOW EMAIL ARCHITECTURE RULE

> **InkFlow supports Gmail and SMTP as email providers. Platform Email and Tenant Email are separate ownership domains. Platform Email belongs exclusively to the InkFlow platform. Tenant Email belongs exclusively to its tenant. Platform-owned events use the Platform Email configuration. Tenant business events use the authenticated tenant's active email configuration. A tenant may choose Gmail or SMTP for its own email service. No tenant may access, use, manage, disconnect, inspect, or select another tenant's Gmail/SMTP configuration or Platform Email configuration. Gmail OAuth credentials, access tokens, refresh tokens, SMTP passwords, and other secrets must remain server-side and securely protected. Email ownership and provider selection must be resolved from authenticated execution context and must never blindly trust client-supplied identifiers. If a tenant has no configured email provider, sending must fail closed. Platform Email must never be an invisible fallback for Tenant Email. These boundaries must be enforced through server-side authorization, database constraints, and Supabase RLS.**

---

# FINAL PRINCIPLE

**Never trade security, tenant isolation, financial correctness, or reliability for performance or development speed.**

InkFlow must remain:
> **Easier than Excel. Faster than paper. More organized than WhatsApp.**

**Simple on the surface.
Powerful underneath.
Secure by default.
Fast at scale.
Tenant-isolated by design.
Reliable for real Bangladeshi print & signage businesses.**
