'use server'

import { cookies, headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TenantService, CreateCompanyInput } from '@/services/tenant.service'
import { AuthService } from '@/services/auth.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { TENANT_SESSION_COOKIE, TenantSessionData, resolveTenantRole } from '@/lib/auth/types'
import { getAuthCookieOptions } from '@/lib/tenant/tenant-resolution'
import { getTenantBaseUrl } from '@/lib/tenant/tenant-url'
import type { ApiResponse } from '@/types/common.types'
import type { CompanyRow } from '@/types/tenant.types'
import { withTenantAction } from '@/lib/actions/action-wrapper'
import { createSubdomainHandoffToken } from '@/lib/auth/subdomain-handoff'

async function getCookieOptions() {
  try {
    const headerStore = await headers()
    const requestHost = headerStore.get('x-forwarded-host') || headerStore.get('host') || undefined
    return getAuthCookieOptions(requestHost)
  } catch {
    return getAuthCookieOptions()
  }
}

/**
 * Server action for real-time slug availability check during onboarding
 */
export async function checkSlugAvailabilityAction(slug: string) {
  return await TenantService.checkSlugAvailability(slug)
}

export async function createCompanyAction(
  data: CreateCompanyInput,
  fallbackUserId?: string
): Promise<ApiResponse<CompanyRow> & { subdomainUrl?: string }> {
  const tenant = await getCurrentTenant()
  let resolvedUserId = tenant?.userId

  if (!resolvedUserId) {
    const user = await AuthService.getAuthUser()
    resolvedUserId = user?.id || fallbackUserId
  }

  const result = await TenantService.createCompany(data, resolvedUserId)
  if (!result.success || !result.data) {
    return result
  }

  const company = result.data
  const effectiveUserId = (result as any).ownerUserId || resolvedUserId

  // Ensure caches are invalidated for the newly created company so immediate lookups succeed
  TenantRepository.invalidateCompanyCache(company.slug)
  TenantRepository.invalidateCompanyCache(company.id)
  if (effectiveUserId) {
    TenantRepository.invalidateMembershipCache(effectiveUserId)
  }

  // 1. Establish active Supabase Auth user session if owner email & password were provided
  if (data.owner_email && data.owner_password) {
    try {
      await AuthService.signInWithPassword(
        data.owner_email.toLowerCase().trim(),
        data.owner_password
      )
    } catch (authErr) {
      console.warn('[createCompanyAction] Auto sign-in error:', authErr)
    }
  }

  // 2. Set Tenant Session Cookie
  let sessionData: TenantSessionData | null = null
  if (effectiveUserId) {
    const membership = await TenantRepository.resolveUserMembership(effectiveUserId, company.slug)
    sessionData = {
      userId: effectiveUserId,
      userEmail: membership?.companyUser?.profile?.email || data.owner_email || data.email || '',
      fullName: membership?.companyUser?.profile?.full_name || data.owner_name || 'Business Owner',
      fullNameBn: membership?.companyUser?.profile?.full_name_bn || null,
      phone: membership?.companyUser?.profile?.phone || data.owner_phone || data.phone || null,
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyNameBn: company.name_bn || null,
      legalName: company.legal_name || null,
      address: company.address || null,
      addressBn: company.address_bn || null,
      area: company.area || null,
      branchId: membership?.companyUser?.branch_id || 'br-main',
      branchName: membership?.companyUser?.branch?.name || 'Main Branch',
      role: 'business_owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      permissions: membership?.effectivePermissions || [],
      defaultLocale: (company as any).default_locale || data.default_language || 'bn',
      loginTime: new Date().toISOString(),
      token: `auth-${effectiveUserId}`,
    }

    const cookieStore = await cookies()
    const cookieOpts = await getCookieOptions()
    cookieStore.set(
      TENANT_SESSION_COOKIE,
      encodeURIComponent(JSON.stringify(sessionData)),
      cookieOpts
    )
    cookieStore.set(
      'printflow_locale',
      data.default_language || (company as any).default_locale || 'bn',
      cookieOpts
    )
  }

  revalidatePath('/', 'layout')

  // Check if current request is from localhost or PSL (e.g. *.vercel.app)
  let isPslOrLocalRequest = false
  try {
    const { headers } = await import('next/headers')
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

  let subdomainUrl = isPslOrLocalRequest
    ? `/${company.slug}/dashboard`
    : `${getTenantBaseUrl(company.slug)}/dashboard`

  if (!isPslOrLocalRequest && effectiveUserId) {
    try {
      const handoffToken = await createSubdomainHandoffToken({
        userId: effectiveUserId,
        email: data.owner_email || data.email || '',
        slug: company.slug,
        sessionData: sessionData || null,
      })
      subdomainUrl = `${getTenantBaseUrl(company.slug)}/api/auth/handoff?token=${handoffToken}&next=/dashboard`
    } catch (handoffErr) {
      console.warn('[createCompanyAction] Failed to create subdomain handoff token:', handoffErr)
    }
  }

  return { success: true, data: result.data, subdomainUrl }
}

export async function switchCompanyAction(slug: string) {
  const company = await TenantRepository.getCompanyBySlug(slug)
  if (!company) {
    return { success: false, error: 'Target workspace not found.' }
  }
  if (company.is_active === false) {
    return { success: false, error: 'Target workspace is currently suspended.' }
  }

  const currentTenant = await getCurrentTenant()
  let userId = currentTenant?.userId
  if (!userId) {
    const user = await AuthService.getAuthUser()
    userId = user?.id
  }

  if (!userId) {
    return { success: false, error: 'User is not authenticated.' }
  }

  const membership = await TenantRepository.resolveUserMembership(userId, company.id)
  if (!membership || !membership.companyUser) {
    return { success: false, error: 'User does not belong to target workspace.' }
  }

  const resolvedRole = resolveTenantRole(membership.primaryRole)

  const sessionData: TenantSessionData = {
    userId,
    userEmail: membership.companyUser.profile?.email || currentTenant?.userEmail || '',
    fullName: membership.companyUser.profile?.full_name || currentTenant?.fullName || 'Workspace User',
    fullNameBn: membership.companyUser.profile?.full_name_bn || currentTenant?.fullNameBn || null,
    phone: membership.companyUser.profile?.phone || currentTenant?.phone || null,
    companyId: company.id,
    companySlug: company.slug,
    companyName: company.name,
    companyNameBn: company.name_bn || null,
    legalName: company.legal_name || null,
    address: company.address || null,
    addressBn: company.address_bn || null,
    area: company.area || null,
    branchId: membership.companyUser.branch_id || currentTenant?.branchId || null,
    branchName: membership.companyUser.branch?.name || currentTenant?.branchName || 'Main Branch',
    role: resolvedRole,
    primaryRole: membership.primaryRole || resolvedRole,
    responsibilities: [resolvedRole],
    permissions: membership.effectivePermissions || [],
    loginTime: new Date().toISOString(),
    token: `auth-${userId}`,
  }

  const cookieStore = await cookies()
  cookieStore.set(
    TENANT_SESSION_COOKIE,
    encodeURIComponent(JSON.stringify(sessionData)),
    await getCookieOptions()
  )

  // Check if current request is from localhost or PSL (e.g. *.vercel.app)
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

  revalidatePath('/', 'layout')

  if (isPslOrLocalRequest) {
    redirect(`/${slug}/dashboard`)
  }

  const handoffToken = await createSubdomainHandoffToken({
    userId,
    email: sessionData.userEmail,
    slug: company.slug,
    sessionData,
  })
  const targetSubdomainUrl = `${getTenantBaseUrl(slug)}/api/auth/handoff?token=${handoffToken}&next=/dashboard`
  redirect(targetSubdomainUrl)
}

export const updateCompanyAction = withTenantAction(
  { permission: 'settings.edit', auditAction: 'company.update', entityType: 'company' },
  async (ctx, companyId: string, data: any) => {
    return await TenantService.updateCompany(ctx.companyId, data)
  }
)

export const updateCompanySettingsAction = withTenantAction(
  { permission: 'settings.edit', auditAction: 'settings.update', entityType: 'settings' },
  async (ctx, companyId: string, settings: any) => {
    return await TenantService.updateCompanySettings(ctx.companyId, settings)
  }
)

/**
 * Server action to reset all operational and transactional records for a company workspace
 */
export const resetTenantDataAction = withTenantAction(
  {
    permission: 'settings.manage',
    destructive: true,
    requirePasswordConfirm: true,
    auditAction: 'tenant.reset_data',
    entityType: 'company',
  },
  async (ctx, companyId?: string, confirmName?: string, password?: string) => {
    const result = await TenantService.resetTenantData(ctx.companyId)
    if (result.success) {
      revalidatePath('/', 'layout')
    }
    return result
  }
)


