import {
  type PrimaryRole,
  type ResponsibilitySlug,
  type PermissionAction,
  type PermissionModule,
  type DataScope,
  type RolePermissionMatrix,
  MODULE_ACTION_SPECS,
} from '../../types/rbac.types.ts'

/**
 * Maps legacy/singular resource keys to standard module keys
 */
export function normalizeModuleKey(raw: string): PermissionModule {
  const map: Record<string, PermissionModule> = {
    customer: 'customers',
    customers: 'customers',
    quotation: 'quotations',
    quotations: 'quotations',
    order: 'orders',
    orders: 'orders',
    work_order: 'orders',
    work_orders: 'orders',
    design: 'design',
    invoice: 'invoices',
    invoices: 'invoices',
    billing: 'invoices',
    payment: 'payments',
    payments: 'payments',
    production: 'production',
    machinery: 'machineries',
    machineries: 'machineries',
    machine: 'machineries',
    machines: 'machineries',
    delivery: 'delivery',
    inventory: 'inventory',
    purchase: 'inventory',
    supplier: 'inventory',
    report: 'reports',
    reports: 'reports',
    settings: 'settings',
    task: 'tasks',
    tasks: 'tasks',
    notification: 'notifications',
    notifications: 'notifications',
    user: 'users',
    users: 'users',
    staff: 'users',
    employee: 'hr',
    employees: 'hr',
    hr: 'hr',
    payroll: 'hr',
    overtime: 'hr',
    attendance: 'hr',
    branch: 'branches',
    branches: 'branches',
  }
  return map[raw.toLowerCase()] || (raw as PermissionModule)
}

/**
 * Responsibility default matrices for standard PrintFlow responsibilities
 */
