// ==============================================================================
// InkFlow ERP - Authoritative Attendance Service (Server-Side)
// Cryptographic QR Token Generation, Rotation, and Geofence Verification Engine
// ==============================================================================

import { AttendanceRepository } from '@/lib/repositories/attendance.repository'
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
import { CommunicationService } from '@/services/communication-server.service'
import {
  calculateHaversineDistance,
  generateSecureQrToken,
  hashQrToken,
  evaluateGeofence,
  validateAttendanceTransition,
  validateCoordinates,
} from '@/lib/attendance/geofence-utils'

export {
  calculateHaversineDistance,
  generateSecureQrToken,
  hashQrToken,
  evaluateGeofence,
  validateAttendanceTransition,
  validateCoordinates,
}

export class AttendanceService {
  // ==========================================
  // 1. LOCATION MANAGEMENT
  // ==========================================

  static async listLocations(companyId: string): Promise<AttendanceLocationRecord[]> {
    return AttendanceRepository.getLocations(companyId)
  }

  static async getLocation(id: string, companyId: string): Promise<AttendanceLocationRecord | null> {
    return AttendanceRepository.getLocationById(id, companyId)
  }

  static async createLocation(
    input: CreateAttendanceLocationInput,
    actorId?: string,
    actorName = 'Business Owner'
  ): Promise<{ location: AttendanceLocationRecord; qrToken: AttendanceQrTokenRecord }> {
    // 1. Create location
    const location = await AttendanceRepository.createLocation(input)

    // 2. Generate initial active QR token
    const { rawToken, tokenHash, tokenPrefix } = generateSecureQrToken()
    const qrToken = await AttendanceRepository.createQrToken({
      companyId: input.company_id,
      locationId: location.id,
      tokenHash,
      tokenPrefix,
      generatedBy: actorId,
    })

    qrToken.raw_token = rawToken
    qrToken.qr_payload_url = `INKFLOW:ATT:v1:${rawToken}`
    location.active_qr_token = qrToken

    // 3. Log audit event
    await AttendanceRepository.logAttendanceAudit({
      companyId: input.company_id,
      actorId,
      actorName,
      actionType: 'location_created',
      locationId: location.id,
      details: {
        location_name: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        radius_meters: location.radius_meters,
        max_accuracy_meters: location.max_accuracy_meters,
        initial_token_prefix: tokenPrefix,
      },
    })

    return { location, qrToken }
  }

  static async updateLocation(
    id: string,
    updates: UpdateAttendanceLocationInput,
    companyId: string,
    actorId?: string,
    actorName = 'Admin'
  ): Promise<AttendanceLocationRecord> {
    const updated = await AttendanceRepository.updateLocation(id, updates, companyId)

    await AttendanceRepository.logAttendanceAudit({
      companyId,
      actorId,
      actorName,
      actionType: 'location_updated',
      locationId: id,
      details: {
        updates,
      },
    })

    return updated
  }

  static async deleteLocation(
    id: string,
    companyId: string,
    actorId?: string,
    actorName = 'Admin'
  ): Promise<boolean> {
    const existing = await AttendanceRepository.getLocationById(id, companyId)
    const success = await AttendanceRepository.deleteLocation(id, companyId)

    if (success) {
      await AttendanceRepository.logAttendanceAudit({
        companyId,
        actorId,
        actorName,
        actionType: 'location_deleted',
        locationId: id,
        details: {
          deleted_location_name: existing?.name || id,
        },
      })
    }

    return success
  }

  // ==========================================
  // 2. QR TOKEN ROTATION & MANAGEMENT
  // ==========================================

  /**
   * Regenerates a cryptographically fresh QR token for a location.
   * IMMEDIATELY revokes and invalidates all previous QR tokens for this location.
   */
  static async regenerateLocationQr(
    locationId: string,
    companyId: string,
    actorId?: string,
    actorName = 'Business Owner'
  ): Promise<AttendanceQrTokenRecord> {
    const location = await AttendanceRepository.getLocationById(locationId, companyId)
    if (!location) {
      throw new Error('Attendance location not found.')
    }

    const { rawToken, tokenHash, tokenPrefix } = generateSecureQrToken()

    const newToken = await AttendanceRepository.createQrToken({
      companyId,
      locationId,
      tokenHash,
      tokenPrefix,
      generatedBy: actorId,
    })

    newToken.raw_token = rawToken
    newToken.qr_payload_url = `INKFLOW:ATT:v1:${rawToken}`

    // Audit log
    await AttendanceRepository.logAttendanceAudit({
      companyId,
      actorId,
      actorName,
      actionType: 'qr_regenerated',
      locationId,
      details: {
        location_name: location.name,
        new_token_prefix: tokenPrefix,
        previous_qr_status: 'immediately_revoked',
        timestamp: new Date().toISOString(),
      },
    })

    return newToken
  }

