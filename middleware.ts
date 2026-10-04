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
      const res = NextResponse.next({ request })
      res.headers.set('X-Request-Id', requestId)
      return res
    }

    // Protected paths: fail-closed redirect to /login
    const loginUrl = new URL('/login', request.url)
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
