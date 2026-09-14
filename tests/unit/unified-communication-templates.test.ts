import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { UnifiedCommunicationService } from '../../services/unified-communication.service.ts'
import { CommunicationRepository } from '../../lib/repositories/communication.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unified Communication & Templates Unit Tests (V8)', () => {
  const companyId = 'co-comm-unit-test'

  beforeEach(async () => {
    PrintERPDataStore.clear(STORAGE_KEYS.COMMUNICATION_MESSAGES)
    PrintERPDataStore.clear(STORAGE_KEYS.COMMUNICATION_TEMPLATES)
    await CommunicationRepository.seedDefaultTemplates(companyId)
  })

  test('correctly interpolates bilingual variables in English template', async () => {
    const res = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'in_app',
      recipientName: 'Abdur Rahim',
      recipientDestination: '+8801711000000',
      templateKey: 'quotation_ready',
      variables: {
        customer_name: 'Abdur Rahim',
        company_name: 'Metro Print & Signage',
        quotation_number: 'QT-2026-00101',
        total_amount: 45000,
      },
      language: 'en',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')

    const log = await CommunicationRepository.getMessageById(res.messageId, companyId)
    assert.ok(log)
    assert.ok(log.message_content.includes('Dear Abdur Rahim'))
    assert.ok(log.message_content.includes('QT-2026-00101'))
    assert.ok(log.message_content.includes('45000 BDT'))
  })

  test('correctly interpolates bilingual variables in Bengali template', async () => {
    const res = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'in_app',
      recipientName: 'তানভীর আহমেদ',
      recipientDestination: '+8801811000000',
      templateKey: 'invoice_generated',
      variables: {
        customer_name: 'তানভীর আহমেদ',
        company_name: 'প্রিন্টহাব বিডি',
        invoice_number: 'INV-2026-0089',
        invoice_total: 62000,
        due_amount: 12000,
      },
      language: 'bn',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.status, 'sent')

    const log = await CommunicationRepository.getMessageById(res.messageId, companyId)
    assert.ok(log)
    assert.ok(log.message_content.includes('তানভীর আহমেদ'))
    assert.ok(log.message_content.includes('INV-2026-0089'))
    assert.ok(log.message_content.includes('62000'))
    assert.ok(log.message_content.includes('12000'))
  })

  test('enforces communication idempotency to prevent double dispatching of transactional alerts', async () => {
    const idempotencyKey = 'idempotent_comm_send_999'

    const first = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'in_app',
      recipientName: 'Kamal Hossain',
      recipientDestination: '+8801911000000',
      customContent: 'Your print order is ready.',
      idempotencyKey,
    })

    assert.strictEqual(first.success, true)

    // Second call with same idempotency key
    const second = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'in_app',
      recipientName: 'Kamal Hossain',
      recipientDestination: '+8801911000000',
      customContent: 'Your print order is ready.',
      idempotencyKey,
    })

    assert.strictEqual(second.success, true)
    assert.strictEqual(second.messageId, first.messageId)

    // Verify only 1 log record was stored
    const allLogs = await CommunicationRepository.getMessages(companyId)
    assert.strictEqual(allLogs.length, 1)
  })

  test('appends document attachment link to text-based WhatsApp and SMS dispatches', async () => {
    const res = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'whatsapp',
      recipientName: 'Shamol Roy',
      recipientDestination: '+8801700000000',
      customContent: 'Here is your official invoice document.',
      attachmentUrl: 'https://cdn.inkflow.com.bd/invoices/INV-2026-001.pdf',
    })

    assert.strictEqual(res.success, true)

    const log = await CommunicationRepository.getMessageById(res.messageId, companyId)
    assert.ok(log)
    assert.ok(log.message_content.includes('Document Link: https://cdn.inkflow.com.bd/invoices/INV-2026-001.pdf'))
  })
})
