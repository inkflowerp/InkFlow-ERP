import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  EmailGatewayService,
  DEFAULT_PLATFORM_GATEWAY,
  EmailDataStore,
} from '../../services/email-gateway.service.ts'
import type { EmailGatewayRecord } from '../../types/communication.types.ts'
import { MockProviderAdapter } from '../../lib/email/adapters/mock.adapter.ts'

describe('Email Gateway Resolver Priority Logic Tests', () => {
  beforeEach(() => {
    EmailDataStore.set('printerp_email_gateways', [])
    EmailDataStore.set('printerp_email_logs', [])
    MockProviderAdapter.clearHistory()
  })

  it('1. Resolves Tenant Custom Gateway when tenant has an active gateway', async () => {
    const tenantGateway: EmailGatewayRecord = {
      id: 'gw-tenant-alpha',
      tenant_id: 'tenant-123',
      provider: 'mock',
      type: 'transactional',
      sender_name: 'Alpha Sign Billing',
      sender_email: 'billing@alphasign.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [tenantGateway])

    const resolved = await EmailGatewayService.resolveGateway('tenant-123')
    assert.ok(resolved)
    assert.strictEqual(resolved.id, 'gw-tenant-alpha')
    assert.strictEqual(resolved.sender_email, 'billing@alphasign.com')
  })

  it('2. Falls back to Platform Default Gateway when tenant has no custom gateway', async () => {
    const platformGateway: EmailGatewayRecord = {
      id: 'gw-platform-global',
      tenant_id: null,
      provider: 'mock',
      type: 'transactional',
      sender_name: 'PrintERP Platform Pool',
      sender_email: 'noreply@printerp.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [platformGateway])

    const resolved = await EmailGatewayService.resolveGateway('tenant-no-gw')
    assert.ok(resolved)
    assert.strictEqual(resolved.id, 'gw-platform-global')
    assert.strictEqual(resolved.sender_email, 'noreply@printerp.com')
  })

  it('3. Sends email successfully and records audit log', async () => {
    const sendResult = await EmailGatewayService.sendEmail({
      tenantId: 'tenant-123',
      eventType: 'invoice_created',
      recipient: 'customer@buyer.com',
      variables: {
        customer_name: 'Karim Textiles Ltd',
        invoice_number: 'INV-2026-0099',
        total_amount: '80,000',
        paid_amount: '30,000',
        due_amount: '50,000',
        due_date: '15-Oct-2026',
        payment_link: 'https://printerp.com/pay/INV-0099',
      },
    })

    assert.strictEqual(sendResult.success, true)
    assert.strictEqual(sendResult.status, 'sent')
    assert.ok(sendResult.messageId)

    // Inspect logs
    const logs = EmailDataStore.get<any[]>('printerp_email_logs') || []
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].recipient, 'customer@buyer.com')
    assert.strictEqual(logs[0].status, 'sent')
  })
})
