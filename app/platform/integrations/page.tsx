import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformIntegrationsClient from './integrations-client'

export const dynamic = 'force-dynamic'

export default async function PlatformIntegrationsPage() {
  await requirePlatformPermission('system.view')
  return <PlatformIntegrationsClient />
}
