import { DashboardView } from '@/features/dashboard/dashboard-view'
import { getOwnerDashboardDataAction } from '@/actions/dashboard.actions'

interface DashboardPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { tenantSlug } = await params
  let initialSnapshot = null

  try {
    const res = await getOwnerDashboardDataAction()
    if (res.success && res.data) {
      initialSnapshot = res.data
    }
  } catch (err) {
    // Fail-open: Client Stale-While-Revalidate will hydrate if server-side fetch has network variance
  }

  return <DashboardView initialSnapshot={initialSnapshot} tenantSlug={tenantSlug} />
}

