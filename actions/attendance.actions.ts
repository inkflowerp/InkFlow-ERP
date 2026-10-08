'use server'

import { withTenantAction } from '@/lib/actions/action-wrapper'


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
import { AttendanceRepository, resolveCompanyUuid } from '@/lib/repositories/attendance.repository'
import { WorkforceRepository } from '@/lib/repositories/workforce.repository'
import { BranchRepository } from '@/lib/repositories/branch.repository'
import { getAttendanceLocalDate, formatAttendanceTime } from '@/lib/attendance/geofence-utils'
import type { EmployeeRecord } from '@/types/workforce.types'

export interface ServerActionResult<T> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: any
}

/**
 * Resolves an authenticated user's employee record.
 * Supports direct user_id link, email/phone matching with auto-linking,
 * and seamless fallback/creation for Business Owners.
 */
async function resolveOrAutoLinkEmployee(tenant: any): Promise<EmployeeRecord | null> {
  // 1. Direct match by user_id linked in employees table
  let employee = await WorkforceRepository.getEmployeeByUserId(tenant.userId, tenant.companyId)
  if (employee) return employee

  // 2. Try matching by email or phone across employees in company
  try {
    const allEmployees = await WorkforceRepository.getEmployees(tenant.companyId)
    const normEmail = tenant.email?.toLowerCase().trim()
    const normPhone = tenant.phone?.replace(/\D/g, '')

    const matched = allEmployees.find((e) => {
      if (e.status === 'terminated') return false
      if (normEmail && e.email && e.email.toLowerCase().trim() === normEmail) return true
      if (normPhone && e.mobile) {
        const empPhone = e.mobile.replace(/\D/g, '')
        if (empPhone && (empPhone === normPhone || empPhone.endsWith(normPhone) || normPhone.endsWith(empPhone))) {
          return true
        }
      }
      return false
    })

    if (matched) {
      await WorkforceRepository.updateEmployee(matched.id, tenant.companyId, { user_id: tenant.userId })
      matched.user_id = tenant.userId
      return matched
    }

    // 3. If user is business owner, resolve or auto-create an owner employee record
    const isOwner =
      tenant.companyRole === 'business_owner' ||
      tenant.primaryRole === 'business_owner' ||
      tenant.roles?.some((r: any) => r.slug === 'business_owner' || r.slug === 'owner')

    if (isOwner) {
      const ownerExisting = allEmployees.find(
        (e) =>
          e.status !== 'terminated' &&
          (e.role === 'Business Owner' || e.role === 'Owner' || e.name === tenant.fullName)
      )
      if (ownerExisting) {
        await WorkforceRepository.updateEmployee(ownerExisting.id, tenant.companyId, { user_id: tenant.userId })
        ownerExisting.user_id = tenant.userId
        return ownerExisting
      }

      const now = new Date().toISOString()
      const today = now.split('T')[0]
      const ownerEmp: EmployeeRecord = {
        id: `emp-owner-${tenant.userId.slice(0, 8)}`,
        company_id: tenant.companyId,
        user_id: tenant.userId,
        employee_id_number: 'EMP-OWNER',
        name: tenant.fullName || 'Business Owner',
        email: tenant.email || undefined,
        mobile: tenant.phone || undefined,
        role: 'Business Owner',
        designation: 'Owner / Executive',
        department: 'management',
        employee_type: 'permanent',
        salary_basis: 'monthly',
        joining_date: today,
        base_salary: 0,
        daily_rate: 0,
        hourly_rate: 0,
        overtime_hourly_rate: 0,
        current_advance_balance: 0,
        status: 'active',
        created_at: now,
        updated_at: now,
      }
      return await WorkforceRepository.createEmployee(ownerEmp)
    }
  } catch (err) {
    console.warn('[resolveOrAutoLinkEmployee] Warning resolving employee:', err)
  }

  return null
}

