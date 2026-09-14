# InkFlow V9 — Multi-Branch + Advanced Management Implementation Report

## Architecture & System Overview

InkFlow V9 extends the certified V1–V8 production SaaS platform into an enterprise-grade **Multi-Branch Operations & Advanced Management** system. It provides consolidated enterprise oversight while strictly preserving tenant isolation, atomic transaction ledgers (V3 stock ledger, V6 double-entry finance), and server-authoritative data scopes.

```
Tenant / Company (Tenant Isolation)
       │
       ├── Branches (Headquarters, Production Hubs, Retail Outlets, Regional Hubs)
       │      │
       │      ├── Departments (Sales, Design, Production, Store, Accounts, Delivery)
       │      │      │
       │      │      └── Users / Employees (Single Identity Master)
       │      │
       │      ├── Operations (Sales, Production Queues, Warehouses, Cash Books)
       │      │
       │      └── Offline Partitioning (printerp_offline_<tenant>_<branch>_<device>)
       │
       └── Consolidated Management (Cross-Branch Transfers, Comparison Matrix, Global Analytics)
```

---

## 1. Core Data-Scope Architecture

V9 expands data access boundaries to support full granular scope evaluation on the server:

| Scope | Definition | Access Enforcement |
| :--- | :--- | :--- |
| `own` | Own records | `record.created_by === userId \|\| record.user_id === userId` |
| `assigned` | Explicitly assigned tasks/records | `record.assigned_to === userId \|\| record.responsible_id === userId` |
| `department` | Departmental records | `record.department === userDepartment` within user's branch |
| `branch` | Single branch scope | `record.branch_id === userBranchId` |
| `selected_branches` | Explicit subset of authorized branches | `authorizedBranchIds.includes(record.branch_id)` |
| `all_branches` | All company branches | Scoped to entire tenant (`company_id === userCompanyId`) |
| `company` | Company-wide administrative scope | Full access across company tenant |

### Server-Authoritative Evaluation
Security is never delegated to UI filters. Every server action, API query, and database query resolves the user's verified session and applies authoritative RLS/repository scoping filters.

---

## 2. Database Migration 070

Migration `070_multi_branch_advanced_management.sql` was created and applied directly to Supabase (`npx supabase db push`):

1. **`branches`**: Extended with `legal_name`, `name_bn`, `division_id`, `district_id`, `upazila_id`, `area`, `full_address`, `full_address_bn`, `manager_id`, `manager_name`, `operating_hours`, `timezone`, `financial_settings`, `production_capabilities`.
2. **`branch_transfer_requests`**: 8-stage inventory transfer lifecycle with idempotency and atomic stock locks.
3. **`inter_branch_financial_transfers`**: Balanced dual-entry cash transfers with status lifecycle.
4. **`employee_branch_assignments`**: Temporary and secondary branch workforce deployments without duplicating employee masters.
5. **`workflow_configurations`**: Declarative routing and approval rules (strict no-`eval` security).
6. **`user_branch_access`**: Multi-branch authorization mapping table for `selected_branches` scope.

---

## 3. Cross-Branch Operations

### 3.1 Inventory Transfer Lifecycle
The transfer engine enforces an atomic 8-stage state machine:
`draft` → `requested` → `approved` → `dispatched` (`in_transit`) → `received` (or `rejected` / `cancelled`)
- **Dispatch**: Validates source stock and atomically deducts quantity, recording a `transfer_out` transaction in the V3 Stock Ledger.
- **Negative Stock Prevention**: Dispatches are rejected if available stock at source is below requested quantity.
- **Receive**: Atomically credits destination branch stock and records a `transfer_in` transaction in the V3 Stock Ledger.
- **Rollback on Cancellation**: If an in-transit transfer is cancelled, stock is reverted back to the source branch with an `adjustment` ledger entry.

### 3.2 Inter-Branch Financial Transfers
- Executes balanced double-entry postings: paired `cash_out` for the source branch and `cash_in` for the destination branch in the authoritative V6 cash book.

### 3.3 Production Routing & Workforce Deployment
- Reassigns production tasks across branches to balance machine utilization.
- Supports temporary employee assignments with date ranges while preserving single employee identity.

---

## 4. Analytics & Reporting Engine

The `BranchAnalyticsService` delivers three management levels:
1. **Branch KPIs**: Real-time sales, production queues, low-stock counts, cash balance, and attendance.
2. **Branch Comparison Matrix**: Comparative revenue, COGS, gross margin %, operating expenses, net profit, and rework rates.
3. **Consolidated Company Dashboard**: Aggregated multi-branch financial position, active jobs, inventory valuation, and bottleneck alerts.

---

## 5. Offline Security & Client Cache Partitioning

Client-side cache keys are partitioned by tenant, branch, and device:
```
printerp_offline_<tenantSlug>_<branchId>_<deviceId>
```
When a user switches branches, the client clears sensitive branch-scoped cache and revalidates permissions on reconnect.

---

## 6. Verification Summary

- **Tests Passed**: 915 / 915 tests across 240 test suites (100% pass rate).
- **TypeScript**: 0 errors (`tsc --noEmit`).
- **Production Build**: 106 static and dynamic routes compiled successfully in Next.js 16 (Turbopack).
