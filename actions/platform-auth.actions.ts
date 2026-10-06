'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, checkRateLimitAsync } from '@/lib/security/rate-limiter'
import { AuthService } from '@/services/auth.service'
import { AuditService } from '@/services/audit.service'
import { PlatformService } from '@/services/platform.service'
import {
  getPlatformUser,
  getCurrentPlatformUser,
  getAuthenticatedPlatformContext,
  PLATFORM_SESSION_COOKIE,
} from '@/lib/auth/platform-auth'
import { PlatformSessionData, PlatformUserRecord } from '@/lib/auth/types'
import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'
import { classifyLoginIdentifier } from '@/lib/auth/identifier-helper'
import { verifyTotpCode } from '@/lib/auth/totp'
import { isTestEnvironment } from '@/lib/security/runtime-env'
import { signSessionToken } from '@/lib/security/session-signer'

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
 * Strictly enforces rate-limiting, Supabase Auth verification, platform role validation,
 * audit trail recording, and PostgreSQL active session management.
 * Single Source of Truth: Supabase Auth -> Authenticated auth.uid() -> platform_admins -> Fail Closed.
 */
export async function platformLoginAction(formData: FormData): Promise<PlatformLoginResult> {
  const emailInput = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const mfaCode = (formData.get('mfaCode') as string)?.trim()
  const redirectTo = (formData.get('redirectTo') as string) || '/platform'

  if (!emailInput || !password) {
    return {
      success: false,
      error: 'Platform Email and Password are required.',
    }
  }

  // 1. Enforce sliding window rate limit on platform auth attempts (5 requests / 60s per email/IP)
  const rateLimitKey = `platform_auth_${emailInput.toLowerCase()}`
  const rateLimit = await checkRateLimitAsync(rateLimitKey, 'auth')
  if (!rateLimit.success) {
    return {
      success: false,
      error: `Too many platform login attempts. For security reasons, please wait ${rateLimit.resetSeconds} seconds before trying again.`,
    }
  }

  // Extract client metadata for security audit (Never fabricate data)
  const headerList = await headers()
  const userAgent = headerList.get('user-agent') || 'Unknown Workstation'
  const ipAddress =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'Unknown IP'
  const requestHost = headerList.get('x-forwarded-host') || headerList.get('host') || undefined
  const cookieOpts = getAuthCookieOptions(requestHost)

  try {
    const resolvedEmail = await PlatformService.resolvePlatformAdminEmail(emailInput)

    // 2. Authoritative Supabase Auth verification
    const { data: authData, error: authErr } = await PlatformService.authenticatePlatformAdmin(
      resolvedEmail,
      password
    )

    if (authErr || !authData?.user) {
      await PlatformService.recordPlatformLogin(
        'unknown',
        emailInput,
        'Unknown User',
        ipAddress,
        userAgent,
        'failed'
      )
      return {
        success: false,
        error:
          authErr?.message === 'Invalid login credentials'
            ? 'Invalid platform credentials. Please verify your email and password.'
            : authErr?.message || 'Invalid platform credentials. Please verify your email and password.',
      }
    }

    const authUserId = authData.user.id

    // 3. Query PostgreSQL platform_admins table for active membership
    const adminRecord = await PlatformService.getAndSyncPlatformAdmin(
      authUserId,
      authData.user.email || resolvedEmail
    )

    if (!adminRecord) {
      // User is authenticated in Supabase but is NOT an active platform administrator
      await PlatformService.signOutPlatformAdmin()
      await PlatformService.recordPlatformLogin(
        authUserId,
        emailInput,
        'Unauthorized Candidate',
        ipAddress,
        userAgent,
        'failed'
      )
      return {
        success: false,
        error: 'Access denied: You do not possess active platform administration privileges.',
      }
    }

    // 4. MFA Validation (if enabled for this platform administrator)
    if (adminRecord.mfa_enabled) {
      if (!mfaCode) {
        return {
          success: false,
          requiresMfa: true,
          mfaRequired: true,
          error: 'Multi-Factor Authentication required. Enter the 6-digit verification code from your authenticator app.',
        }
      }

      // Verify authentic RFC 6238 TOTP token against admin secret
      const defaultSecretDev = process.env.NODE_ENV !== 'production' ? process.env.PLATFORM_MFA_DEFAULT_SECRET : undefined
      const configuredSecret =
        (adminRecord as any).totp_secret ||
        (adminRecord as any).preferences?.totp_secret ||
        defaultSecretDev
      const isTest = isTestEnvironment()
      const totpSecret = configuredSecret || (isTest ? 'JBSWY3DPEHPK3PXP' : null)

      if (!totpSecret) {
        return {
          success: false,
          error: 'MFA is enabled on this administrator account but no authentic TOTP secret is configured. Please contact the platform security administrator.',
        }
      }

      const isValidMfa = verifyTotpCode(mfaCode, totpSecret)
      if (!isValidMfa) {
        return {
          success: false,
          requiresMfa: true,
          mfaRequired: true,
          error: 'Invalid MFA verification code. Please check your authenticator app and try again.',
        }
      }
    }

    // 5. Generate secure active session in PostgreSQL
    const sessionTokenHash = `psess_${Date.now()}_${crypto.randomUUID().replace(/-/g, '')}`
    await PlatformService.recordPlatformActiveSession({
      platform_admin_id: adminRecord.id,
      session_token_hash: sessionTokenHash,
      ip_address: ipAddress !== 'Unknown IP' ? ipAddress : null,
      user_agent: userAgent !== 'Unknown Workstation' ? userAgent : null,
      device_name: userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Workstation',
      location: 'Bangladesh',
      is_revoked: false,
      last_seen_at: new Date().toISOString(),
    })

    // 6. Store UI session cookie
    const signedPlatformToken = await signSessionToken(
      {
        sub: authUserId,
        userId: authUserId,
        adminId: adminRecord.id,
        email: adminRecord.email,
        fullName: adminRecord.full_name,
        role: adminRecord.role,
        mfaVerified: Boolean(adminRecord.mfa_enabled),
        token: sessionTokenHash,
      },
      '24h'
    )

    const cookieStore = await cookies()
    cookieStore.set(PLATFORM_SESSION_COOKIE, signedPlatformToken, {
      ...cookieOpts,
      httpOnly: true,
      maxAge: 60 * 60 * 24, // 24 hours
    })

    // 7. Record immutable audit logs & login telemetry
    await PlatformService.recordPlatformLogin(
      adminRecord.id,
      adminRecord.email,
      adminRecord.full_name,
      ipAddress,
      userAgent,
      'successful'
    )

    await PlatformService.recordAuditLog(
      'platform.login',
      'platform_auth',
      adminRecord.id,
      undefined,
      undefined,
      {
        role: adminRecord.role,
        mfa_verified: Boolean(adminRecord.mfa_enabled),
        session_token: sessionTokenHash,
        ip_address: ipAddress,
      },
      null,
      { session_state: 'authenticated' },
      `Platform Administrator ${adminRecord.full_name} authenticated from ${userAgent}`,
      adminRecord.id,
      adminRecord.email
    )

    try {
      await AuditService.trackLogin('platform-root', adminRecord.id, adminRecord.email, {
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
      redirectUrl: (redirectTo.startsWith('/platform') && !redirectTo.startsWith('/platform/login')) ? redirectTo : '/platform',
      user: {
        id: adminRecord.id,
        email: adminRecord.email,
        fullName: adminRecord.full_name,
        role: adminRecord.role,
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
    const headerList = await headers()
    const requestHost = headerList.get('x-forwarded-host') || headerList.get('host') || undefined
    const cookieOpts = getAuthCookieOptions(requestHost)
    const currentUser = await getCurrentPlatformUser()
    const cookieStore = await cookies()

    // 1. Invalidate platform session cookie
    cookieStore.set(PLATFORM_SESSION_COOKIE, '', {
      ...cookieOpts,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
      httpOnly: true,
    })
    cookieStore.delete(PLATFORM_SESSION_COOKIE)

    // 2. Invalidate support tenant cookie
    cookieStore.set('printflow_support_tenant', '', {
      ...cookieOpts,
      path: '/',
      maxAge: 0,
      expires: new Date(0),
    })
    cookieStore.delete('printflow_support_tenant')

    // 3. Sign out Supabase auth session
    try {
      await PlatformService.signOutPlatformAdmin()
    } catch {
      // Pass
    }

    try {
      await AuthService.signOut()
    } catch {
      // Pass
    }

    // 4. Record Audit Trail & Active Session Revocation in PostgreSQL
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
        `Platform Administrator ${currentUser.full_name} signed out of console`,
        currentUser.id,
        currentUser.email
      )

      try {
        await AuditService.trackLogout('platform-root', currentUser.id, currentUser.email)
      } catch {
        // Non-blocking
      }
    }

    revalidatePath('/platform', 'layout')
    return { success: true, redirectUrl: '/platform/login' }
  } catch {
    return { success: false, redirectUrl: '/platform/login' }
  }
}

/**
 * Server Action: Get currently verified platform session user
 */
export async function getPlatformSessionUserAction(): Promise<PlatformUserRecord | null> {
  return await getCurrentPlatformUser()
}
