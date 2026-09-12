'use server'

import { revalidatePath } from 'next/cache'
import { getCurrentTenant, requireTenantUser } from '@/lib/auth/tenant-auth'
import { AttendanceService } from '@/services/attendance.service'
import {
  AttendanceLocationRecord,
  AttendanceQrTokenRecord,
  AttendanceRecord,
  AttendanceVerificationResult,
  AttendancePunchInput,
  CreateAttendanceLocationInput,
  UpdateAttendanceLocationInput,
  AttendanceCorrectionRecord,
  AttendanceAuditLogRecord,
} from '@/types/attendance.types'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: any
}

/**
 * Server Action: Authenticated employee punch (Check-In or Check-Out) via QR & Geolocation
 */
export async function recordAttendanceAction(
  input: AttendancePunchInput
): Promise<ServerActionResult<AttendanceRecord>> {
  try {
    const tenant = await getCurrentTenant(input.company_id)
    if (!tenant) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'You must be logged in to record attendance.',
      }
    }

    const admin = createAdminClient()

    // 1. Resolve employee record for this authenticated user
    // First try matching by user_id or email or name within the company
    const { data: employees } = await (admin as any)
      .from('employees')
      .select('id, name, role, department')
      .eq('company_id', tenant.companyId)
      .eq('status', 'active')

    const userFullName = tenant.fullName || 'Staff Member'
    let employee = (employees || []).find(
      (e: any) => e.name.toLowerCase() === userFullName.toLowerCase()
    )

    if (!employee && employees && employees.length > 0) {
      // If direct match not found, fallback to the first active employee for this member
      employee = employees[0]
    }

    // Auto-create employee record for user if missing in company
    if (!employee) {
      const { data: newEmp } = await (admin as any)
        .from('employees')
        .insert({
          company_id: tenant.companyId,
          employee_id_number: `EMP-${Date.now().toString().slice(-4)}`,
          name: userFullName,
          mobile: tenant.phone || '+8801700000000',
          role: tenant.companyRole || 'General Staff',
          department: 'management',
          employee_type: 'permanent',
          salary_type: 'monthly',
          base_salary: 30000,
          status: 'active',
        })
        .select()
        .single()

      employee = newEmp
    }

    if (!employee) {
      return {
        success: false,
        code: 'EMPLOYEE_NOT_FOUND',
        error: 'Unable to resolve employee profile for your user account.',
      }
    }

    // 2. Perform server verification & punch
    const result: AttendanceVerificationResult = await AttendanceService.verifyAndRecordAttendance({
      companyId: tenant.companyId,
      employeeId: employee.id,
      employeeName: employee.name || tenant.fullName,
      userId: tenant.userId,
      qrToken: input.qr_token,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      attendanceType: input.attendance_type,
      notes: input.notes,
      deviceMetadata: input.device_metadata,
    })

    if (!result.success) {
      return {
        success: false,
        code: result.code,
        error: result.error,
        details: result.details,
      }
    }

    revalidatePath(`/${tenant.companySlug}/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/mobile`)

    return {
      success: true,
      data: result.record,
      details: result.details,
    }
  } catch (error: any) {
    console.error('[recordAttendanceAction] Fatal Error:', error)
    return {
      success: false,
      code: 'SERVER_ERROR',
      error: error.message || 'An unexpected error occurred during attendance verification.',
    }
  }
}

function canManageAttendance(tenant: any): boolean {
  return (
    tenant.companyRole === 'business_owner' ||
    tenant.primaryRole === 'business_owner' ||
    tenant.isSupportMode === true ||
    tenant.permissions.includes('*') ||
    tenant.permissions.includes('settings.manage') ||
    tenant.permissions.includes('settings.edit') ||
    tenant.permissions.includes('settings.full_control') ||
    tenant.permissions.includes('hr.manage') ||
    tenant.permissions.includes('hr.edit') ||
    tenant.permissions.includes('hr.create') ||
    tenant.permissions.includes('hr.delete') ||
    tenant.permissions.includes('hr.full_control')
  )
}

/**
 * Server Action: Create an attendance geofenced location
 */
