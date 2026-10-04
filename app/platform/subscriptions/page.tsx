import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformSubscriptionsClient from './subscriptions-client'

export const dynamic = 'force-dynamic'

export default async function PlatformSubscriptionsPage() {
  await requirePlatformPermission('subscription.view')
  return <PlatformSubscriptionsClient />
}
