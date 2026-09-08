'use client'

import React from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { PrimaryRole } from '@/types/rbac.types'
import { checkPermission } from '@/lib/auth/rbac.client'

interface PermissionGateProps {
  permission?: string // e.g. "order.create", "invoice.delete"
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
  const { currentRole } = useTenant()

  // Map tenant role to PrimaryRole
  const role: PrimaryRole = (currentRole as PrimaryRole) || 'business_owner'

  // Role assertion
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <>{fallback}</>
  }

  // Permission assertion
  if (permission && !checkPermission(role, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
