'use server'

import { getCurrentTenant } from '@/lib/auth/tenant-auth'
import { DashboardService, type OwnerDashboardSnapshot } from '@/services/dashboard.service'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Authoritatively fetches owner dashboard data snapshot from PostgreSQL repositories
 */
export async function getOwnerDashboardDataAction(
  branchId?: string | null
): Promise<ServerActionResult<OwnerDashboardSnapshot>> {
  try {
    const tenant = await getCurrentTenant()
    if (!tenant?.companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant company session found.',
      }
    }

    // 1. Multi-Branch Isolation Guard (Fail-Closed)
    const isOwnerOrAdmin =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      Boolean(tenant.isSupportMode)

    let effectiveBranchId = branchId
    if (!isOwnerOrAdmin && tenant.branchId) {
      // Branch-scoped staff cannot bypass branch filters or access unscoped company-wide data
      effectiveBranchId = tenant.branchId
    }

    // 2. Financial Permission Guard (Server-Side Gating)
    const hasFinancialPermission =
      isOwnerOrAdmin ||
      (tenant.companyRole as string) === 'manager' ||
      (tenant.primaryRole as string) === 'manager' ||
      (tenant.companyRole as string) === 'accountant' ||
      (tenant.primaryRole as string) === 'accountant' ||
      (Array.isArray(tenant.permissions) && (
        tenant.permissions.includes('finance.view') ||
        tenant.permissions.includes('finance.full_control') ||
        tenant.permissions.includes('billing.view') ||
        tenant.permissions.includes('billing.full_control') ||
        tenant.permissions.includes('reports.view')
      ))

    const snapshot = await DashboardService.getOwnerDashboardSnapshot(
      tenant.companyId,
      effectiveBranchId,
      hasFinancialPermission
    )

    return {
      success: true,
      data: snapshot,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to fetch owner dashboard data.',
    }
  }
}
