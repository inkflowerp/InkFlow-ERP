'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { TenantService, CreateCompanyInput } from '@/services/tenant.service'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { createClient } from '@/lib/supabase/server'

export async function createCompanyAction(data: CreateCompanyInput, fallbackUserId?: string) {
  const tenant = await getCurrentTenant()
  let resolvedUserId = tenant?.userId

  if (!resolvedUserId) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    resolvedUserId = user?.id || fallbackUserId || 'usr-01'
  }

  const result = await TenantService.createCompany(data, resolvedUserId)
  if (!result.success || !result.data) {
    return result
  }

  revalidatePath('/', 'layout')
  redirect(`/${result.data.slug}/dashboard`)
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
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
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
      !tenant.permissions.includes('*') &&
      !tenant.permissions.includes('settings.edit'))
  ) {
    return { success: false, error: 'Unauthorized: Insufficient permissions to modify company settings.' }
  }

  return await TenantService.updateCompanySettings(tenant.companyId, settings)
}

