import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  checkPermission,
  getPermissionDetail,
  getEffectiveDataScope,
  checkDataScopeAccess,
  extractResponsibilities,
  normalizeResponsibilitySlug,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '../../lib/auth/rbac.client.ts'
import { MODULE_ACTION_SPECS, type PermissionModule, type PermissionAction } from '../../types/rbac.types.ts'

describe('RBAC & Granular Permission Lifecycle Unit Tests', () => {
  it('1. Business Owner has full, unconditional permissions across all modules', () => {
    const ownerCtx = {
      userId: 'owner-1',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
    }

    assert.strictEqual(checkPermission(ownerCtx, 'invoices.delete'), true)
    assert.strictEqual(checkPermission(ownerCtx, 'payments.delete'), true)
    assert.strictEqual(checkPermission(ownerCtx, 'production.complete'), true)
    assert.strictEqual(checkPermission(ownerCtx, 'settings.edit'), true)
    assert.strictEqual(checkPermission(ownerCtx, 'users.manage'), true)

    const detail = getPermissionDetail(ownerCtx, 'invoices', 'delete')
    assert.strictEqual(detail.isGranted, true)
    assert.strictEqual(detail.source, 'owner')
  })

  it('2. Standard Operational Roles inherit correct default permissions', () => {
    // Sales Manager can create quotations and invoices, but cannot complete production stages
    const salesCtx = {
      userId: 'sales-1',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
    }
    assert.strictEqual(checkPermission(salesCtx, 'quotations.create'), true)
    assert.strictEqual(checkPermission(salesCtx, 'invoices.create'), true)
    assert.strictEqual(checkPermission(salesCtx, 'production.complete'), false)

    // Operator can complete production stages, but cannot delete invoices
    const operatorCtx = {
      userId: 'op-1',
      primaryRole: 'operator',
      responsibilities: ['operator'],
    }
    assert.strictEqual(checkPermission(operatorCtx, 'production.complete'), true)
    assert.strictEqual(checkPermission(operatorCtx, 'invoices.create'), false)
    assert.strictEqual(checkPermission(operatorCtx, 'invoices.delete'), false)
  })

  it('3. Multi-Responsibility combination merges permissions from all assigned roles', () => {
    // User is both a Designer and a Sales Manager
    const multiCtx = {
      userId: 'dual-1',
      responsibilities: ['designer', 'sales_manager'],
    }

    // From Designer: design.approve
    assert.strictEqual(checkPermission(multiCtx, 'design.approve'), true)
    // From Sales Manager: quotations.approve & invoices.create
    assert.strictEqual(checkPermission(multiCtx, 'quotations.approve'), true)
    assert.strictEqual(checkPermission(multiCtx, 'invoices.create'), true)
  })

  it('4. Explicit User Deny Override takes highest precedence over inherited roles', () => {
    // Sales Manager has invoices.create by default, but is explicitly denied on this specific account
    const deniedCtx = {
      userId: 'sales-restricted',
      responsibilities: ['sales_manager'],
      overrides: {
        'invoices.create': false,
      },
    }

    const detail = getPermissionDetail(deniedCtx, 'invoices', 'create')
    assert.strictEqual(detail.isGranted, false)
    assert.strictEqual(detail.source, 'override_deny')
    assert.strictEqual(checkPermission(deniedCtx, 'invoices.create'), false)

    // Other permissions remain inherited
    assert.strictEqual(checkPermission(deniedCtx, 'quotations.create'), true)
  })

  it('5. Explicit User Allow Override grants access even if role does not have it', () => {
    // Operator does not have pricing.view by default, but is explicitly granted it
    const elevatedOpCtx = {
      userId: 'op-elevated',
      responsibilities: ['operator'],
      overrides: {
        'pricing.view': true,
      },
    }

    const detail = getPermissionDetail(elevatedOpCtx, 'pricing', 'view')
    assert.strictEqual(detail.isGranted, true)
    assert.strictEqual(detail.source, 'override_allow')
    assert.strictEqual(checkPermission(elevatedOpCtx, 'pricing.view'), true)
  })

  it('6. Data Scoping correctly enforces record visibility bounds', () => {
    // Own scope
    const ownUser = {
      userId: 'user-a',
      department: 'Sales',
      branchId: 'branch-1',
    }

    const ownRecord = { created_by: 'user-a', branch_id: 'branch-1' }
    const otherRecord = { created_by: 'user-b', branch_id: 'branch-1' }

    assert.strictEqual(checkDataScopeAccess(ownUser, ownRecord, 'own'), true)
    assert.strictEqual(checkDataScopeAccess(ownUser, otherRecord, 'own'), false)

    // Department scope
    const deptRecordSame = { department: 'Sales', branch_id: 'branch-1' }
    const deptRecordDiff = { department: 'Production', branch_id: 'branch-1' }
    assert.strictEqual(checkDataScopeAccess(ownUser, deptRecordSame, 'department'), true)
    assert.strictEqual(checkDataScopeAccess(ownUser, deptRecordDiff, 'department'), false)

    // Branch scope
    const sameBranchRecord = { branch_id: 'branch-1' }
    const diffBranchRecord = { branch_id: 'branch-2' }
    assert.strictEqual(checkDataScopeAccess(ownUser, sameBranchRecord, 'branch'), true)
    assert.strictEqual(checkDataScopeAccess(ownUser, diffBranchRecord, 'branch'), false)

    // Multi-branch authorized scope
    const multiBranchUser = {
      userId: 'user-multi',
      branchId: 'branch-1',
      authorizedBranchIds: ['branch-1', 'branch-2'],
    }
    assert.strictEqual(checkDataScopeAccess(multiBranchUser, { branch_id: 'branch-2' }, 'selected_branches'), true)
    assert.strictEqual(checkDataScopeAccess(multiBranchUser, { branch_id: 'branch-3' }, 'selected_branches'), false)
  })

  it('7. Module-level Effective Data Scope fallback resolution', () => {
    const ownerCtx = {
      userId: 'owner-1',
      isOwner: true,
      data_scopes: {},
    }
    assert.strictEqual(getEffectiveDataScope(ownerCtx, 'customers'), 'company')

    const managerCtx = {
      userId: 'mgr-1',
      responsibilities: ['sales_manager'],
      data_scopes: {},
    }
    assert.strictEqual(getEffectiveDataScope(managerCtx, 'customers'), 'company')

    const customizedScopeCtx = {
      userId: 'user-custom',
      responsibilities: ['operator'],
      data_scopes: {
        orders: 'branch',
      },
    }
    assert.strictEqual(getEffectiveDataScope(customizedScopeCtx, 'orders'), 'branch')
  })

  it('8. Responsibility slug normalization and extraction', () => {
    assert.strictEqual(normalizeResponsibilitySlug('owner'), 'business_owner')
    assert.strictEqual(normalizeResponsibilitySlug('graphic_designer'), 'designer')
    assert.strictEqual(normalizeResponsibilitySlug('inventory_manager'), 'store_manager')
    assert.strictEqual(normalizeResponsibilitySlug('unknown_role'), 'general_staff')

    const resps = extractResponsibilities({
      responsibilities: ['sales', 'inventory_manager'],
    })
    assert.deepStrictEqual(resps, ['sales_manager', 'store_manager'])
  })
})
