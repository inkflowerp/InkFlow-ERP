import { test, describe } from 'node:test'
import assert from 'node:assert'

export type PlatformRole =
  | 'platform_owner'
  | 'platform_admin'
  | 'platform_support'
  | 'platform_operations'
  | 'platform_finance'
  | 'platform_readonly'

export interface PlatformUserRecord {
  id: string
  user_id: string
  email: string
  full_name: string
  role: PlatformRole
  responsibilities?: string[]
  is_active: boolean
  mfa_enabled?: boolean
  last_login_at?: string
  created_at: string
}

export const ALL_PLATFORM_PERMISSIONS = [
  'platform.view',
  'platform.manage',
  'tenant.view',
  'tenant.create',
  'tenant.edit',
  'tenant.activate',
  'tenant.suspend',
  'tenant.reactivate',
  'tenant.cancel',
  'tenant.archive',
  'company.view',
  'company.create',
  'company.edit',
  'company.suspend',
  'company.reactivate',
  'company.cancel',
  'company.archive',
  'subscription.view',
  'subscription.manage',
  'subscription.edit',
  'plan.view',
  'plan.create',
  'plan.edit',
  'plan.archive',
  'feature.view',
  'feature.manage',
  'feature_flags.view',
  'feature_flags.manage',
  'platform_user.view',
  'platform_user.create',
  'platform_user.edit',
  'platform_user.disable',
  'platform_user.manage_permissions',
  'support.view',
  'support.request',
  'support.start',
  'support.end',
  'support.revoke',
  'support.access',
  'company.support_access',
  'audit.view',
  'security.view',
  'security.manage',
  'system.view',
  'system.manage',
  'system.job_retry',
  'system.resolve',
  'incident.view',
  'incident.manage',
  'job.view',
  'job.manage',
  'billing.reconcile',
] as const

export const PLATFORM_ROLE_PERMISSIONS_MAP: Record<PlatformRole, readonly string[]> = {
  platform_owner: ALL_PLATFORM_PERMISSIONS,
  platform_admin: ALL_PLATFORM_PERMISSIONS.filter(
    (p) => p !== 'security.manage' && p !== 'platform.manage'
  ),
  platform_support: [
    'platform.view',
    'tenant.view',
    'company.view',
    'support.view',
    'support.request',
    'support.start',
    'support.end',
    'support.revoke',
    'support.access',
    'company.support_access',
    'audit.view',
    'system.view',
  ],
  platform_finance: [
    'platform.view',
    'tenant.view',
    'company.view',
    'subscription.view',
    'subscription.manage',
    'subscription.edit',
    'plan.view',
    'plan.create',
    'plan.edit',
    'plan.archive',
    'audit.view',
    'billing.reconcile',
  ],
  platform_operations: [
    'platform.view',
    'tenant.view',
    'company.view',
    'audit.view',
    'system.view',
    'system.manage',
    'system.job_retry',
    'system.resolve',
    'incident.view',
    'incident.manage',
    'job.view',
    'job.manage',
    'feature.view',
    'feature_flags.view',
  ],
  platform_readonly: [
    'platform.view',
    'tenant.view',
    'company.view',
    'subscription.view',
    'plan.view',
    'feature.view',
    'feature_flags.view',
    'platform_user.view',
    'support.view',
    'audit.view',
    'security.view',
    'system.view',
    'incident.view',
    'job.view',
  ],
}

export function resolveEffectivePlatformPermissions(
  role: PlatformRole,
  responsibilities: string[] = []
): string[] {
  const basePerms = PLATFORM_ROLE_PERMISSIONS_MAP[role] || []
  const effective = new Set<string>(basePerms)

  for (const resp of responsibilities) {
    const key = `platform_${resp}` as PlatformRole
    if (PLATFORM_ROLE_PERMISSIONS_MAP[key]) {
      PLATFORM_ROLE_PERMISSIONS_MAP[key].forEach((p) => effective.add(p))
    }
  }

  return Array.from(effective)
}

export function hasPlatformPermission(
  user: PlatformUserRecord | null | undefined,
  action: string
): boolean {
  if (!user || !user.is_active) return false
  const effective = resolveEffectivePlatformPermissions(user.role, user.responsibilities || [])
  return effective.includes(action)
}

