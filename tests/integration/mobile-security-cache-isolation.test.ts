import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { SyncRepository } from '../../lib/repositories/sync.repository.ts'
import { CommunicationRepository } from '../../lib/repositories/communication.repository.ts'
import { SyncService } from '../../services/sync.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Mobile Security & Cross-Tenant Cache Isolation Tests (V8)', () => {
  const tenantA = 'company-tenant-alpha'
  const tenantB = 'company-tenant-beta'

  beforeEach(() => {
    PrintERPDataStore.clear(STORAGE_KEYS.SYNC_OUTBOX)
    PrintERPDataStore.clear(STORAGE_KEYS.COMMUNICATION_MESSAGES)
  })

  test('enforces strict tenant isolation: Tenant A cannot query or mutate Tenant B outbox items', async () => {
    // 1. Save outbox item for Tenant A
    await SyncRepository.saveOutboxItem({
      id: 'outbox-tenant-a-1',
      company_id: tenantA,
      idempotency_key: 'dev_alpha_op_1',
      device_id: 'dev_alpha',
      action_type: 'customer.draft',
      entity_type: 'customer',
      payload: { name: 'Tenant A Secret Customer' },
      status: 'synced',
      retry_count: 0,
      max_retries: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 2. Query outbox as Tenant B
    const tenantBOutbox = await SyncRepository.getOutboxItems(tenantB)
    assert.strictEqual(tenantBOutbox.length, 0)

    // 3. Attempt to fetch specific item using Tenant B context
    const lookup = await SyncRepository.getOutboxItemByIdempotencyKey('dev_alpha_op_1', tenantB)
    assert.strictEqual(lookup, null)
  })

  test('enforces strict tenant isolation: Tenant A communication logs are completely invisible to Tenant B', async () => {
    // 1. Record message in Tenant A
    await CommunicationRepository.saveMessage({
      id: 'msg-tenant-a-secret',
      company_id: tenantA,
      channel: 'whatsapp',
      recipient_name: 'VIP Client A',
      recipient_destination: '+8801700112233',
      message_content: 'Confidential corporate quotation',
      provider: 'meta_whatsapp',
      status: 'sent',
      attempts: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    // 2. Query messages as Tenant B
    const tenantBMessages = await CommunicationRepository.getMessages(tenantB)
    assert.strictEqual(tenantBMessages.length, 0)

    // 3. Specific lookup by ID under Tenant B
    const directLookup = await CommunicationRepository.getMessageById('msg-tenant-a-secret', tenantB)
    assert.strictEqual(directLookup, null)
  })
})
