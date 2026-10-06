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
  CreateFeatureFlagInput,
  UpdateFeatureFlagInput,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import {
  hasPlatformPermission,
  getCurrentPlatformUser,
} from '@/lib/auth/platform-auth'
import { getTenantLink } from '@/lib/tenant/tenant-url'
import { withPlatformAction } from '@/lib/actions/action-wrapper'
import { signSessionToken, verifySessionToken } from '@/lib/security/session-signer'

/**
 * 1. Tenant Lifecycle Actions
 */
export const updateCompanyStatusAction = withPlatformAction(
  {
    permission: 'tenant.edit',
    actionName: 'company.update_status',
    entityType: 'company',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (ctx, companyId: string, newStatus: PlatformCompanyStatus, reason?: string) => {
    const result = await PlatformService.updateCompanyStatus(companyId, newStatus, reason)
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/tenants/${companyId}`)
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/billing')
      revalidatePath('/platform/dashboard')
    }
    return result
  }
)

export const deleteBusinessAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'company.delete',
    entityType: 'company',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (ctx, companyId: string, reason?: string) => {
    if (!reason || !reason.trim()) {
      throw new Error('Reason for deletion (Audit Trail) is mandatory.')
    }

    const result = await PlatformService.deleteCompany(companyId, reason.trim())
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/tenants')
      revalidatePath('/platform/dashboard')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/billing')
    }
    return result
  }
)

import { deleteTenantPermanentlyAction as deleteTenantPermanentlyActionImpl } from './platform-data.actions'
export async function deleteTenantPermanentlyAction(
  ...args: Parameters<typeof deleteTenantPermanentlyActionImpl>
) {
  return deleteTenantPermanentlyActionImpl(...args)
}


import { AppError } from '@/lib/errors/app-error'

export const deleteAllBusinessesAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'company.purge_all',
    entityType: 'company',
  },
  async (ctx, reason?: string, _mfaCode?: string) => {
    if (process.env.ALLOW_PLATFORM_PURGE_ALL !== 'true') {
      throw new AppError({
        code: 'FORBIDDEN',
        message: 'Emergency purge is disabled in this environment. Set ALLOW_PLATFORM_PURGE_ALL=true in system configuration to enable.',
        messageBn: 'জরুরি পার্জ সিস্টেম কনফিগারেশনে নিষ্ক্রিয় রয়েছে। সক্রিয় করতে ALLOW_PLATFORM_PURGE_ALL=true সেট করুন।',
      })
    }
    if (!reason || reason.trim().length < 3) {
      throw new AppError({
        code: 'VALIDATION',
        message: 'A detailed operational reason (at least 3 characters) is required for audit trail.',
        messageBn: 'অডিট ট্রেইলের জন্য অন্তত ৩ অক্ষরের বিশদ কারণ উল্লেখ করা আবশ্যক।',
      })
    }

    const result = await PlatformService.deleteAllCompanies(reason.trim())
    if (result.success) {
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/tenants')
      revalidatePath('/platform/dashboard')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/billing')
    }
    return result
  }
)

export const changeCompanyPlanAction = withPlatformAction(
  {
    permission: 'plan.assign',
    audit: true,
    actionName: 'company.change_plan',
    entityType: 'company',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (ctx, companyId: string, newPlan: PlatformPlanCode, reason?: string) => {
    const result = await PlatformService.changeCompanyPlan(companyId, newPlan, reason, ctx.platformUser.id)
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath(`/platform/tenants/${companyId}`)
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/dashboard')
    }
    return result
  }
)

/**
 * Update Tenant Subscription Lifecycle, Plan, Interval, Dates & Quotas
 */
export const updateCompanySubscriptionAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.update',
    entityType: 'subscription',
    targetCompanyIdExtractor: (input: { companyId: string }) => input.companyId,
  },
  async (
    ctx,
    input: {
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
    }
  ) => {
    const result = await PlatformService.updateCompanySubscription({
      ...input,
      callerAdminId: ctx.platformUser.id,
    })
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/companies/${input.companyId}`)
      revalidatePath(`/platform/tenants/${input.companyId}`)
      revalidatePath('/platform/billing')
      revalidatePath('/platform/dashboard')
    }
    return result
  }
)

/**
 * Quick Extend Trial or Period Action
 */
