'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { PlatformService } from '@/services/platform.service'
import {
  PlatformCompanyStatus,
  PlatformPlanCode,
  PermissionActionKey,
  PlatformAdminUser,
} from '@/types/platform.types'
import { requirePlatformUser, hasPlatformPermission, PLATFORM_SESSION_COOKIE } from '@/lib/auth/platform-auth'

export async function updateCompanyStatusAction(
  companyId: string,
  newStatus: PlatformCompanyStatus,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'company.edit')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.updateCompanyStatus(companyId, newStatus, reason)
  if (result.success) {
    revalidatePath('/platform', 'layout')
    revalidatePath('/platform/companies')
    revalidatePath(`/platform/companies/${companyId}`)
  }
  return result
}

export async function changeCompanyPlanAction(
  companyId: string,
  newPlan: PlatformPlanCode,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'subscription.edit')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.changeCompanyPlan(companyId, newPlan, reason)
  if (result.success) {
    revalidatePath('/platform', 'layout')
    revalidatePath('/platform/companies')
    revalidatePath(`/platform/companies/${companyId}`)
    revalidatePath('/platform/subscriptions')
    revalidatePath('/platform/billing')
  }
  return result
}

export async function toggleGlobalFeatureFlagAction(
  flagId: string,
  isEnabled: boolean,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'platform.feature_flags')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.toggleGlobalFeatureFlag(flagId, isEnabled, reason)
  if (result.success) {
    revalidatePath('/platform/feature-flags')
  }
  return result
}

export async function setTenantFeatureFlagAction(
  flagId: string,
  companyId: string,
  isEnabled: boolean,
  notes?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'platform.feature_flags')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.setTenantFeatureFlag(flagId, companyId, isEnabled, notes)
  if (result.success) {
    revalidatePath('/platform/feature-flags')
    revalidatePath(`/platform/companies/${companyId}`)
  }
  return result
}

export async function removeTenantFeatureFlagAction(
  flagId: string,
  companyId: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'platform.feature_flags')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.removeTenantFeatureFlag(flagId, companyId)
  if (result.success) {
    revalidatePath('/platform/feature-flags')
    revalidatePath(`/platform/companies/${companyId}`)
  }
  return result
}

export async function updateRBACTemplatePermissionAction(
  templateId: string,
  resource: string,
  action: PermissionActionKey,
  isAllowed: boolean
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'platform.rbac')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.updateRBACTemplatePermission(templateId, resource, action, isAllowed)
  if (result.success) {
    revalidatePath('/platform/rbac')
  }
  return result
}

export async function retryFailedJobAction(eventId: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'system.job_retry')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.retryFailedJob(eventId)
  if (result.success) {
    revalidatePath('/platform/health')
    revalidatePath('/platform')
  }
  return result
}

export async function resolveHealthEventAction(eventId: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'system.resolve')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.resolveHealthEvent(eventId)
  if (result.success) {
    revalidatePath('/platform/health')
    revalidatePath('/platform')
  }
  return result
}

export async function updateIncidentStatusAction(
  incidentId: string,
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved',
  resolutionNotes?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'system.incidents')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.updateIncidentStatus(incidentId, status, resolutionNotes)
  if (result.success) {
    revalidatePath('/platform/incidents')
    revalidatePath('/platform/health')
    revalidatePath('/platform')
  }
  return result
}

export async function retryBackgroundJobAction(jobId: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'system.job_retry')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.retryBackgroundJob(jobId)
  if (result.success) {
    revalidatePath('/platform/jobs')
    revalidatePath('/platform/health')
    revalidatePath('/platform')
  }
  return result
}

export async function updatePlatformUserAction(
  userId: string,
  updates: Partial<PlatformAdminUser>
) {
  const platformUser = await requirePlatformUser()
  if (platformUser.role !== 'platform_owner' && platformUser.role !== 'platform_admin') {
    return { success: false, error: 'Unauthorized: Only platform owners can manage platform users.' }
  }

  const result = await PlatformService.updatePlatformUser(userId, updates)
  if (result.success) {
    revalidatePath('/platform/users')
    revalidatePath('/platform/security')
  }
  return result
}

export async function setEmergencyControlAction(
  controlKey: string,
  isActive: boolean,
  reason: string
) {
  const platformUser = await requirePlatformUser()
  if (platformUser.role !== 'platform_owner') {
    return { success: false, error: 'Unauthorized: Only the root Platform Owner can activate emergency controls.' }
  }

  const result = await PlatformService.setEmergencyControl(controlKey, isActive, reason)
  if (result.success) {
    revalidatePath('/platform/emergency')
    revalidatePath('/platform')
  }
  return result
}

