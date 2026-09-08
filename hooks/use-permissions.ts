'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import {
  PrimaryRole,
  PermissionAction,
  PermissionModule,
  DataScope,
} from '@/types/rbac.types'
import {
  checkPermission,
  getPermissionDetail,
  getEffectiveDataScope,
  checkDataScopeAccess,
  normalizeModuleKey,
  UserPermissionContext,
  EffectivePermissionDetail,
  ScopeCheckContext,
} from '@/lib/auth/rbac.client'

export function usePermissions() {
  const { currentRole, currentUser, responsibilities } = useTenant()
  const [simulatedRole, setSimulatedRole] = useState<PrimaryRole | null>(null)

  const activeRole: PrimaryRole =
    simulatedRole ||
    (currentUser?.roles?.[0]?.slug as PrimaryRole) ||
    (currentRole as PrimaryRole) ||
    'general_staff'

  // Construct current user permission context
  const userCtx: UserPermissionContext = useMemo(() => {
    const isOwner = Boolean(
      currentUser &&
        (activeRole === 'business_owner' ||
          activeRole === 'platform_owner' ||
          currentRole === 'owner')
    )

    return {
      userId: currentUser?.user_id || currentUser?.id,
      primaryRole: activeRole,
      role: activeRole,
      responsibilities: currentUser?.responsibilities || (responsibilities.length > 0 ? responsibilities : [activeRole]),
      overrides: currentUser?.overrides || {},
      data_scopes: currentUser?.data_scopes || {},
      isOwner,
    }
  }, [activeRole, currentRole, currentUser, responsibilities])

  /**
   * Evaluates if current user can perform an action on a module,
   * optionally verifying data scope against a specific record context.
   */
  const can = useCallback(
    (
      action: PermissionAction,
      rawModule: string,
      recordContext?: Partial<ScopeCheckContext>
    ): boolean => {
      const module = normalizeModuleKey(rawModule)
      const detail = getPermissionDetail(userCtx, module, action)
      if (!detail.isGranted) return false

      if (recordContext && userCtx.userId) {
        const userScope = getEffectiveDataScope(userCtx, module)
        const isOwnerOrAdmin =
          userCtx.isOwner ||
          userCtx.primaryRole === 'business_owner' ||
          userCtx.primaryRole === 'platform_owner'

        const scopeContext: ScopeCheckContext = {
          userId: userCtx.userId,
          userDepartment: currentUser?.department || null,
          userBranchId: currentUser?.branch_id || null,
          recordOwnerId: recordContext.recordOwnerId,
          recordAssigneeId: recordContext.recordAssigneeId,
          recordDepartment: recordContext.recordDepartment,
          recordBranchId: recordContext.recordBranchId,
          isOwnerOrAdmin,
        }

        return checkDataScopeAccess(userScope, scopeContext)
      }

      return true
    },
    [userCtx, currentUser]
  )

  /**
   * Retrieves full permission evaluation details (source, override status, etc.)
   */
  const getDetail = useCallback(
    (rawModule: string, action: PermissionAction): EffectivePermissionDetail => {
      return getPermissionDetail(userCtx, rawModule, action)
    },
    [userCtx]
  )

  /**
   * Retrieves effective data scope for a module
   */
  const getScope = useCallback(
    (rawModule: string): DataScope => {
      return getEffectiveDataScope(userCtx, rawModule)
    },
    [userCtx]
  )

  /**
   * Determines if a module is naturally in read-only mode for the current user
   * (i.e. User has VIEW permission, but lacks CREATE and EDIT permissions).
   */
  const isReadOnly = useCallback(
    (rawModule: string): boolean => {
      const canView = can('view', rawModule)
      const canEdit = can('edit', rawModule)
      const canCreate = can('create', rawModule)
      return canView && !canEdit && !canCreate
    },
    [can]
  )

  const hasPermission = useCallback(
    (permissionCode: string, userOverrides?: Record<string, boolean>) => {
      return checkPermission(userCtx, permissionCode, userOverrides)
    },
    [userCtx]
  )

  const hasRole = useCallback(
    (allowedRoles: PrimaryRole[]) => {
      return allowedRoles.includes(activeRole)
    },
    [activeRole]
  )

  return {
    activeRole,
    currentUser,
    userCtx,
    setSimulatedRole,
    can,
    getDetail,
    getScope,
    isReadOnly,
    hasPermission,
    hasRole,
    isOwner: userCtx.isOwner,
    isSales: activeRole === 'sales_manager',
    isDesigner: activeRole === 'designer',
    isProduction: activeRole === 'production_manager',
    isOperator: activeRole === 'operator',
    isAccountant: activeRole === 'general_staff' && currentUser?.roles?.[0]?.slug === 'accountant',
    isDelivery: activeRole === 'general_staff' && currentUser?.roles?.[0]?.slug === 'installer',
    isStaff: activeRole === 'general_staff',
  }
}

