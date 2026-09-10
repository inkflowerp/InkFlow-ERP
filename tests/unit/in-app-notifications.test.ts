import { describe, it } from 'node:test'
import assert from 'node:assert'
import { CommunicationService } from '../../services/communication-server.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { renderTemplate } from '../../services/communication.service.ts'

describe('In-App Notifications & Live Communication Unit Tests', () => {
  it('should create an in-app notification with valid timestamp and defaults', async () => {
    const notif = await CommunicationService.createInAppNotification('test-company-1', {
      type: 'new_order',
      title: 'New Order Received',
      title_bn: 'নতুন অর্ডার পাওয়া গেছে',
      message: 'Order #ORD-101 has been submitted',
      message_bn: 'অর্ডার #ORD-101 জমা দেওয়া হয়েছে',
      action_url: '/orders',
      is_read: false,
    })

    assert.ok(notif.id.startsWith('notif-'))
    assert.strictEqual(notif.company_id, 'test-company-1')
    assert.strictEqual(notif.is_read, false)
    assert.strictEqual(notif.title, 'New Order Received')
    assert.ok(notif.created_at)

    // Check presence in local storage
    const stored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
    assert.ok(stored.some((n) => n.id === notif.id))

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.IN_APP_NOTIFICATIONS, notif.id)
  })

  it('should dispatch multi-channel workflow notification including in-app channel', async () => {
    const result = await CommunicationService.dispatchWorkflowNotification({
      companyId: 'test-company-2',
      eventType: 'order_confirmed',
      recipientName: 'Abdur Rahim',
      recipientEmail: 'rahim@example.com',
      variables: { order_number: 'ORD-555' },
      channels: ['in_app'],
      actionUrl: '/orders/ORD-555',
    })

    assert.strictEqual(result.in_app, true)

    const stored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
    const matching = stored.find((n) => n.action_url === '/orders/ORD-555')
    assert.ok(matching)
    assert.strictEqual(matching.is_read, false)

    // Cleanup
    if (matching) {
      PrintERPDataStore.removeItem(STORAGE_KEYS.IN_APP_NOTIFICATIONS, matching.id)
    }
  })

  it('should interpolate bilingual template variables accurately', () => {
    const tpl = 'Dear {{customer_name}}, your order #{{order_number}} is confirmed.'
    const rendered = renderTemplate(tpl, {
      customer_name: 'Tanvir Ahmed',
      order_number: 'ORD-9876',
    })

    assert.strictEqual(
      rendered,
      'Dear Tanvir Ahmed, your order #ORD-9876 is confirmed.'
    )
  })
})
