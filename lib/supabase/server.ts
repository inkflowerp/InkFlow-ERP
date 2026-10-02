import { createServerClient } from '@supabase/ssr'
import type { Database } from '../../types/database.types.ts'
import { getAuthCookieOptions } from '../tenant/tenant-resolution.ts'

export async function createClient() {

  let cookieStore: any = {
    getAll: () => [],
    set: () => {},
  }

  let requestHost: string | undefined

  try {
    const { cookies, headers } = await import('next/headers')
    cookieStore = await cookies()
    try {
      const headerStore = await headers()
      requestHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || undefined
    } catch {}
  } catch {
    // Standalone Node.js / test environment without Next.js headers
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'FAIL CLOSED: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_PUBLISHABLE_KEY) must be configured.'
    )
  }

  const baseCookieOptions = getAuthCookieOptions(requestHost)

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: baseCookieOptions.domain ? { domain: baseCookieOptions.domain } : undefined,
      cookies: {
        getAll() {
          return typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : []
        },
        setAll(cookiesToSet) {
          try {
            if (typeof cookieStore.set === 'function') {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  domain: baseCookieOptions.domain || undefined,
                })
              )
            }
          } catch {
            // Ignored in server component context
          }
        },
      },
    }
  )
}

/**
 * Creates a server client scoped to an active NextResponse object for route handlers.
 * Guarantees that cookies set by Supabase Auth are attached directly to the HTTP response.
 */
export function createClientForResponse(response: import('next/server').NextResponse, requestHost?: string) {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables missing')
  }

  const baseCookieOptions = getAuthCookieOptions(requestHost)

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: baseCookieOptions.domain ? { domain: baseCookieOptions.domain } : undefined,
      cookies: {
        getAll() {
          return response.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              domain: baseCookieOptions.domain || undefined,
            })
          })
        },
      },
    }
  )
}

/**
 * Establishes an authoritative Supabase SSR auth session on the server for a verified user.
 * Mints the session cookies into next/headers cookies(), fixing production session loss.
 */
export async function establishServerSession(email: string, customDomain?: string): Promise<boolean> {
  const { isTestEnvironment } = await import('../security/runtime-env.ts')
  if (isTestEnvironment()) {
    return true
  }

  try {
    const { createAdminClient } = await import('./admin.ts')
    const normalizedEmail = email.trim().toLowerCase()
    const admin = createAdminClient()
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (linkErr || !linkData?.properties) {
      console.warn('[establishServerSession] generateLink failed:', linkErr)
      return false
    }

    const supabase = await createClient()
    const hashedToken = (linkData.properties as any).hashed_token
    const emailOtp = (linkData.properties as any).email_otp

    if (hashedToken) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: hashedToken,
        type: 'email',
      })
      if (verifyErr) {
        console.warn('[establishServerSession] verifyOtp with token_hash failed:', verifyErr)
        return false
      }
      return true
    } else if (emailOtp) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: emailOtp,
        type: 'email',
      })
      if (verifyErr) {
        console.warn('[establishServerSession] verifyOtp with emailOtp failed:', verifyErr)
        return false
      }
      return true
    }

    return false
  } catch (err) {
    console.warn('[establishServerSession] Exception:', err)
    return false
  }
}

/**
 * Establishes an authoritative Supabase SSR auth session directly onto a NextResponse object.
 * Used by Route Handlers returning redirects to guarantee auth cookies are not dropped.
 */
export async function establishResponseSession(
  response: import('next/server').NextResponse,
  email: string,
  requestHost?: string
): Promise<boolean> {
  const { isTestEnvironment } = await import('../security/runtime-env.ts')
  if (isTestEnvironment()) {
    return true
  }

  try {
    const { createAdminClient } = await import('./admin.ts')
    const normalizedEmail = email.trim().toLowerCase()
    const admin = createAdminClient()
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: normalizedEmail,
    })

    if (linkErr || !linkData?.properties) {
      console.warn('[establishResponseSession] generateLink failed:', linkErr)
      return false
    }

    const supabase = createClientForResponse(response, requestHost)
    const hashedToken = (linkData.properties as any).hashed_token
    const emailOtp = (linkData.properties as any).email_otp

    if (hashedToken) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: hashedToken,
        type: 'email',
      })
      if (verifyErr) {
        console.warn('[establishResponseSession] verifyOtp with token_hash failed:', verifyErr)
        return false
      }
      return true
    } else if (emailOtp) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: normalizedEmail,
        token: emailOtp,
        type: 'email',
      })
      if (verifyErr) {
        console.warn('[establishResponseSession] verifyOtp with emailOtp failed:', verifyErr)
        return false
      }
      return true
    }

    return false
  } catch (err) {
    console.warn('[establishResponseSession] Exception:', err)
    return false
  }
}