export const extendSubscriptionTrialAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.extend_trial',
    entityType: 'subscription',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (
    ctx,
    companyId: string,
    days: number,
    target: 'trial' | 'period' = 'trial',
    reason?: string
  ) => {
    const result = await PlatformService.extendSubscriptionPeriod(
      companyId,
      days,
      target,
      reason,
      ctx.platformUser.id
    )
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath(`/platform/tenants/${companyId}`)
      revalidatePath('/platform/dashboard')
    }
    return result
  }
)

/**
 * Record Manual/Offline Payment Action
 */
export const recordManualSubscriptionPaymentAction = withPlatformAction(
  {
    permission: 'subscription.manage',
    audit: true,
    actionName: 'subscription.record_manual_payment',
    entityType: 'subscription',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (
    ctx,
    companyId: string,
    payment: {
      amount: number
      billingInterval: 'monthly' | 'yearly'
      paymentGateway: string
      transactionRef: string
      extendPeriodMonths?: number
      reason?: string
    }
  ) => {
    const result = await PlatformService.recordManualSubscriptionPayment(
      companyId,
      payment,
      ctx.platformUser.id
    )
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath(`/platform/tenants/${companyId}`)
      revalidatePath('/platform/dashboard')
      revalidatePath('/platform/billing')
    }
    return result
  }
)

/**
 * Override Custom Resource Limits Action
 */
export const overrideSubscriptionLimitsAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'subscription.override_limits',
    entityType: 'subscription',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (ctx, companyId: string, customLimits: Record<string, number> | null, reason?: string) => {
    if (!reason || !reason.trim()) {
      throw new Error('Reason for custom limit override (Audit Trail) is mandatory.')
    }

    const result = await PlatformService.updateCompanySubscription({
      companyId,
      customLimitsOverride: customLimits,
      reason: reason.trim(),
      callerAdminId: ctx.platformUser.id,
    })
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/platform', 'layout')
      revalidatePath('/platform/subscriptions')
      revalidatePath('/platform/tenants')
      revalidatePath(`/platform/tenants/${companyId}`)
    }
    return result
  }
)

/**
 * 2. Create Business (Atomic Platform Provisioning Flow)
 */
export const createBusinessAction = withPlatformAction(
  {
    permission: 'tenant.create',
    audit: true,
    actionName: 'company.create',
    entityType: 'company',
  },
  async (ctx, formData: FormData) => {
    const name = (formData.get('name') as string)?.trim()
    const nameBn = (formData.get('name_bn') as string)?.trim() || undefined
    const legalName = (formData.get('legal_name') as string)?.trim() || undefined
    const slug = (formData.get('slug') as string)?.trim()?.toLowerCase()
    const businessType = (formData.get('business_type') as string) || 'commercial_printing'
    const email = (formData.get('email') as string)?.trim() || undefined
    const phone = (formData.get('phone') as string)?.trim() || undefined
    const whatsapp = (formData.get('whatsapp') as string)?.trim() || undefined
    const address = (formData.get('address') as string)?.trim() || undefined
    const addressBn = (formData.get('address_bn') as string)?.trim() || undefined
    const officeHours = (formData.get('office_hours') as string)?.trim() || undefined
    const holidays = (formData.get('holidays') as string)?.trim() || undefined
    const logoUrl = (formData.get('logo_url') as string)?.trim() || undefined
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
      throw new Error('Company Name and unique Slug are required.')
    }

    const defaultOwnerPassword = ownerPassword || 'PrintFlow2026!Owner'

    const createRes = await TenantService.createCompany({
      name,
      name_bn: nameBn,
      legal_name: legalName,
      slug,
      business_type: businessType,
      email: email || ownerEmail,
      phone: phone || ownerPhone,
      whatsapp: whatsapp || phone || ownerPhone,
      address,
      address_bn: addressBn,
      office_hours: officeHours,
      holidays,
      logo_url: logoUrl,
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
      throw new Error(createRes.error || 'Failed to create business.')
    }

    const newCompany = createRes.data

    await PlatformService.recordAuditLog(
      'company.create',
      'company',
      newCompany.id,
      newCompany.id,
      ctx.platformUser.id,
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
        loginUrl: getTenantLink(newCompany.slug, '/login'),
        dashboardUrl: getTenantLink(newCompany.slug, '/dashboard'),
        plan: plan,
      },
    }
  }
)

