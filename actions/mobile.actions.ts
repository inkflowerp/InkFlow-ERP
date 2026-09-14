'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Mobile Server Actions (V8)
// Protected, Multi-Tenant Mobile Operations Hub & Fast Floor Task Actions
// ==============================================================================

import { MobileOperationsService } from '../services/mobile-operations.service.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'
import type { MobileAttendancePunchPayload } from '../types/mobile.types.ts'

export async function getMobileDashboardSummaryAction(userId?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const summary = await MobileOperationsService.getTodaySummary(companyId, userId)
    return { success: true, data: summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch mobile dashboard summary.' }
  }
}

export async function getMobileTasksAction(options?: { status?: string; limit?: number }) {
  try {
    const companyId = await getTenantCompanyId()
    const tasks = await MobileOperationsService.getMobileTasks(companyId, options)
    return { success: true, data: tasks }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch mobile tasks.' }
  }
}

export async function updateMobileTaskAction(
  taskId: string,
  action: 'start' | 'pause' | 'resume' | 'hold' | 'complete' | 'rework',
  notes?: string
) {
  try {
    const companyId = await getTenantCompanyId()
    const result = await MobileOperationsService.updateMobileTaskStatus(
      companyId,
      taskId,
      action,
      undefined,
      notes
    )
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update task status.' }
  }
}

export async function submitMobilePunchAction(payload: MobileAttendancePunchPayload) {
  try {
    const companyId = await getTenantCompanyId()
    const result = await MobileOperationsService.submitMobileAttendancePunch(companyId, payload)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record attendance punch.' }
  }
}
