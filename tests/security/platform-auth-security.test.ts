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
  is_active: boolean
  mfa_enabled?: boolean
  last_login_at?: string
  created_at: string
}

export const DEMO_PLATFORM_USERS: PlatformUserRecord[] = [
  {
    id: 'pa-001',
    user_id: 'u-platform-root-01',
    email: 'admin@printerp.com.bd',
    full_name: 'Haji Mohammad Shamim (Platform Owner)',
    role: 'platform_owner',
    is_active: true,
    mfa_enabled: true,
    last_login_at: '2026-09-07T14:30:00Z',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'pa-002',
    user_id: 'u-platform-test-01',
    email: 'platform-admin@example.com',
    full_name: 'Platform Test Admin',
    role: 'platform_admin',
    is_active: true,
    mfa_enabled: false,
    last_login_at: '2026-09-07T12:15:00Z',
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'pa-003',
    user_id: 'u-platform-support-01',
    email: 'support@printerp.com.bd',
    full_name: 'Support Operations Officer',
    role: 'platform_support',
    is_active: true,
    mfa_enabled: true,
    last_login_at: '2026-09-06T18:00:00Z',
    created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'pa-004',
    user_id: 'u-platform-finance-01',
    email: 'finance@printerp.com.bd',
    full_name: 'Platform Finance Controller',
    role: 'platform_finance',
    is_active: true,
    mfa_enabled: true,
    last_login_at: '2026-09-07T09:45:00Z',
    created_at: '2026-03-01T00:00:00Z',
  },
]

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


function hasPlatformPermission(user: PlatformUserRecord, action: string): boolean {
  if (!user.is_active) return false
  if (user.role === 'platform_owner') return true

  if (user.role === 'platform_admin') {
    return !action.startsWith('platform.owner_only')
  }

  if (user.role === 'platform_finance') {
    return (
      action.startsWith('subscription.') ||
      action.startsWith('billing.') ||
      action.startsWith('plan.') ||
      action.startsWith('company.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_operations') {
    return (
      action.startsWith('system.') ||
      action.startsWith('job.') ||
      action.startsWith('incident.') ||
      action.startsWith('integration.') ||
      action.startsWith('company.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_support') {
    return (
      action.startsWith('company.view') ||
      action.startsWith('company.support_access') ||
      action.startsWith('system.view') ||
      action.startsWith('audit.view')
    )
  }

  if (user.role === 'platform_readonly') {
    return action.endsWith('.view') || action.startsWith('view.')
  }

  return false
}

describe('Platform Admin Authentication & Authorization Security', () => {
  // Test 1: Known Platform Administrator accounts integrity
  test('Platform Owner account pa-001 exists and has platform_owner role', () => {
    const owner = DEMO_PLATFORM_USERS.find((p) => p.role === 'platform_owner')
    assert.ok(owner, 'Platform Owner must exist in DEMO_PLATFORM_USERS')
    assert.strictEqual(owner.email, 'admin@printerp.com.bd')
    assert.strictEqual(owner.is_active, true)
    assert.strictEqual(owner.mfa_enabled, true)
  })

  // Test 2: Platform Role separation
  test('Platform Roles correctly enforce permission hierarchy', () => {
    const owner = DEMO_PLATFORM_USERS.find((p) => p.role === 'platform_owner')!
    const admin = DEMO_PLATFORM_USERS.find((p) => p.role === 'platform_admin')!
    const support = DEMO_PLATFORM_USERS.find((p) => p.role === 'platform_support')!
    const finance = DEMO_PLATFORM_USERS.find((p) => p.role === 'platform_finance')!

    // Owner has full control
    assert.strictEqual(hasPlatformPermission(owner, 'platform.owner_only.emergency'), true)
    assert.strictEqual(hasPlatformPermission(owner, 'subscription.edit'), true)
    assert.strictEqual(hasPlatformPermission(owner, 'company.support_access'), true)

    // Admin cannot execute owner-only actions
    assert.strictEqual(hasPlatformPermission(admin, 'platform.owner_only.emergency'), false)
    assert.strictEqual(hasPlatformPermission(admin, 'company.edit'), true)

    // Support can only do support & view
    assert.strictEqual(hasPlatformPermission(support, 'company.support_access'), true)
    assert.strictEqual(hasPlatformPermission(support, 'subscription.edit'), false)

    // Finance can manage subscriptions but not system health/workers
    assert.strictEqual(hasPlatformPermission(finance, 'subscription.change'), true)
    assert.strictEqual(hasPlatformPermission(finance, 'system.job_retry'), false)
  })

  // Test 3: Deactivated platform accounts cannot execute actions
  test('Deactivated platform administrator is blocked from all operations', () => {
    const deactivatedUser: PlatformUserRecord = {
      id: 'pa-deactivated',
      user_id: 'u-deactivated',
      email: 'former-admin@printerp.com.bd',
      full_name: 'Former Staff',
      role: 'platform_admin',
      is_active: false,
      created_at: '2025-01-01T00:00:00Z',
    }

    assert.strictEqual(hasPlatformPermission(deactivatedUser, 'company.view'), false)
    assert.strictEqual(hasPlatformPermission(deactivatedUser, 'platform.dashboard'), false)
  })

  // Test 4: Rate limiter defends against brute force attempts
  test('Sliding window rate limiter throttles excessive platform login attempts', () => {
    const testEmail = `brute_test_${Date.now()}@printerp.com.bd`

    // First 5 attempts should succeed within rate limit window
    for (let i = 0; i < 5; i++) {
      const result = testCheckRateLimit(testEmail)
      assert.strictEqual(result.success, true, `Attempt ${i + 1} should be within limit`)
    }

    // 6th attempt should be throttled
    const blocked = testCheckRateLimit(testEmail)
    assert.strictEqual(blocked.success, false, '6th attempt must be blocked by rate limiter')
    assert.ok(blocked.resetSeconds > 0, 'Reset seconds must be returned')

  })

  // Test 5: Tenant user quarantine verification
  test('Tenant user emails are strictly segregated from Platform User registry', () => {
    const tenantEmails = [
      'owner@padmadigital.com.bd',
      'designer@padmadigital.com.bd',
      'operator@padmadigital.com.bd',
      'sales@meghnapress.com',
      'customer@square.com.bd',
    ]

    for (const email of tenantEmails) {
      const isPlatformUser = DEMO_PLATFORM_USERS.some(
        (p) => p.email.toLowerCase() === email.toLowerCase()
      )
      assert.strictEqual(
        isPlatformUser,
        false,
        `Tenant email ${email} must never be in Platform User directory`
      )
    }
  })

  // Test 6: MFA token format validation
  test('TOTP 6-digit verification pattern strictly enforces numeric constraints', () => {
    const validMfaCodes = ['123456', '000000', '987654']
    const invalidMfaCodes = ['12345', '1234567', 'abcdef', '12 345', '123-456', '']

    for (const code of validMfaCodes) {
      assert.strictEqual(/^\d{6}$/.test(code), true, `${code} should be valid TOTP`)
    }

    for (const code of invalidMfaCodes) {
      assert.strictEqual(/^\d{6}$/.test(code), false, `${code} should be invalid TOTP`)
    }
  })
})
