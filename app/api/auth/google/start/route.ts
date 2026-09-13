import { NextResponse } from 'next/server'
import { generateGoogleAuthSignInUrl, getGoogleAuthClientConfig } from '@/lib/auth/google-auth'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = resolveRequestOrigin(request)
  const next = searchParams.get('next') || searchParams.get('redirectTo') || ''
  const purpose = (searchParams.get('purpose') as any) || 'login'
  const prompt = (searchParams.get('prompt') as any) || 'select_account'

  const config = getGoogleAuthClientConfig(origin)

  if (!config.isConfigured) {
    // If direct Google OAuth credentials are not yet configured in env,
    // redirect to login with actionable diagnostic feedback
    return NextResponse.redirect(
      `${origin}/login?error=oauth_error&error_description=${encodeURIComponent(
        'Google OAuth credentials (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) are not configured.'
      )}`
    )
  }

  const { url } = generateGoogleAuthSignInUrl({
    origin,
    next,
    purpose,
    prompt,
  })

  return NextResponse.redirect(url)
}
