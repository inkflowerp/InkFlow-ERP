'use server'

import { AuthService } from '../services/auth.service.ts'
import { AuditService } from '../services/audit.service.ts'
import { checkRateLimitAsync } from '../lib/security/rate-limiter.ts'
import { TENANT_SESSION_COOKIE, PLATFORM_SESSION_COOKIE, type TenantSessionData } from '../lib/auth/types.ts'
import { getCurrentTenant, invalidateTenantAuthCache } from '../lib/auth/tenant-auth.ts'
import { createClient } from '../lib/supabase/server.ts'
import { resolveRequestOrigin } from '../lib/security/runtime-env.ts'
import { getAuthCookieOptions, resolveHostname, resolveTenant, isReservedSlug } from '../lib/tenant/tenant-resolution.ts'
import { getTenantLink, getTenantBaseUrl } from '../lib/tenant/tenant-url.ts'
import { createSubdomainHandoffToken } from '../lib/auth/subdomain-handoff.ts'
import { signSessionToken, verifySessionToken } from '../lib/security/session-signer.ts'
import { TenantRepository } from '../lib/repositories/tenant.repository.ts'

async function getCookieStore(customCookieStore?: any) {
  if (customCookieStore) return customCookieStore
  try {
    const { cookies } = await import('next/headers')
    return await cookies()
  } catch {
    return {
      getAll: () => [],
      get: () => undefined,
      set: () => {},
      delete: () => {},
    }
  }
}

async function getHeaderStore(): Promise<{ get: (key: string) => string | null }> {
  try {
    const { headers } = await import('next/headers')
    const h = await headers()
    return {
      get: (key: string) => h.get(key) ?? null,
    }
  } catch {
    return new Headers()
  }
}

async function safeRevalidatePath(path: string, type?: 'page' | 'layout') {
  try {
    const { revalidatePath } = await import('next/cache')
    revalidatePath(path, type)
  } catch {}
}

async function safeRedirect(url: string) {
  const { redirect } = await import('next/navigation')
  redirect(url)
}

async function getRequestBaseUrl(): Promise<string> {
  try {
    const headerStore = await getHeaderStore()
    return resolveRequestOrigin(headerStore)
  } catch {
    return resolveRequestOrigin()
  }
}

async function getCookieOptions() {
  try {
    const headerStore = await getHeaderStore()
    const requestHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || undefined
    return getAuthCookieOptions(requestHost)
  } catch {
    return getAuthCookieOptions()
  }
}

/**
 * Sweeps and purges all authentication and session cookies across all domain scopes.
 * Removes host-only, wildcard-domain, and chunked Supabase auth tokens.
 */
export async function clearAllAuthCookies(customCookieStore?: any) {
  const cookieStore = await getCookieStore(customCookieStore)
  const opts = await getCookieOptions()
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'printflow.bd'

  const domainsToClear: Array<string | undefined> = [undefined]
  if (opts.domain && !domainsToClear.includes(opts.domain)) {
    domainsToClear.push(opts.domain)
  }
  if (rootDomain) {
    if (!domainsToClear.includes(`.${rootDomain}`)) domainsToClear.push(`.${rootDomain}`)
    if (!domainsToClear.includes(rootDomain)) domainsToClear.push(rootDomain)
  }

  const standardAuthCookies = [
    TENANT_SESSION_COOKIE,
    PLATFORM_SESSION_COOKIE,
    'printflow_support_tenant',
    'printflow_handoff_token',
    'printflow_temp_handoff',
  ]

  const allCurrentCookies = typeof cookieStore.getAll === 'function' ? cookieStore.getAll() : []
  const cookieNamesToPurge = new Set<string>(standardAuthCookies)

  for (const c of allCurrentCookies) {
    if (
      c.name.startsWith('sb-') ||
      c.name.startsWith('printflow_') ||
      c.name.includes('-auth-token') ||
      c.name.includes('session')
    ) {
      cookieNamesToPurge.add(c.name)
    }
  }

  for (const name of cookieNamesToPurge) {
    for (const domain of domainsToClear) {
      try {
        cookieStore.set(name, '', {
          path: '/',
          domain: domain || undefined,
          maxAge: 0,
          expires: new Date(0),
          sameSite: 'lax',
          httpOnly: true,
        })
      } catch {}

      try {
        if (domain) {
          cookieStore.delete({ name, domain, path: '/' })
        } else {
          cookieStore.delete(name)
        }
      } catch {}
    }
  }
}

