import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformTenantsClient from './tenants-client'

export const dynamic = 'force-dynamic'

export default async function PlatformTenantsPage() {
  await requirePlatformPermission('tenant.view')
  return <PlatformTenantsClient />
}
