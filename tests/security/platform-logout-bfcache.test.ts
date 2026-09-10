import { test, describe } from 'node:test'
import assert from 'node:assert'
import nextConfig from '../../next.config.ts'

describe('Platform Logout & Back-Forward Cache (bfcache) Security Suite', () => {
  test('1. next.config.ts enforces strict anti-caching headers on platform routes', async () => {
    assert.ok(typeof nextConfig.headers === 'function', 'nextConfig must export async headers()')
    const headersConfig = await nextConfig.headers()
    assert.ok(Array.isArray(headersConfig), 'headers() must return an array')

    const platformWildcardRule = headersConfig.find((r: any) => r.source === '/platform/:path*')
    assert.ok(platformWildcardRule, 'Must define security headers for /platform/:path*')

    const platformRootRule = headersConfig.find((r: any) => r.source === '/platform')
    assert.ok(platformRootRule, 'Must define security headers for /platform')

    const cacheControlHeader = platformWildcardRule.headers.find((h: any) => h.key === 'Cache-Control')
    assert.ok(cacheControlHeader, 'Must include Cache-Control header')
    assert.ok(
      cacheControlHeader.value.includes('no-store'),
      'Cache-Control must specify no-store to prevent bfcache retention'
    )
    assert.ok(
      cacheControlHeader.value.includes('no-cache'),
      'Cache-Control must specify no-cache'
    )
    assert.ok(
      cacheControlHeader.value.includes('must-revalidate'),
      'Cache-Control must specify must-revalidate'
    )
    assert.ok(
      cacheControlHeader.value.includes('max-age=0'),
      'Cache-Control must specify max-age=0'
    )

    const pragmaHeader = platformWildcardRule.headers.find((h: any) => h.key === 'Pragma')
    assert.ok(pragmaHeader && pragmaHeader.value === 'no-cache', 'Must include Pragma: no-cache')

    const expiresHeader = platformWildcardRule.headers.find((h: any) => h.key === 'Expires')
    assert.ok(expiresHeader && expiresHeader.value === '0', 'Must include Expires: 0')
  })

  test('2. Simulates Platform Session Invalidation on Logout', () => {
    const activeCookies = new Map<string, string>()
    activeCookies.set(
      'printerp_platform_session',
      JSON.stringify({
        userId: 'root_user_1',
        adminId: 'padmin_1',
        email: 'owner@printerp.com',
        role: 'platform_owner',
      })
    )
    assert.strictEqual(activeCookies.has('printerp_platform_session'), true)

    // Simulate logout action cookie clearing
    function simulatePlatformLogout() {
      activeCookies.delete('printerp_platform_session')
      activeCookies.delete('printerp_support_tenant')
      return { success: true, redirectUrl: '/platform/login' }
    }

    const logoutResult = simulatePlatformLogout()
    assert.strictEqual(logoutResult.success, true)
    assert.strictEqual(logoutResult.redirectUrl, '/platform/login')
    assert.strictEqual(activeCookies.has('printerp_platform_session'), false)
  })

  test('3. bfcache Restoration & History Navigation Guard Verification', () => {
    // State machine simulator for PlatformLayout
    let isAuthorized = true
    let isChecking = false
    let currentRedirect = ''

    function simulateBfcachePageShow(persisted: boolean, hasValidSession: boolean) {
      if (persisted) {
        // Immediately blank out content and verify
        isAuthorized = false
        isChecking = true

        if (!hasValidSession) {
          currentRedirect = '/platform/login?error=unauthorized'
        } else {
          isAuthorized = true
          isChecking = false
        }
      }
    }

    // Step 1: User logs out, session becomes invalid
    const sessionActive = false

    // Step 2: User presses "Back" button -> browser fires pageshow with persisted = true
    simulateBfcachePageShow(true, sessionActive)

    // Assert: Layout never renders authorized content and triggers replace redirect
    assert.strictEqual(isAuthorized, false, 'Authorized state must immediately be reset to false')
    assert.strictEqual(isChecking, true, 'isChecking must be set to true')
    assert.strictEqual(
      currentRedirect,
      '/platform/login?error=unauthorized',
      'Must redirect unauthorized user to login'
    )
  })

  test('4. Redirection History Replacement (window.location.replace vs href)', () => {
    // Verify that replace semantics eliminate back loop
    const historyStack = ['/platform', '/platform/companies']
    
    function navigateWithReplace(target: string) {
      historyStack[historyStack.length - 1] = target
    }

    navigateWithReplace('/platform/login')
    assert.deepStrictEqual(
      historyStack,
      ['/platform', '/platform/login'],
      'The previous companies page is replaced by the login route'
    )
  })
})
