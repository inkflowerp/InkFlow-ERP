import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformFeatureFlagsClient from './feature-flags-client'

export const dynamic = 'force-dynamic'

export default async function PlatformFeatureFlagsPage() {
  await requirePlatformPermission('feature.view')
  return <PlatformFeatureFlagsClient />
}
