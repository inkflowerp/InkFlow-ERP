'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AuthService } from '@/services/auth.service'
import { AuditService } from '@/services/audit.service'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { TENANT_SESSION_COOKIE } from '@/lib/auth/types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { createClient } from '@/lib/supabase/server'

export async function loginAction(formData: FormData) {
  const email = (formData.get('email') as string) || ''
  const password = (formData.get('password') as string) || ''
  const redirectTo = (formData.get('redirectTo') as string) || ''

  if (!email || !password) {
    return { success: false, error: 'Email and password are required' }
  }

  // Enforce sliding window rate limit on auth attempts
  const rateLimit = checkRateLimit(email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many login attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  const result = await AuthService.signIn(email, password)
  if (!result.success || !result.data) {
    const cookieStore = await cookies()
    cookieStore.delete(TENANT_SESSION_COOKIE)
    return result
  }

  const session = result.data.session

  // Store server-side tenant session cookie
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, JSON.stringify(session), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

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

  const targetUrl = redirectTo || `/${session.companySlug}/dashboard`
  redirect(targetUrl)
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

  const result = await AuthService.signIn(email, pass)
  if (!result.success || !result.data) {
    const cookieStore = await cookies()
    cookieStore.delete(TENANT_SESSION_COOKIE)
    return result
  }

  const session = result.data.session
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, JSON.stringify(session), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

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
  if (!data.email || !data.fullName) {
    return { success: false, error: 'Full name and email address are required.' }
  }

  const rateLimit = checkRateLimit(data.email.toLowerCase(), 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many registration attempts. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  const result = await AuthService.signUp(
    data.email,
    data.password || 'TemporaryPass123!',
    data.fullName,
    data.phone
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
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

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
  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, encodeURIComponent(JSON.stringify(session)), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  revalidatePath('/', 'layout')
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

  return await AuthService.resendVerification(email, purpose)
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

  return await AuthService.forgotPassword(email)
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
    const cookieStore = await cookies()
    cookieStore.delete(TENANT_SESSION_COOKIE)
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

  const cookieStore = await cookies()
  cookieStore.delete(TENANT_SESSION_COOKIE)

  await AuthService.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function signInWithGoogleAction(redirectTo?: string) {
  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
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
