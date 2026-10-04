# Server Actions Isolation & Security Audit

## Executive Summary
All server actions across the InkFlow ERP application are hardened under the **Fail-Closed Isolation Architecture**.
1. **Tenant Actions**: Must use `withTenantAction({ permission, branchScoped })`.
   - Resolves user identity from Supabase Auth session.
   - Resolves `companyId` strictly from database membership (`company_users`). Never accepts or trusts client-supplied `companyId`.
   - Enforces granular RBAC permissions on BOTH reads and writes.
   - Applies `tenantScoped(admin, companyId)` to guarantee all database queries are constrained to `company_id`.
   - Returns typed `{ ok, success, data, error, code }`.
2. **Platform Actions**: Must use `withPlatformAction({ permission, requireMfa })` or verify `platform_admins` DB presence on every call.
3. **Public / Pre-Auth Actions**: Documented below with explicit rationale for why `withTenantAction` cannot be used.

---

## Action Classification Matrix (All 44 Action Files)

| File | Target Scope | Security Mechanism |
| :--- | :--- | :--- |
| `actions/attendance.actions.ts` | Tenant | `withTenantAction({ permission: 'hr.attendance.*', branchScoped: true })` |
| `actions/audit.actions.ts` | Tenant | `withTenantAction({ permission: 'audit.view' })` |
| `actions/auth.actions.ts` | Public / Pre-Auth | Pre-auth endpoints (see Excluded List below) |
| `actions/billing.actions.ts` | Tenant | `withTenantAction({ permission: 'invoices.*' })` |
| `actions/branch-analytics.actions.ts` | Tenant | `withTenantAction({ permission: 'reports.view', branchScoped: true })` |
| `actions/branch.actions.ts` | Tenant | `withTenantAction({ permission: 'branches.*' })` |
| `actions/category.actions.ts` | Tenant | `withTenantAction({ permission: 'inventory.*' })` |
| `actions/communication.actions.ts` | Tenant | `withTenantAction({ permission: 'communication.*' })` |
| `actions/company-users.actions.ts` | Tenant | `withTenantAction({ permission: 'users.*' })` |
| `actions/configuration-masters.actions.ts` | Tenant | `withTenantAction({ permission: 'settings.*' })` |
| `actions/costing.actions.ts` | Tenant | `withTenantAction({ permission: 'costing.*' })` |
| `actions/customer.actions.ts` | Tenant | `withTenantAction({ permission: 'customers.*' })` |
| `actions/dashboard.actions.ts` | Tenant | `withTenantAction({ permission: 'dashboard.view' })` |
| `actions/design.actions.ts` | Tenant | `withTenantAction({ permission: 'design.*' })` |
| `actions/email-gateway.actions.ts` | Tenant / Platform | `withTenantAction` / `withPlatformAction` |
| `actions/finance.actions.ts` | Tenant | `withTenantAction({ permission: 'finance.*' })` |
| `actions/gateway.actions.ts` | Platform / Tenant | `withPlatformAction` / `withTenantAction` |
| `actions/inventory.actions.ts` | Tenant | `withTenantAction({ permission: 'inventory.*' })` |
| `actions/invoice-request.actions.ts` | Tenant | `withTenantAction({ permission: 'invoices.*' })` |
| `actions/lead.actions.ts` | Public Marketing | Public demo request submission |
| `actions/logistics.actions.ts` | Tenant | `withTenantAction({ permission: 'logistics.*' })` |
| `actions/machinery.actions.ts` | Tenant | `withTenantAction({ permission: 'machinery.*' })` |
| `actions/notification.actions.ts` | Tenant | `withTenantAction` (scoped to user in tenant) |
| `actions/order.actions.ts` | Tenant | `withTenantAction({ permission: 'orders.*' })` |
| `actions/platform-auth.actions.ts` | Platform Auth | Platform login / MFA verification |
| `actions/platform-data.actions.ts` | Platform Admin | `withPlatformAction` (verifies `platform_admins`) |
| `actions/platform-subscription.actions.ts` | Platform Admin | `withPlatformAction` (verifies `platform_admins`) |
| `actions/platform-whatsapp.actions.ts` | Platform Admin | `withPlatformAction` (verifies `platform_admins`) |
| `actions/platform.actions.ts` | Platform Admin | `withPlatformAction` (verifies `platform_admins`) |
| `actions/pricing.actions.ts` | Tenant | `withTenantAction({ permission: 'pricing.*' })` |
| `actions/product.actions.ts` | Tenant | `withTenantAction({ permission: 'products.*' })` |
| `actions/production-planning.actions.ts` | Tenant | `withTenantAction({ permission: 'production.*' })` |
| `actions/purchase.actions.ts` | Tenant | `withTenantAction({ permission: 'purchases.*' })` |
| `actions/quotation.actions.ts` | Tenant | `withTenantAction({ permission: 'quotations.*' })` |
| `actions/reports.actions.ts` | Tenant | `withTenantAction({ permission: 'reports.view' })` |
| `actions/subscription.actions.ts` | Tenant | `withTenantAction({ permission: 'subscription.*' })` |
| `actions/supplier.actions.ts` | Tenant | `withTenantAction({ permission: 'suppliers.*' })` |
| `actions/support.actions.ts` | Tenant | `withTenantAction({ permission: 'support.*' })` |
| `actions/tenant.actions.ts` | Tenant / Onboarding | Onboarding & tenant workspace management |
| `actions/trash.actions.ts` | Tenant | `withTenantAction({ permission: 'trash.*' })` |
| `actions/whatsapp-campaign.actions.ts` | Tenant | `withTenantAction({ permission: 'whatsapp.*' })` |
| `actions/whatsapp-connection.actions.ts` | Tenant | `withTenantAction({ permission: 'whatsapp.*' })` |
| `actions/workflow.actions.ts` | Tenant | `withTenantAction({ permission: 'workflow.*' })` |
| `actions/workforce.actions.ts` | Tenant | `withTenantAction({ permission: 'hr.*' })` |

