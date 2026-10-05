# Multi-Tenant Domain, Auth, Routing, Isolation & Security Audit (PrintFlow)
**Document Version:** 1.0.0  
**Phase:** Phase 0 — Discovery and Diagnosis  
**Target Application:** PrintFlow (`printflow-saas`)  
**Auditor:** Senior Full-Stack & Security Engineer  

---

## Executive Summary

This security audit inspects the multi-tenant architecture of PrintFlow, covering domain resolution, authentication flows, authorization gates, database Row-Level Security (RLS), and platform isolation. 

While the codebase contains extensive security functions and enterprise-grade PostgreSQL schema definitions, **critical architectural flaws and isolation vulnerabilities currently compromise multi-tenant security**:
1. **Unsigned Cookie Trust in Middleware:** The routing middleware relies on unverified JSON parsed from `TENANT_SESSION_COOKIE` to assert authentication state, allowing arbitrary client-side spoofing.
2. **Wildcard Cookie Scope Violates Host Isolation:** Auth cookies are set with `domain: .ROOT_DOMAIN` and `httpOnly: false`, exposing tenant sessions across subdomains and to client scripts.
3. **Cross-Tenant Login Fallback:** The authentication service silently falls back to resolving *any* tenant membership if the user is not found in the target subdomain, allowing Tenant A credentials to log into Tenant B's portal.
4. **Widespread `service_role` Bypass:** Over 500 occurrences of `createAdminClient()` bypass PostgreSQL RLS throughout domain services.
5. **PostgreSQL RLS Not Forced:** None of the 191 database tables enforce `FORCE ROW LEVEL SECURITY`, leaving superuser and table-owner roles exempt from RLS policies.
6. **Vercel Wildcard Domain Misconception:** `*.printflow.bd` is fundamentally unroutable via wildcards because `vercel.app` is on the Public Suffix List (PSL).

---

## 1. Environment & Next.js Runtime Discovery

| Component | Detected Specification | Security Implication |
| :--- | :--- | :--- |
| **Next.js Version** | `16.3.4` (App Router, Turbopack, React 19.2.8) | Modern App Router; Server Actions are public HTTP endpoints; requires strict origin checks for `*.ROOT_DOMAIN`. |
| **Middleware** | `middleware.ts` at root delegating to `lib/supabase/middleware.ts` | Edge/Node runtime; Next.js 16 supports standard `middleware.ts`. |
| **Supabase Client** | `@supabase/ssr` `^0.12.5`, `@supabase/supabase-js` `^2.114.0` | Uses modern SSR package with cookie handling. `lib/supabase/server.ts` requires request headers. |
| **Zod Validation** | `zod` `^4.5.4` | Modern Zod available across client and server. |
| **Deployment Spec** | `vercel.json` (`regions: ["sin1"]`, 2 cron jobs) | Cron jobs secured by `CRON_SECRET`. Custom domain required for wildcard SSL. |
| **Server Actions** | App Router Server Actions widely used in `actions/*.ts` | Missing `experimental.serverActions.allowedOrigins` in `next.config.ts`. |
| **Caching Model** | Dynamic server actions; `revalidatePath` used. Zero static prerendering on tenant pages. | No cross-tenant static cache leaks currently detected; must ensure `Cache-Control: private, no-store` on authenticated responses. |
| **Public Env Secrets** | All `NEXT_PUBLIC_*` verified clean | No private keys or service-role secrets are exposed under `NEXT_PUBLIC_*`. |

---

## 2. Complete Data Model & RLS Inventory

An automated scan of `supabase/schema_full.sql` and all 110 migrations in `supabase/migrations/*.sql` revealed:
- **Total Tables:** 191 tables
- **Tables with RLS Enabled:** 191 (100%)
- **Tables with RLS FORCED:** **0 (0%)** — *CRITICAL*
- **Tables with Direct `company_id` or `tenant_id`:** 147 tables
- **Global / Child Tables without direct `company_id`:** 44 tables
- **Tables with 0 Policies (Locked / Dead End):** 4 tables

### A. Zero Policy Tables (RLS Enabled, 0 Policies)
These tables have RLS enabled, but have **zero policies defined**. Any non-superuser query (e.g. via anon/authenticated key) silently returns 0 rows:
1. `sales_order_items`
2. `goods_received_notes`
3. `document_number_counters`
4. `material_issue_items`

*Evidence:* These tables are only accessible when services use `createAdminClient()` (`service_role`), completely bypassing RLS.

