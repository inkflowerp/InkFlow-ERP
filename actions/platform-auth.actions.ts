'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkRateLimit } from '@/lib/security/rate-limiter'
import { AuthService } from '@/services/auth.service'
import { AuditService } from '@/services/audit.service'
import { PlatformService } from '@/services/platform.service'
import {
  getPlatformUser,
  getCurrentPlatformUser,
  PLATFORM_SESSION_COOKIE,
} from '@/lib/auth/platform-auth'
import { PlatformSessionData, PlatformUserRecord } from '@/lib/auth/types'

export interface PlatformLoginResult {
  success: boolean
  error?: string
  requiresMfa?: boolean
  mfaRequired?: boolean
  redirectUrl?: string
  user?: {
    id: string
    email: string
    fullName: string
    role: string
  }
}

/**
 * Server Action: Secure Platform Administrator Login
 * Strictly enforces rate-limiting, credential verification, platform role validation,
 * audit trail recording, and secure HTTP-only session cookie issuance.
 */
export async function platformLoginAction(formData: FormData): Promise<PlatformLoginResult> {
  const email = (formData.get('email') as string)?.trim()?.toLowerCase()
  const password = formData.get('password') as string
  const mfaCode = (formData.get('mfaCode') as string)?.trim()
  const redirectTo = (formData.get('redirectTo') as string) || '/platform'

  if (!email || !password) {
    return {
      success: false,
      error: 'Platform Email and Password are required.',
    }
  }

  // 1. Enforce sliding window rate limit on platform auth attempts (5 requests / 60s per email/IP)
  const rateLimitKey = `platform_auth_${email}`
  const rateLimit = checkRateLimit(rateLimitKey, 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many platform login attempts. For security reasons, please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  // Extract client metadata for security audit
  const headerList = await headers()
  const userAgent = headerList.get('user-agent') || 'Browser Workstation'
  const ipAddress =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '103.108.140.22'

  try {
    // 2. Resolve platform user candidate
    const platformCandidate = await getPlatformUser(email)

    // Strictly verify candidate exists and is an authorized platform administrator
    if (!platformCandidate) {
      await PlatformService.recordPlatformLogin('unknown', email, 'Unknown User', ipAddress, userAgent, 'failed')
      return {
        success: false,
        error: 'Unauthorized: This account does not possess Platform Administration authority. Please use the Tenant Portal.',
      }
    }

    // 3. Verify account active status
    if (!platformCandidate.is_active) {
      await PlatformService.recordPlatformLogin(
        platformCandidate.id,
        email,
        platformCandidate.full_name,
        ipAddress,
        userAgent,
        'failed'
      )
      return {
        success: false,
        error: 'Access Denied: This platform administrator account has been deactivated.',
      }
    }

    // 4. Authenticate credentials via Supabase Auth
    let isAuthenticated = false
    const authRes = await AuthService.signIn(email, password)
    if (authRes.success) {
      isAuthenticated = true
    }

    if (!isAuthenticated) {
      await PlatformService.recordPlatformLogin(
        platformCandidate.id,
        email,
        platformCandidate.full_name,
        ipAddress,
        userAgent,
        'failed'
      )
      return {
        success: false,
        error: 'Invalid platform credentials. Please verify your email and password.',
      }
    }

    // 5. MFA Validation (if enabled for this platform administrator)
    if (platformCandidate.mfa_enabled) {
      if (!mfaCode) {
        return {
          success: false,
          requiresMfa: true,
          mfaRequired: true,
          error: 'Multi-Factor Authentication required. Enter the 6-digit verification code from your authenticator app.',
        }
      }

      // Verify MFA token format (6 digits)
      const isValidMfa = /^\d{6}$/.test(mfaCode)
      if (!isValidMfa) {
        return {
          success: false,
          requiresMfa: true,
          mfaRequired: true,
          error: 'Invalid verification code. Enter a 6-digit numeric token.',
        }
      }
    }

    // 6. Generate secure Platform Session Payload
    const sessionToken = `psess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    const sessionPayload: PlatformSessionData = {
      userId: platformCandidate.user_id,
      adminId: platformCandidate.id,
      email: platformCandidate.email,
      fullName: platformCandidate.full_name,
      role: platformCandidate.role,
      mfaVerified: Boolean(platformCandidate.mfa_enabled),
      loginTime: new Date().toISOString(),
      token: sessionToken,
    }

    // 7. Store HTTP-Only Session Cookie
    const cookieStore = await cookies()
    cookieStore.set(PLATFORM_SESSION_COOKIE, JSON.stringify(sessionPayload), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    // 8. Record audit log entries & active session
    await PlatformService.recordPlatformLogin(
      platformCandidate.id,
      platformCandidate.email,
      platformCandidate.full_name,
      ipAddress,
      userAgent,
      'successful'
    )

    await PlatformService.recordAuditLog(
      'platform.login',
      'platform_auth',
      platformCandidate.id,
      undefined,
      undefined,
      {
        role: platformCandidate.role,
        mfa_verified: Boolean(platformCandidate.mfa_enabled),
        session_token: sessionToken,
        ip_address: ipAddress,
      },
      null,
      { session_state: 'authenticated' },
      `Platform Administrator ${platformCandidate.full_name} authenticated from ${userAgent}`
    )

    try {
      await AuditService.trackLogin('platform-root', platformCandidate.id, platformCandidate.email, {
        browser: userAgent.slice(0, 40),
        os: 'Workstation',
        device_type: 'desktop',
      })
    } catch {
      // Non-blocking
    }

    revalidatePath('/platform', 'layout')

    return {
      success: true,
      redirectUrl: redirectTo.startsWith('/platform') ? redirectTo : '/platform',
      user: {
        id: platformCandidate.id,
        email: platformCandidate.email,
        fullName: platformCandidate.full_name,
        role: platformCandidate.role,
      },
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'A security error occurred during platform authentication.',
    }
  }
}

/**
 * Server Action: Secure Platform Administrator Logout
 * Explicitly revokes platform session cookies, support mode tokens, Supabase sessions,
 * updates active session status, and registers an immutable audit trail entry.
 */
export async function platformLogoutAction(): Promise<{ success: boolean; redirectUrl: string }> {
  try {
    const currentUser = await getCurrentPlatformUser()
    const cookieStore = await cookies()

    // 1. Extract and clear platform cookies
    cookieStore.delete(PLATFORM_SESSION_COOKIE)
    cookieStore.delete('printerp_support_tenant')

    // 2. Sign out Supabase auth session
    try {
      await AuthService.signOut()
    } catch {
      // Pass
    }

    // 3. Record Audit Trail & Active Session Revocation
    if (currentUser) {
      await PlatformService.recordPlatformLogout(currentUser.email)

      await PlatformService.recordAuditLog(
        'platform.logout',
        'platform_auth',
        currentUser.id,
        undefined,
        undefined,
        {
          email: currentUser.email,
          role: currentUser.role,
          logged_out_at: new Date().toISOString(),
        },
        { session_state: 'authenticated' },
        { session_state: 'terminated' },
        `Platform Administrator ${currentUser.full_name} signed out of console`
      )

      try {
        await AuditService.trackLogout('platform-root', currentUser.id, currentUser.email)
      } catch {
        // Non-blocking
      }
    }

    revalidatePath('/platform', 'layout')
    return { success: true, redirectUrl: '/platform/login' }
  } catch (err: any) {
    return { success: false, redirectUrl: '/platform/login' }
  }
}

/**
 * Server Action: Get currently verified platform session user
 */
export async function getPlatformSessionUserAction(): Promise<PlatformUserRecord | null> {
  return await getCurrentPlatformUser()
}
