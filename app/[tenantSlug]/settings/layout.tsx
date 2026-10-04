import React from 'react'
import { requireTenantPermission } from '@/lib/auth/tenant-auth'
import { UnsavedChangesProvider } from '@/components/settings/unsaved-changes-context'
import { SettingsHubShell } from '@/components/settings/settings-hub-shell'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

interface SettingsLayoutProps {
  params: Promise<{ tenantSlug: string }>
  children: React.ReactNode
}

export default async function SettingsLayout({ params, children }: SettingsLayoutProps) {
  const { tenantSlug } = await params
  await requireTenantPermission(tenantSlug, 'settings.view')

  return (
    <UnsavedChangesProvider>
      <PanelAccessGuard
        module="settings"
        action="view"
        panelTitle="Settings & Configuration"
        panelTitleBn="সেটিংস ও কনফিগারেশন"
      >
        <SettingsHubShell>{children}</SettingsHubShell>
      </PanelAccessGuard>
    </UnsavedChangesProvider>
  )
}
