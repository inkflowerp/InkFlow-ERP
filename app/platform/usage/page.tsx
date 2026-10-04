import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformUsageClient from './usage-client'

export const dynamic = 'force-dynamic'

export default async function PlatformUsagePage() {
  await requirePlatformPermission('platform.view')
  return <PlatformUsageClient />
}
