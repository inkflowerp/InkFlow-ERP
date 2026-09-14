import { test, describe } from 'node:test'
import assert from 'node:assert'
import { evaluateDataScopeAccess } from '../../lib/auth/rbac.server.ts'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'

describe('Finance 360 - Security, Scope & Tenant Isolation Tests (V9.1)', () => {
  test('1. Data Scope: Branch Manager only accesses own branch financial records', () => {
    const branchManager = {
      userId: 'user-bm-1',
      branchId: 'branch-dhanmondi',
      department: 'Finance',
      primaryRole: 'branch_manager',
      responsibilities: ['branch_manager'],
    }

    const sameBranchRecord = {
      branch_id: 'branch-dhanmondi',
      created_by: 'user-operator-1',
    }

    const otherBranchRecord = {
      branch_id: 'branch-chittagong',
      created_by: 'user-operator-2',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(branchManager, sameBranchRecord, 'branch'),
      true
    )
    assert.strictEqual(
      evaluateDataScopeAccess(branchManager, otherBranchRecord, 'branch'),
      false
    )
  })

  test('2. Data Scope: Business Owner has universal scope access across all branches', () => {
    const owner = {
      userId: 'user-owner-1',
      branchId: null,
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
    }

    const anyBranchRecord = {
      branch_id: 'branch-uttara',
      created_by: 'user-cashier-3',
    }

    assert.strictEqual(
      evaluateDataScopeAccess(owner, anyBranchRecord, 'company'),
      true
    )
    assert.strictEqual(
      evaluateDataScopeAccess(owner, anyBranchRecord, 'branch'),
      true
    )
  })

  test('3. Tenant Isolation: Accounts and transactions from Company A never bleed into Company B', async () => {
    const compA = 'co-tenant-alpha-v9'
    const compB = 'co-tenant-beta-v9'

    await FinanceRepository.seedDefaultAccounts(compA)
    await FinanceRepository.seedDefaultAccounts(compB)

    const accsA = await FinanceRepository.getAccounts(compA)
    const accsB = await FinanceRepository.getAccounts(compB)

    assert.strictEqual(accsA.every((a) => a.company_id === compA), true)
    assert.strictEqual(accsB.every((b) => b.company_id === compB), true)
  })
})
