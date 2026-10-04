import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformUsersClient from './users-client'

export const dynamic = 'force-dynamic'

export default async function PlatformUsersPage() {
  await requirePlatformPermission('tenant.view')
  return <PlatformUsersClient />
}
