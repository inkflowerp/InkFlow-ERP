import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import type { ProductionTaskRecord } from '../../types/production.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { DesignJobRecord } from '../../types/design.types.ts'

describe('Production Task Lookup and Resilient Lifecycle Tests', () => {
  const TENANT_ID = 'comp-test-lookup-01'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
    PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
  })

  it('1. Retrieves task by UUID and by task_number from DataStore', async () => {
    const taskUuid = 'c8b41981-689e-4e4b-91bb-bbbe10c9c741'
    const task: ProductionTaskRecord = {
      id: taskUuid,
      company_id: TENANT_ID,
      job_order_id: 'jo-001',
      task_number: 'TSK-000004-1',
      task_name: 'Print: Pana Flex Banner Print',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'sft',
      priority: 'normal',
      status: 'queued',
      customer_name: 'kkk',
      product_name: 'Pana Flex Banner Print',
      job_number: 'INV-000004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task)

    // Lookup by UUID
    const byUuid = await ProductionPlanningService.getTaskById(taskUuid, TENANT_ID)
    assert.ok(byUuid, 'Must find task by UUID')
    assert.strictEqual(byUuid.task_number, 'TSK-000004-1')
    assert.strictEqual(byUuid.task_name, 'Print: Pana Flex Banner Print')

    // Lookup by task_number
    const byTaskNumber = await ProductionPlanningService.getTaskById('TSK-000004-1', TENANT_ID)
    assert.ok(byTaskNumber, 'Must find task by task_number')
    assert.strictEqual(byTaskNumber.id, taskUuid)
  })

  it('2. Does not synthesize phantom tasks from invoice and returns created task accurately', async () => {
    // Lookup non-existent task before creation -> must return null (no fake tasks synthesized)
    const notFound = await ProductionPlanningService.getTaskById('TSK-NONEXISTENT', TENANT_ID)
    assert.strictEqual(notFound, null, 'Querying non-existent task should return null without fabricating phantom task')

    // Create a genuine production task
    const createdTask = await ProductionTaskRepository.createTask({
      company_id: TENANT_ID,
      task_number: 'TSK-000004-1',
      task_name: 'Pana Flex Banner Print for kkk',
      customer_name: 'kkk',
      job_number: 'INV-000004',
      task_type: 'printing',
      department: 'printing',
      quantity: 10,
      unit: 'sft',
      status: 'queued',
    } as any)

    // Lookup task using task number
    const foundTask = await ProductionPlanningService.getTaskById('TSK-000004-1', TENANT_ID)
    assert.ok(foundTask, 'Must find created task')
    assert.strictEqual(foundTask.customer_name, 'kkk')
    assert.ok(foundTask.task_name.includes('Pana Flex Banner Print'))
    assert.strictEqual(foundTask.job_number, 'INV-000004')
  })

  it('3. Successfully starts, pauses, and completes task when provided with client taskPayload', async () => {
    const clientGeneratedId = 'tsk-client-gen-999'
    const taskPayload: Partial<ProductionTaskRecord> = {
      id: clientGeneratedId,
      company_id: TENANT_ID,
      task_number: 'TSK-000004-2',
      task_name: 'Finishing & QC: Pana Flex Banner Print',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 1,
      unit: 'sft',
      priority: 'normal',
      status: 'queued',
      customer_name: 'kkk',
      product_name: 'Pana Flex Banner Print',
      job_number: 'INV-000004',
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
    }

    // Start task with taskPayload (simulating server action from browser where task wasn't in memory)
    const startedTask = await ProductionPlanningService.startTask(
      clientGeneratedId,
      TENANT_ID,
      'op-01',
      'Shahidur Rahman',
      false,
      taskPayload
    )
    assert.strictEqual(startedTask.status, 'in_progress')
    assert.strictEqual(startedTask.assigned_operator_name, 'Shahidur Rahman')

    // Pause task
    const pausedTask = await ProductionPlanningService.pauseTask(
      clientGeneratedId,
      'Lunch break',
      TENANT_ID,
      taskPayload
    )
    assert.strictEqual(pausedTask.status, 'paused')

    // Complete task (from paused or in_progress)
    const completeResult = await ProductionPlanningService.completeTask(
      clientGeneratedId,
      TENANT_ID,
      { good_quantity: 1, rejected_quantity: 0 },
      taskPayload
    )
    assert.strictEqual(completeResult.completedTask.status, 'completed')
  })

  it('4. Sequential advancement unblocks downstream tasks properly', async () => {
    const joId = 'jo-seq-01'
    const task1: ProductionTaskRecord = {
      id: 'tsk-seq-1',
      company_id: TENANT_ID,
      job_order_id: joId,
      task_number: 'TSK-SEQ-1',
      task_name: 'Print: Step 1',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'in_progress',
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const task2: ProductionTaskRecord = {
      id: 'tsk-seq-2',
      company_id: TENANT_ID,
      job_order_id: joId,
      task_number: 'TSK-SEQ-2',
      task_name: 'Finishing: Step 2',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'queued',
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task1)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task2)

    // Complete task 1
    const result = await ProductionPlanningService.completeTask(task1.id, TENANT_ID)
    assert.strictEqual(result.completedTask.status, 'completed')
    assert.ok(result.nextReadyTask, 'Downstream task must be returned')
    assert.strictEqual(result.nextReadyTask.id, task2.id)
    assert.strictEqual(result.nextReadyTask.status, 'ready')
  })

  it('5. Automatically provisions preset machine (heidelberg_sm74) and resiliently starts and completes task with machine tracking', async () => {
    PrintERPDataStore.set(STORAGE_KEYS.MACHINERIES, [])

    const taskId = 'tsk-heidelberg-test'
    const task: ProductionTaskRecord = {
      id: taskId,
      company_id: TENANT_ID,
      task_number: 'TSK-HD-001',
      task_name: 'Offset Printing: Catalog Book',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 500,
      unit: 'sheet',
      priority: 'normal',
      status: 'queued',
      assigned_machine_id: 'heidelberg_sm74',
      is_blocked_by_commercial_gate: false,
      is_blocked_by_design_gate: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task)

    // Starting task assigned to heidelberg_sm74 should succeed without "Machinery heidelberg_sm74 not found" error
    const started = await ProductionPlanningService.startTask(taskId, TENANT_ID, 'op-02', 'Faruk Offset Lead')
    assert.strictEqual(started.status, 'in_progress')

    // Machine should now exist and be in_use
    const { MachineryRepository } = await import('../../lib/repositories/machinery.repository.ts')
    const machine = await MachineryRepository.getMachineryById('heidelberg_sm74', TENANT_ID)
    assert.ok(machine, 'heidelberg_sm74 should be auto-provisioned')
    assert.strictEqual(machine.status, 'in_use')
    assert.strictEqual(machine.name, 'Heidelberg Speedmaster SM-74 (4-Color Offset)')

    // Completing task should set machine back to available
    const completed = await ProductionPlanningService.completeTask(taskId, TENANT_ID, { good_quantity: 500, rejected_quantity: 5 })
    assert.strictEqual(completed.completedTask.status, 'completed')

    const machineAfter = await MachineryRepository.getMachineryById('heidelberg_sm74', TENANT_ID)
    assert.ok(machineAfter)
    assert.strictEqual(machineAfter.status, 'available')
  })

  it('6. Allows completing tasks directly from queued, ready, or on_hold without throwing invalid transition', async () => {
    const queuedTaskId = 'tsk-queued-complete-01'
    const queuedTask: ProductionTaskRecord = {
      id: queuedTaskId,
      company_id: TENANT_ID,
      task_number: 'TSK-000009-1',
      task_name: 'Print: Star Flex Banner for Customer',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 5,
      unit: 'pcs',
      priority: 'urgent',
      status: 'queued',
      customer_name: 'Direct Walk-in',
      job_number: 'INV-000009',
      width: 48,
      height: 36,
      dimension_unit: 'in',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, queuedTask)

    // Completing directly from 'queued' must succeed smoothly
    const res = await ProductionPlanningService.completeTask(queuedTaskId, TENANT_ID, {
      good_quantity: 5,
      rejected_quantity: 0,
      notes: 'Direct fast print run on floor',
    })
    assert.ok(res.completedTask)
    assert.strictEqual(res.completedTask.status, 'completed')
    assert.strictEqual(res.completedTask.good_quantity, 5)
    assert.ok(res.completedTask.actual_start, 'actual_start should be populated automatically')
    assert.ok(res.completedTask.actual_end, 'actual_end should be populated')

    // Task on hold can also be completed directly
    const onHoldTaskId = 'tsk-onhold-complete-02'
    const onHoldTask: ProductionTaskRecord = {
      id: onHoldTaskId,
      company_id: TENANT_ID,
      task_number: 'TSK-000009-2',
      task_name: 'Finishing: Eyelet and Grommeting',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 5,
      unit: 'pcs',
      priority: 'normal',
      status: 'on_hold',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, onHoldTask)

    const holdRes = await ProductionPlanningService.completeTask(onHoldTaskId, TENANT_ID, {
      good_quantity: 5,
      rejected_quantity: 0,
    })
    assert.strictEqual(holdRes.completedTask.status, 'completed')
  })

  it('7. Matches task numbers with leading zero variations (TSK-000009-1 vs TSK-009-1)', async () => {
    assert.strictEqual(ProductionTaskRepository.matchesTaskNumber('TSK-000009-1', 'TSK-009-1'), true)
    assert.strictEqual(ProductionTaskRepository.matchesTaskNumber('TSK-009-1', 'TSK-000009-1'), true)
    assert.strictEqual(ProductionTaskRepository.matchesTaskNumber('TSK-000009-2', 'TSK-009-2'), true)
    assert.strictEqual(ProductionTaskRepository.matchesTaskNumber('TSK-000009-1', 'TSK-000009-2'), false)
    assert.strictEqual(ProductionTaskRepository.matchesTaskNumber('TSK-10-1', 'TSK-010-1'), true)

    // Lookup task stored as TSK-009-1 when searching for TSK-000009-1
    const task: ProductionTaskRecord = {
      id: 'tsk-nine-01',
      company_id: TENANT_ID,
      task_number: 'TSK-009-1',
      task_name: 'Print: Shop Banner',
      task_type: 'printing',
      department: 'printing',
      sequence_order: 1,
      quantity: 1,
      unit: 'pcs',
      priority: 'normal',
      status: 'in_progress',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, task)

    const found = await ProductionPlanningService.getTaskById('TSK-000009-1', TENANT_ID)
    assert.ok(found, 'Should find task TSK-009-1 when queried with TSK-000009-1')
    assert.strictEqual(found.id, 'tsk-nine-01')
  })

  it('8. Accurately parses dimensions and converts inches to feet for wide format feed', async () => {
    const { parseTaskDimensions } = await import('../../lib/domain/roll-consumption-engine.ts')

    // Case A: 48in x 36in banner
    const parsedInch = parseTaskDimensions({
      width: 48,
      height: 36,
      dimension_unit: 'in',
    } as any)
    assert.strictEqual(parsedInch.widthFt, 4)
    assert.strictEqual(parsedInch.lengthFt, 3)
    assert.strictEqual(parsedInch.areaSft, 12)

    // Case B: Dimensions given as spec string "10 × 3 ft"
    const parsedSpec = parseTaskDimensions({
      dimensions_spec: '10 × 3 ft',
    } as any)
    assert.strictEqual(parsedSpec.widthFt, 10)
    assert.strictEqual(parsedSpec.lengthFt, 3)
    assert.strictEqual(parsedSpec.areaSft, 30)

    // Case C: Large numbers without explicit unit assumed inches (36 x 24)
    const parsedAutoInches = parseTaskDimensions({
      width: 36,
      height: 24,
    } as any)
    assert.strictEqual(parsedAutoInches.widthFt, 3)
    assert.strictEqual(parsedAutoInches.lengthFt, 2)
    assert.strictEqual(parsedAutoInches.areaSft, 6)
  })
})

