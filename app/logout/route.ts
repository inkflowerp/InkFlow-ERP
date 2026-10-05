import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AuthService } from '@/services/auth.service'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'

import { resolveRequestOrigin } from '@/lib/security/runtime-env'

import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'

const SUPPORT_COOKIE_NAME = 'printflow_support_tenant'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  // 1. Delete Tenant & Platform cookies
  cookieStore.delete(TENANT_SESSION_COOKIE)
  cookieStore.delete(PLATFORM_SESSION_COOKIE)
  cookieStore.delete(SUPPORT_COOKIE_NAME)

  // 2. Clear Supabase auth session
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {
    // Non-blocking
  }

  try {
    await AuthService.signOut()
  } catch {
    // Non-blocking
  }

  // 3. Determine redirect target (prevent open redirect to external domains)
  const origin = resolveRequestOrigin(request)
  const candidateRedirect = request.nextUrl.searchParams.get('redirectTo')
  let safeRedirect = '/login?logged_out=true'

  if (
    candidateRedirect &&
    candidateRedirect.startsWith('/') &&
    !candidateRedirect.startsWith('//') &&
    !candidateRedirect.startsWith('/\\')
  ) {
    try {
      const parsed = new URL(candidateRedirect, origin)
      if (parsed.origin === origin) {
        safeRedirect = candidateRedirect
      }
    } catch {
      // Fall back to safe default
    }
  }

  const targetUrl = new URL(safeRedirect, origin)
  const response = NextResponse.redirect(targetUrl)

  // Force cookie deletion in response headers (both host-only and wildcard domain)
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined
  const cookieOpts = getAuthCookieOptions(requestHost)

  if (cookieOpts.domain) {
    response.cookies.delete({ name: TENANT_SESSION_COOKIE, domain: cookieOpts.domain, path: '/' })
    response.cookies.delete({ name: PLATFORM_SESSION_COOKIE, domain: cookieOpts.domain, path: '/' })
    response.cookies.delete({ name: SUPPORT_COOKIE_NAME, domain: cookieOpts.domain, path: '/' })
  }
  response.cookies.delete({ name: TENANT_SESSION_COOKIE, path: '/' })
  response.cookies.delete({ name: PLATFORM_SESSION_COOKIE, path: '/' })
  response.cookies.delete({ name: SUPPORT_COOKIE_NAME, path: '/' })

  // Anti-cache headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export async function POST(request: NextRequest) {
  return GET(request)
}
