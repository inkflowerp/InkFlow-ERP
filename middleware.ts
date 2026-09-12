import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next (all static, dev, HMR, and image files)
     * - favicon.ico (favicon file)
     * - manifest.json / manifest.webmanifest (PWA manifest)
     * - sw.js (service worker)
     * - robots.txt / sitemap.xml
     * - public files (images, fonts, icons, etc.)
     */
    '/((?!_next|favicon\\.ico|manifest\\.json|manifest\\.webmanifest|sw\\.js|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|webmanifest|js|txt|xml|woff|woff2|ttf|eot)$).*)',
  ],
}
