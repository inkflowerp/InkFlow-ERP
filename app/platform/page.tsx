import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformDashboardClient from './dashboard-client'

export const dynamic = 'force-dynamic'

export default async function PlatformDashboardPage() {
  await requirePlatformPermission('platform.view')
  return <PlatformDashboardClient />
}