### B. Global Reference & Platform Tables (Documented Allowlist)
The following tables legitimately do not carry a `company_id`:
- **Geography & Master Data:** `divisions`, `districts`, `upazilas`, `locations_master`, `business_categories`, `measurement_units`.
- **System RBAC & Features:** `permissions`, `role_permissions`, `features_catalog`, `subscription_plans`, `plan_versions`, `platform_plans`, `platform_saas_plans`.
- **Platform Owner Tables:** `platform_admins`, `platform_feature_flags`, `platform_system_settings`, `platform_incidents`, `platform_emergency_controls`, `platform_active_sessions`, `platform_subscriptions`, `platform_subscription_events`, `platform_webhook_events`.
- **Global Identities:** `profiles`, `user_profiles`, `auth_verifications`.

### C. Child Tables Missing Direct `tenant_id`
The following child tables depend solely on parent foreign keys for tenant scoping:
- `quotation_items`, `quotation_activities` (parent: `quotations.company_id`)
- `invoice_items` (parent: `invoices.company_id`)
- `purchase_order_items` (parent: `purchase_orders.company_id`)
- `challan_items` (parent: `delivery_challans.company_id`)
- `payment_allocations` (parent: `customer_payments.company_id`)
- `design_versions`, `design_feedback_logs` (parent: `design_jobs.company_id`)
- `goods_received_note_items`, `purchase_request_items`, `supplier_return_items`

*Vulnerability:* Without `tenant_id` on child rows, child RLS policies must execute expensive `EXISTS (SELECT 1 FROM parent WHERE parent.id = child.parent_id AND ...)` subqueries, which creates query latency and risks orphan row leakage if parent joins fail.

### D. Security Helper Functions Status
- `public.auth_is_active_company_user(target_company_id uuid)`: Defined in Migration 052/053 with `SECURITY DEFINER` and `SET search_path = public, pg_temp`. Validates `company_users` and `companies.is_active`.
- `public.resolve_tenant_by_hostname(p_hostname text)`: Defined in Migration 098. **Vulnerable:** Uses `SPLIT_PART(v_clean_host, '.', 1)` which incorrectly interprets multi-part hostnames or unknown domains.

---

## 3. Current Auth & Session Flow Map

```mermaid
flowchart TD
    Req[Incoming Request] --> Mw[middleware.ts / updateSession]
    Mw --> HostRes[resolveHostname]
    HostRes -->|Host Type| CheckHost{Host Type?}
    
    CheckHost -->|Root Domain| RootFlow[Marketing / Register / Login]
    CheckHost -->|Platform Subdomain| PlatFlow[Platform Admin Panel]
    CheckHost -->|Tenant Subdomain| TenantFlow[Tenant App / Login]
    
    TenantFlow --> CookCheck{TENANT_SESSION_COOKIE?}
    CookCheck -->|Unverified Cookie Found| SpoofPass[Passes Middleware Check!]
    CookCheck -->|No Cookie| SupaCheck{supabase.auth.getUser}
    SupaCheck -->|Authenticated| DashRewrite[Rewrite to /[tenantSlug]/dashboard]
    SupaCheck -->|Unauthenticated| LoginRedirect[Redirect to /login]
```

### Flow 1: Registration (`actions/auth.actions.ts:signUpAction`)
- Collects name, email, password, phone.
- Calls `AuthService.signUp()` -> Creates Supabase Auth user + `user_profiles` row.
- Sends 6-digit OTP email.
- **Flaw:** Workspace creation happens in a separate, multi-step browser onboarding flow (`/onboarding`). An interrupted flow leaves orphaned users without a tenant.

### Flow 2: Tenant Login (`actions/auth.actions.ts:loginAction`)
- Accepts email/phone/username and password.
- Resolves identifier to email via `AuthService.resolveLoginEmail()`.
- Authenticates with `supabase.auth.signInWithPassword()`.
- **Critical Flaw 1:** Calls `TenantRepository.resolveUserMembership(user.id, targetCompanySlug)`. If `null`, falls back to `resolveUserMembership(user.id)` (any tenant!), allowing cross-tenant authentication.
- **Critical Flaw 2:** Sets `TENANT_SESSION_COOKIE` containing raw JSON with `companySlug`.
- **Critical Flaw 3:** Sets cookie with `domain: .ROOT_DOMAIN` and `httpOnly: false`.

### Flow 3: Employee Login
- Employees created in `services/workforce.service.ts:syncEmployeePortalLogin()`.
- Generates synthetic email: `username@companySlug.printflow.bd`.
- **Critical Flaw:** Calls `admin.auth.admin.listUsers({ page: 1, perPage: 100 })` to check if email exists. In projects with >100 users, this misses existing users and throws duplicate user creation errors.
- Login screen is shared on `/login`; employee enters username/phone, resolved by `resolveLoginEmail()`.

### Flow 4: Session Revocation & Logout (`app/logout/route.ts`)
- Deletes `TENANT_SESSION_COOKIE`, `PLATFORM_SESSION_COOKIE`, and `printflow_support_tenant`.
- Calls `supabase.auth.signOut()`.
- **Flaw:** Deleting Supabase auth session does not immediately invalidate JWT tokens cached on client devices.

