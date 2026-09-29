'use client'

import React from 'react'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PanelAccessGuard
      module="settings"
      action="view"
      panelTitle="Settings & Configuration"
      panelTitleBn="সেটিংস ও কনফিগারেশন"
    >
      {children}
    </PanelAccessGuard>
  )
}
