import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformAdminsClient from './admins-client'

export const dynamic = 'force-dynamic'

export default async function PlatformAdminsPage() {
  await requirePlatformPermission('platform_user.view')
  return <PlatformAdminsClient />
}
