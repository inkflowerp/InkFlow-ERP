import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  checkDataScopeAccess,
  type ScopeCheckContext,
} from '../../lib/auth/rbac.client.ts'
import type { DataScope } from '../../types/rbac.types.ts'

describe('Multi-Branch RBAC & Server-Authoritative Data Scopes (V9)', () => {
  const userA = 'usr-001'
  const branchHQ = 'br-hq-01'
  const branchGazipur = 'br-gaz-02'
  const branchChattogram = 'br-ctg-03'

  test('1. "branch" scope allows access to records in user branch and denies other branches', () => {
    const scope: DataScope = 'branch'

    // Record in same branch
    const sameBranchCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordBranchId: branchHQ,
    }
    assert.strictEqual(
      checkDataScopeAccess(scope, sameBranchCtx),
      true,
      'Should permit record in same branch'
    )

    // Record in another branch
    const otherBranchCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordBranchId: branchGazipur,
    }
    assert.strictEqual(
      checkDataScopeAccess(scope, otherBranchCtx),
      false,
      'Should deny record in foreign branch'
    )
  })

  test('2. "selected_branches" scope allows only authorized branch subset and denies others', () => {
    const scope: DataScope = 'selected_branches'

    const authorizedCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      userAuthorizedBranchIds: [branchHQ, branchGazipur],
      recordBranchId: branchGazipur,
    }
    assert.strictEqual(
      checkDataScopeAccess(scope, authorizedCtx),
      true,
      'Should allow access to Gazipur branch because it is in authorized list'
    )

    const unauthorizedCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      userAuthorizedBranchIds: [branchHQ, branchGazipur],
      recordBranchId: branchChattogram,
    }
    assert.strictEqual(
      checkDataScopeAccess(scope, unauthorizedCtx),
      false,
      'Should deny access to Chattogram branch because it is not in authorized list'
    )
  })

  test('3. "all_branches" and "company" scopes allow access across all company branches', () => {
    const scopeAll: DataScope = 'all_branches'
    const scopeCompany: DataScope = 'company'

    const crossBranchCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordBranchId: branchChattogram,
    }

    assert.strictEqual(
      checkDataScopeAccess(scopeAll, crossBranchCtx),
      true,
      'all_branches scope should permit cross-branch access'
    )
    assert.strictEqual(
      checkDataScopeAccess(scopeCompany, crossBranchCtx),
      true,
      'company scope should permit cross-branch access'
    )
  })

  test('4. "own" and "assigned" scopes enforce both user assignment and branch boundaries', () => {
    const ownScope: DataScope = 'own'

    // Owned record in same branch
    const validOwnCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordOwnerId: userA,
      recordBranchId: branchHQ,
    }
    assert.strictEqual(checkDataScopeAccess(ownScope, validOwnCtx), true)

    // Owned record but located in foreign restricted branch
    const foreignBranchOwnCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordOwnerId: userA,
      recordBranchId: branchGazipur,
    }
    assert.strictEqual(
      checkDataScopeAccess(ownScope, foreignBranchOwnCtx),
      false,
      'Should deny access when record is in foreign branch despite ownership'
    )
  })

  test('5. Business Owner or Administrator bypasses branch isolation checks', () => {
    const scope: DataScope = 'branch'

    const adminCtx: ScopeCheckContext = {
      userId: userA,
      userBranchId: branchHQ,
      recordBranchId: branchChattogram,
      isOwnerOrAdmin: true,
    }

    assert.strictEqual(
      checkDataScopeAccess(scope, adminCtx),
      true,
      'Owner/Admin with isOwnerOrAdmin flag should have company-wide access'
    )
  })
})
