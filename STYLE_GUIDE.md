# InkFlow ERP — Design System Style Guide

## Philosophy
Minimal, clean, professional, modern. Inspired by Linear, Vercel, and Stripe Dashboard.
True dark surfaces (not pure black), layered surfaces for depth.

---

## 1. Semantic Color Tokens

All colors must go through CSS variable tokens. **Never use raw hex, hardcoded Tailwind palette classes (`bg-slate-200`), or `bg-white`.**

### Surface Tokens
| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg-background` | `#F8FAFC` | `#0F172A` | Page background |
| `bg-card` | `#FFFFFF` | `#111827` | Cards, modals, dropdown menus |
| `bg-card-elevated` | `#FFFFFF` | `#1E293B` | Elevated cards, floating panels |
| `bg-muted` | `#F1F5F9` | `#1E293B` | Inset surfaces, table headers, secondary panels |
| `bg-popover` | `#FFFFFF` | `#111827` | Popover surfaces |
| `bg-surface-inset` | `#F1F5F9` | `#0B1120` | Deeply recessed surfaces (code blocks, diff backgrounds) |

### Text Tokens
| Token | Light | Dark | Usage |
|---|---|---|---|
| `text-foreground` | `#0F172A` | `#F8FAFC` | Primary text, headings, values |
| `text-card-foreground` | `#0F172A` | `#F8FAFC` | Text on cards |
| `text-muted-foreground` | `#64748B` | `#CBD5E1` | Secondary text, labels, timestamps, descriptions |

### Border Tokens
| Token | Light | Dark | Usage |
|---|---|---|---|
| `border-border` | `#E2E8F0` | `#334155` | Card borders, dividers, table rows |
| `border-input` | `#CBD5E1` | `#334155` | Form input borders |

### Interactive Tokens
| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg-primary` | `#2563EB` | `#60A5FA` | Primary buttons, active states |
| `text-primary-foreground` | `#FFFFFF` | `#0F172A` | Text on primary buttons |
| `bg-destructive` | `#EF4444` | `#EF4444` | Delete, error actions |
| `ring-ring` | `#2563EB` | `#60A5FA` | Focus ring |

### Feedback Tokens
| Token | Light | Dark | Usage |
|---|---|---|---|
| `bg-success-surface` | `#ECFDF5` | `hsl(144,61%,10%)` | Success badge backgrounds |
| `bg-warning-surface` | `#FFFBEB` | `hsl(32,80%,10%)` | Warning badge backgrounds |
| `bg-info-surface` | `#EFF6FF` | `hsl(217,33%,17.5%)` | Info badge backgrounds |
| `bg-danger-surface` | `#FEF2F2` | `hsl(0,62%,12%)` | Danger badge backgrounds |
| `text-success` | Green | Green | Success text |
| `text-warning` | Amber | Amber | Warning text |
| `text-destructive` | Red | Red | Error/danger text |

---

## 2. Typography

### Font Stack
```css
--font-sans: Inter, Hind Siliguri, system-ui, sans-serif;
```

### Scale (Strict)
| Token | Size | Usage |
|---|---|---|
| `text-3xs` / `text-2xs` | 11px | Tags, hashes, dense compact data |
| `text-xs` | 12px | Metadata, timestamps, badges, helper notes |
| `text-sm` | 14px | **Standard UI base**: inputs, buttons, table cells, nav |
| `text-base` | 16px | Body text, modal content, cards |
| `text-lg` | 18px | Section titles, card headers |
| `text-xl` | 20px | Modal titles, KPI values |
| `text-2xl` | 24px | Page headers, major stats |
| `text-3xl` | 30px | Dashboard headlines |

### Weight Convention
| Weight | Usage |
|---|---|
| `font-normal` (400) | Body text, descriptions |
| `font-medium` (500) | Labels, table headers, subtle emphasis |
| `font-semibold` (600) | Card titles, section headers, nav items |
| `font-bold` (700) | Page titles, primary CTAs, KPI values |

---

## 3. Component Patterns

### Card
```tsx
<Card className="...">  // Uses bg-card, border-border, shadow-xs, rounded-xl
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>
```
Never build your own card with raw Tailwind. Use `<Card>`.

### Button
```tsx
<Button>Primary</Button>                    // bg-primary
<Button variant="secondary">...</Button>    // bg-secondary
<Button variant="outline">...</Button>      // border-input
<Button variant="destructive">...</Button>  // bg-destructive
<Button variant="ghost">...</Button>        // transparent, hover:bg-muted
```

### Form Inputs
```tsx
<Input />   // border-input, bg-card, focus:ring-ring
<Select />  // Same token contract
```

### Tabs
```tsx
<Tabs value={tab} onValueChange={setTab}>
  <TabsList>                          // bg-muted, rounded-lg, p-1
    <TabsTrigger value="a">A</TabsTrigger>  // active: bg-card shadow-xs
    <TabsTrigger value="b">B</TabsTrigger>  // inactive: text-muted-foreground
  </TabsList>
  <TabsContent value="a">...</TabsContent>
</Tabs>
```

### Modal Dialog
```tsx
<ModalDialog open={open} onOpenChange={setOpen} title="..." size="lg">
  {/* Uses bg-card, border-border throughout */}
</ModalDialog>
```

### Badge / Status Badge
```tsx
<Badge variant="default">Active</Badge>
<StatusBadge status="paid" />  // Semantic colors per status
```

---

## 4. Spacing & Layout

| Property | Value | Usage |
|---|---|---|
| Border radius | `rounded-lg` (8px) controls, `rounded-xl` (12px) cards | Consistent roundness |
| Card padding | `p-3 sm:p-4` | Responsive comfortable spacing |
| Section gap | `space-y-4 sm:space-y-6` | Between page sections |
| Grid gap | `gap-3 sm:gap-4` | Between grid items |

---

## 5. Dark Mode Rules

1. **All surfaces use tokens** — `bg-card`, `bg-muted`, `bg-background` — which automatically switch in dark mode via CSS variables.
2. **Never use `dark:` prefix with token classes** — `bg-card` already resolves to the right color in both modes. `dark:bg-card` is redundant.
3. **Status/accent colors** (blue-50, emerald-50, etc.) are acceptable for intentional semantic coloring (badge backgrounds, status chips) but should use opacity modifiers for dark mode (`dark:bg-blue-950/50`).
4. **Shadows** lighten in dark mode automatically — no need for `dark:shadow-none`.
5. **Focus rings** always use `focus:ring-ring` or `focus-visible:ring-ring`.

---

## 6. Forbidden Patterns

```tsx
// NEVER
className="bg-white"                        // Use bg-card
className="bg-slate-50"                     // Use bg-muted
className="text-slate-500"                  // Use text-muted-foreground
className="text-slate-900"                  // Use text-foreground
className="border-slate-200"               // Use border-border
className="border-slate-300"               // Use border-input
className="bg-blue-600 text-white"         // Use bg-primary text-primary-foreground
className="focus:ring-blue-500"            // Use focus:ring-ring
className="#e2e8f0"                        // Use hsl(var(--border))

// CORRECT
className="bg-card"
className="bg-muted"
className="text-muted-foreground"
className="text-foreground"
className="border-border"
className="border-input"
className="bg-primary text-primary-foreground"
className="focus:ring-ring"
```

---

## 7. Print Styles

Print styles (`print:`) are the ONE exception — they may use `print:bg-white` and `print:text-black` because physical paper is always white.
