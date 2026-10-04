import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformSessionsClient from './sessions-client'

export const dynamic = 'force-dynamic'

export default async function PlatformSessionsPage() {
  await requirePlatformPermission('security.view')
  return <PlatformSessionsClient />
}