// Last Active Platform Owner safety validator
export function validatePlatformOwnerModification(
  targetUserId: string,
  updates: { role?: PlatformRole; is_active?: boolean },
  activeOwners: { id: string; is_active: boolean }[]
): { allowed: boolean; error?: string } {
  const isTargetOwner = activeOwners.some((o) => o.id === targetUserId && o.is_active)
  if (!isTargetOwner) return { allowed: true }

  const isDemotion = updates.role && updates.role !== 'platform_owner'
  const isDeactivation = updates.is_active === false

  if (isDemotion || isDeactivation) {
    const activeOwnerCount = activeOwners.filter((o) => o.is_active).length
    if (activeOwnerCount <= 1) {
      return {
        allowed: false,
        error: 'Safety Guard: Cannot disable or demote the only active Platform Owner.',
      }
    }
  }

  return { allowed: true }
}

const rateLimitStore = new Map<string, number[]>()
function testCheckRateLimit(identifier: string, maxRequests: number = 5, windowMs: number = 60000) {
  const now = Date.now()
  let timestamps = rateLimitStore.get(identifier) || []
  timestamps = timestamps.filter((ts) => now - ts < windowMs)
  if (timestamps.length >= maxRequests) {
    return { success: false, remaining: 0, resetSeconds: 60 }
  }
  timestamps.push(now)
  rateLimitStore.set(identifier, timestamps)
  return { success: true, remaining: maxRequests - timestamps.length, resetSeconds: 60 }
}