export const DEFAULT_RESPONSIBILITY_MATRICES: Record<ResponsibilitySlug, Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>> = {
  business_owner: generateFullModuleMatrix(true),

  branch_manager: {
    customers: { view: true, create: true, edit: true, export: true },
    quotations: { view: true, create: true, edit: true, send: true, print: true },
    orders: { view: true, create: true, edit: true, assign: true, complete: true, print: true },
    design: { view: true, send: true, download: true },
    invoices: { view: true, create: true, edit: true, print: true, download: true, send: true },
    payments: { view: true, create: true, edit: true, print: true },
    production: { view: true, edit: true, complete: true },
    machineries: { view: true },
    delivery: { view: true, create: true, edit: true, assign: true, complete: true, print: true },
    inventory: { view: true, create: true, edit: true },
    reports: { view: true, export: true },
    settings: {},
    branches: {},
    tasks: { view: true, create: true, edit: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: { view: true },
    hr: { view: true, create: true, edit: true },
    whatsapp: { view: true, send: true, manage: true },
  },

  sales_manager: {
    customers: { view: true, create: true, edit: true, export: true },
    quotations: { view: true, create: true, edit: true, approve: true, send: true, print: true },
    orders: { view: true, create: true, edit: true, assign: true, print: true },
    design: { view: true, send: true, download: true },
    invoices: { view: true, create: true, edit: true, approve: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, print: true },
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true, assign: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: { view: true },
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true, export: true },
    pricing: { view: true, create: true, edit: true, manage: true },
    users: { view: true },
    hr: {},
    whatsapp: { view: true, send: true },
  },

  designer: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, create: true, edit: true, print: true },
    design: { view: true, create: true, edit: true, send: true, download: true, approve: true, manage: true },
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: {},
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, create: true, edit: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: {},
    hr: {},
    whatsapp: {},
  },

  production_manager: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, edit: true, print: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    machineries: { view: true, create: true, edit: true, delete: true, assign: true, manage: true, export: true },
    delivery: { view: true, assign: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true },
    pricing: { view: true },
    users: { view: true },
    hr: { view: true },
    whatsapp: { view: true, send: true },
  },

  operator: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true, cancel: true },
    machineries: { view: true, edit: true },
    delivery: {},
    inventory: { view: true },
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  store_manager: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true },
    pricing: { view: true },
    users: {},
    hr: {},
    whatsapp: {},
  },

  accountant: {
    customers: { view: true, edit: true },
    quotations: { view: true },
    orders: { view: true },
    design: {},
    invoices: { view: true, create: true, edit: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, edit: true, delete: true, print: true },
    production: {},
    machineries: { view: true },
    delivery: { view: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: {},
    hr: { view: true, create: true, edit: true, approve: true },
    whatsapp: { view: true, send: true },
  },

  delivery_coordinator: {
    customers: { view: true },
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: { view: true, print: true },
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: { view: true, send: true },
  },

  general_staff: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: {},
    machineries: { view: true },
    delivery: { view: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  sales: {
    customers: { view: true, create: true, edit: true, export: true },
    quotations: { view: true, create: true, edit: true, approve: true, send: true, print: true },
    orders: { view: true, create: true, edit: true, assign: true, print: true },
    design: { view: true, send: true, download: true },
    invoices: { view: true, create: true, edit: true, approve: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, print: true },
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true, assign: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: { view: true },
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true, export: true },
    pricing: { view: true, create: true, edit: true, manage: true },
    users: { view: true },
    hr: {},
    whatsapp: { view: true, send: true },
  },

  quotations: {
    customers: { view: true, create: true },
    quotations: { view: true, create: true, edit: true, approve: true, send: true, print: true },
    orders: { view: true },
    design: { view: true },
    invoices: { view: true, print: true },
    payments: { view: true },
    production: {},
    machineries: {},
    delivery: {},
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true, create: true, edit: true },
    users: {},
    hr: {},
    whatsapp: { view: true, send: true },
  },

  customers: {
    customers: { view: true, create: true, edit: true, export: true },
    quotations: { view: true },
    orders: { view: true },
    design: {},
    invoices: { view: true },
    payments: { view: true },
    production: {},
    machineries: {},
    delivery: {},
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: {},
    hr: {},
    whatsapp: { view: true, send: true },
  },

  design: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, create: true, edit: true, print: true },
    design: { view: true, create: true, edit: true, send: true, download: true, approve: true, manage: true },
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: {},
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, create: true, edit: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: {},
    hr: {},
    whatsapp: {},
  },

  production: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, edit: true, print: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    machineries: { view: true, create: true, edit: true, delete: true, assign: true, manage: true, export: true },
    delivery: { view: true, assign: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true },
    pricing: { view: true },
    users: { view: true },
    hr: { view: true },
    whatsapp: { view: true, send: true },
  },

  printing: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true, cancel: true },
    machineries: { view: true, edit: true },
    delivery: {},
    inventory: { view: true },
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  machine_operation: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true },
    machineries: { view: true, edit: true },
    delivery: {},
    inventory: { view: true },
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  machineries: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: { view: true, create: true, edit: true, manage: true },
    delivery: {},
    inventory: { view: true },
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  finishing: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true },
    machineries: { view: true },
    delivery: { view: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  fabrication: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true },
    machineries: { view: true },
    delivery: { view: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  inventory: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true, create: true, edit: true },
    pricing: { view: true },
    users: {},
    hr: {},
    whatsapp: {},
  },

  material_request: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: {},
    delivery: {},
    inventory: { view: true, create: true },
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: {},
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  accounts: {
    customers: { view: true, edit: true },
    quotations: { view: true },
    orders: { view: true },
    design: {},
    invoices: { view: true, create: true, edit: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, edit: true, delete: true, print: true },
    production: {},
    machineries: { view: true },
    delivery: { view: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: { view: true },
    users: {},
    hr: { view: true, create: true, edit: true, approve: true },
    whatsapp: { view: true, send: true },
  },

  delivery: {
    customers: { view: true },
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: { view: true, print: true },
    payments: {},
    production: { view: true },
    machineries: { view: true },
    delivery: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: { view: true },
    pricing: {},
    users: {},
    hr: {},
    whatsapp: { view: true, send: true },
  },

  installation: {
    customers: { view: true },
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    machineries: {},
    delivery: { view: true, edit: true, complete: true },
    inventory: {},
    reports: {},
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: {},
    pricing: {},
    users: {},
    hr: {},
    whatsapp: {},
  },

  hr_manager: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: {},
    machineries: {},
    delivery: {},
    inventory: {},
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: {},
    pricing: {},
    users: { view: true },
    hr: { view: true, create: true, edit: true, approve: true, manage: true },
    whatsapp: { view: true, send: true },
  },

  hr: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: {},
    machineries: {},
    delivery: {},
    inventory: {},
    reports: { view: true },
    settings: {},
    branches: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
    products: {},
    pricing: {},
    users: { view: true },
    hr: { view: true, create: true, edit: true, approve: true, manage: true },
    whatsapp: { view: true, send: true },
  },
}