export async function createAttendanceLocationAction(
  input: CreateAttendanceLocationInput
): Promise<ServerActionResult<{ location: AttendanceLocationRecord; qrToken: AttendanceQrTokenRecord }>> {
  try {
    const tenant = await requireTenantUser(input.company_id)

    if (!canManageAttendance(tenant)) {
      return { success: false, error: 'Unauthorized: Permission to manage attendance locations required.' }
    }

    const res = await AttendanceService.createLocation(
      {
        ...input,
        company_id: tenant.companyId,
      },
      tenant.userId,
      tenant.fullName
    )

    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr`)

    return { success: true, data: res }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create location.' }
  }
}

/**
 * Server Action: Update attendance location
 */
export async function updateAttendanceLocationAction(
  id: string,
  updates: UpdateAttendanceLocationInput,
  companyId: string
): Promise<ServerActionResult<AttendanceLocationRecord>> {
  try {
    const tenant = await requireTenantUser(companyId)

    if (!canManageAttendance(tenant)) {
      return { success: false, error: 'Unauthorized: Insufficient permissions.' }
    }

    const res = await AttendanceService.updateLocation(
      id,
      updates,
      tenant.companyId,
      tenant.userId,
      tenant.fullName
    )

    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    return { success: true, data: res }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update location.' }
  }
}

/**
 * Server Action: Delete attendance location
 */
export async function deleteAttendanceLocationAction(
  id: string,
  companyId: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await requireTenantUser(companyId)

    if (!canManageAttendance(tenant)) {
      return { success: false, error: 'Unauthorized: Only business owners or authorized HR admins can delete locations.' }
    }

    await AttendanceService.deleteLocation(id, tenant.companyId, tenant.userId, tenant.fullName)
    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr`)
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete location.' }
  }
}

/**
 * Server Action: Regenerate and rotate Location QR Code (Invalidates previous QR immediately)
 */
export async function regenerateLocationQrAction(
  locationId: string,
  companyId: string
): Promise<ServerActionResult<AttendanceQrTokenRecord>> {
  try {
    const tenant = await requireTenantUser(companyId)

    if (!canManageAttendance(tenant)) {
      return {
        success: false,
        error: 'Unauthorized: Only Business Owners and authorized managers can regenerate QR codes.',
      }
    }

    const newToken = await AttendanceService.regenerateLocationQr(
      locationId,
      tenant.companyId,
      tenant.userId,
      tenant.fullName
    )

    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    return { success: true, data: newToken }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to regenerate QR code.' }
  }
}

/**
 * Server Action: Deactivate/Revoke Location QR Code
 */
export async function revokeLocationQrAction(
  locationId: string,
  companyId: string
): Promise<ServerActionResult<boolean>> {
  try {
    const tenant = await requireTenantUser(companyId)

    if (!canManageAttendance(tenant)) {
      return {
        success: false,
        error: 'Unauthorized: Only Business Owners and authorized managers can revoke QR codes.',
      }
    }

    await AttendanceService.revokeLocationQr(locationId, tenant.companyId, tenant.userId, tenant.fullName)
    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    return { success: true, data: true }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to revoke QR code.' }
  }
}

/**
 * Server Action: Fetch all locations for current tenant
 */
export async function getAttendanceLocationsAction(
  companyId?: string
): Promise<ServerActionResult<AttendanceLocationRecord[]>> {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const locations = await AttendanceService.listLocations(tenant.companyId)
    return { success: true, data: locations }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch locations.' }
  }
}

/**
 * Server Action: Get today's attendance punches and status for authenticated employee
 */
