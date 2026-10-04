# Platform Service-Role Data Access & Tenant Isolation Registry

**Document Version:** 1.0.0  
**Last Updated:** October 2026  
**Security Level:** Critical System Audit  

---

## 1. Architectural Invariant

Platform administrators operate under **least-privilege boundaries**:
1. **Zero Unaudited Tenant Access:** Platform administrators never query raw tenant tables directly from client components. All administrative data reads and mutations occur via authenticated Server Actions wrapped in `withPlatformAction`.
2. **Support & Impersonation Sessions:** Access to live tenant workspaces (`/[tenantSlug]/*`) requires an active, time-boxed (default 30 min, maximum 60 min), cryptographically signed (`printerp_support_tenant`), read-only-by-default support session. Every session initiation, extension, and revocation is recorded in `platform_audit_logs` and `platform_support_sessions`.
3. **Aggregated Cross-Tenant Telemetry:** Metric queries in `PlatformService` (e.g., total active users, system storage consumption, invoice counts for quota enforcement) query cross-tenant metadata strictly for SaaS operations (billing, quota ranking, customer health scores).

---

## 2. Complete Inventory of Service-Role Queries in Platform Services

The following table documents every database table accessed via `createAdminClient()` across platform services and actions:

| Service / File | Table Queried | Purpose | Access Scope | Tenant Protected |
| :--- | :--- | :--- | :--- | :--- |
| `services/platform.service.ts` | `companies` | Tenant registry, status management, billing status | Cross-Tenant Registry | Yes (Aggregated / Admin) |
| `services/platform.service.ts` | `company_subscriptions` | Subscription tracking, plan allocation, limits | Cross-Tenant Billing | Yes |
| `services/platform.service.ts` | `subscription_plans` | SaaS pricing tiers and quota definitions | Global Catalog | N/A (Platform config) |
| `services/platform.service.ts` | `platform_admins` | Administrator credentials, RBAC roles, MFA state | Platform Root | N/A (Admin auth) |
| `services/platform.service.ts` | `platform_audit_logs` | Immutable audit trail for all platform mutations | Platform Root | Audited append-only |
| `services/platform.service.ts` | `platform_active_sessions` | Active administrator session tracking and revocation | Platform Root | Admin scoped |
| `services/platform.service.ts` | `platform_support_sessions` | Support session tokens, durations, and scopes | Platform Root | Audited append-only |
| `services/platform.service.ts` | `platform_feature_flags` | Global feature toggles | Global Catalog | N/A |
| `services/platform.service.ts` | `platform_tenant_feature_flags` | Per-tenant feature flag overrides | Tenant-Scoped Overrides | Yes |
| `services/platform.service.ts` | `platform_emergency_controls` | Kill-switches (login freeze, export block) | Global Catalog | N/A |
| `services/platform.service.ts` | `platform_system_settings` | Platform runtime configuration and branding | Global Catalog | N/A |
| `services/platform.service.ts` | `platform_system_health_events` | System health anomalies and error telemetry | System Telemetry | N/A |
| `services/platform.service.ts` | `platform_incidents` | Incident tracking and resolution logs | Operations | N/A |
| `services/platform.service.ts` | `platform_background_jobs` | Queue worker telemetry and retry status | Operations | N/A |
| `services/platform.service.ts` | `platform_notifications` | Platform alert notices and broadcasts | Admin & Tenant broadcast | Filtered |
| `services/platform.service.ts` | `platform_role_templates` | Global RBAC permission templates | Global Catalog | N/A |
| `services/platform.service.ts` | `company_users` | Cross-tenant user registry & staff counts | Tenant-Scoped Metadata | Anonymized / Aggregated |
| `services/platform.service.ts` | `user_profiles` | User contact info for tenant 360 overview | Tenant-Scoped Metadata | Support / Admin view |
| `services/platform.service.ts` | `user_roles` | Tenant user role resolution | Tenant-Scoped Metadata | Read-only |
| `services/platform.service.ts` | `branches` | Branch counts for quota enforcement | Aggregation for Quota | Read-only |
| `services/platform.service.ts` | `sales_orders` | Order volume aggregation for tenant health scores | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `invoices` | Invoice counts and revenue reconciliation | Aggregate sum/count | Read-only (Count/Sum) |
| `services/platform.service.ts` | `customers` | Customer volume for quota and health calculation | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `products` | Product catalog size for quota calculation | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `materials` | Inventory item count for quota calculation | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `job_orders` | Job count for quota calculation | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `communication_logs` | Communication volume for quota calculation | Aggregate count | Read-only (Count only) |
| `services/platform.service.ts` | `auth_verifications` | MFA verification status audit across tenant users | Security overview | Read-only |
| `services/platform.service.ts` | `gateway_integrations` | Tenant payment gateway integration health | Health overview | Read-only |
| `services/platform-subscription.service.ts` | `platform_subscriptions` | SaaS platform subscription records | Platform Billing | Scoped |
| `services/platform-subscription.service.ts` | `platform_saas_plans` | Pricing tiers and billing intervals | Global Catalog | N/A |
| `services/platform-subscription.service.ts` | `gateway_transactions` | Stripe/SSLCommerz payment transaction verification | Financial Gateway | Audited |
| `services/platform-subscription.service.ts` | `platform_subscription_events` | Lifecycle audit events (trial, upgrade, dunning) | Billing History | Audited |
| `actions/platform-whatsapp.actions.ts` | `tenant_whatsapp_connections` | WhatsApp gateway Chromium connection status | Session Telemetry | Session IDs sanitized |
| `actions/platform-whatsapp.actions.ts` | `whatsapp_messages` | Message volume counting for daily rate limits | Rate limit counter | Aggregate count only |
| `actions/email-gateway.actions.ts` | `email_gateways` | Global Platform and tenant email gateways | SMTP/Gmail credentials | Encrypted at rest |
| `actions/email-gateway.actions.ts` | `email_logs` | Dispatch logs and deliverability tracking | Operational logs | Sanitized |
| `actions/email-gateway.actions.ts` | `email_templates` | Default platform email templates | Global templates | N/A |

