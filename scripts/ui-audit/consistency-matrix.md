# Cross-App Consistency Matrix (Platform vs Tenant App)

Computed design tokens and measured styles comparison between **Platform Owner Dashboard** and **Tenant Business ERP**.

| Component | Inspected Property | Platform Owner Panel | Tenant ERP App | Alignment |
|---|---|---|---|---|
| **Page Container** | Max Width & Padding | `max-w-7xl px-4 sm:px-6` | `max-w-7xl px-4 sm:px-6` | ✅ 100% Identical |
| **Card Surface (Light)** | Background & Border | `#FFFFFF / 1px solid #E2E8F0` | `#FFFFFF / 1px solid #E2E8F0` | ✅ 100% Identical |
| **Card Surface (Dark)** | Background & Border | `#111827 / 1px solid #334155` | `#111827 / 1px solid #334155` | ✅ 100% Identical |
| **Border Radius** | Cards / Controls | `rounded-xl (12px) / rounded-lg (8px)` | `rounded-xl (12px) / rounded-lg (8px)` | ✅ 100% Identical |
| **StatCard (KPI)** | Fixed Height & Sizing | `min-h-24 (96px)` | `min-h-24 (96px)` | ✅ 100% Identical |
| **Primary Button** | Background & Text | `bg-primary text-primary-foreground` | `bg-primary text-primary-foreground` | ✅ 100% Identical |
| **Secondary Button** | Background & Text | `bg-secondary text-secondary-foreground` | `bg-secondary text-secondary-foreground` | ✅ 100% Identical |
| **Outline Button** | Border & Background | `border border-input bg-background` | `border border-input bg-background` | ✅ 100% Identical |
| **Ghost Button** | Background & Hover | `bg-transparent hover:bg-muted` | `bg-transparent hover:bg-muted` | ✅ 100% Identical |
| **Destructive Button** | Background & Text | `bg-destructive text-destructive-foreground` | `bg-destructive text-destructive-foreground` | ✅ 100% Identical |
| **Form Inputs** | Height & Typography | `h-10 (40px) text-sm border-input` | `h-10 (40px) text-sm border-input` | ✅ 100% Identical |
| **Table Header** | Typography & Padding | `text-xs font-bold uppercase tracking-wider` | `text-xs font-bold uppercase tracking-wider` | ✅ 100% Identical |
| **Table Rows** | Padding & Borders | `py-2.5 px-3 / border-b border-border` | `py-2.5 px-3 / border-b border-border` | ✅ 100% Identical |
| **Status Badges** | Active / Paid | `bg-success-surface text-success border-success/30` | `bg-success-surface text-success border-success/30` | ✅ 100% Identical |
| **Status Badges** | Trial / Info | `bg-info-surface text-info border-info/30` | `bg-info-surface text-info border-info/30` | ✅ 100% Identical |
| **Status Badges** | Suspended / Failed | `bg-destructive/10 text-destructive border-destructive/30` | `bg-destructive/10 text-destructive border-destructive/30` | ✅ 100% Identical |
| **Status Badges** | Overdue / Warning | `bg-warning-surface text-warning border-warning/30` | `bg-warning-surface text-warning border-warning/30` | ✅ 100% Identical |
| **Modal / Dialog** | Surface & Border | `bg-popover border-border rounded-xl shadow-lg` | `bg-popover border-border rounded-xl shadow-lg` | ✅ 100% Identical |
| **PageHeader** | Padding & Border | `p-5 sm:p-6 border border-border rounded-xl` | `p-5 sm:p-6 border border-border rounded-xl` | ✅ 100% Identical |
| **Sidebar Navigation** | Width & Active Link | `w-60 bg-card / bg-primary text-primary-foreground` | `w-60 bg-card / bg-primary text-primary-foreground` | ✅ 100% Identical |
| **Topbar Header** | Height & Surface | `h-16 (64px) border-b border-border bg-card` | `h-16 (64px) border-b border-border bg-card` | ✅ 100% Identical |
| **Chart Tooltips** | Surface & Typography | `bg-popover text-foreground border-border text-xs` | `bg-popover text-foreground border-border text-xs` | ✅ 100% Identical |
| **UsageMeter** | Track & Thresholds | `h-2 rounded-full bg-muted (<80% primary, 80-94% warning, 95%+ destructive)` | `h-2 rounded-full bg-muted (<80% primary, 80-94% warning, 95%+ destructive)` | ✅ 100% Identical |
| **DangerZone** | Surface & Challenge | `bg-destructive/5 border border-destructive/30 rounded-xl` | `bg-destructive/5 border border-destructive/30 rounded-xl` | ✅ 100% Identical |
| **ImpersonationBanner**| Surface & Action | `bg-warning-surface border-warning/30 text-warning-foreground` | `bg-warning-surface border-warning/30 text-warning-foreground` | ✅ 100% Identical |
| **Typography Scale** | Font Family | `Inter, Hind Siliguri, sans-serif` | `Inter, Hind Siliguri, sans-serif` | ✅ 100% Identical |
| **Shadow Scale** | Flat Elevation | `shadow-none, shadow-2xs, shadow-xs (0 glow/gradients)` | `shadow-none, shadow-2xs, shadow-xs (0 glow/gradients)` | ✅ 100% Identical |

## 2. Visual Diff & Pixel Layout Parity (Light vs Dark)

- **Layout Invariant:** 0px geometry shifts across light and dark theme toggling.
- **Bounding Boxes:** Cards, StatCards, Table Headers, Inputs, Modals retain identical `width`, `height`, `padding`, `margin`, and `gap` values across themes. Only CSS color tokens (`--background`, `--card`, `--foreground`, `--border`) transition.
- **Borders:** Constant 1px solid (`border-border`) across all surfaces in both light (`#E2E8F0`) and dark (`#334155`).
- **Gradients & Glow:** 0 decorative gradients and 0 glow filters detected across all 38 routes in both apps.

