# PrintERP Canonical Engineering Workflow Specification

## Overview & Mental Model

PrintERP is architected around the mental model of how commercial and industrial print shops operate in Bangladesh and South Asia. The print-shop owner and floor staff do not interact with fragmented ERP database tables; instead, they experience an interconnected, proactive workflow:

```
CUSTOMER
   ↓
SALES ORDER
   ↓
1..N JOB ORDERS (Independent Travelers)
   ↓
DESIGN (Received → In Progress → Customer Approval → Revision → Approved)
   ↓
APPROVAL GATE (Blocks Production until Client Signs Off)
   ↓
PRODUCTION TASK AUTOMATION (Idempotent Floor Task Generation)
   ↓
MATERIAL FLOW (Rolls / Substrates / Ink / Remnant & Wastage Tracking)
   ↓
FINISHING / FABRICATION (Cutting, Lamination, Eyelet, Acrylic, LED Assembly)
   ↓
INSTALLATION (Optional Site Deployment Crew)
   ↓
READY FOR DELIVERY (All required upstream tasks 100% complete)
   ↓
DELIVERY (Partial / Full Challan with Physical Receipt Proof)
   ↓
PAYMENT / DUE (Independent Financial Settlement)
```

---

## 1. Domain Objects & Relationships

### Core Hierarchy
- **Customer**: Counter walk-in, retail, reseller, or corporate commercial entity.
- **Sales Order (`sales_orders`)**: Commercial agreement container. Contains customer details, contract final price, advance, balance due, delivery target date, and 1..N order line items.
- **Job Order (`job_orders`)**: The operational traveler unit. One sales order can contain multiple child job orders (e.g. Order #1024 contains Job #2045 Banner, Job #2046 ACP Sign, Job #2047 Business Card). Each job order tracks its own independent size, media, department, operator, and workflow lifecycle.
- **Design Job (`design_jobs`)**: Graphic artwork briefs linked to job orders. Preserves immutable version history (`V1`, `V2`, `V3`). Artwork is never overwritten.
- **Production Task (`production_tasks`)**: Discrete floor task scheduled on machine bays (e.g. RIP Pre-press, Large Format Print, Laser Cut).
- **Finishing / Fabrication Task**: Post-press floor operations (e.g. thermal lamination, grommet eyelets, CNC channel welding, acrylic bonding).
- **Installation Task (`installations`)**: On-site field crew deployment for signage, billboards, or retail booth mounting.
- **Inventory Substrate / Roll (`inventory_rolls`)**: Physical rolls identified by tag (e.g., `#PVC-00501`) tracking original length, width, linear feed consumed, and remnant offcuts.
- **Delivery Challan (`delivery_challans`)**: Physical goods transport document listing delivered items, customer recipient name, driver/vehicle, phone, and signature proof.
- **Invoice & Payments (`invoices`, `payments`)**: Authoritative commercial financial documents. Decoupled from physical delivery state.

---

## 2. Canonical Workflow Stages & Statuses

### Dynamic Stage Pipeline
The system only displays stages relevant to each job's specifications:

| Product Type | Active Canonical Stages |
| :--- | :--- |
| **Retail / Ready Product** | Order → Ready → Delivery → Settlement |
| **Standard Banner (PVC/Vinyl)** | Order → Design → Approval → Production → Delivery |
| **Laminated Banner / Poster** | Order → Design → Approval → Production → Finishing → Delivery |
| **3D ACP / LED Acrylic Sign** | Order → Design → Approval → Production → Fabrication → Installation → Delivery |

### Step Indicators
- `✓` **Completed**: Upstream task finished and verified.
- `●` **Current**: Active phase awaiting action or in progress.
- `○` **Pending**: Downstream work queued, awaiting prerequisites.
- `—` **Not Required**: Phase bypassed based on product routing rules.

---

## 3. Human Stages vs. Next Actions

PrintERP never shows raw technical status codes without clear next actions.

| Current Stage (`humanStage`) | Next Action (`nextActionEn`) | Direct Destination |
| :--- | :--- | :--- |
| **Waiting for Design** | Assign Designer | `/design` |
| **Waiting for Approval** | Approve Design Proof | `/design?filter=approval` |
| **Ready for Production** | Dispatch to Machine Queue | `/production` |
| **Printing** | Complete Printing | `/operator` |
| **Finishing** | Complete Lamination / Eyelet | `/finishing` |
| **Fabrication** | Complete Channel / LED Assembly | `/finishing` |
| **Installation** | Assign Site Crew | `/delivery` |
| **Ready for Delivery** | Generate Delivery Challan | `/delivery` |
| **Partially Delivered** | Dispatch Remaining Jobs | `/delivery` |
| **Delivered** | Collect Outstanding Due | `/billing` |

---

## 4. Gating & Blockers

### A. Design Approval Gate
If customer approval is required (`customer_approval_required = true` or `workflow_routing = 'design_required'`), machine operators cannot start production tasks until artwork is approved (`is_approved = true`).
- **UI Indicator**: `PRODUCTION BLOCKED: Design approval is pending.` with button `[Open Approval]`.
- **Server Enforcement**: `ProductionPlanningService.startTask` strictly rejects task start with a 400 error if design approval is pending.

### B. Material Availability Gate
If substrate roll or sheet balance is insufficient for job square footage:
- **UI Indicator**: `BLOCKED: PVC 5ft insufficient. Required: 100 sqft, Available: 60 sqft.` with button `[View Materials]`.
- Direct link navigates directly to material allocation or purchase requisition.

### C. Commercial / Invoice Gate
Floor execution is held until an official commercial invoice is provisioned or approved by sales/accounts.

---

## 5. Multi-Job Orders & Derived Status

One Sales Order summarizes all of its child jobs:
```
Sales Order #1024
├── Job #1 (PVC Banner): Delivered
├── Job #2 (ACP Sign): Finishing
└── Job #3 (Business Card): Printing
Overall Derived Order Status = "In Progress"
```
An order is **NEVER** marked `Delivered` until all required deliverable jobs are 100% delivered. If only a subset of jobs are delivered, the order transitions to `Partially Delivered`.

---

## 6. Machine Scheduling & Conflict Prevention

Machines in PrintERP are **RESOURCES**, not workflow stages.
- Server validates that no machine is assigned overlapping runtimes.
- In `ProductionPlanningService.startTask`, if machine `DX5-01` is already `in_progress` running another job, starting a second job throws an immediate machine conflict error:
  `Machine conflict: Machine DX5-01 is currently running Task #TSK-2045. Parallel execution is not permitted on this machine.`

---

## 7. Data Authority & Offline Architecture

1. **Supabase / PostgreSQL**: Authoritative business ground truth for multi-tenant state.
2. **Local Cache (`inMemoryStore` + Tenant-Partitioned LocalStorage)**: Fast-path 0ms reads and offline fallback cache ONLY.
3. **No Whole-Storage Scans**: High-performance targeted queries eliminate `Object.keys(localStorage)` loops.
4. **No Heuristic Merging**: Financial totals and status transitions follow strict version precedence; `Math.max` heuristics are eliminated.
5. **Offline Outbox (`sync_outbox`)**: Queues pending mutations made while offline; conflicts are surfaced explicitly rather than silently overwriting server records.

---

## 8. Role-Based Experience

- **Owner**: Master workflow hub (`Orders & Jobs`), financial summaries, overdue/blocked work ribbons, real-time alerts.
- **Commercial / Sales**: Quotation, sales order intake, customer CRM, invoicing, payment recording.
- **Designer**: Assigned artwork briefs, version uploads (V1, V2, V3), proof approval links.
- **Floor Operator**: Compact, distraction-free Operator Terminal (`/operator`) with large ≥44px touch targets (`START`, `PAUSE`, `COMPLETE`, `REPORT PROBLEM`, `REQUEST MATERIAL`).
- **Store & Inventory**: Material requests, roll barcode/tag issue, floor consumption and remnant tracking.
- **Logistics**: Delivery hub, vehicle assignment, challan generation, delivery confirmation with signature and photo proof.