  static async revokeLocationQr(
    locationId: string,
    companyId: string,
    actorId?: string,
    actorName = 'Business Owner'
  ): Promise<void> {
    await AttendanceRepository.revokeLocationQrTokens(locationId, companyId)

    await AttendanceRepository.logAttendanceAudit({
      companyId,
      actorId,
      actorName,
      actionType: 'qr_revoked',
      locationId,
      details: {
        location_id: locationId,
        status: 'deactivated',
      },
    })
  }

  // ==========================================
  // 3. SECURE VERIFICATION & PUNCH RECORDING
  // ==========================================

  /**
   * Authoritative server-side verification and attendance recording.
   * Performs cryptographic token resolution, geofence distance calculation,
   * GPS accuracy threshold check, and stateful duplicate prevention.
   */
  static async verifyAndRecordAttendance(params: {
    companyId: string
    employeeId: string
    employeeName?: string
    userId?: string
    qrToken: string
    latitude: number
    longitude: number
    accuracy: number
    attendanceType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'FIELD_CHECK_IN' | 'FIELD_CHECK_OUT'
    notes?: string
    deviceMetadata?: Record<string, any>
  }): Promise<AttendanceVerificationResult> {
    const {
      companyId,
      employeeId,
      employeeName,
      userId,
      qrToken,
      latitude,
      longitude,
      accuracy,
      attendanceType,
      notes,
      deviceMetadata,
    } = params

    // 1. Basic validation
    if (!qrToken || typeof qrToken !== 'string' || qrToken.trim().length === 0) {
      return {
        success: false,
        code: 'QR_INVALID',
        error: 'QR token is required. Please scan a valid attendance code.',
      }
    }

    const coordCheck = validateCoordinates(latitude, longitude, accuracy)
    if (!coordCheck.valid) {
      return {
        success: false,
        code: 'LOCATION_PERMISSION_REQUIRED',
        error: coordCheck.error || 'Valid GPS coordinates are required to verify attendance. Please enable device location.',
      }
    }

    // 2. Cryptographic Token Lookup
    const tokenHash = hashQrToken(qrToken)
    const tokenMatch = await AttendanceRepository.getQrTokenByHash(tokenHash)

    if (!tokenMatch) {
      await AttendanceRepository.logAttendanceAudit({
        companyId,
        actorId: userId,
        actorName: employeeName || 'Unknown Employee',
        actionType: 'attendance_rejected',
        employeeId,
        details: {
          reason: 'QR token not found in database',
          latitude,
          longitude,
          accuracy,
        },
      })

      return {
        success: false,
        code: 'QR_INVALID',
        error: 'Invalid QR code. Please scan an authorized InkFlow attendance terminal.',
      }
    }

    const { token, location } = tokenMatch

    // 3. Multi-Tenant Boundary Enforcement
    if (token.company_id !== companyId || location.company_id !== companyId) {
      await AttendanceRepository.logAttendanceAudit({
        companyId,
        actorId: userId,
        actorName: employeeName || 'Employee',
        actionType: 'attendance_rejected',
        employeeId,
        details: {
          reason: 'Cross-tenant QR scan attempt',
          token_company_id: token.company_id,
          attempted_company_id: companyId,
        },
      })

      return {
        success: false,
        code: 'UNAUTHORIZED_TENANT',
        error: 'This QR code belongs to a different organization.',
      }
    }

    // 4. Token Active & Expiry Status Check
    if (!token.is_active || token.revoked_at) {
      return {
        success: false,
        code: 'QR_REVOKED',
        error: 'This QR code has been rotated or revoked. Please scan the current terminal QR code.',
      }
    }

    if (token.expires_at && new Date(token.expires_at).getTime() < Date.now()) {
      return {
        success: false,
        code: 'QR_EXPIRED',
        error: 'This attendance QR code has expired. Please notify your manager.',
      }
    }

    // 5. Location Active Check
    if (!location.is_active) {
      return {
        success: false,
        code: 'LOCATION_INACTIVE',
        error: `The attendance terminal at "${location.name}" is currently deactivated.`,
      }
    }

    // 6. GPS Accuracy Threshold Check
    const maxAllowedAccuracy = location.max_accuracy_meters || 100
    if (accuracy > maxAllowedAccuracy) {
      return {
        success: false,
        code: 'LOW_ACCURACY',
        error: `GPS accuracy is insufficient (±${Math.round(accuracy)}m). Maximum allowed is ±${maxAllowedAccuracy}m. Move closer to a window or open area.`,
        details: {
          locationName: location.name,
          accuracyMeters: Math.round(accuracy),
          maxAccuracyMeters: maxAllowedAccuracy,
        },
      }
    }

    // 7. Server-Side Geofence Distance Calculation
    const distanceMeters = calculateHaversineDistance(
      latitude,
      longitude,
      location.latitude,
      location.longitude
    )

    const allowedRadius = location.radius_meters || 100
    if (distanceMeters > allowedRadius) {
      await AttendanceRepository.logAttendanceAudit({
        companyId,
        actorId: userId,
        actorName: employeeName || 'Employee',
        actionType: 'attendance_rejected',
        locationId: location.id,
        employeeId,
        details: {
          reason: 'Outside geofence radius',
          distance_meters: distanceMeters,
          allowed_radius: allowedRadius,
          user_lat: latitude,
          user_lng: longitude,
          location_lat: location.latitude,
          location_lng: location.longitude,
        },
      })

      return {
        success: false,
        code: 'OUTSIDE_RADIUS',
        error: `You are outside the approved area for ${location.name}. Distance is ${Math.round(distanceMeters)}m (Allowed: ${allowedRadius}m).`,
        details: {
          locationName: location.name,
          distanceMeters: Math.round(distanceMeters),
          allowedRadiusMeters: allowedRadius,
          accuracyMeters: Math.round(accuracy),
        },
      }
    }

    // 8. Idempotency & Duplicate Prevention
    const todayStr = new Date().toISOString().split('T')[0]
    const todayRecords = await AttendanceRepository.getTodayAttendanceForEmployee(
      employeeId,
      companyId,
      todayStr
    )

    const lastPunch = todayRecords[todayRecords.length - 1]
    const nowMs = Date.now()

    // Prevent accidental double-tapping within 30 seconds
    if (lastPunch) {
      const lastPunchMs = new Date(lastPunch.checked_at).getTime()
      if (nowMs - lastPunchMs < 30 * 1000) {
        return {
          success: false,
          code: 'SERVER_ERROR',
          error: 'Duplicate submission detected. Please wait a moment before punching again.',
        }
      }
    }

    const hasCheckedIn = todayRecords.some((r) => r.attendance_type === 'CHECK_IN')
    const hasCheckedOut = todayRecords.some((r) => r.attendance_type === 'CHECK_OUT')

    if (attendanceType === 'CHECK_IN') {
      if (hasCheckedIn && !hasCheckedOut) {
        const checkInTime = new Date(
          todayRecords.find((r) => r.attendance_type === 'CHECK_IN')!.checked_at
        ).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })

        return {
          success: false,
          code: 'ALREADY_CHECKED_IN',
          error: `You are already checked in for today at ${checkInTime}.`,
          details: {
            locationName: location.name,
            checkedAt: checkInTime,
          },
        }
      }
    } else if (attendanceType === 'CHECK_OUT') {
      if (!hasCheckedIn) {
        return {
          success: false,
          code: 'NO_ACTIVE_CHECKIN',
          error: 'No active check-in record found for today. Please check in first.',
        }
      }
      if (hasCheckedOut) {
        return {
          success: false,
          code: 'ALREADY_CHECKED_OUT',
          error: 'You have already checked out for today.',
        }
      }
    }

    // 9. Create Authoritative Attendance Record
    const nowIso = new Date().toISOString()
    const record = await AttendanceRepository.recordAttendance({
      company_id: companyId,
      employee_id: employeeId,
      user_id: userId,
      branch_id: location.branch_id,
      location_id: location.id,
      attendance_date: todayStr,
      attendance_type: attendanceType,
      checked_at: nowIso,
      latitude,
      longitude,
      gps_accuracy_meters: accuracy,
      distance_from_location_meters: distanceMeters,
      qr_token_id: token.id,
      verification_status: 'verified',
      verification_reason: `QR verified, Location "${location.name}" verified (Distance: ${Math.round(distanceMeters)}m, Accuracy: ${Math.round(accuracy)}m)`,
      device_info: deviceMetadata || {},
      notes: notes || `Mobile QR + Geolocation verified at ${location.name}`,
    })

    // 10. Audit Logging
    await AttendanceRepository.logAttendanceAudit({
      companyId,
      actorId: userId,
      actorName: employeeName || 'Employee',
      actionType: attendanceType === 'CHECK_IN' ? 'attendance_check_in' : 'attendance_check_out',
      locationId: location.id,
      employeeId,
      details: {
        location_name: location.name,
        distance_meters: distanceMeters,
        accuracy_meters: accuracy,
        attendance_type: attendanceType,
        checked_at: nowIso,
      },
    })

    // 11. Dispatch in-app notification to business owners / managers
    try {
      const punchTime = new Date(nowIso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

      await CommunicationService.createInAppNotification(companyId, {
        user_id: userId || '',
        type: 'attendance_event' as any,
        title: `${attendanceType === 'CHECK_IN' ? 'Check-In' : 'Check-Out'} Verified`,
        title_bn: `${attendanceType === 'CHECK_IN' ? 'হাজিরা প্রবেশ' : 'প্রস্থান'} নিশ্চিত`,
        message: `${employeeName || 'Employee'} punched ${attendanceType === 'CHECK_IN' ? 'IN' : 'OUT'} at ${location.name} (${punchTime}, ${Math.round(distanceMeters)}m)`,
        message_bn: `${employeeName || 'কর্মী'} ${location.name}-এ ${punchTime}-এ সফলভাবে হাজিরা দিয়েছেন।`,
        action_url: `/hr`,
        is_read: false,
      })
    } catch (notifErr) {
      // Non-blocking notification failure
    }

    return {
      success: true,
      code: 'SUCCESS',
      record,
      details: {
        locationName: location.name,
        distanceMeters: Math.round(distanceMeters),
        allowedRadiusMeters: allowedRadius,
        accuracyMeters: Math.round(accuracy),
        checkedAt: new Date(nowIso).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        attendanceType,
      },
    }
  }

  // ==========================================
  // 4. CORRECTIONS & AUDIT FEEDS
  // ==========================================

  static async requestCorrection(params: {
    companyId: string
    employeeId: string
    requestedBy: string
    attendanceRecordId?: string | null
    attendanceDate: string
    requestedType: 'CHECK_IN' | 'CHECK_OUT'
    requestedTime: string
    reason: string
  }): Promise<AttendanceCorrectionRecord> {
    const correction = await AttendanceRepository.createCorrection(params)

    await AttendanceRepository.logAttendanceAudit({
      companyId: params.companyId,
      actorId: params.requestedBy,
      actorName: 'Employee',
      actionType: 'attendance_correction_requested',
      employeeId: params.employeeId,
      details: {
        attendance_date: params.attendanceDate,
        requested_type: params.requestedType,
        requested_time: params.requestedTime,
        reason: params.reason,
      },
    })

    return correction
  }

  static async reviewCorrection(
    id: string,
    companyId: string,
    reviewerId: string,
    reviewerName: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<AttendanceCorrectionRecord> {
    const reviewed = await AttendanceRepository.reviewCorrection(
      id,
      companyId,
      reviewerId,
      status,
      reviewNotes
    )

    await AttendanceRepository.logAttendanceAudit({
      companyId,
      actorId: reviewerId,
      actorName: reviewerName,
      actionType: 'attendance_correction_reviewed',
      employeeId: reviewed.employee_id,
      details: {
        correction_id: id,
        decision: status,
        review_notes: reviewNotes,
      },
    })

    return reviewed
  }

  static async getTenantCorrections(
    companyId: string,
    status?: 'pending' | 'approved' | 'rejected'
  ): Promise<AttendanceCorrectionRecord[]> {
    return AttendanceRepository.getCorrections(companyId, status)
  }

  static async getEmployeeCorrections(
    employeeId: string,
    companyId: string
  ): Promise<AttendanceCorrectionRecord[]> {
    return AttendanceRepository.getEmployeeCorrections(employeeId, companyId)
  }

  static async getLiveAttendanceFeed(
    companyId: string,
    dateStr?: string
  ): Promise<AttendanceRecord[]> {
    return AttendanceRepository.getTenantAttendanceLiveFeed(companyId, dateStr)
  }

  static async getAuditLogs(
    companyId: string,
    limit = 50
  ): Promise<AttendanceAuditLogRecord[]> {
    return AttendanceRepository.getAttendanceAuditLogs(companyId, limit)
  }
}
