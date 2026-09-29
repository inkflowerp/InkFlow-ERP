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

  const resolvedRoleFromUser: PrimaryRole = useMemo(() => {
    const raw = (
      currentUser?.roles?.[0]?.slug ||
      currentUser?.responsibilities?.[0] ||
      responsibilities[0] ||
      currentRole ||
      ''
    ).toLowerCase().trim()

    if (raw === 'business_owner' || raw === 'owner' || raw === 'platform_owner' || raw === 'admin') return 'business_owner'
    if (raw === 'branch_manager' || raw.includes('branch') || raw.includes('outlet') || raw.includes('showroom')) {
      return 'branch_manager'
    }
    if (
      raw === 'designer' ||
      raw === 'graphic_designer' ||
      raw.includes('design') ||
      raw.includes('graphic') ||
      raw.includes('prepress') ||
      raw.includes('artwork')
    ) {
      return 'designer'
    }
    if (raw === 'sales_manager' || raw === 'sales' || raw === 'sales_executive' || raw === 'manager' || raw.includes('sale')) return 'sales_manager'
    if (raw === 'operator' || raw === 'machine_operator' || raw === 'technician' || raw.includes('operat')) return 'operator'
    if (raw === 'production_manager' || raw === 'production' || raw.includes('production')) return 'production_manager'
    return 'general_staff'
  }, [currentUser, responsibilities, currentRole])

  const activeRole: PrimaryRole = simulatedRole || resolvedRoleFromUser || 'general_staff'

  // Construct current user permission context
  const userCtx: UserPermissionContext = useMemo(() => {
    const userResponsibilities = (currentUser?.responsibilities || (responsibilities.length > 0 ? responsibilities : [activeRole])) as string[]

    const isExplicitStaff = Boolean(
      activeRole === 'operator' ||
        activeRole === 'designer' ||
        activeRole === 'branch_manager' ||
        activeRole === 'sales_manager' ||
        activeRole === 'production_manager' ||
        activeRole === 'general_staff' ||
        (activeRole as any) === 'machine_operator' ||
        (activeRole as any) === 'graphic_designer' ||
        (activeRole as any) === 'accountant' ||
        (activeRole as any) === 'delivery_coordinator' ||
        (activeRole as any) === 'installer' ||
        (activeRole as any) === 'store_manager' ||
        currentRole === 'operator' ||
        currentRole === 'designer' ||
        currentRole === 'installer' ||
        currentRole === 'accountant' ||
        userResponsibilities.some((r) => {
          const s = String(r).toLowerCase()
          return [
            'operator',
            'machine_operator',
            'designer',
            'graphic_designer',
            'sales',
            'sales_manager',
            'sales_executive',
            'production',
            'production_manager',
            'accountant',
            'accounts',
            'delivery',
            'delivery_coordinator',
            'installer',
          ].includes(s) || s.includes('design') || s.includes('graphic') || s.includes('prepress') || s.includes('operat')
        })
    )

    const hasOwnerClaim = Boolean(
      activeRole === 'business_owner' ||
        activeRole === 'platform_owner' ||
        (activeRole as any) === 'owner' ||
        currentRole === 'owner' ||
        (currentRole as any) === 'business_owner' ||
        (currentUser && currentUser.responsibilities?.includes('business_owner')) ||
        responsibilities.includes('business_owner') ||
        (responsibilities as any[]).includes('owner')
    )

    // User is only owner if they have an owner claim AND are NOT explicit staff (unless activeRole is explicitly business_owner)
    const isOwner = Boolean(
      hasOwnerClaim &&
        (activeRole === 'business_owner' || activeRole === 'platform_owner' || (activeRole as any) === 'owner' || !isExplicitStaff)
    )

    return {
      userId: currentUser?.user_id || currentUser?.id || 'usr-default',
      primaryRole: activeRole,
      role: activeRole,
      responsibilities: userResponsibilities,
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
      const moduleKey = normalizeModuleKey(rawModule)
      const detail = getPermissionDetail(userCtx, moduleKey, action)
      if (!detail.isGranted) return false

      if (recordContext && userCtx.userId) {
        const userScope = getEffectiveDataScope(userCtx, moduleKey)
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

  const respList = (Array.isArray(userCtx.responsibilities) ? userCtx.responsibilities : []) as string[]
  const userRoleSlugs = Array.isArray(currentUser?.roles) ? currentUser.roles.map((r: any) => r?.slug || r?.name || '') : []

  // Check if role is present in ANY of: activeRole, responsibilities, or user roles
  const hasResponsibilityOrRole = (matchers: string[]) => {
    const lowerMatchers = matchers.map((m) => m.toLowerCase())
    if (lowerMatchers.includes(String(activeRole).toLowerCase())) return true
    if (lowerMatchers.includes(String(currentRole).toLowerCase())) return true
    if (respList.some((r) => lowerMatchers.includes(String(r).toLowerCase()))) return true
    if (userRoleSlugs.some((r) => lowerMatchers.includes(String(r).toLowerCase()))) return true
    return false
  }

  const matchesKeyword = (keywords: string[]) => {
    const lowerKeys = keywords.map((k) => k.toLowerCase())
    const activeStr = String(activeRole).toLowerCase()
    const currentStr = String(currentRole).toLowerCase()
    if (lowerKeys.some((k) => activeStr.includes(k) || currentStr.includes(k))) return true
    if (respList.some((r) => lowerKeys.some((k) => String(r).toLowerCase().includes(k)))) return true
    if (userRoleSlugs.some((r) => lowerKeys.some((k) => String(r).toLowerCase().includes(k)))) return true
    return false
  }

  // 1. Graphic Designer
  const isDesigner =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['designer', 'graphic_designer']) ||
      matchesKeyword(['design', 'graphic', 'prepress', 'pre-press', 'artwork']))

  // 2. Machine / Print Operator (No longer mutually excluded by isDesigner!)
  const isOperator =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['operator', 'machine_operator', 'pressman', 'printer']) ||
      matchesKeyword([
        'operat',
        'technician',
        'pressman',
        'printer',
        'press',
        'offset',
        'machinist',
        'die-cut',
      ]))

  // 3. Finishing & Fabrication Operator
  const isFinishing =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['finishing_operator', 'fabrication_operator', 'operator']) ||
      matchesKeyword(['finish', 'fabricat', 'binding', 'cutter', 'lamination']))

  // 4. Branch Manager
  const isBranchManager =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['branch_manager', 'branch_incharge']) ||
      matchesKeyword(['branch', 'outlet', 'showroom']))

  // 5. Salesperson / Sales Manager (No longer mutually excluded by isBranchManager!)
  const isSales =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['sales_manager', 'sales', 'sales_executive', 'manager']) ||
      matchesKeyword(['sale', 'marketing', 'crm']))

  // 6. Production Manager
  const isProduction =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['production_manager', 'production']) ||
      matchesKeyword(['production', 'factory', 'plant']))

  // 7. Accountant
  const isAccountant =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['accountant', 'accounts', 'billing', 'cashier']) ||
      matchesKeyword(['account', 'finance', 'billing', 'cashier']))

  // 8. Delivery Coordinator
  const isDelivery =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['delivery', 'delivery_coordinator', 'installer']) ||
      matchesKeyword(['deliver', 'install', 'courier', 'dispatch']))

  // 9. Inventory / Store Manager
  const isStore =
    !userCtx.isOwner &&
    (hasResponsibilityOrRole(['store_manager', 'inventory_manager']) ||
      matchesKeyword(['store', 'inventor', 'stock', 'warehouse']))

  const activeResponsibilities = respList.length > 0 ? respList : [activeRole]
  const isMultiRole = activeResponsibilities.length > 1

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
    isBranchManager,
    isSales,
    isDesigner,
    isProduction,
    isOperator,
    isFinishing,
    isStore,
    isAccountant,
    isDelivery,
    isStaff: !userCtx.isOwner,
    activeResponsibilities,
    isMultiRole,
  }
}