/**
 * 3. Temporary Support Access Workflow
 */
export const startTenantSupportSessionAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'support.start',
    entityType: 'company',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (
    ctx,
    companyId: string,
    companySlug: string,
    companyName: string,
    reason: string,
    accessLevel: SupportAccessLevel = 'read_only',
    expiresInMinutes: number = 30
  ) => {
    if (!reason || !reason.trim()) {
      throw new Error('Explicit reason is mandatory for support session access.')
    }

    const effectiveMinutes = Math.min(Math.max(Number(expiresInMinutes) || 30, 5), 60)
    const sessionRes = await PlatformService.createSupportSession(
      companyId,
      reason.trim(),
      accessLevel,
      ctx.platformUser.id,
      effectiveMinutes
    )

    if (!sessionRes.success || !sessionRes.data) {
      throw new Error(sessionRes.error || 'Failed to initialize tenant support session')
    }

    const sessionPayload = {
      tenantSlug: companySlug,
      companyId: companyId,
      companyName: companyName,
      adminId: ctx.platformUser.id,
      adminEmail: ctx.platformUser.email,
      role: 'platform_support',
      sessionId: sessionRes.data.id,
      accessLevel: accessLevel,
      startedAt: sessionRes.data.started_at,
      expiresAt: sessionRes.data.expires_at,
      reason: reason.trim(),
    }

    const token = await signSessionToken(sessionPayload, `${effectiveMinutes}m`)
    const cookieStore = await cookies()
    cookieStore.set('printflow_support_tenant', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: effectiveMinutes * 60,
    })

    revalidatePath('/platform', 'layout')
    revalidatePath(`/platform/tenants/${companyId}`)
    revalidatePath('/platform/support')

    return {
      success: true,
      redirectUrl: `/${companySlug}/dashboard`,
      session: sessionRes.data,
    }
  }
)

export const extendSupportSessionAction = withPlatformAction(
  {
    permission: 'support.extend',
    actionName: 'support.extend',
    entityType: 'company',
  },
  async (ctx, sessionId: string, additionalMinutes: number = 15) => {
    const result = await PlatformService.extendSupportSession(sessionId, additionalMinutes)
    if (result.success && result.data) {
      const cookieStore = await cookies()
      const existing = cookieStore.get('printflow_support_tenant')?.value
      if (existing) {
        try {
          const parsed = await verifySessionToken<any>(existing)
          if (parsed) {
            parsed.expiresAt = result.data.expires_at
            const newToken = await signSessionToken(parsed, '60m')
            cookieStore.set('printflow_support_tenant', newToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              maxAge: 60 * 60,
            })
          }
        } catch {}
      }
    }
    return result
  }
)

export const exitTenantSupportSessionAction = withPlatformAction(
  {
    permission: 'platform.view',
    actionName: 'support.end',
    entityType: 'company',
  },
  async (_ctx) => {
    const cookieStore = await cookies()
    const existing = cookieStore.get('printflow_support_tenant')?.value
    if (existing) {
      try {
        const parsed = await verifySessionToken<any>(existing)
        if (parsed?.sessionId) {
          await PlatformService.revokeSupportSession(parsed.sessionId, 'Support session exited by platform user')
        }
      } catch {}
      cookieStore.delete('printflow_support_tenant')
    }
    revalidatePath('/platform', 'layout')
    revalidatePath('/platform/support')
    return { success: true }
  }
)

export const revokeSupportSessionAction = withPlatformAction(
  {
    permission: 'support.revoke',
    actionName: 'support.revoke',
    entityType: 'company',
  },
  async (ctx, sessionId: string, reason?: string) => {
    const result = await PlatformService.revokeSupportSession(sessionId, reason)
    const cookieStore = await cookies()
    const existing = cookieStore.get('printflow_support_tenant')?.value
    if (existing) {
      try {
        const parsed = await verifySessionToken<any>(existing)
        if (parsed?.sessionId === sessionId) {
          cookieStore.delete('printflow_support_tenant')
        }
      } catch {}
    }
    revalidatePath('/platform/support')
    return result
  }
)

/**
 * 4. Subscription Plans Management
 */
