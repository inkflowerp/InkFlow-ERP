import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformIncidentsClient from './incidents-client'

export const dynamic = 'force-dynamic'

export default async function PlatformIncidentsPage() {
  await requirePlatformPermission('incident.view')
  return <PlatformIncidentsClient />
}