export const DEFAULT_ROLE_MATRICES: Record<PrimaryRole, RolePermissionMatrix> = {
  platform_owner: generateLegacyMatrix(true),
  business_owner: generateLegacyMatrix(true),
  branch_manager: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.branch_manager),
  sales_manager: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.sales_manager),
  designer: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.designer),
  production_manager: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.production_manager),
  operator: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.operator),
  general_staff: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.general_staff),
}

function generateFullModuleMatrix(val: boolean): Record<PermissionModule, Partial<Record<PermissionAction, boolean>>> {
  const res = {} as Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>
  for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
    const modKey = mod as PermissionModule
    res[modKey] = {}
    for (const act of spec.actions) {
      res[modKey][act] = val
    }
    res[modKey].full_control = val
  }
  return res
}

function generateLegacyMatrix(val: boolean): RolePermissionMatrix {
  const matrix: RolePermissionMatrix = {}
  for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
    matrix[mod] = {
      view: val,
      create: val,
      edit: val,
      delete: val,
      approve: val,
      reject: val,
      assign: val,
      complete: val,
      cancel: val,
      print: val,
      download: val,
      send: val,
      export: val,
      manage: val,
      full_control: val,
    }
  }
  return matrix
}

function adaptToLegacyMatrix(
  modMatrix: Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>
): RolePermissionMatrix {
  const legacy: RolePermissionMatrix = {}
  for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
    legacy[mod] = {
      view: false,
      create: false,
      edit: false,
      delete: false,
      approve: false,
      reject: false,
      assign: false,
      complete: false,
      cancel: false,
      print: false,
      download: false,
      send: false,
      export: false,
      manage: false,
      full_control: false,
    }
    if (modMatrix[mod as PermissionModule]) {
      Object.assign(legacy[mod], modMatrix[mod as PermissionModule])
    }
  }
  return legacy
}

export type PermissionSourceType =
  | 'owner'
  | 'override_allow'
  | 'override_deny'
  | 'inherited'
  | 'default_deny'

export interface EffectivePermissionDetail {
  module: PermissionModule
  action: PermissionAction
  isGranted: boolean
  source: PermissionSourceType
  sourceDetail?: string
}

export interface UserPermissionContext {
  userId?: string
  role?: string | { name?: string; slug?: string; id?: string } | null
  roles?: Array<{ name?: string; slug?: string; id?: string }> | null
  primaryRole?: string
  companyRole?: string
  responsibilities?: string[]
  overrides?: Record<string, boolean>
  data_scopes?: Record<string, DataScope | string>
  isOwner?: boolean
}

/**
 * Universal evaluator to determine if a user context, session or role represents a Business Owner / Platform Owner.
 */
export function isUserBusinessOwner(user: UserPermissionContext | string | Record<string, unknown> | null | undefined): boolean {
  if (!user) return false
  if (typeof user === 'string') {
    const s = user.toLowerCase().trim()
    return s === 'business_owner' || s === 'owner' || s === 'platform_owner' || s.includes('owner')
  }

  const userObj = user as UserPermissionContext
  if (userObj.isOwner === true) return true
  if (userObj.primaryRole === 'business_owner' || userObj.primaryRole === 'owner' || userObj.primaryRole === 'platform_owner') return true
  if (userObj.companyRole === 'business_owner' || userObj.companyRole === 'owner') return true

  if (typeof userObj.role === 'string') {
    const s = userObj.role.toLowerCase().trim()
    if (s === 'business_owner' || s === 'owner' || s === 'platform_owner' || s.includes('owner')) return true
  } else if (typeof userObj.role === 'object' && userObj.role !== null) {
    const slug = (userObj.role.slug || userObj.role.name || '').toLowerCase()
    if (slug === 'business_owner' || slug === 'owner' || slug === 'platform_owner' || slug.includes('owner')) return true
  }

  if (Array.isArray(userObj.roles)) {
    if (
      userObj.roles.some((r: { slug?: string; name?: string } | null | undefined) => {
        if (!r) return false
        const slug = (r.slug || r.name || '').toLowerCase()
        return slug === 'business_owner' || slug === 'owner' || slug === 'platform_owner' || slug.includes('owner')
      })
    ) {
      return true
    }
  }

  if (Array.isArray(user.responsibilities)) {
    if (
      user.responsibilities.some((r: string) => {
        if (typeof r !== 'string') return false
        const s = r.toLowerCase().trim()
        return s === 'business_owner' || s === 'owner' || s === 'platform_owner'
      })
    ) {
      return true
    }
  }

  return false
}

