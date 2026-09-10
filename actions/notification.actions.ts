'use server'

import { createClient } from '../lib/supabase/server.ts'
import { getCurrentTenant } from '../lib/auth/tenant-auth.ts'
import type { InAppNotificationRecord } from '../types/communication.types.ts'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Server Action: Fetches authorized in-app notifications for the tenant user
 */
export async function getInAppNotificationsAction(
  requestedCompanyId?: string,
  limit: number = 30
): Promise<ServerActionResult<InAppNotificationRecord[]>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant session found.',
      }
    }

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
}

/**
 * Server Action: Marks a single notification as read
 */
export async function markNotificationReadAction(
  notificationId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant session found.',
      }
    }

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
}

/**
 * Server Action: Marks all notifications as read for current tenant/user
 */
export async function markAllNotificationsReadAction(
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant session found.',
      }
    }

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
}

/**
 * Server Action: Deletes a single notification
 */
export async function deleteNotificationAction(
  notificationId: string,
  requestedCompanyId?: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await getCurrentTenant(requestedCompanyId)
    const companyId = tenant?.companyId || requestedCompanyId

    if (!companyId) {
      return {
        success: false,
        error: 'Unauthorized: No active tenant session found.',
      }
    }

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
}