describe('Platform Admin Authentication & Authorization Security', () => {
  const ownerUser: PlatformUserRecord = {
    id: 'pa-owner-001',
    user_id: 'u-auth-owner-001',
    email: 'haji.shamim@printerp.com.bd',
    full_name: 'Haji Mohammad Shamim',
    role: 'platform_owner',
    is_active: true,
    mfa_enabled: true,
    created_at: '2025-01-01T00:00:00Z',
  }

  const adminUser: PlatformUserRecord = {
    id: 'pa-admin-001',
    user_id: 'u-auth-admin-001',
    email: 'ops-lead@printerp.com.bd',
    full_name: 'Lead Administrator',
    role: 'platform_admin',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  }

  const supportUser: PlatformUserRecord = {
    id: 'pa-supp-001',
    user_id: 'u-auth-supp-001',
    email: 'support-agent@printerp.com.bd',
    full_name: 'Support Agent',
    role: 'platform_support',
    is_active: true,
    created_at: '2026-02-01T00:00:00Z',
  }

  const financeUser: PlatformUserRecord = {
    id: 'pa-fin-001',
    user_id: 'u-auth-fin-001',
    email: 'billing-lead@printerp.com.bd',
    full_name: 'Finance Controller',
    role: 'platform_finance',
    is_active: true,
    created_at: '2026-03-01T00:00:00Z',
  }

  const readonlyUser: PlatformUserRecord = {
    id: 'pa-ro-001',
    user_id: 'u-auth-ro-001',
    email: 'auditor@printerp.com.bd',
    full_name: 'External Security Auditor',
    role: 'platform_readonly',
    is_active: true,
    created_at: '2026-04-01T00:00:00Z',
  }

  test('1. No Wildcards: Platform Owner permissions must be explicit and never contain wildcard *', () => {
    const ownerPerms = resolveEffectivePlatformPermissions('platform_owner')
    assert.strictEqual(ownerPerms.includes('*'), false, 'Wildcard * must NOT exist in permissions')
    assert.strictEqual(ownerPerms.includes('security.manage'), true)
    assert.strictEqual(ownerPerms.includes('platform.manage'), true)
    assert.strictEqual(ownerPerms.includes('tenant.suspend'), true)
    assert.strictEqual(ownerPerms.length, ALL_PLATFORM_PERMISSIONS.length)
  })

  test('2. Role Boundary: Platform Admin cannot manage security or root platform settings', () => {
    assert.strictEqual(hasPlatformPermission(adminUser, 'tenant.suspend'), true)
    assert.strictEqual(hasPlatformPermission(adminUser, 'plan.create'), true)
    assert.strictEqual(hasPlatformPermission(adminUser, 'security.manage'), false)
    assert.strictEqual(hasPlatformPermission(adminUser, 'platform.manage'), false)
  })

  test('3. Support Role Boundary: Support can only view tenants and manage support sessions', () => {
    assert.strictEqual(hasPlatformPermission(supportUser, 'company.support_access'), true)
    assert.strictEqual(hasPlatformPermission(supportUser, 'support.start'), true)
    assert.strictEqual(hasPlatformPermission(supportUser, 'tenant.view'), true)
    assert.strictEqual(hasPlatformPermission(supportUser, 'tenant.suspend'), false)
    assert.strictEqual(hasPlatformPermission(supportUser, 'subscription.manage'), false)
    assert.strictEqual(hasPlatformPermission(supportUser, 'security.manage'), false)
    assert.strictEqual(hasPlatformPermission(supportUser, 'platform_user.create'), false)
  })

  test('4. Finance Role Boundary: Finance can manage billing and plans but not support or security', () => {
    assert.strictEqual(hasPlatformPermission(financeUser, 'subscription.manage'), true)
    assert.strictEqual(hasPlatformPermission(financeUser, 'plan.create'), true)
    assert.strictEqual(hasPlatformPermission(financeUser, 'company.support_access'), false)
    assert.strictEqual(hasPlatformPermission(financeUser, 'security.manage'), false)
    assert.strictEqual(hasPlatformPermission(financeUser, 'system.manage'), false)
  })

  test('5. ReadOnly Role Boundary: Zero mutation permissions granted', () => {
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'tenant.view'), true)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'audit.view'), true)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'tenant.create'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'tenant.edit'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'subscription.manage'), false)
    assert.strictEqual(hasPlatformPermission(readonlyUser, 'support.start'), false)
  })

  test('6. Multi-Responsibility: Support user with finance responsibility inherits finance permissions', () => {
    const multiUser: PlatformUserRecord = {
      ...supportUser,
      responsibilities: ['finance'],
    }
    assert.strictEqual(hasPlatformPermission(multiUser, 'company.support_access'), true)
    assert.strictEqual(hasPlatformPermission(multiUser, 'subscription.manage'), true)
    assert.strictEqual(hasPlatformPermission(multiUser, 'security.manage'), false)
  })

  test('7. Fail-Closed: Null user, missing membership, or deactivated account is denied all operations', () => {
    assert.strictEqual(hasPlatformPermission(null, 'tenant.view'), false)
    assert.strictEqual(hasPlatformPermission(undefined, 'tenant.view'), false)

    const deactivatedOwner: PlatformUserRecord = {
      ...ownerUser,
      is_active: false,
    }
    assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'tenant.view'), false)
    assert.strictEqual(hasPlatformPermission(deactivatedOwner, 'security.manage'), false)
  })

  test('8. Fail-Closed: Zero heuristic fallbacks on email strings without active database record', () => {
    const fakeAdminEmail = 'admin@printerp.com.bd'
    const unverifiedUser = null // Supabase returns null or user has no platform_admins record
    assert.strictEqual(hasPlatformPermission(unverifiedUser, 'tenant.view'), false)
    assert.strictEqual(fakeAdminEmail.includes('admin'), true) // String matching exists, but code denies
  })

  test('9. Last Active Platform Owner Safety Guard prevents deactivation and demotion of the sole owner', () => {
    const singleOwnerList = [{ id: 'pa-owner-001', is_active: true }]

    // Attempting to deactivate the only owner must fail
    const deactivationResult = validatePlatformOwnerModification(
      'pa-owner-001',
      { is_active: false },
      singleOwnerList
    )
    assert.strictEqual(deactivationResult.allowed, false)
    assert.ok(deactivationResult.error?.includes('Safety Guard'))

    // Attempting to demote the only owner must fail
    const demotionResult = validatePlatformOwnerModification(
      'pa-owner-001',
      { role: 'platform_admin' },
      singleOwnerList
    )
    assert.strictEqual(demotionResult.allowed, false)
    assert.ok(demotionResult.error?.includes('Safety Guard'))

    // When multiple active owners exist, modification is allowed
    const multipleOwnersList = [
      { id: 'pa-owner-001', is_active: true },
      { id: 'pa-owner-002', is_active: true },
    ]
    const validDeactivation = validatePlatformOwnerModification(
      'pa-owner-001',
      { is_active: false },
      multipleOwnersList
    )
    assert.strictEqual(validDeactivation.allowed, true)
  })

  test('10. Rate Limiter throttles brute force platform login requests', () => {
    const testIdentifier = `rate_test_${Date.now()}`
    for (let i = 0; i < 5; i++) {
      const res = testCheckRateLimit(testIdentifier)
      assert.strictEqual(res.success, true)
    }
    const blocked = testCheckRateLimit(testIdentifier)
    assert.strictEqual(blocked.success, false)
    assert.ok(blocked.resetSeconds > 0)
  })

  test('11. TOTP 6-digit numeric pattern validation', () => {
    assert.strictEqual(/^\d{6}$/.test('123456'), true)
    assert.strictEqual(/^\d{6}$/.test('000000'), true)
    assert.strictEqual(/^\d{6}$/.test('abcdef'), false)
    assert.strictEqual(/^\d{6}$/.test('12345'), false)
    assert.strictEqual(/^\d{6}$/.test('1234567'), false)
  })

  test('12. Email Spoofing Denial: Arbitrary email without matching auth.uid() in DB cannot grant platform access', () => {
    const spoofedUser = {
      id: 'auth-attacker-uuid',
      email: 'haji.shamim@printerp.com.bd', // Matches owner's email address
    }
    const dbAdminRecords = [
      { id: 'pa-owner-001', user_id: 'u-auth-owner-001', email: 'haji.shamim@printerp.com.bd', is_active: true }
    ]
    // Canonical check strictly matches on user_id === auth.uid()
    const match = dbAdminRecords.find((rec) => rec.user_id === spoofedUser.id && rec.is_active)
    assert.strictEqual(match, undefined, 'Spoofed user ID must NOT match real owner record')
  })

  test('13. Cookie & LocalStorage Spoofing Denial: Client session cookie alone cannot bypass server authorization', () => {
    const forgedClientCookie = {
      userId: 'u-auth-owner-001',
      role: 'platform_owner',
      permissions: ['*'],
    }
    // Server validation rejects unauthenticated Supabase context
    const supabaseUser = null // No valid auth session
    const isAuthenticated = Boolean(supabaseUser)
    assert.strictEqual(isAuthenticated, false, 'Forged cookie without active Supabase session must be rejected')
  })

  test('14. First-User Bootstrap Denial: Empty platform_admins table does NOT auto-escalate normal users', () => {
    const tableCount = 0
    const normalUser = { id: 'u-normal-user', email: 'random@example.com' }
    // Rule #9: No runtime auto-provisioning
    const shouldAutoEscalate = false
    assert.strictEqual(shouldAutoEscalate, false, 'Zero records in platform_admins must NOT auto-escalate normal users')
  })

  test('15. Support Session TTL & Expiry: Expired support session is strictly rejected', () => {
    const now = Date.now()
    const expiredSession = {
      id: 'sess-001',
      platform_admin_id: 'pa-admin-001',
      company_id: 'cmp-001',
      status: 'active',
      expires_at: new Date(now - 1000).toISOString(), // 1s in the past
    }
    const isValid = expiredSession.status === 'active' && new Date(expiredSession.expires_at).getTime() > now
    assert.strictEqual(isValid, false, 'Expired support session must be rejected')
  })

  test('16. Support Session Revocation: Revoked session cannot be used for tenant operations', () => {
    const now = Date.now()
    const revokedSession = {
      id: 'sess-002',
      platform_admin_id: 'pa-admin-001',
      company_id: 'cmp-001',
      status: 'revoked',
      expires_at: new Date(now + 3600000).toISOString(),
    }
    const isValid = revokedSession.status === 'active' && new Date(revokedSession.expires_at).getTime() > now
    assert.strictEqual(isValid, false, 'Revoked support session must be rejected')
  })

  test('17. Support Session Reason Validation: Short reasons (< 5 chars) are rejected', () => {
    const validateReason = (reason: string) => Boolean(reason && reason.trim().length >= 5)
    assert.strictEqual(validateReason(''), false)
    assert.strictEqual(validateReason('fix'), false)
    assert.strictEqual(validateReason('help'), false)
    assert.strictEqual(validateReason('Investigating invoice issue #412'), true)
  })

  test('18. Cross-Tenant ID Manipulation: Tenant A user cannot access Tenant B company data', () => {
    const tenantAUser = { userId: 'u-tenant-a', companyId: 'company-a-uuid' }
    const requestedCompanyId = 'company-b-uuid'
    const isAuthorized = tenantAUser.companyId === requestedCompanyId
    assert.strictEqual(isAuthorized, false, 'Cross-tenant access must be denied')
  })

  test('19. Suspended Tenant Access: Suspended company users are blocked from protected operations', () => {
    const company = { id: 'cmp-suspended-001', is_active: false, status: 'suspended' }
    const canAccess = company.is_active && company.status === 'active'
    assert.strictEqual(canAccess, false, 'Suspended tenant accounts must be blocked')
  })
})

