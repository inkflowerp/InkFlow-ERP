import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import {
  calculateHaversineDistance,
  evaluateGeofence,
  validateCoordinates,
  generateSecureQrToken,
  hashQrToken,
  validateAttendanceTransition,
} from '../../lib/attendance/geofence-utils.ts'
import { WorkforceService } from '../../services/workforce.service.ts'
import { WorkforceRepository } from '../../lib/repositories/workforce.repository.ts'
import { PrintFlowDataStore } from '../../lib/db/data-store.ts'
import { STORAGE_KEYS } from '../../lib/db/storage-keys.ts'
import type { EmployeeRecord } from '../../types/workforce.types.ts'

describe('Owner Employee Management & Attendance Punch Tests', () => {
  const testCompanyId = 'comp-test-punch-dept-01'

  it('1. jsQR decodes QR image frames accurately', async () => {
    const rawPayload = 'PRINTFLOW:ATT:v1:7f9a8b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a'
    
    // Generate QR code data buffer
    const qrPngBuffer = await QRCode.toBuffer(rawPayload, {
      width: 256,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    })

    // Use sharp to get raw pixel RGBA data
    const sharp = (await import('sharp')).default
    const { data, info } = await sharp(qrPngBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height)
    assert.ok(decoded, 'jsQR should successfully decode the generated QR buffer')
    assert.equal(decoded.data, rawPayload, 'Decoded text must match raw payload exactly')
  })

  it('2. Geofence evaluation calculates accurate distance and generates clear message', () => {
    const officeLat = 23.7314
    const officeLng = 90.4182
    const radiusMeters = 80
    const maxAccuracy = 50

    // User is 35m away with 10m accuracy (Within geofence)
    const userLatInside = 23.7317
    const userLngInside = 90.4182
    const resInside = evaluateGeofence({
      userLat: userLatInside,
      userLng: userLngInside,
      userAccuracy: 10,
      locationLat: officeLat,
      locationLng: officeLng,
      radiusMeters,
      maxAccuracyMeters: maxAccuracy,
    })

    assert.equal(resInside.isWithinRadius, true)
    assert.equal(resInside.isAccuracyAcceptable, true)
    assert.equal(resInside.reason, undefined)

    // User is 180m away (Outside geofence)
    const userLatOutside = 23.7330
    const userLngOutside = 90.4182
    const resOutside = evaluateGeofence({
      userLat: userLatOutside,
      userLng: userLngOutside,
      userAccuracy: 15,
      locationLat: officeLat,
      locationLng: officeLng,
      radiusMeters,
      maxAccuracyMeters: maxAccuracy,
    })

    assert.equal(resOutside.isWithinRadius, false)
    assert.ok(resOutside.reason?.includes('Outside approved geofence'))
    assert.ok(resOutside.reason?.includes('80m'))

    // Insufficient GPS accuracy (e.g. ±85m > ±50m)
    const resInaccurate = evaluateGeofence({
      userLat: userLatInside,
      userLng: userLngInside,
      userAccuracy: 85,
      locationLat: officeLat,
      locationLng: officeLng,
      radiusMeters,
      maxAccuracyMeters: maxAccuracy,
    })

    assert.equal(resInaccurate.isAccuracyAcceptable, false)
    assert.ok(resInaccurate.reason?.includes('GPS accuracy insufficient'))
  })

  it('3. Attendance state machine enforces Check-In before Check-Out and prevents double-check-in', () => {
    // 1. Initial state (no punches today)
    const punches: Array<{ attendance_type: 'CHECK_IN' | 'CHECK_OUT'; checked_at: string }> = []

    // Trying Check-Out before Check-In fails
    const outBeforeIn = validateAttendanceTransition(punches, 'CHECK_OUT')
    assert.equal(outBeforeIn.allowed, false)
    assert.equal(outBeforeIn.code, 'NO_ACTIVE_CHECKIN')

    // First Check-In succeeds
    const firstCheckIn = validateAttendanceTransition(punches, 'CHECK_IN')
    assert.equal(firstCheckIn.allowed, true)

    // After Check-In:
    punches.push({ attendance_type: 'CHECK_IN', checked_at: new Date().toISOString() })

    // Duplicate Check-In fails
    const duplicateCheckIn = validateAttendanceTransition(punches, 'CHECK_IN')
    assert.equal(duplicateCheckIn.allowed, false)
    assert.equal(duplicateCheckIn.code, 'ALREADY_CHECKED_IN')

    // Check-Out succeeds
    const checkOut = validateAttendanceTransition(punches, 'CHECK_OUT')
    assert.equal(checkOut.allowed, true)

    // After Check-Out:
    punches.push({ attendance_type: 'CHECK_OUT', checked_at: new Date().toISOString() })

    // Second Check-Out fails
    const secondCheckOut = validateAttendanceTransition(punches, 'CHECK_OUT')
    assert.equal(secondCheckOut.allowed, false)
    assert.equal(secondCheckOut.code, 'ALREADY_CHECKED_OUT')
  })

  it('4. Owner can deactivate employee (status = terminated) and reactivate (status = active)', async () => {
    const empId = `emp-test-${Date.now()}`
    const empRecord: EmployeeRecord = {
      id: empId,
      company_id: testCompanyId,
      employee_id_number: 'EMP-9901',
      name: 'Shahidul Alam',
      name_bn: 'শহিদুল আলম',
      mobile: '+8801700999001',
      role: 'Staff',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      base_salary: 25000,
      current_advance_balance: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Save initial employee
    await WorkforceRepository.createEmployee(empRecord)

    // Deactivate employee
    const deactivated = await WorkforceService.updateEmployee(
      empId,
      testCompanyId,
      { status: 'terminated' },
      'user-owner-1',
      'Shahidur Rahman'
    )
    assert.ok(deactivated)
    assert.equal(deactivated.status, 'terminated')

    // Verify persisted status in repository
    const fetchedDeactivated = await WorkforceRepository.getEmployeeById(empId, testCompanyId)
    assert.equal(fetchedDeactivated?.status, 'terminated')

    // Reactivate employee
    const reactivated = await WorkforceService.updateEmployee(
      empId,
      testCompanyId,
      { status: 'active' },
      'user-owner-1',
      'Shahidur Rahman'
    )
    assert.ok(reactivated)
    assert.equal(reactivated.status, 'active')

    const fetchedActive = await WorkforceRepository.getEmployeeById(empId, testCompanyId)
    assert.equal(fetchedActive?.status, 'active')
  })

  it('5. Owner can permanently delete employee record', async () => {
    const empId = `emp-del-${Date.now()}`
    const empRecord: EmployeeRecord = {
      id: empId,
      company_id: testCompanyId,
      employee_id_number: 'EMP-9902',
      name: 'Temporary Staff',
      mobile: '+8801700999002',
      role: 'Staff',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      base_salary: 20000,
      current_advance_balance: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    await WorkforceRepository.createEmployee(empRecord)
    const existsBefore = await WorkforceRepository.getEmployeeById(empId, testCompanyId)
    assert.ok(existsBefore)

    // Delete employee
    const deleteResult = await WorkforceService.deleteEmployee(
      empId,
      testCompanyId,
      'user-owner-1',
      'Shahidur Rahman'
    )
    assert.equal(deleteResult, true)

    // Verify employee no longer exists
    const existsAfter = await WorkforceRepository.getEmployeeById(empId, testCompanyId)
    assert.equal(existsAfter, null)
  })
})
