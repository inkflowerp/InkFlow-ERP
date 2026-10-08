import { NextResponse } from 'next/server'
import { AuthService } from '@/services/auth.service'
import { AuthEmailService } from '@/services/auth-email.service'
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'
import { establishResponseSession } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const urlObj = new URL(request.url)
  const searchParams = urlObj.searchParams
  const origin = resolveRequestOrigin(request)
  const token = searchParams.get('token')
  const email = searchParams.get('email') || ''

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=invalid_verification_link`)
  }

  try {
    // 1. Authoritatively verify token and determine genuine purpose from stored database record
    const verifyRes = await AuthEmailService.verifyToken(token, email)

    if (!verifyRes.success) {
      const candidateEmail = (verifyRes.email || email || '').trim().toLowerCase()
      if (verifyRes.error?.includes('already been used') && candidateEmail) {
        // Auto-recover already used registration token into active session
        const statusRes = await AuthService.checkRegistrationVerificationStatus(candidateEmail)
        if (statusRes.success && statusRes.data?.isVerified && statusRes.data.session) {
          const session = statusRes.data.session
          const destination =
            session.companySlug && !statusRes.data.requiresOnboarding
              ? getTenantLink(session.companySlug, '/dashboard')
              : `${origin}/onboarding`

          const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined
          const cookieOpts = getAuthCookieOptions(requestHost)
          const redirectResponse = NextResponse.redirect(destination)
          redirectResponse.cookies.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), {
            path: cookieOpts.path,
            maxAge: cookieOpts.maxAge,
            sameSite: cookieOpts.sameSite,
            secure: cookieOpts.secure,
            domain: cookieOpts.domain,
            httpOnly: cookieOpts.httpOnly ?? false,
          })
          await establishResponseSession(redirectResponse, candidateEmail, requestHost)
          return redirectResponse
        }
      }

      const errorMsg = encodeURIComponent(verifyRes.error || 'This verification link has expired or is invalid.')
      if (email) {
        return NextResponse.redirect(`${origin}/verify?email=${encodeURIComponent(email)}&error=${errorMsg}`)
      }
      return NextResponse.redirect(`${origin}/login?error=${errorMsg}`)
    }

    const resolvedEmail = verifyRes.email || email

    // 2. Handle Registration Purpose
    if (verifyRes.purpose === 'registration') {
      const authRes = await AuthService.finalizeRegistrationVerification(resolvedEmail, verifyRes.userId)

      if (authRes.success && authRes.data) {
        const session = authRes.data.session
        const destination =
          session.companySlug && !authRes.data.requiresOnboarding
            ? getTenantLink(session.companySlug, '/dashboard')
            : `${origin}/onboarding`

        const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || undefined
        const cookieOpts = getAuthCookieOptions(requestHost)
        const redirectResponse = NextResponse.redirect(destination)
        redirectResponse.cookies.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), {
          path: cookieOpts.path,
          maxAge: cookieOpts.maxAge,
          sameSite: cookieOpts.sameSite,
          secure: cookieOpts.secure,
          domain: cookieOpts.domain,
          httpOnly: cookieOpts.httpOnly ?? false,
        })

        // Mint Supabase SSR session tokens directly on the redirect response
        await establishResponseSession(redirectResponse, resolvedEmail, requestHost)

        return redirectResponse
      }

      const errorMsg = encodeURIComponent(authRes.error || 'Verification link failed.')
      return NextResponse.redirect(`${origin}/verify?email=${encodeURIComponent(resolvedEmail)}&error=${errorMsg}`)
    }

    // 3. Handle Password Reset Purpose
    if (verifyRes.purpose === 'password_reset') {
      if (verifyRes.resetToken) {
        return NextResponse.redirect(
          `${origin}/reset-password?token=${encodeURIComponent(verifyRes.resetToken)}&email=${encodeURIComponent(resolvedEmail)}`
        )
      }

      return NextResponse.redirect(`${origin}/forgot-password?error=failed_to_issue_reset_token`)
    }

    return NextResponse.redirect(`${origin}/login`)
  } catch (err: any) {
    console.error('[Auth Link Verify Route Error]', err)
    return NextResponse.redirect(
      `${origin}/login?error=verification_failure&error_description=${encodeURIComponent(err?.message || 'Verification failed')}`
    )
  }
}
