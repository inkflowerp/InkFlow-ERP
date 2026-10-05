# PrintFlow — Authoritative Permission Matrix

> **Document Status:** PROPOSAL AWAITING OWNER/MANAGER APPROVAL  
> **Phase:** Hardening Phase 4 — RBAC, Server-Side Enforcement & Isolation  
> **Audited Database Records:** 130 permissions currently stored in PostgreSQL `public.permissions`  
> **Company Roles:** 7 Canonical Primary Roles (`business_owner`, `branch_manager`, `sales_manager`, `designer`, `production_manager`, `operator`, `general_staff`)  

## 1. Executive Summary & Core Principles

In PrintFlow, all authorization is enforced on the server (**fail-closed**). Clients, form submissions, and direct API/RPC calls cannot bypass permission gates. The database table `public.role_permissions` has historically been empty, causing permission checks to fall back to hardcoded code heuristics. This matrix establishes the **single source of truth** for role capabilities across all tenant operations.

### The Four Access Primitives
Each cell in the matrix specifies the exact level of operational clearance granted to that role:

| Clearance Value | Meaning | Enforcement Mechanism |
| :---: | :--- | :--- |
| **`allow`** | **Full Company Scope:** User can perform this action across all branches, accounts, and records within the tenant organization. | Server action checks `withTenantAction({ permission })`; SQL queries return all company records. |
| **`branch`** | **Branch-Scoped:** User can perform this action strictly within their assigned physical branch(es). | Server action validates `tenant.branchId`; SQL query injects `branch_id = ANY(user_authorized_branches)` via PostgreSQL RLS helper. |
| **`own`** | **Creator / Assignee Scoped:** User can access or edit strictly records that are assigned to them or created by them. | SQL query enforces `(created_by = auth.uid() OR assigned_to = auth.uid() OR auth.uid() = ANY(assigned_workers))`. |
| **`deny`** | **Forbidden:** The role is strictly barred from this action. | Server action rejects immediately with `403 Forbidden`; page layout redirects to `/403` before data fetching. |

### The 7 Canonical Company Roles
1. **Business Owner (`business_owner`):** Complete organizational jurisdiction. P&L, bank balances, financial write-offs, destructive operations, system settings, subscription management, user invites and role assignments.
2. **Branch Manager (`branch_manager`):** Local physical branch supervisor. Can create orders, quotes, delivery challans, and collect counter payments strictly within their assigned branch. Cannot view global company finances, change company settings, or delete records.
3. **Sales Manager (`sales_manager`):** Commercial sales executive. Manages customer CRM, area/sft price estimations, quotations, order intake, and advance payment collections. Barred from floor machineries, salary sheets, company deletion, and administrative user controls.
4. **Graphic Designer (`designer`):** Prepress prep and design verification. Pre-press artwork queue, proof approvals, customer proof sharing, artwork file uploads and downloads. Read-only on work order specs.
5. **Production Manager (`production_manager`):** Factory floor director. Machine allocation, job queue scheduling, stage completion, material requisitions, physical stock adjustments, and factory equipment breakdown resolution.
6. **Print Operator (`operator`):** Machine technician. Sees assigned print/fabrication jobs, updates task execution statuses, logs material consumption, and reports equipment breakdowns.
7. **General Staff (`general_staff`):** Entry-level staff or delivery assistant. Restricted to personal attendance, self-service profile, assigned task checklists, and internal notifications.

*(Note: Specialized responsibility presets like `accountant` and `store_manager` inherit from these primary roles and add specific overrides detailed in Section 3).*

---

## 2. The 130 Database Permissions Matrix

The following table details every single permission currently defined in PostgreSQL `public.permissions` (grouped by module) mapped across the 7 company roles:

### Module: `analytics` (6 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `reports.approve` | Approve Reports & Analytics | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `reports.create` | Create Reports & Analytics | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `reports.delete` | Delete Reports & Analytics | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `reports.edit` | Edit Reports & Analytics | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `reports.full_control` | Full_control Reports & Analytics | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `reports.view` | View Reports & Analytics | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |

### Module: `billing` (12 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `invoice.approve` | Approve Invoice | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `invoice.create` | Create Invoice | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `invoice.delete` | Delete Invoice | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `invoice.edit` | Edit Invoice | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `invoice.full_control` | Full_control Invoice | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `invoice.view` | View Invoice | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `payment.approve` | Approve Payment | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `payment.create` | Create Payment | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `payment.delete` | Delete Payment | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payment.edit` | Edit Payment | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `payment.full_control` | Full_control Payment | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payment.view` | View Payment | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |

