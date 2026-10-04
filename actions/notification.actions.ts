'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


import { createClient } from '../lib/supabase/server.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import { NotificationService } from '@/services/notification.service'
import type {
  InAppNotificationRecord,
  NotifyInput,
  NotifyResult,
  NotificationPreferenceRecord,
} from '../types/communication.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetches authorized in-app notifications for the tenant user
 */
export const getInAppNotificationsAction = withTenantAction(
  {
    permission: "notifications.view",
    entityType: "notification"
  },
  async (ctx, requestedCompanyId?: string,
  limit: number = 30) : Promise<ServerActionResult<InAppNotificationRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const supabase = await createClient()
    let query = (supabase.from('in_app_notifications' as any) as any)
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // If tenant user is present, filter for user-specific or global tenant notifications
    if (tenant?.userId && tenant.primaryRole !== 'business_owner') {
      query = query.or(`user_id.eq.${tenant.userId},user_id.is.null`)
    }

    const { data, error } = await query

    if (error) {
      // Return empty array on initial table creation / graceful fallback
      console.warn('[getInAppNotificationsAction] Query error:', error.message)
      return { success: true, data: [] }
    }

    return {
      success: true,
      data: ((data || []) as unknown) as InAppNotificationRecord[],
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to fetch notifications.',
    }
  }

})

/**
 * Server Action: Marks a single notification as read
 */
export const markNotificationReadAction = withTenantAction(
  {
    permission: "notifications.view",
    entityType: "notification"
  },
  async (ctx, notificationId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const supabase = await createClient()
    const { error } = await (supabase.from('in_app_notifications' as any) as any)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('company_id', companyId)

    if (error) {
      console.warn('[markNotificationReadAction] Update error:', error.message)
    }

    return { success: true, data: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to mark notification as read.',
    }
  }

})

/**
 * Server Action: Marks all notifications as read for current tenant/user
 */
export const markAllNotificationsReadAction = withTenantAction(
  {
    permission: "notifications.view",
    entityType: "notification"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const supabase = await createClient()
    let query = (supabase.from('in_app_notifications' as any) as any)
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('is_read', false)

    if (tenant?.userId && tenant.primaryRole !== 'business_owner') {
      query = query.or(`user_id.eq.${tenant.userId},user_id.is.null`)
    }

    const { error } = await query

    if (error) {
      console.warn('[markAllNotificationsReadAction] Update error:', error.message)
    }

    return { success: true, data: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to mark all notifications as read.',
    }
  }

})

/**
 * Server Action: Deletes a single notification
 */
export const deleteNotificationAction = withTenantAction(
  {
    permission: "notifications.view",
    destructive: true,
    auditAction: "notification.deletenotification",
    entityType: "notification"
  },
  async (ctx, notificationId: string,
  requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const supabase = await createClient()
    const { error } = await (supabase.from('in_app_notifications' as any) as any)
      .delete()
      .eq('id', notificationId)
      .eq('company_id', companyId)

    if (error) {
      console.warn('[deleteNotificationAction] Delete error:', error.message)
    }

    return { success: true, data: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to delete notification.',
    }
  }

})

/**
 * Server Action: Purge all notifications for tenant
 */
export const purgeAllNotificationsAction = withTenantAction(
  {
    permission: "notifications.view",
    destructive: true,
    requirePasswordConfirm: true,
    auditAction: "notification.purgeallnotifications",
    entityType: "notification"
  },
  async (ctx, requestedCompanyId?: string) : Promise<ServerActionResult<boolean>> => {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    if (!tenant || !tenant.companyId) {
      return {
        success: false,
        error: 'Unauthorized: Valid authenticated tenant session required.',
      }
    }
    const companyId = tenant.companyId

    const supabase = await createClient()
    const { error } = await (supabase.from('in_app_notifications' as any) as any)
      .delete()
      .eq('company_id', companyId)

    if (error) {
      console.warn('[purgeAllNotificationsAction] Delete error:', error.message)
    }

    return { success: true, data: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to purge notifications.',
    }
  }

})

