import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_RESPONSIBILITY_MATRICES,
  DEFAULT_ROLE_MATRICES,
  checkPermission,
} from '../../lib/auth/rbac.client.ts'

describe('Hide Branches from Employee - Perimeter & Access Control', () => {
  describe('1. Employee RBAC Responsibility Matrices - Zero Branches Permission', () => {
    const employeeRoles = [
      'operator',
      'designer',
      'sales_manager',
      'production_manager',
      'store_manager',
      'accountant',
      'delivery_coordinator',
      'general_staff',
      'branch_manager',
    ] as const

    for (const role of employeeRoles) {
      test(`1.1 Responsibility role "${role}" has empty branches permissions (cannot view, edit, or manage branches)`, () => {
        const matrix = DEFAULT_RESPONSIBILITY_MATRICES[role]
        assert.ok(matrix, `Matrix must be defined for role ${role}`)
        assert.deepEqual(
          matrix.branches,
          {},
          `Employee role "${role}" must have empty branches permission {}, but got: ${JSON.stringify(matrix.branches)}`
        )
      })
    }

    test('1.2 Business Owner retains full branches view, create, edit, delete, and manage permissions', () => {
      const ownerMatrix = DEFAULT_RESPONSIBILITY_MATRICES.business_owner
      assert.ok(ownerMatrix, 'Owner matrix must be defined')
      assert.equal(ownerMatrix.branches.view, true)
      assert.equal(ownerMatrix.branches.create, true)
      assert.equal(ownerMatrix.branches.edit, true)
      assert.equal(ownerMatrix.branches.manage, true)
    })
  })

  describe('2. Legacy Role Matrix Sync - Zero Branches Permission for Employees', () => {
    const employeePrimaryRoles = [
      'operator',
      'designer',
      'sales_manager',
      'production_manager',
      'general_staff',
      'branch_manager',
    ] as const

    for (const role of employeePrimaryRoles) {
      test(`2.1 Primary role "${role}" has all branches actions set to false in DEFAULT_ROLE_MATRICES`, () => {
        const roleMatrix = DEFAULT_ROLE_MATRICES[role]
        assert.ok(roleMatrix, `Role matrix must be defined for ${role}`)
        const branchPermissions = roleMatrix.branches
        assert.ok(branchPermissions, `branches must be defined in role matrix for ${role}`)
        assert.equal(branchPermissions.view, false, `branches.view must be false for ${role}`)
        assert.equal(branchPermissions.create, false, `branches.create must be false for ${role}`)
        assert.equal(branchPermissions.edit, false, `branches.edit must be false for ${role}`)
        assert.equal(branchPermissions.delete, false, `branches.delete must be false for ${role}`)
        assert.equal(branchPermissions.manage, false, `branches.manage must be false for ${role}`)
      })
    }
  })

  describe('3. Runtime RBAC Permission Check Evaluation', () => {
    test('3.1 checkPermission returns false for all employee personas trying to access branches', () => {
      const employeePersonas = [
        { role: 'operator', title: 'Machine Operator' },
        { role: 'designer', title: 'Prepress Graphic Designer' },
        { role: 'sales_manager', title: 'Counter Sales Executive' },
        { role: 'production_manager', title: 'Production Floor Lead' },
        { role: 'store_manager', title: 'Material Inventory Clerk' },
        { role: 'accountant', title: 'Senior Billing Accountant' },
        { role: 'delivery_coordinator', title: 'Challan & Dispatch Staff' },
        { role: 'branch_manager', title: 'Dhanmondi Branch Manager' },
      ]

      for (const persona of employeePersonas) {
        const ctx: UserPermissionContext = {
          role: persona.role,
          isOwner: false,
          responsibilities: [persona.role],
          permissions: [],
        }

        assert.equal(
          checkPermission(ctx, 'branches.view'),
          false,
          `Employee persona "${persona.title}" must NOT be able to view branches`
        )
        assert.equal(
          checkPermission(ctx, 'branches.manage'),
          false,
          `Employee persona "${persona.title}" must NOT be able to manage branches`
        )
        assert.equal(
          checkPermission(ctx, 'branches.create'),
          false,
          `Employee persona "${persona.title}" must NOT be able to create branches`
        )
        assert.equal(
          checkPermission(ctx, 'branches.edit'),
          false,
          `Employee persona "${persona.title}" must NOT be able to edit branches`
        )
      }
    })

    test('3.2 checkPermission returns true only for Business Owner', () => {
      const ownerCtx: UserPermissionContext = {
        role: 'business_owner',
        isOwner: true,
        responsibilities: ['business_owner'],
        permissions: ['*'],
      }

      assert.equal(checkPermission(ownerCtx, 'branches.view'), true)
      assert.equal(checkPermission(ownerCtx, 'branches.manage'), true)
      assert.equal(checkPermission(ownerCtx, 'branches.create'), true)
    })
  })
})
