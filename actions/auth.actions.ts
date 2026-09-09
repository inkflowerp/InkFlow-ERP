'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { AuthService } from '@/services/auth.service'
import { AuditService } from '@/services/audit.service'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
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
  data?: {
    userId: string
    session: TenantSessionData
    requiresOnboarding: boolean
  }
}> {
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

  const initialSession: TenantSessionData = {
    userId: result.data.userId,
    userEmail: data.email.trim().toLowerCase(),
    fullName: data.fullName,
    fullNameBn: null,
    phone: data.phone || null,
    companyId: '',
    companySlug: '',
    companyName: data.companyName || 'New Organization',
    companyNameBn: 'নতুন প্রতিষ্ঠান',
    branchId: 'br-main',
    branchName: 'Main Branch',
    role: 'business_owner',
    primaryRole: 'business_owner',
    responsibilities: ['business_owner'],
    permissions: ['*'],
    loginTime: new Date().toISOString(),
    token: `auth-${result.data.userId}`,
  }

  const cookieStore = await cookies()
  cookieStore.set(TENANT_SESSION_COOKIE, JSON.stringify(initialSession), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return {
    success: true,
    data: {
      userId: result.data.userId,
      session: initialSession,
      requiresOnboarding: true,
    },
  }
}

export async function forgotPasswordAction(email: string) {
  return await AuthService.forgotPassword(email)
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


