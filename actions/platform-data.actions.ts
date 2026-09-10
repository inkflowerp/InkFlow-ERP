'use server'

import { PlatformService } from '@/services/platform.service'
import {
  PlatformCompanyStatus,
  PlatformPlanCode,
  TenantHealthStatus,
  PlatformDashboardMetrics,
  NeedsAttentionItem,
  PlatformTenantCompany,
  Company360Data,
  PlatformFeatureFlagItem,
  PlatformFeatureFlagsOverview,
  SystemHealthSummary,
  SystemHealthEvent,
  PlatformIncidentItem,
  PlatformBackgroundJobItem,
  PlatformSecurityOverview,
  PlatformAuditLogItem,
  PlatformAuditMetrics,
  PlatformAuditFilters,
  PlatformAdminUser,
  UsageTrendsData,
  BillingOverviewMetrics,
  CustomerSuccessData,
  PlatformSystemSettings,
  PlatformBackupStatus,
  EmergencyControlItem,
  PlatformRBACTemplate,
  IntegrationProviderStatus,
  GlobalSearchResult,
  ApiResponse,
  PlatformTenantUserItem,
  PlatformSupportSessionRecord,
  PlatformSupportOverviewStats,
  PlatformNotificationItem,
  PlatformSubscriptionRecord,
  PlatformSubscriptionsOverview,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import { getCurrentPlatformUser } from '@/lib/auth/platform-auth'

/**
 * Server Action: Get Platform Subscriptions with Live Usage & Timeline Intelligence
 */
export async function getPlatformSubscriptionsAction(filters?: {
  search?: string
  status?: string
  plan?: string
  interval?: string
}): Promise<ApiResponse<PlatformSubscriptionsOverview>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getSubscriptions(filters)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch platform subscriptions' }
  }
}

/**
 * Server Action: Get Platform Dashboard Overview Metrics
 */
export async function getPlatformDashboardOverviewAction(): Promise<
  ApiResponse<PlatformDashboardMetrics & { needs_attention: NeedsAttentionItem[] }>
> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getDashboardOverview()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch dashboard metrics' }
  }
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
}): Promise<ApiResponse<{ companies: PlatformTenantCompany[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getCompanies(filters)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch companies' }
  }
}

/**
 * Server Action: Get 360 Degree View of a Specific Tenant Company
 */
export async function getPlatformCompany360Action(companyId: string): Promise<ApiResponse<Company360Data>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getCompany360(companyId)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch company details' }
  }
}

/**
 * Server Action: Get Subscription Plans
 */
export async function getPlatformPlansAction(): Promise<ApiResponse<SubscriptionPlanRecord[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getPlans()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch plans' }
  }
}

/**
 * Server Action: Get Feature Flags and Tenant Overrides
 */
export async function getPlatformFeatureFlagsAction(): Promise<ApiResponse<PlatformFeatureFlagsOverview>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getFeatureFlags()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch feature flags' }
  }
}

/**
 * Server Action: Get System Health & Service Telemetry
 */
export async function getPlatformSystemHealthAction(): Promise<
  ApiResponse<{ summary: SystemHealthSummary; events: SystemHealthEvent[] }>
> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getSystemHealth()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch system health' }
  }
}

/**
 * Server Action: Get Incidents List
 */
export async function getPlatformIncidentsAction(): Promise<ApiResponse<PlatformIncidentItem[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getIncidents()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch incidents' }
  }
}

/**
 * Server Action: Get Background Jobs Status
 */
export async function getPlatformBackgroundJobsAction(): Promise<ApiResponse<PlatformBackgroundJobItem[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getBackgroundJobs()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch background jobs' }
  }
}

/**
 * Server Action: Get Security Center Telemetry & Active Sessions
 */
export async function getPlatformSecurityOverviewAction(): Promise<ApiResponse<PlatformSecurityOverview>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getSecurityOverview()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch security overview' }
  }
}

/**
 * Server Action: Get Platform Audit Logs
 */
export async function getPlatformAuditLogsAction(
  filters?: PlatformAuditFilters
): Promise<ApiResponse<{ logs: PlatformAuditLogItem[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getAuditLogs(filters)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch audit logs' }
  }
}

/**
 * Server Action: Get Platform Audit Metrics
 */
export async function getPlatformAuditMetricsAction(): Promise<ApiResponse<PlatformAuditMetrics>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getAuditMetrics()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch audit metrics' }
  }
}

/**
 * Server Action: Get Platform Administrator Users
 */
export async function getPlatformUsersAction(): Promise<ApiResponse<PlatformAdminUser[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getPlatformUsers()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch platform users' }
  }
}

/**
 * Server Action: Get Resource & Quota Usage Trends
 */
export async function getPlatformUsageTrendsAction(
  companyId?: string,
  period: '7d' | '30d' | '90d' | '12m' = '30d'
): Promise<ApiResponse<UsageTrendsData>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getUsageTrends(companyId, period)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch usage trends' }
  }
}

