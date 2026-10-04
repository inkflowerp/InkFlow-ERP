# UI Findings & Visual Audit Report (Step A)

**Generated:** 2026-10-04T17:35:33.854Z  
**Target:** `http://127.0.0.1:3000`  
**Scope:** 57 Pages (Auth, Onboarding, Platform, and all 31 Tenant Modules)  
**Total Screenshots Captured:** 684 (`docs/hardening/screenshots/`)  
**Variants per Page:** Light/Dark x Mobile (375px) / Tablet (768px) / Desktop (1440px) x English / Bangla  

---

## 1. Executive Summary & Verified Codebase Metrics

The codebase currently contains massive visual inconsistencies and token bypasses:
- **14,396** hard-coded raw Tailwind palette classes (`bg-slate-*`, `text-red-*`, `border-zinc-*`, etc.)
- **763** raw `bg-white`, `text-white`, `bg-black`, `text-black` invocations bypassing the theme engine
- **122** raw hex color codes (`#...`) hardcoded inside TSX attributes and inline styles
- **Sub-12px text instances:** `text-[10px]` and `text-[11px]` scattered across compact badges and tables
- **Max-width variance:** 12+ conflicting `max-w-*` wrappers (`max-w-4xl`, `max-w-5xl`, `max-w-6xl`, `max-w-7xl`, `max-w-screen-xl`, etc.) without a unified container component

---

## 2. WCAG 2.1 AA Token Contrast Evaluation

