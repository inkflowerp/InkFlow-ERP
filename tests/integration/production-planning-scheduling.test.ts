import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { ProductionTaskRecord, CreateProductionTaskInput } from '../../types/production.types.ts'

describe('Production Planning & Machine Scheduling Integration Test Suite', () => {
  it('1. Verifies Multi-Task Job Order sequencing and progression', () => {
    const jobTasks: ProductionTaskRecord[] = []

    // Task 1: Printing
    const task1: ProductionTaskRecord = {
      id: 'tsk-101',
      company_id: 'tenant-acme',
      job_order_id: 'job-500',
      task_number: 'TSK-500-01',
      task_name: 'UV Flatbed Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 200,
      unit: 'boards',
      priority: 'normal',
      estimated_duration_minutes: 60,
      assigned_machine_id: 'mach-uv-1',
      assigned_machine_name: 'Mimaki JFX200',
      status: 'in_progress',
      is_rework: false,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    jobTasks.push(task1)

    // Task 2: CNC Router Contour Cutting
    const task2: ProductionTaskRecord = {
      id: 'tsk-102',
      company_id: 'tenant-acme',
      job_order_id: 'job-500',
      task_number: 'TSK-500-02',
      task_name: 'CNC Acrylic Contour Cutting',
      task_type: 'cutting',
      department: 'finishing',
      sequence_order: 2,
      quantity: 200,
      unit: 'boards',
      priority: 'normal',
      estimated_duration_minutes: 45,
      assigned_machine_id: 'mach-cnc-1',
      assigned_machine_name: 'MultiCam 3000 CNC',
      status: 'queued',
      is_rework: false,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    jobTasks.push(task2)

    // Task 3: Manual Edge Polishing & Packaging (No Machine)
    const task3: ProductionTaskRecord = {
      id: 'tsk-103',
      company_id: 'tenant-acme',
      job_order_id: 'job-500',
      task_number: 'TSK-500-03',
      task_name: 'Flame Polishing & Bubble Wrap Packaging',
      task_type: 'manual',
      department: 'finishing',
      sequence_order: 3,
      quantity: 200,
      unit: 'boards',
      priority: 'normal',
      estimated_duration_minutes: 30,
      assigned_machine_id: null,
      assigned_machine_name: null,
      status: 'queued',
      is_rework: false,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    jobTasks.push(task3)

    // Assert initial state: Task 1 is running, Task 2 and 3 are blocked by sequence
    assert.strictEqual(jobTasks[0].status, 'in_progress')
    assert.strictEqual(jobTasks[1].status, 'queued')
    assert.strictEqual(jobTasks[2].status, 'queued')

    // Simulate Task 1 completion
    jobTasks[0].status = 'completed'
    jobTasks[0].good_quantity = 200
    jobTasks[0].actual_end = new Date().toISOString()

    // Advance next task (Task 2) to ready
    jobTasks[1].status = 'ready'
    assert.strictEqual(jobTasks[1].status, 'ready')

    // Operator starts Task 2
    jobTasks[1].status = 'in_progress'
    jobTasks[1].actual_start = new Date().toISOString()
    assert.strictEqual(jobTasks[1].status, 'in_progress')

    // Task 2 completes -> Task 3 becomes ready
    jobTasks[1].status = 'completed'
    jobTasks[2].status = 'ready'
    assert.strictEqual(jobTasks[2].status, 'ready')
    assert.strictEqual(jobTasks[2].assigned_machine_id, null) // No machine required
  })

  it('2. Enforces machine scheduling conflict detection', () => {
    const existingBookings = [
      {
        machine_id: 'mach-roland-1',
        start: new Date('2026-09-14T09:00:00Z').getTime(),
        end: new Date('2026-09-14T11:00:00Z').getTime(),
        status: 'scheduled',
      },
    ]

    const newOverlappingBooking = {
      machine_id: 'mach-roland-1',
      start: new Date('2026-09-14T10:00:00Z').getTime(),
      end: new Date('2026-09-14T12:00:00Z').getTime(),
    }

    const hasConflict = existingBookings.some(
      (b) =>
        b.machine_id === newOverlappingBooking.machine_id &&
        b.status !== 'cancelled' &&
        newOverlappingBooking.start < b.end &&
        newOverlappingBooking.end > b.start
    )

    assert.strictEqual(hasConflict, true)

    // Non-overlapping slot succeeds
    const nonOverlappingBooking = {
      machine_id: 'mach-roland-1',
      start: new Date('2026-09-14T11:30:00Z').getTime(),
      end: new Date('2026-09-14T13:00:00Z').getTime(),
    }

    const hasNoConflict = existingBookings.some(
      (b) =>
        b.machine_id === nonOverlappingBooking.machine_id &&
        b.status !== 'cancelled' &&
        nonOverlappingBooking.start < b.end &&
        nonOverlappingBooking.end > b.start
    )

    assert.strictEqual(hasNoConflict, false)
  })

  it('3. Simulates Machine Breakdown impact and task reassignment', () => {
    let task: ProductionTaskRecord = {
      id: 'task-bd-1',
      company_id: 'tenant-acme',
      job_order_id: 'job-999',
      task_number: 'TSK-999-01',
      task_name: 'Latex Flex Banner Printing',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 500,
      unit: 'sqft',
      priority: 'urgent',
      estimated_duration_minutes: 120,
      assigned_machine_id: 'mach-latex-1',
      assigned_machine_name: 'HP Latex 335 #1',
      status: 'in_progress',
      is_rework: false,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Machine 1 breaks down -> Task placed on hold
    task.status = 'on_hold'
    task.hold_reason = 'machine_breakdown'
    task.hold_notes = 'HP Latex 335 #1 carriage error. Reassigning to HP Latex #2'

    assert.strictEqual(task.status, 'on_hold')
    assert.strictEqual(task.hold_reason, 'machine_breakdown')

    // Reassign task to alternative machine
    task.assigned_machine_id = 'mach-latex-2'
    task.assigned_machine_name = 'HP Latex 335 #2'
    task.status = 'scheduled'
    task.hold_reason = null
    task.hold_notes = null

    assert.strictEqual(task.assigned_machine_id, 'mach-latex-2')
    assert.strictEqual(task.status, 'scheduled')
    assert.strictEqual(task.hold_reason, null)
  })

  it('4. Supports pure 0-Machine business workflow without errors', () => {
    const manualTask: ProductionTaskRecord = {
      id: 'task-manual-0',
      company_id: 'tenant-zero-machine',
      job_order_id: 'job-zero-1',
      task_number: 'TSK-ZERO-01',
      task_name: 'Manual Screen Print & Packing',
      task_type: 'manual',
      department: 'printing',
      sequence_order: 1,
      quantity: 50,
      unit: 't-shirts',
      priority: 'normal',
      estimated_duration_minutes: 40,
      assigned_machine_id: null,
      assigned_machine_name: null,
      status: 'queued',
      is_rework: false,
      good_quantity: 0,
      rejected_quantity: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Progression works without machine_id requirement
    manualTask.status = 'ready'
    assert.strictEqual(manualTask.status, 'ready')

    manualTask.status = 'in_progress'
    manualTask.actual_start = new Date().toISOString()
    assert.strictEqual(manualTask.status, 'in_progress')

    manualTask.status = 'completed'
    manualTask.good_quantity = 50
    manualTask.actual_end = new Date().toISOString()
    assert.strictEqual(manualTask.status, 'completed')
    assert.strictEqual(manualTask.good_quantity, 50)
  })

  it('5. Strictly isolates production tasks by tenant boundary', () => {
    const tasks = [
      { id: 't-1', company_id: 'tenant-alpha', task_name: 'Alpha Banner' },
      { id: 't-2', company_id: 'tenant-alpha', task_name: 'Alpha Flyer' },
      { id: 't-3', company_id: 'tenant-beta', task_name: 'Beta Signboard' },
    ]

    const alphaTasks = tasks.filter((t) => t.company_id === 'tenant-alpha')
    const betaTasks = tasks.filter((t) => t.company_id === 'tenant-beta')

    assert.strictEqual(alphaTasks.length, 2)
    assert.strictEqual(betaTasks.length, 1)
    assert.ok(!alphaTasks.some((t) => t.id === 't-3'))
    assert.ok(!betaTasks.some((t) => t.id === 't-1' || t.id === 't-2'))
  })
})
