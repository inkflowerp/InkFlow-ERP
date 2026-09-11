// ==============================================================================
// InkFlow ERP - Attendance & QR Geolocation Type Definitions
// ==============================================================================

export type AttendanceType =
  | 'CHECK_IN'
  | 'CHECK_OUT'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'FIELD_CHECK_IN'
  | 'FIELD_CHECK_OUT'

export type AttendanceVerificationStatus =
  | 'verified'
  | 'rejected'
  | 'flagged'
  | 'manual_override'

export type AttendanceCorrectionStatus = 'pending' | 'approved' | 'rejected'

export interface AttendanceLocationRecord {
  id: string
  company_id: string
  branch_id?: string | null
  branch_name?: string | null
  name: string
  address?: string | null
  latitude: number
  longitude: number
  radius_meters: number
  max_accuracy_meters: number
  is_active: boolean
  active_qr_token?: AttendanceQrTokenRecord | null
  created_at: string
  updated_at: string
}

export interface AttendanceQrTokenRecord {
  id: string
  company_id: string
  location_id: string
  token_hash: string
  token_prefix: string
  raw_token?: string // Only exposed during initial generation / retrieval for authorized admins
  qr_payload_url?: string
  generated_by?: string | null
  generated_by_name?: string | null
  expires_at?: string | null
  revoked_at?: string | null
  is_active: boolean
  created_at: string
}

export interface AttendanceRecord {
  id: string
  company_id: string
  employee_id: string
  employee_name?: string | null
  employee_role?: string | null
  user_id?: string | null
  branch_id?: string | null
  branch_name?: string | null
  location_id?: string | null
  location_name?: string | null
  attendance_date: string
  attendance_type: AttendanceType
  checked_at: string
  latitude: number
  longitude: number
  gps_accuracy_meters: number
  distance_from_location_meters: number
  qr_token_id?: string | null
  verification_status: AttendanceVerificationStatus
  verification_reason?: string | null
  device_info?: Record<string, any> | null
  notes?: string | null
  created_at: string
}

export interface AttendanceCorrectionRecord {
  id: string
  company_id: string
  employee_id: string
  employee_name?: string | null
  requested_by: string
  requested_by_name?: string | null
  attendance_record_id?: string | null
  attendance_date: string
  requested_type: 'CHECK_IN' | 'CHECK_OUT'
  requested_time: string
  reason: string
  status: AttendanceCorrectionStatus
  reviewed_by?: string | null
  reviewed_by_name?: string | null
  reviewed_at?: string | null
  review_notes?: string | null
  created_at: string
  updated_at: string
}

export interface AttendanceAuditLogRecord {
  id: string
  company_id: string
  actor_id?: string | null
  actor_name: string
  action_type:
    | 'qr_generated'
    | 'qr_regenerated'
    | 'qr_revoked'
    | 'location_created'
    | 'location_updated'
    | 'location_deleted'
    | 'attendance_check_in'
    | 'attendance_check_out'
    | 'attendance_rejected'
    | 'attendance_correction_requested'
    | 'attendance_correction_reviewed'
  location_id?: string | null
  location_name?: string | null
  employee_id?: string | null
  employee_name?: string | null
  details: Record<string, any>
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
}

export interface AttendanceVerificationResult {
  success: boolean
  record?: AttendanceRecord
  error?: string
  code?:
    | 'SUCCESS'
    | 'UNAUTHENTICATED'
    | 'UNAUTHORIZED_TENANT'
    | 'QR_INVALID'
    | 'QR_EXPIRED'
    | 'QR_REVOKED'
    | 'LOCATION_INACTIVE'
    | 'OUTSIDE_RADIUS'
    | 'LOW_ACCURACY'
    | 'ALREADY_CHECKED_IN'
    | 'ALREADY_CHECKED_OUT'
    | 'NO_ACTIVE_CHECKIN'
    | 'LOCATION_PERMISSION_REQUIRED'
    | 'SERVER_ERROR'
  details?: {
    locationName?: string
    distanceMeters?: number
    allowedRadiusMeters?: number
    accuracyMeters?: number
    maxAccuracyMeters?: number
    checkedAt?: string
    attendanceType?: AttendanceType
  }
}

export interface AttendancePunchInput {
  company_id?: string
  qr_token: string
  latitude: number
  longitude: number
  accuracy: number
  timestamp?: string
  attendance_type: AttendanceType
  notes?: string
  device_metadata?: {
    userAgent?: string
    platform?: string
    screenResolution?: string
  }
}

export interface CreateAttendanceLocationInput {
  company_id: string
  branch_id?: string | null
  name: string
  address?: string | null
  latitude: number
  longitude: number
  radius_meters?: number
  max_accuracy_meters?: number
  is_active?: boolean
}

export interface UpdateAttendanceLocationInput {
  name?: string
  address?: string | null
  branch_id?: string | null
  latitude?: number
  longitude?: number
  radius_meters?: number
  max_accuracy_meters?: number
  is_active?: boolean
}
