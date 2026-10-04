import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformCustomerSuccessClient from './customer-success-client'

export const dynamic = 'force-dynamic'

export default async function PlatformCustomerSuccessPage() {
  await requirePlatformPermission('platform.view')
  return <PlatformCustomerSuccessClient />
}
