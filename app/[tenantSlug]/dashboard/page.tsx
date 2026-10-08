import { DashboardView } from '@/features/dashboard/dashboard-view'
import { getOwnerDashboardDataAction } from '@/actions/dashboard.actions'
import { requireTenantUser } from '@/lib/auth/tenant-auth'

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params
  const tenant = await requireTenantUser(tenantSlug)
  let initialSnapshot = null

  const isOwner =
    tenant.companyRole === 'business_owner' ||
    tenant.primaryRole === 'business_owner' ||
    Boolean(tenant.isSupportMode)

  const canViewReports = isOwner || tenant.permissions.includes('reports.view')

  if (canViewReports) {
    try {
      const res = await getOwnerDashboardDataAction()
      if (res.success && res.data) {
        initialSnapshot = res.data
      }
    } catch (err) {
      // Fail-open: Client Stale-While-Revalidate will hydrate if server-side fetch has network variance
    }
  }

  return <DashboardView initialSnapshot={initialSnapshot} tenantSlug={tenantSlug} />
}
