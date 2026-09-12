export type PrimaryRole =
  | 'platform_owner'
  | 'business_owner'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'general_staff'

export type ResponsibilitySlug =
  | 'business_owner'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'store_manager'
  | 'accountant'
  | 'delivery_coordinator'
  | 'general_staff'

export type PermissionAction =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'complete'
  | 'cancel'
  | 'print'
  | 'download'
  | 'send'
  | 'export'
  | 'manage'
  | 'full_control'

export type PermissionModule =
  | 'customers'
  | 'quotations'
  | 'orders'
  | 'design'
  | 'invoices'
  | 'payments'
  | 'production'
  | 'delivery'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'tasks'
  | 'notifications'
  | 'support'

export type DataScope = 'own' | 'assigned' | 'department' | 'company'

export interface ModuleActionSpec {
  module: PermissionModule
  label: string
  labelBn: string
  description: string
  actions: PermissionAction[]
  defaultScope: DataScope
}

export const MODULE_ACTION_SPECS: Record<PermissionModule, ModuleActionSpec> = {
  customers: {
    module: 'customers',
    label: 'Customers',
    labelBn: 'কাস্টমার তালিকা',
    description: 'Customer profiles, contact persons, credit limit & outstanding balance',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
    defaultScope: 'company',
  },
  quotations: {
    module: 'quotations',
    label: 'Quotations',
    labelBn: 'দরপ্রস্তাব / কোটেশন',
    description: 'Square-foot rate calculations, estimates, price approvals & client dispatch',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'send', 'print'],
    defaultScope: 'company',
  },
  orders: {
    module: 'orders',
    label: 'Work Orders / Job Orders',
    labelBn: 'জব অর্ডার / কাজের টিকিট',
    description: 'Job tickets, media specifications, delivery milestones, assignments & deposits',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'cancel', 'print'],
    defaultScope: 'assigned',
  },
  design: {
    module: 'design',
    label: 'Pre-Press & Design',
    labelBn: 'ডিজাইন ও প্রুফিং',
    description: 'Prepress proofs, customer design approvals, file downloads & revisions',
    actions: ['view', 'create', 'edit', 'send', 'download', 'approve'],
    defaultScope: 'assigned',
  },
  invoices: {
    module: 'invoices',
    label: 'Invoices & Billing',
    labelBn: 'ইনভয়েস ও বিলিং',
    description: 'Commercial bills, tax invoices, discounts, approvals, voids & prints',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'cancel', 'print', 'download', 'send'],
    defaultScope: 'company',
  },
  payments: {
    module: 'payments',
    label: 'Payments & Receipts',
    labelBn: 'পেমেন্ট ও মানি রসিদ',
    description: 'Cash, bKash/Nagad, bank transfer collections & money receipts (MR)',
    actions: ['view', 'create', 'edit', 'delete', 'print'],
    defaultScope: 'company',
  },
  production: {
    module: 'production',
    label: 'Production Floor',
    labelBn: 'প্রোডাকশন ফ্লোর',
    description: 'Machine queues, stage scheduling, fabrication, finishing & QC inspection',
    actions: ['view', 'create', 'edit', 'assign', 'complete', 'cancel'],
    defaultScope: 'assigned',
  },
  delivery: {
    module: 'delivery',
    label: 'Delivery & Challans',
    labelBn: 'ডেলিভারি ও চালান',
    description: 'Delivery challans, transport dispatch, site installations & signed handovers',
    actions: ['view', 'create', 'edit', 'assign', 'complete', 'cancel'],
    defaultScope: 'assigned',
  },
  inventory: {
    module: 'inventory',
    label: 'Inventory & Materials',
    labelBn: 'কাঁচামাল ও স্টক',
    description: 'Flex rolls, vinyl, inks, boards, stock adjustments & requisition approvals',
    actions: ['view', 'create', 'edit', 'approve'],
    defaultScope: 'company',
  },
  reports: {
    module: 'reports',
    label: 'Reports & Analytics',
    labelBn: 'রিপোর্ট ও অ্যানালিটিক্স',
    description: 'Revenue graphs, P&L, machine uptime, wastage analysis & VAT reports',
    actions: ['view', 'export'],
    defaultScope: 'company',
  },
  settings: {
    module: 'settings',
    label: 'Company Settings',
    labelBn: 'প্রতিষ্ঠান সেটিংস',
    description: 'Company info, VAT configuration, branches, user access & system rules',
    actions: ['view', 'edit', 'manage'],
    defaultScope: 'company',
  },
  tasks: {
    module: 'tasks',
    label: 'Tasks & Workflow',
    labelBn: 'টাস্ক ও ওয়ার্কফ্লো',
    description: 'Daily operational tasks, reminders and milestones',
    actions: ['view', 'complete'],
    defaultScope: 'assigned',
  },
  notifications: {
    module: 'notifications',
    label: 'Notifications',
    labelBn: 'নোটিফিকেশন',
    description: 'Real-time job updates, alerts and internal communications',
    actions: ['view'],
    defaultScope: 'own',
  },
  support: {
    module: 'support',
    label: 'Support & Help Desk',
    labelBn: 'সহায়তা ও হেল্প ডেস্ক',
    description: 'Live support chat, ticket management and troubleshooting',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
    defaultScope: 'company',
  },
}

