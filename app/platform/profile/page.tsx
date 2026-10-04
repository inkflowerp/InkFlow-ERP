import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformProfileClient from './profile-client'

export const dynamic = 'force-dynamic'

export default async function PlatformProfilePage() {
  await requirePlatformPermission('platform.view')
  return <PlatformProfileClient />
}