---

## 4. Failure Reproduction & Root Cause Analysis

### Reproduction 1: Wildcard 404 & SSL Failure on `*.printflow.bd`
- **Steps:** Navigate to `https://acme.printflow.bd`.
- **Observed Behavior:** Browser displays `ERR_SSL_UNRECOGNIZED_NAME_ALERT` or Vercel 404 "DEPLOYMENT_NOT_FOUND".
- **Root Cause:** `vercel.app` is an entry on the Public Suffix List (PSL). Vercel does not and cannot issue wildcard SSL certificates (`*.printflow.bd`) for projects on the `vercel.app` domain.
- **Resolution:** Production must use a custom root domain (e.g. `printflow.bd`) with nameservers pointing to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Interim preview/development environments must use path-based routing (`/t/[tenantSlug]/...` or `/[tenantSlug]/...`) behind an explicit environment flag.

### Reproduction 2: Wrong-Tenant Authentication (Cross-Tenant Login)
- **Steps:**
  1. User registered in Tenant Alpha (`alpha.ROOT_DOMAIN`).
  2. User navigates to Tenant Beta (`beta.ROOT_DOMAIN/login`).
  3. User enters credentials for Tenant Alpha.
- **Observed Behavior:** Login succeeds; user is either logged in or redirected to Alpha's dashboard while carrying cookies on Beta's host.
- **Root Cause:** `services/auth.service.ts` lines 615-620 contains:
  ```ts
  let membership = await TenantRepository.resolveUserMembership(user.id, targetCompanySlug)
  if (!membership) {
    membership = await TenantRepository.resolveUserMembership(user.id) // ANY tenant!
  }
  ```
  The fallback completely disregards `targetCompanySlug`.

### Reproduction 3: Middleware Authentication Bypass via Forged Cookie
- **Steps:**
  1. Open browser devtools on `https://alpha.ROOT_DOMAIN`.
  2. In document cookies, set: `printflow_tenant_session={"userId":"any-id","companySlug":"alpha","companyId":"any-id"}`.
  3. Navigate to protected route `https://alpha.ROOT_DOMAIN/invoices`.
- **Observed Behavior:** `lib/supabase/middleware.ts` line 220 evaluates:
  ```ts
  const isTenantAuthenticated = Boolean(user) || hasValidTenantCookie
  ```
  `hasValidTenantCookie` is `true`. The middleware does not redirect to `/login` and rewrites to internal route `/[tenantSlug]/invoices`.
- **Root Cause:** Middleware trusts client-supplied cookie content without cryptographic signature or verified Supabase session token.

### Reproduction 4: Cross-Subdomain Session Hijacking via Wildcard Cookie
- **Steps:**
  1. Log into `alpha.printflow.bd`.
  2. Inspect cookie `printflow_tenant_session`.
- **Observed Behavior:** Domain attribute is `.printflow.bd`. Cookie is sent to `beta.printflow.bd` and `admin.printflow.bd`.
- **Root Cause:** `lib/tenant/tenant-resolution.ts` line 592 explicitly computes `domain = .${cleanRoot}` and `httpOnly: false`.

---

## 5. Audit Findings by Severity

### CRITICAL SEVERITY

