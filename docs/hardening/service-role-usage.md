# Service-Role Supabase Client Usage Audit (`createAdminClient`)

## Overview & Policy
The Supabase service-role client (`createAdminClient`) bypasses PostgreSQL Row-Level Security (RLS). Under InkFlow ERP hardening rules:
1. **Never use unrestricted service-role in application-layer code** without tenant scoping.
2. Tenant-scoped operations must use `tenantScoped(admin, companyId)` in `lib/supabase/admin.ts` to automatically enforce `.eq('company_id', companyId)` on queries.
3. Operations that can execute with user credentials must prefer the user-session client (`createClient()`).
4. Cross-tenant platform operations must be guarded by strict server-side platform admin verification (`requirePlatformAdmin`).

---

## Detailed Call-Site Inventory (55 Files)

### 1. Server Actions (`actions/`)
| File | Usage / Responsibility | Hardening Policy |
| :--- | :--- | :--- |
| `actions/attendance.actions.ts` | Employee check-in/out and supervisor approval bypasses | Tenant-scoped via `withTenantAction` + `tenantScoped(admin, companyId)` |
| `actions/email-gateway.actions.ts` | Tenant SMTP credential testing and dispatch | Tenant-scoped via `tenantScoped(admin, companyId)` |
| `actions/platform-auth.actions.ts` | Platform admin credential verification and bootstrap | Platform-only: verify `platform_admins` table |
| `actions/platform-whatsapp.actions.ts` | Global WhatsApp system gateway management | Platform-only: verify `platform_admins` table |
| `actions/whatsapp-campaign.actions.ts` | Broadcast campaign dispatch and recipient processing | Tenant-scoped via `tenantScoped(admin, companyId)` |
| `actions/whatsapp-connection.actions.ts` | Per-tenant WhatsApp session registration and QR binding | Tenant-scoped via `tenantScoped(admin, companyId)` |

---

### 2. Repositories (`lib/repositories/`)
Repositories execute core data mutations. When privileged bypass is required (e.g. for atomic cross-table triggers or multi-entity ledger posts), `tenantScoped(admin, companyId)` enforces strict tenant isolation:

| Repository File | Primary Purpose | Scope & Isolation Rule |
| :--- | :--- | :--- |
| `attendance.repository.ts` | Biometric sync & shift schedules | Scoped to `company_id` |
| `audit.repository.ts` | Security audit trail emission | Append-only with mandatory `company_id` |
| `billing.repository.ts` | Invoices, payments, fiscal ledgers | Scoped to `company_id` |
| `customer.repository.ts` | CRM customer directory & pricing | Scoped to `company_id` |
| `design.repository.ts` | Prepress job orders & attachments | Scoped to `company_id` |
| `finance.repository.ts` | Chart of accounts & journal entries | Scoped to `company_id` |
| `inventory.repository.ts` | Stock valuation, SKU balances | Scoped to `company_id` |
| `invoice-request.repository.ts` | Proforma & invoice approval workflows | Scoped to `company_id` |
| `logistics.repository.ts` | Delivery challans & dispatches | Scoped to `company_id` |
| `product.repository.ts` | Catalog & multi-tier pricing | Scoped to `company_id` |
| `quotation.repository.ts` | Sales quotations & estimation | Scoped to `company_id` |
| `tenant.repository.ts` | Company metadata, slug resolution | System & company lookup (`companies.id`) |
| `trash.repository.ts` | Soft-deleted records recovery | Scoped to `company_id` |
| `workforce.repository.ts` | Payroll, employee roster | Scoped to `company_id` |

---

### 3. Services (`services/`)
| Service File | Functionality | Isolation Classification |
| :--- | :--- | :--- |
| `auth.service.ts` | Multi-tenant auth, password hashing, invitation tokens | Auth subsystem (creates company_users) |
| `auth-email.service.ts` | Transactional email generation | Auth subsystem |
| `otp.service.ts` | SMS/Email OTP verification | Auth subsystem |
| `company-users.service.ts` | Tenant role & seat management | Tenant-scoped |
| `costing.service.ts` | Production cost estimation algorithms | Tenant-scoped |
| `workforce.service.ts` | Payroll ledger generation | Tenant-scoped |
| `workflow.service.ts` | Approval state machine transitions | Tenant-scoped |
| `saas-billing.service.ts` | Platform billing for tenants | Platform-level (cross-tenant billing) |
| `saas-revenue.service.ts` | Platform revenue aggregation | Platform-level |
| `platform.service.ts` | Multi-tenant provisioning & health checks | Platform-level |
| `platform-entitlement.service.ts` | Plan limits & feature flags | Platform-level |
| `platform-subscription.service.ts` | Plan tiers and renewals | Platform-level |
| `tenant.service.ts` | Tenant workspace provisioning | System provisioning |
| `support.service.ts` | Platform customer support tickets | Platform & Tenant |
| `subscription.service.ts` | Tenant plan enforcement | Tenant-scoped |
| `entitlement.service.ts` | Quota checks | Tenant-scoped |
| `gateway.service.ts` | Payment gateway integration | Tenant-scoped |
| `email-gateway.service.ts` | Outbound mail router | Tenant-scoped |
| `communication-router.ts` | Notification dispatch | System router |

---

### 4. API Routes (`app/api/` & `app/(auth)/`)
| Route File | Purpose | Security Controls |
| :--- | :--- | :--- |
| `app/(auth)/auth/callback/route.ts` | Supabase OAuth code exchange | Auth subsystem |
| `app/api/auth/google/callback/route.ts` | Google OAuth identity exchange | Auth subsystem + signs HMAC session cookie |
| `app/api/email/oauth/google/callback/route.ts` | Gmail SMTP OAuth grant exchange | Verifies state & tenant ownership |
| `app/api/platform/export/[companyId]/route.ts` | Platform tenant export | Protected: `requirePlatformAdmin` |
| `app/api/webhooks/openwa/route.ts` | WhatsApp webhook ingestion | Verifies webhook secret |
| `app/api/webhooks/[provider]/route.ts` | Payment webhook ingestion (bKash/Nagad/SSL) | Verifies provider signature & idempotency |

---

### 5. Authentication, Background Jobs & Scripts
| File | Context | Validation Rule |
| :--- | :--- | :--- |
| `lib/auth/google-auth.ts` | Google user linking | Server-only auth provider |
| `lib/auth/platform-auth.ts` | Verifying platform admin records | Queries `platform_admins` |
| `lib/auth/tenant-auth.ts` | Resolving user company memberships | Queries `company_users` |
| `lib/supabase/server.ts` | `establishServerSession` magiclink | Server-only session minting |
| `lib/communication/job-queue.ts` | Asynchronous communication worker | Background queue worker |
| `lib/security/storage-cleanup.ts` | Storage bucket garbage collection | System cleanup worker |
| `scripts/*.ts` | Maintenance & DB migration verification | CLI operations |
| `tests/**/*.ts` | Test harness & database verification | Test mock/setup |

---

## Action Plan & Verification
1. `lib/supabase/admin.ts` exports `tenantScoped(admin, companyId)` to enforce company boundaries.
2. Server actions use `withTenantAction` which injects a scoped context.
3. Every API route verifies its authorization headers and credentials.