export async function clearTenantSessionCookie() {
  await clearAllAuthCookies()
}

export async function checkIdentifierAvailabilityAction(params: {
  email?: string | null
  username?: string | null
  phone?: string | null
  employeeIdNumber?: string | null
  excludeUserId?: string | null
  excludeEmployeeId?: string | null
  companyId?: string | null
}) {
  return await AuthService.validateIdentifierUniqueness(params)
}

export async function loginAction(formData: FormData) {
  const email =
    (formData.get('email') as string) ||
    (formData.get('identifier') as string) ||
    (formData.get('username') as string) ||
    ''
  const password = (formData.get('password') as string) || ''
  const redirectTo = (formData.get('redirectTo') as string) || ''

  if (!email || !password) {
    return { success: false, error: 'Email, username, or mobile number and password are required' }
  }

  // Enforce sliding window rate limit on auth attempts
  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  let targetCompanySlug: string | undefined
  try {
    const headerStore = await getHeaderStore()
    const headerSlug = headerStore.get('x-tenant-slug')
    if (headerSlug && !isReservedSlug(headerSlug)) {
      targetCompanySlug = headerSlug
    } else {
      const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
      const hostRes = resolveHostname(host)
      if (hostRes.hostType === 'tenant' && hostRes.tenantSlug) {
        targetCompanySlug = hostRes.tenantSlug
      } else if (hostRes.hostType === 'root') {
        // Direct root domain login allowed: targetCompanySlug will be resolved from user membership
        targetCompanySlug = undefined
      }
    }
  } catch {}

  const result = await AuthService.signIn(email, password, targetCompanySlug)
  if (!result.success || !result.data) {
    await clearTenantSessionCookie()
    return result
  }

  const session = result.data.session

  // Store cryptographically signed tenant session cookie
  const cookieStore = await getCookieStore()
  const signedSession = await signSessionToken(session, '7d')
  cookieStore.set(TENANT_SESSION_COOKIE, signedSession, await getCookieOptions())

  // Audit track successful login with the verified user ID and company
  if (session.companyId) {
    try {
      await AuditService.trackLogin(session.companyId, session.userId, session.userEmail)
    } catch {
      // Non-blocking
    }
  }

  await safeRevalidatePath('/', 'layout')

  if (result.data.requiresOnboarding || !session.companySlug) {
    await safeRedirect('/onboarding')
  }

  const targetPath = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login')
    ? redirectTo
    : '/dashboard'

  let isLocalRequest = false
  try {
    const headerStore = await getHeaderStore()
    const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase().split(':')[0]
    if (
      host.includes('localhost') ||
      host.includes('127.0.0.1')
    ) {
      isLocalRequest = true
    }
  } catch {}

  if (isLocalRequest) {
    let clean = targetPath
    if (clean.startsWith(`/${session.companySlug}/`)) {
      clean = clean.slice(`/${session.companySlug}`.length)
    } else if (clean === `/${session.companySlug}`) {
      clean = '/dashboard'
    }
    const cleanDestination = clean.startsWith('/') ? clean : `/${clean}`
    await safeRedirect(`/${session.companySlug}${cleanDestination}`)
  }

  let destinationUrl = getTenantLink(session.companySlug, targetPath)
  try {
    const handoffToken = await createSubdomainHandoffToken({
      userId: session.userId,
      email: session.userEmail,
      slug: session.companySlug,
      sessionData: session,
      authTokens: result.data.authTokens,
    })
    destinationUrl = `${getTenantBaseUrl(session.companySlug)}/api/auth/handoff?token=${handoffToken}&next=${encodeURIComponent(targetPath)}`
  } catch (handoffErr) {
    console.warn('[loginAction] Failed to create subdomain handoff token, falling back to direct link:', handoffErr)
  }

  await safeRedirect(destinationUrl)
}

