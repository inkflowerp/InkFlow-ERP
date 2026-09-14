import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SyncService } from '../../services/sync.service.ts'
import { SyncRepository } from '../../lib/repositories/sync.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { AttendanceRepository } from '../../lib/repositories/attendance.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { SyncBatchItemPayload } from '../../types/sync.types.ts'

describe('Sync Engine & Outbox Unit Tests (V8)', () => {
  const companyId = 'co-sync-unit-test'

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.SYNC_OUTBOX)
    PrintERPDataStore.clear(STORAGE_KEYS.PRODUCTION_TASKS)
    PrintERPDataStore.clear(STORAGE_KEYS.MATERIALS)
    PrintERPDataStore.clear(STORAGE_KEYS.ATTENDANCE)
  })

  test('processes a batch of operations and records successful outbox records', async () => {
    // 1. Setup a pending task
    const task = await ProductionTaskRepository.createProductionTask({
      id: 'task-unit-1',
      company_id: companyId,
      task_name: 'Die-Cutting Offset Sheet',
      task_number: 'TSK-1001',
      step_type: 'DIE_CUTTING',
      status: 'PENDING',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    const batch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'dev1_op_101',
        device_id: 'dev1',
        action_type: 'task.start',
        entity_type: 'production_task',
        entity_id: 'task-unit-1',
        payload: { task_id: 'task-unit-1', notes: 'Operator started on Machine A' },
      },
      {
        idempotency_key: 'dev1_op_102',
        device_id: 'dev1',
        action_type: 'quotation.draft',
        entity_type: 'quotation',
        payload: {
          customer_name: 'Jamuna Graphics',
          subtotal: 12000,
          total_amount: 12000,
        },
      },
    ]

    const result = await SyncService.processOutboxBatch(companyId, batch)

    assert.strictEqual(result.success, true)
    assert.strictEqual(result.total_processed, 2)
    assert.strictEqual(result.synced_count, 2)
    assert.strictEqual(result.conflict_count, 0)
    assert.strictEqual(result.failed_count, 0)

    // Verify task status was updated on server
    const updatedTask = await ProductionTaskRepository.getProductionTaskById('task-unit-1', companyId)
    assert.strictEqual(updatedTask?.status, 'IN_PROGRESS')
  })

  test('enforces strict idempotency: duplicate sync requests return cached results without double execution', async () => {
    const batch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'dev1_idempotent_key_555',
        device_id: 'dev1',
        action_type: 'customer.draft',
        entity_type: 'customer',
        payload: { name: 'Square Pharmaceuticals' },
      },
    ]

    // First attempt
    const firstResult = await SyncService.processOutboxBatch(companyId, batch)
    assert.strictEqual(firstResult.synced_count, 1)

    // Second attempt with the exact same idempotency key
    const secondResult = await SyncService.processOutboxBatch(companyId, batch)
    assert.strictEqual(secondResult.synced_count, 1)
    assert.strictEqual(secondResult.results[0].status, 'synced')
    assert.strictEqual(secondResult.results[0].idempotency_key, 'dev1_idempotent_key_555')
  })

  test('detects concurrency conflict when operator attempts to mutate an already completed task', async () => {
    // Create a task that was already completed on the server
    await ProductionTaskRepository.createProductionTask({
      id: 'task-completed-server',
      company_id: companyId,
      task_name: 'Glossy Lamination',
      task_number: 'TSK-2002',
      step_type: 'LAMINATION',
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    const batch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'dev2_conflict_test_1',
        device_id: 'dev2',
        action_type: 'task.pause',
        entity_type: 'production_task',
        entity_id: 'task-completed-server',
        payload: { task_id: 'task-completed-server' },
      },
    ]

    const result = await SyncService.processOutboxBatch(companyId, batch)

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.conflict_count, 1)
    assert.strictEqual(result.results[0].status, 'conflict')
    assert.strictEqual(result.results[0].conflict_details?.reason, 'TASK_ALREADY_TERMINATED')
  })

  test('detects concurrency conflict when offline material issue exceeds available server stock balance', async () => {
    // Seed material with only 5 units in stock
    await InventoryRepository.createMaterial({
      id: 'mat-ink-cyan',
      company_id: companyId,
      sku: 'INK-CYAN-001',
      name: 'Eco-Solvent Cyan Ink',
      category: 'ink',
      unit: 'liter',
      current_stock: 5,
      unit_cost: 1800,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    const batch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'dev3_mat_issue_exceed',
        device_id: 'dev3',
        action_type: 'production.material_issue',
        entity_type: 'material',
        payload: {
          material_id: 'mat-ink-cyan',
          quantity: 20, // requested 20, available only 5
        },
      },
    ]

    const result = await SyncService.processOutboxBatch(companyId, batch)

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.conflict_count, 1)
    assert.strictEqual(result.results[0].status, 'conflict')
    assert.strictEqual(result.results[0].conflict_details?.reason, 'INSUFFICIENT_STOCK')
  })

  test('prevents duplicate attendance check-in on the same day for an employee', async () => {
    const today = new Date().toISOString().split('T')[0]

    // Pre-record a check in on server
    await AttendanceRepository.recordAttendance({
      company_id: companyId,
      employee_id: 'emp-shamol-01',
      attendance_date: today,
      attendance_type: 'CHECK_IN' as any,
      checked_at: `${today}T09:05:00`,
      latitude: 23.8103,
      longitude: 90.4125,
      gps_accuracy_meters: 5,
      distance_from_location_meters: 5,
      verification_status: 'verified',
    })

    const batch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'dev4_att_duplicate_checkin',
        device_id: 'dev4',
        action_type: 'attendance.punch',
        entity_type: 'attendance',
        payload: {
          employee_id: 'emp-shamol-01',
          punch_type: 'CHECK_IN',
          timestamp: `${today}T09:30:00`,
        },
      },
    ]

    const result = await SyncService.processOutboxBatch(companyId, batch)

    assert.strictEqual(result.success, false)
    assert.strictEqual(result.conflict_count, 1)
    assert.strictEqual(result.results[0].status, 'conflict')
    assert.strictEqual(result.results[0].conflict_details?.reason, 'DUPLICATE_CHECK_IN')
  })
})