---

## 3. Audited Administrative RPCs

Mutations that affect tenant lifecycle or permanently delete data are executed via dedicated PostgreSQL functions that enforce strict caller checks:

1. **`delete_tenant_permanently(p_company_id UUID)`:**
   - **Invoked by:** `PlatformService.deleteCompanyPermanently(companyId)`
   - **Guards:** Requires `platform_owner` role, verified MFA within last 5 minutes (`destruct: true`), mandatory typed reason.
   - **Protection:** In production, permanently disabled unless `ALLOW_PLATFORM_PURGE_ALL === 'true'`.
   - **Audit:** Automatically logged to `platform_audit_logs` with actor ID, IP address, user-agent, target company ID, and reason.

---

## 4. Support Impersonation Access Protocol

When an authorized platform engineer or support officer investigates an issue on behalf of a tenant:
1. **Creation:** `startTenantSupportSessionAction(companyId, reason, accessLevel, durationMinutes)`.
2. **Authorization:** Requires `support.access` permission (or `platform_owner` for full admin).
3. **Session Token:** An HMAC-SHA256 signed JWT is generated containing:
   - `sessionId` (matches `platform_support_sessions.id`)
   - `platformUserId`
   - `targetCompanyId`
   - `accessLevel` (`read_only` by default)
   - `expiresAt` (Unix timestamp, default 30 min, maximum 60 min)
4. **Tenant Workspace UI:** The tenant shell displays `<ImpersonationBanner />` with an active countdown timer and a red **"Exit Support Session"** button.
5. **Mutation Block:** During `read_only` support sessions, mutating tenant server actions (`withTenantAction`) reject write operations with `SUPPORT_MODE_READ_ONLY`.
6. **Termination:** Exiting the session via `exitTenantSupportSessionAction` instantly destroys the cookie and flags the database record as revoked.
