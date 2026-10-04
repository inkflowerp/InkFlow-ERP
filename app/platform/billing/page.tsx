import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformBillingClient from './billing-client'

export const dynamic = 'force-dynamic'

export default async function PlatformBillingPage() {
  await requirePlatformPermission('subscription.view')
  return <PlatformBillingClient />
}
