import { test, describe } from 'node:test'
import assert from 'node:assert'
import type {
  Machinery,
  MachineryAssignment,
  MachineryStatus,
} from '../../types/machinery.types'

/**
 * Pure Machinery Conflict Detection Engine for testing
 */
export function checkMachineryConflict(params: {
  machine: Pick<Machinery, 'id' | 'name' | 'code' | 'status' | 'is_archived'>
  existingAssignments: Pick<MachineryAssignment, 'id' | 'machine_id' | 'scheduled_start' | 'scheduled_end' | 'status'>[]
  scheduledStart: string
  scheduledEnd: string
  ignoreAssignmentId?: string
}): {
  hasConflict: boolean
  reason?: string
  conflictingAssignment?: Pick<MachineryAssignment, 'id' | 'scheduled_start' | 'scheduled_end' | 'status'>
} {
  const { machine, existingAssignments, scheduledStart, scheduledEnd, ignoreAssignmentId } = params

  if (machine.is_archived) {
    return {
      hasConflict: true,
      reason: `Machinery ${machine.name} (${machine.code}) is archived and cannot receive new assignments.`,
    }
  }

  if (machine.status === 'breakdown') {
    return {
      hasConflict: true,
      reason: `Machinery ${machine.name} (${machine.code}) is currently in Breakdown status and under repair.`,
    }
  }

  if (machine.status === 'maintenance') {
    return {
      hasConflict: true,
      reason: `Machinery ${machine.name} (${machine.code}) is currently undergoing scheduled maintenance.`,
    }
  }

  if (machine.status === 'retired' || machine.status === 'offline') {
    return {
      hasConflict: true,
      reason: `Machinery ${machine.name} (${machine.code}) is ${machine.status} and unavailable for production.`,
    }
  }

  const reqStart = new Date(scheduledStart).getTime()
  const reqEnd = new Date(scheduledEnd).getTime()

  if (isNaN(reqStart) || isNaN(reqEnd) || reqStart >= reqEnd) {
    return {
      hasConflict: true,
      reason: 'Invalid schedule window: start time must precede end time.',
    }
  }

  for (const existing of existingAssignments) {
    if (ignoreAssignmentId && existing.id === ignoreAssignmentId) {
      continue
    }

    if (existing.status === 'cancelled' || existing.status === 'completed') {
      continue
    }

    const exStart = new Date(existing.scheduled_start).getTime()
    const exEnd = new Date(existing.scheduled_end).getTime()

    // Conflict exists if reqStart < exEnd AND reqEnd > exStart
    if (reqStart < exEnd && reqEnd > exStart) {
      return {
        hasConflict: true,
        reason: `Schedule conflict: Machine is already reserved from ${existing.scheduled_start} to ${existing.scheduled_end}.`,
        conflictingAssignment: existing,
      }
    }
  }

  return { hasConflict: false }
}

