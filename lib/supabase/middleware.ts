import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types'

const DEFAULT_SUPABASE_URL = 'https://liqhihsqcblddqfjmmse.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcWhpaHNxY2JsZGRxZmptbXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MTEyMjUsImV4cCI6MjEwNDM4NzIyNX0.JMDMwnk3vIDg8V7Hn7qKPhqzP7yLA4HYYf2JSYW3Sv0'

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
    pathname.startsWith('/onboarding') ||
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

  // Check tenant session cookie for tenant workspace routing
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

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    DEFAULT_SUPABASE_ANON_KEY

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

  // 1. Platform Protected Page Guard: Non-authenticated users cannot access /platform/*
  if (isPlatformProtectedPage) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/platform/login'
      url.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(url)
    }
  }

  // 1b. Platform Auth Page: If already authenticated, redirect to /platform
  if (isPlatformAuthPage && pathname === '/platform/login') {
    if (user) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/platform'
      const url = request.nextUrl.clone()
      url.pathname = redirectTo.startsWith('/platform') ? redirectTo : '/platform'
      url.searchParams.delete('redirectTo')
      return NextResponse.redirect(url)
    }
  }

  // 2. Unauthenticated user trying to access protected tenant app -> Redirect to /login
  const isAuthenticated = Boolean(user)
  if (!isAuthenticated && !isTenantAuthPage && !isPublicMarketingPage && !isPlatformAuthPage && !isPlatformProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // 3. Authenticated user trying to access tenant auth pages (/login, /register)
  if (isAuthenticated && isTenantAuthPage) {
    if (tenantSessionData?.companySlug) {
      const url = request.nextUrl.clone()
      url.pathname = `/${tenantSessionData.companySlug}/dashboard`
      return NextResponse.redirect(url)
    } else {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
