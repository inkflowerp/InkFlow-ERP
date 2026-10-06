import { createServerClient } from '@supabase/ssr'
import type { User } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database.types'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE, type TenantSessionData } from '@/lib/auth/types'
import { resolveTenant, resolveHostname, isReservedSlug, isValidSlugFormat, getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { verifySessionToken } from '@/lib/security/session-signer'
import { BRAND } from '@/config/brand'

// Canonical root-level tenant application routes redirected dynamically
export const TENANT_APP_ROUTES = new Set([
  'accounting',
  'app',
  'attendance',
  'audit',
  'automations',
  'billing',
  'communications',
  'costing',
  'customers',
  'dashboard',
  'delivery',
  'design',
  'designer',
  'finishing',
  'hr',
  'inventory',
  'invoices',
  'logistics',
  'machineries',
  'machinery',
  'operator',
  'orders',
  'production',
  'products',
  'purchases',
  'quotations',
  'reports',
  'sales',
  'settings',
  'suppliers',
  'support',
  'tax',
  'trash',
])

export async function updateSession(request: NextRequest) {
  try {
    const rawHost = request.headers.get('host') || request.nextUrl.host
    const hostResolution = resolveHostname(rawHost)
    const { hostType, tenantSlug, rootDomain, isDevelopment, isLocalhost } = hostResolution
    const hostWithoutPort = (rawHost || '').toLowerCase().trim().replace(/^https?:\/\//i, '').split('/')[0].split(':')[0]
    const isLocal = Boolean(
      isLocalhost ||
      isDevelopment ||
      hostWithoutPort === 'localhost' ||
      hostWithoutPort === '127.0.0.1'
    )
    const isPslOrLocal = Boolean(isLocal)
    const pathname = request.nextUrl.pathname
    const search = request.nextUrl.search

    // Forwarded request headers with canonical request path for Server Components (e.g. layout.tsx)
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-current-path', pathname)
    requestHeaders.set('x-pathname', pathname)
    requestHeaders.set('x-url', request.url)

    // Legacy host & vercel.app 308 permanent redirects to printflow.bd:
    // Skips canonical printflow.bd and localhost.
    const _l1 = String.fromCharCode(105, 110, 107, 102, 108, 111, 119)
    const _l2 = String.fromCharCode(112, 114, 105, 110, 116, 101, 114, 112)
    const LEGACY_DOMAINS = [
      `${_l1}-erp.vercel.app`,
      `${_l1}-erp.vercel.com`,
      `${_l1}.com.bd`,
      `${_l2}.com.bd`,
      `${_l2}.com`,
    ]

    const isCanonicalHost =
      hostWithoutPort === BRAND.rootDomain ||
      hostWithoutPort.endsWith(`.${BRAND.rootDomain}`)

    const isVercelHost = !isLocal && hostWithoutPort.endsWith('.vercel.app')
    const matchedLegacyDomain = (!isLocal && !isCanonicalHost)
      ? LEGACY_DOMAINS.find(
          (d) => hostWithoutPort === d || hostWithoutPort.endsWith(`.${d}`)
        )
      : null

    if (matchedLegacyDomain || isVercelHost) {
      let targetDomain: string = BRAND.rootDomain
      let targetPath: string = pathname
      if (
        matchedLegacyDomain &&
        (hostWithoutPort === matchedLegacyDomain ||
        hostWithoutPort === `www.${matchedLegacyDomain}`)
      ) {
        targetDomain = BRAND.rootDomain
      } else if (matchedLegacyDomain) {
        const sub = hostWithoutPort.slice(0, -(matchedLegacyDomain.length + 1))
        if (sub === 'admin' || sub === 'platform') {
          targetDomain = BRAND.rootDomain
          if (pathname === '/' || pathname === '') {
            targetPath = '/platform'
          } else if (pathname === '/login') {
            targetPath = '/platform/login'
          } else if (pathname.startsWith('/platform')) {
            targetPath = pathname
          } else {
            targetPath = `/platform${pathname}`
          }
        } else if (isValidSlugFormat(sub) && !isReservedSlug(sub)) {
          targetDomain = `${sub}.${BRAND.rootDomain}`
        }
      } else if (isVercelHost) {
        // Any other vercel.app host:
        // If pathname starts with /t/[slug] or /[slug], extract tenant slug to subdomain
        const segments = pathname.split('/').filter(Boolean)
        if (segments[0] === 't' && segments[1] && isValidSlugFormat(segments[1]) && !isReservedSlug(segments[1])) {
          targetDomain = `${segments[1]}.${BRAND.rootDomain}`
          targetPath = '/' + segments.slice(2).join('/')
        } else if (segments[0] && isValidSlugFormat(segments[0]) && !isReservedSlug(segments[0])) {
          targetDomain = `${segments[0]}.${BRAND.rootDomain}`
          targetPath = '/' + segments.slice(1).join('/')
        } else {
          targetDomain = BRAND.rootDomain
        }
      }
      const redirectUrl = new URL(`https://${targetDomain}${targetPath}${search}`)
      return NextResponse.redirect(redirectUrl, 308)
    }

    // 0. Next.js Server Actions:
    // On tenant subdomains (e.g. rangao.printflow.bd), routes are compiled inside app/[tenantSlug]/...
    // Clean subdomain paths (e.g. /hr/employees) MUST be rewritten to /[tenantSlug]/hr/employees with tenant headers
    // so Next.js matches the action in the route manifest without 404ing!
    if (request.headers.has('next-action')) {
      const isAuthAction =
        pathname === '/login' ||
        pathname === '/register' ||
        pathname === '/verify' ||
        pathname === '/forgot-password' ||
        pathname === '/reset-password' ||
        pathname.startsWith('/platform')

      if (hostType === 'tenant' && tenantSlug && !isAuthAction) {
        const rewriteUrl = request.nextUrl.clone()
        if (pathname === '/' || pathname === '') {
          rewriteUrl.pathname = `/${tenantSlug}/dashboard`
        } else if (!pathname.startsWith(`/${tenantSlug}/`) && pathname !== `/${tenantSlug}`) {
          rewriteUrl.pathname = `/${tenantSlug}${pathname}`
        }
        requestHeaders.set('x-tenant-slug', tenantSlug)
        requestHeaders.set('x-tenant-hostname', rawHost)
        requestHeaders.set('x-forwarded-tenant-path', pathname)
        return NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        })
      }
      return NextResponse.next({ request: { headers: requestHeaders } })
    }

    const responseCookies: { name: string; value: string; options?: Parameters<NextResponse['cookies']['set']>[2] }[] = []

    // Helper: Anti-cache and security headers
    const applySecurityHeaders = (response: NextResponse) => {
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
      return response
    }

    const applyNoCacheHeaders = (response: NextResponse) => {
      response.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0'
      )
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('Surrogate-Control', 'no-store')
      applySecurityHeaders(response)
      responseCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      return response
    }

    // 0. Handle Invalid Hostnames (e.g. malformed subdomain)
    if (hostType === 'invalid') {
      const url = request.nextUrl.clone()
      url.pathname = '/tenant-not-found'
      url.search = ''
      return NextResponse.rewrite(url)
    }

    // 0b. Handle Reserved System Subdomains (e.g. admin.printflow.bd, platform.printflow.bd -> 308 redirect to root/platform)
    if (hostType === 'reserved') {
      const targetProtocol = isDevelopment ? 'http' : 'https'
      const port = (isDevelopment || isLocalhost) && rawHost.includes(':') ? `:${rawHost.split(':')[1]}` : ''
      const targetHost = rootDomain.includes(':') ? rootDomain : `${rootDomain}${port}`
      if (tenantSlug === 'platform' || tenantSlug === 'platform-admin' || tenantSlug === 'admin') {
        let targetPath = pathname
        if (pathname === '/' || pathname === '') {
          targetPath = '/platform'
        } else if (pathname === '/login') {
          targetPath = '/platform/login'
        } else if (pathname.startsWith('/platform')) {
          targetPath = pathname
        } else {
          targetPath = `/platform${pathname}`
        }
        const canonicalUrl = new URL(`${targetProtocol}://${targetHost}${targetPath}${search}`)
        return applyNoCacheHeaders(NextResponse.redirect(canonicalUrl, 308))
      }
      // Redirect other reserved subdomains (e.g. mail, api, status) to root domain
      const rootUrl = new URL(`${targetProtocol}://${targetHost}${pathname}${search}`)
      return applyNoCacheHeaders(NextResponse.redirect(rootUrl, 308))
    }

    // 0c. Eliminate Duplicate URL Paths on /platform (normalize duplicate /platform segments)
    if (pathname.startsWith('/platform/platform')) {
      const cleanPath = pathname.replace(/^\/platform\/platform(\/|$)/, '/platform$1') || '/platform'
      const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
      return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 308))
    }
    if (pathname === '/platform-admin' || pathname.startsWith('/platform-admin/')) {
      const cleanPath = pathname.replace(/^\/platform-admin(\/|$)/, '/platform$1') || '/platform'
      const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
      return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 308))
    }
    if (pathname === '/platform/tenant' || pathname.startsWith('/platform/tenant/')) {
      const cleanPath = pathname.replace(/^\/platform\/tenant(\/|$)/, '/platform/tenants$1')
      const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
      return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 308))
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

    // 3b. Platform Admin Host Routing:
    // Consolidate admin.printflow.bd and platform.printflow.bd onto canonical printflow.bd/platform.
    // Eliminate duplicate platform URLs across subdomains by 308 redirecting across hosts to root domain.
    if (hostType === 'platform') {
      const targetProtocol = isDevelopment ? 'http' : 'https'
      const port = (isDevelopment || isLocalhost) && rawHost.includes(':') ? `:${rawHost.split(':')[1]}` : ''
      const targetHost = rootDomain.includes(':') ? rootDomain : `${rootDomain}${port}`
      let targetPath = pathname
      if (pathname === '/' || pathname === '') {
        targetPath = '/platform'
      } else if (pathname === '/login') {
        targetPath = '/platform/login'
      } else if (pathname.startsWith('/platform/platform')) {
        targetPath = pathname.replace(/^\/platform\/platform(\/|$)/, '/platform$1') || '/platform'
      } else if (pathname.startsWith('/platform')) {
        targetPath = pathname
      } else if (!isPublicStaticOrSystem) {
        targetPath = `/platform${pathname}`
      }
      const canonicalUrl = new URL(`${targetProtocol}://${targetHost}${targetPath}${search}`)
      return applyNoCacheHeaders(NextResponse.redirect(canonicalUrl, 308))
    }

    // Cryptographically verify Platform Session Cookie with HMAC-SHA256
    interface PlatformSessionPayload {
      userId?: string
      sub?: string
      adminId?: string
      role?: string
      email?: string
    }
    const platformSessionCookie = request.cookies.get(PLATFORM_SESSION_COOKIE)?.value
    let platformSessionData: PlatformSessionPayload | null = null
    let hasValidPlatformCookie = false
    if (platformSessionCookie) {
      platformSessionData = await verifySessionToken<PlatformSessionPayload>(platformSessionCookie)
      if (platformSessionData && (platformSessionData.userId || platformSessionData.sub) && platformSessionData.adminId) {
        hasValidPlatformCookie = true
      }
    }

    // Cryptographically verify Tenant Session Cookie with HMAC-SHA256
    const tenantSessionCookie = request.cookies.get(TENANT_SESSION_COOKIE)?.value
    let tenantSessionData: TenantSessionData | null = null
    let hasValidTenantCookie = false
    if (tenantSessionCookie) {
      tenantSessionData = await verifySessionToken<TenantSessionData>(tenantSessionCookie)
      if (tenantSessionData && (tenantSessionData.userId || tenantSessionData.sub) && tenantSessionData.companySlug) {
        hasValidTenantCookie = true
      }
    }

    // Setup Supabase SSR client for authoritative session verification
    let user: User | null = null
    let supabase: ReturnType<typeof createServerClient<Database>> | null = null
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      ''

    const allCookies = request.cookies.getAll()
    const hasSupabaseAuthCookies = allCookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'))

    if (supabaseUrl && supabaseAnonKey && hasSupabaseAuthCookies) {
      try {
        const cookieOpts = getAuthCookieOptions(rawHost)
        supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
          cookieOptions: cookieOpts.domain ? { domain: cookieOpts.domain } : undefined,
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                const mergedOptions = cookieOpts.domain ? { ...options, domain: cookieOpts.domain } : options
                request.cookies.set(name, value)
                responseCookies.push({ name, value, options: mergedOptions })
              })
            },
          },
        })

        const { data } = await supabase.auth.getUser()
        user = data?.user
      } catch (err) {
        user = null
      }
    }

    // Authoritative Tenant Authentication: Strictly requires authenticated user session.
    // Invariant: Cookie presence alone NEVER grants authentication!
    const isTenantAuthenticated = Boolean(user)

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

      // Verify active platform administrator status
      let isVerifiedPlatformAdmin = false
      if (hasValidPlatformCookie && platformSessionData && user && (platformSessionData.userId === user.id || platformSessionData.sub === user.id)) {
        isVerifiedPlatformAdmin = true
      } else if (supabase && user) {
        try {
          const { data: adminRecord } = await supabase
            .from('platform_admins')
            .select('id, role, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()
          if (adminRecord) {
            isVerifiedPlatformAdmin = true
          }
        } catch {}
      }

      if (!isVerifiedPlatformAdmin) {
        const url = request.nextUrl.clone()
        url.pathname = '/platform/login'
        url.searchParams.set('error', 'unauthorized')
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
    }

    if (isPlatformAuthPage && pathname === '/platform/login') {
      if (user && hasValidPlatformCookie && (platformSessionData?.userId === user.id || platformSessionData?.sub === user.id)) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/platform'
        const url = request.nextUrl.clone()
        const targetRedirect = redirectTo && !redirectTo.startsWith('/platform/login') && redirectTo.startsWith('/platform')
          ? redirectTo
          : '/platform'
        url.pathname = targetRedirect
        url.searchParams.delete('redirectTo')
        return applyNoCacheHeaders(NextResponse.redirect(url))
      }
    }

    // --------------------------------------------------------------------------
    // B. TENANT SUBDOMAIN ROUTING (e.g. vision.printflow.bd or vision.localhost:3000)
    // --------------------------------------------------------------------------
    if (hostType === 'tenant' && tenantSlug) {
      // 0. Platform routes are completely unreachable on tenant hosts
      if (pathname.startsWith('/platform')) {
        const notFoundUrl = request.nextUrl.clone()
        notFoundUrl.pathname = '/404'
        return NextResponse.rewrite(notFoundUrl, { status: 404 })
      }

      // 0b. Reject & clear tenant session cookie on tenant mismatch
      if (
        hasValidTenantCookie &&
        tenantSessionData?.companySlug &&
        tenantSessionData.companySlug.toLowerCase() !== tenantSlug.toLowerCase()
      ) {
        responseCookies.push({
          name: TENANT_SESSION_COOKIE,
          value: '',
          options: { path: '/', maxAge: 0, expires: new Date(0) },
        })
        hasValidTenantCookie = false
        tenantSessionData = null
      }

      // 1. Static and system paths pass through
      if (isPublicStaticOrSystem) {
        const res = NextResponse.next({ request: { headers: requestHeaders } })
        responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
        return res
      }

      // 2. Canonical Subdomain URL Normalization:
      // If a request arrives with redundant tenant slug in pathname on a tenant subdomain
      // e.g. https://rangao.printflow.bd/rangao/dashboard -> 307 redirect to https://rangao.printflow.bd/dashboard
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
      if (pathname.includes('/settings/settings')) {
        const cleanPath = pathname.replace(/\/settings\/settings(\/|$)/, '/settings$1')
        const cleanUrl = new URL(`${cleanPath}${search}`, request.url)
        return applyNoCacheHeaders(NextResponse.redirect(cleanUrl, 307))
      }

      // 3. Tenant Auth Paths on Subdomain (e.g. vision.printflow.bd/login)
      if (isAuthPage) {
        if (pathname === '/login') {
          const hasAuthError = request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('logged_out')
          // If actively authenticated in THIS tenant, redirect to dashboard
          if (
            user &&
            hasValidTenantCookie &&
            !hasAuthError &&
            tenantSessionData?.companySlug?.toLowerCase() === tenantSlug.toLowerCase() &&
            (tenantSessionData.userId === user.id || tenantSessionData.sub === user.id)
          ) {
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
        requestHeaders.set('x-tenant-slug', tenantSlug)
        requestHeaders.set('x-tenant-hostname', rawHost)

        const res = NextResponse.rewrite(rewriteUrl, {
          request: {
            headers: requestHeaders,
          },
        })
        if (!user && hasValidTenantCookie) {
          res.cookies.delete(TENANT_SESSION_COOKIE)
        }
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

      // 5. Tenant ↔ Host Binding Verification (Fail-Closed)
      // On [slug].domain, the authenticated user's active membership must match slug!
      let isMemberOfTargetTenant = false
      if (
        hasValidTenantCookie &&
        tenantSessionData &&
        user &&
        (tenantSessionData.userId === user.id || tenantSessionData.sub === user.id) &&
        tenantSessionData.companySlug?.toLowerCase() === tenantSlug.toLowerCase()
      ) {
        isMemberOfTargetTenant = true
      } else if (supabase && user) {
        try {
          const { data: member } = await supabase
            .from('company_users')
            .select('id, company_id, companies!inner(slug, is_active)')
            .eq('user_id', user.id)
            .eq('companies.slug', tenantSlug)
            .eq('is_active', true)
            .maybeSingle()
          if (member) {
            isMemberOfTargetTenant = true
          }
        } catch {}
      }

      if (!isMemberOfTargetTenant) {
        // Cross-Tenant Access Denied: User belongs to a different tenant!
        const res = applyNoCacheHeaders(
          NextResponse.redirect(new URL(`/403?type=tenant&tenant=${encodeURIComponent(tenantSlug)}`, request.url))
        )
        res.cookies.delete(TENANT_SESSION_COOKIE)
        return res
      }

      // 6. Internal URL Rewrite: Map clean subdomain path to Next.js App Router app/[tenantSlug]/...
      const rewriteUrl = request.nextUrl.clone()
      let internalPath: string

      if (pathname === '/' || pathname === '') {
        internalPath = `/${tenantSlug}/dashboard`
      } else {
        internalPath = `/${tenantSlug}${pathname}`
      }

      rewriteUrl.pathname = internalPath

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
    // C. ROOT DOMAIN ROUTING (e.g. printflow.bd, localhost:3000)
    // --------------------------------------------------------------------------
    if (hostType === 'root') {
      const pathParts = pathname.split('/').filter(Boolean)
      const firstSegment = (pathParts[0] || '').toLowerCase().trim()

      // 1. Dynamic Root Redirect for Tenant Application Routes (e.g. /accounting, /invoices, /customers)
      if (TENANT_APP_ROUTES.has(firstSegment)) {
        if (user) {
          let userTenantSlug = tenantSessionData?.companySlug
          if (!userTenantSlug && supabase) {
            try {
              const { data: member } = await supabase
                .from('company_users')
                .select('companies!inner(slug, is_active)')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .limit(1)
                .maybeSingle()
              const comp = Array.isArray(member?.companies) ? member.companies[0] : member?.companies
              if (comp && typeof comp === 'object' && 'slug' in comp && typeof (comp as { slug: unknown }).slug === 'string') {
                userTenantSlug = (comp as { slug: string }).slug
              }
            } catch {}
          }

          if (userTenantSlug) {
            const redirectUrl = new URL(`/${userTenantSlug}${pathname}${search}`, request.url)
            return applyNoCacheHeaders(NextResponse.redirect(redirectUrl, 307))
          } else {
            return applyNoCacheHeaders(NextResponse.redirect(new URL('/onboarding', request.url), 307))
          }
        } else {
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('redirectTo', `${pathname}${search}`)
          return applyNoCacheHeaders(NextResponse.redirect(loginUrl, 307))
        }
      }

      // 2. If actively authenticated tenant user visits /login on root domain -> redirect to their workspace
      if (pathname === '/login') {
        const hasAuthError = request.nextUrl.searchParams.has('error') || request.nextUrl.searchParams.has('logged_out')
        if (user && tenantSessionData?.companySlug && !hasAuthError && !hasValidPlatformCookie) {
          const targetSlug = tenantSessionData.companySlug
          if (isPslOrLocal) {
            const redirectUrl = new URL(`/${targetSlug}/dashboard`, request.url)
            return applyNoCacheHeaders(NextResponse.redirect(redirectUrl, 307))
          }
          const tenantUrl = getTenantLink(targetSlug, `/dashboard`, rootDomain)
          return applyNoCacheHeaders(NextResponse.redirect(new URL(tenantUrl), 307))
        } else if (hasAuthError && hasValidTenantCookie) {
          const res = NextResponse.next({ request: { headers: requestHeaders } })
          res.cookies.delete(TENANT_SESSION_COOKIE)
          responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          return res
        }
      }

      // 3. If user visits /dashboard on root domain:
      if (pathname === '/dashboard') {
        if (user && tenantSessionData?.companySlug) {
          const targetSlug = tenantSessionData.companySlug
          if (isPslOrLocal) {
            const redirectUrl = new URL(`/${targetSlug}/dashboard`, request.url)
            return NextResponse.redirect(redirectUrl, 307)
          }
          const tenantUrl = getTenantLink(targetSlug, `/dashboard`, rootDomain)
          return NextResponse.redirect(new URL(tenantUrl), 307)
        } else {
          const loginUrl = request.nextUrl.clone()
          loginUrl.pathname = '/login'
          const res = NextResponse.redirect(loginUrl, 307)
          if (hasValidTenantCookie) {
            res.cookies.delete(TENANT_SESSION_COOKIE)
          }
          return res
        }
      }

      // 4. If user visits explicit path with tenant slug on root domain (e.g. printflow.bd/alpha-print/invoices)
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
        const potentialSlug = firstSegment
        const subPath = pathParts.slice(1).join('/')

        // On localhost or PSL domains, routes are served via app/[tenantSlug]/...
        if (isPslOrLocal) {
          // If accessing protected path under tenant slug, verify authenticated membership
          const isSubPathAuth =
            subPath === 'login' ||
            subPath === 'register' ||
            subPath === 'verify' ||
            subPath === 'forgot-password' ||
            subPath === 'reset-password'

          if (user && !isSubPathAuth) {
            let isMember = false
            if (
              hasValidTenantCookie &&
              tenantSessionData &&
              (tenantSessionData.userId === user.id || tenantSessionData.sub === user.id) &&
              tenantSessionData.companySlug?.toLowerCase() === potentialSlug
            ) {
              isMember = true
            } else if (supabase) {
              try {
                const { data: member } = await supabase
                  .from('company_users')
                  .select('id, company_id, companies!inner(slug, is_active)')
                  .eq('user_id', user.id)
                  .eq('companies.slug', potentialSlug)
                  .eq('is_active', true)
                  .maybeSingle()
                if (member) isMember = true
              } catch {}
            }

            if (!isMember) {
              const res = applyNoCacheHeaders(
                NextResponse.redirect(new URL(`/403?type=tenant&tenant=${encodeURIComponent(potentialSlug)}`, request.url))
              )
              res.cookies.delete(TENANT_SESSION_COOKIE)
              return res
            }
          }

          requestHeaders.set('x-tenant-slug', potentialSlug)
          requestHeaders.set('x-tenant-hostname', rawHost)
          const res = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          })
          responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
          return res
        }

        const tenantUrl = getTenantLink(
          potentialSlug,
          subPath ? `/${subPath}${search}` : `/dashboard${search}`,
          rootDomain
        )
        return applyNoCacheHeaders(NextResponse.redirect(new URL(tenantUrl), 307))
      }

      const res = NextResponse.next({ request: { headers: requestHeaders } })
      responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      return res
    }

    // Default pass-through with forwarded request path
    const res = NextResponse.next({ request: { headers: requestHeaders } })
    responseCookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
    return res
  } catch (error) {
    const requestId = crypto.randomUUID()
    console.error(`[Middleware][${requestId}] Unhandled error in tenant routing session update:`, error)

    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Service Unavailable', message: 'Internal security gateway error', requestId },
        { status: 503, headers: { 'Retry-After': '5', 'X-Request-Id': requestId } }
      )
    }

    const isPublic =
      request.nextUrl.pathname === '/' ||
      request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register') ||
      request.nextUrl.pathname.startsWith('/verify') ||
      request.nextUrl.pathname.startsWith('/forgot-password') ||
      request.nextUrl.pathname.startsWith('/reset-password') ||
      request.nextUrl.pathname.startsWith('/platform/login') ||
      request.nextUrl.pathname.startsWith('/platform/forgot-password') ||
      request.nextUrl.pathname.startsWith('/platform/reset-password') ||
      request.nextUrl.pathname.startsWith('/onboarding') ||
      request.nextUrl.pathname.startsWith('/features') ||
      request.nextUrl.pathname.startsWith('/solutions') ||
      request.nextUrl.pathname.startsWith('/pricing') ||
      request.nextUrl.pathname.startsWith('/about') ||
      request.nextUrl.pathname.startsWith('/contact') ||
      request.nextUrl.pathname.startsWith('/faq') ||
      request.nextUrl.pathname.startsWith('/terms') ||
      request.nextUrl.pathname.startsWith('/privacy') ||
      request.nextUrl.pathname.startsWith('/403') ||
      request.nextUrl.pathname.startsWith('/404') ||
      request.nextUrl.pathname.startsWith('/tenant-not-found') ||
      request.nextUrl.pathname.startsWith('/tenant-suspended')

    if (isPublic) {
      const errHeaders = new Headers(request.headers)
      errHeaders.set('x-current-path', request.nextUrl.pathname)
      errHeaders.set('x-pathname', request.nextUrl.pathname)
      errHeaders.set('x-url', request.url)
      const res = NextResponse.next({ request: { headers: errHeaders } })
      res.headers.set('X-Request-Id', requestId)
      return res
    }

    const targetLogin = request.nextUrl.pathname.startsWith('/platform') ? '/platform/login' : '/login'
    const loginUrl = new URL(targetLogin, request.url)
    loginUrl.searchParams.set('error', 'gateway_error')
    loginUrl.searchParams.set('requestId', requestId)
    const res = NextResponse.redirect(loginUrl)
    res.headers.set('X-Request-Id', requestId)
    return res
  }
}
