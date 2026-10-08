export type PrimaryRole =
  | 'platform_owner'
  | 'business_owner'
  | 'branch_manager'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'general_staff'

export type ResponsibilitySlug =
  | 'business_owner'
  | 'branch_manager'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'store_manager'
  | 'accountant'
  | 'delivery_coordinator'
  | 'general_staff'
  | 'hr_manager'
  | 'hr'
  | 'sales'
  | 'quotations'
  | 'customers'
  | 'design'
  | 'production'
  | 'printing'
  | 'machineries'
  | 'machine_operation'
  | 'finishing'
  | 'fabrication'
  | 'inventory'
  | 'material_request'
  | 'delivery'
  | 'installation'
  | 'accounts'

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
  | 'machineries'
  | 'delivery'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'tasks'
  | 'notifications'
  | 'support'
  | 'branches'
  | 'products'
  | 'pricing'
  | 'users'
  | 'hr'
  | 'whatsapp'

export type DataScope =
  | 'own'
  | 'assigned'
  | 'department'
  | 'branch'
  | 'selected_branches'
  | 'all_branches'
  | 'company'

export interface CustomRoleInput {
  name: string
  nameBn?: string
  description?: string
  slug?: string
  permissions: string[]
}

export interface RoleWithPermissions {
  id: string
  company_id?: string | null
  name: string
  name_bn?: string | null
  slug: string
  description?: string | null
  is_system: boolean
  is_active: boolean
  permissions: string[]
  assigned_users_count?: number
  created_at?: string
}

export interface UserAccessSummary {
  userId: string
  companyUserId: string
  fullName: string
  fullNameBn?: string | null
  email: string
  phone?: string | null
  status: 'active' | 'invited' | 'disabled'
  department: string
  primaryBranchName?: string | null
  authorizedBranchesCount: number
  responsibilities: string[]
  isOwner: boolean
  specialPowersCount: number
  deniedOverridesCount: number
  dataScopes: Record<string, DataScope>
}

export interface ModuleActionSpec {
  module: PermissionModule
  label: string
  labelBn: string
  description: string
  descriptionBn?: string
  actions: PermissionAction[]
  defaultScope: DataScope
}

