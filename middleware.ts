import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request)
  } catch (error) {
    const requestId = crypto.randomUUID()
    console.error(`[Middleware][${requestId}] Fatal unhandled error in routing middleware:`, error)

    const pathname = request.nextUrl.pathname

    // Fail-closed for API routes
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Service Unavailable', message: 'Internal routing error', requestId },
        { status: 503, headers: { 'Retry-After': '5', 'X-Request-Id': requestId } }
      )
    }

    // Public / static / marketing / auth paths may continue
    const isPublic =
      pathname === '/' ||
      pathname === '/login' ||
      pathname === '/register' ||
      pathname === '/verify' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname.startsWith('/platform/login') ||
      pathname.startsWith('/platform/forgot-password') ||
      pathname.startsWith('/platform/reset-password') ||
      pathname.startsWith('/onboarding') ||
      pathname.startsWith('/features') ||
      pathname.startsWith('/solutions') ||
      pathname.startsWith('/pricing') ||
      pathname.startsWith('/about') ||
      pathname.startsWith('/contact') ||
      pathname.startsWith('/faq') ||
      pathname.startsWith('/terms') ||
      pathname.startsWith('/privacy') ||
      pathname.startsWith('/auth/') ||
      pathname.startsWith('/403') ||
      pathname.startsWith('/404') ||
      pathname.startsWith('/tenant-not-found') ||
      pathname.startsWith('/tenant-suspended')

    if (isPublic) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-current-path', pathname)
      requestHeaders.set('x-pathname', pathname)
      requestHeaders.set('x-url', request.url)
      const res = NextResponse.next({ request: { headers: requestHeaders } })
      res.headers.set('X-Request-Id', requestId)
      return res
    }

    // Protected paths: fail-closed redirect to /login or /platform/login
    const targetLogin = pathname.startsWith('/platform') ? '/platform/login' : '/login'
    const loginUrl = new URL(targetLogin, request.url)
    loginUrl.searchParams.set('error', 'gateway_error')
    loginUrl.searchParams.set('requestId', requestId)
    const res = NextResponse.redirect(loginUrl)
    res.headers.set('X-Request-Id', requestId)
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json / manifest.webmanifest (PWA manifest)
     * - sw.js (service worker)
     * - robots.txt / sitemap.xml
     * - public asset extensions (images, fonts, audio, video)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|js|txt|xml|woff|woff2|ttf|eot)$).*)',
  ],
}