export const savePlanAction = withPlatformAction(
  {
    permission: 'plan.create',
    audit: true,
    actionName: 'plan.save',
    entityType: 'plan',
  },
  async (_ctx, planData: Partial<SubscriptionPlanRecord>): Promise<ApiResponse<SubscriptionPlanRecord>> => {
    const result = await PlatformService.savePlan(planData)
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/pricing')
      revalidatePath('/register')
      revalidatePath('/platform/plans')
      revalidatePath('/platform/subscriptions')
    }
    return result
  }
)

export const archivePlanAction = withPlatformAction(
  {
    permission: 'plan.archive',
    audit: true,
    actionName: 'plan.archive',
    entityType: 'plan',
  },
  async (_ctx, planId: string) => {
    const result = await PlatformService.archivePlan(planId)
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/pricing')
      revalidatePath('/register')
      revalidatePath('/platform/plans')
      revalidatePath('/platform/subscriptions')
    }
    return result
  }
)

export const reactivatePlanAction = withPlatformAction(
  {
    permission: 'plan.edit',
    audit: true,
    actionName: 'plan.reactivate',
    entityType: 'plan',
  },
  async (_ctx, planId: string) => {
    const result = await PlatformService.reactivatePlan(planId)
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/pricing')
      revalidatePath('/register')
      revalidatePath('/platform/plans')
      revalidatePath('/platform/subscriptions')
    }
    return result
  }
)

export const deletePlanAction = withPlatformAction(
  {
    destruct: true,
    permission: 'plan.delete',
    audit: true,
    actionName: 'plan.delete',
    entityType: 'plan',
  },
  async (_ctx, planId: string) => {
    const result = await PlatformService.deletePlan(planId)
    if (result.success) {
      revalidatePath('/', 'layout')
      revalidatePath('/pricing')
      revalidatePath('/register')
      revalidatePath('/platform/plans')
      revalidatePath('/platform/subscriptions')
    }
    return result
  }
)

/**
 * 5. Feature Flags & Overrides Engine
 */
export const createFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.create',
    entityType: 'feature_flag',
  },
  async (_ctx, input: CreateFeatureFlagInput) => {
    const result = await PlatformService.createFeatureFlag(input)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
      revalidatePath('/platform/tenants')
    }
    return result
  }
)

export const updateFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.update',
    entityType: 'feature_flag',
  },
  async (_ctx, flagIdOrKey: string, input: UpdateFeatureFlagInput) => {
    const result = await PlatformService.updateFeatureFlag(flagIdOrKey, input)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
    }
    return result
  }
)

export const deleteFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.delete',
    entityType: 'feature_flag',
  },
  async (_ctx, flagIdOrKey: string) => {
    const result = await PlatformService.deleteFeatureFlag(flagIdOrKey)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
    }
    return result
  }
)

export const toggleGlobalFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.toggle',
    entityType: 'feature_flag',
  },
  async (_ctx, flagIdOrKey: string, isEnabled: boolean, reason?: string) => {
    const result = await PlatformService.toggleGlobalFeatureFlag(flagIdOrKey, isEnabled, reason)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
      revalidatePath('/platform/companies')
      revalidatePath('/platform/dashboard')
    }
    return result
  }
)

export const setTenantFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.set_override',
    entityType: 'feature_flag',
    targetCompanyIdExtractor: (_f: string, companyId: string) => companyId,
  },
  async (_ctx, flagIdOrKey: string, companyId: string, isEnabled: boolean, notes?: string) => {
    const result = await PlatformService.setTenantFeatureFlag(flagIdOrKey, companyId, isEnabled, notes)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/tenants')
    }
    return result
  }
)

export const removeTenantFeatureFlagAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.remove_override',
    entityType: 'feature_flag',
    targetCompanyIdExtractor: (_f: string, companyId: string) => companyId,
  },
  async (_ctx, flagIdOrKey: string, companyId: string) => {
    const result = await PlatformService.removeTenantFeatureFlag(flagIdOrKey, companyId)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
      revalidatePath(`/platform/companies/${companyId}`)
      revalidatePath('/platform/tenants')
    }
    return result
  }
)