export async function getEmployeeTodayStatusAction(
  companyId?: string
): Promise<ServerActionResult<{
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  checkInTime?: string
  checkOutTime?: string
  todayRecords: AttendanceRecord[]
  employeeName: string
}>> {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const admin = createAdminClient()
    const { data: employees } = await (admin as any)
      .from('employees')
      .select('id, name')
      .eq('company_id', tenant.companyId)
      .eq('status', 'active')

    const userFullName = tenant.fullName || 'Staff Member'
    const employee =
      (employees || []).find((e: any) => e.name.toLowerCase() === userFullName.toLowerCase()) ||
      employees?.[0]

    if (!employee) {
      return {
        success: true,
        data: {
          hasCheckedIn: false,
          hasCheckedOut: false,
          todayRecords: [],
          employeeName: userFullName,
        },
      }
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const records = await AttendanceService.getLiveAttendanceFeed(tenant.companyId, todayStr)
    const employeeRecords = records.filter((r) => r.employee_id === employee.id)

    const checkInRecord = employeeRecords.find((r) => r.attendance_type === 'CHECK_IN')
    const checkOutRecord = employeeRecords.find((r) => r.attendance_type === 'CHECK_OUT')

    return {
      success: true,
      data: {
        hasCheckedIn: !!checkInRecord,
        hasCheckedOut: !!checkOutRecord,
        checkInTime: checkInRecord
          ? new Date(checkInRecord.checked_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : undefined,
        checkOutTime: checkOutRecord
          ? new Date(checkOutRecord.checked_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : undefined,
        todayRecords: employeeRecords,
        employeeName: employee.name || userFullName,
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Server Action: Fetch employee attendance history
 */
export async function getEmployeeHistoryAction(
  companyId?: string
): Promise<ServerActionResult<AttendanceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const admin = createAdminClient()
    const { data: employees } = await (admin as any)
      .from('employees')
      .select('id, name')
      .eq('company_id', tenant.companyId)
      .eq('status', 'active')

    const userFullName = tenant.fullName || 'Staff Member'
    const employee =
      (employees || []).find((e: any) => e.name.toLowerCase() === userFullName.toLowerCase()) ||
      employees?.[0]

    if (!employee) return { success: true, data: [] }

    const history = await AttendanceService.getLiveAttendanceFeed(tenant.companyId)
    const userHistory = history.filter((h) => h.employee_id === employee.id)

    return { success: true, data: userHistory }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Server Action: Submit Attendance Correction Request
 */
export async function requestAttendanceCorrectionAction(params: {
  attendanceDate: string
  requestedType: 'CHECK_IN' | 'CHECK_OUT'
  requestedTime: string
  reason: string
  attendanceRecordId?: string | null
  companyId?: string
}): Promise<ServerActionResult<AttendanceCorrectionRecord>> {
  try {
    const tenant = await getCurrentTenant(params.companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const admin = createAdminClient()
    const { data: employees } = await (admin as any)
      .from('employees')
      .select('id, name')
      .eq('company_id', tenant.companyId)
      .eq('status', 'active')

    const userFullName = tenant.fullName || 'Staff Member'
    const employee =
      (employees || []).find((e: any) => e.name.toLowerCase() === userFullName.toLowerCase()) ||
      employees?.[0]

    if (!employee) return { success: false, error: 'Employee record not found.' }

    const correction = await AttendanceService.requestCorrection({
      companyId: tenant.companyId,
      employeeId: employee.id,
      requestedBy: tenant.userId,
      attendanceRecordId: params.attendanceRecordId,
      attendanceDate: params.attendanceDate,
      requestedType: params.requestedType,
      requestedTime: params.requestedTime,
      reason: params.reason,
    })

    revalidatePath(`/${tenant.companySlug}/attendance`)
    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr`)

    return { success: true, data: correction }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to submit correction request.' }
  }
}

/**
 * Server Action: Review (Approve/Reject) Attendance Correction
 */
export async function reviewAttendanceCorrectionAction(params: {
  id: string
  status: 'approved' | 'rejected'
  reviewNotes?: string
  companyId: string
}): Promise<ServerActionResult<AttendanceCorrectionRecord>> {
  try {
    const tenant = await requireTenantUser(params.companyId)

    const hasPermission =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.permissions.includes('hr.approve') ||
      tenant.permissions.includes('hr.edit')

    if (!hasPermission) {
      return { success: false, error: 'Unauthorized: Permission to approve/reject corrections required.' }
    }

    const reviewed = await AttendanceService.reviewCorrection(
      params.id,
      tenant.companyId,
      tenant.userId,
      tenant.fullName || 'Manager',
      params.status,
      params.reviewNotes
    )

    revalidatePath(`/${tenant.companySlug}/settings/attendance`)
    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/attendance`)

    return { success: true, data: reviewed }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to review correction.' }
  }
}

/**
 * Server Action: Fetch all corrections for management inbox
 */
export async function getAttendanceCorrectionsAction(
  companyId: string,
  status?: 'pending' | 'approved' | 'rejected'
): Promise<ServerActionResult<AttendanceCorrectionRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyId)
    const corrections = await AttendanceService.getTenantCorrections(tenant.companyId, status)
    return { success: true, data: corrections }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Server Action: Fetch tenant attendance overview / live feed
 */
export async function getTenantAttendanceOverviewAction(
  companyId?: string,
  dateStr?: string
): Promise<ServerActionResult<AttendanceRecord[]>> {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const records = await AttendanceService.getLiveAttendanceFeed(tenant.companyId, dateStr)
    return { success: true, data: records }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Server Action: Fetch audit logs for attendance
 */
export async function getAttendanceAuditLogsAction(
  companyId: string
): Promise<ServerActionResult<AttendanceAuditLogRecord[]>> {
  try {
    const tenant = await requireTenantUser(companyId)
    const logs = await AttendanceService.getAuditLogs(tenant.companyId, 50)
    return { success: true, data: logs }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * Server Action: Fetch tenant branches for location assignment
 */
export async function getTenantBranchesForAttendanceAction(
  companyId?: string
): Promise<ServerActionResult<Array<{ id: string; name: string; code: string; is_main?: boolean }>>> {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const admin = createAdminClient()
    const { data: branches, error } = await (admin as any)
      .from('branches')
      .select('id, name, code, is_main')
      .eq('company_id', tenant.companyId)
      .eq('is_active', true)
      .order('is_main', { ascending: false })

    if (error) {
      return { success: true, data: [] }
    }

    return { success: true, data: branches || [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

