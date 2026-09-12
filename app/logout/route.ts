import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { AuthService } from '@/services/auth.service'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE } from '@/lib/auth/types'

const SUPPORT_COOKIE_NAME = 'printerp_support_tenant'

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

  // 3. Determine redirect target (default to /login with logged_out param)
  const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/login?logged_out=true'
  const targetUrl = new URL(redirectTo, request.nextUrl.origin)

  const response = NextResponse.redirect(targetUrl)

  // Force cookie deletion in response headers
  response.cookies.delete(TENANT_SESSION_COOKIE)
  response.cookies.delete(PLATFORM_SESSION_COOKIE)
  response.cookies.delete(SUPPORT_COOKIE_NAME)

  // Anti-cache headers
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')

  return response
}

export async function POST(request: NextRequest) {
  return GET(request)
}