export async function exportTenantDataAction(
  companyId: string,
  modules: string[]
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'company.export')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.exportTenantData(companyId, modules)
  return result
}

export async function startTenantSupportSessionAction(
  companyId: string,
  companySlug: string,
  companyName: string,
  reason: string
): Promise<{ success: true; redirectUrl: string } | { success: false; error: string }> {
  try {
    const { cookies } = await import('next/headers')
    const platformUser = await requirePlatformUser()

    // Record audit log entry in platform_audit_logs
    await PlatformService.recordAuditLog(
      'company.support_access',
      'company',
      companyId,
      companyId,
      companyName,
      {
        reason,
        platform_user_id: platformUser.id,
        platform_user_email: platformUser.email,
        company_slug: companySlug,
        company_name: companyName,
        started_at: new Date().toISOString(),
      },
      null,
      { support_mode_active: true },
      reason
    )

    // Set explicit support session cookie
    const cookieStore = await cookies()
    const supportPayload = {
      platformUserId: platformUser.id,
      platformUserEmail: platformUser.email,
      targetCompanyId: companyId,
      targetCompanySlug: companySlug,
      targetCompanyName: companyName,
      reason,
      startedAt: new Date().toISOString(),
    }

    cookieStore.set('printerp_support_tenant', JSON.stringify(supportPayload), {
      path: '/',
      maxAge: 60 * 60 * 2, // 2 hours
      sameSite: 'lax',
    })

    return { success: true, redirectUrl: `/${companySlug}/dashboard` }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initiate support session' }
  }
}

export async function exitTenantSupportSessionAction() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  const existing = cookieStore.get('printerp_support_tenant')?.value
  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      await PlatformService.recordAuditLog(
        'company.support_exit',
        'company',
        parsed.targetCompanyId,
        parsed.targetCompanyId,
        parsed.targetCompanyName,
        {
          exited_at: new Date().toISOString(),
          reason: parsed.reason,
        },
        { support_mode_active: true },
        { support_mode_active: false },
        'Platform admin exited support mode'
      )
    } catch {
      // Ignored
    }
  }

  cookieStore.delete('printerp_support_tenant')
  return { success: true }
}

export async function updatePlatformSettingsAction(
  settings: Record<string, any>,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (platformUser.role !== 'platform_owner') {
    return { success: false, error: 'Unauthorized: Only the root Platform Owner can modify global platform parameters.' }
  }

  const result = await PlatformService.updatePlatformSettings(settings, reason)
  if (result.success) {
    revalidatePath('/platform/settings')
    revalidatePath('/platform')
  }
  return result
}

export async function updatePlatformOwnerProfileAction(
  updates: { full_name?: string; phone?: string; avatar_url?: string }
) {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.updatePlatformOwnerProfile(updates)
  if (result.success && result.data) {
    try {
      const cookieStore = await cookies()
      const sessionCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
      if (sessionCookie) {
        const sessionData = JSON.parse(sessionCookie)
        if (updates.full_name) {
          sessionData.fullName = updates.full_name.trim()
        }
        cookieStore.set(PLATFORM_SESSION_COOKIE, JSON.stringify(sessionData), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        })
      }
    } catch {
      // Ignored
    }

    revalidatePath('/platform/profile')
    revalidatePath('/platform', 'layout')
  }
  return result
}

export async function changePlatformOwnerPasswordAction(
  currentPassword: string,
  newPassword: string,
  revokeOtherSessions: boolean = true
) {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.changePlatformOwnerPassword(
    currentPassword,
    newPassword,
    revokeOtherSessions
  )
  if (result.success) {
    revalidatePath('/platform/profile')
    revalidatePath('/platform/security')
  }
  return result
}

export async function togglePlatformOwnerMFAAction(enable: boolean) {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.togglePlatformOwnerMFA(enable)
  if (result.success) {
    revalidatePath('/platform/profile')
    revalidatePath('/platform/security')
  }
  return result
}

export async function revokePlatformSessionAction(sessionId: string) {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.revokePlatformSession(sessionId)
  if (result.success) {
    revalidatePath('/platform/security')
    revalidatePath('/platform/profile')
  }
  return result
}

export async function revokeAllOtherPlatformSessionsAction() {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.revokeAllOtherPlatformSessions()
  if (result.success) {
    revalidatePath('/platform/security')
    revalidatePath('/platform/profile')
  }
  return result
}

