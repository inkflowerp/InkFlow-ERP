'use client'

import React from 'react'
import { UsersManagementView } from '@/components/users/users-management-view'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function RolesMatrixPage() {
  return (
    <PanelAccessGuard
      module="users"
      action="manage"
      panelTitle="Roles & Permission Matrix"
      panelTitleBn="অনুমতি সেটিংস ও রোলস"
    >
      <UsersManagementView hideHeader={false} initialTab="roles" />
    </PanelAccessGuard>
  )
}
