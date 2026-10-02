'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies, headers } from 'next/headers'
import { AuthService } from '@/services/auth.service'
import { AuditService } from '@/services/audit.service'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { resolveRequestOrigin } from '@/lib/security/runtime-env'
import { getAuthCookieOptions, resolveHostname, isReservedSlug } from '@/lib/tenant/tenant-resolution'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { createClient, establishServerSession } from '@/lib/supabase/server'

async function getRequestBaseUrl(): Promise<string> {
  try {
    const headerStore = await headers()
    return resolveRequestOrigin(headerStore)
  } catch {
    return resolveRequestOrigin()
  }
}

async function getCookieOptions() {
  try {
    const headerStore = await headers()
    const requestHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || undefined
    return getAuthCookieOptions(requestHost)
  } catch {
    return getAuthCookieOptions()
  }
}

export async function clearTenantSessionCookie() {
  const cookieStore = await cookies()
  const opts = await getCookieOptions()

  // 1. Clear host-scoped cookie
  cookieStore.delete(TENANT_SESSION_COOKIE)
  cookieStore.set(TENANT_SESSION_COOKIE, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  })

  // 2. Clear domain-scoped cookie if wildcard domain is configured
  if (opts.domain) {
    cookieStore.set(TENANT_SESSION_COOKIE, '', {
      ...opts,
      maxAge: 0,
      expires: new Date(0),
    })
  }
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
  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  let targetCompanySlug: string | undefined
  try {
    const headerStore = await headers()
    const headerSlug = headerStore.get('x-tenant-slug')
    if (headerSlug && !isReservedSlug(headerSlug)) {
      targetCompanySlug = headerSlug
    } else {
      const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
      const hostRes = resolveHostname(host)
      if (hostRes.hostType === 'tenant' && hostRes.tenantSlug) {
        targetCompanySlug = hostRes.tenantSlug
      }
    }
  } catch {}

  const result = await AuthService.signIn(email, password, targetCompanySlug)
  if (!result.success || !result.data) {
    await clearTenantSessionCookie()
    return result
  }

  const session = result.data.session

  // Store server-side tenant session cookie across subdomains
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), await getCookieOptions())

  // Audit track successful login with the verified user ID and company
  if (session.companyId) {
    try {
      await AuditService.trackLogin(session.companyId, session.userId, session.userEmail)
    } catch {
      // Non-blocking
    }
  }

  revalidatePath('/', 'layout')

  if (result.data.requiresOnboarding || !session.companySlug) {
    redirect('/onboarding')
  }

  const targetPath = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('/login')
    ? redirectTo
    : '/dashboard'

  let isPslOrLocalRequest = false
  try {
    const headerStore = await headers()
    const host = (headerStore.get('x-forwarded-host') || headerStore.get('host') || '').toLowerCase().split(':')[0]
    if (
      host.includes('localhost') ||
      host.includes('127.0.0.1') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.netlify.app')
    ) {
      isPslOrLocalRequest = true
    }
  } catch {}

  if (isPslOrLocalRequest) {
    let clean = targetPath
    if (clean.startsWith(`/${session.companySlug}/`)) {
      clean = clean.slice(`/${session.companySlug}`.length)
    } else if (clean === `/${session.companySlug}`) {
      clean = '/dashboard'
    }
    const cleanDestination = clean.startsWith('/') ? clean : `/${clean}`
    redirect(`/${session.companySlug}${cleanDestination}`)
  }

  const targetSubdomainUrl = getTenantLink(session.companySlug, targetPath)
  redirect(targetSubdomainUrl)
}

export async function signInAction(email: string, pass: string) {
  if (!email || !pass) {
    return { success: false, error: 'Email and password are required' }
  }

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  let targetCompanySlug: string | undefined
  try {
    const headerStore = await headers()
    const headerSlug = headerStore.get('x-tenant-slug')
    if (headerSlug && !isReservedSlug(headerSlug)) {
      targetCompanySlug = headerSlug
    } else {
      const host = headerStore.get('x-forwarded-host') || headerStore.get('host')
      const hostRes = resolveHostname(host)
      if (hostRes.hostType === 'tenant' && hostRes.tenantSlug) {
        targetCompanySlug = hostRes.tenantSlug
      }
    }
  } catch {}

  const result = await AuthService.signIn(email, pass, targetCompanySlug)
  if (!result.success || !result.data) {
    await clearTenantSessionCookie()
    return result
  }

  const session = result.data.session
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), await getCookieOptions())

  if (session.companyId) {
    try {
      await AuditService.trackLogin(session.companyId, session.userId, session.userEmail)
    } catch {
      // Non-blocking
    }
  }

  return result
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

  const rateLimit = checkRateLimit(data.email.toLowerCase(), 'auth')
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
  const cookieStore = await cookies()
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

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
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
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), cookieOpts)

  // Establish Supabase SSR auth token cookies on server
  await establishServerSession(email, cookieOpts.domain)

  revalidatePath('/', 'layout')
  return result
}

export async function verifyRegistrationTokenAction(token: string, email?: string | null) {
  if (!token) {
    return { success: false, error: 'Verification token is required' }
  }

  const result = await AuthService.verifyRegistrationToken(token, email)
  if (!result.success || !result.data) {
    return result
  }

  const session = result.data.session
  const cookieOpts = await getCookieOptions()
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), cookieOpts)

  // Establish Supabase SSR auth token cookies on server
  if (session.userEmail) {
    await establishServerSession(session.userEmail, cookieOpts.domain)
  }

  revalidatePath('/', 'layout')
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
    const cookieStore = await cookies()
    cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), cookieOpts)

    // Establish Supabase SSR auth token cookies on server
    await establishServerSession(email, cookieOpts.domain)
    revalidatePath('/', 'layout')
  }

  return result
}

export async function resendVerificationOtpAction(
  email: string,
  purpose: 'registration' | 'password_reset' = 'registration'
) {
  if (!email) {
    return { success: false, error: 'Email address is required' }
  }

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
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

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
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

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
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

  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
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

export async function signOutAction() {
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

  await clearTenantSessionCookie()

  await AuthService.signOut()
  revalidatePath('/', 'layout')
  redirect('/login?logged_out=true')
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
    const supabase = await createClient()
    const callbackUrl = redirectTo || `${appUrl}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    })

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