/**
 * Server Action: Authenticated employee punch (Check-In or Check-Out) via QR & Geolocation
 */
export const recordAttendanceAction = withTenantAction(
  {
    entityType: "attendance"
  },
  async (ctx, input: AttendancePunchInput) : Promise<ServerActionResult<AttendanceRecord>> => {
  try {
    const tenant = await getCurrentTenant(input.company_id)
    if (!tenant) {
      return {
        success: false,
        code: 'UNAUTHENTICATED',
        error: 'You must be logged in to record attendance.',
      }
    }

    // 1. Resolve employee record for this authenticated user (with auto-link and owner profile support)
    const employee = await resolveOrAutoLinkEmployee(tenant)

    if (!employee) {
      return {
        success: false,
        code: 'EMPLOYEE_NOT_LINKED',
        error: 'Your login account is not linked to any active employee profile. Please contact your HR administrator.',
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
    revalidatePath(`/${tenant.companySlug}/portal`)
    revalidatePath(`/${tenant.companySlug}/hr`)
    revalidatePath(`/${tenant.companySlug}/hr/attendance`)

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

})

function canManageAttendance(tenant: any): boolean {
  return (
    tenant.companyRole === 'business_owner' ||
    tenant.primaryRole === 'business_owner' ||
    tenant.isSupportMode === true ||
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
export const createAttendanceLocationAction = withTenantAction(
  {
    permission: "hr.edit",
    entityType: "attendance"
  },
  async (ctx, input: CreateAttendanceLocationInput) : Promise<ServerActionResult<{ location: AttendanceLocationRecord; qrToken: AttendanceQrTokenRecord }>> => {
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

})

/**
 * Server Action: Update attendance location
 */
export const updateAttendanceLocationAction = withTenantAction(
  {
    permission: "hr.edit",
    entityType: "attendance"
  },
  async (ctx, id: string,
  updates: UpdateAttendanceLocationInput,
  companyId: string) : Promise<ServerActionResult<AttendanceLocationRecord>> => {
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

})

/**
 * Server Action: Delete attendance location
 */
export const deleteAttendanceLocationAction = withTenantAction(
  {
    permission: "hr.delete",
    destructive: true,
    auditAction: "attendance.deleteattendancelocation",
    entityType: "attendance"
  },
  async (ctx, id: string,
  companyId: string) : Promise<ServerActionResult<boolean>> => {
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

})

/**
 * Server Action: Regenerate and rotate Location QR Code (Invalidates previous QR immediately)
 */
export const regenerateLocationQrAction = withTenantAction(
  {
    permission: "hr.edit",
    entityType: "attendance"
  },
  async (ctx, locationId: string,
  companyId: string) : Promise<ServerActionResult<AttendanceQrTokenRecord>> => {
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

})

/**
 * Server Action: Deactivate/Revoke Location QR Code
 */
export const revokeLocationQrAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, locationId: string,
  companyId: string) : Promise<ServerActionResult<boolean>> => {
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

})

/**
 * Server Action: Fetch all locations for current tenant
 */
export const getAttendanceLocationsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, companyId?: string) : Promise<ServerActionResult<AttendanceLocationRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const locations = await AttendanceService.listLocations(tenant.companyId)
    return { success: true, data: locations }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch locations.' }
  }

})

/**
 * Server Action: Get today's attendance punches and status for authenticated employee
 */
