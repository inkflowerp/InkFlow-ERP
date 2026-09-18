import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PlatformService } from '../../services/platform.service.ts'
import { SyncService } from '../../services/sync.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { SyncBatchItemPayload } from '../../types/sync.types.ts'

describe('Adversarial Security Audit: Offline Sync Replay & Tenant Resurrection Protection', () => {
  const victimTenantId = 'comp-offline-victim'

  it('1. Pre-seeds victim tenant, outbox mutations, and operational records', async () => {
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, [
      { id: victimTenantId, slug: 'offline-victim', name: 'Offline Victim Ltd' },
    ])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      { id: 'cust-v1', company_id: victimTenantId, name: 'Victim Customer 1' },
    ])
    PrintERPDataStore.set(STORAGE_KEYS.SYNC_OUTBOX, [
      {
        id: 'outbox-1',
        company_id: victimTenantId,
        idempotency_key: 'idem-1',
        action_type: 'customer.draft',
        status: 'pending',
      },
    ])

    const comps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.ok(comps.some((c) => c.id === victimTenantId))
  })

  it('2. Permanently deletes the victim tenant and verifies outbox is purged', async () => {
    const deleteRes = await PlatformService.deleteCompany(victimTenantId, 'Offline Sync Security Audit Purge')
    assert.strictEqual(deleteRes.success, true)

    // Verify company is gone
    const comps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.strictEqual(comps.some((c) => c.id === victimTenantId), false)

    // Verify sync_outbox is cleared
    const outbox = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    assert.strictEqual(outbox.some((o) => o.company_id === victimTenantId), false)
  })

  it('3. Replays stale offline mutations targeting the deleted tenant and confirms safe handling', async () => {
    const staleBatch: SyncBatchItemPayload[] = [
      {
        idempotency_key: 'stale-customer-create',
        device_id: 'dev-offline-01',
        action_type: 'customer.draft',
        entity_type: 'customer',
        payload: { name: 'Resurrected Ghost Customer', phone: '01700000000' },
      },
      {
        idempotency_key: 'stale-task-update',
        device_id: 'dev-offline-01',
        action_type: 'task.complete',
        entity_type: 'production_task',
        entity_id: 'task-deleted-999',
        payload: { task_id: 'task-deleted-999' },
      },
      {
        idempotency_key: 'stale-material-issue',
        device_id: 'dev-offline-01',
        action_type: 'production.material_issue',
        entity_type: 'material',
        payload: { material_id: 'mat-deleted-999', quantity: 50 },
      },
    ]

    // Execute outbox processing against deleted tenant
    const syncResult = await SyncService.processOutboxBatch(victimTenantId, staleBatch)

    // Confirm that stale tasks / materials returned conflict or failed safely
    const taskRes = syncResult.results.find((r) => r.idempotency_key === 'stale-task-update')
    assert.ok(taskRes?.status === 'conflict' || taskRes?.status === 'failed')

    const matRes = syncResult.results.find((r) => r.idempotency_key === 'stale-material-issue')
    assert.ok(matRes?.status === 'conflict' || matRes?.status === 'failed')

    // Verify victim company is NOT resurrected in platform store
    const compsAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.strictEqual(compsAfter.some((c) => c.id === victimTenantId), false)
  })
})
