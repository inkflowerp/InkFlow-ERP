# INKFLOW V10 — SUBSCRIPTION 360 CERTIFICATION REPORT

## Enterprise Multi-Tenant SaaS Subscription & Billing Platform

---

### Executive Summary

InkFlow ERP V10 achieves **Subscription 360** production certification: an authoritative, multi-tenant safe, financially correct, concurrency-safe, provider-independent, and Bangladesh-ready SaaS subscription and billing engine.

---

### 1. Domain Architecture

```text
Platform Administration
       ↓
Plan Catalog & Versioning (`subscription_plans`, `plan_versions`, `features_catalog`)
       ↓
Authoritative Entitlement Engine & Server Guards (`EntitlementService`, `SubscriptionGuard`)
       ↓
Company Subscription & State Machine (`company_subscriptions`, `subscription_events`)
       ↓
SaaS Subscription Billing & Invoices (`saas_subscription_invoices`, `saas_subscription_invoice_items`)
       ↓
Provider-Independent Payments & Webhooks (`lib/payments/`, `app/api/webhooks/[provider]`)
       ↓
PostgreSQL Concurrency Locking & Atomic Enforcement RPCs
       ↓
Tenant ERP Operations (Users, Branches, Orders, Storage, Features)
```

---

### 2. Subscription State Machine

```text
               ┌──────────────┐
               │   trialing   │
               └──────┬───────┘
                      │ (Plan Purchase)
                      ▼
               ┌──────────────┐
  ┌───────────►│    active    │◄──────────┐
  │            └──────┬───────┘           │
  │ (Payment)         │ (Payment Failure) │ (Reactivate)
  │                   ▼                   │
  │            ┌──────────────┐           │
  │            │   past_due   │           │
  │            └──────┬───────┘           │
  │                   │ (After 3 days)    │
  │                   ▼                   │
  │            ┌──────────────┐           │
  │            │ grace_period │           │
  │            └──────┬───────┘           │
  │                   │ (After 7 days)    │
  │                   ▼                   │
  │            ┌──────────────┐           │
  │            │  suspended   │───────────┘
  │            └──────────────┘
  │ (Reactivate)
  │
┌─┴────────────┐
│  cancelled   │
└──────────────┘
```

---

### 3. Canonical Features Catalog

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

### 4. Database Schema Upgrades (Migration `073`)

- `features_catalog`: Canonical feature registry with metadata.
- `subscription_plans`: Upgraded with `version`, `soft_limits`, `hard_limits`, `overage_policy`, `setup_fee`, `currency`.
- `plan_versions`: Immutable history of plan pricing and terms.
- `saas_subscription_invoices`: Dedicated SaaS platform billing invoices with sequential numbering (`SAAS-INV-YYYY-XXXXX`).
- `saas_subscription_invoice_items`: Granular invoice line items.
- `saas_tenant_storage_usage`: Byte-level storage tracking.
- PostgreSQL Atomic RPCs (`SECURITY DEFINER`, `search_path = public, pg_temp`):
  - `validate_tenant_limit_atomic`
  - `enforce_tenant_user_addition_atomic`
  - `enforce_tenant_branch_addition_atomic`
  - `enforce_tenant_order_creation_atomic`
  - `enforce_tenant_storage_upload_atomic`
  - `transition_subscription_state_atomic`
  - `generate_saas_subscription_invoice_atomic`
  - `record_saas_payment_and_settle_atomic`

---

### 5. Financial Revenue Metrics Formulas

- **MRR (Monthly Recurring Revenue)**: Sum of monthly plan fees + (yearly plan fees / 12) for all active subscriptions.
- **ARR (Annual Recurring Revenue)**: $\text{MRR} \times 12$.
- **ARPU (Average Revenue Per User)**: $\frac{\text{MRR}}{\text{Active Tenants Count}}$.
- **Churn Rate**: $\frac{\text{Cancelled Subscriptions}}{\text{Total Lifetime Subscriptions}} \times 100\%$.
- **Trial Conversion Rate**: $\frac{\text{Converted Paid Subscriptions}}{\text{Total Completed Trials}} \times 100\%$.
- **Collection Rate**: $\frac{\text{Total Paid SaaS Invoices Amount}}{\text{Total Invoiced Amount}} \times 100\%$.

---

### 6. Certification Status

**SUBSCRIPTION 360 — PRODUCTION READY**