export const ACTION_LABELS: Record<PermissionAction, { label: string; labelBn: string }> = {
  view: { label: 'View', labelBn: 'দেখা' },
  create: { label: 'Create', labelBn: 'তৈরি' },
  edit: { label: 'Edit', labelBn: 'সম্পাদনা' },
  delete: { label: 'Delete', labelBn: 'মুছে ফেলা' },
  approve: { label: 'Approve', labelBn: 'অনুমোদন' },
  reject: { label: 'Reject', labelBn: 'বাতিল/প্রত্যাখ্যান' },
  assign: { label: 'Assign', labelBn: 'বরাদ্দ' },
  complete: { label: 'Complete', labelBn: 'সম্পন্ন' },
  cancel: { label: 'Cancel', labelBn: 'বাতিল' },
  print: { label: 'Print', labelBn: 'প্রিন্ট' },
  download: { label: 'Download', labelBn: 'ডাউনলোড' },
  send: { label: 'Send', labelBn: 'পাঠানো' },
  export: { label: 'Export', labelBn: 'এক্সপোর্ট' },
  manage: { label: 'Manage', labelBn: 'ব্যবস্থাপনা' },
  full_control: { label: 'Full Control', labelBn: 'সম্পূর্ণ নিয়ন্ত্রণ' },
}

export interface MatrixResourceDefinition {
  resource: string
  label: string
  labelBn: string
  module: string
  description: string
}

export const MATRIX_RESOURCES: MatrixResourceDefinition[] = Object.values(MODULE_ACTION_SPECS).map((spec) => ({
  resource: spec.module,
  label: spec.label,
  labelBn: spec.labelBn,
  module: spec.module,
  description: spec.description,
}))

export const PERMISSION_ACTIONS: { action: PermissionAction; label: string; labelBn: string }[] = Object.entries(ACTION_LABELS).map(
  ([action, info]) => ({ action: action as PermissionAction, label: info.label, labelBn: info.labelBn })
)

export type RolePermissionMatrix = Record<string, Record<PermissionAction, boolean>>

export interface UserPermissionOverride {
  id: string
  company_user_id: string
  permission_code: string
  is_granted: boolean
}

export interface UserAccessProfile {
  userId: string
  companyId: string
  department?: string | null
  branchId?: string | null
  responsibilities: string[]
  overrides: Record<string, boolean>
  dataScopes: Record<string, DataScope>
}

export interface AuditLogRecord {
  id: string
  companyId: string
  actorId: string
  actorName: string
  targetUserId: string
  targetUserName: string
  actionType: 'permission_override_changed' | 'scope_override_changed' | 'responsibility_changed' | 'user_status_changed'
  details: Record<string, unknown>
  createdAt: string
}

export interface PlatformPlan {
  id: string
  name: string
  code: string
  price_bdt_monthly: number
  price_bdt_yearly: number
  max_users: number
  max_branches: number
  features: string[]
  is_active: boolean
}

export interface PlatformFeatureFlag {
  id: string
  key: string
  name: string
  description: string
  is_enabled: boolean
}