describe('Machinery Assignment Conflict Detection Engine Unit Tests', () => {
  const baseMachine: Pick<Machinery, 'id' | 'name' | 'code' | 'status' | 'is_archived'> = {
    id: 'mach-001',
    name: 'Flora Solvent 3.2m',
    code: 'FLORA-01',
    status: 'available',
    is_archived: false,
  }

  const activeAssignments: Pick<MachineryAssignment, 'id' | 'machine_id' | 'scheduled_start' | 'scheduled_end' | 'status'>[] = [
    {
      id: 'asg-101',
      machine_id: 'mach-001',
      scheduled_start: '2026-09-15T10:00:00Z',
      scheduled_end: '2026-09-15T14:00:00Z',
      status: 'scheduled',
    },
    {
      id: 'asg-102',
      machine_id: 'mach-001',
      scheduled_start: '2026-09-15T16:00:00Z',
      scheduled_end: '2026-09-15T18:00:00Z',
      status: 'scheduled',
    },
    {
      id: 'asg-103',
      machine_id: 'mach-001',
      scheduled_start: '2026-09-15T10:00:00Z',
      scheduled_end: '2026-09-15T14:00:00Z',
      status: 'cancelled', // Cancelled should never cause conflict
    },
  ]

  test('Non-overlapping window (before existing start) passes without conflict', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: activeAssignments,
      scheduledStart: '2026-09-15T08:00:00Z',
      scheduledEnd: '2026-09-15T09:30:00Z',
    })

    assert.strictEqual(result.hasConflict, false)
  })

  test('Non-overlapping window (between two existing slots) passes without conflict', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: activeAssignments,
      scheduledStart: '2026-09-15T14:15:00Z',
      scheduledEnd: '2026-09-15T15:45:00Z',
    })

    assert.strictEqual(result.hasConflict, false)
  })

  test('Overlapping window (partial overlap at start) fails conflict check', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: activeAssignments,
      scheduledStart: '2026-09-15T09:00:00Z',
      scheduledEnd: '2026-09-15T11:00:00Z',
    })

    assert.strictEqual(result.hasConflict, true)
    assert.strictEqual(result.conflictingAssignment?.id, 'asg-101')
    assert.ok(result.reason?.includes('Schedule conflict'))
  })

  test('Overlapping window (inside existing slot) fails conflict check', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: activeAssignments,
      scheduledStart: '2026-09-15T11:00:00Z',
      scheduledEnd: '2026-09-15T13:00:00Z',
    })

    assert.strictEqual(result.hasConflict, true)
    assert.strictEqual(result.conflictingAssignment?.id, 'asg-101')
  })

  test('Overlapping window with a cancelled job is ignored and allowed', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: [
        {
          id: 'asg-103',
          machine_id: 'mach-001',
          scheduled_start: '2026-09-15T10:00:00Z',
          scheduled_end: '2026-09-15T14:00:00Z',
          status: 'cancelled',
        },
      ],
      scheduledStart: '2026-09-15T10:30:00Z',
      scheduledEnd: '2026-09-15T13:30:00Z',
    })

    assert.strictEqual(result.hasConflict, false)
  })

  test('Editing existing assignment ignores itself during overlap check', () => {
    const result = checkMachineryConflict({
      machine: baseMachine,
      existingAssignments: activeAssignments,
      scheduledStart: '2026-09-15T10:00:00Z',
      scheduledEnd: '2026-09-15T14:30:00Z', // modified end time of asg-101
      ignoreAssignmentId: 'asg-101',
    })

    assert.strictEqual(result.hasConflict, false)
  })

  test('Machine in Breakdown status immediately blocks new assignment', () => {
    const brokenMachine = { ...baseMachine, status: 'breakdown' as MachineryStatus }
    const result = checkMachineryConflict({
      machine: brokenMachine,
      existingAssignments: [],
      scheduledStart: '2026-09-15T10:00:00Z',
      scheduledEnd: '2026-09-15T12:00:00Z',
    })

    assert.strictEqual(result.hasConflict, true)
    assert.ok(result.reason?.includes('Breakdown status'))
  })

  test('Machine in Maintenance status immediately blocks new assignment', () => {
    const maintMachine = { ...baseMachine, status: 'maintenance' as MachineryStatus }
    const result = checkMachineryConflict({
      machine: maintMachine,
      existingAssignments: [],
      scheduledStart: '2026-09-15T10:00:00Z',
      scheduledEnd: '2026-09-15T12:00:00Z',
    })

    assert.strictEqual(result.hasConflict, true)
    assert.ok(result.reason?.includes('scheduled maintenance'))
  })

  test('Machine in Retired status immediately blocks new assignment', () => {
    const retiredMachine = { ...baseMachine, status: 'retired' as MachineryStatus }
    const result = checkMachineryConflict({
      machine: retiredMachine,
      existingAssignments: [],
      scheduledStart: '2026-09-15T10:00:00Z',
      scheduledEnd: '2026-09-15T12:00:00Z',
    })

    assert.strictEqual(result.hasConflict, true)
    assert.ok(result.reason?.includes('retired'))
  })
})