export const MODULE_ACTION_SPECS: Record<PermissionModule, ModuleActionSpec> = {
  products: {
    module: 'products',
    descriptionBn: 'প্রিন্ট, ফেব্রিকেশন, ইনস্টলেশন রেট, স্পেসিফিকেশন ও ক্যাটালগ আইটেম',
    label: 'Products & Services',
    labelBn: 'পণ্য ও সেবা',
    description: 'Print, fabrication, installation tariffs, specifications and catalog items',
    actions: ['view', 'create', 'edit', 'delete', 'manage', 'export'],
    defaultScope: 'company',
  },
  pricing: {
    module: 'pricing',
    descriptionBn: 'মূল্য তালিকা, কাস্টমার রেট, ফ্লোর মার্জিন ও ক্যালকুলেশন ফর্মুলা',
    label: 'Pricing & Rates',
    labelBn: 'মূল্য নির্ধারণ ও দর',
    description: 'Price lists, customer rates, floor margins and calculation formulas',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'manage', 'export'],
    defaultScope: 'company',
  },
  customers: {
    module: 'customers',
    descriptionBn: 'কাস্টমার প্রোফাইল, যোগাযোগকারী ব্যক্তি, ক্রেডিট লিমিট ও বাকি ব্যালেন্স',
    label: 'Customers',
    labelBn: 'কাস্টমার তালিকা',
    description: 'Customer profiles, contact persons, credit limit & outstanding balance',
    actions: ['view', 'create', 'edit', 'delete', 'export'],
    defaultScope: 'company',
  },
  quotations: {
    module: 'quotations',
    descriptionBn: 'স্কয়ার ফুট রেট হিসাব, এস্টিমেট, মূল্য অনুমোদন ও ক্লায়েন্ট কোটেশন',
    label: 'Quotations',
    labelBn: 'কোটেশন ও দরপত্র',
    description: 'Square-foot rate calculations, estimates, price approvals & client dispatch',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'send', 'print'],
    defaultScope: 'company',
  },
  orders: {
    module: 'orders',
    descriptionBn: 'জব টিকিট, মিডিয়ার বিবরণ, ডেলিভারি সময়সীমা, দায়িত্ব বণ্টন ও অগ্রিম',
    label: 'Work Orders',
    labelBn: 'কাজের অর্ডার',
    description: 'Job tickets, media specifications, delivery milestones, assignments & deposits',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'complete', 'cancel', 'print'],
    defaultScope: 'assigned',
  },
  design: {
    module: 'design',
    descriptionBn: 'প্রি-প্রেস প্রুফ, কাস্টমার ডিজাইন অনুমোদন, ফাইল ডাউনলোড ও সংশোধন',
    label: 'Design Panel',
    labelBn: 'ডিজাইন ও প্রুফ',
    description: 'Prepress proofs, customer design approvals, file downloads & revisions',
    actions: ['view', 'create', 'edit', 'send', 'download', 'approve'],
    defaultScope: 'assigned',
  },
  invoices: {
    module: 'invoices',
    descriptionBn: 'বাণিজ্যিক বিল, ভ্যাট ৬.৩ চালান, ডিসকাউন্ট, অনুমোদন, বাতিল ও প্রিন্ট',
    label: 'Invoices & Billing',
    labelBn: 'ইনভয়েস ও বিল',
    description: 'Commercial bills, tax invoices, discounts, approvals, voids & prints',
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'cancel', 'print', 'download', 'send'],
    defaultScope: 'company',
  },
  payments: {
    module: 'payments',
    descriptionBn: 'নগদ, বিকাশ/নগদ, ব্যাংক জমা ও মানি রসিদ (এমআর) কালেকশন',
    label: 'Payments & Receipts',
    labelBn: 'পেমেন্ট ও মানি রসিদ',
    description: 'Cash, bKash/Nagad, bank transfer collections & money receipts (MR)',
    actions: ['view', 'create', 'edit', 'delete', 'print'],
    defaultScope: 'company',
  },
  production: {
    module: 'production',
    descriptionBn: 'মেশিন কিউ, স্টেজ শিডিউলিং, ফেব্রিকেশন, ফিনিশিং ও কিউসি পরীক্ষণ',
    label: 'Production Floor',
    labelBn: 'কারখানা ও উৎপাদন',
    description: 'Machine queues, stage scheduling, fabrication, finishing & QC inspection',
    actions: ['view', 'create', 'edit', 'assign', 'complete', 'cancel'],
    defaultScope: 'assigned',
  },
  machineries: {
    module: 'machineries',
    descriptionBn: 'মেশিন বহর, সক্রিয় অবস্থা, ধারণক্ষমতা, রক্ষণাবেক্ষণ ও ডাউনটাইম লগ',
    label: 'Machineries & Fleet',
    labelBn: 'মেশিনারি ও সরঞ্জাম',
    description: 'Machine fleet, operational status, capacity, maintenance & breakdown logs',
    actions: ['view', 'create', 'edit', 'delete', 'assign', 'manage', 'export'],
    defaultScope: 'company',
  },
  delivery: {
    module: 'delivery',
    descriptionBn: 'ডেলিভারি চালান, পরিবহন প্রেরণ, সাইট ইনস্টলেশন ও রসিদ হ্যান্ডওভার',
    label: 'Delivery & Challans',
    labelBn: 'ডেলিভারি ও চালান',
    description: 'Delivery challans, transport dispatch, site installations & signed handovers',
    actions: ['view', 'create', 'edit', 'assign', 'complete', 'cancel'],
    defaultScope: 'assigned',
  },
  inventory: {
    module: 'inventory',
    descriptionBn: 'ফ্লেক্স রোল, ভিনাইল, কালি, বোর্ড, স্টক সমন্বয় ও রিকুইজিশন অনুমোদন',
    label: 'Inventory & Materials',
    labelBn: 'কাঁচামাল ও স্টক',
    description: 'Flex rolls, vinyl, inks, boards, stock adjustments & requisition approvals',
    actions: ['view', 'create', 'edit', 'approve'],
    defaultScope: 'company',
  },
  reports: {
    module: 'reports',
    descriptionBn: 'রাজস্ব গ্রাফ, লাভ-ক্ষতি, মেশিন আপটাইম, অপচয় বিশ্লেষণ ও ভ্যাট রিপোর্ট',
    label: 'Reports & Analytics',
    labelBn: 'রিপোর্ট ও হিসাব',
    description: 'Revenue graphs, P&L, machine uptime, wastage analysis & VAT reports',
    actions: ['view', 'export'],
    defaultScope: 'company',
  },
  settings: {
    module: 'settings',
    descriptionBn: 'প্রতিষ্ঠান তথ্য, ভ্যাট কনফিগারেশন, শাখা, ইউজার এক্সেস ও সিস্টেম নিয়ম',
    label: 'Company Settings',
    labelBn: 'প্রতিষ্ঠান সেটিংস',
    description: 'Company info, VAT configuration, branches, user access & system rules',
    actions: ['view', 'edit', 'manage'],
    defaultScope: 'company',
  },
  tasks: {
    module: 'tasks',
    descriptionBn: 'দৈনিক অপারেশনাল কাজ, রিমাইন্ডার ও সম্পন্ন করার মাইলফলক',
    label: 'Tasks & Workflow',
    labelBn: 'কাজের তালিকা',
    description: 'Daily operational tasks, reminders and milestones',
    actions: ['view', 'complete'],
    defaultScope: 'assigned',
  },
  notifications: {
    module: 'notifications',
    descriptionBn: 'রিয়েল-টাইম কাজের আপডেট, জরুরি অ্যালার্ট ও ইন্টারনাল নোটিশ',
    label: 'Notifications',
    labelBn: 'বিজ্ঞপ্তি',
    description: 'Real-time job updates, alerts and internal communications',
    actions: ['view'],
    defaultScope: 'own',
  },
  support: {
    module: 'support',
    descriptionBn: 'লাইভ সাপোর্ট চ্যাট, টিকিট ব্যবস্থাপনা ও সমস্যা সমাধান',
    label: 'Help & Support',
    labelBn: 'সহায়তা ও সাপোর্ট',
    description: 'Live support chat, ticket management and troubleshooting',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
    defaultScope: 'company',
  },
  branches: {
    module: 'branches',
    descriptionBn: 'একাধিক শাখা পরিচালনা, ফ্যাক্টরি আউটলেট ও আন্তঃশাখা সমন্বয়',
    label: 'Branch Management',
    labelBn: 'শাখা ব্যবস্থাপনা',
    description: 'Multi-branch operations, factory outlets, and cross-branch logistics',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
    defaultScope: 'company',
  },
  users: {
    module: 'users',
    descriptionBn: 'টিম সদস্য ডিরেক্টরি, লগইন তথ্য, দায়িত্ব, এক্সেস ওভাররাইড ও নিরাপত্তা অডিট',
    label: 'Users & Permissions',
    labelBn: 'টিম সদস্য ও অনুমতি',
    description: 'Staff directory, access credentials, responsibilities, overrides, and security audit',
    actions: ['view', 'create', 'edit', 'delete', 'manage'],
    defaultScope: 'company',
  },
  hr: {
    module: 'hr',
    descriptionBn: 'হাজিরা, শিফট, ওভারটাইম, বেতন অগ্রিম, পে-রোল শীট ও বেতন প্রদান',
    label: 'Workforce & Payroll',
    labelBn: 'কর্মী ও বেতন',
    description: 'Attendance, shifts, overtime, salary advances, payroll sheets, and payment disbursement',
    actions: ['view', 'create', 'edit', 'approve', 'manage'],
    defaultScope: 'company',
  },
  whatsapp: {
    module: 'whatsapp',
    descriptionBn: 'হোয়াটসঅ্যাপ মেসেজিং, কানেকশন লিংক, কাস্টমার/কর্মী বার্তা ও ওটিপি প্রেরণ',
    label: 'WhatsApp Gateway & Communications',
    labelBn: 'হোয়াটসঅ্যাপ ও যোগাযোগ',
    description: 'WhatsApp inbox, connection linking, customer/employee messaging, and OTP dispatch',
    actions: ['view', 'send', 'manage', 'export'],
    defaultScope: 'company',
  },
}

export const ACTION_LABELS: Record<PermissionAction, { label: string; labelBn: string }> = {
  view: { label: 'View', labelBn: 'দেখা' },
  create: { label: 'Create', labelBn: 'তৈরি' },
  edit: { label: 'Edit', labelBn: 'সম্পাদনা' },
  delete: { label: 'Delete', labelBn: 'মুছে ফেলা' },
  approve: { label: 'Approve', labelBn: 'অনুমোদন' },
  reject: { label: 'Reject', labelBn: 'প্রত্যাখ্যান' },
  assign: { label: 'Assign', labelBn: 'বরাদ্দ' },
  complete: { label: 'Complete', labelBn: 'সম্পন্ন' },
  cancel: { label: 'Cancel', labelBn: 'বাতিল' },
  print: { label: 'Print', labelBn: 'প্রিন্ট' },
  download: { label: 'Download', labelBn: 'ডাউনলোড' },
  send: { label: 'Send', labelBn: 'পাঠানো' },
  export: { label: 'Export', labelBn: 'রপ্তানি' },
  manage: { label: 'Manage', labelBn: 'ব্যবস্থাপনা' },
  full_control: { label: 'Full Control', labelBn: 'পূর্ণ নিয়ন্ত্রণ' },
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