export const bulkSetTenantFeatureFlagsAction = withPlatformAction(
  {
    permission: 'feature.manage',
    audit: true,
    actionName: 'feature.bulk_override',
    entityType: 'feature_flag',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (
    _ctx,
    companyId: string,
    overrides: Array<{ flagIdOrKey: string; isEnabled: boolean; notes?: string }>,
    reason?: string
  ) => {
    const result = await PlatformService.bulkSetTenantFeatureFlags(companyId, overrides, reason)
    if (result.success) {
      revalidatePath('/platform/features')
      revalidatePath('/platform/feature-flags')
      revalidatePath(`/platform/companies/${companyId}`)
    }
    return result
  }
)

/**
 * 6. System Health, Background Jobs, & Emergency Controls
 */
export const retryFailedJobAction = withPlatformAction(
  {
    permission: 'system.job_retry',
    audit: true,
    actionName: 'job.retry',
    entityType: 'health_event',
  },
  async (_ctx, eventId: string) => {
    const result = await PlatformService.retryFailedJob(eventId)
    if (result.success) {
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  }
)

export const resolveHealthEventAction = withPlatformAction(
  {
    permission: 'system.resolve',
    audit: true,
    actionName: 'health.resolve',
    entityType: 'health_event',
  },
  async (_ctx, eventId: string) => {
    const result = await PlatformService.resolveHealthEvent(eventId)
    if (result.success) {
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  }
)

export const retryBackgroundJobAction = withPlatformAction(
  {
    permission: 'system.job_retry',
    audit: true,
    actionName: 'job.retry',
    entityType: 'background_job',
  },
  async (_ctx, jobId: string) => {
    const result = await PlatformService.retryBackgroundJob(jobId)
    if (result.success) {
      revalidatePath('/platform/jobs')
      revalidatePath('/platform/health')
      revalidatePath('/platform')
    }
    return result
  }
)

export const setEmergencyControlAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'emergency_controls.manage',
    entityType: 'system_alert',
  },
  async (ctx, controlKey: string, isActive: boolean, reason: string) => {
    if (!reason || !reason.trim()) {
      throw new Error('Reason for emergency control modification is mandatory.')
    }
    const result = await PlatformService.setEmergencyControl(controlKey, isActive, reason.trim())
    if (result.success) {
      revalidatePath('/platform/emergency')
      revalidatePath('/platform')
    }
    return result
  }
)

/**
 * 7. Platform Users Management
 */
export const updatePlatformUserAction = withPlatformAction(
  {
    permission: 'platform_user.manage',
    audit: true,
    actionName: 'platform_user.update',
    entityType: 'platform_admin',
  },
  async (ctx, userId: string, updates: Partial<PlatformAdminUser>) => {
    const callerRole = ctx.platformUser.role
    if (updates.role && callerRole !== 'platform_owner') {
      throw new Error('Unauthorized: Only the Platform Owner can assign or modify administrative roles.')
    }

    const result = await PlatformService.updatePlatformUser(userId, updates)
    if (result.success) {
      revalidatePath('/platform/admins')
      revalidatePath('/platform/users')
      revalidatePath('/platform/security')
    }
    return result
  }
)

export const createPlatformAdminAction = withPlatformAction(
  {
    permission: 'platform_user.manage',
    audit: true,
    actionName: 'platform_admin.create',
    entityType: 'platform_admin',
  },
  async (ctx, formData: FormData) => {
    if (ctx.platformUser.role !== 'platform_owner') {
      throw new Error('Unauthorized: Only the Platform Owner can create platform administrators.')
    }

    const email = (formData.get('email') as string)?.trim()?.toLowerCase()
    const fullName = (formData.get('full_name') as string)?.trim()
    const role = (formData.get('role') as any) || 'platform_admin'
    const phone = (formData.get('phone') as string)?.trim() || undefined
    const password = (formData.get('password') as string) || undefined
    const mfaEnabled = formData.get('mfa_enabled') === 'true'

    if (!email || !fullName) {
      throw new Error('Email and Full Name are required.')
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
  }
)

export const deletePlatformAdminAction = withPlatformAction(
  {
    destruct: true,
    permission: 'platform_user.manage',
    audit: true,
    actionName: 'platform_admin.delete',
    entityType: 'platform_admin',
  },
  async (ctx, adminId: string) => {
    if (ctx.platformUser.role !== 'platform_owner') {
      throw new Error('Unauthorized: Only the Platform Owner can delete platform administrators.')
    }

    const res = await PlatformService.deletePlatformAdmin(adminId)
    if (res.success) {
      revalidatePath('/platform/admins')
      revalidatePath('/platform/users')
      revalidatePath('/platform/security')
    }
    return res
  }
)

/**
 * 8. Platform Owner Profile, Security, & Session Revocation
 */
export const updatePlatformOwnerProfileAction = withPlatformAction(
  {
    permission: 'platform.view',
    audit: true,
    actionName: 'platform_user.update_profile',
    entityType: 'platform_admin',
  },
  async (
    ctx,
    updates: { full_name?: string; phone?: string; avatar_url?: string; preferences?: Record<string, any> }
  ): Promise<ApiResponse<PlatformAdminUser>> => {
    const result = await PlatformService.updatePlatformOwnerProfile(updates, ctx.platformUser.id)
    if (result.success) {
      revalidatePath('/platform/profile')
      revalidatePath('/platform', 'layout')
    }
    return result
  }
)

export const changePlatformOwnerPasswordAction = withPlatformAction(
  {
    permission: 'platform.view',
    audit: true,
    actionName: 'platform_user.change_password',
    entityType: 'platform_admin',
  },
  async (
    ctx,
    currentPassword: string,
    newPassword: string,
    revokeOtherSessions: boolean = true
  ) => {
    const result = await PlatformService.changePlatformOwnerPassword(
      currentPassword,
      newPassword,
      revokeOtherSessions,
      ctx.platformUser.user_id,
      ctx.platformUser.id
    )
    if (result.success) {
      revalidatePath('/platform/profile')
      revalidatePath('/platform/security')
    }
    return result
  }
)

export const togglePlatformOwnerMFAAction = withPlatformAction(
  {
    permission: 'platform.view',
    audit: true,
    actionName: 'platform_user.toggle_mfa',
    entityType: 'platform_admin',
  },
  async (ctx, enable: boolean, verificationCode?: string, secret?: string) => {
    const result = await PlatformService.togglePlatformOwnerMFA(
      enable,
      ctx.platformUser.id,
      verificationCode,
      secret
    )
    if (result.success) {
      if (enable) {
        try {
          const { cookies } = await import('next/headers')
          const { PLATFORM_SESSION_COOKIE } = await import('@/lib/auth/platform-auth')
          const { verifySessionToken, signSessionToken } = await import('@/lib/security/session-signer')
          const { getAuthCookieOptions } = await import('@/lib/tenant/tenant-resolution')
          const cookieStore = await cookies()
          const sessCookie = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value
          if (sessCookie) {
            const parsed = await verifySessionToken<any>(sessCookie)
            if (parsed) {
              const updatedToken = await signSessionToken(
                {
                  ...parsed,
                  mfaVerified: true,
                  mfaVerifiedAt: Date.now(),
                },
                '24h'
              )
              const cookieOpts = getAuthCookieOptions()
              cookieStore.set(PLATFORM_SESSION_COOKIE, updatedToken, {
                ...cookieOpts,
                httpOnly: true,
                maxAge: 60 * 60 * 24,
              })
            }
          }
        } catch (cookieErr) {
          console.warn('[togglePlatformOwnerMFAAction] Failed to update session cookie mfa flag:', cookieErr)
        }
      }
      revalidatePath('/platform/profile')
      revalidatePath('/platform/security')
    }
    return result
  }
)

export const generatePlatformMfaSecretAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx): Promise<{
    success: boolean
    secret?: string
    otpauthUri?: string
    qrCodeDataUrl?: string
    error?: string
  }> => {
    try {
      const { generateTotpSecret, generateOtpauthUri, generateTotpQrCodeDataUrl } = await import('@/lib/auth/totp')
      const secret = generateTotpSecret(20)
      const email = ctx.platformUser.email || 'admin@printflow.bd'
      const otpauthUri = generateOtpauthUri(email, 'PrintFlow', secret)
      const qrCodeDataUrl = await generateTotpQrCodeDataUrl(otpauthUri)
      return {
        success: true,
        secret,
        otpauthUri,
        qrCodeDataUrl,
      }
    } catch (err: any) {
      console.error('[generatePlatformMfaSecretAction] Error:', err)
      return {
        success: false,
        error: err?.message || 'Failed to generate MFA secret and QR code.',
      }
    }
  }
)

