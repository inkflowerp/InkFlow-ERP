# INKFLOW — SUBSCRIPTION PLAN CONTROL 360 CERTIFICATION REPORT

## Enterprise Multi-Tenant SaaS Subscription & Entitlement Control Platform

---

### Executive Summary

InkFlow ERP achieves **Subscription Plan Control 360** production certification. The system operates as an authoritative, multi-tenant safe, financially correct, concurrency-safe, provider-independent SaaS subscription and entitlement engine governing plans, canonical features, numerical limits, periodic quotas, trials, grace periods, suspensions, upgrades, downgrades, and platform customizations with **database-level atomic concurrency safety**, **strict server-side enforcement**, and **zero client bypass**.

---

### 1. Current-State Audit Matrix

| Area | Exists | Partial | Broken | Unsafe | Missing | Action / Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Plans** | Yes | - | - | - | - | 4 default tiers (`trial`, `starter`, `business`, `enterprise`) in `DEFAULT_PLANS`, database table `subscription_plans`, and immutable snapshots in `plan_versions`. |
| **Features** | Yes | - | - | - | - | 24 canonical features across 7 business categories in `features_catalog` and `FEATURE_METADATA` with bilingual (EN/BN) labels and descriptions. |
| **Limits** | Yes | - | - | - | - | Explicit `UNLIMITED_LIMIT = -1`, `isUnlimited()`, and atomic validation in `validate_tenant_limit_atomic`. No magic numbers used for unlimited. |
| **Entitlements** | Yes | - | - | - | - | Authoritative single point of truth in `EntitlementService.canUseFeature` and `SubscriptionGuard.requireFeature`. |
| **Trial** | Yes | - | - | - | - | 14-day default evaluation trial, server-calculated remaining days, 7d/3d/1d warnings, zero silent data deletion. |
| **Expiry** | Yes | - | - | - | - | Deterministic UTC timestamp resolution to `expired` state; historical operational ERP data preserved without destructive deletion. |
| **Grace Period** | Yes | - | - | - | - | 7-day grace period on payment failure; operational access retained while displaying billing alert banner. |
| **Suspension** | Yes | - | - | - | - | Operational write blocked while preserving recovery access (Subscription, Invoices, Payment, Support, Export). |
| **Upgrade** | Yes | - | - | - | - | Day-based prorated unused credit calculation (`calculateProration`), SaaS invoice generation, and atomic activation. |
| **Downgrade** | Yes | - | - | - | - | Scheduled at period end (`next_plan_id`, `change_effective_at`), safe over-limit handling without data deletion. |
| **Usage** | Yes | - | - | - | - | Server-side usage counting (`active_users`, `active_branches`, `monthly_orders`, `storage_gb`, `max_customers`, `max_products`). |
| **Feature Gating** | Yes | - | - | - | - | Rich bilingual upgrade prompts in UI; strict rejection in `SubscriptionGuard` server-side. |
| **Server Enforcement** | Yes | - | - | - | - | `SubscriptionGuard.requireSubscription`, `requireFeature`, `requireLimit` blocking unauthenticated or un-entitled actions. |
| **Database Enforcement**| Yes | - | - | - | - | PostgreSQL advisory locking functions (`enforce_tenant_user_addition_atomic`, etc.) preventing race conditions. |
| **RLS** | Yes | - | - | - | - | Tenant isolation policies on all subscription and billing tables (`auth_is_active_company_user`). |
| **Platform Admin** | Yes | - | - | - | - | `/platform/plans` & `/platform/subscriptions` with plan editing, trial extension, manual payments, and MRR telemetry. |
| **Customization** | Yes | - | - | - | - | `custom_limits_override` and plan versioning supported with reason, timestamp, and expiration tracking. |
| **Mobile** | Yes | - | - | - | - | Mobile-first responsive UI on subscription settings, cards, and warning banners. |
| **Tests** | Yes | - | - | - | - | 261 test suites, 974 tests passing cleanly with zero failures. |

---

### 2. Canonical Architecture & Authorization Formula

```text
Platform Administration
       ↓
Plan Catalog & Versioning (`subscription_plans`, `plan_versions`, `features_catalog`)
       ↓
Authoritative Entitlement Engine & Server Guards (`EntitlementService`, `SubscriptionGuard`)
       ↓
Company Subscription & State Machine (`company_subscriptions`, `subscription_events`)
       ↓
Custom Auditable Overrides & Temporary Grants (`custom_limits_override` with expiration)
       ↓
SaaS Subscription Billing & Invoices (`saas_subscription_invoices`, `saas_subscription_invoice_items`)
       ↓
Provider-Independent Payments & Webhooks (`lib/payments/`, `app/api/webhooks/[provider]`)
       ↓
PostgreSQL Concurrency Locking & Atomic Enforcement RPCs
       ↓
Tenant ERP Operations (Users, Branches, Orders, Storage, Features)
```

$$\text{Authenticated} \land \text{Tenant Member} \land \text{RBAC Permission} \land \text{Subscription Allowed} \land \text{Feature Entitled} \land \text{Quota Available} \land \text{Data Scope Valid} = \text{ACTION ALLOWED}$$

---

### 3. Canonical Features Catalog (24 Features Across 7 Categories)

