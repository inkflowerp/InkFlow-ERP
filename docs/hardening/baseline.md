# Baseline Verification Report (Phase 0: Safety & Baseline)

**Branch:** `hardening/phase-0`  
**Base Commit / Branch:** `main`  
**Execution Date:** 2026-10-03  
**Node.js Version:** v22.14.0  
**Next.js Version:** 16.0.7 (React 19.2.0)  

---

## Executive Summary

All core quality gates (`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run copy-lint`, `npm run ui-audit`, `npm run build`) were executed on `hardening/phase-0` to establish the baseline health of PrintFlow before subsequent hardening phases.

| Command | Exit Code | Result | Details / Issues Cataloged |
| :--- | :---: | :---: | :--- |
| `npm ci` | `0` | **PASSED** | Clean dependency tree (up to date in 2s, 0 vulnerabilities). |
| `npm run typecheck` | `0` | **PASSED** | TypeScript strict verification succeeded with 0 errors. |
| `npm run lint` | `0` | **PASSED (with warnings)** | ESLint passed with 0 errors and 8,892 warnings (mostly `@typescript-eslint/no-explicit-any`, unescaped entities, and unused vars). |
| `npm test` | `0` | **PASSED** | 570 test suites, 2,188 tests passed, 0 failures (105.8s). |
| `npm run copy-lint` | `0` | **PASSED (with findings)** | 7 banned vocabulary occurrences detected in UI text across 5 files. |
| `npm run ui-audit` | `0` | **PASSED (with environment notice)** | 0 design system violations detected in markup; routes threw `ERR_CONNECTION_REFUSED` because local dev server was not active. |
| `npm run build` | `0` | **PASSED (with warnings)** | Production webpack build succeeded; 127 routes compiled/prerendered. Deprecation and CSS import order warnings logged. |

---

## Detailed Command Audit & Diagnostics

### 1. `npm ci`
- **Status:** PASSED
- **Exit Code:** `0`
- **Output:**
  ```text
  up to date in 2s
  152 packages are looking for funding
    run `npm fund` for details
  ```
- **Observations:** Clean lockfile synchronization; no dependency discrepancies.

---

### 2. `npm run typecheck` (`tsc --noEmit`)
- **Status:** PASSED
- **Exit Code:** `0`
- **Output:**
  ```text
  > printflow@0.1.0 typecheck
  > tsc --noEmit
  ```
- **Observations:** No TypeScript errors detected across the entire codebase.

---

### 3. `npm run lint` (`eslint .`)
- **Status:** PASSED (with warnings)
- **Exit Code:** `0`
- **Summary:**
  - Errors: `0`
  - Warnings: `8,892`
- **Common Warning Categories:**
  1. `@typescript-eslint/no-explicit-any`: Broad usage of `any` across legacy forms and platform components.
  2. `react/no-unescaped-entities`: Unescaped single quotes (`'`) and double quotes in JSX typography.
  3. `@typescript-eslint/no-unused-vars`: Unused destructured parameters in API routes and hooks.
  4. `react-hooks/exhaustive-deps`: Missing dependency array elements in complex dashboard widgets.
- **Action:** Per Phase 0 rules, no lint fixes applied; will be addressed in scheduled refactoring phases.

---

### 4. `npm test` (`node --test ...`)
- **Status:** PASSED
- **Exit Code:** `0`
- **Summary:**
  ```text
  ✔ Company isolation test for accounting reports (15.5451ms)
  ...
  ℹ tests 2188
  ℹ suites 570
  ℹ pass 2188
  ℹ fail 0
  ℹ cancelled 0
  ℹ skipped 0
  ℹ todo 0
  ℹ duration_ms 105808.232
  ```
- **Observations:** All 2,188 automated test cases passed without failure.

---

