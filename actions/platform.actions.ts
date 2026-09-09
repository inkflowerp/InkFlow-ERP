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
  ApiResponse,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import {
  hasPlatformPermission,
  getCurrentPlatformUser,
} from '@/lib/auth/platform-auth'

/**
 * 1. Tenant Lifecycle Actions
 */
export async function updateCompanyStatusAction(
  companyId: string,
  newStatus: PlatformCompanyStatus,
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'tenant.edit') && !hasPlatformPermission(platformUser, 'company.edit')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to change tenant status.' }
    }

    const result = await PlatformService.updateCompanyStatus(companyId, newStatus, reason)
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/dashboard')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update company status.' }
  }
}

export async function deleteBusinessAction(companyId: string, reason?: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'tenant.delete') && !hasPlatformPermission(platformUser, 'company.delete') && !hasPlatformPermission(platformUser, 'tenant.edit')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to delete a tenant.' }
    }

    const result = await PlatformService.deleteCompany(companyId, reason)
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/dashboard')
      revalidatePath('/platform/subscriptions')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete company.' }
  }
}

export async function deleteAllBusinessesAction(reason?: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'tenant.delete') && !hasPlatformPermission(platformUser, 'company.delete')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to purge all tenants.' }
    }

    const result = await PlatformService.deleteAllCompanies(reason)
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/dashboard')
      revalidatePath('/platform/subscriptions')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to purge all companies.' }
  }
}

export async function changeCompanyPlanAction(
  companyId: string,
  newPlan: PlatformPlanCode,
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'subscription.manage') && !hasPlatformPermission(platformUser, 'subscription.edit')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to change subscription plan.' }
    }

    const result = await PlatformService.changeCompanyPlan(companyId, newPlan, reason, platformUser.id)
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/dashboard')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to change company plan.' }
  }
}

/**
 * Update Tenant Subscription Lifecycle, Plan, Interval, Dates & Quotas
 */
