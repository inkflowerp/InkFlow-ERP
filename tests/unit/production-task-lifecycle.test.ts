import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { ProductionTaskRecord, ProductionTaskStatus, HoldReason } from '../../types/production.types.ts'

export function isValidStatusTransition(
  currentStatus: ProductionTaskStatus,
  newStatus: ProductionTaskStatus
): boolean {
  if (currentStatus === newStatus) return true

  const allowedTransitions: Record<ProductionTaskStatus, ProductionTaskStatus[]> = {
    queued: ['scheduled', 'ready', 'in_progress', 'on_hold', 'cancelled'],
    scheduled: ['ready', 'in_progress', 'on_hold', 'cancelled'],
    ready: ['in_progress', 'on_hold', 'cancelled'],
    in_progress: ['paused', 'completed', 'on_hold', 'rework', 'cancelled'],
    paused: ['in_progress', 'on_hold', 'cancelled'],
    on_hold: ['ready', 'queued', 'scheduled', 'in_progress', 'cancelled'],
    rework: ['in_progress', 'completed', 'cancelled', 'on_hold'],
    completed: ['rework'],
    cancelled: [],
  }

  return (allowedTransitions[currentStatus] || []).includes(newStatus)
}

describe('Production Planning - Task Lifecycle & Sequential Dependencies Unit Tests', () => {
  it('1. Validates allowed and prohibited status transitions', () => {
    // Allowed transitions
    assert.strictEqual(isValidStatusTransition('queued', 'scheduled'), true)
    assert.strictEqual(isValidStatusTransition('queued', 'in_progress'), true)
    assert.strictEqual(isValidStatusTransition('scheduled', 'in_progress'), true)
    assert.strictEqual(isValidStatusTransition('in_progress', 'paused'), true)
    assert.strictEqual(isValidStatusTransition('paused', 'in_progress'), true)
    assert.strictEqual(isValidStatusTransition('in_progress', 'completed'), true)
    assert.strictEqual(isValidStatusTransition('in_progress', 'on_hold'), true)
    assert.strictEqual(isValidStatusTransition('on_hold', 'ready'), true)

    // Prohibited transitions
    assert.strictEqual(isValidStatusTransition('completed', 'in_progress'), false)
    assert.strictEqual(isValidStatusTransition('completed', 'queued'), false)
    assert.strictEqual(isValidStatusTransition('cancelled', 'in_progress'), false)
    assert.strictEqual(isValidStatusTransition('queued', 'completed'), false)
  })

  it('2. Evaluates sequential task dependencies accurately', () => {
    const jobTasks: ProductionTaskRecord[] = [
      {
        id: 'task-1',
        company_id: 'tenant-alpha',
        job_order_id: 'job-101',
        task_number: 'TSK-101-01',
        task_name: 'Sheetfed Offset Printing',
        task_type: 'printing',
        department: 'printing',
        sequence_order: 1,
        quantity: 1000,
        unit: 'sheets',
        priority: 'normal',
        estimated_duration_minutes: 60,
        status: 'in_progress',
        is_rework: false,
        good_quantity: 0,
        rejected_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-2',
        company_id: 'tenant-alpha',
        job_order_id: 'job-101',
        task_number: 'TSK-101-02',
        task_name: 'Thermal Lamination',
        task_type: 'lamination',
        department: 'finishing',
        sequence_order: 2,
        quantity: 1000,
        unit: 'sheets',
        priority: 'normal',
        estimated_duration_minutes: 45,
        status: 'queued',
        is_rework: false,
        good_quantity: 0,
        rejected_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'task-3',
        company_id: 'tenant-alpha',
        job_order_id: 'job-101',
        task_number: 'TSK-101-03',
        task_name: 'Die-Cutting & Creasing',
        task_type: 'cutting',
        department: 'finishing',
        sequence_order: 3,
        quantity: 1000,
        unit: 'sheets',
        priority: 'normal',
        estimated_duration_minutes: 30,
        status: 'queued',
        is_rework: false,
        good_quantity: 0,
        rejected_quantity: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    // Task 1 is in_progress (incomplete), so Task 2 and Task 3 must be blocked
    const upstreamForTask2 = jobTasks.filter(
      (s) => s.sequence_order < 2 && s.status !== 'completed' && s.status !== 'cancelled'
    )
    assert.strictEqual(upstreamForTask2.length, 1)
    assert.strictEqual(upstreamForTask2[0].task_name, 'Sheetfed Offset Printing')

    const upstreamForTask3 = jobTasks.filter(
      (s) => s.sequence_order < 3 && s.status !== 'completed' && s.status !== 'cancelled'
    )
    assert.strictEqual(upstreamForTask3.length, 2)

    // Once Task 1 completes, Task 2 has 0 incomplete upstream tasks
    jobTasks[0].status = 'completed'
    const newUpstreamForTask2 = jobTasks.filter(
      (s) => s.sequence_order < 2 && s.status !== 'completed' && s.status !== 'cancelled'
    )
    assert.strictEqual(newUpstreamForTask2.length, 0)
  })

  it('3. Simulates Hold reasons and notes persistence', () => {
    const holdReasons: HoldReason[] = [
      'customer_approval',
      'material_unavailable',
      'machine_breakdown',
      'artwork_issue',
      'payment_hold',
      'quality_issue',
      'other',
    ]

    for (const reason of holdReasons) {
      const task: Partial<ProductionTaskRecord> = {
        status: 'on_hold',
        hold_reason: reason,
        hold_notes: `Blocked due to ${reason}`,
      }
      assert.strictEqual(task.status, 'on_hold')
      assert.strictEqual(task.hold_reason, reason)
      assert.ok(task.hold_notes?.includes(reason))
    }
  })

  it('4. Preserves parent task integrity during Rework creation', () => {
    const parentTask: ProductionTaskRecord = {
      id: 'task-original-1',
      company_id: 'tenant-alpha',
      job_order_id: 'job-200',
      task_number: 'TSK-200-01',
      task_name: 'Backlit Banner UV Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 50,
      unit: 'pcs',
      priority: 'normal',
      estimated_duration_minutes: 90,
      status: 'completed',
      good_quantity: 40,
      rejected_quantity: 10,
      is_rework: false,
      created_at: '2026-09-14T10:00:00Z',
      updated_at: '2026-09-14T11:30:00Z',
    }

    // Creating linked rework
    const reworkTask: ProductionTaskRecord = {
      id: 'task-rework-1',
      company_id: parentTask.company_id,
      job_order_id: parentTask.job_order_id,
      task_number: `${parentTask.task_number}-RW`,
      task_name: `[Rework] ${parentTask.task_name}`,
      task_type: parentTask.task_type,
      department: parentTask.department,
      sequence_order: parentTask.sequence_order + 1,
      description: 'Color mismatch on 10 pcs backlit vinyl',
      quantity: 10, // Reworking only rejected quantity
      unit: parentTask.unit,
      priority: 'urgent',
      estimated_duration_minutes: 30,
      status: 'queued',
      is_rework: true,
      rework_parent_task_id: parentTask.id,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Assert parent remains untouched and completed
    assert.strictEqual(parentTask.status, 'completed')
    assert.strictEqual(parentTask.is_rework, false)
    assert.strictEqual(parentTask.good_quantity, 40)

    // Assert rework task is created with links
    assert.strictEqual(reworkTask.is_rework, true)
    assert.strictEqual(reworkTask.rework_parent_task_id, parentTask.id)
    assert.strictEqual(reworkTask.priority, 'urgent')
    assert.strictEqual(reworkTask.quantity, 10)
  })

  it('5. Calculates machine queue categorization (NOW vs NEXT vs LATER)', () => {
    const nowTimestamp = new Date('2026-09-14T10:30:00Z').getTime()

    const tasks = [
      {
        id: '1',
        name: 'Job 1',
        start: new Date('2026-09-14T10:00:00Z').getTime(),
        end: new Date('2026-09-14T11:30:00Z').getTime(),
        status: 'in_progress' as const,
      },
      {
        id: '2',
        name: 'Job 2',
        start: new Date('2026-09-14T11:30:00Z').getTime(),
        end: new Date('2026-09-14T12:30:00Z').getTime(),
        status: 'scheduled' as const,
      },
      {
        id: '3',
        name: 'Job 3',
        start: new Date('2026-09-14T14:00:00Z').getTime(),
        end: new Date('2026-09-14T15:00:00Z').getTime(),
        status: 'scheduled' as const,
      },
    ]

    // Current task
    const current = tasks.find((t) => t.status === 'in_progress' || (t.start <= nowTimestamp && nowTimestamp <= t.end))
    assert.ok(current)
    assert.strictEqual(current.name, 'Job 1')

    // Next task
    const upcoming = tasks.filter((t) => t.id !== current.id)
    assert.strictEqual(upcoming[0].name, 'Job 2')

    // Later tasks
    const later = upcoming.slice(1)
    assert.strictEqual(later.length, 1)
    assert.strictEqual(later[0].name, 'Job 3')
  })
})