| ID | Finding | Location | Impact |
| :--- | :--- | :--- | :--- |
| **SEC-CRIT-01** | **Unsigned Cookie Grants Authentication in Middleware** | [lib/supabase/middleware.ts#L161-L220](file:///f:/Antigravity/Old%20ERP/PrintFlow/lib/supabase/middleware.ts#L161-L220) | Attackers can bypass edge redirect guards by setting a fake `printflow_tenant_session` cookie. |
| **SEC-CRIT-02** | **Wildcard Cookie Scope Violates Tenant Isolation** | [lib/tenant/tenant-resolution.ts#L592-L601](file:///f:/Antigravity/Old%20ERP/PrintFlow/lib/tenant/tenant-resolution.ts#L592-L601) | Cookies set with `Domain=.ROOT_DOMAIN` and `httpOnly: false` leak tenant sessions across all subdomains and to XSS. |
| **SEC-CRIT-03** | **Cross-Tenant Fallback in User Authentication** | [services/auth.service.ts#L615-L620](file:///f:/Antigravity/Old%20ERP/PrintFlow/services/auth.service.ts#L615-L620) | User can authenticate into an unauthorized tenant portal because auth silently falls back to any tenant. |
| **SEC-CRIT-04** | **Database Superuser RLS Bypass (`FORCE ROW LEVEL SECURITY` Missing)** | Database Schema (All 191 tables) | PostgreSQL table owners and service connections bypass RLS entirely unless `FORCE ROW LEVEL SECURITY` is set. |
| **SEC-CRIT-05** | **Overuse of Privileged `service_role` Client (500+ calls)** | `services/*.service.ts` | Services bypass database RLS, risking IDOR if application query misses `.eq('company_id', ...)`. |

### HIGH SEVERITY

| ID | Finding | Location | Impact |
| :--- | :--- | :--- | :--- |
| **SEC-HIGH-01** | **Vercel Wildcard SSL Impossibility on `*.vercel.app`** | Project Domain Architecture | Subdomains on `*.printflow.bd` fail SSL/DNS; requires custom root domain and path-based fallback. |
| **SEC-HIGH-02** | **Hardcoded / Broken `listUsers` Pagination in Employee Provisioning** | [services/workforce.service.ts#L463](file:///f:/Antigravity/Old%20ERP/PrintFlow/services/workforce.service.ts#L463) | Restricts user search to 100 users; causes 500 error when employee count exceeds 100. |
| **SEC-HIGH-03** | **User Enumeration in Identifier Availability Check** | [services/auth.service.ts#L302](file:///f:/Antigravity/Old%20ERP/PrintFlow/services/auth.service.ts#L302) | Exposes whether specific emails, phones, or usernames exist in the system. |
| **SEC-HIGH-04** | **Missing Server Actions Origin Whitelist in `next.config.ts`** | [next.config.ts](file:///f:/Antigravity/Old%20ERP/PrintFlow/next.config.ts) | Cross-subdomain Server Actions may be blocked or vulnerable to cross-origin invocation. |
| **SEC-HIGH-05** | **Zero-Policy Tables Block Non-Admin Access** | `sales_order_items`, `goods_received_notes`, `document_number_counters`, `material_issue_items` | Non-admin database operations fail or require `service_role` bypass. |

### MEDIUM SEVERITY

| ID | Finding | Location | Impact |
| :--- | :--- | :--- | :--- |
| **SEC-MED-01** | **Missing Security Headers (CSP, HSTS, Referrer-Policy)** | [next.config.ts#L73-L87](file:///f:/Antigravity/Old%20ERP/PrintFlow/next.config.ts#L73-L87) | Missing defensive browser protections against clickjacking, MIME sniffing, and script injection. |
| **SEC-MED-02** | **Vulnerable Hostname Split in Database Stored Procedure** | [supabase/migrations/098_tenant_domains_and_subdomain_routing.sql#L107-L111](file:///f:/Antigravity/Old%20ERP/PrintFlow/supabase/migrations/098_tenant_domains_and_subdomain_routing.sql#L107-L111) | `SPLIT_PART(host, '.', 1)` misidentifies multi-part domains and subdomains. |
| **SEC-MED-03** | **Nested Subdomain Acceptance** | [lib/tenant/tenant-resolution.ts#L445-L447](file:///f:/Antigravity/Old%20ERP/PrintFlow/lib/tenant/tenant-resolution.ts#L445-L447) | Accepts multi-part subdomains (e.g. `a.b.root.com`), violating the single-label requirement. |
| **SEC-MED-04** | **Non-Atomic Tenant Registration** | [app/(onboarding)/onboarding/page.tsx](file:///f:/Antigravity/Old%20ERP/PrintFlow/app/%28onboarding%29/onboarding/page.tsx) | Multi-step client onboarding leaves orphaned accounts if user abandons mid-way. |

### LOW SEVERITY

| ID | Finding | Location | Impact |
| :--- | :--- | :--- | :--- |
| **SEC-LOW-01** | **Client Component Fallback in Server Module** | [lib/supabase/server.ts#L7-L9](file:///f:/Antigravity/Old%20ERP/PrintFlow/lib/supabase/server.ts#L7-L9) | `lib/supabase/server.ts` does not enforce `import 'server-only'`. |
| **SEC-LOW-02** | **Redundant Root Domain Route Wrappers** | `app/invoices/page.tsx`, `app/quotations/page.tsx`, etc. | Clutters `app/` directory instead of using centralized route groups `app/(marketing)`. |

---

## Conclusion & Transition to Phase 1

The system has rich multi-tenant database structures, but the routing and application boundaries allow several authentication and session isolation bypasses. 

In Phase 1, we will draft `ARCHITECTURE.md` specifying:
1. Canonical route group re-organization (`app/(marketing)`, `app/(tenant)`, `app/(platform)`).
2. Host-only cookie isolation (zero wildcard cookies).
3. The server-only Data Access Layer (`lib/auth/dal.ts`).
4. Strict `resolveTenant` engine with exact single-label validation and comprehensive reserved lists.
5. Migration plan to enforce `FORCE ROW LEVEL SECURITY` and add direct `tenant_id` to child tables.