### Module: `branch_management` (9 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `branch.create` | Create Branches | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.delete` | Delete/Archive Branches | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.edit` | Edit Branches | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.manage` | Manage All Branches | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.transfer.approve` | Approve Branch Transfer | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.transfer.dispatch` | Dispatch Branch Transfer | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.transfer.receive` | Receive Branch Transfer | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.transfer.request` | Request Branch Transfer | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `branch.view` | View Branches | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |

### Module: `fulfillment` (6 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `delivery.approve` | Approve Delivery & Installation | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `delivery.create` | Create Delivery & Installation | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |
| `delivery.delete` | Delete Delivery & Installation | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `delivery.edit` | Edit Delivery & Installation | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |
| `delivery.full_control` | Full_control Delivery & Installation | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `delivery.view` | View Delivery & Installation | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |

### Module: `hr` (15 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `hr.approve` | Approve Human Resources | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `hr.create` | Create Human Resources | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `hr.delete` | Delete Human Resources | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `hr.edit` | Edit Human Resources | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `hr.full_control` | Full_control Human Resources | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `hr.view` | View Human Resources | **allow** | **branch** | **deny** | **own** | **branch** | **own** | **own** |
| `payroll.approve` | Approve Monthly Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.create` | Create Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.delete` | Delete Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.edit` | Edit Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.full_control` | Full_control Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.pay` | Disburse Salary Payments | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `payroll.view` | View Payroll | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `salary.approve` | Approve Salary Changes | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `salary.edit` | Edit Base Wage / Salary | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |

### Module: `inventory` (19 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `inventory.adjust` | Adjust Physical Stock | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `inventory.approve` | Approve Material Requisitions | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `inventory.create` | Create Material Inventory | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `inventory.delete` | Delete Material Inventory | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `inventory.edit` | Edit Material Inventory | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `inventory.full_control` | Full_control Material Inventory | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `inventory.view` | View Material Inventory | **allow** | **branch** | **allow** | **deny** | **allow** | **branch** | **deny** |
| `purchase.approve` | Approve Stock Purchase | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `purchase.create` | Create Stock Purchase | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `purchase.delete` | Delete Stock Purchase | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `purchase.edit` | Edit Stock Purchase | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `purchase.full_control` | Full_control Stock Purchase | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `purchase.view` | View Stock Purchase | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `supplier.approve` | Approve Supplier | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `supplier.create` | Create Supplier | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `supplier.delete` | Delete Supplier | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `supplier.edit` | Edit Supplier | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `supplier.full_control` | Full_control Supplier | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `supplier.view` | View Supplier | **allow** | **allow** | **deny** | **deny** | **allow** | **deny** | **deny** |

### Module: `invoices` (2 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `invoices.cancel` | Cancel/Void Invoices | **allow** | **branch** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `invoices.delete` | Delete Invoices | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |

### Module: `payments` (1 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `payments.delete` | Delete/Void Money Receipts | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |

### Module: `production` (17 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `machineries.assign` | Assign Machinery | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.breakdown` | Report Breakdown | **allow** | **branch** | **deny** | **deny** | **allow** | **branch** | **deny** |
| `machineries.cost_view` | View Machinery Costing | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.create` | Create Machinery | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.delete` | Archive / Delete Machinery | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `machineries.edit` | Edit Machinery | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.export` | Export Machinery Data | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.maintenance` | Manage Maintenance | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.resolve_breakdown` | Resolve Breakdown | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `machineries.status` | Change Machinery Status | **allow** | **branch** | **deny** | **deny** | **allow** | **branch** | **deny** |
| `machineries.view` | View Machineries | **allow** | **branch** | **allow** | **allow** | **allow** | **branch** | **deny** |
| `production.approve` | Approve Production Floor | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `production.create` | Create Production Floor | **allow** | **branch** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `production.delete` | Delete Production Floor | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `production.edit` | Edit Production Floor | **allow** | **branch** | **deny** | **deny** | **allow** | **own** | **deny** |
| `production.full_control` | Full_control Production Floor | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `production.view` | View Production Floor | **allow** | **branch** | **allow** | **allow** | **allow** | **branch** | **deny** |

### Module: `sales` (18 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `customer.approve` | Approve Customer | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `customer.create` | Create Customer | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `customer.delete` | Delete Customer | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `customer.edit` | Edit Customer | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `customer.full_control` | Full_control Customer | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `customer.view` | View Customer | **allow** | **branch** | **allow** | **allow** | **allow** | **deny** | **deny** |
| `order.approve` | Approve Job Order | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |
| `order.create` | Create Job Order | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `order.delete` | Delete Job Order | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `order.edit` | Edit Job Order | **allow** | **branch** | **allow** | **own** | **allow** | **deny** | **deny** |
| `order.full_control` | Full_control Job Order | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `order.view` | View Job Order | **allow** | **branch** | **allow** | **allow** | **allow** | **branch** | **own** |
| `quotation.approve` | Approve Quotation | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `quotation.create` | Create Quotation | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `quotation.delete` | Delete Quotation | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `quotation.edit` | Edit Quotation | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `quotation.full_control` | Full_control Quotation | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `quotation.view` | View Quotation | **allow** | **branch** | **allow** | **allow** | **allow** | **deny** | **deny** |

### Module: `settings` (6 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `settings.approve` | Approve Company Settings | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `settings.create` | Create Company Settings | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `settings.delete` | Delete Company Settings | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `settings.edit` | Edit Company Settings | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `settings.full_control` | Full_control Company Settings | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `settings.view` | View Company Settings | **allow** | **deny** | **allow** | **deny** | **deny** | **deny** | **deny** |

### Module: `users` (9 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `users.branch_assign` | Assign Branch Access | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.create` | Create Team Users | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.disable` | Disable/Activate Users | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.edit` | Edit Team Users | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.permission_manage` | Manage User Overrides | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.reset_password` | Reset User Password | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.role_change` | Change User Responsibilities | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.scope_manage` | Manage User Data Scope | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `users.view` | View Team Users | **allow** | **branch** | **allow** | **deny** | **allow** | **deny** | **deny** |

