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
  PlatformNotificationFilterOptions,
  PlatformSubscriptionsOverview,
  IncompleteRegistrationStage,
  IncompleteRegistrationsOverview,
} from '@/types/platform.types'
import { SubscriptionPlanRecord } from '@/types/subscription.types'
import { withPlatformAction } from '@/lib/actions/action-wrapper'
import { recordPlatformAuditLog } from '@/lib/auth/platform-auth'

/**
 * Server Action: Get Platform Subscriptions with Live Usage & Timeline Intelligence
 */
export const getPlatformSubscriptionsAction = withPlatformAction(
  { permission: 'subscription.view' },
  async (_ctx, filters?: {
    search?: string
    status?: string
    plan?: string
    interval?: string
  }): Promise<ApiResponse<PlatformSubscriptionsOverview>> => {
    return await PlatformService.getSubscriptions(filters)
  }
)

/**
 * Server Action: Get Platform Dashboard Overview Metrics
 */
export const getPlatformDashboardOverviewAction = withPlatformAction(
  { permission: 'platform.view' },
  async (_ctx): Promise<ApiResponse<PlatformDashboardMetrics & { needs_attention: NeedsAttentionItem[] }>> => {
    return await PlatformService.getDashboardOverview()
  }
)

/**
 * Server Action: Get Filtered & Paginated Companies / Tenants
 */
export const getPlatformCompaniesAction = withPlatformAction(
  { permission: 'tenant.view' },
  async (_ctx, filters?: {
    search?: string
    status?: PlatformCompanyStatus
    plan?: PlatformPlanCode
    health?: TenantHealthStatus
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ companies: PlatformTenantCompany[]; total: number }>> => {
    return await PlatformService.getCompanies(filters)
  }
)

/**
 * Server Action: Get 360 Degree View of a Specific Tenant Company
 */
export const getPlatformCompany360Action = withPlatformAction(
  { permission: 'tenant.view' },
  async (_ctx, companyId: string): Promise<ApiResponse<Company360Data>> => {
    return await PlatformService.getCompany360(companyId)
  }
)

/**
 * Server Action: Get Subscription Plans
 */
export const getPlatformPlansAction = withPlatformAction(
  { permission: 'plan.view' },
  async (_ctx): Promise<ApiResponse<SubscriptionPlanRecord[]>> => {
    return await PlatformService.getPlans()
  }
)

/**
 * Server Action: Get Feature Flags and Tenant Overrides
 */
export const getPlatformFeatureFlagsAction = withPlatformAction(
  { permission: 'feature.view' },
  async (_ctx): Promise<ApiResponse<PlatformFeatureFlagsOverview>> => {
    return await PlatformService.getFeatureFlags()
  }
)

/**
 * Server Action: Get System Health & Service Telemetry
 */
export const getPlatformSystemHealthAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx): Promise<ApiResponse<{ summary: SystemHealthSummary; events: SystemHealthEvent[] }>> => {
    return await PlatformService.getSystemHealth()
  }
)

/**
 * Server Action: Get Incidents List
 */
export const getPlatformIncidentsAction = withPlatformAction(
  { permission: 'incident.view' },
  async (_ctx): Promise<ApiResponse<PlatformIncidentItem[]>> => {
    return await PlatformService.getIncidents()
  }
)

/**
 * Server Action: Get Background Jobs Status
 */
export const getPlatformBackgroundJobsAction = withPlatformAction(
  { permission: 'job.view' },
  async (_ctx): Promise<ApiResponse<PlatformBackgroundJobItem[]>> => {
    return await PlatformService.getBackgroundJobs()
  }
)

/**
 * Server Action: Get Security Center Telemetry & Active Sessions
 */
export const getPlatformSecurityOverviewAction = withPlatformAction(
  { permission: 'security.view' },
  async (ctx): Promise<ApiResponse<PlatformSecurityOverview>> => {
    return await PlatformService.getSecurityOverview(ctx.platformUser.id)
  }
)

/**
 * Server Action: Get Platform Audit Logs
 */
