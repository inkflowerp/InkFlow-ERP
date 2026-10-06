import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AuthService } from '@/services/auth.service'
import { clearAllAuthCookies } from '@/actions/auth.actions'
import { invalidateTenantAuthCache } from '@/lib/auth/tenant-auth'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'
import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'

const SUPPORT_COOKIE_NAME = 'printflow_support_tenant'

export async function GET(request: NextRequest) {
  const cookieStore = await cookies()

  // 1. Invalidate in-memory tenant context cache
  invalidateTenantAuthCache()

  // 2. Comprehensive cookie purge on cookieStore
  await clearAllAuthCookies(cookieStore)

  // 3. Clear Supabase auth session
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  } catch {
    // Non-blocking
  }

  try {
    await AuthService.signOut()
  } catch {
    // Non-blocking
  }

  // 4. Determine redirect target (prevent open redirect to external domains)
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

  // 5. Force cookie deletion in response headers across all scopes
  const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined
  const cookieOpts = getAuthCookieOptions(requestHost)
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'printflow.bd'
  const domainsToClear = [undefined, cookieOpts.domain, `.${rootDomain}`, rootDomain]

  const cookieNamesToPurge = new Set<string>([
    TENANT_SESSION_COOKIE,
    PLATFORM_SESSION_COOKIE,
    SUPPORT_COOKIE_NAME,
    'printflow_support_tenant',
    'printflow_handoff_token',
    'printflow_temp_handoff',
  ])

  request.cookies.getAll().forEach((c) => {
    if (
      c.name.startsWith('sb-') ||
      c.name.startsWith('printflow_') ||
      c.name.includes('-auth-token') ||
      c.name.includes('session')
    ) {
      cookieNamesToPurge.add(c.name)
    }
  })

  for (const name of cookieNamesToPurge) {
    for (const domain of domainsToClear) {
      try {
        response.cookies.set(name, '', {
          path: '/',
          domain: domain || undefined,
          maxAge: 0,
          expires: new Date(0),
          sameSite: 'lax',
        })
        if (domain) {
          response.cookies.delete({ name, domain, path: '/' })
        } else {
          response.cookies.delete(name)
        }
      } catch {}
    }
  }

  // Anti-cache headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export async function POST(request: NextRequest) {
  return GET(request)
}
