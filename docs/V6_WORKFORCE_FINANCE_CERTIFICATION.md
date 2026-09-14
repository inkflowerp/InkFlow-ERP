# InkFlow V6 — Workforce + Geo Attendance + Finance Certification Report

> **Verdict:** CERTIFIED — PRODUCTION READY  
> **Date:** September 14, 2026  
> **Target Release:** InkFlow V6 Release Candidate  
> **Platform Baseline:** V1 (Commercial) + V2 (Production) + V3 (Inventory) + V4 (Economics/Costing) + V5 (Procurement) + V6 (Workforce & Finance)  
> **Database Baseline:** Migrations `001` through `067` (Live Remote Database Synchronized)  
> **Test Suite:** 871 passed / 0 failed / 226 suites  
> **Type Safety:** 0 TypeScript compilation errors (`tsc --noEmit`)  
> **Production Build:** Next.js 16.3.4 App Router (`next build`) compiled 106/106 routes cleanly  

---

## 1. Executive Summary

InkFlow V6 successfully introduces a hardened, multi-tenant, enterprise-grade **Workforce Management, Geofenced & QR Attendance, and Double-Entry Financial Accounting System** built directly on top of the frozen, production-certified V1–V5 baseline without modifying or regressing any historical architecture.

V6 connects day-to-day workshop activity (shifts, clock-ins, daily worker job logs, material consumption, and supplier procurement) into an authoritative financial reality:
- **Workforce Engine:** Multi-responsibility employee master, configurable shifts with overnight wrap-around (e.g. 22:00 $\rightarrow$ 06:00), overtime multiplier engines, daily worker attribution, and non-destructive V4 `job_costings.actual_labor_cost` reconciliation.
- **Privacy-Preserving Attendance:** Geofenced check-in/out with server-side Haversine distance validation against approved facility radii, time-limited single-use QR tokens, and strictly **zero continuous GPS tracking**.
- **Double-Entry General Ledger:** Universal Chart of Accounts (5 standard account classes), atomic journal entry posting with $\sum \text{Debit} \equiv \sum \text{Credit}$ enforcement, Cash in Hand, Multi-Bank (masked credentials), and Bangladesh MFS (bKash, Nagad, Rocket) accounts.
- **Operational Reconciliation:** Real-time synchronization between General Ledger (1040 AR / 2010 AP) and V1 Billing invoices and V5 Supplier subledgers with strict anti-overpayment validation.
- **Reporting & Cash Control:** Daily cash drawer closing with variance tracking, receivables/payables aging buckets (0–30, 31–60, 61–90, 90+ days), and multi-tier Profit & Loss statements distinguishing Gross Profit, Operating Profit, and Net Profit.

---

## 2. Pre-Implementation Audit

Prior to creating any database structures or service handlers, a full architectural audit was conducted across the codebase:
1. **Migrations 001–066:** Verified as frozen and untouched.
2. **Authoritative Boundaries:**
   - V1 remains authoritative for Commercial invoices and quotations.
   - V2 remains authoritative for Machineries and job production.
   - V3 remains authoritative for Physical Inventory stock ledger.
   - V4 remains authoritative for Product formulas and job costing snapshots.
   - V5 remains authoritative for Supplier purchase orders and procurement subledgers.
   - V6 becomes authoritative for Workforce records and General Ledger financial transactions.
3. **Data Isolation & Concurrency:** Verified that all V6 tables implement Row Level Security (`RLS`) referencing `companies.id` with strict server-side tenant resolution.

---

## 3. Migration 067 Summary (`067_workforce_finance.sql`)

