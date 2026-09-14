import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SyncService } from '../../services/sync.service.ts'
import { SyncRepository } from '../../lib/repositories/sync.repository.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { SyncBatchItemPayload } from '../../types/sync.types.ts'

describe('Mobile Offline Sync Lifecycle Integration Tests (V8)', () => {
  const companyId = 'co-sync-lifecycle-integration'

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.SYNC_OUTBOX)
    PrintERPDataStore.clear(STORAGE_KEYS.QUOTATIONS)
    PrintERPDataStore.clear(STORAGE_KEYS.PRODUCTION_TASKS)
  })

  test('simulates offline workflow: client queues multiple actions, connects, and syncs atomically', async () => {
    // 1. Pre-condition on server: Task created in ready state
    const task = await ProductionTaskRepository.createProductionTask({
      id: 'task-flow-101',
      company_id: companyId,
      task_name: 'Acrylic Laser Cutting',
      task_number: 'TSK-LSR-01',
      step_type: 'CUTTING',
      status: 'READY',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    // 2. Client prepares an offline outbox batch
    const offlineBatch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'device_phone_01_quotation_draft',
        device_id: 'device_phone_01',
        action_type: 'quotation.create',
        entity_type: 'quotation',
        payload: {
          quotation_number: 'QT-2026-909',
          customer_name: 'Beximco Digital Sign',
          subtotal: 75000,
          total_amount: 75000,
        },
      },
      {
        idempotency_key: 'device_phone_01_task_start',
        device_id: 'device_phone_01',
        action_type: 'task.start',
        entity_type: 'production_task',
        entity_id: 'task-flow-101',
        payload: { task_id: 'task-flow-101', notes: 'Operator started laser bench' },
      },
      {
        idempotency_key: 'device_phone_01_task_complete',
        device_id: 'device_phone_01',
        action_type: 'task.complete',
        entity_type: 'production_task',
        entity_id: 'task-flow-101',
        payload: { task_id: 'task-flow-101', notes: 'Laser cutting finished with 0 defects' },
      },
    ]

    // 3. Client reconnects and submits batch to server
    const batchResult = await SyncService.processOutboxBatch(companyId, offlineBatch, 'user-operator-1')

    assert.strictEqual(batchResult.success, true)
    assert.strictEqual(batchResult.total_processed, 3)
    assert.strictEqual(batchResult.synced_count, 3)
    assert.strictEqual(batchResult.conflict_count, 0)
    assert.strictEqual(batchResult.failed_count, 0)

    // 4. Verify Server State
    const createdQuo = await QuotationRepository.getQuotationById(batchResult.results[0].entity_id!, companyId)
    assert.ok(createdQuo)
    assert.strictEqual(createdQuo.customer_name, 'Beximco Digital Sign')
    assert.strictEqual(createdQuo.grand_total, 75000)

    const updatedTask = await ProductionTaskRepository.getProductionTaskById('task-flow-101', companyId)
    assert.ok(updatedTask)
    assert.strictEqual(updatedTask.status, 'COMPLETED')

    // 5. Verify Outbox Records on Server
    const outboxItems = await SyncRepository.getOutboxItems(companyId, { deviceId: 'device_phone_01' })
    assert.strictEqual(outboxItems.length, 3)
    assert.ok(outboxItems.every((item) => item.status === 'synced'))
  })
})
