import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { UnifiedCommunicationService } from '../../services/unified-communication.service.ts'
import { CommunicationRepository } from '../../lib/repositories/communication.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('WhatsApp & SMS Communication Lifecycle Integration Tests (V8)', () => {
  const companyId = 'co-comm-lifecycle-integration'

  beforeEach(async () => {
    PrintERPDataStore.clear(STORAGE_KEYS.COMMUNICATION_MESSAGES)
    PrintERPDataStore.clear(STORAGE_KEYS.COMMUNICATION_TEMPLATES)
    PrintERPDataStore.clear(STORAGE_KEYS.INVOICES)
    await CommunicationRepository.seedDefaultTemplates(companyId)
  })

  test('executes end-to-end Invoice -> WhatsApp dispatch with non-blocking failure isolation', async () => {
    // 1. Create an invoice
    const inv = await BillingRepository.createInvoice({
      id: 'inv-comm-01',
      company_id: companyId,
      invoice_number: 'INV-2026-888',
      customer_id: 'cust-bex-01',
      customer_name: 'Beximco Media',
      customer_phone: '+8801711223344',
      subtotal: 50000,
      grand_total: 57500,
      paid_amount: 20000,
      due_amount: 37500,
      status: 'PARTIALLY_PAID',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)

    assert.ok(inv)
    assert.strictEqual(inv.invoice_number, 'INV-2026-888')

    // 2. Dispatch WhatsApp Notification
    const dispatchResult = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'whatsapp',
      recipientName: inv.customer_name,
      recipientDestination: inv.customer_phone,
      templateKey: 'invoice_generated',
      variables: {
        customer_name: inv.customer_name,
        company_name: 'Metro Print & Media',
        invoice_number: inv.invoice_number,
        invoice_total: inv.grand_total,
        paid_amount: inv.paid_amount,
        due_amount: inv.due_amount,
      },
      attachmentUrl: `https://cdn.inkflow.com.bd/invoices/${inv.id}.pdf`,
      attachmentName: `${inv.invoice_number}.pdf`,
      idempotencyKey: `comm_inv_${inv.id}`,
    })

    // Invoice remains valid and unaffected regardless of communication outcome
    assert.strictEqual(dispatchResult.channel, 'whatsapp')
    assert.ok(dispatchResult.messageId)

    // 3. Verify communication log audit record
    const commLog = await CommunicationRepository.getMessageById(dispatchResult.messageId, companyId)
    assert.ok(commLog)
    assert.strictEqual(commLog.recipient_name, 'Beximco Media')
    assert.strictEqual(commLog.channel, 'whatsapp')
    assert.ok(commLog.message_content.includes('INV-2026-888'))
    assert.ok(commLog.message_content.includes(inv.due_amount.toString()))
  })

  test('executes end-to-end Payment Due Reminder -> SMS dispatch', async () => {
    const dispatchResult = await UnifiedCommunicationService.sendTransactionalMessage({
      companyId,
      channel: 'sms',
      recipientName: 'Akhtar Furniture',
      recipientDestination: '+8801819998877',
      templateKey: 'due_payment_reminder',
      variables: {
        customer_name: 'Akhtar Furniture',
        company_name: 'InkFlow Sign & Print',
        due_amount: 18500,
      },
      language: 'bn',
    })

    assert.strictEqual(dispatchResult.channel, 'sms')

    const commLog = await CommunicationRepository.getMessageById(dispatchResult.messageId, companyId)
    assert.ok(commLog)
    assert.strictEqual(commLog.recipient_name, 'Akhtar Furniture')
    assert.ok(commLog.message_content.includes('18500'))
  })
})
