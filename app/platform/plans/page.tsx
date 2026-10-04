import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformPlansClient from './plans-client'

export const dynamic = 'force-dynamic'

export default async function PlatformPlansPage() {
  await requirePlatformPermission('plan.view')
  return <PlatformPlansClient />
}