/**
 * Normalizes user responsibilities from role slugs or responsibility arrays
 */
export function extractResponsibilities(user: UserPermissionContext | string): ResponsibilitySlug[] {
  if (typeof user === 'string') {
    const norm = normalizeResponsibilitySlug(user)
    return [norm]
  }

  const list: ResponsibilitySlug[] = []

  if (user.responsibilities && Array.isArray(user.responsibilities)) {
    for (const r of user.responsibilities) {
      list.push(normalizeResponsibilitySlug(r))
    }
  }

  // If user is a business owner, guarantee 'business_owner' is present
  if (isUserBusinessOwner(user) && !list.includes('business_owner')) {
    list.unshift('business_owner')
  }

  if (list.length === 0) {
    const rawRole = typeof user.role === 'string' ? user.role : user.role?.slug || user.role?.name
    const roleSlug = user.primaryRole || rawRole || (Array.isArray(user.roles) && user.roles[0]?.slug) || 'general_staff'
    list.push(normalizeResponsibilitySlug(roleSlug))
  }

  return Array.from(new Set(list))
}

export function normalizeResponsibilitySlug(slug: string): ResponsibilitySlug {
  const s = (slug || '').toLowerCase().trim().replace(/[\s-]+/g, '_')

  const exactMap: Record<string, ResponsibilitySlug> = {
    // Owner
    owner: 'business_owner',
    business_owner: 'business_owner',
    admin: 'business_owner',
    platform_owner: 'business_owner',

    // Branch
    branch_manager: 'branch_manager',
    branch_incharge: 'branch_manager',
    outlet_manager: 'branch_manager',
    showroom_manager: 'branch_manager',

    // Sales & Customers
    sales: 'sales_manager',
    sales_manager: 'sales_manager',
    sales_rep: 'sales_manager',
    sales_representative: 'sales_manager',
    sales_executive: 'sales_manager',
    counter_sales: 'sales_manager',
    quotation: 'quotations',
    quotations: 'quotations',
    quote: 'quotations',
    customer: 'customers',
    customers: 'customers',
    customer_management: 'customers',
    crm: 'customers',

    // Design
    designer: 'designer',
    graphic_designer: 'designer',
    design: 'designer',
    prepress: 'designer',
    pre_press: 'designer',
    artwork: 'designer',

    // Production & Machine
    production: 'production_manager',
    production_manager: 'production_manager',
    production_floor_incharge: 'production_manager',
    supervisor: 'production_manager',
    manager: 'production_manager',
    operator: 'operator',
    machine_operator: 'operator',
    machine_operation: 'operator',
    print_operator: 'operator',
    pressman: 'operator',
    press_operator: 'operator',
    offset_printer: 'operator',
    digital_operator: 'operator',
    printing: 'printing',
    finishing: 'finishing',
    finishing_operator: 'finishing',
    finishing_fabrication: 'operator',
    finishing_and_fabrication: 'operator',
    fabrication: 'fabrication',

    // Inventory & Material
    store: 'store_manager',
    store_manager: 'store_manager',
    store_keeper: 'store_manager',
    store_inventory: 'store_manager',
    store_and_inventory: 'store_manager',
    inventory: 'store_manager',
    inventory_manager: 'store_manager',
    material_request: 'material_request',
    requisition: 'material_request',

    // Accounts
    accountant: 'accountant',
    accounts: 'accountant',
    accounts_cashier: 'accountant',
    accounts_and_cashier: 'accountant',
    billing: 'accountant',
    finance: 'accountant',
    cashier: 'accountant',

    // Delivery & Installation
    delivery: 'delivery_coordinator',
    delivery_coordinator: 'delivery_coordinator',
    delivery_man: 'delivery_coordinator',
    installer: 'delivery_coordinator',
    installation: 'installation',
    courier: 'delivery_coordinator',
    field_staff: 'delivery_coordinator',

    // HR & Workforce
    hr: 'hr_manager',
    hr_manager: 'hr_manager',
    workforce: 'hr_manager',
    payroll: 'hr_manager',

    // General Staff
    general_staff: 'general_staff',
    staff: 'general_staff',
  }
  if (exactMap[s]) return exactMap[s]

  // Substring pattern matching for descriptive titles (e.g. "Senior Graphic Designer & Prepress", "Branch Manager")
  if (s.includes('branch') || s.includes('outlet') || s.includes('showroom')) {
    return 'branch_manager'
  }
  if (s.includes('design') || s.includes('graphic') || s.includes('prepress') || s.includes('pre_press') || s.includes('artwork')) {
    return 'designer'
  }
  if (s.includes('quote') || s.includes('quotat') || s.includes('estimate')) {
    return 'quotations'
  }
  if (s.includes('custom') || s.includes('client')) {
    return 'customers'
  }
  if (s.includes('sale') || s.includes('marketing') || s.includes('counter')) {
    return 'sales_manager'
  }
  if (s.includes('account') || s.includes('bill') || s.includes('finance') || s.includes('cashier')) {
    return 'accountant'
  }
  if (s.includes('hr') || s.includes('payroll') || s.includes('human_resource')) {
    return 'hr_manager'
  }
  if (s.includes('deliver') || s.includes('install') || s.includes('courier')) {
    return 'delivery_coordinator'
  }
  if (s.includes('store') || s.includes('inventor') || s.includes('stock')) {
    return 'store_manager'
  }
  if (s.includes('requisit') || s.includes('material_req')) {
    return 'material_request'
  }
  if (s.includes('product') || s.includes('factory') || s.includes('supervisor') || s.includes('incharge')) {
    return 'production_manager'
  }
  if (
    s.includes('operat') ||
    s.includes('technician') ||
    s.includes('pressman') ||
    s.includes('machinist') ||
    s.includes('printer') ||
    s.includes('print') ||
    s.includes('press') ||
    s.includes('offset') ||
    s.includes('finisher') ||
    s.includes('finish') ||
    s.includes('die_cut') ||
    s.includes('binder') ||
    s.includes('fabricat')
  ) {
    return 'operator'
  }
  if (s.includes('owner') || s.includes('admin') || s.includes('director')) {
    return 'business_owner'
  }

  return 'general_staff'
}

