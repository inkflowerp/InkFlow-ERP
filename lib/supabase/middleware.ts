import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // Platform admin paths
  const isPlatformAuthPage =
    pathname === '/platform/login' ||
    pathname === '/platform/forgot-password' ||
    pathname === '/platform/reset-password'

  const isPlatformProtectedPage =
    pathname.startsWith('/platform') && !isPlatformAuthPage

  // Tenant auth paths
  const isTenantAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'

  const isPublicMarketingPage =
    pathname === '/' ||
    pathname.startsWith('/features') ||
    pathname.startsWith('/solutions') ||
    pathname.startsWith('/pricing') ||
    pathname.startsWith('/about') ||
    pathname.startsWith('/contact') ||
    pathname.startsWith('/faq') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/auth/callback') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/sw.js' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.startsWith('/icons/')

  // Check platform session cookie
  const platformSessionCookie = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value
  let hasValidPlatformCookie = false
  if (platformSessionCookie) {
    try {
      let raw = platformSessionCookie
      try {
        raw = decodeURIComponent(platformSessionCookie)
      } catch {
        // Ignored
      }
      const parsed = typeof raw === 'string' && raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(platformSessionCookie)
      if (parsed && (parsed.email || parsed.userId) && parsed.role) {
        hasValidPlatformCookie = true
      }
    } catch {
      // Invalid cookie
    }
  }

  // Check tenant session cookie
  const tenantSessionCookie = request.cookies.get(TENANT_SESSION_COOKIE)?.value
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key'

  // If using placeholder during local dev, enforce cookie-based platform checks
  if (supabaseUrl.includes('placeholder') || supabaseUrl.includes('dummy')) {
    if (isPlatformProtectedPage && !hasValidPlatformCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/platform/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPlatformUser =
    hasValidPlatformCookie ||
    (user && user.app_metadata?.role?.startsWith('platform_'))

  // 1. Platform Protected Page Guard: Tenant users can NEVER access /platform/*
  if (isPlatformProtectedPage) {
    if (!hasValidPlatformCookie && !isPlatformUser) {
      const url = request.nextUrl.clone()
      url.pathname = '/platform/login'
      url.searchParams.set('redirectTo', pathname)
      if (user || hasValidTenantCookie) {
        url.searchParams.set('error', 'unauthorized')
      }
      return NextResponse.redirect(url)
    }
  }

  // 2. Unauthenticated user trying to access protected tenant app -> Redirect to /login
  const isAuthenticated = Boolean(user || hasValidTenantCookie)
  if (!isAuthenticated && !isTenantAuthPage && !isPublicMarketingPage && !isPlatformAuthPage && !isPlatformProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // 3. Authenticated user trying to access tenant auth pages (/login, /register)
  if (isAuthenticated && isTenantAuthPage) {
    const slug = tenantSessionData?.companySlug || 'padma-digital'
    const url = request.nextUrl.clone()
    url.pathname = `/${slug}/dashboard`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
