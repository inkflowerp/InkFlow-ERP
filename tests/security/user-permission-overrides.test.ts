import { test, describe } from 'node:test'
import assert from 'node:assert'

// ----------------------------------------------------------------------------
// Test Engine & Models for User-Level Overrides & Multi-Responsibility
// ----------------------------------------------------------------------------
type PermissionAction =
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

type DataScope = 'own' | 'assigned' | 'department' | 'company'

const DEFAULT_RESPONSIBILITIES: Record<string, Record<string, Partial<Record<PermissionAction, boolean>>>> = {
  business_owner: {
    customers: { view: true, create: true, edit: true, delete: true, export: true },
    quotations: { view: true, create: true, edit: true, delete: true, approve: true, send: true, print: true },
    orders: { view: true, create: true, edit: true, delete: true, assign: true, complete: true, cancel: true, print: true },
    design: { view: true, create: true, edit: true, send: true, download: true, approve: true },
    invoices: { view: true, create: true, edit: true, delete: true, approve: true, cancel: true, print: true, download: true, send: true },
    payments: { view: true, create: true, edit: true, delete: true, print: true },
    production: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    delivery: { view: true, create: true, edit: true, assign: true, complete: true, cancel: true },
    inventory: { view: true, create: true, edit: true, approve: true },
    reports: { view: true, export: true },
    settings: { view: true, edit: true, manage: true },
    tasks: { view: true, complete: true },
  },

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
  },
}

interface TestUserContext {
  userId: string
  role?: string
  responsibilities: string[]
  overrides?: Record<string, boolean>
  data_scopes?: Record<string, DataScope>
  department?: string
  branch_id?: string
  isOwner?: boolean
}

function calculateEffectivePermission(
  user: TestUserContext,
  module: string,
  action: PermissionAction
): { isGranted: boolean; source: string } {
  const code = `${module}.${action}`
  const overrides = user.overrides || {}

  // 1. Explicit User Deny (Highest priority)
  if (overrides[code] === false) {
    return { isGranted: false, source: 'override_deny' }
  }

  // 2. Explicit User Allow
  if (overrides[code] === true) {
    return { isGranted: true, source: 'override_allow' }
  }

  // Business Owner full access
  if (user.isOwner || user.role === 'owner' || user.responsibilities.includes('business_owner')) {
    return { isGranted: true, source: 'owner' }
  }

  // 3. Inherited from Responsibilities
  for (const resp of user.responsibilities) {
    const matrix = DEFAULT_RESPONSIBILITIES[resp]
    if (matrix && matrix[module]?.[action]) {
      return { isGranted: true, source: `inherited_${resp}` }
    }
  }

  // 4. Fallback Default Deny
  return { isGranted: false, source: 'default_deny' }
}

