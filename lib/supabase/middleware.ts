import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'
import { resolveHostname, isReservedSlug, isValidSlugFormat } from '@/lib/tenant/tenant-resolution'
import { getTenantLink } from '@/lib/tenant/tenant-url'

export async function updateSession(request: NextRequest) {
  try {
    const rawHost = request.headers.get('host') || request.nextUrl.host
    const hostResolution = resolveHostname(rawHost)
    const { hostType, tenantSlug, rootDomain, isDevelopment } = hostResolution
    const hostWithoutPort = (rawHost || '').toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
    const pathname = request.nextUrl.pathname
    const search = request.nextUrl.search

    // 0. Next.js Server Actions: NEVER redirect or block Server Actions!
    // Next.js App Router Server Actions authenticate internally via getVerifiedTenant/getOptionalTenant.
    // Returning a redirect on Server Action breaks client with "An unexpected response was received from the server".
    // HOWEVER, on tenant subdomains (e.g. rangao.inkflow-erp.vercel.app), routes are compiled inside app/[tenantSlug]/...
    // Clean subdomain paths (e.g. /hr/employees) MUST be rewritten to /[tenantSlug]/hr/employees with tenant headers
    // so Next.js matches the action in the route manifest without 404ing!
    if (request.headers.has('next-action')) {
      if (hostType === 'tenant' && tenantSlug) {
        const rewriteUrl = request.nextUrl.clone()
        if (pathname === '/' || pathname === '') {
          rewriteUrl.pathname = `/${tenantSlug}/dashboard`
        } else if (!pathname.startsWith(`/${tenantSlug}/`) && pathname !== `/${tenantSlug}`) {
          rewriteUrl.pathname = `/${tenantSlug}${pathname}`
        }
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-tenant-slug', tenantSlug)
        requestHeaders.set('x-tenant-hostname', rawHost)
        requestHeaders.set('x-forwarded-tenant-path', pathname)
        return NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        })
      }
      return NextResponse.next({ request })
    }

    // Helper: Anti-cache headers to prevent bfcache retention of sensitive pages
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

    // 0. Handle Invalid Hostnames (e.g. malformed subdomain)
    if (hostType === 'invalid') {
      const url = request.nextUrl.clone()
      url.pathname = '/tenant-not-found'
      url.search = ''
      return NextResponse.rewrite(url)
    }

    // 0b. Handle Reserved System Subdomains (e.g. admin.inkflow.com.bd -> redirect to root/platform)
    if (hostType === 'reserved') {
      if (tenantSlug === 'platform' || tenantSlug === 'platform-admin' || tenantSlug === 'admin') {
        const url = request.nextUrl.clone()
        url.pathname = pathname.startsWith('/platform') ? pathname : `/platform${pathname}`
        return NextResponse.rewrite(url)
      }
      // Redirect other reserved subdomains (e.g. mail, api, status) to root domain
      const targetProtocol = isDevelopment ? 'http' : 'https'
      const rootUrl = new URL(`${targetProtocol}://${rootDomain}${pathname}${search}`)
      return NextResponse.redirect(rootUrl)
    }

    // 1. Platform Domain Paths
    const isPlatformAuthPage =
      pathname === '/platform/login' ||
      pathname === '/platform/forgot-password' ||
      pathname === '/platform/reset-password'

    const isPlatformProtectedPage =
      pathname.startsWith('/platform') && !isPlatformAuthPage

    // 2. Public Auth Paths
    const isAuthPage =
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/verify' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password'

    // 3. Public Marketing & Static System Paths
    const isPublicStaticOrSystem =
      pathname === '/manifest.json' ||
      pathname === '/manifest.webmanifest' ||
      pathname === '/sw.js' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname.startsWith('/icons/') ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/auth/callback') ||
      pathname.startsWith('/auth/verify') ||
      pathname.startsWith('/403') ||
      pathname.startsWith('/404') ||
      pathname.startsWith('/tenant-not-found') ||
      pathname.startsWith('/tenant-suspended')

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
      pathname === '/logout'

    // Check Platform Session Cookie
    const platformSessionCookie = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value
    let hasValidPlatformCookie = false
    if (platformSessionCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(platformSessionCookie))
        if (parsed?.userId && parsed?.adminId) hasValidPlatformCookie = true
      } catch {
        try {
          const parsed = JSON.parse(platformSessionCookie)
          if (parsed?.userId && parsed?.adminId) hasValidPlatformCookie = true
        } catch {}
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
        } catch {}
      }
    }

    // Setup Supabase SSR client for cookie revalidation
    let user: any = null
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''

    const allCookies = request.cookies.getAll()
    const hasSupabaseAuthCookies = allCookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

    let responseCookies: { name: string; value: string; options?: any }[] = []

    if (supabaseUrl && supabaseAnonKey && hasSupabaseAuthCookies) {
      try {
        const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              responseCookies = cookiesToSet
            },
          },
        })

        const { data } = await supabase.auth.getUser()
        user = data?.user
      } catch (err) {
        user = null
      }
    }

    const isTenantAuthenticated = Boolean(user) || hasValidTenantCookie

    // --------------------------------------------------------------------------
    // A. PLATFORM PORTAL GUARDS
    // --------------------------------------------------------------------------
    if (isPlatformProtectedPage) {
      if (!user) {
        const url = request.nextUrl.clone()
        url.pathname = '/platform/login'
        url.searchParams.set('redirectTo', pathname)
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
      if (!hasValidPlatformCookie) {
        const url = request.nextUrl.clone()
        url.pathname = '/platform/login'
        url.searchParams.set('error', 'unauthorized')
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
    }

    if (isPlatformAuthPage && pathname === '/platform/login') {
      if (user && hasValidPlatformCookie) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/platform'
        const url = request.nextUrl.clone()
        url.pathname = redirectTo.startsWith('/platform') ? redirectTo : '/platform'
        url.searchParams.delete('redirectTo')
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
    }

    // --------------------------------------------------------------------------
    // B. TENANT SUBDOMAIN ROUTING (e.g. vision.inkflow.com.bd or vision.localhost:3000)
    // --------------------------------------------------------------------------
    if (hostType === 'tenant' && tenantSlug) {
      // 1. Static and system paths pass through
      if (isPublicStaticOrSystem) {
        const res = NextResponse.next({ request })
        responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        return res
      }

      // 2. Canonical Subdomain URL Normalization:
      // If a request arrives with redundant tenant slug in pathname on a tenant subdomain
      // e.g. https://rangao.inkflow-erp.vercel.app/rangao/dashboard -> 307 redirect to https://rangao.inkflow-erp.vercel.app/dashboard
      // e.g. https://rangao.inkflow-erp.vercel.app/rangao -> 307 redirect to https://rangao.inkflow-erp.vercel.app/dashboard
      if (pathname === `/${tenantSlug}` || pathname === `/${tenantSlug}/`) {
        const cleanUrl = new URL(`/dashboard${search}`, request.url)
        return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 307))
      }
      if (pathname.startsWith(`/${tenantSlug}/`)) {
        const cleanPath = pathname.slice(`/${tenantSlug}`.length) || '/dashboard'
        const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
        return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 307))
      }

      // 2b. Redundant duplicate segment normalization:
      // e.g. /settings/settings/tax -> /settings/tax
      // e.g. /settings/settings -> /settings
      if (pathname.includes('/settings/settings')) {
        const cleanPath = pathname.replace(/\/settings\/settings(\/|$)/, '/settings$1')
        const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
        return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 307))
      }

      // 3. Tenant Auth Paths on Subdomain (e.g. vision.inkflow.com.bd/login)
      if (isAuthPage) {
        if (pathname === '/login') {
          const hasAuthError = request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('logged_out')
          // If already authenticated in this tenant, redirect to dashboard
          if (isTenantAuthenticated && !hasAuthError && tenantSessionData?.companySlug === tenantSlug) {
            const redirectTo = request.nextUrl.searchParams.get('redirectTo')
            const targetPath = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login')
              ? redirectTo
              : '/dashboard'
            const targetUrl = new URL(targetPath, request.url)
            return applyNoCacheHeaders(NextResponse.redirect(targetUrl))
          }
        }

        // Forward tenant context to auth page
        const rewriteUrl = request.nextUrl.clone()
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-tenant-slug', tenantSlug)
        requestHeaders.set('x-tenant-hostname', rawHost)

        const res = NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        })
        responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        res.headers.set('X-Robots-Tag', 'noindex, nofollow')
        return res
      }

      // 4. Protected Tenant Operational Routes (e.g. /invoices, /dashboard, /quotations, /customers)
      // Check authentication: If unauthenticated, redirect to tenant login
      if (!isTenantAuthenticated) {
        const loginUrl = new URL('/login', request.url)
        const fullPath = search ? `${pathname}${search}` : pathname
        if (fullPath !== '/' && fullPath !== '/dashboard') {
          loginUrl.searchParams.set('redirectTo', fullPath)
        }
        return applyNoCacheHeaders(NextResponse.redirect(loginUrl))
      }

      // 5. Internal URL Rewrite: Map clean subdomain path to Next.js App Router app/[tenantSlug]/...
      const rewriteUrl = request.nextUrl.clone()
      let internalPath: string

      if (pathname === '/' || pathname === '') {
        internalPath = `/${tenantSlug}/dashboard`
      } else {
        // Standard clean subdomain route: /invoices -> /[tenantSlug]/invoices
        internalPath = `/${tenantSlug}${pathname}`
      }

      rewriteUrl.pathname = internalPath

      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-tenant-slug', tenantSlug)
      requestHeaders.set('x-tenant-hostname', rawHost)
      requestHeaders.set('x-forwarded-tenant-path', pathname)

      const res = NextResponse.rewrite(rewriteUrl, {
        request: {
          headers: requestHeaders,
        },
      })

      // Sync Supabase refreshed auth cookies to response
      responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))

      // Apply SEO protection: Never index private tenant business records
      res.headers.set('X-Robots-Tag', 'noindex, nofollow')
      applyNoCacheHeaders(res)

      return res
    }

    // --------------------------------------------------------------------------
    // C. ROOT DOMAIN ROUTING (e.g. inkflow.com.bd, localhost:3000)
    // --------------------------------------------------------------------------
    if (hostType === 'root') {
      // 1. If authenticated tenant user visits /login on root domain -> redirect to their tenant workspace
      if (pathname === '/login') {
        const hasAuthError = request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('logged_out')
        if (hasValidTenantCookie && tenantSessionData?.companySlug && !hasAuthError && !hasValidPlatformCookie) {
          const targetSlug = tenantSessionData.companySlug
          const tenantUrl = getTenantLink(targetSlug, `/dashboard`, rootDomain)
          return applyNoCacheHeaders(NextResponse.redirect(new URL(tenantUrl), 307))
        } else if (hasAuthError && hasValidTenantCookie) {
          const res = NextResponse.next({ request })
          res.cookies.delete(TENANT_SESSION_COOKIE)
          return res
        }
      }

      // 2. If user visits /dashboard on root domain:
      // If logged in as tenant -> redirect to their actual tenant workspace (e.g. vision.inkflow.com.bd/dashboard)
      // Otherwise redirect to /login
      if (pathname === '/dashboard') {
        if (hasValidTenantCookie && tenantSessionData?.companySlug) {
          const targetSlug = tenantSessionData.companySlug
          const tenantUrl = getTenantLink(targetSlug, `/dashboard`, rootDomain)
          return NextResponse.redirect(new URL(tenantUrl), 307)
        } else {
          const loginUrl = request.nextUrl.clone()
          loginUrl.pathname = '/login'
          return NextResponse.redirect(loginUrl, 307)
        }
      }

      // 3. If user visits path with legitimate tenant slug on root domain (e.g. inkflow-erp.vercel.app/rangao/invoices):
      // Redirect to canonical tenant subdomain https://rangao.inkflow-erp.vercel.app/invoices
      const pathParts = pathname.split('/').filter(Boolean)
      const firstSegment = pathParts[0] || ''

      const isKnownRootSegment =
        firstSegment === '' ||
        isReservedSlug(firstSegment) ||
        firstSegment === 'dashboard' ||
        firstSegment === 'platform' ||
        firstSegment === 'platform-admin' ||
        firstSegment === 'icons' ||
        firstSegment === 'tenant-not-found' ||
        firstSegment === 'tenant-suspended' ||
        firstSegment.startsWith('_')

      if (!isKnownRootSegment && pathParts.length > 0 && isValidSlugFormat(firstSegment)) {
        const potentialSlug = firstSegment.toLowerCase().trim()
        const subPath = pathParts.slice(1).join('/')
        const tenantUrl = getTenantLink(
          potentialSlug,
          subPath ? `/${subPath}${search}` : `/dashboard${search}`,
          rootDomain
        )
        return applyNoCacheHeaders(NextResponse.redirect(new URL(tenantUrl), 307))
      }

      const res = NextResponse.next({ request })
      responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    // Default pass-through
    const res = NextResponse.next({ request })
    responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  } catch (error) {
    console.error('[Middleware] Unhandled error in tenant routing session update:', error)
    return NextResponse.next({ request })
  }
}