---

## Actions Excluded from `withTenantAction` & Rationale

### 1. `actions/auth.actions.ts`
- **Actions:**
  - `loginAction`, `signInAction`, `signUpAction`
  - `checkIdentifierAvailabilityAction`
  - `requestPasswordResetAction`, `resetPasswordAction`
  - `sendOtpAction`, `verifyEmailOtpAction`, `verifyOtpAction`, `verifyPhoneOtpAction`, `verifyEmailOtpForPasswordResetAction`
  - `clearTenantSessionCookie`, `logoutAction`, `getAuthenticatedUserAction`
- **Rationale:**
  These actions execute **before** an authenticated tenant session exists. By definition, a prospective or signing-in user has no authenticated session or tenant membership at the moment of credentials submission. They operate on Supabase Auth and rate-limited public credential verification.

### 2. `actions/lead.actions.ts`
- **Action:** `submitDemoRequestAction`
- **Rationale:**
  This is a public marketing form on the root landing page where prospective leads submit inquiries. It has no tenant membership or user session. It is protected by input schema validation (`DemoRequestSchema`) and rate limiting.

### 3. `actions/tenant.actions.ts`
- **Actions:**
  - `checkSlugAvailabilityAction`: Public slug validation invoked during the tenant registration and onboarding flow before the company row is inserted.
  - `createCompanyAction`: Invoked during initial tenant onboarding by a user who has just registered an auth account but does not yet possess an active company membership.
- **Rationale:**
  At the exact point of workspace creation, the company does not exist in the database yet. Once created, the user is bound as `business_owner` and all subsequent actions are guarded by `withTenantAction`.

### 4. `actions/platform-auth.actions.ts`
- **Actions:**
  - `platformLoginAction`: Pre-authentication credential challenge for platform administrators.
  - `platformLogoutAction`: Platform session termination.
- **Rationale:**
  Pre-login endpoint for platform admins. Authenticates against Supabase Auth, queries `platform_admins`, validates TOTP/MFA, and sets the cryptographically signed `PLATFORM_SESSION_COOKIE`.

### 5. `actions/platform*.ts` (`platform.actions.ts`, `platform-data.actions.ts`, etc.)
- **Rationale:**
  Platform actions govern the entire SaaS infrastructure (all tenants, system settings, billing tiers). They do not belong to a single tenant and therefore cannot use `withTenantAction`. Instead, they use `withPlatformAction` and `requirePlatformAdmin` to strictly verify that the caller is an active record in `platform_admins` with the required granular platform role on every execution.
