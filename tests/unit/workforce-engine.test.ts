import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceService } from '../../services/workforce.service.ts'
import type { ShiftRecord } from '../../types/hr.types.ts'

describe('Workforce Engine Unit Tests (V6)', () => {
  const sampleDayShift: ShiftRecord = {
    id: 'shf-day-01',
    company_id: 'co-test-v6',
    shift_code: 'SHF-DAY',
    shift_name: 'Regular Day Shift',
    start_time: '09:00',
    end_time: '18:00',
    is_overnight: false,
    grace_period_minutes: 15,
    break_duration_minutes: 60,
    working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
    overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const sampleNightShift: ShiftRecord = {
    id: 'shf-night-01',
    company_id: 'co-test-v6',
    shift_code: 'SHF-NIGHT',
    shift_name: 'Overnight Production Shift',
    start_time: '22:00',
    end_time: '06:00',
    is_overnight: true,
    grace_period_minutes: 15,
    break_duration_minutes: 60,
    working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
    overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  test('calculates standard day shift duration correctly excluding break duration', () => {
    // 09:00 to 18:00 = 9 hours. Minus 60 mins break = 8 hours.
    const duration = WorkforceService.calculateShiftDurationHours(sampleDayShift)
    assert.strictEqual(duration, 8)
  })

  test('calculates overnight shift duration correctly wrapping across midnight', () => {
    // 22:00 to 06:00 = 8 hours. Minus 60 mins break = 7 hours.
    const duration = WorkforceService.calculateShiftDurationHours(sampleNightShift)
    assert.strictEqual(duration, 7)
  })

  test('computes overtime accurately based on shift duration and multiplier', () => {
    // Employee starts at 09:00 and finishes at 20:00 (11 hours worked).
    // Planned shift: 8 hours net. Overtime = 3 hours.
    const checkIn = '2026-09-14T09:00:00.000Z'
    const checkOut = '2026-09-14T20:00:00.000Z'
    const hourlyRate = 150

    const ot = WorkforceService.calculateOvertime({
      checkInTime: checkIn,
      checkOutTime: checkOut,
      shift: sampleDayShift,
      hourlyRate,
      multiplier: 1.5,
    })

    assert.strictEqual(ot.workedHours, 11)
    assert.strictEqual(ot.overtimeMinutes, 180)
    assert.strictEqual(ot.overtimeHours, 3)
    assert.strictEqual(ot.overtimeAmount, 675)
  })

  test('ignores overtime if below minimum threshold minutes', () => {
    const checkIn = '2026-09-14T09:00:00.000Z'
    const checkOut = '2026-09-14T17:15:00.000Z'

    const ot = WorkforceService.calculateOvertime({
      checkInTime: checkIn,
      checkOutTime: checkOut,
      shift: sampleDayShift,
      hourlyRate: 150,
    })

    assert.strictEqual(ot.overtimeMinutes, 0)
    assert.strictEqual(ot.overtimeAmount, 0)
  })
})
