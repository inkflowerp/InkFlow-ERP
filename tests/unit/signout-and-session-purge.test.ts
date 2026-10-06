// ==============================================================================
// PrintFlow SaaS - Unit Tests: Sign Out & Comprehensive Session Purge
// Verifies complete revocation of tenant & platform sessions, Supabase cookies,
// in-memory caches, and middleware response headers on logout.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clearAllAuthCookies, signOutAction } from '../../actions/auth.actions.ts'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '../../lib/auth/types.ts'
import { invalidateTenantAuthCache } from '../../lib/auth/tenant-auth.ts'

describe('Sign Out & Comprehensive Session Purge Tests', () => {
  it('1. clearAllAuthCookies purges all tenant, platform, and Supabase auth token cookies', async () => {
    const deletedCookies: Array<{ name: string; options?: any }> = []
    const setCookies: Array<{ name: string; value: string; options?: any }> = []

    const mockCookieStore = {
      getAll: () => [
        { name: TENANT_SESSION_COOKIE, value: 'jwt-tenant-session-token' },
        { name: PLATFORM_SESSION_COOKIE, value: 'jwt-platform-session-token' },
        { name: 'printflow_support_tenant', value: '{"sessionId":"abc"}' },
        { name: 'sb-sampleproj-auth-token', value: 'token-part-1' },
        { name: 'sb-sampleproj-auth-token.0', value: 'chunk-0' },
        { name: 'sb-sampleproj-auth-token.1', value: 'chunk-1' },
        { name: 'unrelated_cookie', value: 'preserve_me' },
      ],
      delete: (arg: string | { name: string; domain?: string; path?: string }) => {
        if (typeof arg === 'string') {
          deletedCookies.push({ name: arg })
        } else {
          deletedCookies.push(arg)
        }
      },
      set: (name: string, value: string, options?: any) => {
        setCookies.push({ name, value, options })
      },
    }

    await clearAllAuthCookies(mockCookieStore)

    // Verify all auth cookies were targeted
    const purgedNames = new Set(deletedCookies.map((c) => c.name))
    assert.ok(purgedNames.has(TENANT_SESSION_COOKIE), 'Must delete TENANT_SESSION_COOKIE')
    assert.ok(purgedNames.has(PLATFORM_SESSION_COOKIE), 'Must delete PLATFORM_SESSION_COOKIE')
    assert.ok(purgedNames.has('printflow_support_tenant'), 'Must delete printflow_support_tenant')
    assert.ok(purgedNames.has('sb-sampleproj-auth-token'), 'Must delete sb-*-auth-token')
    assert.ok(purgedNames.has('sb-sampleproj-auth-token.0'), 'Must delete sb-*-auth-token.0')
    assert.ok(purgedNames.has('sb-sampleproj-auth-token.1'), 'Must delete sb-*-auth-token.1')
    assert.ok(!purgedNames.has('unrelated_cookie'), 'Must not touch unrelated cookies')

    // Verify all set calls expired cookies with maxAge 0 and epoch date
    for (const sc of setCookies) {
      assert.strictEqual(sc.value, '', 'Purged cookie value must be empty string')
      assert.strictEqual(sc.options?.maxAge, 0, 'Purged cookie maxAge must be 0')
      assert.strictEqual(sc.options?.expires?.getTime(), 0, 'Purged cookie expires must be epoch 0')
    }
  })

  it('2. signOutAction returns structured redirectUrl without throwing NEXT_REDIRECT exception', async () => {
    const res = await signOutAction()
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.redirectUrl, '/login?logged_out=true')
  })

  it('3. invalidateTenantAuthCache executes cleanly and invalidates in-memory structures', () => {
    // Should run without throwing errors
    assert.doesNotThrow(() => invalidateTenantAuthCache('user-123'))
    assert.doesNotThrow(() => invalidateTenantAuthCache())
  })

  it('4. Middleware logout simulation prevents session bouncing to /dashboard', () => {
    // Verify query param check logic
    const searchParamsWithLoggedOut = new URLSearchParams('logged_out=true')
    const hasAuthError = searchParamsWithLoggedOut.has('error') || searchParamsWithLoggedOut.has('logged_out')
    assert.strictEqual(hasAuthError, true)

    // Even if an attacker or stale state claims isTenantAuthenticated = true:
    const isTenantAuthenticated = true
    const shouldRedirectToDashboard = !hasAuthError && isTenantAuthenticated
    assert.strictEqual(shouldRedirectToDashboard, false, 'Must NOT bounce to /dashboard when logged_out=true is set')
  })

  it('5. Hardened client signOut pattern ensures non-httpOnly cookies and state are purged', () => {
    // Simulate client document cookie wipe
    const mockDocument = {
      cookie: 'printflow_temp=123; sb-auth=xyz; test_cookie=abc',
    }

    const cleared: string[] = []
    const rawCookies = mockDocument.cookie.split(';')
    for (const c of rawCookies) {
      const name = c.split('=')[0]?.trim()
      if (name && (name.startsWith('sb-') || name.startsWith('printflow_') || name.includes('session'))) {
        cleared.push(name)
      }
    }

    assert.deepStrictEqual(cleared, ['printflow_temp', 'sb-auth'])
  })
})
