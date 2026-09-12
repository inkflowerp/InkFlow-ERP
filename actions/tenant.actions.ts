'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TenantService, CreateCompanyInput } from '@/services/tenant.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { createClient } from '@/lib/supabase/server'
import { TenantRepository } from '@/lib/repositories/tenant.repository'
import { TENANT_SESSION_COOKIE, TenantSessionData } from '@/lib/auth/types'

export async function createCompanyAction(data: CreateCompanyInput, fallbackUserId?: string) {
  const tenant = await getCurrentTenant()
  let resolvedUserId = tenant?.userId

  if (!resolvedUserId) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    resolvedUserId = user?.id || fallbackUserId
  }

  const result = await TenantService.createCompany(data, resolvedUserId)
  if (!result.success || !result.data) {
    return result
  }

  const company = result.data
  const effectiveUserId = (result as any).ownerUserId || resolvedUserId

  if (effectiveUserId) {
    const membership = await TenantRepository.resolveUserMembership(effectiveUserId, company.slug)
    const sessionData: TenantSessionData = {
      userId: effectiveUserId,
      userEmail: membership?.companyUser?.profile?.email || data.owner_email || data.email || '',
      fullName: membership?.companyUser?.profile?.full_name || data.owner_name || 'Business Owner',
      fullNameBn: membership?.companyUser?.profile?.full_name_bn || null,
      phone: membership?.companyUser?.profile?.phone || data.owner_phone || data.phone || null,
      companyId: company.id,
      companySlug: company.slug,
      companyName: company.name,
      companyNameBn: company.name_bn || company.name,
      branchId: membership?.companyUser?.branch_id || 'br-main',
      branchName: membership?.companyUser?.branch?.name || 'Main Branch',
      role: 'business_owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      permissions: membership?.effectivePermissions || [],
      loginTime: new Date().toISOString(),
      token: `auth-${effectiveUserId}`,
    }

    const cookieStore = await cookies()
    cookieStore.set(TENANT_SESSION_COOKIE, JSON.stringify(sessionData), {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
  }

  revalidatePath('/', 'layout')
  return { success: true, data: result.data }
}

export async function switchCompanyAction(slug: string) {
  revalidatePath('/', 'layout')
  redirect(`/${slug}/dashboard`)
}

export async function updateCompanyAction(companyId: string, data: any) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('settings.edit') &&
      !tenant.permissions.includes('company.edit'))
  ) {
    return { success: false, error: 'Unauthorized: Insufficient permissions to modify company details.' }
  }

  return await TenantService.updateCompany(tenant.companyId, data)
}

export async function updateCompanySettingsAction(companyId: string, settings: any) {
  const tenant = await getCurrentTenant(companyId)
  if (
    !tenant ||
    (tenant.companyRole !== 'business_owner' &&
      !tenant.permissions.includes('settings.edit') &&
      !tenant.permissions.includes('settings.manage'))
  ) {
    return { success: false, error: 'Unauthorized: Insufficient permissions to modify company settings.' }
  }

  return await TenantService.updateCompanySettings(tenant.companyId, settings)
}

