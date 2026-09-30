'use client'

import React from 'react'
import { RolesPage } from '@/components/users/roles-page'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function RolesMatrixPage() {
  return (
    <PanelAccessGuard
      module="users"
      action="manage"
      panelTitle="Roles & Permission Matrix"
      panelTitleBn="অনুমতি সেটিংস ও রোলস"
    >
      <RolesPage />
    </PanelAccessGuard>
  )
}
