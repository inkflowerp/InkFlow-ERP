import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  hasPlatformPermission,
  resolveEffectivePlatformPermissions,
  PLATFORM_ROLE_PERMISSIONS_MAP,
  ALL_PLATFORM_PERMISSIONS,
} from '../../lib/auth/platform-auth.ts'
import type { PlatformUserRecord, PlatformRole } from '../../lib/auth/types.ts'

describe('Security Attack Tests: Platform Boundary & Role Isolation', () => {
  it('1. Platform Isolation: Readonly admin cannot execute emergency controls or mutations', () => {
    const readonlyUser: PlatformUserRecord = {
      id: 'admin-ro-123',
      user_id: 'usr-ro-123',
      email: 'ro@printerp.com',
      full_name: 'Readonly Inspector',
      role: 'platform_readonly',
      is_active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    }

    assert.strictEqual(hasPlatformPermission(readonlyUser, 'system.emergency_controls'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'emergency_controls.manage'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'company.delete'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'company.purge'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'plan.delete'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'platform.view'), true)
  })

  it('2. Platform Isolation: Inactive platform admin is denied all operations', () => {
    const inactiveOwner: PlatformUserRecord = {
      id: 'admin-owner-disabled',
      user_id: 'usr-owner-disabled',
      email: 'disabled@printerp.com',
      full_name: 'Suspended Owner',
      role: 'platform_owner',
      is_active: false, // Deactivated
      mfa_enabled: false,
      created_at: new Date().toISOString(),
    }

    assert.strictEqual(hasPlatformPermission(inactiveOwner, 'platform.view'), false)
    assert.strictEqual(hasPlatformPermission(inactiveOwner, 'platform.manage'), false)
  })

  it('3. Platform Isolation: Support admin permissions are strictly scoped without platform management', () => {
    const supportUser: PlatformUserRecord = {
      id: 'admin-sup-123',
      user_id: 'usr-sup-123',
      email: 'support@printerp.com',
      full_name: 'Support Tech',
      role: 'platform_support',
      is_active: true,
      mfa_enabled: true,
      created_at: new Date().toISOString(),
    }

    assert.strictEqual(hasPlatformPermission(supportUser, 'support.reply'), true)
    assert.strictEqual(hasPlatformPermission(supportUser, 'support.view'), true)
    assert.strictEqual(hasPlatformPermission(supportUser, 'platform.manage'), false)
    assert.strictEqual(hasPlatformPermission(supportUser, 'security.manage'), false)
    assert.strictEqual(hasPlatformPermission(supportUser, 'plan.edit'), false)
  })

  it('4. Platform Isolation: Multi-responsibility calculates effective union of permissions', () => {
    const perms = resolveEffectivePlatformPermissions('platform_support', ['platform_finance'])
    
    // Support perms
    assert.ok(perms.includes('support.reply'))
    assert.ok(perms.includes('support.view'))
    // Finance perms
    assert.ok(perms.includes('subscription.manage'))
    assert.ok(perms.includes('billing.reconcile'))
    // Excluded dangerous perms
    assert.strictEqual(perms.includes('security.manage'), false)
    assert.strictEqual(perms.includes('system.emergency_controls'), false)
  })

  it('5. Platform Owner retains all registered platform permissions', () => {
    const ownerPerms = resolveEffectivePlatformPermissions('platform_owner')
    assert.strictEqual(ownerPerms.length, ALL_PLATFORM_PERMISSIONS.length)
  })
})
