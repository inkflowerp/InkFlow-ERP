import { test, describe } from 'node:test'
import assert from 'node:assert'
import { evaluateDataScopeAccess } from '../../lib/auth/rbac.server.ts'

describe('Server-Side RBAC & Data Scope Enforcement Tests (V9.1)', () => {
  const actorOwner = {
    userId: 'usr-owner',
    primaryRole: 'business_owner',
    responsibilities: ['business_owner'],
    branchId: 'branch-1',
    department: 'management',
  }

  const actorDesigner = {
    userId: 'usr-designer-1',
    primaryRole: 'designer',
    responsibilities: ['designer'],
    branchId: 'branch-1',
    department: 'prepress',
  }

  const actorOperator = {
    userId: 'usr-operator-2',
    primaryRole: 'operator',
    responsibilities: ['operator'],
    branchId: 'branch-2',
    department: 'floor',
  }

  test('1. Business Owner has universal scope across all branches and records', () => {
    const resourceOtherBranch = {
      created_by: 'usr-someone-else',
      assigned_to: 'usr-other',
      branch_id: 'branch-99',
      department: 'accounting',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(actorOwner, resourceOtherBranch, 'branch'),
      true,
      'Owner must bypass restrictive branch scoping'
    )
    assert.strictEqual(
      evaluateDataScopeAccess(actorOwner, resourceOtherBranch, 'own'),
      true,
      'Owner must have company-wide access'
    )
  })

  test('2. Designer with "assigned" scope can only access their own or assigned jobs', () => {
    const assignedJob = {
      created_by: 'usr-sales-1',
      assigned_to: 'usr-designer-1',
      branch_id: 'branch-1',
    }

    const unassignedJob = {
      created_by: 'usr-sales-1',
      assigned_to: 'usr-designer-99',
      branch_id: 'branch-1',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(actorDesigner, assignedJob, 'assigned'),
      true,
      'Designer must access jobs assigned to them'
    )

    assert.strictEqual(
      evaluateDataScopeAccess(actorDesigner, unassignedJob, 'assigned'),
      false,
      'Designer must be blocked from unassigned jobs under assigned scope'
    )
  })

  test('3. Operator with "branch" scope is restricted to their assigned branch', () => {
    const sameBranchJob = {
      created_by: 'usr-sales-2',
      branch_id: 'branch-2',
    }

    const otherBranchJob = {
      created_by: 'usr-sales-1',
      branch_id: 'branch-1',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(actorOperator, sameBranchJob, 'branch'),
      true,
      'Operator can access records belonging to their branch'
    )

    assert.strictEqual(
      evaluateDataScopeAccess(actorOperator, otherBranchJob, 'branch'),
      false,
      'Operator cannot access records of another branch'
    )
  })

  test('4. "department" scope enforces department boundary matches', () => {
    const prepressResource = {
      created_by: 'usr-staff',
      department: 'prepress',
    }

    const floorResource = {
      created_by: 'usr-staff',
      department: 'floor',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(actorDesigner, prepressResource, 'department'),
      true,
      'Matches prepress department'
    )

    assert.strictEqual(
      evaluateDataScopeAccess(actorDesigner, floorResource, 'department'),
      false,
      'Blocks cross-department access'
    )
  })
})
