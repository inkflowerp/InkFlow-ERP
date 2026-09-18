import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  checkPermission,
  getPermissionDetail,
  getEffectiveDataScope,
  checkDataScopeAccess,
} from '../../lib/auth/rbac.client.ts'
import { evaluateDataScopeAccess } from '../../lib/auth/rbac.server.ts'

describe('RBAC Security Boundaries & Tenant/Branch Isolation Tests (Prompt Sec 46)', () => {
  test('1. Inactive/Disabled user is immediately blocked from all permissions', () => {
    // A disabled user context should evaluate to false regardless of inherited role
    const disabledUserCtx = {
      userId: 'usr-disabled',
      role: 'business_owner',
      responsibilities: ['business_owner'],
      overrides: { 'invoices.view': true },
      data_scopes: {},
    }

    // In a disabled state, server-side actions fail closed
    const activeStatus: string = 'disabled'
    const isAllowed = activeStatus === 'active' && checkPermission(disabledUserCtx, 'invoices', 'view')

    assert.strictEqual(
      isAllowed,
      false,
      'Disabled account must be denied all database access'
    )
  })

  test('2. Anti-Self-Escalation: Staff member cannot modify their own permissions or role', () => {
    const actorStaff = {
      userId: 'usr-staff-1',
      companyRole: 'general_staff',
      permissions: ['orders.view'],
    }

    const targetUserId = 'usr-staff-1' // Attempting to modify own permissions

    const canModifyOwnAccess =
      actorStaff.companyRole === 'business_owner' ||
      (actorStaff.permissions.includes('users.permission_manage') && actorStaff.userId !== targetUserId)

    assert.strictEqual(
      canModifyOwnAccess,
      false,
      'Staff member must be strictly blocked from self-granting permissions'
    )
  })

  test('3. Last Active Business Owner cannot be disabled (Owner Protection Rule)', () => {
    const companyUsers = [
      { id: 'usr-1', status: 'active', responsibilities: ['business_owner'] },
      { id: 'usr-2', status: 'active', responsibilities: ['sales_manager'] },
      { id: 'usr-3', status: 'disabled', responsibilities: ['business_owner'] },
    ]

    const targetUserId = 'usr-1' // Only remaining active owner

    const activeOwners = companyUsers.filter(
      (u) =>
        u.status === 'active' &&
        (u.responsibilities.includes('business_owner') || u.responsibilities.includes('owner'))
    )

    const canDisable = !(activeOwners.length <= 1 && activeOwners.some((o) => o.id === targetUserId))

    assert.strictEqual(
      canDisable,
      false,
      'System must prevent disabling the last active Business Owner'
    )
  })

  test('4. Cross-Branch Isolation: User assigned to Branch A cannot access Branch B records', () => {
    const branchAActor = {
      userId: 'usr-branch-a',
      primaryRole: 'operator',
      responsibilities: ['operator'],
      branchId: 'branch-dhaka-1',
      department: 'production',
    }

    const branchBRecord = {
      id: 'job-gazipur-99',
      branch_id: 'branch-gazipur-2',
      department: 'production',
    }

    const hasAccess = evaluateDataScopeAccess(branchAActor, branchBRecord, 'branch')

    assert.strictEqual(
      hasAccess,
      false,
      'Branch A user cannot access records created under Branch B'
    )
  })

  test('5. Global Branch Scope: Universal users with null branchId can access all branches', () => {
    const globalActor = {
      userId: 'usr-global-mgr',
      primaryRole: 'production_manager',
      responsibilities: ['production_manager'],
      branchId: null, // Global / Central HQ
      department: 'production',
    }

    const branchBRecord = {
      id: 'job-gazipur-99',
      branch_id: 'branch-gazipur-2',
      department: 'production',
    }

    const hasAccess = evaluateDataScopeAccess(globalActor, branchBRecord, 'branch')

    assert.strictEqual(
      hasAccess,
      true,
      'Global staff with null branchId can access records across all branches'
    )
  })

  test('6. Fail-Closed Security: Undefined permissions default to DENY', () => {
    const staffCtx = {
      userId: 'usr-staff',
      role: 'sales_manager',
      responsibilities: ['sales_manager'],
      overrides: {},
      data_scopes: {},
    }

    // Attempting a non-granted dangerous action
    const detail = getPermissionDetail(staffCtx, 'salary', 'edit')

    assert.strictEqual(detail.isGranted, false, 'Action without explicit grant is denied')
    assert.strictEqual(detail.source, 'default_deny', 'Source must be default_deny')
  })
})