/**
 * Normalizes an employee job title or portal role to the canonical portal role dropdown slug:
 * 'designer' | 'operator' | 'sales' | 'accounts' | 'manager' | 'general_staff'
 */
export function normalizePortalRole(rawRole?: string | null): 'branch_manager' | 'designer' | 'operator' | 'sales' | 'accounts' | 'manager' | 'general_staff' {
  if (!rawRole) return 'operator'
  const resp = normalizeResponsibilitySlug(rawRole)
  if (resp === 'branch_manager') return 'branch_manager'
  if (resp === 'designer') return 'designer'
  if (resp === 'sales_manager') return 'sales'
  if (resp === 'accountant') return 'accounts'
  if (resp === 'production_manager') return 'manager'
  if (resp === 'operator') return 'operator'
  return 'general_staff'
}

/**
 * Calculates the exact effective permission detail for a specific module and action.
 * Precedence Rule:
 * 1. Explicit User Deny (override === false) -> DENIED
 * 2. Explicit User Allow (override === true) -> ALLOWED
 * 3. Responsibility Allow (any assigned responsibility allows) -> ALLOWED
 * 4. Default Deny -> DENIED
 */
export function getPermissionDetail(
  user: UserPermissionContext | string,
  rawModule: string,
  action: PermissionAction
): EffectivePermissionDetail {
  const permModule = normalizeModuleKey(rawModule)
  const code = `${permModule}.${action}`
  const userCtx: UserPermissionContext =
    typeof user === 'string' ? { primaryRole: user } : user

  const isOwner = isUserBusinessOwner(userCtx)

  // 1. Business Owner -> IMMUTABLE FULL ACCESS (Highest Priority, cannot be locked out)
  if (isOwner) {
    return {
      module: permModule,
      action,
      isGranted: true,
      source: 'owner',
      sourceDetail: 'Business Owner Full Access',
    }
  }

  const overrides = userCtx.overrides || {}

  // 2. Check EXPLICIT USER DENY (Highest Priority for employees)
  if (overrides[code] === false || overrides[`${rawModule}.${action}`] === false) {
    return {
      module: permModule,
      action,
      isGranted: false,
      source: 'override_deny',
      sourceDetail: 'User Override (Denied)',
    }
  }

  // 3. Check EXPLICIT USER ALLOW
  if (
    overrides[code] === true ||
    overrides[`${rawModule}.${action}`] === true ||
    overrides[`${permModule}.full_control`] === true ||
    overrides[`${rawModule}.full_control`] === true
  ) {
    return {
      module: permModule,
      action,
      isGranted: true,
      source: 'override_allow',
      sourceDetail: 'User Override (Allowed)',
    }
  }

  // 3. Check INHERITED RESPONSIBILITIES
  const responsibilities = extractResponsibilities(userCtx)
  for (const resp of responsibilities) {
    const matrix = DEFAULT_RESPONSIBILITY_MATRICES[resp]
    if (matrix && matrix[permModule]?.[action]) {
      return {
        module: permModule,
        action,
        isGranted: true,
        source: 'inherited',
        sourceDetail: `Inherited (${resp})`,
      }
    }
  }

  // 4. DEFAULT DENY
  return {
    module: permModule,
    action,
    isGranted: false,
    source: 'default_deny',
    sourceDetail: 'Default Deny',
  }
}

