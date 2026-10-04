'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


import { BranchAnalyticsService } from '../services/branch-analytics.service.ts'
import { requireTenantUser } from '../lib/auth/tenant-auth.ts'

export const getBranchKPIsAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "branch-analytics"
  },
  async (ctx, branchId: string) => {
  const tenant = await requireTenantUser()
  try {
    const kpis = await BranchAnalyticsService.getBranchKPIs(tenant.companyId, branchId)
    return { success: true, data: kpis }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

export const getBranchComparisonAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "branch-analytics"
  },
  async (ctx, period: string = 'this_month') => {
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

})

export const getConsolidatedDashboardAction = withTenantAction(
  {
    permission: "reports.view",
    entityType: "branch-analytics"
  },
  async (ctx, period: string = 'this_month') => {
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

})