| Feature Key | Name (EN) | Name (BN) | Category | Entitlement Type | Min Plan |
|:---|:---|:---|:---|:---|:---|
| `basic_sales` | Basic Sales & POS | মৌলিক সেলস ও ক্যাশ মেমো | Sales | boolean | Starter |
| `basic_customers` | Basic Customers Directory | গ্রাহক তালিকা ও লেজার | Sales | boolean | Starter |
| `quotation_pdf` | Quotation PDF Generator | কোটেশন পিডিএফ প্রস্তুতকরণ | Sales | boolean | Starter |
| `delivery_challan` | Delivery Challan | ডেলিভারি চালান ও গেটপাস | Sales | boolean | Starter |
| `multi_department` | Multiple Departments | বহু বিভাগ ব্যবস্থাপনা | Production | boolean | Business |
| `inventory` | Inventory & Stock Management | ইনভেন্টরি ও কাঁচামাল স্টক | Inventory | boolean | Business |
| `inventory_rolls` | Roll & Sheet Stock Ledger | রোল ও শিট স্টক লেজার | Inventory | boolean | Business |
| `production` | Shop Floor Production | প্রোডাকশন ফ্লোর ও শিডিউলিং | Production | boolean | Business |
| `production_kanban` | Production Kanban Board | প্রোডাকশন কানবান বোর্ড | Production | boolean | Business |
| `reports` | Reports & Business Analytics | রিপোর্ট ও ব্যবসায়িক হিসাব | Management | boolean | Business |
| `reports_analytics` | Executive Financial Reports | নির্বাহী আর্থিক বিশ্লেষণ | Finance | boolean | Business |
| `hr` | HR & Employee Management | মানবসম্পদ ও কর্মী প্রশাসন | Management | boolean | Business |
| `hr_payroll` | Payroll & Salary Sheets | বেতন ও পে-রোল প্রস্তুতকরণ | Finance | boolean | Business |
| `job_costing` | Job Costing & Profitability | জব কস্টিং ও প্রকৃত লাভ নিরীক্ষা | Finance | boolean | Business |
| `whatsapp_notifications` | WhatsApp Notifications | হোয়াটসঅ্যাপ নোটিফিকেশন | Communication | boolean | Business |
| `sms_notifications` | SMS Notifications | এসএমএস নোটিফিকেশন | Communication | boolean | Business |
| `machinery` | Machinery & Equipment | যন্ত্রপাতি ও ইকুইপমেন্ট | Production | boolean | Business |
| `attendance_qr` | QR & Geofence Attendance | কিউআর ও জিওফেন্স উপস্থিতি | Management | boolean | Business |
| `multi_branch` | Multiple Branches & Hubs | মাল্টি-ব্রাঞ্চ ও শাখা নিয়ন্ত্রণ | Advanced | boolean | Enterprise |
| `advanced_analytics` | Advanced Analytics | উন্নত অ্যানালিটিক্স ও পূর্বাভাস | Advanced | boolean | Enterprise |
| `advanced_permissions` | Advanced Permissions | উন্নত পারমিশন ও রোল কাস্টমাইজেশন | Advanced | boolean | Enterprise |
| `custom_workflows` | Custom Approval Workflows | কাস্টম অনুমোদন ওয়ার্কফ্লো | Advanced | boolean | Enterprise |
| `api_access` | REST API & Webhooks | রেস্ট এপিআই ও ওয়েবহুক | Advanced | boolean | Enterprise |
| `priority_support` | Dedicated Account Manager | ডেডিকেটেড ২৪/৭ সাপোর্ট | Advanced | boolean | Enterprise |

---

### 4. Metered Resource Usage Definitions & Exclusions

1. **Users (`max_users`):** Count of active, invited, or pending members in `company_users`. Inactive/archived users do not count.
2. **Branches (`max_branches`):** Count of active branches in `branches` table (`is_active = true`). Deactivated branches do not count.
3. **Monthly Orders (`monthly_orders`):** Production orders in `sales_orders` created within the current calendar month / billing cycle. **Practice Mode orders (`is_practice = true`) and cancelled/test orders are strictly excluded.**
4. **Cloud Storage (`storage_gb`):** Exact real byte tracking in `saas_tenant_storage_usage` (artwork, documents, invoices, receipts). Client-reported file sizes are un-trusted.
5. **Customers (`max_customers`):** Count of active customers in `customers`. Soft-deleted/archived customers do not count.
6. **Products (`max_products`):** Sum of active products in `products` + materials in `materials`.

---

### 5. PostgreSQL Atomic Concurrency & Advisory Locking

- `validate_tenant_limit_atomic`: Centralized atomic limit validation checking active subscription status, trial expiry, custom overrides with expiration, and hard quotas.
- `enforce_tenant_user_addition_atomic`: Locks on `hashtext('company_user_add_' || company_id)` to prevent race conditions during concurrent user invitations.
- `enforce_tenant_branch_addition_atomic`: Locks on `hashtext('company_branch_add_' || company_id)` to prevent concurrent branch creation bypass.
- `enforce_tenant_order_creation_atomic`: Locks on `hashtext('company_order_add_' || company_id)` to enforce monthly order limits while isolating practice mode.
- `enforce_tenant_storage_upload_atomic`: Locks on `hashtext('company_storage_add_' || company_id)` to meter real bytes stored.
- `transition_subscription_state_atomic`: State machine transition function logging immutable audit events into `subscription_events`.
- `generate_saas_subscription_invoice_atomic`: Generates sequential SaaS platform invoices (`SAAS-INV-YYYY-XXXXX`).
- `record_saas_payment_and_settle_atomic`: Idempotent payment verification and automatic subscription activation.

---

### 6. Verification Results

```text
Node Test Runner:
ℹ tests 974
ℹ suites 261
ℹ pass 974
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ duration_ms 42539.2134

TypeScript Compilation:
> tsc --noEmit
✓ Clean exit (0 errors)

ESLint:
> npx eslint --quiet
✓ Clean exit (0 errors)

Next.js Production Build:
✓ 106 routes compiled and optimized in production mode
```

---

### 7. Final Certification

**SUBSCRIPTION SYSTEM — PRODUCTION READY**