export const revokePlatformSessionAction = withPlatformAction(
  {
    permission: 'security.manage',
    audit: true,
    actionName: 'security.revoke_session',
    entityType: 'platform_session',
  },
  async (ctx, sessionId: string) => {
    const isOwner = ctx.platformUser.role === 'platform_owner'
    const result = await PlatformService.revokePlatformSession(sessionId, ctx.platformUser.id, isOwner)
    if (result.success) {
      revalidatePath('/platform/security')
      revalidatePath('/platform/profile')
      revalidatePath('/platform/sessions')
    }
    return result
  }
)

export const revokeAllOtherPlatformSessionsAction = withPlatformAction(
  {
    permission: 'security.manage',
    audit: true,
    actionName: 'security.revoke_all_sessions',
    entityType: 'platform_session',
  },
  async (ctx, exceptSessionId?: string) => {
    const result = await PlatformService.revokeAllOtherPlatformSessions(ctx.platformUser.id, exceptSessionId)
    if (result.success) {
      revalidatePath('/platform/security')
      revalidatePath('/platform/sessions')
      revalidatePath('/platform/profile')
    }
    return result
  }
)

export const exportTenantDataAction = withPlatformAction(
  {
    destruct: true,
    actionName: 'company.export',
    entityType: 'company',
    targetCompanyIdExtractor: (companyId: string) => companyId,
  },
  async (ctx, companyId: string, modules: string[], reason?: string) => {
    if (!reason || !reason.trim()) {
      throw new Error('Reason for tenant data export (Audit Trail) is mandatory.')
    }
    return PlatformService.exportTenantData(companyId, modules)
  }
)

