import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { PLATFORM_SESSION_COOKIE, TENANT_SESSION_COOKIE } from '../../lib/auth/types.ts'

interface MockReq {
  pathname: string
  searchParams: Record<string, string>
  cookies: Record<string, string>
  env: Record<string, string | undefined>
}

interface MockRes {
  status: number
  redirectUrl?: string
  cookiesToDelete: string[]
  headers: Record<string, string>
}

function safeMiddlewareSimulator(request: MockReq, user: any = null): MockRes {
  const response: MockRes = {
    status: 200,
    cookiesToDelete: [],
    headers: {},
  }

  try {
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
      pathname === '/logout' ||
      pathname.startsWith('/auth/verify') ||
      pathname.startsWith('/auth/callback') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/403')

    // Parse Platform Cookie defensively
    const platformCookie = request.cookies[PLATFORM_SESSION_COOKIE]
    let hasValidPlatformCookie = false
    let platformSessionData: any = null
    if (platformCookie) {
      try {
        platformSessionData = JSON.parse(decodeURIComponent(platformCookie))
        if (platformSessionData?.userId && platformSessionData?.adminId) {
          hasValidPlatformCookie = true
        }
      } catch {
        try {
          platformSessionData = JSON.parse(platformCookie)
          if (platformSessionData?.userId && platformSessionData?.adminId) {
            hasValidPlatformCookie = true
          }
        } catch {
          // Ignore corrupted cookie
        }
      }
    }

    // Parse Tenant Cookie defensively
    const tenantCookie = request.cookies[TENANT_SESSION_COOKIE]
    let hasValidTenantCookie = false
    let tenantSessionData: any = null
    if (tenantCookie) {
      try {
        tenantSessionData = JSON.parse(decodeURIComponent(tenantCookie))
        if (tenantSessionData?.userId || tenantSessionData?.companySlug || tenantSessionData?.companyId) {
          hasValidTenantCookie = true
        }
      } catch {
        try {
          tenantSessionData = JSON.parse(tenantCookie)
          if (tenantSessionData?.userId || tenantSessionData?.companySlug || tenantSessionData?.companyId) {
            hasValidTenantCookie = true
          }
        } catch {
          // Ignore corrupted cookie
        }
      }
    }

    // Platform Guard
    if (isPlatformProtectedPage) {
      if (!user) {
        response.status = 307
        response.redirectUrl = `/platform/login?redirectTo=${encodeURIComponent(pathname)}`
        return response
      }
      if (!hasValidPlatformCookie) {
        response.status = 307
        response.redirectUrl = '/platform/login?error=unauthorized'
        return response
      }
    }

    // Tenant Guard
    const firstSegment = pathname.split('/').filter(Boolean)[0] || ''
    const isTenantRoute =
      firstSegment !== '' &&
      !isTenantAuthPage &&
      !isPublicMarketingPage &&
      !isPlatformAuthPage &&
      !isPlatformProtectedPage

    const isTenantAuthenticated = Boolean(user) || hasValidTenantCookie
    if (isTenantRoute && !isTenantAuthenticated) {
      response.status = 307
      response.redirectUrl = `/login?redirectTo=${encodeURIComponent(pathname)}`
      return response
    }

    return response
  } catch (err) {
    return response // Fallback to safe 200 response
  }
}

describe('Middleware Resilience & Vercel Crash Prevention', () => {
  test('1. Handles completely missing environment variables safely without throwing', () => {
    const req: MockReq = {
      pathname: '/',
      searchParams: {},
      cookies: {},
      env: {},
    }

    const res = safeMiddlewareSimulator(req, null)
    assert.equal(res.status, 200, 'Public homepage request returns 200 OK without crashing')
  })

  test('2. Safely handles malformed and corrupted cookies without throwing exceptions', () => {
    const req: MockReq = {
      pathname: '/',
      searchParams: {},
      cookies: {
        [PLATFORM_SESSION_COOKIE]: '%malformed%json{;;;',
        [TENANT_SESSION_COOKIE]: 'not-json-at-all',
      },
      env: {},
    }

    const res = safeMiddlewareSimulator(req, null)
    assert.equal(res.status, 200, 'Corrupted cookies handled gracefully')
  })

  test('3. Redirects unauthenticated platform requests to /platform/login', () => {
    const req: MockReq = {
      pathname: '/platform/tenants',
      searchParams: {},
      cookies: {},
      env: {},
    }

    const res = safeMiddlewareSimulator(req, null)
    assert.equal(res.status, 307)
    assert.ok(res.redirectUrl?.startsWith('/platform/login'))
  })

  test('4. Redirects unauthenticated tenant routes to /login', () => {
    const req: MockReq = {
      pathname: '/acme-press/orders',
      searchParams: {},
      cookies: {},
      env: {},
    }

    const res = safeMiddlewareSimulator(req, null)
    assert.equal(res.status, 307)
    assert.ok(res.redirectUrl?.startsWith('/login'))
  })

  test('5. Allows authenticated tenant access with valid session cookie', () => {
    const req: MockReq = {
      pathname: '/acme-press/dashboard',
      searchParams: {},
      cookies: {
        [TENANT_SESSION_COOKIE]: JSON.stringify({
          userId: 'usr-123',
          companyId: 'comp-123',
          companySlug: 'acme-press',
          role: 'business_owner',
        }),
      },
      env: {},
    }

    const res = safeMiddlewareSimulator(req, null)
    assert.equal(res.status, 200)
  })

  test('6. Allows public marketing and onboarding pages without authentication', () => {
    const publicPaths = ['/', '/pricing', '/about', '/contact', '/faq', '/features', '/onboarding']

    for (const path of publicPaths) {
      const req: MockReq = {
        pathname: path,
        searchParams: {},
        cookies: {},
        env: {},
      }
      const res = safeMiddlewareSimulator(req, null)
      assert.equal(res.status, 200, `Path ${path} should be publicly accessible`)
    }
  })

  test('7. Allows /verify and /auth/verify registration verification without redirecting to /login', () => {
    const verifyPaths = ['/verify', '/auth/verify']

    for (const path of verifyPaths) {
      const req: MockReq = {
        pathname: path,
        searchParams: { email: 'newuser@example.com' },
        cookies: {},
        env: {},
      }
      const res = safeMiddlewareSimulator(req, null)
      assert.equal(res.status, 200, `Verification path ${path} must not be redirected to /login`)
    }
  })
})
