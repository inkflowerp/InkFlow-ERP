import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformSecurityClient from './security-client'

export const dynamic = 'force-dynamic'

export default async function PlatformSecurityPage() {
  await requirePlatformPermission('security.view')
  return <PlatformSecurityClient />
}
