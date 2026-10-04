import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformNotificationsClient from './notifications-client'

export const dynamic = 'force-dynamic'

export default async function PlatformNotificationsPage() {
  await requirePlatformPermission('platform.view')
  return <PlatformNotificationsClient />
}
