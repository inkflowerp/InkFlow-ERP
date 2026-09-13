import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  MachineryStatus,
  BreakdownStatus,
  MaintenanceStatus,
} from '../../types/machinery.types'

/**
 * Pure State Machine Logic for Machinery Status Transitions
 */
export function validateStatusTransition(
  currentStatus: MachineryStatus,
  targetStatus: MachineryStatus
): {
  allowed: boolean
  error?: string
} {
  if (currentStatus === targetStatus) {
    return { allowed: true }
  }

  if (currentStatus === 'retired') {
    return {
      allowed: false,
      error: 'Retired machines cannot be returned to service without formal un-retire authorization.',
    }
  }

  // Define allowable state transitions
  const ALLOWED_TRANSITIONS: Record<MachineryStatus, MachineryStatus[]> = {
    available: ['in_use', 'scheduled', 'maintenance', 'breakdown', 'offline', 'retired'],
    in_use: ['available', 'scheduled', 'breakdown', 'maintenance', 'offline', 'retired'],
    scheduled: ['in_use', 'available', 'breakdown', 'maintenance', 'offline', 'retired'],
    maintenance: ['available', 'in_use', 'breakdown', 'offline', 'retired'],
    breakdown: ['maintenance', 'offline', 'retired', 'available'],
    offline: ['available', 'maintenance', 'breakdown', 'retired'],
    retired: [],
  }

  const validTargets = ALLOWED_TRANSITIONS[currentStatus] || []
  if (!validTargets.includes(targetStatus)) {
    return {
      allowed: false,
      error: `Cannot transition machinery directly from ${currentStatus} to ${targetStatus}.`,
    }
  }

  return { allowed: true }
}

/**
 * Downtime calculation in minutes
 */
export function calculateDowntimeMinutes(reportedAt: string, resolvedAt: string): number {
  const start = new Date(reportedAt).getTime()
  const end = new Date(resolvedAt).getTime()

  if (isNaN(start) || isNaN(end) || end < start) {
    return 0
  }

  return Math.round((end - start) / (1000 * 60))
}

describe('Machinery State Transitions & Downtime Engine Unit Tests', () => {
  test('Available machine transitions smoothly to In Use and back to Available', () => {
    const step1 = validateStatusTransition('available', 'in_use')
    assert.strictEqual(step1.allowed, true)

    const step2 = validateStatusTransition('in_use', 'available')
    assert.strictEqual(step2.allowed, true)
  })

  test('In Use machine transitions directly to Breakdown when emergency fault occurs', () => {
    const step = validateStatusTransition('in_use', 'breakdown')
    assert.strictEqual(step.allowed, true)
  })

  test('Retired machine cannot transition to any active state', () => {
    const step = validateStatusTransition('retired', 'available')
    assert.strictEqual(step.allowed, false)
    assert.ok(step.error?.includes('Retired machines cannot be returned'))
  })

  test('Downtime minutes accurately computed between report and resolution timestamps', () => {
    const reportedAt = '2026-09-14T08:00:00.000Z'
    const resolvedAt = '2026-09-14T11:45:00.000Z' // 3 hours 45 minutes = 225 minutes

    const downtime = calculateDowntimeMinutes(reportedAt, resolvedAt)
    assert.strictEqual(downtime, 225)
  })

  test('Downtime calculation handles same-minute resolution cleanly', () => {
    const reportedAt = '2026-09-14T10:00:00.000Z'
    const resolvedAt = '2026-09-14T10:00:00.000Z'

    const downtime = calculateDowntimeMinutes(reportedAt, resolvedAt)
    assert.strictEqual(downtime, 0)
  })

  test('Downtime calculation returns 0 for invalid or reverse dates', () => {
    const reportedAt = '2026-09-14T12:00:00.000Z'
    const resolvedAt = '2026-09-14T08:00:00.000Z'

    const downtime = calculateDowntimeMinutes(reportedAt, resolvedAt)
    assert.strictEqual(downtime, 0)
  })
})
