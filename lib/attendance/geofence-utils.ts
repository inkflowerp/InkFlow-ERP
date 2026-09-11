import crypto from 'crypto'
import type { AttendanceType } from '../../types/attendance.types.ts'

/**
 * Validates whether GPS coordinates and accuracy are within realistic physical bounds.
 */
export function validateCoordinates(
  lat: number,
  lng: number,
  accuracy?: number
): { valid: boolean; error?: string } {
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    isNaN(lat) ||
    isNaN(lng) ||
    !isFinite(lat) ||
    !isFinite(lng)
  ) {
    return { valid: false, error: 'Invalid coordinate numbers provided.' }
  }
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and +90 degrees.' }
  }
  if (lng < -180 || lng > 180) {
    return { valid: false, error: 'Longitude must be between -180 and +180 degrees.' }
  }
  if (lat === 0 && lng === 0) {
    return { valid: false, error: 'Coordinate (0, 0) is not a valid physical workplace location.' }
  }
  if (accuracy !== undefined) {
    if (
      typeof accuracy !== 'number' ||
      isNaN(accuracy) ||
      !isFinite(accuracy) ||
      accuracy < 0 ||
      accuracy > 20000
    ) {
      return { valid: false, error: 'Invalid GPS accuracy value.' }
    }
  }
  return { valid: true }
}

/**
 * Calculates distance between two WGS84 GPS coordinates using the Haversine formula.
 * Returns distance in meters (rounded to 1 decimal place).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!isFinite(lat1) || !isFinite(lon1) || !isFinite(lat2) || !isFinite(lon2)) return Infinity
  if (lat1 === lat2 && lon1 === lon2) return 0

  const R = 6371000 // Earth mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(Math.min(1, Math.max(0, a))), Math.sqrt(Math.max(0, 1 - a)))
  const distance = R * c

  return Math.round(distance * 10) / 10
}

/**
 * Generates a cryptographically secure random token and its SHA-256 hash.
 */
export function generateSecureQrToken(): {
  rawToken: string
  tokenHash: string
  tokenPrefix: string
} {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const tokenPrefix = `INK-LOC-${rawToken.substring(0, 8).toUpperCase()}`

  return { rawToken, tokenHash, tokenPrefix }
}

/**
 * Computes SHA-256 hash of a raw token string for database lookup.
 */
export function hashQrToken(rawToken: string): string {
  let clean = (rawToken || '').trim()
  if (clean.includes('qr=')) {
    const parts = clean.split('qr=')
    clean = parts[1].split('&')[0]
  } else if (clean.includes('t=')) {
    const parts = clean.split('t=')
    clean = parts[1].split('&')[0]
  } else if (clean.startsWith('INKFLOW:ATT:v1:')) {
    clean = clean.replace('INKFLOW:ATT:v1:', '')
  }

  return crypto.createHash('sha256').update(clean).digest('hex')
}

/**
 * Evaluates whether a user's punch GPS coordinates and accuracy satisfy a location geofence.
 */
export function evaluateGeofence(params: {
  userLat: number
  userLng: number
  userAccuracy: number
  locationLat: number
  locationLng: number
  radiusMeters: number
  maxAccuracyMeters: number
}): {
  isWithinRadius: boolean
  isAccuracyAcceptable: boolean
  distanceMeters: number
  reason?: string
} {
  const {
    userLat,
    userLng,
    userAccuracy,
    locationLat,
    locationLng,
    radiusMeters,
    maxAccuracyMeters,
  } = params

  const isAccuracyAcceptable = userAccuracy <= maxAccuracyMeters
  const distanceMeters = calculateHaversineDistance(userLat, userLng, locationLat, locationLng)
  const isWithinRadius = distanceMeters <= radiusMeters

  let reason: string | undefined = undefined
  if (!isAccuracyAcceptable) {
    reason = `GPS accuracy insufficient (±${Math.round(userAccuracy)}m > ±${maxAccuracyMeters}m)`
  } else if (!isWithinRadius) {
    reason = `Outside approved geofence (${Math.round(distanceMeters)}m > ${radiusMeters}m)`
  }

  return {
    isWithinRadius,
    isAccuracyAcceptable,
    distanceMeters,
    reason,
  }
}

/**
 * Pure state machine validator for punch transitions
 */
export function validateAttendanceTransition(
  existingPunches: Array<{ attendance_type: AttendanceType; checked_at: string }>,
  requestedType: AttendanceType
): {
  allowed: boolean
  code?: 'ALREADY_CHECKED_IN' | 'ALREADY_CHECKED_OUT' | 'NO_ACTIVE_CHECKIN' | 'DOUBLE_TAP'
  error?: string
} {
  const hasCheckedIn = existingPunches.some((p) => p.attendance_type === 'CHECK_IN')
  const hasCheckedOut = existingPunches.some((p) => p.attendance_type === 'CHECK_OUT')

  if (requestedType === 'CHECK_IN') {
    if (hasCheckedIn && !hasCheckedOut) {
      return {
        allowed: false,
        code: 'ALREADY_CHECKED_IN',
        error: 'You are already checked in for today.',
      }
    }
  } else if (requestedType === 'CHECK_OUT') {
    if (!hasCheckedIn) {
      return {
        allowed: false,
        code: 'NO_ACTIVE_CHECKIN',
        error: 'No active check-in found for today. Please check in first.',
      }
    }
    if (hasCheckedOut) {
      return {
        allowed: false,
        code: 'ALREADY_CHECKED_OUT',
        error: 'You have already checked out for today.',
      }
    }
  }

  return { allowed: true }
}
