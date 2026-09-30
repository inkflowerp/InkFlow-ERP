'use client'

import React from 'react'
import { TeamUsersPage } from '@/components/users/team-users-page'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'

export default function UsersManagementPage() {
  return (
    <PanelAccessGuard
      module="users"
      action="manage"
      panelTitle="Team Users"
      panelTitleBn="টিম ব্যবহারকারী ও অ্যাক্সেস"
    >
      <TeamUsersPage />
    </PanelAccessGuard>
  )
}
