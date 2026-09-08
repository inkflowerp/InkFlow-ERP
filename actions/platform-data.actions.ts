'use server'

import { PlatformService } from '@/services/platform.service'
import {
  PlatformCompanyStatus,
  PlatformPlanCode,
  TenantHealthStatus,
} from '@/types/platform.types'
import { requirePlatformUser } from '@/lib/auth/platform-auth'

/**
 * Server Action: Get Platform Dashboard Overview Metrics
 */
export async function getPlatformDashboardOverviewAction() {
  await requirePlatformUser()
  return await PlatformService.getDashboardOverview()
}

/**
 * Server Action: Get Filtered & Paginated Companies / Tenants
 */
export async function getPlatformCompaniesAction(filters?: {
  search?: string
  status?: PlatformCompanyStatus
  plan?: PlatformPlanCode
  health?: TenantHealthStatus
  page?: number
  pageSize?: number
}) {
  await requirePlatformUser()
  return await PlatformService.getCompanies(filters)
}

/**
 * Server Action: Get 360 Degree View of a Specific Tenant Company
 */
export async function getPlatformCompany360Action(companyId: string) {
  await requirePlatformUser()
  return await PlatformService.getCompany360(companyId)
}

/**
 * Server Action: Get Subscription Plans
 */
export async function getPlatformPlansAction() {
  await requirePlatformUser()
  return await PlatformService.getPlans()
}

/**
 * Server Action: Get Feature Flags and Tenant Overrides
 */
export async function getPlatformFeatureFlagsAction() {
  await requirePlatformUser()
  return await PlatformService.getFeatureFlags()
}

/**
 * Server Action: Get System Health & Service Telemetry
 */
export async function getPlatformSystemHealthAction() {
  await requirePlatformUser()
  return await PlatformService.getSystemHealth()
}

/**
 * Server Action: Get Incidents List
 */
export async function getPlatformIncidentsAction() {
  await requirePlatformUser()
  return await PlatformService.getIncidents()
}

/**
 * Server Action: Get Background Jobs Status
 */
export async function getPlatformBackgroundJobsAction() {
  await requirePlatformUser()
  return await PlatformService.getBackgroundJobs()
}

/**
 * Server Action: Get Security Center Telemetry & Active Sessions
 */
export async function getPlatformSecurityOverviewAction() {
  await requirePlatformUser()
  return await PlatformService.getSecurityOverview()
}

/**
 * Server Action: Get Platform Audit Logs
 */
export async function getPlatformAuditLogsAction(filters?: {
  action?: string
  entityType?: string
  actorId?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  pageSize?: number
}) {
  await requirePlatformUser()
  return await PlatformService.getAuditLogs(filters)
}

/**
 * Server Action: Get Platform Administrator Users
 */
export async function getPlatformUsersAction() {
  await requirePlatformUser()
  return await PlatformService.getPlatformUsers()
}

/**
 * Server Action: Get Resource & Quota Usage Trends
 */
export async function getPlatformUsageTrendsAction(companyId?: string, period: '7d' | '30d' | '90d' = '30d') {
  await requirePlatformUser()
  return await PlatformService.getUsageTrends(companyId, period)
}

/**
 * Server Action: Get Billing & Reconciliation Summary
 */
export async function getPlatformBillingReconciliationAction() {
  await requirePlatformUser()
  return await PlatformService.getBillingReconciliation()
}

/**
 * Server Action: Get Customer Success & Churn Health
 */
export async function getPlatformCustomerSuccessMetricsAction() {
  await requirePlatformUser()
  return await PlatformService.getCustomerSuccessMetrics()
}

/**
 * Server Action: Get Platform System Settings
 */
export async function getPlatformSettingsAction() {
  await requirePlatformUser()
  return await PlatformService.getPlatformSettings()
}

/**
 * Server Action: Get Platform Backup Status
 */
export async function getPlatformBackupStatusAction() {
  await requirePlatformUser()
  return await PlatformService.getBackupStatus()
}

/**
 * Server Action: Get Emergency Controls Configuration
 */
export async function getPlatformEmergencyControlsAction() {
  await requirePlatformUser()
  return await PlatformService.getEmergencyControls()
}

/**
 * Server Action: Get Global RBAC Permission Templates
 */
export async function getPlatformRBACTemplatesAction() {
  await requirePlatformUser()
  return await PlatformService.getRBACTemplates()
}

/**
 * Server Action: Get Integrations & Gateway Health
 */
export async function getPlatformIntegrationsHealthAction() {
  await requirePlatformUser()
  return await PlatformService.getIntegrationsHealth()
}

/**
 * Server Action: Global Cross-Platform Search
 */
export async function searchPlatformGlobalAction(query: string) {
  await requirePlatformUser()
  return await PlatformService.globalSearch(query)
}

