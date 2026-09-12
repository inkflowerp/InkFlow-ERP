// ==============================================================================
// InkFlow ERP - Authoritative Attendance Repository (Supabase PostgreSQL)
// ==============================================================================

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AttendanceLocationRecord,
  AttendanceQrTokenRecord,
  AttendanceRecord,
  AttendanceCorrectionRecord,
  AttendanceAuditLogRecord,
  AttendanceType,
  AttendanceCorrectionStatus,
  CreateAttendanceLocationInput,
  UpdateAttendanceLocationInput,
} from '@/types/attendance.types'
import {
  getAttendanceLocalDate,
  formatAttendanceTime,
} from '@/lib/attendance/geofence-utils'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function resolveCompanyUuid(companyIdOrSlug?: string | null): Promise<string | null> {
  if (!companyIdOrSlug) return null
  const clean = companyIdOrSlug.trim()
  if (UUID_REGEX.test(clean)) {
    return clean
  }

  const slug = clean.replace(/^co-/, '').toLowerCase().trim()
  const admin = createAdminClient()
  try {
    const { data } = await (admin as any)
      .from('companies')
      .select('id')
      .ilike('slug', slug)
      .maybeSingle()

    if (data?.id) {
      return data.id
    }

    const { data: compByName } = await (admin as any)
      .from('companies')
      .select('id')
      .ilike('name', slug)
      .maybeSingle()

    if (compByName?.id) {
      return compByName.id
    }

    const { data: fallback } = await (admin as any)
      .from('companies')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    return fallback?.id || null
  } catch {
    return null
  }
}

export function sanitizeUuid(val?: string | null): string | null {
  if (!val || typeof val !== 'string') return null
  const clean = val.trim()
  return UUID_REGEX.test(clean) ? clean : null
}

export class AttendanceRepository {
  // ==========================================
  // 1. ATTENDANCE LOCATIONS
  // ==========================================

