'use client'

import React from 'react'
import { UsersManagementView } from '@/components/users/users-management-view'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function UsersManagementPage() {
  return (
    <PanelAccessGuard
      module="users"
      action="manage"
      panelTitle="Team Users & Roles Matrix"
      panelTitleBn="টিম সদস্য ও রোলস ম্যাট্রিক্স"
    >
      <UsersManagementView hideHeader={false} />
    </PanelAccessGuard>
  )
}