Migration `067_workforce_finance.sql` was authored, deployed, and live-pushed via `npx supabase db push` to the remote Supabase database:
- **Tables Provisioned / Extended:**
  - `shifts`: Configurable shift schedules, overnight flags, grace periods, break times, and overtime rule definitions.
  - `employees`: Extended with Bangla Unicode names (`name_bn`), multiple responsibilities array, emergency contact details, daily worker flags, wage rates, and masked bank/MFS references.
  - `attendance_records`: Clock-in/out timestamps, shift links, server-verified GPS coordinates, accuracy, geofence validation results, and labor costing.
  - `attendance_locations`: Approved company and branch geofences with latitude, longitude, radius (meters), and location types (`HEADQUARTERS`, `BRANCH_FACTORY`, `CLIENT_JOBSITE`, `FIELD_INSTALLATION`).
  - `daily_labor_logs`: Daily labor tracking with assigned job numbers, overtime hours, and payment statuses.
  - `accounts`: Multi-tenant Chart of Accounts with account types (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`), subtype classification, and current balances.
  - `financial_transactions`: Authoritative header for double-entry transactions (`PAYMENT`, `RECEIPT`, `EXPENSE`, `TRANSFER`, `ADJUSTMENT`, `JOURNAL`).
  - `journal_entry_lines`: Immutable debit and credit lines linked to financial transactions.
  - `daily_cash_closings`: Shift cash drawer reconciliation recording opening balance, receipts, payments, expected closing, counted cash, and variance.
  - `financial_periods`: Accounting period locks preventing unauthorized postings to closed fiscal periods.
- **Constraints & Indexes:**
  - Foreign key constraints with `ON DELETE RESTRICT` for posted financial transactions.
  - Tenant and branch compound indexes on all transactional and lookup tables.
  - Check constraints ensuring non-negative amounts on debit/credit lines.

---

## 4. Employee Master

The Employee Master supports comprehensive workforce management tailored to Bangladesh printing and signage enterprises:
- Unique sequential identifiers: `EMP-YYYY-XXXXXX`.
- Full name in English and Bangla Unicode (`name_bn`).
- Emergency contact name, phone, and relationship.
- Department, branch assignment, and joining date.
- Employment classifications: `permanent`, `contract`, `temporary`, `daily_labor`, `part_time`, `field_worker`.
- Compensation parameters: Monthly base salary, daily rate, standard hourly rate, and overtime multiplier.
- Secure payment references: Bank account holder details and MFS provider references.
- Decoupled from auth users: Employees may exist without user logins, or link to `auth.users` via `user_id`.

---

## 5. Responsibilities Architecture

Employees can hold multiple operational responsibilities without introducing duplicate role tables:
- Supported responsibilities: `Designer`, `Salesperson`, `Production Coordinator`, `Machine Operator`, `Finishing Operator`, `Fabricator`, `Store Manager`, `Accounts`, `Delivery Coordinator`, `Manager`.
- Stored as a PostgreSQL `text[]` array and validated against tenant permissions.

---

## 6. Workforce Data Security & Privacy

Workforce and compensation data is protected through multi-layered server-side enforcement:
- Salary, wage rates, emergency contacts, and banking information are strictly guarded by `requireTenantPermission(companyId, 'hr.manage_salary')`.
- Non-administrative employees can only view their own shifts and attendance logs.
- Sensitive financial credentials are sanitized before leaving server boundaries.

---

## 7. Shift Management & Overnight Calculation Engine

Configurable shift definitions support standard and 24/7 rotating print shop operations:
- Shift fields: Start time, end time, grace period (minutes), break duration (minutes), and working days.
- **Overnight Shift Engine:** Accurately calculates planned work durations wrapping across midnight (e.g. `22:00` to `06:00` = 8 hours gross, minus 60 mins break = 7 hours net).
- Overnight attendance is classified within the originating operational shift without invalid date splitting.

---

## 8. Attendance State Machine & Anti-Tamper Protection

The attendance state machine governs workforce clocking:
- States: `NOT_CHECKED_IN` $\rightarrow$ `CHECKED_IN` $\rightarrow$ `CHECKED_OUT`.
- Prevents:
  - Duplicate check-ins for active sessions.
  - Check-out without prior check-in.
  - Overlapping attendance sessions on identical calendar dates.
- Attendance corrections follow an auditable request/approval workflow with `original_data`, `corrected_data`, `reason`, `requested_by`, and `approved_by`.

---

## 9. Geofenced Attendance & Haversine Distance Validation

Location verification is performed strictly server-side:
- Computes spherical distance between browser GPS coordinates and approved location center using the Haversine formula:
  $$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
- Rejects client-supplied `inside_radius` claims.
- Validates location accuracy against location radius thresholds.
- Records actual coordinates, location ID, and `is_within_geofence` verification boolean.

---

## 10. GPS Privacy Guarantee

- **Zero Continuous Tracking:** Location coordinates are requested and captured strictly during the explicit check-in and check-out button clicks.
- Background location tracking is entirely absent from the codebase by architectural design.

---

## 11. Single-Use QR Attendance Verification

QR code clock-in utilizes time-limited, cryptographic tokens:
- Dynamic tokens expire within 60 seconds of display.
- Enforces single-use verification to prevent replay attacks and photo sharing.
- QR verification operates in conjunction with GPS validation where geofencing is mandated.

---

## 12. Overtime Engine

Overtime calculation is rules-driven:
- Threshold check: Automatically ignores incidental work under configured minimum minutes (e.g., $< 30$ minutes).
- Overtime hours are calculated against net shift duration:
  $$\text{Overtime Amount} = \text{Overtime Hours} \times \text{Hourly Rate} \times \text{Multiplier (e.g. 1.5)}$$
- Requires supervisor authorization for payroll inclusion.

---

## 13. Daily Labor Logs & V4 Costing Reconciliation

Daily workers and job-assigned labor are tracked and integrated non-destructively into V4 Job Costing:
- Logs worker ID, work date, assigned job order number, daily rate, overtime hours, and total payout.
- `WorkforceService.reconcileJobLaborCost()` aggregates daily labor logs for a job order and updates `job_costings.act.labor_cost` and `total_cost` in V4 without mutating historical estimation snapshots.

---

## 14. Chart of Accounts Architecture

Pre-seeds standard accounts across 5 core account classes:
- **Assets (1000s):** `1010` Cash in Hand, `1020` Bank Accounts, `1030` MFS Accounts, `1040` Accounts Receivable, `1050` Physical Inventory.
- **Liabilities (2000s):** `2010` Accounts Payable, `2020` Accrued Expenses, `2030` Customer Advances.
- **Equity (3000s):** `3010` Owner Capital, `3020` Retained Earnings.
- **Revenue (4000s):** `4010` Commercial Print Sales, `4020` Signage & Fabrication Sales, `4030` Design & Installation Revenue.
- **Expenses (5000s):** `5010` Raw Material COGS, `5020` Direct Labor COGS, `5030` Machine Operating COGS, `5100` Factory Rent, `5110` Electricity & Utilities, `5120` Fuel & Transport, `5130` Office Supplies, `5140` Marketing, `5150` Cash Variance Adjustment.

---

## 15. Double-Entry General Ledger Integrity

- Strict validation: Financial transactions require $\sum \text{Debit} \equiv \sum \text{Credit}$ with tolerance $\le 0.001$.
- Atomic posting: Account balances update synchronously within the transaction posting lifecycle.
- Immutable posted entries: Posted transactions cannot be deleted or overwritten; corrections require auditable reversal transactions.

---

## 16. Cash, Bank, and MFS Accounts

Supports multi-channel liquidity accounts:
- **Cash Accounts:** Drawer and petty cash accounts with branch scoping.
- **Bank Accounts:** Account name, branch, currency (BDT), opening balance, and masked account numbers.
- **Mobile Financial Services (MFS):** Dedicated bKash, Nagad, and Rocket accounts with secure wallet number masking and transaction ID logging.

---

## 17. Account Transfers

- Generates balanced double-entry transactions (e.g., Credit Cash `1010`, Debit Bank `1020`).
- Supports optional transfer/processing fees (Debited to Bank Charges / Transfer Fee expense).
- Strict validation rejects self-transfers where source and destination accounts are identical.

---

## 18. Customer Receivables Reconciliation (V1 Integration)

- Customer payments credit Accounts Receivable (`1040`) and debit Cash/Bank/MFS.
- Synchronizes with V1 Invoices:
  - Updates `invoices.paid_amount`, `invoices.due_amount`, and `invoices.status` (`paid` or `partially_paid`).
  - **Anti-Overpayment Guard:** Strictly throws an error if payment exceeds invoice due amount.

---

## 19. Supplier Payables Reconciliation (V5 Integration)

- Supplier payments debit Accounts Payable (`2010`) and credit Cash/Bank/MFS.
- Synchronizes with V5 Supplier Subledger:
  - Records a debited payment ledger entry in `supplier_ledger_entries`.
  - Reconciles net outstanding liability across supplier accounts.

---

## 20. Operating Expense Management

- Supports structured expense logging: Category, payment account, amount, vendor, invoice reference, and notes.
- Creates balanced journal transactions: Debit Expense Account, Credit Payment Account.
- Standard categories: Rent, electricity, internet, fuel, transport, maintenance, marketing, and office expenses.

---

## 21. Daily Cash Closing & Variance Accounting

- Supports daily shift cash drawer closings:
  - Calculates expected cash: $\text{Opening Balance} + \text{Cash Receipts} - \text{Cash Payments} - \text{Transfers Out}$.
  - Records actual counted cash and computes variance ($\text{Counted} - \text{Expected}$).
  - Automatically posts variance adjustment journals to `5150 Cash Variance Adjustment` when approved.

---

## 22. Financial Periods & Fiscal Locks

- Supports `OPEN` and `CLOSED` financial periods.
- Rejects any transaction posting with dates falling into a closed fiscal period without authorized supervisory reopening.

---

## 23. Profit & Loss (P&L) Statement

Generates multi-tiered business profitability reports:
$$\text{Gross Profit} = \text{Revenue} - \text{Total COGS (Materials, Direct Labor, Machinery)}$$
$$\text{Operating Profit} = \text{Gross Profit} - \text{Total Operating Expenses (Rent, Utilities, Transport, etc.)}$$
$$\text{Net Profit} = \text{Operating Profit} - \text{Taxes \& Adjustments}$$

---

## 24. Receivables & Payables Aging Buckets

- Computes aging breakdown across standard intervals:
  - `0–30 Days` (Current)
  - `31–60 Days` (Overdue)
  - `61–90 Days` (Critical)
  - `90+ Days` (Delinquent)
- Provides party-level drilldown with invoice references, issue dates, due dates, and days overdue.

---

## 25. Cross-Domain Integration Verification

| Domain Boundary | Integration Mechanism | Status |
| :--- | :--- | :--- |
| **V1 Billing $\rightarrow$ V6 Finance** | Customer payment reconciles invoice due/paid amount and posts AR journal | **VERIFIED** |
| **V3 Inventory $\rightarrow$ V6 Finance** | Material receipt updates inventory asset account and supplier payable | **VERIFIED** |
| **V4 Costing $\rightarrow$ V6 Workforce** | Daily labor logs reconcile into `job_costings.act.labor_cost` non-destructively | **VERIFIED** |
| **V5 Purchasing $\rightarrow$ V6 Finance** | Supplier payments debit AP and post ledger entries in V5 procurement subledger | **VERIFIED** |

---

## 26. Security, RBAC & Tenant Isolation

- **Tenant Isolation:** Every V6 table implements strict RLS filtering `company_id = auth.company_id()`.
- **Cross-Tenant Attack Resistance:** Tests prove Company A cannot read or modify Company B's employees, shifts, accounts, or journal transactions.
- **Branch Scoping:** Financial accounts and transactions enforce branch boundaries while allowing authorized company-level consolidation.

---

## 27. Test Execution Results

```text
✔ Workforce Engine Unit Tests (V6) (4.02ms)
✔ Finance Double-Entry Engine Unit Tests (V6) (106.41ms)
✔ Workforce + Attendance + Costing Lifecycle Integration Test (V6) (126.99ms)
✔ Finance Transactions & Reconciliation Lifecycle Integration Test (V6) (311.12ms)
✔ Workforce & Finance Security, Isolation & Concurrency Tests (V6) (206.14ms)

ℹ total tests: 871
ℹ total suites: 226
ℹ pass: 871
ℹ fail: 0
ℹ cancelled: 0
ℹ skipped: 0
```

---

## 28. TypeScript & Production Build Verification

- **TypeScript Compilation:**
  ```text
  > tsc --noEmit
  Exit code: 0 (0 errors)
  ```
- **Next.js Production Build:**
  ```text
  > next build
  ▲ Next.js 16.3.4 (Turbopack)
  ✓ Compiled successfully in 2.4min
  ✓ Generating static pages (106/106)
  Exit code: 0 (0 errors)
  ```

---

## 29. Production Readiness Verdict

# CERTIFIED — PRODUCTION READY

InkFlow V6 has achieved full compliance across all security, financial integrity, privacy, concurrency, and cross-domain requirements. All test suites pass, TypeScript compiles with 0 errors, and Next.js production builds cleanly.
