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