/**
 * Server Action: Get Billing & Reconciliation Summary
 */
export async function getPlatformBillingReconciliationAction(): Promise<ApiResponse<BillingOverviewMetrics>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getBillingReconciliation()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch billing reconciliation' }
  }
}

/**
 * Server Action: Get Customer Success & Churn Health
 */
export async function getPlatformCustomerSuccessMetricsAction(): Promise<ApiResponse<CustomerSuccessData>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getCustomerSuccessMetrics()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch customer success metrics' }
  }
}

/**
 * Server Action: Get Platform System Settings
 */
export async function getPlatformSettingsAction(): Promise<ApiResponse<PlatformSystemSettings>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getPlatformSettings()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch platform settings' }
  }
}

/**
 * Server Action: Get Platform Backup Status
 */
export async function getPlatformBackupStatusAction(): Promise<ApiResponse<PlatformBackupStatus>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getBackupStatus()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch backup status' }
  }
}

/**
 * Server Action: Get Emergency Controls Configuration
 */
export async function getPlatformEmergencyControlsAction(): Promise<ApiResponse<EmergencyControlItem[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getEmergencyControls()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch emergency controls' }
  }
}

/**
 * Server Action: Get Global RBAC Permission Templates
 */
export async function getPlatformRBACTemplatesAction(): Promise<ApiResponse<PlatformRBACTemplate[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getRBACTemplates()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch RBAC templates' }
  }
}

/**
 * Server Action: Get Integrations & Gateway Health
 */
export async function getPlatformIntegrationsHealthAction(): Promise<ApiResponse<IntegrationProviderStatus[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getIntegrationsHealth()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch integrations health' }
  }
}

/**
 * Server Action: Test / Ping Specific Integration Gateway
 */
export async function testIntegrationPingAction(providerKey: string): Promise<ApiResponse<{ key: string; latency_ms: number; status: string; message: string }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.testIntegrationPing(providerKey)
  } catch (err: any) {
    return { success: false, error: err?.message || `Failed to test integration ${providerKey}` }
  }
}

/**
 * Server Action: Global Cross-Platform Search
 */
export async function searchPlatformGlobalAction(query: string): Promise<ApiResponse<GlobalSearchResult>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.globalSearch(query)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to perform search' }
  }
}

/**
 * Server Action: Get Cross-Tenant User Registry for Platform Owner
 */
export async function getPlatformTenantUsersAction(filters?: {
  search?: string
  companyId?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<{ users: PlatformTenantUserItem[]; total: number }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getTenantUsersList(filters)
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch tenant users' }
  }
}

/**
 * Server Action: Get Platform Support Sessions (Active & History)
 */
export async function getPlatformSupportSessionsAction(): Promise<ApiResponse<PlatformSupportSessionRecord[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getSupportSessions()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch support sessions' }
  }
}

/**
 * Server Action: Get Platform Support Telemetry & Overview Stats
 */
export async function getPlatformSupportOverviewStatsAction(): Promise<ApiResponse<PlatformSupportOverviewStats>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    return await PlatformService.getSupportOverviewStats()
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch support statistics' }
  }
}

/**
 * Server Action: Get Platform System & Security Notifications
 */
export async function getPlatformNotificationsAction(): Promise<ApiResponse<PlatformNotificationItem[]>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    const data = await PlatformService.getNotifications()
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch notifications' }
  }
}

/**
 * Server Action: Broadcast Platform Administrative Alert / Notice
 */
export async function broadcastPlatformNotificationAction(payload: {
  title: string
  message: string
  severity?: 'info' | 'warning' | 'critical'
  type?: string
  company_id?: string | null
  action_url?: string | null
  target_audience?: 'all_tenants' | 'all_admins' | 'specific_tenant'
}): Promise<ApiResponse<PlatformNotificationItem>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    if (!payload.title || !payload.message) {
      return { success: false, error: 'Title and message are required.' }
    }
    const res = await PlatformService.broadcastNotification(payload, user.id)
    if (!res.success || !res.data) {
      return { success: false, error: res.error || 'Failed to broadcast notification' }
    }
    return { success: true, data: res.data }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to broadcast notification' }
  }
}

/**
 * Server Action: Delete Platform Notification
 */
export async function deletePlatformNotificationAction(id: string): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    await PlatformService.deleteNotification(id, user.id)
    return { success: true, data: { success: true } }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete notification' }
  }
}

/**
 * Server Action: Clear All Read Notifications
 */
export async function clearAllReadPlatformNotificationsAction(): Promise<ApiResponse<{ success: boolean }>> {
  try {
    const user = await getCurrentPlatformUser()
    if (!user) {
      return { success: false, error: 'Unauthorized: Platform session required.' }
    }
    await PlatformService.clearAllReadNotifications(user.id)
    return { success: true, data: { success: true } }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to clear read notifications' }
  }
}


