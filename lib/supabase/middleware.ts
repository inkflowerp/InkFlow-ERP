import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // 1. Platform Domain Paths
  const isPlatformAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  const isPlatformProtectedPage =
    pathname.startsWith('/platform') && !isPlatformAuthPage

  // 2. Tenant Auth Paths
  const isTenantAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  // 3. Public Marketing & Static Paths
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
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/403') ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/icons/')

  // Check Platform Session Cookie
  const platformSessionCookie = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value
  let hasValidPlatformCookie = false
  let platformSessionData: any = null
  if (platformSessionCookie) {
    try {
      platformSessionData = JSON.parse(decodeURIComponent(platformSessionCookie))
      if (platformSessionData && platformSessionData.userId && platformSessionData.adminId) {
        hasValidPlatformCookie = true
      }
    } catch {
      // Invalid cookie
    }
  }

  // Check Tenant Session Cookie
  const tenantSessionCookie = request.cookies.get(TENANT_SESSION_COOKIE)?.value
  let hasValidTenantCookie = false
  let tenantSessionData: any = null
  if (tenantSessionCookie) {
    try {
      tenantSessionData = JSON.parse(decodeURIComponent(tenantSessionCookie))
      if (tenantSessionData && (tenantSessionData.userId || tenantSessionData.companySlug || tenantSessionData.companyId)) {
        hasValidTenantCookie = true
      }
    } catch {
      try {
        tenantSessionData = JSON.parse(tenantSessionCookie)
        if (tenantSessionData && (tenantSessionData.userId || tenantSessionData.companySlug || tenantSessionData.companyId)) {
          hasValidTenantCookie = true
        }
      } catch {
        // Invalid cookie
      }
    }
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://liqhihsqcblddqfjmmse.supabase.co'

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWhpaHNxY2JsZGRxZmptbXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTEyMjUsImV4cCI6MjEwNDM4NzIyNX0.JMDMwnk3vIDg8V7Hn7qKPhqzP7yLA4HYYf2JSYW3Sv0'

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user: any = null
  const allCookies = request.cookies.getAll()
  const hasSupabaseAuthCookies = allCookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

  if (hasSupabaseAuthCookies) {
    try {
      const {
        data,
      } = await supabase.auth.getUser()
      user = data?.user
    } catch {
      user = null
    }
  }

  // Helper to apply strict anti-cache headers to prevent bfcache retention of sensitive pages
  const applyNoCacheHeaders = (response: NextResponse) => {
    response.headers.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
    )
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    response.headers.set('Surrogate-Control', 'no-store')
    return response
  }

  // 1. Platform Protected Guard: Unauthenticated or non-platform users cannot access /platform/*
  if (isPlatformProtectedPage) {
    applyNoCacheHeaders(supabaseResponse)

    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/platform/login'
      url.searchParams.set('redirectTo', pathname)
      return applyNoCacheHeaders(NextResponse.redirect(url))
    }

    // Fail closed if user is authenticated in Supabase but possesses no platform session cookie
    if (!hasValidPlatformCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/platform/login'
      url.searchParams.set('error', 'unauthorized')
      return applyNoCacheHeaders(NextResponse.redirect(url))
    }
  }

  // 1b. Platform Auth Page: If already authenticated with platform session, redirect to /platform
  if (isPlatformAuthPage && pathname === '/platform/login') {
    applyNoCacheHeaders(supabaseResponse)
    if (user && hasValidPlatformCookie) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/platform'
      const url = request.nextUrl.clone()
      url.pathname = redirectTo.startsWith('/platform') ? redirectTo : '/platform'
      url.searchParams.delete('redirectTo')
      return applyNoCacheHeaders(NextResponse.redirect(url))
    }
  }

  // 2. Tenant Protected Page Guard: Unauthenticated users trying to access tenant app -> Redirect to /login
  const pathParts = pathname.split('/').filter(Boolean)
  const firstSegment = pathParts[0] || ''
  const isTenantRoute =
    firstSegment !== '' &&
    !isTenantAuthPage &&
    !isPublicMarketingPage &&
    !isPlatformAuthPage &&
    !isPlatformProtectedPage

  const isTenantAuthenticated = Boolean(user) || hasValidTenantCookie
  if (isTenantRoute && !isTenantAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const fullPath = request.nextUrl.search ? `${pathname}${request.nextUrl.search}` : pathname
    url.search = ''
    url.searchParams.set('redirectTo', fullPath)
    return applyNoCacheHeaders(NextResponse.redirect(url))
  }

  // 3. Authenticated Tenant User trying to access /login -> Redirect to dashboard or requested page
  // Only redirect if actively authenticated with a valid company slug and no error/logout params.
  // Never redirect /register so users can always access Start Free Trial / sign up cleanly.
  if (pathname === '/login') {
    const hasAuthError = request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('logged_out')
    
    if (hasValidTenantCookie && tenantSessionData?.companySlug && !hasAuthError && !hasValidPlatformCookie) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo')
      const targetSlug = tenantSessionData.companySlug
      let destination = `/${targetSlug}/dashboard`

      if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login')) {
        const cleanPath = redirectTo.split('?')[0]
        const queryPart = redirectTo.includes('?') ? `?${redirectTo.split('?')[1]}` : ''
        const parts = cleanPath.split('/').filter(Boolean)

        if (parts.length > 1) {
          const subPath = parts.slice(1).join('/')
          destination = `/${targetSlug}/${subPath}${queryPart}`
        } else if (parts.length === 1) {
          if (parts[0] === targetSlug || parts[0] === 'dashboard') {
            destination = `/${targetSlug}/dashboard${queryPart}`
          } else {
            destination = `/${targetSlug}/${parts[0]}${queryPart}`
          }
        } else {
          destination = redirectTo
        }
      }

      // Prevent redirecting to the same URL or looping
      if (destination !== '/login') {
        const url = request.nextUrl.clone()
        url.pathname = destination.split('?')[0]
        url.search = destination.includes('?') ? destination.split('?')[1] : ''
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
    } else if (hasAuthError && hasValidTenantCookie) {
      // Explicit error or logged out parameter: purge cookie
      supabaseResponse.cookies.delete(TENANT_SESSION_COOKIE)
    } else if (hasValidPlatformCookie && hasValidTenantCookie) {
      // Cross-portal conflict: purge stale tenant cookie on login
      supabaseResponse.cookies.delete(TENANT_SESSION_COOKIE)
    }
  }

  return supabaseResponse
}
