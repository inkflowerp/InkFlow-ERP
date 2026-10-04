import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformSupportClient from './support-client'

export const dynamic = 'force-dynamic'

export default async function PlatformSupportPage() {
  await requirePlatformPermission('support.view')
  return <PlatformSupportClient />
}