export async function updateCompanySubscriptionAction(input: {
  companyId: string
  planCodeOrId?: string
  status?: PlatformCompanyStatus
  billingInterval?: 'monthly' | 'yearly'
  customLimitsOverride?: Record<string, number> | null
  currentPeriodStart?: string
  currentPeriodEnd?: string
  trialEndsAt?: string | null
  paymentMethodType?: string | null
  lastPaymentReference?: string | null
  reason?: string
}) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (
      !hasPlatformPermission(platformUser, 'subscription.manage') &&
      !hasPlatformPermission(platformUser, 'subscription.edit') &&
      !hasPlatformPermission(platformUser, 'tenant.edit')
    ) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to update subscription.' }
    }

    const result = await PlatformService.updateCompanySubscription({
      ...input,
      callerAdminId: platformUser.id,
    })
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${input.companyId}`)
      revalidatePath('/platform/billing')
      revalidatePath('/platform/dashboard')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update subscription.' }
  }
}

/**
 * Quick Extend Trial or Period Action
 */
export async function extendSubscriptionTrialAction(
  companyId: string,
  days: number,
  target: 'trial' | 'period' = 'trial',
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (
      !hasPlatformPermission(platformUser, 'subscription.manage') &&
      !hasPlatformPermission(platformUser, 'subscription.edit') &&
      !hasPlatformPermission(platformUser, 'tenant.edit')
    ) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to extend subscription period.' }
    }

    const result = await PlatformService.extendSubscriptionPeriod(
      companyId,
      days,
      target,
      reason,
      platformUser.id
    )
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/dashboard')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to extend subscription.' }
  }
}

/**
 * Record Manual/Offline Payment Action
 */
export async function recordManualSubscriptionPaymentAction(
  companyId: string,
  payment: {
    amount: number
    billingInterval: 'monthly' | 'yearly'
    paymentGateway: string
    transactionRef: string
    extendPeriodMonths?: number
    reason?: string
  }
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (
      !hasPlatformPermission(platformUser, 'subscription.manage') &&
      !hasPlatformPermission(platformUser, 'subscription.edit') &&
      !hasPlatformPermission(platformUser, 'tenant.edit')
    ) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to record payment.' }
    }

    const result = await PlatformService.recordManualSubscriptionPayment(
      companyId,
      payment,
      platformUser.id
    )
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/billing')
      revalidatePath('/platform/dashboard')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record manual payment.' }
  }
}

/**
 * Override Custom Resource Limits Action
 */
export async function overrideSubscriptionLimitsAction(
  companyId: string,
  customLimits: Record<string, number> | null,
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (
      !hasPlatformPermission(platformUser, 'subscription.manage') &&
      !hasPlatformPermission(platformUser, 'subscription.edit') &&
      !hasPlatformPermission(platformUser, 'tenant.edit')
    ) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to override limits.' }
    }

    const result = await PlatformService.updateCompanySubscription({
      companyId,
      customLimitsOverride: customLimits,
      reason: reason || 'Custom quota override configured by platform administrator',
      callerAdminId: platformUser.id,
    })
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath(`/platform/companies/${companyId}`)
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to override subscription limits.' }
  }
}

/**
 * 2. Create Business (Atomic Platform Provisioning Flow)
 */
export async function createBusinessAction(formData: FormData) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'tenant.create') && !hasPlatformPermission(platformUser, 'company.create')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to create a new tenant.' }
    }

    const name = (formData.get('name') as string)?.trim()
    const nameBn = (formData.get('name_bn') as string)?.trim() || undefined
    const slug = (formData.get('slug') as string)?.trim()?.toLowerCase()
    const businessType = (formData.get('business_type') as string) || 'commercial_printing'
    const email = (formData.get('email') as string)?.trim() || undefined
    const phone = (formData.get('phone') as string)?.trim() || undefined
    const address = (formData.get('address') as string)?.trim() || undefined
    const addressBn = (formData.get('address_bn') as string)?.trim() || undefined
    const currency = (formData.get('currency') as string)?.trim() || 'BDT'
    const ownerName = (formData.get('owner_name') as string)?.trim() || undefined
    const ownerEmail = (formData.get('owner_email') as string)?.trim() || undefined
    const ownerPhone = (formData.get('owner_phone') as string)?.trim() || undefined
    const ownerPassword = (formData.get('owner_password') as string)?.trim() || undefined
    const plan = (formData.get('plan') as any) || 'trial'
    const tradeLicenseNo = (formData.get('trade_license_no') as string)?.trim() || undefined
    const binNo = (formData.get('bin_no') as string)?.trim() || undefined
    const tinNo = (formData.get('tin_no') as string)?.trim() || undefined

    if (!name || !slug) {
      return { success: false, error: 'Company Name and unique Slug are required.' }
    }

    const defaultOwnerPassword = ownerPassword || 'PrintERP2026!Owner'

    const createRes = await TenantService.createCompany({
      name,
      name_bn: nameBn,
      slug,
      business_type: businessType,
      email: email || ownerEmail,
      phone: phone || ownerPhone,
      address,
      address_bn: addressBn,
      currency,
      trade_license_no: tradeLicenseNo,
      bin_no: binNo,
      tin_no: tinNo,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_phone: ownerPhone,
      owner_password: defaultOwnerPassword,
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
    revalidatePath('/platform/tenants')
    revalidatePath('/platform/dashboard')

    return {
      success: true,
      data: newCompany,
      credentials: {
        businessName: newCompany.name,
        slug: newCompany.slug,
        email: ownerEmail || newCompany.email || 'owner@' + newCompany.slug + '.com',
        password: defaultOwnerPassword,
        loginUrl: `/${newCompany.slug}/login`,
        dashboardUrl: `/${newCompany.slug}/dashboard`,
        plan: plan,
      },
    }
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
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!hasPlatformPermission(platformUser, 'support.access') && !hasPlatformPermission(platformUser, 'company.support_access')) {
      return { success: false, error: 'Unauthorized: You do not possess Support Access capability.' }
    }

    const sessionRes = await PlatformService.createSupportSession(companyId, reason, accessLevel, platformUser.id)
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
  try {
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
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to exit support session' }
  }
}

export async function revokeSupportSessionAction(sessionId: string, reason?: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'support.access')) {
      return { success: false, error: 'Unauthorized' }
    }

    const result = await PlatformService.revokeSupportSession(sessionId, reason)
    if (result.success) {
      revalidatePath('/platform/support')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke support session' }
  }
}

/**
 * 4. Subscription Plans Management
 */
export async function savePlanAction(
  planData: Partial<SubscriptionPlanRecord>
): Promise<ApiResponse<SubscriptionPlanRecord>> {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || (!hasPlatformPermission(platformUser, 'plan.create') && !hasPlatformPermission(platformUser, 'plan.edit'))) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to manage plans.' }
    }

    const result = await PlatformService.savePlan(planData)
    if (result.success) {
      revalidatePath('/platform/plans')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save plan' }
  }
}

export async function archivePlanAction(planId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'plan.archive')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to archive plans.' }
    }

    const result = await PlatformService.archivePlan(planId)
    if (result.success) {
      revalidatePath('/platform/plans')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to archive plan' }
  }
}

export async function reactivatePlanAction(planId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || (!hasPlatformPermission(platformUser, 'plan.edit') && !hasPlatformPermission(platformUser, 'plan.archive'))) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to reactivate plans.' }
    }

    const result = await PlatformService.reactivatePlan(planId)
    if (result.success) {
      revalidatePath('/platform/plans')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to reactivate plan' }
  }
}

export async function deletePlanAction(planId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || (!hasPlatformPermission(platformUser, 'plan.delete') && !hasPlatformPermission(platformUser, 'plan.archive'))) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions to delete plans.' }
    }

    const result = await PlatformService.deletePlan(planId)
    if (result.success) {
      revalidatePath('/platform/plans')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete plan' }
  }
}

/**
 * 5. Feature Flags & Overrides
 */
export async function toggleGlobalFeatureFlagAction(
  flagId: string,
  isEnabled: boolean,
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'feature.manage')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.toggleGlobalFeatureFlag(flagId, isEnabled, reason)
    if (result.success) {
      revalidatePath('/platform/feature-flags')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle feature flag' }
  }
}

export async function setTenantFeatureFlagAction(
  flagId: string,
  companyId: string,
  isEnabled: boolean,
  notes?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'feature.manage')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.setTenantFeatureFlag(flagId, companyId, isEnabled, notes)
    if (result.success) {
      revalidatePath('/platform/feature-flags')
      revalidatePath(`/platform/companies/${companyId}`)
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set tenant feature flag' }
  }
}

export async function removeTenantFeatureFlagAction(
  flagId: string,
  companyId: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'feature.manage')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.removeTenantFeatureFlag(flagId, companyId)
    if (result.success) {
      revalidatePath('/platform/feature-flags')
      revalidatePath(`/platform/companies/${companyId}`)
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to remove tenant feature flag' }
  }
}

/**
 * 6. System Health, Background Jobs, & Emergency Controls
 */
export async function retryFailedJobAction(eventId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'system.job_retry')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.retryFailedJob(eventId)
    if (result.success) {
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retry job' }
  }
}

export async function resolveHealthEventAction(eventId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'system.resolve')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.resolveHealthEvent(eventId)
    if (result.success) {
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to resolve health event' }
  }
}

export async function retryBackgroundJobAction(jobId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'system.job_retry')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }

    const result = await PlatformService.retryBackgroundJob(jobId)
    if (result.success) {
      revalidatePath('/platform/jobs')
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to retry background job' }
  }
}

export async function setEmergencyControlAction(
  controlKey: string,
  isActive: boolean,
  reason: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only the root Platform Owner can activate emergency controls.' }
    }

    const result = await PlatformService.setEmergencyControl(controlKey, isActive, reason)
    if (result.success) {
      revalidatePath('/platform/emergency')
      revalidatePath('/platform')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to set emergency control' }
  }
}

/**
 * 7. Platform Users Management
 */
export async function updatePlatformUserAction(
  userId: string,
  updates: Partial<PlatformAdminUser>
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || (platformUser.role !== 'platform_owner' && platformUser.role !== 'platform_admin')) {
      return { success: false, error: 'Unauthorized: Only platform owners can manage platform users.' }
    }

    const result = await PlatformService.updatePlatformUser(userId, updates)
    if (result.success) {
      revalidatePath('/platform/admins')
      revalidatePath('/platform/users')
      revalidatePath('/platform/security')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update platform user' }
  }
}

export async function createPlatformAdminAction(formData: FormData) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only the Platform Owner can create platform administrators.' }
    }

    const email = (formData.get('email') as string)?.trim()?.toLowerCase()
    const fullName = (formData.get('full_name') as string)?.trim()
    const role = (formData.get('role') as any) || 'platform_admin'
    const phone = (formData.get('phone') as string)?.trim() || undefined
    const password = (formData.get('password') as string) || undefined
    const mfaEnabled = formData.get('mfa_enabled') === 'true'

    if (!email || !fullName) {
      return { success: false, error: 'Email and Full Name are required.' }
    }

    const res = await PlatformService.createPlatformAdmin({
      email,
      full_name: fullName,
      role,
      phone,
      password,
      mfa_enabled: mfaEnabled,
    })

    if (res.success) {
      revalidatePath('/platform/admins')
      revalidatePath('/platform/users')
      revalidatePath('/platform/security')
    }

    return res
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create platform administrator' }
  }
}

export async function deletePlatformAdminAction(adminId: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only the Platform Owner can delete platform administrators.' }
    }

    const res = await PlatformService.deletePlatformAdmin(adminId)
    if (res.success) {
      revalidatePath('/platform/admins')
      revalidatePath('/platform/users')
      revalidatePath('/platform/security')
    }
    return res
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete platform administrator' }
  }
}

/**
 * 8. Platform Owner Profile, Security, & Session Revocation
 */
export async function updatePlatformOwnerProfileAction(
  updates: { full_name?: string; phone?: string; avatar_url?: string; preferences?: Record<string, any> }
): Promise<ApiResponse<PlatformAdminUser>> {
  try {
    const platformUser = await getCurrentPlatformUser()
    const targetId = platformUser ? (platformUser.id || platformUser.user_id || platformUser.email) : undefined
    const result = await PlatformService.updatePlatformOwnerProfile(updates, targetId)
    if (result.success) {
      revalidatePath('/platform/profile')
      revalidatePath('/platform', 'layout')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update profile' }
  }
}

export async function changePlatformOwnerPasswordAction(
  currentPassword: string,
  newPassword: string,
  revokeOtherSessions: boolean = true
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    const result = await PlatformService.changePlatformOwnerPassword(
      currentPassword,
      newPassword,
      revokeOtherSessions,
      platformUser?.user_id,
      platformUser?.id
    )
    if (result.success) {
      revalidatePath('/platform/profile')
      revalidatePath('/platform/security')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to change password' }
  }
}

export async function togglePlatformOwnerMFAAction(enable: boolean) {
  try {
    const platformUser = await getCurrentPlatformUser()
    const result = await PlatformService.togglePlatformOwnerMFA(enable, platformUser?.id)
    if (result.success) {
      revalidatePath('/platform/profile')
      revalidatePath('/platform/security')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to toggle MFA' }
  }
}

export async function revokePlatformSessionAction(sessionId: string) {
  try {
    const result = await PlatformService.revokePlatformSession(sessionId)
    if (result.success) {
      revalidatePath('/platform/security')
      revalidatePath('/platform/profile')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke session' }
  }
}

export async function revokeAllOtherPlatformSessionsAction() {
  try {
    const platformUser = await getCurrentPlatformUser()
    const result = await PlatformService.revokeAllOtherPlatformSessions(platformUser?.id)
    if (result.success) {
      revalidatePath('/platform/security')
      revalidatePath('/platform/profile')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to revoke all sessions' }
  }
}

export async function exportTenantDataAction(companyId: string, modules: string[]) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || (!hasPlatformPermission(platformUser, 'tenant.view') && !hasPlatformPermission(platformUser, 'company.view'))) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }
    return PlatformService.exportTenantData(companyId, modules)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export tenant data' }
  }
}

export async function updateIncidentStatusAction(incidentId: string, status: any, resolutionNotes?: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || !hasPlatformPermission(platformUser, 'system.manage')) {
      return { success: false, error: 'Unauthorized: Insufficient platform permissions.' }
    }
    const result = await PlatformService.updateIncidentStatus(incidentId, status, resolutionNotes)
    if (result.success) {
      revalidatePath('/platform/incidents')
      revalidatePath('/platform/health')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update incident status' }
  }
}

export async function updateRBACTemplatePermissionAction(
  templateId: string,
  resource: string,
  action: PermissionActionKey,
  isAllowed: boolean
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only platform owner can modify global RBAC templates.' }
    }
    const result = await PlatformService.updateRBACTemplatePermission(templateId, resource, action, isAllowed)
    if (result.success) {
      revalidatePath('/platform/rbac')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update RBAC template permission' }
  }
}

export async function updatePlatformSettingsAction(settings: Record<string, any>, reason?: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only platform owner can modify system settings.' }
    }

    // Input Boundary Validation
    if (settings.session_timeout_minutes !== undefined) {
      const timeout = Number(settings.session_timeout_minutes)
      if (isNaN(timeout) || timeout < 5 || timeout > 1440) {
        return { success: false, error: 'Session timeout must be between 5 and 1440 minutes (24 hours).' }
      }
    }

    if (settings.rate_limit_requests_per_minute !== undefined) {
      const rateLimit = Number(settings.rate_limit_requests_per_minute)
      if (isNaN(rateLimit) || rateLimit < 10 || rateLimit > 10000) {
        return { success: false, error: 'Rate limit must be between 10 and 10,000 requests per minute.' }
      }
    }

    if (settings.max_export_records !== undefined) {
      const maxExport = Number(settings.max_export_records)
      if (isNaN(maxExport) || maxExport < 100 || maxExport > 100000) {
        return { success: false, error: 'Max export records must be between 100 and 100,000 rows.' }
      }
    }

    if (settings.default_trial_days !== undefined) {
      const trialDays = Number(settings.default_trial_days)
      if (isNaN(trialDays) || trialDays < 1 || trialDays > 365) {
        return { success: false, error: 'Default trial duration must be between 1 and 365 days.' }
      }
    }

    if (settings.default_vat_rate_pct !== undefined) {
      const vat = Number(settings.default_vat_rate_pct)
      if (isNaN(vat) || vat < 0 || vat > 100) {
        return { success: false, error: 'VAT percentage must be between 0% and 100%.' }
      }
    }

    if (settings.backup_retention_days !== undefined) {
      const retention = Number(settings.backup_retention_days)
      if (isNaN(retention) || retention < 7 || retention > 3650) {
        return { success: false, error: 'Backup retention must be between 7 and 3,650 days (10 years).' }
      }
    }

    const result = await PlatformService.updatePlatformSettings(settings, reason, platformUser.id)
    if (result.success) {
      revalidatePath('/platform/settings')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update platform settings' }
  }
}

export async function triggerPlatformBackupAction() {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform admin session required.' }
    }
    const result = await PlatformService.triggerManualBackup(platformUser.id)
    if (result.success) {
      revalidatePath('/platform/settings')
    }
    return result
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to trigger platform backup' }
  }
}

export async function exportPlatformConfigAction() {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser || platformUser.role !== 'platform_owner') {
      return { success: false, error: 'Unauthorized: Only platform owner can export system configurations.' }
    }
    const settingsRes = await PlatformService.getPlatformSettings()
    const flagsRes = await PlatformService.getFeatureFlags()
    const plansRes = await PlatformService.getPlans()

    const configArchive = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: platformUser.full_name || platformUser.email,
      environment: 'production',
      settings: settingsRes.data,
      feature_flags: flagsRes.data,
      subscription_plans: plansRes.data,
    }

    return {
      success: true,
      data: configArchive,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to export platform configuration' }
  }
}

export async function markNotificationReadAction(id: string) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.markNotificationRead(id)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to mark notification read' }
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.markAllNotificationsRead()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to mark notifications read' }
  }
}

/**
 * Server Action: Update / Toggle Tenant User Status (Platform Admin Privileged)
 */
export async function updateTenantUserStatusAction(
  companyUserId: string,
  newStatus: 'active' | 'disabled' | 'suspended' | 'invited',
  reason?: string
) {
  try {
    const platformUser = await getCurrentPlatformUser()
    if (!platformUser) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.updateTenantUserStatus(companyUserId, newStatus, reason)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update tenant user status' }
  }
}

