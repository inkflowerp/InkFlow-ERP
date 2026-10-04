import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformEmailClient from './email-client'

export const dynamic = 'force-dynamic'

export default async function PlatformEmailPage() {
  await requirePlatformPermission('system.view')
  return <PlatformEmailClient />
}
