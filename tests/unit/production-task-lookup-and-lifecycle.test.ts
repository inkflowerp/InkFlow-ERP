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

  it('2. Synthesizes task from existing Invoice if not in production store', async () => {
    const invoice: Partial<InvoiceRecord> = {
      id: 'inv-4444',
      company_id: TENANT_ID,
      invoice_number: 'INV-000004',
      customer_name: 'kkk',
      due_date: '2026-09-25',
      items: [
        {
          id: 'item-44',
          invoice_id: 'inv-4444',
          item_name: 'Pana Flex Banner Print',
          item_description: 'Pana Flex Banner Print for kkk',
          quantity: 10,
          unit: 'sft',
          unit_price: 15,
          total_price: 150,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    // Attempt to lookup task using task number based on invoice
    const foundTask = await ProductionPlanningService.getTaskById('TSK-000004-1', TENANT_ID)
    assert.ok(foundTask, 'Must synthesize and find task from Invoice')
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
})