  static async getLocations(companyId: string): Promise<AttendanceLocationRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data: locations, error } = await (admin as any)
      .from('attendance_locations')
      .select('*, branches(name)')
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AttendanceRepository.getLocations] Error:', error.message)
      return []
    }

    // Fetch active QR tokens for all locations in one query
    const locationIds = (locations || []).map((l: any) => l.id)
    let tokenMap: Record<string, AttendanceQrTokenRecord> = {}
    if (locationIds.length > 0) {
      const { data: tokens } = await (admin as any)
        .from('attendance_qr_tokens')
        .select('*')
        .eq('company_id', targetCompanyId)
        .eq('is_active', true)
        .in('location_id', locationIds)

      if (tokens) {
        tokens.forEach((t: any) => {
          tokenMap[t.location_id] = t
        })
      }
    }

    return (locations || []).map((loc: any) => ({
      id: loc.id,
      company_id: loc.company_id,
      branch_id: loc.branch_id,
      branch_name: loc.branches?.name || null,
      name: loc.name,
      address: loc.address,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      radius_meters: Number(loc.radius_meters) || 100,
      max_accuracy_meters: Number(loc.max_accuracy_meters) || 100,
      is_active: Boolean(loc.is_active),
      active_qr_token: tokenMap[loc.id] || null,
      created_at: loc.created_at,
      updated_at: loc.updated_at,
    }))
  }

  static async getLocationById(id: string, companyId: string): Promise<AttendanceLocationRecord | null> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data: loc, error } = await (admin as any)
      .from('attendance_locations')
      .select('*, branches(name)')
      .eq('id', id)
      .eq('company_id', targetCompanyId)
      .maybeSingle()

    if (error || !loc) return null

    const { data: token } = await (admin as any)
      .from('attendance_qr_tokens')
      .select('*')
      .eq('location_id', id)
      .eq('company_id', targetCompanyId)
      .eq('is_active', true)
      .maybeSingle()

    return {
      id: loc.id,
      company_id: loc.company_id,
      branch_id: loc.branch_id,
      branch_name: loc.branches?.name || null,
      name: loc.name,
      address: loc.address,
      latitude: Number(loc.latitude),
      longitude: Number(loc.longitude),
      radius_meters: Number(loc.radius_meters) || 100,
      max_accuracy_meters: Number(loc.max_accuracy_meters) || 100,
      is_active: Boolean(loc.is_active),
      active_qr_token: token || null,
      created_at: loc.created_at,
      updated_at: loc.updated_at,
    }
  }

  static async createLocation(input: CreateAttendanceLocationInput): Promise<AttendanceLocationRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(input.company_id)) || input.company_id
    const payload = {
      company_id: targetCompanyId,
      branch_id: sanitizeUuid(input.branch_id),
      name: input.name.trim(),
      address: input.address?.trim() || null,
      latitude: input.latitude,
      longitude: input.longitude,
      radius_meters: input.radius_meters || 100,
      max_accuracy_meters: input.max_accuracy_meters || 100,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('attendance_locations')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create attendance location: ${error.message}`)
    }

    return {
      id: data.id,
      company_id: data.company_id,
      branch_id: data.branch_id,
      name: data.name,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radius_meters: Number(data.radius_meters),
      max_accuracy_meters: Number(data.max_accuracy_meters),
      is_active: Boolean(data.is_active),
      active_qr_token: null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  static async updateLocation(
    id: string,
    updates: UpdateAttendanceLocationInput,
    companyId: string
  ): Promise<AttendanceLocationRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const payload: any = {
      ...updates,
      updated_at: new Date().toISOString(),
    }
    delete payload.id
    delete payload.company_id
    if ('branch_id' in updates) {
      payload.branch_id = sanitizeUuid(updates.branch_id)
    }

    const { data, error } = await (admin as any)
      .from('attendance_locations')
      .update(payload)
      .eq('id', id)
      .eq('company_id', targetCompanyId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update attendance location: ${error.message}`)
    }

    return {
      id: data.id,
      company_id: data.company_id,
      branch_id: data.branch_id,
      name: data.name,
      address: data.address,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radius_meters: Number(data.radius_meters),
      max_accuracy_meters: Number(data.max_accuracy_meters),
      is_active: Boolean(data.is_active),
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  static async deleteLocation(id: string, companyId: string): Promise<boolean> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId

    // 1. Safely delete/unlink dependent foreign key references first
    try {
      await (admin as any)
        .from('attendance_qr_tokens')
        .delete()
        .eq('location_id', id)
    } catch (e: any) {
      console.warn('[AttendanceRepository.deleteLocation] Cleanup qr_tokens:', e?.message)
    }

    try {
      await (admin as any)
        .from('attendance_records')
        .update({ location_id: null })
        .eq('location_id', id)
    } catch (e: any) {
      console.warn('[AttendanceRepository.deleteLocation] Cleanup records:', e?.message)
    }

    try {
      await (admin as any)
        .from('attendance_audit_logs')
        .update({ location_id: null })
        .eq('location_id', id)
    } catch (e: any) {
      console.warn('[AttendanceRepository.deleteLocation] Cleanup audit_logs:', e?.message)
    }

    // 2. Delete the attendance location
    const { error } = await (admin as any)
      .from('attendance_locations')
      .delete()
      .eq('id', id)
      .eq('company_id', targetCompanyId)

    if (error) {
      // Fallback: delete by id alone in case companyId format differs
      const { error: err2 } = await (admin as any)
        .from('attendance_locations')
        .delete()
        .eq('id', id)

      if (err2) {
        throw new Error(`Failed to delete attendance location: ${error.message || err2.message}`)
      }
    }
    return true
  }


  // ==========================================
  // 2. QR TOKENS
  // ==========================================

  static async createQrToken(params: {
    companyId: string
    locationId: string
    tokenHash: string
    tokenPrefix: string
    generatedBy?: string | null
    expiresAt?: string | null
  }): Promise<AttendanceQrTokenRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(params.companyId)) || params.companyId

    // 1. Invalidate any existing active tokens for this location
    await (admin as any)
      .from('attendance_qr_tokens')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('location_id', params.locationId)
      .eq('company_id', targetCompanyId)
      .eq('is_active', true)

    // 2. Insert new token
    const payload = {
      company_id: targetCompanyId,
      location_id: params.locationId,
      token_hash: params.tokenHash,
      token_prefix: params.tokenPrefix,
      generated_by: sanitizeUuid(params.generatedBy),
      expires_at: params.expiresAt || null,
      revoked_at: null,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('attendance_qr_tokens')
      .insert(payload)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create attendance QR token: ${error.message}`)
    }

    return {
      id: data.id,
      company_id: data.company_id,
      location_id: data.location_id,
      token_hash: data.token_hash,
      token_prefix: data.token_prefix,
      generated_by: data.generated_by,
      expires_at: data.expires_at,
      revoked_at: data.revoked_at,
      is_active: Boolean(data.is_active),
      created_at: data.created_at,
    }
  }

  static async getActiveQrTokenForLocation(
    locationId: string,
    companyId: string
  ): Promise<AttendanceQrTokenRecord | null> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data, error } = await (admin as any)
      .from('attendance_qr_tokens')
      .select('*')
      .eq('location_id', locationId)
      .eq('company_id', targetCompanyId)
      .eq('is_active', true)
      .maybeSingle()

    if (error || !data) return null
    return {
      id: data.id,
      company_id: data.company_id,
      location_id: data.location_id,
      token_hash: data.token_hash,
      token_prefix: data.token_prefix,
      generated_by: data.generated_by,
      expires_at: data.expires_at,
      revoked_at: data.revoked_at,
      is_active: Boolean(data.is_active),
      created_at: data.created_at,
    }
  }

  static async getQrTokenByHash(
    tokenHash: string,
    companyId?: string
  ): Promise<{ token: AttendanceQrTokenRecord; location: AttendanceLocationRecord } | null> {
    const admin = createAdminClient()
    const targetCompanyId = companyId ? (await resolveCompanyUuid(companyId)) || companyId : undefined
    let query = (admin as any)
      .from('attendance_qr_tokens')
      .select('*, attendance_locations(*)')
      .eq('token_hash', tokenHash)

    if (targetCompanyId) {
      query = query.eq('company_id', targetCompanyId)
    }

    const { data, error } = await query.maybeSingle()

    if (error || !data || !data.attendance_locations) {
      return null
    }

    const loc = data.attendance_locations
    return {
      token: {
        id: data.id,
        company_id: data.company_id,
        location_id: data.location_id,
        token_hash: data.token_hash,
        token_prefix: data.token_prefix,
        generated_by: data.generated_by,
        expires_at: data.expires_at,
        revoked_at: data.revoked_at,
        is_active: Boolean(data.is_active),
        created_at: data.created_at,
      },
      location: {
        id: loc.id,
        company_id: loc.company_id,
        branch_id: loc.branch_id,
        name: loc.name,
        address: loc.address,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        radius_meters: Number(loc.radius_meters) || 100,
        max_accuracy_meters: Number(loc.max_accuracy_meters) || 100,
        is_active: Boolean(loc.is_active),
        created_at: loc.created_at,
        updated_at: loc.updated_at,
      },
    }
  }

  static async getActiveQrTokenByLocationId(
    locationId: string,
    companyId?: string
  ): Promise<{ token: AttendanceQrTokenRecord; location: AttendanceLocationRecord } | null> {
    const admin = createAdminClient()
    const targetCompanyId = companyId ? (await resolveCompanyUuid(companyId)) || companyId : undefined
    let locQuery = (admin as any)
      .from('attendance_locations')
      .select('*')
      .eq('id', locationId)

    if (targetCompanyId) {
      locQuery = locQuery.eq('company_id', targetCompanyId)
    }

    let { data: loc, error: locErr } = await locQuery.maybeSingle()
    if (!loc && targetCompanyId) {
      // Fallback: query by id without company filter in case of id prefix differences
      const { data: fallbackLoc } = await (admin as any)
        .from('attendance_locations')
        .select('*')
        .eq('id', locationId)
        .maybeSingle()
      loc = fallbackLoc
    }

    if (!loc) return null

    const { data: tokens } = await (admin as any)
      .from('attendance_qr_tokens')
      .select('*')
      .eq('location_id', loc.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)

    const token = tokens?.[0]

    return {
      token: token
        ? {
            id: token.id,
            company_id: token.company_id,
            location_id: token.location_id,
            token_hash: token.token_hash,
            token_prefix: token.token_prefix,
            generated_by: token.generated_by,
            expires_at: token.expires_at,
            revoked_at: token.revoked_at,
            is_active: Boolean(token.is_active),
            created_at: token.created_at,
          }
        : {
            id: `tok-${loc.id}`,
            company_id: loc.company_id,
            location_id: loc.id,
            token_hash: `hash-${loc.id}`,
            token_prefix: `LOC-${loc.id.slice(0, 8).toUpperCase()}`,
            is_active: true,
            created_at: loc.created_at,
          },
      location: {
        id: loc.id,
        company_id: loc.company_id,
        branch_id: loc.branch_id,
        name: loc.name,
        address: loc.address,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        radius_meters: Number(loc.radius_meters) || 100,
        max_accuracy_meters: Number(loc.max_accuracy_meters) || 100,
        is_active: Boolean(loc.is_active),
        created_at: loc.created_at,
        updated_at: loc.updated_at,
      },
    }
  }

  static async getActiveQrTokenByPrefix(
    prefix: string,
    companyId?: string
  ): Promise<{ token: AttendanceQrTokenRecord; location: AttendanceLocationRecord } | null> {
    const admin = createAdminClient()
    const targetCompanyId = companyId ? (await resolveCompanyUuid(companyId)) || companyId : undefined
    let query = (admin as any)
      .from('attendance_qr_tokens')
      .select('*, attendance_locations(*)')
      .eq('token_prefix', prefix)
      .eq('is_active', true)

    if (targetCompanyId) {
      query = query.eq('company_id', targetCompanyId)
    }

    const { data, error } = await query.maybeSingle()
    if (error || !data || !data.attendance_locations) return null

    const loc = data.attendance_locations
    return {
      token: {
        id: data.id,
        company_id: data.company_id,
        location_id: data.location_id,
        token_hash: data.token_hash,
        token_prefix: data.token_prefix,
        generated_by: data.generated_by,
        expires_at: data.expires_at,
        revoked_at: data.revoked_at,
        is_active: Boolean(data.is_active),
        created_at: data.created_at,
      },
      location: {
        id: loc.id,
        company_id: loc.company_id,
        branch_id: loc.branch_id,
        name: loc.name,
        address: loc.address,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
        radius_meters: Number(loc.radius_meters) || 100,
        max_accuracy_meters: Number(loc.max_accuracy_meters) || 100,
        is_active: Boolean(loc.is_active),
        created_at: loc.created_at,
        updated_at: loc.updated_at,
      },
    }
  }

  static async revokeLocationQrTokens(locationId: string, companyId: string): Promise<void> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    await (admin as any)
      .from('attendance_qr_tokens')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('location_id', locationId)
      .eq('company_id', targetCompanyId)
  }

  // ==========================================
  // 3. ATTENDANCE RECORDS (PUNCH LOGS)
  // ==========================================

  static async recordAttendance(record: {
    company_id: string
    employee_id: string
    user_id?: string | null
    branch_id?: string | null
    location_id?: string | null
    attendance_date: string
    attendance_type: AttendanceType
    checked_at: string
    latitude: number
    longitude: number
    gps_accuracy_meters: number
    distance_from_location_meters: number
    qr_token_id?: string | null
    verification_status: string
    verification_reason?: string | null
    device_info?: Record<string, any> | null
    notes?: string | null
  }): Promise<AttendanceRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(record.company_id)) || record.company_id
    const payload = {
      company_id: targetCompanyId,
      employee_id: record.employee_id,
      user_id: sanitizeUuid(record.user_id),
      branch_id: sanitizeUuid(record.branch_id),
      location_id: sanitizeUuid(record.location_id),
      attendance_date: record.attendance_date,
      attendance_type: record.attendance_type,
      checked_at: record.checked_at,
      latitude: record.latitude,
      longitude: record.longitude,
      gps_accuracy_meters: record.gps_accuracy_meters,
      distance_from_location_meters: record.distance_from_location_meters,
      qr_token_id: sanitizeUuid(record.qr_token_id),
      verification_status: record.verification_status,
      verification_reason: record.verification_reason || null,
      device_info: record.device_info || {},
      notes: record.notes || null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('attendance_records')
      .insert(payload)
      .select('*, employees(name, role), attendance_locations(name)')
      .single()

    if (error) {
      throw new Error(`Failed to save attendance record: ${error.message}`)
    }

    // Also update or insert daily summary row into public.attendances for backward compatibility with payroll/HR
    try {
      const punchTimeStr = formatAttendanceTime(record.checked_at, 'Asia/Dhaka')

      const { data: existingAtt } = await (admin as any)
        .from('attendances')
        .select('*')
        .eq('employee_id', record.employee_id)
        .eq('attendance_date', record.attendance_date)
        .maybeSingle()

      if (existingAtt) {
        const updates: any = {}
        if (record.attendance_type === 'CHECK_OUT') {
          updates.check_out_time = punchTimeStr
        } else if (record.attendance_type === 'CHECK_IN' && !existingAtt.check_in_time) {
          updates.check_in_time = punchTimeStr
          updates.status = 'present'
        }
        if (Object.keys(updates).length > 0) {
          await (admin as any)
            .from('attendances')
            .update(updates)
            .eq('id', existingAtt.id)
        }
      } else {
        await (admin as any).from('attendances').insert({
          company_id: targetCompanyId,
          employee_id: record.employee_id,
          attendance_date: record.attendance_date,
          status: 'present',
          check_in_time: record.attendance_type === 'CHECK_IN' ? punchTimeStr : null,
          check_out_time: record.attendance_type === 'CHECK_OUT' ? punchTimeStr : null,
          late_minutes: 0,
          overtime_hours: 0,
          notes: record.notes || 'QR + GPS Verified Attendance',
          created_at: new Date().toISOString(),
        })
      }
    } catch (attErr) {
      console.warn('[AttendanceRepository] Warning: failed to sync daily attendances table:', attErr)
    }

    return {
      id: data.id,
      company_id: data.company_id,
      employee_id: data.employee_id,
      employee_name: data.employees?.name || null,
      employee_role: data.employees?.role || null,
      user_id: data.user_id,
      branch_id: data.branch_id,
      location_id: data.location_id,
      location_name: data.attendance_locations?.name || null,
      attendance_date: data.attendance_date,
      attendance_type: data.attendance_type as AttendanceType,
      checked_at: data.checked_at,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      gps_accuracy_meters: Number(data.gps_accuracy_meters),
      distance_from_location_meters: Number(data.distance_from_location_meters),
      qr_token_id: data.qr_token_id,
      verification_status: data.verification_status,
      verification_reason: data.verification_reason,
      device_info: data.device_info,
      notes: data.notes,
      created_at: data.created_at,
    }
  }

  static async getTodayAttendanceForEmployee(
    employeeId: string,
    companyId: string,
    dateStr?: string
  ): Promise<AttendanceRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const targetDate = dateStr || getAttendanceLocalDate(new Date(), 'Asia/Dhaka')

    const { data, error } = await (admin as any)
      .from('attendance_records')
      .select('*, employees(name, role), attendance_locations(name)')
      .eq('employee_id', employeeId)
      .eq('company_id', targetCompanyId)
      .eq('attendance_date', targetDate)
      .order('checked_at', { ascending: true })

    if (error) {
      console.error('[AttendanceRepository.getTodayAttendanceForEmployee] Error:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      company_id: r.company_id,
      employee_id: r.employee_id,
      employee_name: r.employees?.name || null,
      employee_role: r.employees?.role || null,
      user_id: r.user_id,
      branch_id: r.branch_id,
      location_id: r.location_id,
      location_name: r.attendance_locations?.name || null,
      attendance_date: r.attendance_date,
      attendance_type: r.attendance_type as AttendanceType,
      checked_at: r.checked_at,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      gps_accuracy_meters: Number(r.gps_accuracy_meters),
      distance_from_location_meters: Number(r.distance_from_location_meters),
      qr_token_id: r.qr_token_id,
      verification_status: r.verification_status,
      verification_reason: r.verification_reason,
      device_info: r.device_info,
      notes: r.notes,
      created_at: r.created_at,
    }))
  }

  static async getEmployeeAttendanceHistory(
    employeeId: string,
    companyId: string,
    limit = 30
  ): Promise<AttendanceRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data, error } = await (admin as any)
      .from('attendance_records')
      .select('*, employees(name, role), attendance_locations(name)')
      .eq('employee_id', employeeId)
      .eq('company_id', targetCompanyId)
      .order('checked_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[AttendanceRepository.getEmployeeAttendanceHistory] Error:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      company_id: r.company_id,
      employee_id: r.employee_id,
      employee_name: r.employees?.name || null,
      employee_role: r.employees?.role || null,
      user_id: r.user_id,
      branch_id: r.branch_id,
      location_id: r.location_id,
      location_name: r.attendance_locations?.name || null,
      attendance_date: r.attendance_date,
      attendance_type: r.attendance_type as AttendanceType,
      checked_at: r.checked_at,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      gps_accuracy_meters: Number(r.gps_accuracy_meters),
      distance_from_location_meters: Number(r.distance_from_location_meters),
      qr_token_id: r.qr_token_id,
      verification_status: r.verification_status,
      verification_reason: r.verification_reason,
      device_info: r.device_info,
      notes: r.notes,
      created_at: r.created_at,
    }))
  }

  static async getTenantAttendanceLiveFeed(
    companyId: string,
    dateStr?: string
  ): Promise<AttendanceRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const targetDate = dateStr || getAttendanceLocalDate(new Date(), 'Asia/Dhaka')

    const { data, error } = await (admin as any)
      .from('attendance_records')
      .select('*, employees(name, role, department), attendance_locations(name)')
      .eq('company_id', targetCompanyId)
      .eq('attendance_date', targetDate)
      .order('checked_at', { ascending: false })

    if (error) {
      console.error('[AttendanceRepository.getTenantAttendanceLiveFeed] Error:', error.message)
      return []
    }

    return (data || []).map((r: any) => ({
      id: r.id,
      company_id: r.company_id,
      employee_id: r.employee_id,
      employee_name: r.employees?.name || null,
      employee_role: r.employees?.role || null,
      user_id: r.user_id,
      branch_id: r.branch_id,
      location_id: r.location_id,
      location_name: r.attendance_locations?.name || null,
      attendance_date: r.attendance_date,
      attendance_type: r.attendance_type as AttendanceType,
      checked_at: r.checked_at,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      gps_accuracy_meters: Number(r.gps_accuracy_meters),
      distance_from_location_meters: Number(r.distance_from_location_meters),
      qr_token_id: r.qr_token_id,
      verification_status: r.verification_status,
      verification_reason: r.verification_reason,
      device_info: r.device_info,
      notes: r.notes,
      created_at: r.created_at,
    }))
  }

  // ==========================================
  // 4. ATTENDANCE CORRECTIONS
  // ==========================================

  static async createCorrection(params: {
    companyId: string
    employeeId: string
    requestedBy: string
    attendanceRecordId?: string | null
    attendanceDate: string
    requestedType: 'CHECK_IN' | 'CHECK_OUT'
    requestedTime: string
    reason: string
  }): Promise<AttendanceCorrectionRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(params.companyId)) || params.companyId
    const payload = {
      company_id: targetCompanyId,
      employee_id: params.employeeId,
      requested_by: sanitizeUuid(params.requestedBy),
      attendance_record_id: sanitizeUuid(params.attendanceRecordId),
      attendance_date: params.attendanceDate,
      requested_type: params.requestedType,
      requested_time: params.requestedTime,
      reason: params.reason.trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('attendance_corrections')
      .insert(payload)
      .select('*, employees(name)')
      .single()

    if (error) {
      throw new Error(`Failed to create correction request: ${error.message}`)
    }

    return {
      id: data.id,
      company_id: data.company_id,
      employee_id: data.employee_id,
      employee_name: data.employees?.name || null,
      requested_by: data.requested_by,
      attendance_record_id: data.attendance_record_id,
      attendance_date: data.attendance_date,
      requested_type: data.requested_type,
      requested_time: data.requested_time,
      reason: data.reason,
      status: data.status,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
      review_notes: data.review_notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  static async getCorrections(
    companyId: string,
    status?: AttendanceCorrectionStatus
  ): Promise<AttendanceCorrectionRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    let query = (admin as any)
      .from('attendance_corrections')
      .select('*, employees(name), user_profiles:reviewed_by(full_name)')
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[AttendanceRepository.getCorrections] Error:', error.message)
      return []
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      company_id: c.company_id,
      employee_id: c.employee_id,
      employee_name: c.employees?.name || null,
      requested_by: c.requested_by,
      attendance_record_id: c.attendance_record_id,
      attendance_date: c.attendance_date,
      requested_type: c.requested_type,
      requested_time: c.requested_time,
      reason: c.reason,
      status: c.status,
      reviewed_by: c.reviewed_by,
      reviewed_by_name: c.user_profiles?.full_name || null,
      reviewed_at: c.reviewed_at,
      review_notes: c.review_notes,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }))
  }

  static async getEmployeeCorrections(
    employeeId: string,
    companyId: string
  ): Promise<AttendanceCorrectionRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data, error } = await (admin as any)
      .from('attendance_corrections')
      .select('*, employees(name), user_profiles:reviewed_by(full_name)')
      .eq('employee_id', employeeId)
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AttendanceRepository.getEmployeeCorrections] Error:', error.message)
      return []
    }

    return (data || []).map((c: any) => ({
      id: c.id,
      company_id: c.company_id,
      employee_id: c.employee_id,
      employee_name: c.employees?.name || null,
      requested_by: c.requested_by,
      attendance_record_id: c.attendance_record_id,
      attendance_date: c.attendance_date,
      requested_type: c.requested_type,
      requested_time: c.requested_time,
      reason: c.reason,
      status: c.status,
      reviewed_by: c.reviewed_by,
      reviewed_by_name: c.user_profiles?.full_name || null,
      reviewed_at: c.reviewed_at,
      review_notes: c.review_notes,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }))
  }

  static async reviewCorrection(
    id: string,
    companyId: string,
    reviewerId: string,
    status: 'approved' | 'rejected',
    reviewNotes?: string
  ): Promise<AttendanceCorrectionRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const now = new Date().toISOString()

    const { data, error } = await (admin as any)
      .from('attendance_corrections')
      .update({
        status,
        reviewed_by: sanitizeUuid(reviewerId),
        reviewed_at: now,
        review_notes: reviewNotes?.trim() || null,
        updated_at: now,
      })
      .eq('id', id)
      .eq('company_id', targetCompanyId)
      .select('*, employees(name)')
      .single()

    if (error) {
      throw new Error(`Failed to review attendance correction: ${error.message}`)
    }

    // If approved, update or insert corresponding attendance record
    if (status === 'approved') {
      try {
        const checkedAtIso = `${data.attendance_date}T${data.requested_time}:00Z`
        await this.recordAttendance({
          company_id: data.company_id,
          employee_id: data.employee_id,
          attendance_date: data.attendance_date,
          attendance_type: data.requested_type as AttendanceType,
          checked_at: checkedAtIso,
          latitude: 0,
          longitude: 0,
          gps_accuracy_meters: 0,
          distance_from_location_meters: 0,
          verification_status: 'manual_override',
          verification_reason: `Correction Approved by Manager. Reason: ${data.reason}`,
          notes: `Approved correction: ${data.reason}`,
        })
      } catch (applyErr) {
        console.warn('[AttendanceRepository] Failed to apply approved correction to attendance_records:', applyErr)
      }
    }

    return {
      id: data.id,
      company_id: data.company_id,
      employee_id: data.employee_id,
      employee_name: data.employees?.name || null,
      requested_by: data.requested_by,
      attendance_record_id: data.attendance_record_id,
      attendance_date: data.attendance_date,
      requested_type: data.requested_type,
      requested_time: data.requested_time,
      reason: data.reason,
      status: data.status,
      reviewed_by: data.reviewed_by,
      reviewed_at: data.reviewed_at,
      review_notes: data.review_notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    }
  }

  // ==========================================
  // 5. ATTENDANCE AUDIT LOGS
  // ==========================================

  static async logAttendanceAudit(params: {
    companyId: string
    actorId?: string | null
    actorName: string
    actionType: string
    locationId?: string | null
    employeeId?: string | null
    details: Record<string, any>
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<AttendanceAuditLogRecord> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(params.companyId)) || params.companyId
    const payload = {
      company_id: targetCompanyId,
      actor_id: sanitizeUuid(params.actorId),
      actor_name: params.actorName,
      action_type: params.actionType,
      location_id: sanitizeUuid(params.locationId),
      employee_id: sanitizeUuid(params.employeeId),
      details: params.details || {},
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date().toISOString(),
    }

    const { data, error } = await (admin as any)
      .from('attendance_audit_logs')
      .insert(payload)
      .select('*, attendance_locations(name), employees(name)')
      .single()

    if (error) {
      console.warn('[AttendanceRepository.logAttendanceAudit] Audit write warning:', error.message)
      return {
        id: `att-aud-${Date.now()}`,
        company_id: targetCompanyId,
        actor_id: sanitizeUuid(params.actorId),
        actor_name: params.actorName,
        action_type: params.actionType as any,
        location_id: sanitizeUuid(params.locationId),
        employee_id: sanitizeUuid(params.employeeId),
        details: params.details,
        created_at: new Date().toISOString(),
      }
    }

    return {
      id: data.id,
      company_id: data.company_id,
      actor_id: data.actor_id,
      actor_name: data.actor_name,
      action_type: data.action_type,
      location_id: data.location_id,
      location_name: data.attendance_locations?.name || null,
      employee_id: data.employee_id,
      employee_name: data.employees?.name || null,
      details: data.details,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      created_at: data.created_at,
    }
  }

  static async getAttendanceAuditLogs(
    companyId: string,
    limit = 50
  ): Promise<AttendanceAuditLogRecord[]> {
    const admin = createAdminClient()
    const targetCompanyId = (await resolveCompanyUuid(companyId)) || companyId
    const { data, error } = await (admin as any)
      .from('attendance_audit_logs')
      .select('*, attendance_locations(name), employees(name)')
      .eq('company_id', targetCompanyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[AttendanceRepository.getAttendanceAuditLogs] Error:', error.message)
      return []
    }

    return (data || []).map((l: any) => ({
      id: l.id,
      company_id: l.company_id,
      actor_id: l.actor_id,
      actor_name: l.actor_name,
      action_type: l.action_type,
      location_id: l.location_id,
      location_name: l.attendance_locations?.name || null,
      employee_id: l.employee_id,
      employee_name: l.employees?.name || null,
      details: l.details || {},
      ip_address: l.ip_address,
      user_agent: l.user_agent,
      created_at: l.created_at,
    }))
  }
}
