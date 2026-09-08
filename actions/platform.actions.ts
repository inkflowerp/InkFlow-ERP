'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { PlatformService } from '@/services/platform.service'
import { TenantService } from '@/services/tenant.service'
import {
  PlatformCompanyStatus,
  PlatformPlanCode,
  PermissionActionKey,
  PlatformAdminUser,
  SupportAccessLevel,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import {
  requirePlatformUser,
  requirePlatformPermission,
  hasPlatformPermission,
  PLATFORM_SESSION_COOKIE,
} from '@/lib/auth/platform-auth'

/**
 * 1. Tenant Lifecycle Actions
 */
export async function updateCompanyStatusAction(
  companyId: string,
  newStatus: PlatformCompanyStatus,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'tenant.edit') && !hasPlatformPermission(platformUser, 'company.edit')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions to change tenant status.' }
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
  if (!hasPlatformPermission(platformUser, 'subscription.manage') && !hasPlatformPermission(platformUser, 'subscription.edit')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions to change subscription plan.' }
  }

  const result = await PlatformService.changeCompanyPlan(companyId, newPlan, reason)
  if (result.success) {
    revalidatePath('/platform', 'layout')
    revalidatePath('/platform/companies')
    revalidatePath(`/platform/companies/${companyId}`)
    revalidatePath('/platform/subscriptions')
  }
  return result
}

/**
 * 2. Create Business (Atomic Platform Provisioning Flow)
 */
export async function createBusinessAction(formData: FormData) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'tenant.create') && !hasPlatformPermission(platformUser, 'company.create')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions to create a new tenant.' }
  }

  const name = (formData.get('name') as string)?.trim()
  const nameBn = (formData.get('name_bn') as string)?.trim() || undefined
  const slug = (formData.get('slug') as string)?.trim()?.toLowerCase()
  const businessType = (formData.get('business_type') as string) || 'commercial_printing'
  const email = (formData.get('email') as string)?.trim() || undefined
  const phone = (formData.get('phone') as string)?.trim() || undefined
  const ownerName = (formData.get('owner_name') as string)?.trim() || undefined
  const ownerEmail = (formData.get('owner_email') as string)?.trim() || undefined
  const ownerPhone = (formData.get('owner_phone') as string)?.trim() || undefined
  const plan = (formData.get('plan') as any) || 'starter'

  if (!name || !slug) {
    return { success: false, error: 'Company Name and unique Slug are required.' }
  }

  try {
    const createRes = await TenantService.createCompany({
      name,
      name_bn: nameBn,
      slug,
      business_type: businessType,
      email: email || ownerEmail,
      phone: phone || ownerPhone,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      plan,
    })

    if (!createRes.success || !createRes.data) {
      return { success: false, error: createRes.error || 'Failed to create business.' }
    }

    const newCompany = createRes.data

    // Record platform audit
    await PlatformService.recordAuditLog(
      'company.create',
      'company',
      newCompany.id,
      newCompany.id,
      newCompany.name,
      {
        slug: newCompany.slug,
        owner_name: ownerName,
        owner_email: ownerEmail,
        plan,
      },
      null,
      newCompany,
      `New tenant ${newCompany.name} created by platform administrator`
    )

    revalidatePath('/platform', 'layout')
    revalidatePath('/platform/companies')

    return { success: true, data: newCompany }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during tenant creation.' }
  }
}

/**
 * 3. Temporary Support Access Workflow
 */
