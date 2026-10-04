import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformHealthClient from './health-client'

export const dynamic = 'force-dynamic'

export default async function PlatformHealthPage() {
  await requirePlatformPermission('system.view')
  return <PlatformHealthClient />
}