/**
 * Server Action: Triggers preference-aware notification across channels
 */
export const notifyAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (ctx, input: NotifyInput): Promise<ServerActionResult<NotifyResult>> => {
    try {
      const tenant = await getCurrentTenant(input.companyId)
      if (!tenant || !tenant.companyId) {
        return { success: false, error: 'Unauthorized tenant session' }
      }
      const res = await NotificationService.notify({
        ...input,
        companyId: tenant.companyId,
      })
      return { success: res.success, data: res, error: res.error }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to dispatch notification' }
    }
  }
)

/**
 * Server Action: Fetches notification preferences for current tenant user
 */
export const getUserNotificationPreferencesAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (ctx, requestedCompanyId?: string): Promise<ServerActionResult<NotificationPreferenceRecord[]>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId || !tenant.userId) {
        return { success: false, error: 'Valid user session required' }
      }
      const prefs = await NotificationService.getUserPreferences(tenant.companyId, tenant.userId)
      return { success: true, data: prefs }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to load preferences' }
    }
  }
)

/**
 * Server Action: Saves user notification preferences
 */
export const saveUserNotificationPreferencesAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (
    ctx,
    preferences: Partial<NotificationPreferenceRecord>[],
    requestedCompanyId?: string
  ): Promise<ServerActionResult<boolean>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId || !tenant.userId) {
        return { success: false, error: 'Valid user session required' }
      }
      const ok = await NotificationService.saveUserPreferences(tenant.companyId, tenant.userId, preferences)
      return { success: ok, data: ok }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save preferences' }
    }
  }
)

/**
 * Server Action: Retrieves communication delivery logs
 */
export const getDeliveryLogsAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (
    ctx,
    filters?: { status?: string; channel?: string; recipient?: string; limit?: number; offset?: number },
    requestedCompanyId?: string
  ): Promise<ServerActionResult<{ logs: any[]; total: number }>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId) {
        return { success: false, error: 'Unauthorized tenant session' }
      }
      const result = await NotificationService.getDeliveryLogs(tenant.companyId, filters)
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to fetch delivery logs' }
    }
  }
)

/**
 * Server Action: Resends a failed or historical delivery job
 */
export const resendDeliveryJobAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (ctx, jobId: string, requestedCompanyId?: string): Promise<ServerActionResult<boolean>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId) {
        return { success: false, error: 'Unauthorized tenant session' }
      }
      const result = await NotificationService.resendJob(jobId, tenant.companyId)
      return { success: result.success, data: result.success, error: result.error }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to resend message' }
    }
  }
)

/**
 * Server Action: Triggers dynamic business rules evaluation (overdue invoices, low stock, etc.)
 */
export const triggerBusinessRulesEvaluationAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (ctx, requestedCompanyId?: string): Promise<ServerActionResult<any>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId) {
        return { success: false, error: 'Unauthorized tenant session' }
      }
      const result = await NotificationService.evaluateBusinessRules(tenant.companyId)
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to evaluate business rules' }
    }
  }
)

/**
 * Server Action: Fetches bilingual message templates for current tenant
 */
export const getNotificationTemplatesAction = withTenantAction(
  {
    permission: 'notifications.view',
    entityType: 'notification',
  },
  async (ctx, requestedCompanyId?: string): Promise<ServerActionResult<any[]>> => {
    try {
      const tenant = await getCurrentTenant(requestedCompanyId)
      if (!tenant || !tenant.companyId) {
        return { success: false, error: 'Unauthorized tenant session' }
      }
      const adminClient = createAdminClient()
      const { data, error } = await (adminClient as any)
        .from('message_templates')
        .select('*')
        .eq('company_id', tenant.companyId)
        .order('template_key', { ascending: true })

      if (error) {
        return { success: true, data: [] }
      }
      return { success: true, data: data || [] }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to load templates' }
    }
  }
)