export async function startTenantSupportSessionAction(
  companyId: string,
  companySlug: string,
  companyName: string,
  reason: string,
  accessLevel: SupportAccessLevel = 'read_only'
): Promise<{ success: true; redirectUrl: string } | { success: false; error: string }> {
  try {
    const platformUser = await requirePlatformUser()
    if (!hasPlatformPermission(platformUser, 'support.access') && !hasPlatformPermission(platformUser, 'company.support_access')) {
      return { success: false, error: 'Unauthorized: You do not possess Support Access capability.' }
    }

    const sessionRes = await PlatformService.createSupportSession(companyId, reason, accessLevel)
    if (!sessionRes.success || !sessionRes.data) {
      return { success: false, error: sessionRes.error || 'Failed to initiate support session.' }
    }

    const supportRecord = sessionRes.data
    const cookieStore = await cookies()
    const supportPayload = {
      sessionId: supportRecord.id,
      platformUserId: platformUser.id,
      platformUserEmail: platformUser.email,
      targetCompanyId: companyId,
      targetCompanySlug: companySlug,
      targetCompanyName: companyName,
      reason,
      accessLevel,
      startedAt: supportRecord.started_at,
      expiresAt: supportRecord.expires_at,
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
  const cookieStore = await cookies()
  const existing = cookieStore.get('printerp_support_tenant')?.value

  if (existing) {
    try {
      const parsed = JSON.parse(existing)
      if (parsed.sessionId) {
        await PlatformService.revokeSupportSession(parsed.sessionId, 'Support session exited by platform user')
      }
    } catch {
      // Ignored
    }
  }

  cookieStore.delete('printerp_support_tenant')
  revalidatePath('/platform', 'layout')
  return { success: true }
}

export async function revokeSupportSessionAction(sessionId: string, reason?: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'support.access')) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await PlatformService.revokeSupportSession(sessionId, reason)
  if (result.success) {
    revalidatePath('/platform/support')
  }
  return result
}

/**
 * 4. Subscription Plans Management
 */
export async function savePlanAction(planData: Partial<SubscriptionPlanRecord>) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'plan.create') && !hasPlatformPermission(platformUser, 'plan.edit')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions to manage plans.' }
  }

  const result = await PlatformService.savePlan(planData)
  if (result.success) {
    revalidatePath('/platform/plans')
  }
  return result
}

export async function archivePlanAction(planId: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'plan.archive')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions to archive plans.' }
  }

  const result = await PlatformService.archivePlan(planId)
  if (result.success) {
    revalidatePath('/platform/plans')
  }
  return result
}

/**
 * 5. Feature Flags & Overrides
 */
export async function toggleGlobalFeatureFlagAction(
  flagId: string,
  isEnabled: boolean,
  reason?: string
) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'feature.manage')) {
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
  if (!hasPlatformPermission(platformUser, 'feature.manage')) {
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
  if (!hasPlatformPermission(platformUser, 'feature.manage')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }

  const result = await PlatformService.removeTenantFeatureFlag(flagId, companyId)
  if (result.success) {
    revalidatePath('/platform/feature-flags')
    revalidatePath(`/platform/companies/${companyId}`)
  }
  return result
}

/**
 * 6. System Health, Background Jobs, & Emergency Controls
 */
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

/**
 * 7. Platform Users Management
 */
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

/**
 * 8. Platform Owner Profile, Security, & Session Revocation
 */
export async function updatePlatformOwnerProfileAction(
  updates: { full_name?: string; phone?: string; avatar_url?: string; preferences?: Record<string, any> }
) {
  const platformUser = await requirePlatformUser()
  const result = await PlatformService.updatePlatformOwnerProfile(updates)
  if (result.success) {
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

export async function exportTenantDataAction(companyId: string, modules: string[]) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'tenant.view') && !hasPlatformPermission(platformUser, 'company.view')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }
  return PlatformService.exportTenantData(companyId, modules)
}

export async function updateIncidentStatusAction(incidentId: string, status: any, resolutionNotes?: string) {
  const platformUser = await requirePlatformUser()
  if (!hasPlatformPermission(platformUser, 'system.manage')) {
    return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
  }
  const result = await PlatformService.updateIncidentStatus(incidentId, status, resolutionNotes)
  if (result.success) {
    revalidatePath('/platform/incidents')
    revalidatePath('/platform/health')
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
  if (platformUser.role !== 'platform_owner') {
    return { success: false, error: 'Unauthorized: Only platform owner can modify global RBAC templates.' }
  }
  const result = await PlatformService.updateRBACTemplatePermission(templateId, resource, action, isAllowed)
  if (result.success) {
    revalidatePath('/platform/rbac')
  }
  return result
}

export async function updatePlatformSettingsAction(settings: Record<string, any>, reason?: string) {
  const platformUser = await requirePlatformUser()
  if (platformUser.role !== 'platform_owner') {
    return { success: false, error: 'Unauthorized: Only platform owner can modify system settings.' }
  }
  const result = await PlatformService.updatePlatformSettings(settings, reason)
  if (result.success) {
    revalidatePath('/platform/settings')
  }
  return result
}

