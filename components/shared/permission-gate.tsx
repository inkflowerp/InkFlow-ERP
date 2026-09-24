'use client'

import React from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { PrimaryRole, PermissionAction } from '@/types/rbac.types'
import { normalizeModuleKey } from '@/lib/auth/rbac.client'

interface PermissionGateProps {
  permission?: string // e.g. "orders.create", "invoices.delete"
  allowedRoles?: PrimaryRole[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative component for conditional UI rendering based on RBAC permissions
 */
export function PermissionGate({
  permission,
  allowedRoles,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { activeRole, isOwner, can, hasPermission } = usePermissions()

  // Role assertion
  if (allowedRoles && !allowedRoles.includes(activeRole)) {
    return <>{fallback}</>
  }

  // Permission assertion
  if (permission) {
    if (isOwner) return <>{children}</>

    const parts = permission.split('.')
    if (parts.length === 2) {
      const [mod, act] = parts
      if (!can(act as PermissionAction, normalizeModuleKey(mod))) {
        return <>{fallback}</>
      }
    } else if (!hasPermission(permission)) {
      return <>{fallback}</>
    }
  }

  return <>{children}</>
}
