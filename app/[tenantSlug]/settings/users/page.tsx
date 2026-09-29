'use client'

import React from 'react'
import { UsersManagementView } from '@/components/users/users-management-view'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function UsersManagementPage() {
  return (
    <PanelAccessGuard
      module="users"
      action="manage"
      panelTitle="Team Users & Staff Access"
      panelTitleBn="টিম সদস্য ও প্রবেশাধিকার"
    >
      <UsersManagementView hideHeader={false} />
    </PanelAccessGuard>
  )
}
