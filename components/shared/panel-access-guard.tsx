'use client'

import React, { useEffect, useState } from 'react'
import { usePermissions } from '@/hooks/use-permissions'
import { PanelAccessDenied } from './panel-access-denied'
import type { PermissionAction, PermissionModule, PrimaryRole } from '@/types/rbac.types'

export interface PanelAccessGuardProps {
  module: PermissionModule | string
  action?: PermissionAction
  panelTitle: string
  panelTitleBn?: string
  requiredRole?: PrimaryRole | PrimaryRole[]
  ownerOnly?: boolean
  allowIfAny?: Array<{ module: PermissionModule | string; action: PermissionAction }>
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Universal Panel Access Guard
 * Enforces strict fail-closed isolation across all employee panels.
 * If the user lacks permission, it immediately renders PanelAccessDenied,
 * completely halting child component execution and preventing data leakage.
 */
export function PanelAccessGuard({
  module,
  action = 'view',
  panelTitle,
  panelTitleBn,
  requiredRole,
  ownerOnly = false,
  allowIfAny,
  children,
  fallback,
}: PanelAccessGuardProps) {
  const { can, isOwner, hasRole, activeRole } = usePermissions()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR / initial client mount, return minimal loading placeholder to prevent flash
  if (!mounted) {
    return <div className="min-h-[200px] animate-pulse rounded-xl bg-slate-100/50 dark:bg-slate-900/40" />
  }

  // 1. Business Owner has universal bypass (unless explicitly overridden)
  if (isOwner) {
    return <>{children}</>
  }

  // 2. Owner-only panels (e.g. platform billing, branch management master)
  if (ownerOnly && !isOwner) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <PanelAccessDenied
        module={module}
        action={action}
        panelTitle={panelTitle}
        panelTitleBn={panelTitleBn}
        reason="This panel is strictly restricted to the Business Owner."
      />
    )
  }

  // 3. Check role requirement if specified
  if (requiredRole) {
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole]
    const roleMatched = hasRole(rolesArray)
    if (!roleMatched && !isOwner) {
      return fallback ? (
        <>{fallback}</>
      ) : (
        <PanelAccessDenied
          module={module}
          action={action}
          panelTitle={panelTitle}
          panelTitleBn={panelTitleBn}
          requiredRole={requiredRole}
        />
      )
    }
  }

  // 4. Primary module and action check
  const isAllowedPrimary = can(action, module)

  // 5. Alternate allowed permissions (union check)
  const isAllowedAlternate =
    Array.isArray(allowIfAny) && allowIfAny.length > 0
      ? allowIfAny.some((perm) => can(perm.action, perm.module))
      : false

  if (isAllowedPrimary || isAllowedAlternate) {
    return <>{children}</>
  }

  // 6. Fail-closed: render isolated access denied view
  return fallback ? (
    <>{fallback}</>
  ) : (
    <PanelAccessDenied
      module={module}
      action={action}
      panelTitle={panelTitle}
      panelTitleBn={panelTitleBn}
    />
  )
}
