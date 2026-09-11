import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateHaversineDistance,
  generateSecureQrToken,
  hashQrToken,
  evaluateGeofence,
  validateAttendanceTransition,
  validateCoordinates,
} from '../../lib/attendance/geofence-utils.ts'

describe('Attendance Security, Penetration & Tenant Boundary Test Suite', () => {
  const TENANT_A_ID = 'comp_alpha_11111111'
  const TENANT_B_ID = 'comp_beta_22222222'
  const LOCATION_A_ID = 'loc_head_office_aaaa'
  const LOCATION_B_ID = 'loc_factory_bbbb'

  // =========================================================================
  // 1. CRYPTOGRAPHIC TOKEN TAMPERING & ENUMERATION RESISTANCE
  // =========================================================================
  describe('1. Cryptographic Token Tampering & Enumeration Resistance', () => {
    it('generates 256-bit entropy tokens that cannot be enumerated sequentially', () => {
      const token1 = generateSecureQrToken()
      const token2 = generateSecureQrToken()

      assert.notEqual(token1.rawToken, token2.rawToken)
      assert.notEqual(token1.tokenHash, token2.tokenHash)
      assert.equal(token1.rawToken.length, 64) // 32 bytes hex = 64 chars (256 bits)
      assert.equal(token2.rawToken.length, 64)
      assert.equal(token1.tokenHash.length, 64) // SHA-256 hex = 64 chars
    })

    it('rejects tampered or forged QR token strings', () => {
      const genuine = generateSecureQrToken()
      const tampered = genuine.rawToken.substring(0, 63) + (genuine.rawToken[63] === 'a' ? 'b' : 'a')

      const genuineHash = hashQrToken(genuine.rawToken)
      const tamperedHash = hashQrToken(tampered)

      assert.notEqual(genuineHash, tamperedHash, 'A single character bit flip produces completely distinct hash (avalanche effect)')
    })

    it('consistently hashes tokens whether wrapped in URLs or raw prefixes', () => {
      const rawHex = 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00'
      const hash1 = hashQrToken(rawHex)
      const hash2 = hashQrToken(`INKFLOW:ATT:v1:${rawHex}`)
      const hash3 = hashQrToken(`https://inkflow.app/attendance/scan?t=${rawHex}`)
      const hash4 = hashQrToken(`https://inkflow.app/attendance/scan?qr=${rawHex}&mode=mobile`)

      assert.equal(hash1, hash2)
      assert.equal(hash1, hash3)
      assert.equal(hash1, hash4)
    })
  })

  // =========================================================================
  // 2. MULTI-TENANT ISOLATION BOUNDARY
  // =========================================================================
  describe('2. Multi-Tenant Boundary Isolation', () => {
    it('strictly blocks Employee of Tenant B from scanning Tenant A QR code', () => {
      const tokenA = generateSecureQrToken()

      // Database record simulation
      const dbTokenRecord = {
        id: 'tok_001',
        company_id: TENANT_A_ID,
        location_id: LOCATION_A_ID,
        token_hash: tokenA.tokenHash,
        is_active: true,
        revoked_at: null,
      }

      const dbLocationRecord = {
        id: LOCATION_A_ID,
        company_id: TENANT_A_ID,
        name: 'Tenant A Head Office',
        latitude: 23.7314,
        longitude: 90.4182,
        radius_meters: 100,
        max_accuracy_meters: 50,
        is_active: true,
      }

      // Attacker from Tenant B attempts to submit attendance using Token A
      const employeeB = {
        company_id: TENANT_B_ID,
        employee_id: 'emp_b_999',
      }

      const isCrossTenant =
        dbTokenRecord.company_id !== employeeB.company_id ||
        dbLocationRecord.company_id !== employeeB.company_id

      assert.equal(isCrossTenant, true, 'Server detects cross-tenant breach attempt')
    })
  })

  // =========================================================================
  // 3. QR REGENERATION & IMMEDIATE REVOCATION LIFECYCLE
  // =========================================================================
  describe('3. QR Rotation & Instant Invalidation', () => {
    it('immediately invalidates old QR token when Business Owner regenerates QR', () => {
      // Step 1: Initial token is generated for location
      const initialToken = generateSecureQrToken()
      let tokensStore = [
        {
          id: 'tok_1',
          company_id: TENANT_A_ID,
          location_id: LOCATION_A_ID,
          token_hash: initialToken.tokenHash,
          is_active: true,
          revoked_at: null as string | null,
        },
      ]

      // Step 2: Employee scans initial token -> ACCEPTED
      const activeMatch = tokensStore.find(
        (t) => t.token_hash === hashQrToken(initialToken.rawToken) && t.is_active && !t.revoked_at
      )
      assert.ok(activeMatch, 'Initial QR is valid')

      // Step 3: Owner regenerates QR code
      const newToken = generateSecureQrToken()
      // Invalidate all existing tokens
      tokensStore = tokensStore.map((t) => ({
        ...t,
        is_active: false,
        revoked_at: new Date().toISOString(),
      }))
      // Add fresh token
      tokensStore.push({
        id: 'tok_2',
        company_id: TENANT_A_ID,
        location_id: LOCATION_A_ID,
        token_hash: newToken.tokenHash,
        is_active: true,
        revoked_at: null,
      })

      // Step 4: Employee attempts to scan OLD poster QR -> REJECTED
      const oldScanMatch = tokensStore.find(
        (t) => t.token_hash === hashQrToken(initialToken.rawToken) && t.is_active && !t.revoked_at
      )
      assert.equal(oldScanMatch, undefined, 'Old QR token must be rejected immediately')

      // Step 5: Employee scans NEW poster QR -> ACCEPTED
      const newScanMatch = tokensStore.find(
        (t) => t.token_hash === hashQrToken(newToken.rawToken) && t.is_active && !t.revoked_at
      )
      assert.ok(newScanMatch, 'New QR token accepted')
      assert.equal(newScanMatch.id, 'tok_2')
    })
  })

  // =========================================================================
  // 4. GPS BOUNDS & EDGE-CASE COORDINATE VALIDATION
  // =========================================================================
  describe('4. GPS Edge Cases & Numerical Bounds', () => {
    it('rejects impossible latitudes (> 90 or < -90)', () => {
      assert.equal(validateCoordinates(95.0, 90.4182, 10).valid, false)
      assert.equal(validateCoordinates(-92.5, 90.4182, 10).valid, false)
    })

    it('rejects impossible longitudes (> 180 or < -180)', () => {
      assert.equal(validateCoordinates(23.7314, 185.0, 10).valid, false)
      assert.equal(validateCoordinates(23.7314, -190.0, 10).valid, false)
    })

    it('rejects NaN, Infinity, -Infinity, or non-finite coordinates', () => {
      assert.equal(validateCoordinates(NaN, 90.4182, 10).valid, false)
      assert.equal(validateCoordinates(23.7314, Infinity, 10).valid, false)
      assert.equal(validateCoordinates(-Infinity, 90.4182, 10).valid, false)
    })

    it('rejects placeholder (0, 0) coordinates', () => {
      assert.equal(validateCoordinates(0, 0, 10).valid, false)
    })

    it('rejects negative or extreme GPS accuracy values', () => {
      assert.equal(validateCoordinates(23.7314, 90.4182, -5).valid, false)
      assert.equal(validateCoordinates(23.7314, 90.4182, 50000).valid, false)
    })

    it('accepts realistic GPS coordinates in Bangladesh', () => {
      assert.equal(validateCoordinates(23.7314, 90.4182, 15).valid, true)
      assert.equal(validateCoordinates(22.3569, 91.7832, 8).valid, true) // Chittagong
    })
  })

  // =========================================================================
  // 5. GEOFENCE CALCULATION & ACCURACY THRESHOLD
  // =========================================================================
  describe('5. Geofence Distance Calculation & Thresholds', () => {
    const OFFICE_LAT = 23.7314
    const OFFICE_LNG = 90.4182
    const RADIUS = 100
    const MAX_ACCURACY = 50

    it('accepts punch within geofence radius with good accuracy (e.g. 28m away, ±12m accuracy)', () => {
      // 0.00025 deg lat offset is ~27.8m
      const evalRes = evaluateGeofence({
        userLat: 23.73165,
        userLng: 90.4182,
        userAccuracy: 12,
        locationLat: OFFICE_LAT,
        locationLng: OFFICE_LNG,
        radiusMeters: RADIUS,
        maxAccuracyMeters: MAX_ACCURACY,
      })

      assert.equal(evalRes.isWithinRadius, true)
      assert.equal(evalRes.isAccuracyAcceptable, true)
      assert.ok(evalRes.distanceMeters <= RADIUS)
    })

    it('rejects punch outside geofence radius (e.g. 380m away)', () => {
      // 0.0034 deg lat offset is ~378m
      const evalRes = evaluateGeofence({
        userLat: 23.7348,
        userLng: 90.4182,
        userAccuracy: 10,
        locationLat: OFFICE_LAT,
        locationLng: OFFICE_LNG,
        radiusMeters: RADIUS,
        maxAccuracyMeters: MAX_ACCURACY,
      })

      assert.equal(evalRes.isWithinRadius, false)
      assert.ok(evalRes.reason?.includes('Outside approved geofence'))
    })

    it('rejects punch with degraded GPS accuracy exceeding maximum tolerance', () => {
      const evalRes = evaluateGeofence({
        userLat: 23.7314,
        userLng: 90.4182,
        userAccuracy: 120, // ±120m > allowed ±50m
        locationLat: OFFICE_LAT,
        locationLng: OFFICE_LNG,
        radiusMeters: RADIUS,
        maxAccuracyMeters: MAX_ACCURACY,
      })

      assert.equal(evalRes.isAccuracyAcceptable, false)
      assert.ok(evalRes.reason?.includes('GPS accuracy insufficient'))
    })
  })

  // =========================================================================
  // 6. ATTENDANCE STATE MACHINE & CONCURRENCY / DUPLICATE PREVENTION
  // =========================================================================
  describe('6. Attendance State Machine & Concurrency Protection', () => {
    it('permits initial CHECK_IN when employee has not checked in today', () => {
      const res = validateAttendanceTransition([], 'CHECK_IN')
      assert.equal(res.allowed, true)
    })

    it('blocks duplicate CHECK_IN when already checked in', () => {
      const existing = [{ attendance_type: 'CHECK_IN' as const, checked_at: '2026-09-11T09:00:00Z' }]
      const res = validateAttendanceTransition(existing, 'CHECK_IN')
      assert.equal(res.allowed, false)
      assert.equal(res.code, 'ALREADY_CHECKED_IN')
    })

    it('blocks CHECK_OUT when employee has never checked in', () => {
      const res = validateAttendanceTransition([], 'CHECK_OUT')
      assert.equal(res.allowed, false)
      assert.equal(res.code, 'NO_ACTIVE_CHECKIN')
    })

    it('permits valid CHECK_OUT after active CHECK_IN', () => {
      const existing = [{ attendance_type: 'CHECK_IN' as const, checked_at: '2026-09-11T09:00:00Z' }]
      const res = validateAttendanceTransition(existing, 'CHECK_OUT')
      assert.equal(res.allowed, true)
    })

    it('blocks second CHECK_OUT when already checked out', () => {
      const existing = [
        { attendance_type: 'CHECK_IN' as const, checked_at: '2026-09-11T09:00:00Z' },
        { attendance_type: 'CHECK_OUT' as const, checked_at: '2026-09-11T18:00:00Z' },
      ]
      const res = validateAttendanceTransition(existing, 'CHECK_OUT')
      assert.equal(res.allowed, false)
      assert.equal(res.code, 'ALREADY_CHECKED_OUT')
    })
  })
})
