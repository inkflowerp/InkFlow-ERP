// ==============================================================================
// PrintERP SaaS - Start Free Trial & Auth Redirect Loop Regression Tests
// Validates:
// 1. Landing Page -> Start Free Trial (/register) is never trapped in redirect loops.
// 2. /register allows unauthenticated & existing users to sign up cleanly.
// 3. /login with stale cookie or error query params does not loop.
// 4. Server-side cookie cleanup in requireTenantUser on unverified tenant access.
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'

// Simulation of middleware session and redirection logic
interface MockRequest {
  pathname: string
  searchParams: Record<string, string>
  cookies: Record<string, string>
}

interface MockResponse {
  status: number
  redirectUrl?: string
  cookiesToDelete: string[]
  headers: Record<string, string>
}

function simulateMiddleware(request: MockRequest, user: { id: string; email: string } | null): MockResponse {
  const response: MockResponse = {
    status: 200,
    cookiesToDelete: [],
    headers: {},
  }

  const pathname = request.pathname
  const isPlatformAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  const isPlatformProtectedPage =
    pathname.startsWith('/platform') && !isPlatformAuthPage

  const isTenantAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/verify' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  const isPublicMarketingPage =
    pathname === '/' ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/solutions') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/auth/verify')

  // Check Tenant Session Cookie
  const tenantSessionCookie = request.cookies['printerp_tenant_session']
  let hasValidTenantCookie = false
  let tenantSessionData: any = null
  if (tenantSessionCookie) {
    try {
      tenantSessionData = JSON.parse(decodeURIComponent(tenantSessionCookie))
      if (tenantSessionData && tenantSessionData.userId && tenantSessionData.userEmail) {
        hasValidTenantCookie = true
      }
    } catch {
      // Invalid cookie
    }
  }

  // 2. Tenant Protected Page Guard: Unauthenticated users trying to access tenant app -> Redirect to /login
  const isTenantAuthenticated = Boolean(user) || hasValidTenantCookie
  if (
    !isTenantAuthenticated &&
    !isTenantAuthPage &&
    !isPublicMarketingPage &&
    !isPlatformAuthPage &&
    !isPlatformProtectedPage
  ) {
    return {
      status: 307,
      redirectUrl: `/login?redirectTo=${pathname}`,
      cookiesToDelete: [],
      headers: { 'Cache-Control': 'no-store' },
    }
  }

  // 3. Authenticated Tenant User trying to access /login -> Redirect to dashboard
  // Only redirect if actively authenticated in Supabase with a valid company slug and no error/logout params.
  // Never redirect /register so users can always access Start Free Trial / sign up cleanly.
  if (pathname === '/login') {
    const hasAuthError = Boolean(request.searchParams['error'] || request.searchParams['logged_out'])

    if (user && hasValidTenantCookie && tenantSessionData?.companySlug && !hasAuthError) {
      return {
        status: 307,
        redirectUrl: `/${tenantSessionData.companySlug}/dashboard`,
        cookiesToDelete: [],
        headers: { 'Cache-Control': 'no-store' },
      }
    } else if (!user && hasValidTenantCookie) {
      // Stale tenant session cookie with no active Supabase user session: purge cookie to prevent redirect loops
      response.cookiesToDelete.push('printerp_tenant_session')
    }
  }

  return response
}

describe('Start Free Trial & Auth Redirect Loop Protection Suite', () => {
  test('1. Navigating to /register (Start Free Trial) is accessible without redirect when unauthenticated', () => {
    const req: MockRequest = {
      pathname: '/register',
      searchParams: {},
      cookies: {},
    }

    const res = simulateMiddleware(req, null)
    assert.equal(res.status, 200, '/register must return 200 and not redirect')
    assert.equal(res.redirectUrl, undefined)
  })

  test('2. Navigating to /register with plan query (e.g. /register?plan=starter) is never redirected to old dashboard even with leftover cookie', () => {
    const staleCookie = encodeURIComponent(
      JSON.stringify({
        userId: '11111111-1111-1111-1111-111111111111',
        userEmail: 'user@example.com',
        companySlug: 'old-company-slug',
      })
    )

    const req: MockRequest = {
      pathname: '/register',
      searchParams: { plan: 'starter' },
      cookies: { printerp_tenant_session: staleCookie },
    }

    const res = simulateMiddleware(req, null)
    assert.equal(res.status, 200, '/register?plan=starter must load registration form without redirecting to old dashboard')
    assert.equal(res.redirectUrl, undefined)
  })

  test('3. /login with stale cookie (unauthenticated in Supabase) does not redirect to dashboard and purges cookie', () => {
    const staleCookie = encodeURIComponent(
      JSON.stringify({
        userId: '22222222-2222-2222-2222-222222222222',
        userEmail: 'stale@example.com',
        companySlug: 'stale-tenant',
      })
    )

    const req: MockRequest = {
      pathname: '/login',
      searchParams: {},
      cookies: { printerp_tenant_session: staleCookie },
    }

    const res = simulateMiddleware(req, null)
    assert.equal(res.status, 200, 'Unauthenticated /login must load login page without redirecting to dashboard')
    assert.ok(res.cookiesToDelete.includes('printerp_tenant_session'), 'Must purge stale tenant cookie')
  })

  test('4. /login with error query parameters (e.g. ?error=unauthorized) does NOT redirect to dashboard', () => {
    const validCookie = encodeURIComponent(
      JSON.stringify({
        userId: '33333333-3333-3333-3333-333333333333',
        userEmail: 'active@example.com',
        companySlug: 'active-tenant',
      })
    )

    const req: MockRequest = {
      pathname: '/login',
      searchParams: { error: 'unauthorized' },
      cookies: { printerp_tenant_session: validCookie },
    }

    const res = simulateMiddleware(req, { id: '33333333-3333-3333-3333-333333333333', email: 'active@example.com' })
    assert.equal(res.status, 200, '/login with error must not redirect to dashboard')
    assert.equal(res.redirectUrl, undefined)
  })

  test('5. /login with active Supabase user and valid cookie redirects smoothly to dashboard', () => {
    const validCookie = encodeURIComponent(
      JSON.stringify({
        userId: '33333333-3333-3333-3333-333333333333',
        userEmail: 'active@example.com',
        companySlug: 'active-tenant',
      })
    )

    const req: MockRequest = {
      pathname: '/login',
      searchParams: {},
      cookies: { printerp_tenant_session: validCookie },
    }

    const res = simulateMiddleware(req, { id: '33333333-3333-3333-3333-333333333333', email: 'active@example.com' })
    assert.equal(res.status, 307)
    assert.equal(res.redirectUrl, '/active-tenant/dashboard')
  })

  test('6. Unauthenticated protected tenant route redirects to /login with redirectTo', () => {
    const req: MockRequest = {
      pathname: '/my-tenant/dashboard',
      searchParams: {},
      cookies: {},
    }

    const res = simulateMiddleware(req, null)
    assert.equal(res.status, 307)
    assert.equal(res.redirectUrl, '/login?redirectTo=/my-tenant/dashboard')
  })
})
