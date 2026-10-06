import React from 'react'
import { requirePlatformPermission } from '@/lib/auth/platform-auth'
import { LandingPageService } from '@/services/landing-page.service'
import LandingPageSettingsClient from './landing-page-settings-client'

export const dynamic = 'force-dynamic'

export default async function PlatformLandingPageSettingsPage() {
  await requirePlatformPermission('system.manage')
  const initialData = await LandingPageService.getAdminConfig()

  return <LandingPageSettingsClient initialData={initialData} />
}