export const updateIncidentStatusAction = withPlatformAction(
  {
    permission: 'incident.manage',
    audit: true,
    actionName: 'incident.update_status',
    entityType: 'incident',
  },
  async (_ctx, incidentId: string, status: any, resolutionNotes?: string) => {
    const result = await PlatformService.updateIncidentStatus(incidentId, status, resolutionNotes)
    if (result.success) {
      revalidatePath('/platform/incidents')
      revalidatePath('/platform/health')
    }
    return result
  }
)

export const updateRBACTemplatePermissionAction = withPlatformAction(
  {
    permission: 'platform_user.manage',
    audit: true,
    actionName: 'rbac.update_template',
    entityType: 'rbac_template',
  },
  async (
    ctx,
    templateId: string,
    resource: string,
    action: PermissionActionKey,
    isAllowed: boolean
  ) => {
    if (ctx.platformUser.role !== 'platform_owner') {
      throw new Error('Unauthorized: Only platform owner can modify global RBAC templates.')
    }
    const result = await PlatformService.updateRBACTemplatePermission(templateId, resource, action, isAllowed)
    if (result.success) {
      revalidatePath('/platform/permissions')
      revalidatePath('/platform/rbac')
    }
    return result
  }
)

export const updatePlatformSettingsAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'system.update_settings',
    entityType: 'system_settings',
  },
  async (ctx, settings: Record<string, any>, reason?: string) => {
    if (ctx.platformUser.role !== 'platform_owner') {
      throw new Error('Unauthorized: Only platform owner can modify system settings.')
    }

    // Input Boundary Validation
    if (settings.session_timeout_minutes !== undefined) {
      const timeout = Number(settings.session_timeout_minutes)
      if (isNaN(timeout) || timeout < 5 || timeout > 1440) {
        throw new Error('Session timeout must be between 5 and 1440 minutes (24 hours).')
      }
    }

    if (settings.rate_limit_requests_per_minute !== undefined) {
      const rateLimit = Number(settings.rate_limit_requests_per_minute)
      if (isNaN(rateLimit) || rateLimit < 10 || rateLimit > 10000) {
        throw new Error('Rate limit must be between 10 and 10,000 requests per minute.')
      }
    }

    if (settings.max_export_records !== undefined) {
      const maxExport = Number(settings.max_export_records)
      if (isNaN(maxExport) || maxExport < 100 || maxExport > 100000) {
        throw new Error('Max export records must be between 100 and 100,000 rows.')
      }
    }

    if (settings.default_trial_days !== undefined) {
      const trialDays = Number(settings.default_trial_days)
      if (isNaN(trialDays) || trialDays < 1 || trialDays > 365) {
        throw new Error('Default trial duration must be between 1 and 365 days.')
      }
    }

    if (settings.default_vat_rate_pct !== undefined) {
      const vat = Number(settings.default_vat_rate_pct)
      if (isNaN(vat) || vat < 0 || vat > 100) {
        throw new Error('VAT percentage must be between 0% and 100%.')
      }
    }

    if (settings.backup_retention_days !== undefined) {
      const retention = Number(settings.backup_retention_days)
      if (isNaN(retention) || retention < 7 || retention > 3650) {
        throw new Error('Backup retention must be between 7 and 3,650 days (10 years).')
      }
    }

    const result = await PlatformService.updatePlatformSettings(settings, reason, ctx.platformUser.id)
    if (result.success) {
      revalidatePath('/platform/settings')
    }
    return result
  }
)

