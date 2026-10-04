import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformSettingsClient from './settings-client'

export const dynamic = 'force-dynamic'

export default async function PlatformSettingsPage() {
  await requirePlatformPermission('system.manage')
  return <PlatformSettingsClient />
}
