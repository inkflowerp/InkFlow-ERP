import { redirect } from 'next/navigation'
import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { getRoleDefaultPath } from '@/lib/auth/types'

interface TenantPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { tenantSlug } = await params
  const tenant = await getCurrentTenant(tenantSlug)

  if (!tenant) {
    redirect(`/login?redirectTo=/${tenantSlug}`)
  }

  const role = tenant.companyRole || tenant.primaryRole
  const defaultPath = getRoleDefaultPath(role, tenantSlug)
  redirect(defaultPath)
}
