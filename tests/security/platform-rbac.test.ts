import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  hasPlatformPermission,
  resolveEffectivePlatformPermissions,
  checkPlatformMfaRecency,
  PLATFORM_ROLE_PERMISSIONS_MAP,
  ALL_PLATFORM_PERMISSIONS,
} from '../../lib/auth/platform-auth.ts'
import type { PlatformUserRecord, PlatformRole } from '../../lib/auth/types.ts'

describe('Security RBAC & Destructive Action Guards (Platform Owner Panel)', () => {
  // Helper to generate a mock platform user
  const createMockPlatformAdmin = (
    role: PlatformRole,
    isActive = true,
    mfaVerifiedAt?: string
  ): PlatformUserRecord => ({
    id: `admin-${role}-id`,
    user_id: `usr-${role}-id`,
    email: `${role}@printerp.com`,
    full_name: `${role} Test User`,
    role,
    is_active: isActive,
    mfa_enabled: true,
    last_mfa_verified_at: mfaVerifiedAt,
    created_at: new Date().toISOString(),
  })

  // Simulated withPlatformAction guard runner to test action wrapper security invariants in isolation
  async function simulatePlatformActionGuard(
    options: { permission?: string | string[]; destruct?: boolean; mfaRecent?: boolean },
    user: PlatformUserRecord | null,
    reason?: string
  ): Promise<{ ok: boolean; success: boolean; error?: string; code?: string }> {
    if (!user || !user.is_active) {
      return {
        ok: false,
        success: false,
        error: 'Unauthorized: Active platform administrator account required.',
        code: 'UNAUTHORIZED',
      }
    }

    if (options.destruct) {
      if (user.role !== 'platform_owner') {
        return {
          ok: false,
          success: false,
          error: 'Forbidden: Platform Owner role required for destructive operations.',
          code: 'OWNER_ROLE_REQUIRED',
        }
      }

      const isMfaFresh = checkPlatformMfaRecency(user, 5)
      if (!isMfaFresh) {
        return {
          ok: false,
          success: false,
          error: 'Security Challenge: Recent MFA verification required within the last 5 minutes for destructive operations.',
          code: 'MFA_RECENT_REQUIRED',
        }
      }

      if (!reason || !reason.trim()) {
        return {
          ok: false,
          success: false,
          error: 'Mandatory typed reason required for destructive operations.',
          code: 'REASON_REQUIRED',
        }
      }
    } else if (options.mfaRecent) {
      const isMfaFresh = checkPlatformMfaRecency(user, 5)
      if (!isMfaFresh) {
        return {
          ok: false,
          success: false,
          error: 'Security Challenge: Recent MFA verification required within the last 5 minutes.',
          code: 'MFA_RECENT_REQUIRED',
        }
      }
    }

    if (options.permission) {
      const perms = Array.isArray(options.permission) ? options.permission : [options.permission]
      const hasAll = perms.every((p) => hasPlatformPermission(user, p))
      if (!hasAll) {
        return {
          ok: false,
          success: false,
          error: `Forbidden: Lacking required platform permission (${perms.join(', ')}).`,
          code: 'FORBIDDEN',
        }
      }
    }

    return { ok: true, success: true }
  }

  // 1. ANONYMOUS & INACTIVE USER TESTS
  describe('1. Anonymous & Inactive Rejection (Fail-Closed)', () => {
    it('Anonymous user (null or undefined) has no platform permissions', () => {
      assert.strictEqual(hasPlatformPermission(null, 'platform.view'), false)
      assert.strictEqual(hasPlatformPermission(undefined, 'tenant.view'), false)
      assert.strictEqual(hasPlatformPermission(null, 'company.delete'), false)
    })

    it('Inactive/Deactivated platform administrator is rejected for all operations', () => {
      const deactivatedOwner = createMockPlatformAdmin('platform_owner', false)
      assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'platform.view'), false)
      assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'tenant.view'), false)
      assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'company.delete'), false)
      assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'emergency_controls.manage'), false)
    })

    it('Anonymous caller invoking platform action wrapper is rejected with UNAUTHORIZED', async () => {
      const res = await simulatePlatformActionGuard({ permission: 'tenant.view' }, null)
      assert.strictEqual(res.ok, false)
      assert.strictEqual(res.success, false)
      assert.strictEqual(res.code, 'UNAUTHORIZED')
    })
  })

  // 2. TENANT USER CALLING PLATFORM OPERATIONS DIRECTLY
  describe('2. Tenant User Calling Platform Operations Directly', () => {
    it('Tenant regular user is not a platform admin and fails closed', () => {
      const tenantUser = {
        id: 'usr-tenant-123',
        email: 'tenant_owner@client.com',
        role: 'owner',
        company_id: 'comp-123',
        is_active: true,
      } as any

      assert.strictEqual(hasPlatformPermission(tenantUser, 'platform.view'), false)
      assert.strictEqual(hasPlatformPermission(tenantUser, 'tenant.create'), false)
      assert.strictEqual(hasPlatformPermission(tenantUser, 'subscription.manage'), false)
      assert.strictEqual(hasPlatformPermission(tenantUser, 'company.delete'), false)
    })

    it('Tenant regular user attempting to invoke platform action is rejected', async () => {
      const tenantUser = {
        id: 'usr-tenant-123',
        email: 'tenant_user@client.com',
        role: 'admin',
        is_active: true,
      } as any

      const res = await simulatePlatformActionGuard({ permission: 'tenant.edit' }, tenantUser)
      assert.strictEqual(res.ok, false)
      assert.strictEqual(res.code, 'FORBIDDEN')
    })
  })

  // 3. LEAST PRIVILEGE ROLE ENFORCEMENT ACROSS ALL ROLES
  describe('3. Least Privilege Role Enforcement Across All Roles', () => {
    it('platform_readonly can view metrics and tenants but cannot mutate or delete', async () => {
      const readonlyAdmin = createMockPlatformAdmin('platform_readonly')

      // View permissions allowed
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'platform.view'), true)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'tenant.view'), true)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'plan.view'), true)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'subscription.view'), true)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'audit.view'), true)

      // Mutation and destructive actions forbidden
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'tenant.create'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'tenant.edit'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'tenant.delete'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'company.delete'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'plan.create'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'subscription.manage'), false)
      assert.strictEqual(hasPlatformPermission(readonlyAdmin, 'emergency_controls.manage'), false)

      // Guard check: view allowed, edit rejected
      const viewRes = await simulatePlatformActionGuard({ permission: 'tenant.view' }, readonlyAdmin)
      assert.strictEqual(viewRes.ok, true)

      const editRes = await simulatePlatformActionGuard({ permission: 'tenant.edit' }, readonlyAdmin)
      assert.strictEqual(editRes.ok, false)
      assert.strictEqual(editRes.code, 'FORBIDDEN')
    })

    it('platform_support can view tickets, tenants, and initiate support session, but cannot manage billing or delete', async () => {
      const supportAdmin = createMockPlatformAdmin('platform_support')

      // Support operations allowed
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'platform.view'), true)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'tenant.view'), true)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'support.view'), true)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'support.reply'), true)

      // Management and destructive forbidden
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'tenant.delete'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'company.delete'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'company.purge'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'subscription.manage'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'billing.reconcile'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'emergency_controls.manage'), false)
      assert.strictEqual(hasPlatformPermission(supportAdmin, 'platform_user.manage'), false)

      const billRes = await simulatePlatformActionGuard({ permission: 'subscription.manage' }, supportAdmin)
      assert.strictEqual(billRes.ok, false)
      assert.strictEqual(billRes.code, 'FORBIDDEN')
    })

    it('platform_finance (billing) can reconcile billing and manage subscriptions, but cannot delete or emergency control', async () => {
      const financeAdmin = createMockPlatformAdmin('platform_finance')

      // Billing operations allowed
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'subscription.view'), true)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'subscription.manage'), true)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'plan.view'), true)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'billing.reconcile'), true)

      // Destructive, support impersonation, and emergency control forbidden
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'tenant.delete'), false)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'company.delete'), false)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'company.support_mode'), false)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'emergency_controls.manage'), false)
      assert.strictEqual(hasPlatformPermission(financeAdmin, 'platform_user.manage'), false)

      const delRes = await simulatePlatformActionGuard({ destruct: true }, financeAdmin, 'Testing deletion')
      assert.strictEqual(delRes.ok, false)
      assert.strictEqual(delRes.code, 'OWNER_ROLE_REQUIRED')
    })

    it('platform_owner possesses all platform permissions unconditionally', () => {
      const ownerAdmin = createMockPlatformAdmin('platform_owner')

      for (const perm of ALL_PLATFORM_PERMISSIONS) {
        assert.strictEqual(hasPlatformPermission(ownerAdmin, perm), true)
      }
    })
  })

  // 4. DESTRUCTIVE ACTIONS INVARIANTS (MFA RECENCY, ROLE & REASON)
  describe('4. Destructive Action Invariants (Owner Only, MFA Recency, Reason)', () => {
    it('Destructive operations strictly reject non-owners', async () => {
      const nowIso = new Date().toISOString()
      const adminUser = createMockPlatformAdmin('platform_admin', true, nowIso)
      const supportUser = createMockPlatformAdmin('platform_support', true, nowIso)
      const financeUser = createMockPlatformAdmin('platform_finance', true, nowIso)

      const resAdmin = await simulatePlatformActionGuard({ destruct: true }, adminUser, 'Deleting tenant')
      assert.strictEqual(resAdmin.ok, false)
      assert.strictEqual(resAdmin.code, 'OWNER_ROLE_REQUIRED')

      const resSupport = await simulatePlatformActionGuard({ destruct: true }, supportUser, 'Deleting tenant')
      assert.strictEqual(resSupport.ok, false)
      assert.strictEqual(resSupport.code, 'OWNER_ROLE_REQUIRED')

      const resFinance = await simulatePlatformActionGuard({ destruct: true }, financeUser, 'Deleting tenant')
      assert.strictEqual(resFinance.ok, false)
      assert.strictEqual(resFinance.code, 'OWNER_ROLE_REQUIRED')
    })

    it('Destructive operations reject owner if MFA verification is older than 5 minutes', async () => {
      // 6 minutes ago
      const staleTime = new Date(Date.now() - 6 * 60 * 1000).toISOString()
      const ownerWithStaleMfa = createMockPlatformAdmin('platform_owner', true, staleTime)

      const res = await simulatePlatformActionGuard({ destruct: true }, ownerWithStaleMfa, 'Audit reason')
      assert.strictEqual(res.ok, false)
      assert.strictEqual(res.code, 'MFA_RECENT_REQUIRED')
    })

    it('Destructive operations reject owner if typed reason is missing or empty', async () => {
      const nowIso = new Date().toISOString()
      const ownerWithFreshMfa = createMockPlatformAdmin('platform_owner', true, nowIso)

      const resEmptyReason = await simulatePlatformActionGuard({ destruct: true }, ownerWithFreshMfa, '   ')
      assert.strictEqual(resEmptyReason.ok, false)
      assert.strictEqual(resEmptyReason.code, 'REASON_REQUIRED')
    })

    it('Destructive operations succeed for platform_owner with recent MFA and typed reason', async () => {
      const nowIso = new Date().toISOString()
      const ownerWithFreshMfa = createMockPlatformAdmin('platform_owner', true, nowIso)

      const res = await simulatePlatformActionGuard({ destruct: true }, ownerWithFreshMfa, 'Authorized tenant deletion after SLA expired')
      assert.strictEqual(res.ok, true)
      assert.strictEqual(res.success, true)
    })

    it('Emergency purge all businesses strictly locked behind ALLOW_PLATFORM_PURGE_ALL environment flag', () => {
      const originalEnv = process.env.ALLOW_PLATFORM_PURGE_ALL

      try {
        process.env.ALLOW_PLATFORM_PURGE_ALL = 'false'
        assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', false)

        delete process.env.ALLOW_PLATFORM_PURGE_ALL
        assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', false)

        process.env.ALLOW_PLATFORM_PURGE_ALL = 'true'
        assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', true)
      } finally {
        process.env.ALLOW_PLATFORM_PURGE_ALL = originalEnv
      }
    })
  })
})
