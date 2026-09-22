'use client'

import React from 'react'
import { UsersManagementView } from '@/components/users/users-management-view'

export default function RolesMatrixPage() {
  return <UsersManagementView hideHeader={false} initialTab="roles" />
}
