import { describe, it } from 'node:test'
import assert from 'node:assert'
import { hasBranchAccess } from '../../lib/auth/tenant-auth.ts'
import { TenantRepository } from '../../lib/repositories/tenant.repository.ts'
import { checkPermission } from '../../lib/auth/rbac.client.ts'

describe('Security Attack Tests: Tenant & Branch Isolation', () => {
  it('1. Branch Isolation Attack: Denies branch user access to a different branch', () => {
    const userBranchId = 'branch-dhaka-north-uuid'
    const targetBranchId = 'branch-chittagong-main-uuid'

    const isAllowed = hasBranchAccess(userBranchId, targetBranchId, false)
    assert.strictEqual(isAllowed, false, 'Branch user must not access another branch resources')
  })

  it('2. Branch Isolation Attack: Denies unassigned branch user access to branch-scoped resources', () => {
    const userBranchId = null // User has no assigned branch
    const targetBranchId = 'branch-dhaka-north-uuid'

    const isAllowed = hasBranchAccess(userBranchId, targetBranchId, false)
    assert.strictEqual(isAllowed, false, 'Unassigned branch user must fail closed on branch-scoped resources')
  })

  it('3. Branch Isolation: Allows company owner or admin to access all branches', () => {
    const userBranchId = 'branch-dhaka-north-uuid'
    const targetBranchId = 'branch-chittagong-main-uuid'

    const isAllowed = hasBranchAccess(userBranchId, targetBranchId, true)
    assert.strictEqual(isAllowed, true, 'Business owner/admin must have company-wide branch access')
  })

  it('4. RBAC Attack: Denies general_staff from performing financial deletions or owner operations', () => {
    const staffContext = {
      userId: 'usr-staff-123',
      role: 'general_staff' as any,
      primaryRole: 'general_staff' as any,
      responsibilities: ['general_staff'],
      overrides: {},
    }

    assert.strictEqual(checkPermission(staffContext, 'invoices.delete'), false)
    assert.strictEqual(checkPermission(staffContext, 'payments.delete'), false)
    assert.strictEqual(checkPermission(staffContext, 'settings.manage'), false)
    assert.strictEqual(checkPermission(staffContext, 'billing.manage'), false)
    assert.strictEqual(checkPermission(staffContext, 'users.manage'), false)
  })

  it('5. RBAC Attack: Explicit deny override overrides responsibility permission', () => {
    const salesContext = {
      userId: 'usr-sales-123',
      role: 'sales_executive' as any,
      primaryRole: 'sales_executive' as any,
      responsibilities: ['sales_executive'],
      overrides: {
        'quotations.delete': false, // Explicit deny override
      },
    }

    // By default sales_executive might edit/view, but quotations.delete must be denied
    assert.strictEqual(checkPermission(salesContext, 'quotations.delete'), false)
  })

  it('6. Tenant Isolation: Unknown or mismatched tenant slug/id fails closed', async () => {
    const result = await TenantRepository.resolveUserMembership('non-existent-user-uuid', 'unknown-slug')
    assert.strictEqual(result, null, 'Unregistered user membership must fail closed and return null')
  })
})
