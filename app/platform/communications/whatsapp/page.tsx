import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import PlatformWhatsAppClient from './whatsapp-client'

export const dynamic = 'force-dynamic'

export default async function PlatformWhatsAppPage() {
  await requirePlatformPermission('system.view')
  return <PlatformWhatsAppClient />
}