/**
 * Checks if a user / role has permission for a specific code (e.g. "invoices.create", "orders.view")
 */
export function checkPermission(
  roleOrUser: PrimaryRole | UserPermissionContext | string,
  permissionCodeOrModule: string,
  actionOrOverrides?: PermissionAction | string | Record<string, boolean>,
  userOverrides: Record<string, boolean> = {},
  _customMatrix?: RolePermissionMatrix
): boolean {
  if (!permissionCodeOrModule) return false

  let rawMod: string
  let act: PermissionAction
  let activeOverrides = userOverrides

  if (typeof actionOrOverrides === 'string') {
    rawMod = permissionCodeOrModule
    act = actionOrOverrides as PermissionAction
  } else if (typeof actionOrOverrides === 'object' && actionOrOverrides !== null) {
    const parts = permissionCodeOrModule.split('.')
    rawMod = parts[0]
    act = parts[1] as PermissionAction
    activeOverrides = { ...actionOrOverrides, ...userOverrides }
  } else {
    const parts = permissionCodeOrModule.split('.')
    rawMod = parts[0]
    act = parts[1] as PermissionAction
  }

  if (!rawMod || !act) return false

  let ctx: UserPermissionContext
  if (typeof roleOrUser === 'string') {
    ctx = {
      primaryRole: roleOrUser,
      overrides: activeOverrides,
    }
  } else {
    ctx = {
      ...roleOrUser,
      overrides: { ...(roleOrUser.overrides || {}), ...activeOverrides },
    }
  }

  const detail = getPermissionDetail(ctx, rawMod, act)
  return detail.isGranted
}

/**
 * Calculates effective data scope for a module
 */
