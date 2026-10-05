# PrintFlow — UX Hardening Specification: Module 1 (Dashboard)

## 1. Overview & Core Mission
The Dashboard is the operational control center of PrintFlow. When an owner, branch manager, or team member opens PrintFlow, the first screen must immediately answer one primary question: **"What needs my attention now?"**

### Primary Jobs-To-Be-Done (JTBD):
1. **Immediate Situational Awareness ($\le 2$ seconds):** See today's cash collections, booked sales, shop floor production workload, and overdue risks at a glance.
2. **Prioritized Action Queue ($\le 1$ click):** Address high-risk items (urgent delivery deadlines, severe overdue receivables, stockouts) directly without navigating away.
3. **Primary Task Dispatch ($\le 3$ clicks):** Book a new order or create a quotation in $\le 3$ clicks from any device.

---

## 2. Information Architecture & Layout Structure

```
+-----------------------------------------------------------------------------------------+
| [Header] Greeting & Branch Selector | Live Asia/Dhaka Time | Quick Create [+ New Work] |
+-----------------------------------------------------------------------------------------+
| [KPI Row of 4]                                                                          |
| 1. Today's Collections   2. Today's Sales      3. Floor Active Jobs   4. Attention Items|
|    ৳ 48,500 (+12% vs yday)  ৳ 1,24,000 (8 orders)  14 Jobs (6 Urgent)    3 Blockers     |
+-----------------------------------------------------------------------------------------+
| [Prioritized Attention Feed]                                                            |
| - [Overdue Due]   Akram Advertising (৳ 12,500 due 14d)  -> [WhatsApp] [Record Payment] |
| - [Print Deadline] Job #084 Banner (Due in 45m)         -> [Start Job] [View Proof]     |
| - [Stock Out]     Star Flex 10ft roll below 50m         -> [Order Stock / Create PO]    |
+-----------------------------------------------------------------------------------------+
| [Workforce & Operational Feeds]                                                         |
| - Today's Orders Ledger (Tabular BDT, Status Badge, Mobile Card view < 768px)          |
| - 7-Day / 30-Day Collections vs Sales Area Chart (Semantic CSS tokens, no raw hex)      |
+-----------------------------------------------------------------------------------------+
```

### Elimination of Decorative & Redundant Widgets
- **Removed:** Duplicate nested KPI metrics, static greeting banners without metrics, arbitrary max-width wrappers.
- **Retained:** Exactly 4 standardized KPI metric cards using `<KpiCard>` and `<KpiGrid>` with tabular figures, delta indicators, and calculation tooltips.

---

## 3. Strict Typography, Money & Date Rules
1. **Bangladeshi Currency (BDT):**
   - Symbol: `৳`
   - Grouping: South Asian Lakh/Crore notation (`৳ 1,25,000` instead of `৳ 125,000`).
   - Alignment: Always right-aligned with `tabular-nums`.
2. **Timezone & Dates:**
   - Authoritative Timezone: `Asia/Dhaka` (UTC+6).
   - Display: Relative time (`45m ago`, `Due in 2h`) paired with full tooltip (`DD MMM YYYY, hh:mm A BST`).
   - Bengali script numerals supported seamlessly across English and Bangla locales.

---

## 4. Multi-Role Operational Dispatches
- **Business Owner:** Full executive control center: collections, margins, factory workload, overdue debtors.
- **Sales Rep:** Pipeline metrics, pending draft quotations, client balance lookups.
- **Designer:** Active jobs queued for preflight/proofing, client proof WhatsApp review links.
- **Machine Operator:** Large-touch shop floor terminal (Flora solvent, HP latex, Roland eco-sol), 1-tap Start/Complete.
- **Delivery Rider:** Scheduled challans, recipient phone quick-call, delivery location map link.
- **Store Keeper:** Minimum safety threshold alerts, physical stock audits.

---

## 5. Errors, Resilience & Edge Cases
1. **`app/global-error.tsx`:** Catches root application crashes; offers single-click system reload with diagnostic digest.
2. **`app/[tenantSlug]/dashboard/loading.tsx`:** Skeletons matching exact 4-KPI and prioritized work list geometry (zero layout shift).
3. **`app/[tenantSlug]/dashboard/error.tsx`:** Isolated route boundary with retry mechanism, error digest, and fallback to home.
4. **`app/[tenantSlug]/dashboard/not-found.tsx`:** Clear tenant slug recovery.
5. **Offline Banner:** Real-time network listener (`navigator.onLine`); displays persistent status notice when offline.

---

## 6. Responsive Breakpoints & Accessibility
- **Breakpoints:** `375px` (Mobile), `768px` (Tablet), `1024px` (Laptop), `1440px` (Desktop).
- **Mobile Experience:**
  - KPI cards stack into 2-column or 1-column responsive grid (`KpiGrid`).
  - Orders table automatically transforms into touch-friendly cards below `768px`.
  - Sticky bottom action bar for primary actions on small viewports.
  - Touch targets $\ge 44\text{px}$.
  - Zero horizontal scrollbar across all viewports.
- **Contrast:** Strict WCAG 2.1 AA ($\ge 4.5:1$ body text, $\ge 3:1$ borders and focus rings).

---

## 7. Verification & Acceptance Criteria
- [x] `npm run ui-audit` reports 0 violations.
- [x] Main daily workflow (Create New Work / Record Payment) accessible in $\le 3$ clicks from dashboard.
- [x] Playwright flow test validates full lifecycle in Light/Dark, Desktop/Mobile, English/Bangla.
- [x] Lighthouse Accessibility Score $\ge 95$.