### Module: `whatsapp` (10 Permissions)

| Permission Code | Description / Name | Owner | Branch Mgr | Sales Mgr | Designer | Prod Mgr | Operator | Staff |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `whatsapp.conversations` | Manage Conversations | **allow** | **deny** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.logs` | View Communication Logs | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.manage_connection` | Manage WhatsApp Connection | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.manage_otp` | Manage OTP & Security Channels | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.manage_templates` | Manage WhatsApp Templates | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.send` | Send WhatsApp Messages | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.send_bulk` | Send Controlled Mass Messages | **allow** | **deny** | **deny** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.send_customer` | Send to Customers | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |
| `whatsapp.send_employee` | Send to Employees | **allow** | **deny** | **deny** | **deny** | **allow** | **deny** | **deny** |
| `whatsapp.view` | View WhatsApp Inbox & Chats | **allow** | **branch** | **allow** | **deny** | **deny** | **deny** | **deny** |

---

## 3. Discrepancy Analysis: Database vs. Active Application Code

A thorough static and runtime audit revealed significant discrepancies between the legacy PostgreSQL `permissions` table (seeded largely in Migration 007 loop) and the actual Next.js server actions, DAL, and UI pages.

### 3.1 Permissions in Database to be PRUNED (Unused or Conceptually Invalid)
The following permissions in the database have **zero usages in application code** or represent invalid actions for multi-tenant SaaS safety:

1. **`settings.delete` & `settings.approve` & `settings.full_control`:** Tenant company settings are updated, never deleted or approved through multi-stage workflow.
2. **`reports.delete` & `reports.create` & `reports.edit` & `reports.approve` & `reports.full_control`:** Reports in PrintFlow are pure dynamic read-only calculations (views and RPCs). Users only have `reports.view` and `reports.export`.
3. **`customer.approve` & `customer.full_control`:** Customers do not have an approval stage in CRM intake.
4. **`supplier.approve` & `supplier.full_control` & `supplier.delete`:** Suppliers are deactivated/archived, never dropped.
5. **`inventory.delete` & `inventory.full_control`:** Raw materials (flex, vinyl, ink) have stock ledger transactions; deleting inventory rows causes foreign key cascades. Physical inventory is adjusted via `inventory.adjust`.
6. **Duplicate codes between singular & plural:** 
   - `invoice.delete` (Migration 007) vs `invoices.delete` (Migration 092)
   - `payment.delete` (Migration 007) vs `payments.delete` (Migration 092)
   - Standardizing on plural `invoices.delete` and `payments.delete`.

### 3.2 Missing Permissions Required by Code (To Be Added to Database)
The following permissions are actively used in server actions, pages, and components, but **do not exist in the database table** `public.permissions`:

| Code to Add | Module | Used in Code / Rationale |
| :--- | :--- | :--- |
| `products.view` | `products` | Viewing item catalog, unit pricing, tariffs, and paper/flex specifications. |
| `products.create` | `products` | Adding new standard products, custom fabrication specs, and services. |
| `products.edit` | `products` | Modifying specifications, minimum margins, and dimension units. |
| `products.delete` | `products` | Archiving catalog products (destructive action). |
| `products.manage` | `products` | Full catalog management, category tree, and pricing links. |
| `products.export` | `products` | Exporting product tariffs and rate cards. |
| `pricing.view` | `pricing` | Viewing price lists, square foot formulas, and client tier discounts. |
| `pricing.create` | `pricing` | Adding customer rate contracts and tiered pricing cards. |
| `pricing.edit` | `pricing` | Updating base square-foot rates and fabrication allowances. |
| `pricing.delete` | `pricing` | Removing pricing rule cards. |
| `pricing.approve` | `pricing` | Authorizing special customer discount tariffs. |
| `pricing.manage` | `pricing` | Administrative pricing management. |
| `pricing.price_override` | `pricing` | Authorizing below-floor-margin manual price discounts on orders. |
| `design.view` | `design` | Accessing the Prepress & Graphic Designer portal queue. |
| `design.create` | `design` | Uploading new customer artwork files and design specifications. |
| `design.edit` | `design` | Updating design notes, proof versions, and file attachments. |
| `design.approve` | `design` | Approving prepress proofs for machine plate/print transmission. |
| `design.download` | `design` | Downloading high-resolution customer artwork (AI, PDF, TIFF). |
| `design.send` | `design` | Dispatching proof links via WhatsApp / SMS / Email to client. |
| `tasks.view` | `tasks` | Accessing employee daily task lists and floor assignments. |
| `tasks.complete` | `tasks` | Marking assigned tasks and checklist stages as completed. |
| `notifications.view` | `notifications` | Viewing in-app notifications and operational alerts. |
| `support.view` | `support` | Accessing live support chats and ticket history. |
| `support.create` | `support` | Opening support tickets with platform owner. |
| `support.edit` | `support` | Replying to tickets and updating attachments. |
| `support.manage` | `support` | Managing tenant support authorizations. |
| `audit.view` | `audit` | Viewing security and governance audit logs. |
| `branches.manage` | `branches` | Adding, archiving, and configuring physical company branches. |
| `settings.manage` | `settings` | Full organizational settings and tax/document numbering setup. |

### 3.3 Module Key Normalization Standard (Plural vs. Singular)
To eliminate the confusion between singular DB codes (`order.view`, `invoice.create`, `customer.edit`) and plural code references (`orders.view`, `invoices.create`, `customers.edit`):
1. **Canonical Schema:** All modules standardize on plural module names: `customers`, `quotations`, `orders`, `invoices`, `payments`, `branches`.
2. **Database Migration:** The migration will insert canonical plural codes, and retain backward-compatible synonyms or trigger view mapping so existing code runs without breakage.
3. **Server Action Wrapper:** `withTenantAction` normalizes `order.*` -> `orders.*` and `customer.*` -> `customers.*` transparently.

---

## 4. Proposed Migration Plan (Phase 4 Step 1b)

Upon approval of this matrix:
1. **Migration `113_seed_authoritative_rbac_matrix.sql`:**
   - Cleans up phantom/redundant permission records.
   - Inserts the missing 28 active permissions listed in Section 3.2.
   - Populates `public.role_permissions` for all system roles directly from this approved matrix.
   - Creates RLS helper function `public.auth_user_has_effective_permission(company_id, permission_code, branch_id)`.
2. **Validation:** Script runs automated verification asserting 0 empty roles, 100% matrix compliance, and zero broken server actions.

--- 
*Please review and confirm approval or request specific adjustments to proceed with the migration.*