export function getEffectiveDataScope(
  user: UserPermissionContext,
  rawModule: string
): DataScope {
  const permModule = normalizeModuleKey(rawModule)

  // 1. Owner always has company scope
  if (isUserBusinessOwner(user)) {
    return 'company'
  }

  // 2. User specific scope override
  if (user.data_scopes && user.data_scopes[permModule]) {
    return user.data_scopes[permModule] as DataScope
  }

  // 3. Manager / Accountant have company scope default; Branch Manager strictly scopes to their assigned branch
  const responsibilities = extractResponsibilities(user)
  const roleName = typeof user.role === 'string' ? user.role : (user.role?.slug || user.role?.name || '')
  if (responsibilities.includes('branch_manager') || user.primaryRole === 'branch_manager' || roleName === 'branch_manager') {
    return 'branch'
  }
  if (responsibilities.includes('sales_manager') || responsibilities.includes('accountant')) {
    return 'company'
  }

  // 4. Default from spec
  return MODULE_ACTION_SPECS[permModule]?.defaultScope || 'assigned'
}

export interface ScopeCheckContext {
  userId: string
  userDepartment?: string | null
  userBranchId?: string | null
  userAuthorizedBranchIds?: string[] | null
  recordOwnerId?: string | null
  recordAssigneeId?: string | null
  recordDepartment?: string | null
  recordBranchId?: string | null
  isOwnerOrAdmin?: boolean
}

function evaluateDataScopeInternal(
  userScope: DataScope,
  ctx: ScopeCheckContext
): boolean {
  if (ctx.isOwnerOrAdmin) return true

  // For scopes strictly limited to single branch or specific branches
  if (
    (userScope === 'own' || userScope === 'assigned' || userScope === 'department' || userScope === 'branch') &&
    ctx.userBranchId &&
    ctx.recordBranchId &&
    ctx.userBranchId !== ctx.recordBranchId
  ) {
    return false
  }

  if (userScope === 'selected_branches' && ctx.recordBranchId) {
    const allowed = ctx.userAuthorizedBranchIds || (ctx.userBranchId ? [ctx.userBranchId] : [])
    if (!allowed.includes(ctx.recordBranchId)) {
      return false
    }
    return true
  }

  switch (userScope) {
    case 'own':
      return Boolean(ctx.recordOwnerId && ctx.recordOwnerId === ctx.userId)

    case 'assigned':
      return Boolean(
        (ctx.recordAssigneeId && ctx.recordAssigneeId === ctx.userId) ||
        (ctx.recordOwnerId && ctx.recordOwnerId === ctx.userId)
      )

    case 'department':
      if (
        ctx.userDepartment &&
        ctx.recordDepartment &&
        ctx.userDepartment.toLowerCase() === ctx.recordDepartment.toLowerCase()
      ) {
        return true
      }
      return Boolean(
        (ctx.recordAssigneeId && ctx.recordAssigneeId === ctx.userId) ||
        (ctx.recordOwnerId && ctx.recordOwnerId === ctx.userId)
      )

    case 'branch':
      if (!ctx.recordBranchId || !ctx.userBranchId) return true
      return ctx.recordBranchId === ctx.userBranchId

    case 'selected_branches':
      return true

    case 'all_branches':
    case 'company':
      return true

    default:
      return false
  }
}

/**
 * Server- and client-safe data scope access evaluator supporting both context and record signatures
 */
export function checkDataScopeAccess(
  scopeOrUser: DataScope | any,
  ctxOrResource: ScopeCheckContext | any,
  explicitScope?: DataScope,
  fallbackUserId?: string
): boolean {
  if (typeof scopeOrUser === 'string') {
    return evaluateDataScopeInternal(scopeOrUser as DataScope, ctxOrResource as ScopeCheckContext)
  }

  // Object-based checkDataScopeAccess(user, resource, scope, fallbackUserId)
  const user = scopeOrUser || {}
  const resource = ctxOrResource || {}
  const scope: DataScope = explicitScope || 'assigned'
  const userId = user.userId || user.user_id || fallbackUserId || ''

  const ctx: ScopeCheckContext = {
    userId,
    userDepartment: user.department,
    userBranchId: user.branchId || user.branch_id,
    userAuthorizedBranchIds: user.authorizedBranchIds,
    recordOwnerId: resource.created_by || resource.user_id || resource.recordOwnerId,
    recordAssigneeId: resource.assigned_to || resource.assignee_id || resource.recordAssigneeId,
    recordDepartment: resource.department || resource.recordDepartment,
    recordBranchId: resource.branch_id || resource.branchId || resource.recordBranchId,
    isOwnerOrAdmin: isUserBusinessOwner(user),
  }

  return evaluateDataScopeInternal(scope, ctx)
}

