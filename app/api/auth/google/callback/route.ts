import { NextResponse } from 'next/server'
import {
  verifyGoogleAuthState,
  exchangeGoogleAuthCode,
  verifyGoogleTokenIdentity,
  authenticateGoogleUser,
  getGoogleAuthClientConfig,
} from '@/lib/auth/google-auth'
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'
import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = resolveRequestOrigin(request)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')
  const errorDesc = searchParams.get('error_description')

  // 1. Handle User Cancellations or OAuth Errors from Google
  if (errorParam) {
    if (errorParam === 'access_denied' || errorDesc?.toLowerCase().includes('cancel')) {
      return NextResponse.redirect(`${origin}/login?error=cancelled`)
    }
    const descParam = errorDesc
      ? `&error_description=${encodeURIComponent(errorDesc)}`
      : `&error_description=${encodeURIComponent(errorParam)}`
    return NextResponse.redirect(`${origin}/login?error=oauth_error${descParam}`)
  }

  // 2. Validate Code & Signed CSRF State
  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(
        'No authorization code returned from Google.'
      )}`
    )
  }

  const statePayload = verifyGoogleAuthState(state)
  if (!statePayload) {
    return NextResponse.redirect(
      `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(
        'OAuth session expired or CSRF state mismatch. Please try signing in again.'
      )}`
    )
  }

  try {
    const config = getGoogleAuthClientConfig(origin)

    // 3. Server-to-server token exchange with Google
    const tokenRes = await exchangeGoogleAuthCode(code, config.redirectUri)
    if (!tokenRes.success || !tokenRes.data) {
      console.error('[Google OAuth Callback] Token exchange failed:', tokenRes.error)
      return NextResponse.redirect(
        `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(
          tokenRes.error || 'Failed to exchange authorization code with Google.'
        )}`
      )
    }

    // 4. Verify ID Token & Identity
    const identityRes = await verifyGoogleTokenIdentity(tokenRes.data)
    if (!identityRes.success || !identityRes.data) {
      return NextResponse.redirect(
        `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(
          identityRes.error || 'Failed to verify Google user identity.'
        )}`
      )
    }

    const identity = identityRes.data

    // 5. Authenticate user, sync profiles, enforce platform admin boundaries, and resolve tenant workspace
    const authRes = await authenticateGoogleUser(identity, { next: statePayload.next })

    if (!authRes.success || !authRes.data) {
      const errorMsg = authRes.error || 'Authentication failed'
      if (errorMsg.includes('Platform administrators')) {
        return NextResponse.redirect(
          `${origin}/platform/login?error=platform_user_on_tenant_portal`
        )
      }
      if (errorMsg.includes('deactivated') || errorMsg.includes('disabled')) {
        return NextResponse.redirect(`${origin}/login?error=disabled`)
      }
      return NextResponse.redirect(
        `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(errorMsg)}`
      )
    }

    const { session, destinationUrl } = authRes.data
    const destination = destinationUrl.startsWith('http')
      ? destinationUrl
      : `${origin}${destinationUrl}`

    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined
    const cookieOpts = getAuthCookieOptions(requestHost)

    const redirectResponse = NextResponse.redirect(destination)
    redirectResponse.cookies.set(
      TENANT_SESSION_COOKIE,
      encodeURIComponent(JSON.stringify(session)),
      {
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
        sameSite: 'lax',
        secure: cookieOpts.secure,
        domain: cookieOpts.domain,
      }
    )

    // 6. Establish authoritative Supabase SSR Auth session cookies
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin')
        const { createServerClient } = await import('@supabase/ssr')
        const admin = createAdminClient()
        const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: identity.email.trim().toLowerCase(),
        })

        if (!linkErr && linkData?.properties?.hashed_token) {
          const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
            cookieOptions: cookieOpts.domain ? { domain: cookieOpts.domain } : undefined,
            cookies: {
              getAll() {
                return []
              },
              setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value, options }) => {
                  redirectResponse.cookies.set(name, value, {
                    ...options,
                    domain: cookieOpts.domain,
                  })
                })
              },
            },
          })

          await supabase.auth.verifyOtp({
            token_hash: linkData.properties.hashed_token,
            type: 'email',
          })
        }
      } catch (ssrErr) {
        console.warn('[Google OAuth Callback] Supabase SSR session cookie synchronization note:', ssrErr)
      }
    }

    return redirectResponse
  } catch (err: any) {
    console.error('[Google OAuth Callback] Unexpected exception:', err)
    return NextResponse.redirect(
      `${origin}/login?error=oauth_failure&error_description=${encodeURIComponent(
        err?.message || 'An unexpected error occurred during Google sign-in.'
      )}`
    )
  }
}
