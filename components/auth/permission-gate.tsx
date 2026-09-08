'use client'

import React from 'react'
import { PermissionAction, PermissionModule } from '@/types/rbac.types'
import { usePermissions } from '@/hooks/use-permissions'
import { ScopeCheckContext } from '@/lib/auth/rbac.client'

export interface PermissionGateProps {
  module: PermissionModule | string
  action: PermissionAction
  recordContext?: Partial<ScopeCheckContext>
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Conditionally renders UI elements based on effective user permissions & data scopes.
 *
 * Example:
 * <PermissionGate module="invoices" action="approve">
 *   <Button onClick={handleApprove}>Approve Invoice</Button>
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action,
  recordContext,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { can } = usePermissions()

  const allowed = can(action, module, recordContext)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