### 5. `npm run copy-lint` (`node scripts/copy-lint.mjs`)
- **Status:** PASSED (with findings)
- **Exit Code:** `0`
- **Identified Copy Violations (Banned Terms):**
  The copy-lint script enforces domain-specific terminology rules (e.g. banning "ledger" in favor of "transactions/statement", "disburse" in favor of "pay", and raw "tenant" in tenant-facing copy). The following 7 instances were detected:

  1. **`app/[tenantSlug]/hr/attendance/page.tsx:287`**
     - Term: `tenant`
     - Context: `...syncing tenant attendance logs...`
  2. **`app/[tenantSlug]/hr/payroll/page.tsx:312`**
     - Term: `disburse`
     - Context: `...disburse salary to employee accounts...`
  3. **`app/[tenantSlug]/settings/email/page.tsx:84`**
     - Term: `tenant`
     - Context: `...configure tenant SMTP relay settings...`
  4. **`components/workforce/advance-table.tsx:142`**
     - Term: `disbursement`
     - Context: `...advance disbursement record...`
  5. **`components/workforce/salary-payment-dialog.tsx:98`**
     - Term: `disburse`
     - Context: `...confirm and disburse payroll...`
  6. **`components/workforce/workforce-report.tsx:215`**
     - Term: `ledger`
     - Context: `...payroll ledger summary...`
  7. **`components/workforce/workforce-report.tsx:241`**
     - Term: `disbursement`
     - Context: `...monthly disbursement breakdown...`

- **Action:** Retained as baseline debt. Will be corrected in terminology alignment PRs.

---

### 6. `npm run ui-audit` (`node scripts/ui-audit/audit-runner.js`)
- **Status:** PASSED (with environment notice)
- **Exit Code:** `0`
- **Audit Findings:**
  - Token Invariants: `0` design system violations detected in static AST analysis.
  - Headless Browser Snapshotting:
    The audit runner attempted to capture live DOM screenshots across 38 platform routes and 3 benchmark routes at `http://127.0.0.1:3000`. Because no local dev server was running in the background during this CI step, the headless browser logged:
    ```text
    net::ERR_CONNECTION_REFUSED at http://127.0.0.1:3000/platform/dashboard
    ...
    [Audit Runner] 0 violations recorded (Server offline; skipped live computed style evaluations).
    ```
- **Action:** In future visual UI audit runs, run `npm run dev` in a parallel background process or test against a pre-built static preview.

---

### 7. `npm run build` (`next build --webpack`)
- **Status:** PASSED (with build warnings)
- **Exit Code:** `0`
- **Build Output Summary:**
  - Total Routes Generated: 127 (Prerendered Static + Dynamic SSR)
  - TypeScript Compilation: 3.7 min (0 errors)
  - Static Page Generation: 17.2s
- **Logged Warnings:**
  1. **Next.js Middleware Deprecation:**
     ```text
     ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
       To migrate automatically, run:
       npx @next/codemod@canary middleware-to-proxy .
     ```
  2. **CSS Optimization Order Warning:**
     ```text
     Found 1 warning while optimizing generated CSS:
     @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
     ^-- @import rules must precede all rules aside from @charset and @layer statements
     ```
  3. **WASM Async/Await Warning (`@formepdf/core`):**
     ```text
     ./node_modules/@formepdf/core/pkg/forme_bg.wasm
     The generated code contains 'async/await' because this module is using "asyncWebAssembly".
     However, your target environment does not appear to support 'async/await'.
     Import trace:
       ./node_modules/@formepdf/core/pkg/forme_bg.wasm
       ./node_modules/@formepdf/core/pkg/forme.js
       ./node_modules/@formepdf/core/dist/browser.js
       ./lib/pdf/pdf-generator.ts
       ./components/pdf/pdf-action-buttons.tsx
       ./app/[tenantSlug]/billing/[id]/page.tsx
     ```

---

## Baseline Conclusion

The baseline for `hardening/phase-0` is confirmed stable:
- Zero blocking compiler, test, or build failures.
- Baseline warnings and non-blocking findings (copy-lint, CSS import order, Next.js middleware deprecation) are cataloged above and must not be masked or silently modified during safety and isolation hardening.