function checkDataScope(
  userScope: DataScope,
  ctx: {
    userId: string
    userDepartment?: string
    userBranchId?: string
    recordOwnerId?: string
    recordAssigneeId?: string
    recordDepartment?: string
    recordBranchId?: string
    isOwnerOrAdmin?: boolean
  }
): boolean {
  if (ctx.isOwnerOrAdmin) return true

  if (ctx.userBranchId && ctx.recordBranchId && ctx.userBranchId !== ctx.recordBranchId) {
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

// ----------------------------------------------------------------------------
// Test Suite Execution
// ----------------------------------------------------------------------------
describe('User-Level Permissions & Multi-Responsibility System Tests', () => {
  // 1. Multi-Responsibility Inheritance
  test('1. Multi-Responsibility: Rahim (Designer + Salesperson) gets combined union of permissions', () => {
    const rahim: TestUserContext = {
      userId: 'usr-rahim',
      role: 'designer',
      responsibilities: ['designer', 'sales_manager'],
      overrides: {},
    }

    assert.strictEqual(
      calculateEffectivePermission(rahim, 'design', 'create').isGranted,
      true,
      'Rahim should create designs'
    )
    assert.strictEqual(
      calculateEffectivePermission(rahim, 'orders', 'edit').isGranted,
      true,
      'Rahim should edit orders'
    )
    assert.strictEqual(
      calculateEffectivePermission(rahim, 'quotations', 'create').isGranted,
      true,
      'Rahim should create quotations'
    )
    assert.strictEqual(
      calculateEffectivePermission(rahim, 'invoices', 'create').isGranted,
      true,
      'Rahim should create invoices'
    )
    assert.strictEqual(
      calculateEffectivePermission(rahim, 'customers', 'export').isGranted,
      true,
      'Rahim should export customers'
    )
    assert.strictEqual(
      calculateEffectivePermission(rahim, 'settings', 'manage').isGranted,
      false,
      'Rahim should NOT manage company settings'
    )
  })

  // 2. Precedence Rules
  describe('2. User-Specific Overrides Precedence Rule', () => {
    test('Rule 1: Explicit User Deny (false) overrides Responsibility Allow', () => {
      const karimRestricted: TestUserContext = {
        userId: 'usr-karim',
        role: 'manager',
        responsibilities: ['sales_manager'],
        overrides: {
          'invoices.cancel': false, // Denied by owner
        },
      }

      const res = calculateEffectivePermission(karimRestricted, 'invoices', 'cancel')
      assert.strictEqual(res.isGranted, false)
      assert.strictEqual(res.source, 'override_deny')
    })

    test('Rule 2: Explicit User Allow (true) overrides Responsibility Deny / Absence', () => {
      const tanvirDesigner: TestUserContext = {
        userId: 'usr-tanvir',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {
          'invoices.print': true, // Granted by owner
        },
      }

      const res = calculateEffectivePermission(tanvirDesigner, 'invoices', 'print')
      assert.strictEqual(res.isGranted, true)
      assert.strictEqual(res.source, 'override_allow')
    })

    test('Rule 3: Responsibility Allow applies when no override exists', () => {
      const stdDesigner: TestUserContext = {
        userId: 'usr-designer-std',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {},
      }

      const res = calculateEffectivePermission(stdDesigner, 'design', 'approve')
      assert.strictEqual(res.isGranted, true)
      assert.strictEqual(res.source, 'inherited_designer')
    })

    test('Rule 4: Default Deny applies when neither responsibility nor override allows', () => {
      const stdOperator: TestUserContext = {
        userId: 'usr-operator-01',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
      }

      const res = calculateEffectivePermission(stdOperator, 'invoices', 'create')
      assert.strictEqual(res.isGranted, false)
      assert.strictEqual(res.source, 'default_deny')
    })
  })

  // 3. Separation of Duties
  describe('3. Separation of Duties across Personas', () => {
    test('Designer Persona cannot create invoices, approve discounts, or delete customers', () => {
      const designer: TestUserContext = {
        userId: 'usr-006',
        role: 'designer',
        responsibilities: ['designer'],
        overrides: {},
      }

      assert.strictEqual(calculateEffectivePermission(designer, 'orders', 'view').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(designer, 'design', 'create').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(designer, 'invoices', 'create').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(designer, 'payments', 'create').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(designer, 'quotations', 'approve').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(designer, 'customers', 'delete').isGranted, false)
    })

    test('Machine Operator Persona cannot edit pricing, delete records, or access billing', () => {
      const operator: TestUserContext = {
        userId: 'usr-003',
        role: 'operator',
        responsibilities: ['operator'],
        overrides: {},
      }

      assert.strictEqual(calculateEffectivePermission(operator, 'production', 'view').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(operator, 'production', 'complete').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(operator, 'invoices', 'view').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(operator, 'quotations', 'create').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(operator, 'customers', 'delete').isGranted, false)
    })

    test('Store Manager Persona can manage inventory but not modify invoices', () => {
      const storeMgr: TestUserContext = {
        userId: 'usr-store-01',
        role: 'store_manager',
        responsibilities: ['store_manager'],
        overrides: {},
      }

      assert.strictEqual(calculateEffectivePermission(storeMgr, 'inventory', 'view').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(storeMgr, 'inventory', 'create').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(storeMgr, 'inventory', 'approve').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(storeMgr, 'invoices', 'create').isGranted, false)
    })

    test('Delivery Coordinator Persona can dispatch deliveries but not touch production or invoices', () => {
      const deliveryUser: TestUserContext = {
        userId: 'usr-008',
        role: 'installer',
        responsibilities: ['delivery_coordinator'],
        overrides: {},
      }

      assert.strictEqual(calculateEffectivePermission(deliveryUser, 'delivery', 'view').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(deliveryUser, 'delivery', 'assign').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(deliveryUser, 'delivery', 'complete').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(deliveryUser, 'production', 'edit').isGranted, false)
      assert.strictEqual(calculateEffectivePermission(deliveryUser, 'invoices', 'create').isGranted, false)
    })

    test('Business Owner Persona has universal full control by default', () => {
      const owner: TestUserContext = {
        userId: 'usr-001',
        role: 'owner',
        responsibilities: ['business_owner'],
        isOwner: true,
        overrides: {},
      }

      assert.strictEqual(calculateEffectivePermission(owner, 'invoices', 'create').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(owner, 'invoices', 'approve').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(owner, 'invoices', 'cancel').isGranted, true)
      assert.strictEqual(calculateEffectivePermission(owner, 'settings', 'manage').isGranted, true)
    })
  })

  // 4. Data Scope Hierarchy
  describe('4. Data Scope Hierarchy & Record Evaluation', () => {
    test('Scope: Own - User can only access records created by themselves', () => {
      const ctx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-006',
      }
      assert.strictEqual(checkDataScope('own', ctx), true)

      const foreignCtx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-002',
      }
      assert.strictEqual(checkDataScope('own', foreignCtx), false)
    })

    test('Scope: Assigned - User can access assigned or own records', () => {
      const assignedCtx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-002',
        recordAssigneeId: 'usr-006',
      }
      assert.strictEqual(checkDataScope('assigned', assignedCtx), true)

      const unassignedCtx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-002',
        recordAssigneeId: 'usr-003',
      }
      assert.strictEqual(checkDataScope('assigned', unassignedCtx), false)
    })

    test('Scope: Department - User can access department records', () => {
      const deptCtx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-004',
        recordDepartment: 'Pre-Press',
      }
      assert.strictEqual(checkDataScope('department', deptCtx), true)

      const otherDeptCtx = {
        userId: 'usr-006',
        userDepartment: 'Pre-Press',
        recordOwnerId: 'usr-007',
        recordDepartment: 'Finance & Accounts',
      }
      assert.strictEqual(checkDataScope('department', otherDeptCtx), false)
    })

    test('Scope: Company - Full company access with branch isolation verification', () => {
      const companyCtx = {
        userId: 'usr-002',
        userBranchId: 'br-001',
        recordBranchId: 'br-001',
      }
      assert.strictEqual(checkDataScope('company', companyCtx), true)

      const crossBranchCtx = {
        userId: 'usr-003',
        userBranchId: 'br-002',
        recordBranchId: 'br-001',
        isOwnerOrAdmin: false,
      }
      assert.strictEqual(
        checkDataScope('company', crossBranchCtx),
        false,
        'Factory Operator cannot access Central Head Office records'
      )
    })
  })
})
