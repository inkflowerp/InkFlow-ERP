import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformRbacClient from './rbac-client'

export const dynamic = 'force-dynamic'

export default async function PlatformRbacPage() {
  await requirePlatformPermission('platform_user.view')
  return <PlatformRbacClient />
}
