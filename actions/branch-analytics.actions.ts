'use server'

import { BranchAnalyticsService } from '../services/branch-analytics.service.ts'
import { requireTenantUser } from '../lib/auth/tenant-auth.ts'

export async function getBranchKPIsAction(branchId: string) {
  const tenant = await requireTenantUser()
  try {
    const kpis = await BranchAnalyticsService.getBranchKPIs(tenant.companyId, branchId)
    return { success: true, data: kpis }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getBranchComparisonAction(period: string = 'this_month') {
  const tenant = await requireTenantUser()
  try {
    const comparison = await BranchAnalyticsService.getBranchComparison(
      tenant.companyId,
      period
    )
    return { success: true, data: comparison }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getConsolidatedDashboardAction(
  period: string = 'this_month'
) {
  const tenant = await requireTenantUser()
  try {
    const dashboard = await BranchAnalyticsService.getConsolidatedDashboard(
      tenant.companyId,
      period
    )
    return { success: true, data: dashboard }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