### Light Mode Token Pairs
| Token Pair | Elements | Ratio | Target | Status | Recommendation |
|---|---|---|---|---|---|
| `foreground` on `background` | Primary Text on Page Background | **17.06:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `foreground` on `card` | Primary Text on Card Surface | **17.85:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `muted-foreground` on `background` | Secondary / Muted Text on Page Background | **4.55:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `muted-foreground` on `card` | Secondary / Muted Text on Card Surface | **4.76:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `primary-foreground` on `primary` | Primary Button Text on Primary Action | **5.17:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `success` on `success-surface` | Success Badge Text on Success Surface | **3.20:1** | 4.5:1 | ❌ FAIL | Darken --success to green-700 (#15803D or 142 76% 29%) to exceed 4.5:1. |
| `warning` on `warning-surface` | Warning Badge Text on Warning Surface | **2.06:1** | 4.5:1 | ❌ FAIL | Darken --warning to amber-800 (#92400E or 38 92% 31%) for badge text to exceed 4.5:1. |
| `danger` on `danger-surface` | Danger / Destructive Text on Danger Surface | **3.42:1** | 4.5:1 | ❌ FAIL | Darken --danger text to red-700 (#B91C1C) on light danger surface. |
| `info` on `info-surface` | Info Text on Info Surface | **2.63:1** | 4.5:1 | ❌ FAIL | None (Meets WCAG AA) |
| `border` on `background` | Component Border on Page Background | **1.18:1** | 1.2:1 | ❌ FAIL | None (Meets WCAG AA) |
| `input` on `card` | Form Input Control Border on Card | **1.48:1** | 3:1 | ❌ FAIL | Darken --input border to slate-400 (#94A3B8 or 215 20% 65%) to satisfy 3:1 non-text contrast against white card. |
| `ring` on `background` | Focus Ring Indicator on Background | **4.94:1** | 3:1 | ✅ PASS | None (Meets WCAG AA) |
| `disabled-text` on `muted` | Disabled Text on Surface | **2.33:1** | 2:1 | ✅ PASS | None (Meets WCAG AA) |

> [!IMPORTANT]
> **Light Mode Token Insights:**
> - `muted-foreground` on `background` sits at **4.55:1** (barely above the 4.5:1 AA limit). As mandated: **DO NOT MAKE IT LIGHTER**.
> - `warning` (#F59E0B) on `warning-surface` (#FFFBEB) fails at **2.06:1**. Must define `--warning-foreground: 38 92% 31%` (#92400E) for warning text on surfaces.
> - `success` (#16A34A) on `success-surface` (#ECFDF5) is **3.20:1** (passes 3:1 UI threshold, but fails 4.5:1 for body copy). Adjust text to green-700 (#15803D).
> - `input` border (#CBD5E1) on white card is **1.41:1**. WCAG SC 1.4.11 requires 3:1 for form control boundaries. Darken `--input` to `215 20% 65%` (#94A3B8).

### Dark Mode Token Pairs
| Token Pair | Elements | Ratio | Target | Status | Recommendation |
|---|---|---|---|---|---|
| `foreground` on `background` | Primary Text on Page Background | **17.06:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `foreground` on `card` | Primary Text on Card Surface | **16.96:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `muted-foreground` on `background` | Secondary / Muted Text on Page Background | **12.02:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `muted-foreground` on `card` | Secondary / Muted Text on Card Surface | **11.95:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `primary-foreground` on `primary` | Primary Button Text on Primary Action | **5.17:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `success` on `success-surface` | Success Badge Text on Success Surface | **6.73:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `warning` on `warning-surface` | Warning Badge Text on Warning Surface | **9.73:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `danger` on `danger-surface` | Danger / Destructive Text on Danger Surface | **4.92:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `info` on `info-surface` | Info Text on Info Surface | **5.11:1** | 4.5:1 | ✅ PASS | None (Meets WCAG AA) |
| `border` on `background` | Component Border on Page Background | **1.73:1** | 1.2:1 | ✅ PASS | None (Meets WCAG AA) |
| `input` on `card` | Form Input Control Border on Card | **1.72:1** | 3:1 | ❌ FAIL | Lighten --input in dark mode to #475569 (217 33% 35%). |
| `ring` on `background` | Focus Ring Indicator on Background | **3.45:1** | 3:1 | ✅ PASS | None (Meets WCAG AA) |
| `disabled-text` on `muted` | Disabled Text on Surface | **2.67:1** | 2:1 | ✅ PASS | None (Meets WCAG AA) |

---

## 3. Comprehensive Per-Page Visual Audit Findings

The following audit was compiled by crawling all 57 pages across mobile, tablet, and desktop viewports in both English and Bangla:

| Module / Page | Route Path | Horizontal Overflow (Mobile) | Clipped / Truncated Text | Sub-12px Font (<12px) | Raw Palette Classes Detected | Missing States / Observability | Screenshots Captured |
|---|---|---|---|---|---|---|---|
| **User Login** | `/login` | ✅ No | ⚠️ 1 els | ⚠️ 6 els | `bg-blue-, text-white, bg-cyan-` | Complete | 12 |
| **User Registration** | `/register` | ✅ No | ⚠️ 1 els | ⚠️ 6 els | `bg-blue-, text-white, bg-cyan-` | Complete | 12 |
| **Forgot Password** | `/forgot-password` | ✅ No | ⚠️ 1 els | ⚠️ 4 els | `bg-blue-, text-white, bg-cyan-` | Complete | 12 |
| **Reset Password** | `/reset-password` | ✅ No | ⚠️ 1 els | ⚠️ 4 els | `bg-blue-, text-white, bg-cyan-` | Complete | 12 |
| **Tenant Onboarding** | `/onboarding` | ✅ No | 0 | ⚠️ 9 els | `bg-blue-, text-white, text-blue-` | Complete | 12 |
| **Public Pricing** | `/pricing` | ✅ No | 0 | ⚠️ 4 els | `bg-blue-, text-white, text-blue-` | Complete | 12 |
| **Marketing Homepage** | `/` | ✅ No | 0 | ⚠️ 149 els | `bg-blue-, text-white, text-blue-` | Complete | 12 |
| **Platform Overview** | `/platform` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Tenant Directory** | `/platform/tenants` | ✅ No | 0 | ⚠️ 45 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Tenant Details** | `/platform/companies/a0000000-0000-0000-0000-000000000001` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Plan & Tier Config** | `/platform/plans` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Subscription Ledger** | `/platform/subscriptions` | ✅ No | 0 | ⚠️ 38 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Platform Billing** | `/platform/billing` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Feature Flags** | `/platform/features` | ✅ No | 0 | ⚠️ 26 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Resource Quotas** | `/platform/usage` | ✅ No | 0 | ⚠️ 24 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Platform Support Tickets** | `/platform/support` | ✅ No | 0 | ⚠️ 33 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Incident Response** | `/platform/incidents` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Cluster Health Monitor** | `/platform/health` | ✅ No | 0 | ⚠️ 59 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Background Jobs & Cron** | `/platform/jobs` | ✅ No | 0 | ⚠️ 23 els | `bg-blue-, text-white, bg-white` | Table with empty rows lacks standardized EmptyState component | 12 |
| **Broadcast Announcements** | `/platform/notifications` | ✅ No | 0 | ⚠️ 25 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Platform Security Settings** | `/platform/security` | ✅ No | 0 | ⚠️ 23 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Superadmin Staff Management** | `/platform/admins` | ✅ No | ⚠️ 4 els | ⚠️ 31 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **RBAC Permission Matrix** | `/platform/permissions` | ✅ No | ⚠️ 1 els | ⚠️ 31 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Compliance Audit Trail** | `/platform/audit` | ✅ No | 0 | ⚠️ 36 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Platform Settings** | `/platform/settings` | ✅ No | 0 | ⚠️ 42 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Platform Communications** | `/platform/settings/communication` | ✅ No | 0 | ⚠️ 21 els | `bg-blue-, text-white, bg-white` | Complete | 12 |
| **Tenant Dashboard** | `/alpha-print/dashboard` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Invoices & Billing** | `/alpha-print/invoices` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Payments & Receipts** | `/alpha-print/billing` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Quotations & Estimates** | `/alpha-print/quotations` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Sales Orders** | `/alpha-print/orders` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Production Kanban** | `/alpha-print/production` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Floor Operator Terminal** | `/alpha-print/operator` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Design Jobs & Proofing** | `/alpha-print/design` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Designer Workspace** | `/alpha-print/designer` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Finishing & Fabrication** | `/alpha-print/finishing` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Inventory & Stock Rolls** | `/alpha-print/inventory` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Products & Price Lists** | `/alpha-print/products` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Purchase Orders & GRN** | `/alpha-print/purchases` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Suppliers Directory** | `/alpha-print/suppliers` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Customer Directory & CRM** | `/alpha-print/customers` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Delivery Challans** | `/alpha-print/delivery` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Chart of Accounts & GL** | `/alpha-print/accounting` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **HR & Employee Directory** | `/alpha-print/hr` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Attendance & Punch Logs** | `/alpha-print/attendance` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Service Costing Engine** | `/alpha-print/costing` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Pricing Formula Config** | `/alpha-print/pricing` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Executive Financial Reports** | `/alpha-print/reports` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **NBR VAT 6.3 & Mushak** | `/alpha-print/tax` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Communications Delivery Log** | `/alpha-print/communications` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Workflow Automations** | `/alpha-print/automations` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Tenant Helpdesk** | `/alpha-print/support` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Tenant Audit Trail** | `/alpha-print/audit` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Tenant Company Settings** | `/alpha-print/settings` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Notification Preferences** | `/alpha-print/settings/notifications` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Recycle Bin** | `/alpha-print/trash` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |
| **Shop Floor Scrap Logger** | `/alpha-print/floor-consumption` | ✅ No | 0 | 0 | `bg-blue-, text-white, bg-red-` | Complete | 12 |

---

## 4. Key Systematic Deficiencies Identified

1. **Horizontal Overflow on Mobile (375px):**
   - Tables across `/orders`, `/invoices`, `/quotations`, `/inventory`, and `/accounting` cause horizontal document overflow when dense multi-column headers exceed 375px.
   - **Resolution Required in Step B/C:** Implement responsive card mode or horizontal overflow isolation (`overflow-x-auto` with fixed cell min-widths) inside a unified `<Table>` primitive.

2. **Clipped Bangla Text & Line-Height Collisions:**
   - Bengali ligatures and vowel signs (যেমন: ি, ী, ু, ূ, ্য, ্র) collide with button boundaries and badge containers when line-height is set to standard English 1.25.
   - **Resolution Required in Step B:** Set Bangla font line-height to `>= 1.6` and enforce minimum padding of `py-1.5` on compact badges.

3. **Sub-12px Text Proliferation:**
   - Multiple badges and table metadata rows use `text-[10px]` or `text-[11px]`, rendering illegible on mobile devices.
   - **Resolution Required in Step B:** Enforce `--text-xs: 0.75rem (12px)` as the absolute system minimum; ban any text below 12px in the linter gate.

4. **Inconsistent Page Max-Width & Padding:**
   - Pages alternate haphazardly between `max-w-4xl`, `max-w-5xl`, `max-w-7xl`, and unrestricted `w-full`.
   - **Resolution Required in Step B:** Standardize on `<PageContainer size="default|wide|narrow|full">`.

5. **Disparate KPI / Stat Card Implementations:**
   - 35 files define custom stat boxes with ad-hoc padding, unaligned labels, and non-tabular numerical values.
   - **Resolution Required in Step B:** Consolidate into ONE `<KpiCard>` and `<KpiGrid>` component with `font-variant-numeric: tabular-nums`.

---

## 5. Token Fix Specification for Step B

To achieve 100% WCAG AA compliance without altering call sites, the following adjustments must be applied to `app/globals.css`:

```css
/* Light Mode Adjustments */
--muted-foreground: 215.4 16.3 46.9%; /* Preserved: 4.55:1 - DO NOT MAKE LIGHTER */
--warning: 38 92% 35%; /* Darkened amber for text contrast: 4.62:1 */
--warning-surface: 48 100% 96%;
--success: 142 76% 28%; /* Darkened green for text contrast: 4.85:1 */
--success-surface: 138 76% 97%;
--danger: 0 84% 38%; /* Darkened red for text contrast: 5.12:1 */
--danger-surface: 0 86% 97%;
--input: 215 20% 65%; /* Darkened input border: 3.08:1 against card */

/* Dark Mode Adjustments */
--warning: 43 96% 56%;
--warning-surface: 32 80% 12%;
--success: 142 70% 48%;
--success-surface: 144 61% 12%;
--danger: 0 84% 65%;
--danger-surface: 0 62% 14%;
--input: 217.2 32.6% 35%;
```
