import { test, describe } from 'node:test'
import assert from 'node:assert'

describe('InkFlow Platform Owner — Production Control Panel & Security Hardening', () => {
  // Mock Data Types
  interface MockPlatformAdmin {
    id: string
    user_id: string
    email: string
    full_name: string
    role: 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_finance' | 'platform_readonly'
    responsibilities: string[]
    permissions: string[]
    is_active: boolean
  }

  interface MockSupportSession {
    id: string
    platform_admin_id: string
    company_id: string
    company_slug: string
    status: 'active' | 'expired' | 'revoked'
    access_level: 'read_only' | 'operational_support' | 'administrative_support'
    reason: string
    expires_at: string
  }

  // Pure functions representing platform authorization logic
  function resolvePlatformContext(
    authUid: string | null,
    admins: MockPlatformAdmin[]
  ): { authorized: boolean; admin?: MockPlatformAdmin; error?: string } {
    if (!authUid) {
      return { authorized: false, error: 'Unauthenticated: No valid Supabase auth UID.' }
    }

    const admin = admins.find((a) => a.user_id === authUid)
    if (!admin) {
      return { authorized: false, error: 'Unauthorized: User is not registered in platform_admins.' }
    }

    if (!admin.is_active) {
      return { authorized: false, error: 'Unauthorized: Platform administrator account is deactivated.' }
    }

    return { authorized: true, admin }
  }

  function checkPlatformPermission(admin: MockPlatformAdmin, requiredPermission: string): boolean {
    if (!admin.is_active) return false
    if (admin.role === 'platform_owner') return true
    return admin.permissions.includes(requiredPermission)
  }

  function canDeactivateOrDeleteAdmin(
    targetAdminId: string,
    allAdmins: MockPlatformAdmin[]
  ): { allowed: boolean; reason?: string } {
    const target = allAdmins.find((a) => a.id === targetAdminId)
    if (!target) return { allowed: false, reason: 'Administrator not found.' }

    if (target.role === 'platform_owner') {
      const activeOwners = allAdmins.filter((a) => a.role === 'platform_owner' && a.is_active)
      if (activeOwners.length <= 1) {
        return {
          allowed: false,
          reason: 'Lockout Protection: Cannot delete or deactivate the final active Platform Owner.',
        }
      }
    }

    return { allowed: true }
  }

  function validateSupportSession(
    session: MockSupportSession | null,
    currentPlatformAdminId: string
  ): { valid: boolean; reason?: string } {
    if (!session) return { valid: false, reason: 'No session provided.' }
    if (session.status !== 'active') return { valid: false, reason: `Session status is ${session.status}.` }
    if (session.platform_admin_id !== currentPlatformAdminId) {
      return { valid: false, reason: 'Session belongs to a different platform admin.' }
    }
    const expiresAt = new Date(session.expires_at).getTime()
    const now = Date.now()
    if (expiresAt <= now) {
      return { valid: false, reason: 'Support session has expired.' }
    }
    return { valid: true }
  }

  // Test suite
  describe('1. Canonical Platform Identity & Fail-Closed Behavior', () => {
    const admins: MockPlatformAdmin[] = [
      {
        id: 'adm-01',
        user_id: 'usr-auth-owner-uuid',
        email: 'owner@inkflow.com',
        full_name: 'Platform Owner',
        role: 'platform_owner',
        responsibilities: ['platform_owner'],
        permissions: ['*'],
        is_active: true,
      },
      {
        id: 'adm-02',
        user_id: 'usr-auth-admin-uuid',
        email: 'admin@inkflow.com',
        full_name: 'Operations Admin',
        role: 'platform_admin',
        responsibilities: ['platform_admin'],
        permissions: ['tenant.view', 'tenant.suspend', 'support.access'],
        is_active: true,
      },
      {
        id: 'adm-03',
        user_id: 'usr-auth-inactive-uuid',
        email: 'former@inkflow.com',
        full_name: 'Former Staff',
        role: 'platform_admin',
        responsibilities: ['platform_admin'],
        permissions: ['tenant.view'],
        is_active: false,
      },
    ]

    test('valid active platform owner resolves context successfully', () => {
      const res = resolvePlatformContext('usr-auth-owner-uuid', admins)
      assert.strictEqual(res.authorized, true)
      assert.strictEqual(res.admin?.role, 'platform_owner')
    })

    test('unauthenticated caller (null UID) is strictly rejected', () => {
      const res = resolvePlatformContext(null, admins)
      assert.strictEqual(res.authorized, false)
      assert.match(res.error || '', /Unauthenticated/)
    })

    test('tenant user with valid Supabase UID but not in platform_admins is denied', () => {
      const res = resolvePlatformContext('usr-tenant-regular-uuid', admins)
      assert.strictEqual(res.authorized, false)
      assert.match(res.error || '', /Unauthorized/)
    })

    test('deactivated platform administrator is strictly denied', () => {
      const res = resolvePlatformContext('usr-auth-inactive-uuid', admins)
      assert.strictEqual(res.authorized, false)
      assert.match(res.error || '', /deactivated/)
    })
  })

  describe('2. Permission Enforcement & Scope', () => {
    const owner: MockPlatformAdmin = {
      id: 'adm-01',
      user_id: 'usr-auth-owner-uuid',
      email: 'owner@inkflow.com',
      full_name: 'Platform Owner',
      role: 'platform_owner',
      responsibilities: ['platform_owner'],
      permissions: ['*'],
      is_active: true,
    }

    const opsAdmin: MockPlatformAdmin = {
      id: 'adm-02',
      user_id: 'usr-auth-admin-uuid',
      email: 'ops@inkflow.com',
      full_name: 'Ops Admin',
      role: 'platform_admin',
      responsibilities: ['platform_admin'],
      permissions: ['tenant.view', 'tenant.suspend', 'support.access'],
      is_active: true,
    }

    test('platform owner has access to all capabilities', () => {
      assert.strictEqual(checkPlatformPermission(owner, 'tenant.create'), true)
      assert.strictEqual(checkPlatformPermission(owner, 'platform_admin.create'), true)
      assert.strictEqual(checkPlatformPermission(owner, 'system.settings.edit'), true)
    })

    test('operations admin has granted permissions and denied missing permissions', () => {
      assert.strictEqual(checkPlatformPermission(opsAdmin, 'tenant.view'), true)
      assert.strictEqual(checkPlatformPermission(opsAdmin, 'tenant.suspend'), true)
      assert.strictEqual(checkPlatformPermission(opsAdmin, 'support.access'), true)
      // Denied ungranted sensitive actions:
      assert.strictEqual(checkPlatformPermission(opsAdmin, 'platform_admin.delete'), false)
      assert.strictEqual(checkPlatformPermission(opsAdmin, 'system.database_wipe'), false)
    })
  })

  describe('3. Lockout Protection — Last Platform Owner Safeguard', () => {
    const singleOwnerList: MockPlatformAdmin[] = [
      {
        id: 'adm-owner-sole',
        user_id: 'usr-sole-owner',
        email: 'sole@inkflow.com',
        full_name: 'Sole Owner',
        role: 'platform_owner',
        responsibilities: ['platform_owner'],
        permissions: ['*'],
        is_active: true,
      },
      {
        id: 'adm-staff',
        user_id: 'usr-staff',
        email: 'staff@inkflow.com',
        full_name: 'Staff Member',
        role: 'platform_admin',
        responsibilities: ['platform_admin'],
        permissions: ['tenant.view'],
        is_active: true,
      },
    ]

    test('cannot deactivate or delete the sole active platform owner', () => {
      const res = canDeactivateOrDeleteAdmin('adm-owner-sole', singleOwnerList)
      assert.strictEqual(res.allowed, false)
      assert.match(res.reason || '', /Lockout Protection/)
    })

    test('can deactivate or delete non-owner admin safely', () => {
      const res = canDeactivateOrDeleteAdmin('adm-staff', singleOwnerList)
      assert.strictEqual(res.allowed, true)
    })

    test('can deactivate an owner when multiple active owners exist', () => {
      const multiOwnerList: MockPlatformAdmin[] = [
        ...singleOwnerList,
        {
          id: 'adm-owner-two',
          user_id: 'usr-owner-2',
          email: 'owner2@inkflow.com',
          full_name: 'Second Owner',
          role: 'platform_owner',
          responsibilities: ['platform_owner'],
          permissions: ['*'],
          is_active: true,
        },
      ]

      const res = canDeactivateOrDeleteAdmin('adm-owner-sole', multiOwnerList)
      assert.strictEqual(res.allowed, true)
    })
  })

  describe('4. Support Impersonation Session Lifecycle', () => {
    const adminId = 'adm-01'

    test('active non-expired support session is valid', () => {
      const session: MockSupportSession = {
        id: 'sess-01',
        platform_admin_id: adminId,
        company_id: 'comp-101',
        company_slug: 'padma-printers',
        status: 'active',
        access_level: 'operational_support',
        reason: 'Investigating order calculation discrepancy per ticket #102',
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }

      const res = validateSupportSession(session, adminId)
      assert.strictEqual(res.valid, true)
    })

    test('expired support session is rejected immediately', () => {
      const session: MockSupportSession = {
        id: 'sess-02',
        platform_admin_id: adminId,
        company_id: 'comp-101',
        company_slug: 'padma-printers',
        status: 'active',
        access_level: 'read_only',
        reason: 'Ticket review',
        expires_at: new Date(Date.now() - 1000).toISOString(), // 1s ago
      }

      const res = validateSupportSession(session, adminId)
      assert.strictEqual(res.valid, false)
      assert.match(res.reason || '', /expired/)
    })

    test('revoked support session is rejected immediately', () => {
      const session: MockSupportSession = {
        id: 'sess-03',
        platform_admin_id: adminId,
        company_id: 'comp-101',
        company_slug: 'padma-printers',
        status: 'revoked',
        access_level: 'read_only',
        reason: 'Ticket review',
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }

      const res = validateSupportSession(session, adminId)
      assert.strictEqual(res.valid, false)
      assert.match(res.reason || '', /revoked/)
    })

    test('support session belonging to a different admin is rejected (token hijacking defense)', () => {
      const session: MockSupportSession = {
        id: 'sess-04',
        platform_admin_id: 'other-admin-id',
        company_id: 'comp-101',
        company_slug: 'padma-printers',
        status: 'active',
        access_level: 'read_only',
        reason: 'Ticket review',
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      }

      const res = validateSupportSession(session, adminId)
      assert.strictEqual(res.valid, false)
      assert.match(res.reason || '', /different platform admin/)
    })
  })
})
