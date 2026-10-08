import type { AttendanceDailySummaryRecord } from '@/types/workforce.types'

/**
 * Parses time string (e.g., '09:30', '18:45:00', '09:30 AM', '6:30 PM') into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const clean = timeStr.trim()
  if (!clean) return null

  // Check 12-hour AM/PM format
  if (/am|pm/i.test(clean)) {
    const match = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)$/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const minutes = parseInt(match[2], 10)
      const meridiem = match[3].toLowerCase()
      if (meridiem === 'pm' && hours < 12) hours += 12
      if (meridiem === 'am' && hours === 12) hours = 0
      return hours * 60 + minutes
    }
  }

  // 24-hour HH:MM or HH:MM:SS format
  const parts = clean.split(':')
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10)
    const minutes = parseInt(parts[1], 10)
    if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours <= 24 && minutes >= 0 && minutes < 60) {
      return hours * 60 + minutes
    }
  }

  return null
}

/**
 * Converts minutes from midnight back to 12-hour formatted time (e.g., '09:15 AM', '06:30 PM')
 */
export function formatMinutesToTime(minutes: number): string {
  const norm = ((Math.round(minutes) % 1440) + 1440) % 1440
  const h = Math.floor(norm / 60)
  const m = norm % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 === 0 ? 12 : h % 12
  const displayM = m < 10 ? `0${m}` : `${m}`
  return `${displayH}:${displayM} ${ampm}`
}

/**
 * Calculates average time from a list of time strings.
 */
export function calculateAverageTime(times: (string | null | undefined)[]): string | null {
  const validMinutes: number[] = []
  for (const t of times) {
    const m = parseTimeToMinutes(t)
    if (m !== null) validMinutes.push(m)
  }

  if (validMinutes.length === 0) return null
  const avg = Math.round(validMinutes.reduce((sum, val) => sum + val, 0) / validMinutes.length)
  return formatMinutesToTime(avg)
}

/**
 * Formats duration in minutes into a human-readable duration (e.g., '8h 24m')
 */
export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

export interface AttendanceAnalyticsSummary {
  totalRecords: number
  presentCount: number
  lateCount: number
  absentCount: number
  leaveCount: number
  fieldWorkCount: number
  currentlyWorkingCount: number
  avgCheckInTime: string
  avgCheckOutTime: string
  avgWorkedMinutes: number
  avgWorkedFormatted: string
  totalOvertimeMinutes: number
  attendanceRate: number
  onTimeRate: number
}

/**
 * Computes comprehensive attendance analytics from an array of summary records.
 */
export function computeAttendanceAnalytics(
  records: AttendanceDailySummaryRecord[],
  totalActiveStaff?: number
): AttendanceAnalyticsSummary {
  let presentCount = 0
  let lateCount = 0
  let absentCount = 0
  let leaveCount = 0
  let fieldWorkCount = 0
  let currentlyWorkingCount = 0
  let totalWorkedMinutes = 0
  let workedCount = 0
  let totalOtMinutes = 0

  const checkInTimes: string[] = []
  const checkOutTimes: string[] = []

  for (const rec of records) {
    if (rec.status === 'present' || rec.status === 'half_day') {
      presentCount++
    }
    if (rec.status === 'late' || (rec.late_minutes && rec.late_minutes > 0)) {
      lateCount++
    }
    if (rec.status === 'absent') {
      absentCount++
    }
    if (rec.status === 'leave') {
      leaveCount++
    }
    if (rec.status === 'field_work') {
      fieldWorkCount++
    }

    if (rec.check_in_time) {
      checkInTimes.push(rec.check_in_time)
      if (!rec.check_out_time) {
        currentlyWorkingCount++
      }
    }

    if (rec.check_out_time) {
      checkOutTimes.push(rec.check_out_time)
    }

    if (rec.worked_minutes && rec.worked_minutes > 0) {
      totalWorkedMinutes += rec.worked_minutes
      workedCount++
    } else if (rec.check_in_time && rec.check_out_time) {
      const inM = parseTimeToMinutes(rec.check_in_time)
      const outM = parseTimeToMinutes(rec.check_out_time)
      if (inM !== null && outM !== null && outM > inM) {
        const diff = outM - inM
        totalWorkedMinutes += diff
        workedCount++
      }
    }

    if (rec.approved_ot_minutes) {
      totalOtMinutes += rec.approved_ot_minutes
    } else if (rec.potential_ot_minutes) {
      totalOtMinutes += rec.potential_ot_minutes
    }
  }

  const avgCheckInTime = calculateAverageTime(checkInTimes) || '—'
  const avgCheckOutTime = calculateAverageTime(checkOutTimes) || '—'
  const avgWorkedMinutes = workedCount > 0 ? Math.round(totalWorkedMinutes / workedCount) : 0
  const avgWorkedFormatted = workedCount > 0 ? formatMinutesToDuration(avgWorkedMinutes) : '—'

  const totalBase = totalActiveStaff || (presentCount + lateCount + absentCount + leaveCount + fieldWorkCount)
  const attendanceRate = totalBase > 0 ? Math.round(((presentCount + lateCount + fieldWorkCount) / totalBase) * 100) : 0
  const attendedTotal = presentCount + lateCount + fieldWorkCount
  const onTimeRate = attendedTotal > 0 ? Math.round(((attendedTotal - lateCount) / attendedTotal) * 100) : 100

  return {
    totalRecords: records.length,
    presentCount,
    lateCount,
    absentCount,
    leaveCount,
    fieldWorkCount,
    currentlyWorkingCount,
    avgCheckInTime,
    avgCheckOutTime,
    avgWorkedMinutes,
    avgWorkedFormatted,
    totalOvertimeMinutes: totalOtMinutes,
    attendanceRate,
    onTimeRate,
  }
}