export const getPlatformAuditLogsAction = withPlatformAction(
  { permission: 'audit.view' },
  async (_ctx, filters?: PlatformAuditFilters): Promise<ApiResponse<{ logs: PlatformAuditLogItem[]; total: number }>> => {
    return await PlatformService.getAuditLogs(filters)
  }
)

/**
 * Server Action: Get Platform Audit Metrics
 */
export const getPlatformAuditMetricsAction = withPlatformAction(
  { permission: 'audit.view' },
  async (_ctx): Promise<ApiResponse<PlatformAuditMetrics>> => {
    return await PlatformService.getAuditMetrics()
  }
)

/**
 * Server Action: Get Platform Administrator Users
 */
export const getPlatformUsersAction = withPlatformAction(
  { permission: 'platform_user.view' },
  async (_ctx): Promise<ApiResponse<PlatformAdminUser[]>> => {
    return await PlatformService.getPlatformUsers()
  }
)

/**
 * Server Action: Get Resource & Quota Usage Trends
 */
export const getPlatformUsageTrendsAction = withPlatformAction(
  { permission: 'platform.view' },
  async (_ctx, companyId?: string, period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<ApiResponse<UsageTrendsData>> => {
    return await PlatformService.getUsageTrends(companyId, period)
  }
)

/**
 * Server Action: Get Billing & Reconciliation Summary
 */
export const getPlatformBillingReconciliationAction = withPlatformAction(
  { permission: 'billing.reconcile' },
  async (_ctx): Promise<ApiResponse<BillingOverviewMetrics>> => {
    return await PlatformService.getBillingReconciliation()
  }
)

/**
 * Server Action: Get Customer Success & Churn Health
 */
export const getPlatformCustomerSuccessMetricsAction = withPlatformAction(
  { permission: 'platform.view' },
  async (_ctx): Promise<ApiResponse<CustomerSuccessData>> => {
    return await PlatformService.getCustomerSuccessMetrics()
  }
)

/**
 * Server Action: Get Platform System Settings (Admin only)
 */
export const getPlatformSettingsAction = withPlatformAction(
  { permission: 'system.manage' },
  async (_ctx): Promise<ApiResponse<PlatformSystemSettings>> => {
    return await PlatformService.getPlatformSettings()
  }
)

/**
 * Server Action: Get Public Platform Branding, Domain & Contact Settings
 * Safe for public consumption across marketing, login, tenant layouts.
 */
export async function getPublicPlatformSettingsAction(): Promise<ApiResponse<PlatformSystemSettings>> {
  try {
    const settings = await PlatformService.getPublicPlatformSettings()
    return { success: true, data: settings }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch public platform settings' }
  }
}

/**
 * Server Action: Get Platform Backup Status
 */
export const getPlatformBackupStatusAction = withPlatformAction(
  { permission: 'system.manage' },
  async (_ctx): Promise<ApiResponse<PlatformBackupStatus>> => {
    return await PlatformService.getBackupStatus()
  }
)

/**
 * Server Action: Get Emergency Controls Configuration
 */
export const getPlatformEmergencyControlsAction = withPlatformAction(
  { permission: 'emergency_controls.manage' },
  async (_ctx): Promise<ApiResponse<EmergencyControlItem[]>> => {
    return await PlatformService.getEmergencyControls()
  }
)

/**
 * Server Action: Get Global RBAC Permission Templates
 */
export const getPlatformRBACTemplatesAction = withPlatformAction(
  { permission: 'platform_user.view' },
  async (_ctx): Promise<ApiResponse<PlatformRBACTemplate[]>> => {
    return await PlatformService.getRBACTemplates()
  }
)

/**
 * Server Action: Get Integrations & Gateway Health
 */
export const getPlatformIntegrationsHealthAction = withPlatformAction(
  { permission: 'system.view' },
  async (_ctx): Promise<ApiResponse<IntegrationProviderStatus[]>> => {
    return await PlatformService.getIntegrationsHealth()
  }
)

/**
 * Server Action: Test / Ping Specific Integration Gateway
 */
export const testIntegrationPingAction = withPlatformAction(
  { permission: 'system.manage' },
  async (_ctx, providerKey: string): Promise<ApiResponse<{ key: string; latency_ms: number; status: string; message: string }>> => {
    return await PlatformService.testIntegrationPing(providerKey)
  }
)

/**
 * Server Action: Global Cross-Platform Search
 */
export const searchPlatformGlobalAction = withPlatformAction(
  { permission: 'platform.view' },
  async (_ctx, query: string): Promise<ApiResponse<GlobalSearchResult>> => {
    return await PlatformService.globalSearch(query)
  }
)

/**
 * Server Action: Get Cross-Tenant User Registry for Platform Owner
 */
export const getPlatformTenantUsersAction = withPlatformAction(
  { permission: 'tenant.view' },
  async (_ctx, filters?: {
    search?: string
    companyId?: string
    status?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ users: PlatformTenantUserItem[]; total: number }>> => {
    return await PlatformService.getTenantUsersList(filters)
  }
)

/**
 * Server Action: Get Platform Support Sessions (Active & History)
 */
export const getPlatformSupportSessionsAction = withPlatformAction(
  { permission: 'support.view' },
  async (_ctx): Promise<ApiResponse<PlatformSupportSessionRecord[]>> => {
    return await PlatformService.getSupportSessions()
  }
)

/**
 * Server Action: Get Platform Support Telemetry & Overview Stats
 */
export const getPlatformSupportOverviewStatsAction = withPlatformAction(
  { permission: 'support.view' },
  async (_ctx): Promise<ApiResponse<PlatformSupportOverviewStats>> => {
    return await PlatformService.getSupportOverviewStats()
  }
)

/**
 * Server Action: Get Platform System & Security Notifications
 */
export const getPlatformNotificationsAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx, options?: PlatformNotificationFilterOptions): Promise<
    ApiResponse<PlatformNotificationItem[]> & {
      totalCount?: number
      unreadCount?: number
      hasMore?: boolean
      page?: number
      pageSize?: number
    }
  > => {
    const result = await PlatformService.getNotifications({
      ...options,
      recipientUserId: ctx.platformUser.id,
    })
    return {
      success: true,
      data: result.data,
      totalCount: result.totalCount,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore,
      page: result.page,
      pageSize: result.pageSize,
    }
  }
)