export const triggerPlatformBackupAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'system.trigger_backup',
    entityType: 'backup',
  },
  async (ctx) => {
    const result = await PlatformService.triggerManualBackup(ctx.platformUser.id)
    if (result.success) {
      revalidatePath('/platform/settings')
    }
    return result
  }
)

export const triggerDisasterRecoveryDrillAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'system.dr_drill',
    entityType: 'dr_drill',
  },
  async (ctx) => {
    const result = await PlatformService.triggerDisasterRecoveryDrill(ctx.platformUser.id)
    if (result.success) {
      revalidatePath('/platform/settings')
    }
    return result
  }
)

export const testIncidentWebhookAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'system.test_webhook',
    entityType: 'webhook',
  },
  async (ctx, webhookUrl: string) => {
    return await PlatformService.testIncidentAlertWebhook(webhookUrl, ctx.platformUser.id)
  }
)

export const exportPlatformConfigAction = withPlatformAction(
  {
    permission: 'system.manage',
    audit: true,
    actionName: 'system.export_config',
    entityType: 'system_config',
  },
  async (ctx) => {
    if (ctx.platformUser.role !== 'platform_owner') {
      throw new Error('Unauthorized: Only platform owner can export system configurations.')
    }
    const settingsRes = await PlatformService.getPlatformSettings()
    const flagsRes = await PlatformService.getFeatureFlags()
    const plansRes = await PlatformService.getPlans()

    const configArchive = {
      export_version: '1.0',
      exported_at: new Date().toISOString(),
      exported_by: ctx.platformUser.full_name || ctx.platformUser.email,
      environment: 'production',
      settings: settingsRes.data,
      feature_flags: flagsRes.data,
      subscription_plans: plansRes.data,
    }

    return {
      success: true,
      data: configArchive,
    }
  }
)

export const markNotificationReadAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx, id: string) => {
    return await PlatformService.markNotificationRead(id, ctx.platformUser.id)
  }
)

export const markAllNotificationsReadAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx) => {
    return await PlatformService.markAllNotificationsRead(ctx.platformUser.id)
  }
)

/**
 * Server Action: Update / Toggle Tenant User Status (Platform Admin Privileged)
 */
export const updateTenantUserStatusAction = withPlatformAction(
  {
    permission: 'tenant.edit',
    audit: true,
    actionName: 'company_user.update_status',
    entityType: 'company_user',
  },
  async (_ctx, companyUserId: string, newStatus: 'active' | 'disabled' | 'suspended' | 'invited', reason?: string) => {
    return await PlatformService.updateTenantUserStatus(companyUserId, newStatus, reason)
  }
)

/**
 * Server Action: Resend Verification Email/OTP for Incomplete Registration
 */
export const resendIncompleteRegistrationVerificationAction = withPlatformAction(
  {
    permission: 'tenant.create',
    audit: true,
    actionName: 'registration.resend_verification',
    entityType: 'registration',
  },
  async (_ctx, email: string) => {
    const res = await PlatformService.resendIncompleteRegistrationVerification(email)
    if (res.success) {
      revalidatePath('/platform/tenants')
      revalidatePath('/platform/tenant')
    }
    return res
  }
)

/**
 * Server Action: Delete / Purge Abandoned Incomplete Registration
 */
export const deleteIncompleteRegistrationAction = withPlatformAction(
  {
    permission: 'tenant.create',
    audit: true,
    actionName: 'registration.delete',
    entityType: 'registration',
  },
  async (_ctx, idOrEmail: string, reason?: string) => {
    const res = await PlatformService.deleteIncompleteRegistration(idOrEmail, reason)
    if (res.success) {
      revalidatePath('/platform/tenants')
      revalidatePath('/platform/tenant')
    }
    return res
  }
)