/**
 * Standard practical responsibilities for print & signage businesses (Prompt Sec 32)
 */
export const PRACTICAL_RESPONSIBILITIES = [
  'Sales',
  'Quotation',
  'Customer Management',
  'Design',
  'Production',
  'Printing',
  'Machine Operation',
  'Finishing',
  'Fabrication',
  'Inventory',
  'Material Request',
  'Delivery',
  'Installation',
  'Accounts',
  'HR',
] as const

export type PracticalResponsibility = (typeof PRACTICAL_RESPONSIBILITIES)[number]

/**
 * Default responsibility presets suggested automatically when choosing a role (Prompt Sec 33)
 */
export const RESPONSIBILITY_PRESETS_BY_ROLE: Record<string, string[]> = {
  business_owner: [
    'Sales',
    'Quotation',
    'Customer Management',
    'Design',
    'Production',
    'Printing',
    'Machine Operation',
    'Finishing',
    'Inventory',
    'Material Request',
    'Delivery',
    'Accounts',
    'HR',
  ],
  owner: [
    'Sales',
    'Quotation',
    'Customer Management',
    'Design',
    'Production',
    'Printing',
    'Machine Operation',
    'Finishing',
    'Inventory',
    'Material Request',
    'Delivery',
    'Accounts',
    'HR',
  ],
  branch_manager: ['Sales', 'Quotation', 'Customer Management', 'Production', 'Delivery', 'Material Request'],
  manager: ['Sales', 'Quotation', 'Customer Management', 'Production', 'Delivery', 'Material Request'],
  sales_manager: ['Sales', 'Quotation', 'Customer Management'],
  sales: ['Sales', 'Quotation', 'Customer Management'],
  designer: ['Design', 'Approval', 'Revision'],
  production_manager: ['Production', 'Finishing', 'Machine Operation', 'Material Request'],
  operator: ['Printing', 'Machine Operation', 'Material Request'],
  production_operator: ['Printing', 'Machine Operation', 'Material Request'],
  store_manager: ['Inventory', 'Material Request'],
  store_keeper: ['Inventory', 'Material Request'],
  accountant: ['Accounts'],
  accounts: ['Accounts'],
  hr: ['HR'],
  hr_manager: ['HR'],
  delivery_coordinator: ['Delivery', 'Installation'],
  general_staff: ['Material Request'],
}

/**
 * Returns responsibility presets for any given role slug
 */
export function getResponsibilityPresetsForRole(roleSlug: string): string[] {
  const norm = (roleSlug || '').toLowerCase().trim().replace(/\s+/g, '_')
  return (
    RESPONSIBILITY_PRESETS_BY_ROLE[norm] ||
    RESPONSIBILITY_PRESETS_BY_ROLE[norm.replace('role-', '')] ||
    ['Material Request']
  )
}

/**
 * Sensible default data scope by role (Prompt Sec 35)
 */
export const DEFAULT_ROLE_DATA_SCOPES: Record<string, DataScope> = {
  business_owner: 'company',
  owner: 'company',
  branch_manager: 'branch',
  manager: 'branch',
  sales_manager: 'assigned',
  sales: 'assigned',
  designer: 'assigned',
  production_manager: 'assigned',
  operator: 'assigned',
  production_operator: 'assigned',
  store_manager: 'branch',
  store_keeper: 'branch',
  accountant: 'company',
  accounts: 'company',
  hr: 'company',
  delivery_coordinator: 'assigned',
  general_staff: 'assigned',
}

export function getPracticalDefaultDataScope(roleSlug: string): DataScope {
  const norm = (roleSlug || '').toLowerCase().trim().replace(/\s+/g, '_')
  return (
    DEFAULT_ROLE_DATA_SCOPES[norm] ||
    DEFAULT_ROLE_DATA_SCOPES[norm.replace('role-', '')] ||
    'assigned'
  )
}


