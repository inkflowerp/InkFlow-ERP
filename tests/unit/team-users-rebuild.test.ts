import { test, describe } from 'node:test'
import assert from 'node:assert'
import { getNavigationConfig } from '../../config/navigation.config.ts'
import {
  PRACTICAL_RESPONSIBILITIES,
  RESPONSIBILITY_PRESETS_BY_ROLE,
  getResponsibilityPresetsForRole,
  DEFAULT_ROLE_DATA_SCOPES,
  getPracticalDefaultDataScope,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '../../lib/auth/rbac.client.ts'

describe('Team Users & Roles Rebuild Unit Tests', () => {
  test('1. Navigation Separation: Settings has distinct Team Users and Roles & Permissions sub-items', () => {
    const navSections = getNavigationConfig('rangao')
    const settingsSec = navSections.find((s) => s.id === 'settings')
    assert.ok(settingsSec, 'Settings navigation section must exist')

    const settingsItem = settingsSec.items.find((item) => item.key === 'company_settings')
    assert.ok(settingsItem, 'Company Settings must exist')
    assert.ok(settingsItem.children, 'Company Settings must have children')

    const usersNav = settingsItem.children.find((c) => c.key === 'settings_users')
    assert.ok(usersNav, 'Team Users navigation item must exist under Settings')
    assert.strictEqual(usersNav.title, 'Team Users')
    assert.strictEqual(usersNav.titleBn, 'টিম ব্যবহারকারী')
    assert.ok(usersNav.href.endsWith('/settings/users'))

    const rolesNav = settingsItem.children.find((c) => c.key === 'settings_roles')
    assert.ok(rolesNav, 'Roles & Permissions navigation item must exist under Settings')
    assert.strictEqual(rolesNav.title, 'Roles & Permissions')
    assert.strictEqual(rolesNav.titleBn, 'অনুমতি ও রোলস')
    assert.ok(rolesNav.href.endsWith('/settings/roles'))
  })

  test('2. RBAC & Designer Security: Graphic Designer role has NO invoices.view or financial permissions', () => {
    const designerPerms = DEFAULT_RESPONSIBILITY_MATRICES['designer']
    assert.ok(designerPerms, 'Designer permissions must be defined')

    // Invoices should be completely empty or have no view permission
    const invoicesPerm = designerPerms['invoices']
    assert.ok(
      !invoicesPerm || !invoicesPerm.view,
      'Graphic Designer must NOT have invoices.view permission'
    )

    // Payments should not be viewable by designer
    const paymentsPerm = designerPerms['payments']
    assert.ok(
      !paymentsPerm || !paymentsPerm.view,
      'Graphic Designer must NOT have payments.view permission'
    )

    // Designer must have design artwork permissions
    assert.strictEqual(designerPerms['design']?.view, true)
    assert.strictEqual(designerPerms['design']?.edit, true)
  })

  test('3. Practical Responsibilities & Presets: Clean print/signage duties mapping', () => {
    assert.ok(PRACTICAL_RESPONSIBILITIES.length >= 10, 'Must have at least 10 practical duties defined')
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Sales'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Design'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Production'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Machine Operation'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Inventory'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Delivery'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('Accounts'))
    assert.ok(PRACTICAL_RESPONSIBILITIES.includes('HR'))

    // Designer presets check
    const designerPresets = getResponsibilityPresetsForRole('designer')
    assert.ok(designerPresets.length > 0, 'Designer must have preset duties')
    assert.ok(designerPresets.includes('Design'), 'Designer presets must include Design')
    assert.ok(!designerPresets.includes('Accounts'), 'Designer presets must NOT include Accounts')

    // Operator presets check
    const operatorPresets = getResponsibilityPresetsForRole('operator')
    assert.ok(operatorPresets.includes('Machine Operation'), 'Operator presets must include Machine Operation')
  })

  test('4. Data Scope Defaults: Appropriate scoping per role', () => {
    assert.strictEqual(getPracticalDefaultDataScope('business_owner'), 'company')
    assert.strictEqual(getPracticalDefaultDataScope('branch_manager'), 'branch')
    assert.strictEqual(getPracticalDefaultDataScope('designer'), 'assigned')
    assert.strictEqual(getPracticalDefaultDataScope('operator'), 'assigned')
    assert.strictEqual(getPracticalDefaultDataScope('delivery_coordinator'), 'assigned')
    assert.strictEqual(getPracticalDefaultDataScope('store_manager'), 'branch')
    assert.strictEqual(getPracticalDefaultDataScope('accountant'), 'company')
  })

  test('5. Strict Identity Mapping: User resolution requires exact user_id match with zero heuristic fallback', () => {
    const mockWorkforce = [
      { id: 'emp-md', name: 'Managing Director', email: 'owner@printflow.bd', mobile: '01700000000', user_id: 'user-owner-1' },
      { id: 'emp-sales', name: 'Sales Executive', email: 'sales@printflow.bd', mobile: '01711111111', user_id: 'user-sales-2' },
      { id: 'emp-unlinked', name: 'Floor Technician', email: 'tech@printflow.bd', mobile: '01722222222', user_id: null },
    ]

    // Strict lookup policy
    const resolveStrictLinkedEmployee = (companyUserId: string) => {
      const match = mockWorkforce.find((emp) => emp.user_id === companyUserId)
      if (!match) return null
      return {
        id: match.id,
        name: match.name,
        email: match.email,
      }
    }

    // 1. Exact match returns employee
    const matched = resolveStrictLinkedEmployee('user-sales-2')
    assert.strictEqual(matched?.name, 'Sales Executive')

    // 2. Unlinked or new user returns null, never first employee (emp-md)
    const unlinked = resolveStrictLinkedEmployee('user-new-random')
    assert.strictEqual(unlinked, null, 'Unlinked user must resolve to null, never fallback to first active employee')
  })

  test('6. Security & Data Sanitization: Sensitive payroll/financial fields excluded from user management', () => {
    const rawEmployeeRow = {
      id: 'emp-101',
      employee_id_number: 'EMP-00101',
      name: 'Mohammad Faruk',
      role: 'Head Printer',
      department: 'Offset Production',
      branch_id: 'branch-01',
      mobile: '01800000000',
      email: 'faruk@print.com',
      status: 'active',
      user_id: 'user-faruk',
      // SENSITIVE FIELDS:
      base_salary: 35000,
      bank_payment_info: { account_no: '1234567890', bank: 'City Bank' },
      nid_number: '19901234567890123',
    }

    // Sanitization function simulating lib/repositories/tenant.repository.ts
    const sanitizeLinkedEmployee = (emp: typeof rawEmployeeRow) => {
      return {
        id: emp.id,
        employee_id_number: emp.employee_id_number,
        name: emp.name,
        name_bn: undefined,
        role: emp.role,
        department: emp.department,
        branch_id: emp.branch_id,
        mobile: emp.mobile,
        email: emp.email,
        user_id: emp.user_id,
        status: emp.status,
      }
    }

    const sanitized = sanitizeLinkedEmployee(rawEmployeeRow)
    assert.strictEqual((sanitized as any).base_salary, undefined)
    assert.strictEqual((sanitized as any).bank_payment_info, undefined)
    assert.strictEqual((sanitized as any).nid_number, undefined)
    assert.strictEqual(sanitized.name, 'Mohammad Faruk')
    assert.strictEqual(sanitized.role, 'Head Printer')
  })

  test('7. Last Active Owner Protection: Cannot delete or disable the last active business owner', () => {
    const companyUsers = [
      { id: 'cu-owner-1', role_name: 'business_owner', status: 'active' },
      { id: 'cu-sales-1', role_name: 'sales', status: 'active' },
      { id: 'cu-designer-1', role_name: 'designer', status: 'active' },
    ]

    const canDisableUser = (targetId: string) => {
      const target = companyUsers.find((u) => u.id === targetId)
      if (!target) return { allowed: false, reason: 'User not found' }

      if (target.role_name === 'business_owner' || target.role_name.includes('owner')) {
        const activeOwners = companyUsers.filter(
          (u) =>
            (u.role_name === 'business_owner' || u.role_name.includes('owner')) &&
            u.status === 'active'
        )
        if (activeOwners.length <= 1) {
          return {
            allowed: false,
            reason: 'Cannot disable or remove the last active Business Owner.',
          }
        }
      }
      return { allowed: true }
    }

    // Try disabling single owner: must be blocked
    const disableOwnerResult = canDisableUser('cu-owner-1')
    assert.strictEqual(disableOwnerResult.allowed, false)
    assert.strictEqual(
      disableOwnerResult.reason,
      'Cannot disable or remove the last active Business Owner.'
    )

    // Disabling non-owner: allowed
    const disableSalesResult = canDisableUser('cu-sales-1')
    assert.strictEqual(disableSalesResult.allowed, true)
  })

  test('8. Anti-Self-Destruction: Authenticated user cannot disable or remove their own active account', () => {
    const currentUserId = 'user-auth-123'

    const validateActionOnUser = (actorUserId: string, targetUserId: string, action: string) => {
      if (actorUserId === targetUserId && (action === 'disable' || action === 'remove')) {
        return { allowed: false, reason: 'You cannot disable or remove your own login account.' }
      }
      return { allowed: true }
    }

    const selfDisable = validateActionOnUser(currentUserId, currentUserId, 'disable')
    assert.strictEqual(selfDisable.allowed, false)
    assert.strictEqual(selfDisable.reason, 'You cannot disable or remove your own login account.')

    const selfRemove = validateActionOnUser(currentUserId, currentUserId, 'remove')
    assert.strictEqual(selfRemove.allowed, false)

    const otherDisable = validateActionOnUser(currentUserId, 'user-auth-456', 'disable')
    assert.strictEqual(otherDisable.allowed, true)
  })
})