export async function signInAction(email: string, pass: string, redirectTo?: string) {
  if (!email || !pass) {
    return { success: false, error: 'Email and password are required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  let targetCompanySlug: string | undefined
  let isRootHost = false
  let requestHost = ''
  try {
    const headerStore = await getHeaderStore()
    requestHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || ''
    const headerSlug = headerStore.get('x-tenant-slug')
    if (headerSlug && !isReservedSlug(headerSlug)) {
      targetCompanySlug = headerSlug
    } else {
      const referer = headerStore.get('referer') || ''
      let pathFromReferer = ''
      try {
        if (referer) pathFromReferer = new URL(referer).pathname
      } catch {}
      const tenantRes = resolveTenant(requestHost, pathFromReferer)
      if (tenantRes.type === 'tenant' && tenantRes.slug) {
        targetCompanySlug = tenantRes.slug
      } else {
        const hostRes = resolveHostname(requestHost)
        if (hostRes.hostType === 'root') {
          isRootHost = true
          targetCompanySlug = undefined
        }
      }
    }
  } catch {}

  const result = await AuthService.signIn(email, pass, targetCompanySlug)
  if (!result.success || !result.data) {
    await clearTenantSessionCookie()
    return result
  }

  const session = result.data.session
  const cookieStore = await getCookieStore()
  const signedSession = await signSessionToken(session, '7d')
  cookieStore.set(TENANT_SESSION_COOKIE, signedSession, await getCookieOptions())

  if (session.companyId) {
    try {
      await AuditService.trackLogin(session.companyId, session.userId, session.userEmail)
    } catch {
      // Non-blocking
    }
  }

  // Calculate destination URL for client redirect
  let destinationUrl = '/dashboard'
  if (result.data.requiresOnboarding || !session.companySlug) {
    destinationUrl = '/onboarding'
  } else {
    const targetPath = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login')
      ? redirectTo
      : '/dashboard'

    let isLocalRequest = false
    const hostLower = requestHost.toLowerCase().split(':')[0]
    if (
      hostLower.includes('localhost') ||
      hostLower.includes('127.0.0.1')
    ) {
      isLocalRequest = true
    }

    if (isLocalRequest) {
      let clean = targetPath
      if (clean.startsWith(`/${session.companySlug}/`)) {
        clean = clean.slice(`/${session.companySlug}`.length)
      } else if (clean === `/${session.companySlug}`) {
        clean = '/dashboard'
      }
      const cleanDestination = clean.startsWith('/') ? clean : `/${clean}`
      destinationUrl = `/${session.companySlug}${cleanDestination}`
    } else {
      destinationUrl = getTenantLink(session.companySlug, targetPath)
      if (isRootHost) {
        try {
          const handoffToken = await createSubdomainHandoffToken({
            userId: session.userId,
            email: session.userEmail,
            slug: session.companySlug,
            sessionData: session,
            authTokens: result.data.authTokens,
          })
          destinationUrl = `${getTenantBaseUrl(session.companySlug)}/api/auth/handoff?token=${handoffToken}&next=${encodeURIComponent(targetPath)}`
        } catch (handoffErr) {
          console.warn('[signInAction] Subdomain handoff generation failed, using direct tenant link:', handoffErr)
        }
      }
    }
  }

  return {
    ...result,
    destinationUrl,
  }
}

export async function signUpAction(data: {
  email: string
  password?: string
  fullName: string
  companyName?: string
  phone?: string
  locale?: string
}): Promise<{
  success: boolean
  error?: string
  requiresVerification?: boolean
  email?: string
  userId?: string
  message?: string
}> {
  if (!data.email || !data.fullName || !data.password) {
    return { success: false, error: 'Full name, email address, and password are required.' }
  }

  if (data.password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }

  const rateLimit = await checkRateLimitAsync(data.email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many registration attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  const appUrl = await getRequestBaseUrl()
  const result = await AuthService.signUp(
    data.email,
    data.password,
    data.fullName,
    data.phone,
    appUrl
  )

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Registration failed',
    }
  }

  // Clear any previous active tenant session cookie until email is verified
  const cookieStore = await getCookieStore()
  cookieStore.delete(TENANT_SESSION_COOKIE)

  return {
    success: true,
    requiresVerification: true,
    email: result.data.email,
    userId: result.data.userId,
    message: result.message || 'A 6-digit verification code has been sent to your email address.',
  }
}

export async function verifyRegistrationOtpAction(email: string, otp: string) {
  if (!email || !otp) {
    return { success: false, error: 'Email and verification code are required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many verification attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  const result = await AuthService.verifyRegistrationOtp(email, otp)
  if (!result.success || !result.data) {
    return result
  }

  const session = result.data.session
  const cookieOpts = await getCookieOptions()
  const cookieStore = await getCookieStore()
  const signedSession = await signSessionToken(session, '7d')
  cookieStore.set(TENANT_SESSION_COOKIE, signedSession, cookieOpts)

  // Establish Supabase SSR auth token cookies on server
  if (session.userEmail) {
    await AuthService.establishServerSession(email, cookieOpts.domain)
  }

  await safeRevalidatePath('/', 'layout')
  return result
}

export async function verifyRegistrationTokenAction(token: string, email?: string | null) {
  if (!token) {
    return { success: false, error: 'Verification token is required' }
  }

  // 1. Session Isolation: Purge any active owner/stale session cookies before verifying invited user
  await clearAllAuthCookies()
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch {}

  const result = await AuthService.verifyRegistrationToken(token, email)
  if (!result.success || !result.data) {
    return result
  }

  const session = result.data.session
  const cookieOpts = await getCookieOptions()
  const cookieStore = await getCookieStore()
  const signedSession = await signSessionToken(session, '7d')
  cookieStore.set(TENANT_SESSION_COOKIE, signedSession, cookieOpts)

  // Establish Supabase SSR auth token cookies on server
  if (session.userEmail) {
    await AuthService.establishServerSession(session.userEmail, cookieOpts.domain)
  }

  await safeRevalidatePath('/', 'layout')
  return result
}

export async function checkEmailVerificationStatusAction(email: string) {
  if (!email) {
    return { success: true, data: { isVerified: false } }
  }

  const result = await AuthService.checkRegistrationVerificationStatus(email)
  if (result.success && result.data?.isVerified && result.data.session) {
    const session = result.data.session
    const cookieOpts = await getCookieOptions()
    const cookieStore = await getCookieStore()

    // Ensure stale session from another account is purged
    const existingCookie = cookieStore.get(TENANT_SESSION_COOKIE)?.value
    if (existingCookie) {
      try {
        const existingSession = await verifySessionToken<TenantSessionData>(existingCookie)
        if (existingSession && existingSession.userEmail?.toLowerCase() !== email.toLowerCase()) {
          await clearAllAuthCookies()
        }
      } catch {}
    }

    const signedSession = await signSessionToken(session, '7d')
    cookieStore.set(TENANT_SESSION_COOKIE, signedSession, cookieOpts)

    // Establish Supabase SSR auth token cookies on server
    await AuthService.establishServerSession(email, cookieOpts.domain)
    await safeRevalidatePath('/', 'layout')
  }

  return result
}

/**
 * Checks whether the current request session or user has verified email status.
 */
export async function checkEmailVerifiedAction(): Promise<boolean> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user && (user.email_confirmed_at || (user as any).confirmed_at)) {
      return true
    }
    const cookieStore = await getCookieStore()
    const sessionCookie = cookieStore.get(TENANT_SESSION_COOKIE)?.value
    if (sessionCookie) {
      const verified = await verifySessionToken<TenantSessionData>(sessionCookie)
      if (verified?.userId) return true
    }
    return false
  } catch {
    return false
  }
}

