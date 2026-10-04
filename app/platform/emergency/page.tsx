import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformEmergencyClient from './emergency-client'

export const dynamic = 'force-dynamic'

export default async function PlatformEmergencyPage() {
  await requirePlatformPermission('emergency_controls.manage')
  return <PlatformEmergencyClient />
}