export const getEmployeeTodayStatusAction = withTenantAction(
  {
    entityType: "attendance"
  },
  async (ctx, companyId?: string) : Promise<ServerActionResult<{
  hasCheckedIn: boolean
  hasCheckedOut: boolean
  checkInTime?: string
  checkOutTime?: string
  todayRecords: AttendanceRecord[]
  employeeName: string
}>> => {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const employee = await resolveOrAutoLinkEmployee(tenant)

    if (!employee) {
      return {
        success: true,
        data: {
          hasCheckedIn: false,
          hasCheckedOut: false,
          todayRecords: [],
          employeeName: tenant.fullName || 'Staff Member',
        },
      }
    }

    const todayStr = getAttendanceLocalDate(new Date(), 'Asia/Dhaka')
    let records = await AttendanceRepository.getTodayAttendanceForEmployee(
      employee.id,
      tenant.companyId,
      todayStr
    )

    // Fallback: Check UTC today string if different from local date
    if (records.length === 0) {
      const utcTodayStr = new Date().toISOString().split('T')[0]
      if (utcTodayStr !== todayStr) {
        records = await AttendanceRepository.getTodayAttendanceForEmployee(
          employee.id,
          tenant.companyId,
          utcTodayStr
        )
      }
    }

    // Sort check-ins ascending (earliest first) and check-outs descending (latest first)
    const checkIns = records
      .filter((r) => r.attendance_type === 'CHECK_IN')
      .sort((a, b) => new Date(a.checked_at).getTime() - new Date(b.checked_at).getTime())

    const checkOuts = records
      .filter((r) => r.attendance_type === 'CHECK_OUT')
      .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())

    const earliestCheckIn = checkIns[0]
    const latestCheckOut = checkOuts[0]

    let checkInTime = earliestCheckIn
      ? formatAttendanceTime(earliestCheckIn.checked_at, 'Asia/Dhaka')
      : undefined

    let checkOutTime = latestCheckOut
      ? formatAttendanceTime(latestCheckOut.checked_at, 'Asia/Dhaka')
      : undefined

    let hasCheckedIn = !!earliestCheckIn
    let hasCheckedOut = !!latestCheckOut

    // Fallback check on daily attendance summaries if no punch records found in attendance_records
    if (!hasCheckedIn && !hasCheckedOut) {
      try {
        const dailyAtt = await AttendanceRepository.getEmployeeDailyAttendance(employee.id, todayStr)
        if (dailyAtt) {
          if (dailyAtt.check_in_time) {
            hasCheckedIn = true
            checkInTime = dailyAtt.check_in_time
          }
          if (dailyAtt.check_out_time) {
            hasCheckedOut = true
            checkOutTime = dailyAtt.check_out_time
          }

          // Synthesize todayRecords so UI buttons and status chips are accurate
          if (records.length === 0) {
            const synthRecords: AttendanceRecord[] = []
            if (hasCheckedIn && checkInTime) {
              synthRecords.push({
                id: `syn-in-${employee.id}-${todayStr}`,
                company_id: tenant.companyId,
                employee_id: employee.id,
                employee_name: employee.name || tenant.fullName,
                attendance_date: todayStr,
                attendance_type: 'CHECK_IN',
                checked_at: `${todayStr}T${checkInTime.length === 5 ? checkInTime + ':00' : checkInTime}`,
                latitude: 0,
                longitude: 0,
                gps_accuracy_meters: 0,
                distance_from_location_meters: 0,
                verification_status: 'verified',
                location_name: 'Workplace Terminal',
                notes: dailyAtt.notes || 'Self-Service Portal Check-In',
                created_at: new Date().toISOString(),
              })
            }
            if (hasCheckedOut && checkOutTime) {
              synthRecords.push({
                id: `syn-out-${employee.id}-${todayStr}`,
                company_id: tenant.companyId,
                employee_id: employee.id,
                employee_name: employee.name || tenant.fullName,
                attendance_date: todayStr,
                attendance_type: 'CHECK_OUT',
                checked_at: `${todayStr}T${checkOutTime.length === 5 ? checkOutTime + ':00' : checkOutTime}`,
                latitude: 0,
                longitude: 0,
                gps_accuracy_meters: 0,
                distance_from_location_meters: 0,
                verification_status: 'verified',
                location_name: 'Workplace Terminal',
                notes: dailyAtt.notes || 'Self-Service Portal Check-Out',
                created_at: new Date().toISOString(),
              })
            }
            records = synthRecords
          }
        }
      } catch (attErr) {
        console.warn('[getEmployeeTodayStatusAction] Daily attendances fallback query skipped:', attErr)
      }
    }

    return {
      success: true,
      data: {
        hasCheckedIn,
        hasCheckedOut,
        checkInTime,
        checkOutTime,
        todayRecords: records,
        employeeName: employee.name || tenant.fullName || 'Staff Member',
      },
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

/**
 * Server Action: Fetch employee attendance history
 */
export const getEmployeeHistoryAction = withTenantAction(
  {
    entityType: "attendance"
  },
  async (ctx, companyId?: string) : Promise<ServerActionResult<AttendanceRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const employee = await resolveOrAutoLinkEmployee(tenant)

    if (!employee) return { success: true, data: [] }

    const userHistory = await AttendanceRepository.getEmployeeAttendanceHistory(
      employee.id,
      tenant.companyId,
      50
    )

    return { success: true, data: userHistory }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

/**
 * Server Action: Submit Attendance Correction Request
 */
export const requestAttendanceCorrectionAction = withTenantAction(
  {
    entityType: "attendance"
  },
  async (ctx, params: {
  attendanceDate: string
  requestedType: 'CHECK_IN' | 'CHECK_OUT'
  requestedTime: string
  reason: string
  attendanceRecordId?: string | null
  companyId?: string
}) : Promise<ServerActionResult<AttendanceCorrectionRecord>> => {
  try {
    const tenant = await getCurrentTenant(params.companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const employee = await WorkforceRepository.getEmployeeByUserId(tenant.userId, tenant.companyId)

    if (!employee) return { success: false, error: 'Your login account is not linked to any active employee profile.' }

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

})

/**
 * Server Action: Review (Approve/Reject) Attendance Correction
 */
export const reviewAttendanceCorrectionAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, params: {
  id: string
  status: 'approved' | 'rejected'
  reviewNotes?: string
  companyId: string
}) : Promise<ServerActionResult<AttendanceCorrectionRecord>> => {
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

})

/**
 * Server Action: Fetch all corrections for management inbox
 */
export const getAttendanceCorrectionsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, companyId: string,
  status?: 'pending' | 'approved' | 'rejected') : Promise<ServerActionResult<AttendanceCorrectionRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyId)
    const corrections = await AttendanceService.getTenantCorrections(tenant.companyId, status)
    return { success: true, data: corrections }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

/**
 * Server Action: Fetch tenant attendance overview / live feed
 */
export const getTenantAttendanceOverviewAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, companyId?: string,
  dateStr?: string) : Promise<ServerActionResult<AttendanceRecord[]>> => {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const records = await AttendanceService.getLiveAttendanceFeed(tenant.companyId, dateStr)
    return { success: true, data: records }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

/**
 * Server Action: Fetch audit logs for attendance
 */
export const getAttendanceAuditLogsAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, companyId: string) : Promise<ServerActionResult<AttendanceAuditLogRecord[]>> => {
  try {
    const tenant = await requireTenantUser(companyId)
    const logs = await AttendanceService.getAuditLogs(tenant.companyId, 50)
    return { success: true, data: logs }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

/**
 * Server Action: Fetch tenant branches for location assignment
 */
export const getTenantBranchesForAttendanceAction = withTenantAction(
  {
    permission: "hr.view",
    entityType: "attendance"
  },
  async (ctx, companyId?: string) : Promise<ServerActionResult<Array<{ id: string; name: string; code: string; is_main?: boolean }>>> => {
  try {
    const tenant = await getCurrentTenant(companyId)
    if (!tenant) return { success: false, error: 'Unauthenticated' }

    const targetCompanyId = (await resolveCompanyUuid(tenant.companyId)) || tenant.companyId
    const branches = await BranchRepository.listBranches(targetCompanyId)
    return {
      success: true,
      data: branches.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code || '',
        is_main: b.is_main,
      })),
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }

})