/**
 * Server Action: Broadcast Platform Administrative Alert / Notice
 */
export const broadcastPlatformNotificationAction = withPlatformAction(
  {
    permission: 'platform.manage',
    audit: true,
    actionName: 'platform.broadcast_notification',
    entityType: 'platform_notification',
  },
  async (ctx, payload: {
    title: string
    message: string
    severity?: 'info' | 'warning' | 'critical'
    type?: string
    company_id?: string | null
    action_url?: string | null
    target_audience?: 'all_tenants' | 'all_admins' | 'specific_tenant'
  }): Promise<ApiResponse<PlatformNotificationItem>> => {
    if (!payload.title || !payload.message) {
      throw new Error('Title and message are required.')
    }
    const res = await PlatformService.broadcastNotification(payload, ctx.platformUser.id)
    if (!res.success || !res.data) {
      throw new Error(res.error || 'Failed to broadcast notification')
    }
    return { success: true, data: res.data }
  }
)

/**
 * Server Action: Delete Platform Notification
 */
export const deletePlatformNotificationAction = withPlatformAction(
  {
    permission: 'platform.manage',
    audit: true,
    actionName: 'platform.delete_notification',
    entityType: 'platform_notification',
  },
  async (ctx, id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await PlatformService.deleteNotification(id, ctx.platformUser.id)
    return { success: true, data: { success: true } }
  }
)

/**
 * Server Action: Clear All Read Notifications
 */
export const clearAllReadPlatformNotificationsAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx): Promise<ApiResponse<{ success: boolean }>> => {
    await PlatformService.clearAllReadNotifications(ctx.platformUser.id)
    return { success: true, data: { success: true } }
  }
)

