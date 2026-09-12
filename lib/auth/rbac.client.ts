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
  }
  return map[raw.toLowerCase()] || (raw as PermissionModule)
}

/**
 * Responsibility default matrices for standard PrintERP responsibilities
 */
export const DEFAULT_RESPONSIBILITY_MATRICES: Record<ResponsibilitySlug, Record<PermissionModule, Partial<Record<PermissionAction, boolean>>>> = {
  business_owner: generateFullModuleMatrix(true),

  sales_manager: {
    customers: { view: true, create: true, edit: true, export: true },
    quotations: { view: true, create: true, edit: true, approve: true, send: true, print: true },
    orders: { view: true, create: true, edit: true, assign: true, print: true },
    design: { view: true, send: true, download: true },
    invoices: { view: true, create: true, edit: true, approve: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, print: true },
    production: { view: true },
    delivery: { view: true, assign: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: { view: true },
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  designer: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, create: true, edit: true, print: true },
    design: { view: true, create: true, edit: true, send: true, download: true, approve: true },
    invoices: { view: true },
    payments: {},
    production: { view: true },
    delivery: {},
    inventory: {},
    reports: {},
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  production_manager: {
    customers: { view: true },
    quotations: { view: true },
    orders: { view: true, edit: true, print: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    delivery: { view: true, assign: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  operator: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: { view: true, download: true },
    invoices: {},
    payments: {},
    production: { view: true, edit: true, complete: true, cancel: true },
    delivery: {},
    inventory: { view: true },
    reports: {},
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  store_manager: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: { view: true },
    delivery: { view: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true },
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  accountant: {
    customers: { view: true, edit: true },
    quotations: { view: true },
    orders: { view: true },
    design: {},
    invoices: { view: true, create: true, edit: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, edit: true, delete: true, print: true },
    production: {},
    delivery: { view: true },
    inventory: { view: true },
    reports: { view: true, export: true },
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  delivery_coordinator: {
    customers: { view: true },
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: { view: true, print: true },
    payments: {},
    production: { view: true },
    delivery: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    inventory: {},
    reports: {},
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },

  general_staff: {
    customers: {},
    quotations: {},
    orders: { view: true },
    design: {},
    invoices: {},
    payments: {},
    production: {},
    delivery: { view: true },
    inventory: {},
    reports: {},
    settings: {},
    tasks: { view: true, complete: true },
    notifications: { view: true },
    support: { view: true, create: true, send: true },
  },
}

export const DEFAULT_ROLE_MATRICES: Record<PrimaryRole, RolePermissionMatrix> = {
  platform_owner: generateLegacyMatrix(true),
  business_owner: generateLegacyMatrix(true),
  sales_manager: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.sales_manager),
  designer: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.designer),
  production_manager: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.production_manager),
  operator: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.operator),
  general_staff: adaptToLegacyMatrix(DEFAULT_RESPONSIBILITY_MATRICES.general_staff),
}

function generateFullModuleMatrix(val: boolean): Record<PermissionModule, Partial<Record<PermissionAction, boolean>>> {
  const res: any = {}
  for (const [mod, spec] of Object.entries(MODULE_ACTION_SPECS)) {
    res[mod] = {}
    for (const act of spec.actions) {
      res[mod][act] = val
    }
    res[mod].full_control = val
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
  role?: string
  primaryRole?: string
  responsibilities?: string[]
  overrides?: Record<string, boolean>
  data_scopes?: Record<string, DataScope>
  isOwner?: boolean
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

  if (list.length === 0) {
    const roleSlug = user.primaryRole || user.role || 'general_staff'
    list.push(normalizeResponsibilitySlug(roleSlug))
  }

  return Array.from(new Set(list))
}

export function normalizeResponsibilitySlug(slug: string): ResponsibilitySlug {
  const map: Record<string, ResponsibilitySlug> = {
    owner: 'business_owner',
    business_owner: 'business_owner',
    admin: 'business_owner',
    manager: 'sales_manager',
    sales: 'sales_manager',
    sales_manager: 'sales_manager',
    designer: 'designer',
    graphic_designer: 'designer',
    production: 'production_manager',
    production_manager: 'production_manager',
    operator: 'operator',
    machine_operator: 'operator',
    store_manager: 'store_manager',
    inventory_manager: 'store_manager',
    accountant: 'accountant',
    finance: 'accountant',
    installer: 'delivery_coordinator',
    delivery: 'delivery_coordinator',
    delivery_coordinator: 'delivery_coordinator',
    general_staff: 'general_staff',
    staff: 'general_staff',
  }
  return map[slug.toLowerCase()] || 'general_staff'
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

  const isOwner =
    userCtx.isOwner ||
    userCtx.primaryRole === 'business_owner' ||
    userCtx.primaryRole === 'platform_owner' ||
    userCtx.role === 'owner' ||
    userCtx.responsibilities?.includes('business_owner') ||
    userCtx.responsibilities?.includes('owner')

  const overrides = userCtx.overrides || {}

  // 1. Check EXPLICIT USER DENY (Highest Priority)
  if (overrides[code] === false || overrides[`${rawModule}.${action}`] === false) {
    return {
      module: permModule,
      action,
      isGranted: false,
      source: 'override_deny',
      sourceDetail: 'User Override (Denied)',
    }
  }

  // 2. Check EXPLICIT USER ALLOW
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

  // If Business Owner (and no explicit deny) -> UNIVERSAL ALLOW
  if (isOwner) {
    return {
      module: permModule,
      action,
      isGranted: true,
      source: 'owner',
      sourceDetail: 'Business Owner Full Access',
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
  permissionCode: string,
  userOverrides: Record<string, boolean> = {},
  _customMatrix?: RolePermissionMatrix
): boolean {
  if (!permissionCode) return false
  const [rawMod, act] = permissionCode.split('.') as [string, PermissionAction]
  if (!rawMod || !act) return false

  let ctx: UserPermissionContext
  if (typeof roleOrUser === 'string') {
    ctx = {
      primaryRole: roleOrUser,
      overrides: userOverrides,
    }
  } else {
    ctx = {
      ...roleOrUser,
      overrides: { ...(roleOrUser.overrides || {}), ...userOverrides },
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

  // 1. User specific scope override
  if (user.data_scopes && user.data_scopes[permModule]) {
    return user.data_scopes[permModule]
  }

  // 2. Owner has company scope
  const isOwner =
    user.isOwner ||
    user.primaryRole === 'business_owner' ||
    user.primaryRole === 'platform_owner' ||
    user.role === 'owner' ||
    user.responsibilities?.includes('business_owner')

  if (isOwner) return 'company'

  // 3. Manager / Accountant have company scope default
  const responsibilities = extractResponsibilities(user)
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
  recordOwnerId?: string | null
  recordAssigneeId?: string | null
  recordDepartment?: string | null
  recordBranchId?: string | null
  isOwnerOrAdmin?: boolean
}

/**
 * Server- and client-safe data scope access evaluator
 */
export function checkDataScopeAccess(
  userScope: DataScope,
  ctx: ScopeCheckContext
): boolean {
  if (ctx.isOwnerOrAdmin) return true

  // Branch boundary check: if record is in another branch and user has branch restriction
  if (
    ctx.userBranchId &&
    ctx.recordBranchId &&
    ctx.userBranchId !== ctx.recordBranchId
  ) {
    return false
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

    case 'company':
      return true

    default:
      return false
  }
}

