<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:design-system-rules -->

# Design System & UI Consistency Guardrails (Tenant & Platform)

All UI development across InkFlow ERP (both Tenant app `/[tenantSlug]/*` and Platform Owner app `/platform/*`) must adhere strictly to the shared design system in `design-spec.json` and `app/globals.css`.

### Invariants:
1. **Zero Raw Palette Colors:** NEVER use raw Tailwind palette classes (e.g. `bg-slate-*`, `text-indigo-*`, `border-zinc-*`, `bg-gray-*`) in application markup. Always use semantic design tokens:
   - Surfaces: `bg-background`, `bg-card`, `bg-card-elevated`, `bg-muted`, `bg-popover`.
   - Text: `text-foreground`, `text-muted-foreground`, `text-primary-foreground`.
   - Borders: `border-border`, `border-input`.
   - Feedback: `bg-success-surface` + `text-success`, `bg-warning-surface` + `text-warning`, `bg-destructive/10` + `text-destructive`.
2. **Zero Gradients & Glow:** No decorative gradients (`bg-gradient-*`, `from-*`, `to-*`, `via-*`), no colored glows, no mesh radial backgrounds, and no oversized shadows (`shadow-xl`, `shadow-2xl`). Standardize on flat solid surfaces, 1px `border-border`, and `shadow-xs`.
3. **No Hardcoded `text-white` or `bg-black`:** Never hardcode `text-white` or `bg-black` on surfaces that must switch between light and dark themes. Text must automatically adapt via `text-foreground` or button-specific foreground tokens (`text-primary-foreground`, `text-destructive-foreground`).
4. **Standard Spacing & Sizing Scale:** Do not use arbitrary sizing values (e.g. `min-h-[38px]`, `w-[120px]`). Use standard Tailwind spacing units (`min-h-9`, `min-h-10`, `w-28`, `w-36`, `w-44`).
5. **Shared Platform Components:** Reuse standardized components from `components/platform/`:
   - `StatCard`: 96px KPI metric tiles with uppercase tracking-wider labels and tabular values.
   - `PlanCard`: Pricing tier cards with limits grids, feature checklists, and action dropdowns.
   - `UsageMeter`: Resource quotas with automatic thresholds (<80% primary, 80-94% warning, 95%+ destructive).
   - `ImpersonationBanner`: Top-docked tenant session impersonation notice.
   - `DangerZone`: Destructive actions with confirmation challenge dialogs.
6. **Verification Gate:** After modifying UI code, always run the audit script (`node scratch/audit-platform.js` or `scripts/ui-audit/`) and `npm run typecheck` to verify 0 violations before declaring work complete.

<!-- END:design-system-rules -->