/**
 * Server Action: Mark Single Platform Notification as Read
 */
export const markPlatformNotificationReadAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx, id: string): Promise<ApiResponse<{ success: boolean }>> => {
    await PlatformService.markNotificationRead(id, ctx.platformUser.id)
    return { success: true, data: { success: true } }
  }
)

/**
 * Server Action: Mark All Platform Notifications as Read
 */
export const markAllPlatformNotificationsReadAction = withPlatformAction(
  { permission: 'platform.view' },
  async (ctx): Promise<ApiResponse<{ success: boolean }>> => {
    await PlatformService.markAllNotificationsRead(ctx.platformUser.id)
    return { success: true, data: { success: true } }
  }
)

/**
 * Server Action: Get Incomplete / Started-but-not-finished Registrations
 */
export const getPlatformIncompleteRegistrationsAction = withPlatformAction(
  { permission: 'tenant.view' },
  async (_ctx, filters?: {
    search?: string
    stage?: IncompleteRegistrationStage
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<IncompleteRegistrationsOverview>> => {
    return await PlatformService.getIncompleteRegistrations(filters)
  }
)

/**
 * Server Action: Permanently Delete Tenant Organization (Atomic Purge)
 * Invariants:
 * 1. Strictly requires platform_owner role (enforced by withPlatformAction destruct: true)
 * 2. Recent MFA verification (<= 5 minutes) mandatory
 * 3. Typed confirmation slug matches company slug exactly
 * 4. Calls Postgres authoritative atomic deletion RPC: delete_tenant_permanently
 * 5. Automatically records immutable platform audit entry in public.platform_audit_logs
 */
export const deleteTenantPermanentlyAction = withPlatformAction(
  {
    destruct: true,
    requireMfa: true,
    audit: true,
    actionName: 'tenant.delete_permanently',
    entityType: 'company',
    targetCompanyIdExtractor: (params: { companyId: string }) => params?.companyId,
  },
  async (
    ctx,
    params: {
      companyId: string
      confirmationSlug: string
      reason: string
      mfaCode?: string
    }
  ): Promise<ApiResponse<{ companyId: string; deleted: boolean }>> => {
    if (!params.companyId) {
      throw new Error('Company ID is required for permanent deletion.')
    }
    if (!params.reason || !params.reason.trim()) {
      throw new Error('A detailed operational reason (Audit Trail) is mandatory for tenant permanent deletion.')
    }

    // Resolve company to verify confirmation slug
    const company360 = await PlatformService.getCompany360(params.companyId)
    if (!company360.success || !company360.data?.company) {
      throw new Error('Tenant organization not found or already deleted.')
    }

    const company = company360.data.company
    const expectedSlug = company.slug.trim().toLowerCase()
    const providedSlug = (params.confirmationSlug || '').trim().toLowerCase()

    if (providedSlug !== expectedSlug) {
      throw new Error(
        `Safety challenge failed: Confirmation slug '${providedSlug}' does not match tenant slug '${expectedSlug}'.`
      )
    }

    // Invoke authoritative deletion service (which triggers RPC delete_tenant_permanently)
    const delRes = await PlatformService.deleteCompany(params.companyId, params.reason.trim())
    if (!delRes.success) {
      throw new Error(delRes.error || 'Failed to permanently delete tenant.')
    }

    // Record additional high-severity audit record
    await recordPlatformAuditLog({
      adminId: ctx.platformUser.id,
      actorEmail: ctx.platformUser.email,
      action: 'tenant.delete_permanently',
      entityType: 'company',
      entityId: params.companyId,
      targetCompanyId: params.companyId,
      details: {
        slug: company.slug,
        company_name: company.name,
        reason: params.reason.trim(),
        mfa_verified: true,
        purged_at: new Date().toISOString(),
      },
    })

    return {
      success: true,
      data: {
        companyId: params.companyId,
        deleted: true,
      },
    }
  }
)