export async function resendVerificationOtpAction(
  email: string,
  purpose: 'registration' | 'password_reset' = 'registration'
) {
  if (!email) {
    return { success: false, error: 'Email address is required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Please wait ${rateLimit.resetSeconds} seconds before requesting a new code.`,
    }
  }

  const appUrl = await getRequestBaseUrl()
  return await AuthService.resendVerification(email, purpose, appUrl)
}

export async function forgotPasswordAction(email: string) {
  if (!email) {
    return { success: false, error: 'Email address is required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many password reset requests. Please wait ${rateLimit.resetSeconds} seconds.`,
    }
  }

  const appUrl = await getRequestBaseUrl()
  return await AuthService.forgotPassword(email, appUrl)
}

export async function verifyPasswordResetOtpAction(email: string, otp: string) {
  if (!email || !otp) {
    return { success: false, error: 'Email and verification code are required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  return await AuthService.verifyPasswordResetOtp(email, otp)
}

export async function verifyPasswordResetTokenAction(token: string, email?: string | null) {
  if (!token) {
    return { success: false, error: 'Reset token is required' }
  }

  return await AuthService.verifyPasswordResetToken(token, email)
}

export async function confirmPasswordResetAction(
  email: string,
  resetToken: string,
  newPassword: string
) {
  if (!email || !resetToken || !newPassword) {
    return { success: false, error: 'Email, reset authorization token, and new password are required' }
  }

  const rateLimit = await checkRateLimitAsync(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  const result = await AuthService.confirmPasswordReset(email, resetToken, newPassword)

  if (result.success) {
    await clearTenantSessionCookie()
  }

  return result
}

export async function resetPasswordAction(newPassword: string) {
  return await AuthService.resetPassword(newPassword)
}

export async function signOutAction(): Promise<{ success: boolean; redirectUrl: string }> {
  const currentTenant = await getCurrentTenant()

  if (currentTenant) {
    try {
      await AuditService.trackLogout(
        currentTenant.companyId,
        currentTenant.userId,
        currentTenant.userEmail
      )
    } catch {
      // Non-blocking
    }
  }

  // 1. Invalidate fast-path in-memory tenant context cache
  invalidateTenantAuthCache(currentTenant?.userId)

  // 2. Comprehensive cookie purge across all scopes
  await clearAllAuthCookies()

  // 3. Revoke Supabase auth session on server
  try {
    const supabase = await createClient()
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
  } catch {}

  try {
    await AuthService.signOut()
  } catch {}

  // 4. Invalidate all Next.js cached layouts
  await safeRevalidatePath('/', 'layout')

  return { success: true, redirectUrl: '/login?logged_out=true' }
}

export async function signInWithGoogleAction(redirectTo?: string) {
  try {
    const appUrl = await getRequestBaseUrl()
    const { getGoogleAuthClientConfig, generateGoogleAuthSignInUrl } = await import('@/lib/auth/google-auth')
    const config = getGoogleAuthClientConfig(appUrl)

    // 1. Direct Branded Domain Flow (Eliminates raw *.supabase.co domain in Google account chooser)
    if (config.isConfigured) {
      const { url } = generateGoogleAuthSignInUrl({
        origin: appUrl,
        next: redirectTo,
        prompt: 'select_account',
      })
      return { success: true, url }
    }

    // 2. Fallback: Supabase Client OAuth Provider Flow
    const callbackUrl = redirectTo || `${appUrl}/auth/callback`
    const { data, error } = await AuthService.signInWithOAuth('google', callbackUrl)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, url: data.url }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to initialize Google OAuth' }
  }
}

export async function getGoogleAuthBrandingDiagnosticsAction() {
  try {
    const appUrl = await getRequestBaseUrl()
    const { getGoogleAuthBrandingDiagnostics } = await import('@/lib/auth/google-auth')
    const diag = getGoogleAuthBrandingDiagnostics(appUrl)
    return { success: true, data: diag }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to load Google OAuth diagnostics' }
  }
}

/**
 * Searches for a tenant workspace by slug or company name for the root login flow.
 * Validates that the workspace exists and is active.
 */
export async function findWorkspaceAction(query: string): Promise<{
  success: boolean
  slug?: string
  name?: string
  error?: string
}> {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { success: false, error: 'Please enter a workspace name or slug' }
  }

  const clean = query.trim().toLowerCase().replace(/^https?:\/\//i, '').split('.')[0]
  if (isReservedSlug(clean)) {
    return { success: false, error: `"${clean}" is a reserved system address` }
  }

  // 1. Direct match by slug
  const companyBySlug = await TenantRepository.getCompanyBySlug(clean)
  if (companyBySlug && companyBySlug.is_active !== false) {
    return {
      success: true,
      slug: companyBySlug.slug,
      name: companyBySlug.name,
    }
  }

  // 2. Name search via repository
  try {
    const companies = await TenantRepository.searchCompaniesByName(query.trim(), 5)
    if (companies && companies.length > 0) {
      const exact = companies.find((c: any) => c.name.toLowerCase() === query.trim().toLowerCase())
      const chosen = exact || companies[0]
      return {
        success: true,
        slug: chosen.slug,
        name: chosen.name,
      }
    }
  } catch (err: any) {
    console.error('[findWorkspaceAction] Error looking up workspace:', err)
  }

  return {
    success: false,
    error: `Workspace "${query.trim()}" not found. Please verify the spelling or check with your administrator.`,
  }
}

/**
 * Looks up workspaces associated with a user's email address.
 * Matches company contact email, invited_email, and member user_id.
 */
export async function lookupWorkspacesByEmailAction(email: string): Promise<{
  success: boolean
  workspaces?: Array<{ slug: string; name: string }>
  error?: string
}> {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address' }
  }

  const cleanEmail = email.trim().toLowerCase()
  const rateLimit = await checkRateLimitAsync(cleanEmail, 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many lookup attempts. Please wait ${rateLimit.resetSeconds} seconds.`,
    }
  }

  try {
    const workspaces = await TenantRepository.lookupWorkspacesByEmail(cleanEmail)
    return {
      success: true,
      workspaces,
    }
  } catch (err: any) {
    console.error('[lookupWorkspacesByEmailAction] Error looking up workspaces:', err)
    return {
      success: false,
      error: 'Failed to look up workspaces. Please try again.',
    }
  }
}

