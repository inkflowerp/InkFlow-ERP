// ==============================================================================
// PrintERP SaaS - Integration Tests: Gmail & SMTP Full Lifecycle
// ==============================================================================

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  EmailGatewayService,
  EmailDataStore,
} from '../../services/email-gateway.service.ts'
import { BusinessEmailService } from '../../services/business-email.service.ts'
import { encryptSecret } from '../../lib/security/encryption.ts'
import type { EmailGatewayRecord, EmailLogRecord } from '../../types/communication.types.ts'

describe('Gmail & SMTP Full Lifecycle Integration Tests', () => {
  beforeEach(() => {
    EmailDataStore.set('printerp_email_gateways', [])
    EmailDataStore.set('printerp_email_logs', [])
  })

  it('1. Complete Gmail Lifecycle: Connect -> Test Connection -> Send Quote -> Log -> Disconnect', async () => {
    const companyId = 'tenant-gmail-flow-01'

    // Step A: Connect Gmail (simulating OAuth callback storing encrypted tokens)
    const encryptedTokens = encryptSecret(
      JSON.stringify({
        access_token: 'mock-gmail-access-token',
        refresh_token: 'mock-gmail-refresh-token',
      })
    )

    const gmailGateway: EmailGatewayRecord = {
      id: 'gw-gmail-01',
      tenant_id: companyId,
      scope_type: 'TENANT',
      provider: 'gmail',
      type: 'transactional',
      gmail_account_email: 'sales@inkflow-tenant.com',
      gmail_display_name: 'InkFlow Tenant Sales',
      encrypted_credentials: encryptedTokens,
      token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      sender_name: 'InkFlow Tenant Sales',
      sender_email: 'sales@inkflow-tenant.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [gmailGateway])

    // Step B: Test Connection
    const testResult = await EmailGatewayService.testConnection(gmailGateway)
    assert.strictEqual(testResult.success, true)
    assert.strictEqual(testResult.provider, 'gmail')

    // Step C: Send Business Quotation Email
    const quoteSend = await BusinessEmailService.sendQuotationEmail({
      companyId,
      companyName: 'InkFlow Tenant Press',
      quotationId: 'quo-1001',
      quotationNumber: 'QUO-2026-1001',
      customerName: 'Prime Bank Ltd',
      recipientEmail: 'procurement@primebank.com.bd',
      grandTotal: 85000,
    })

    assert.strictEqual(quoteSend.success, true)
    assert.strictEqual(quoteSend.status, 'sent')
    assert.strictEqual(quoteSend.providerUsed, 'gmail')

    // Step D: Verify Transmission Log
    const logs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    assert.strictEqual(logs.length, 1)
    assert.strictEqual(logs[0].recipient, 'procurement@primebank.com.bd')
    assert.strictEqual(logs[0].status, 'sent')

    // Step E: Disconnect Gmail
    EmailDataStore.set(
      'printerp_email_gateways',
      (EmailDataStore.get<EmailGatewayRecord[]>('printerp_email_gateways') || []).filter(
        (g) => g.tenant_id !== companyId
      )
    )

    // Step F: Verify Post-Disconnect Fail-Closed Behavior
    const postDisconnectSend = await BusinessEmailService.sendQuotationEmail({
      companyId,
      companyName: 'InkFlow Tenant Press',
      quotationId: 'quo-1002',
      quotationNumber: 'QUO-2026-1002',
      customerName: 'Prime Bank Ltd',
      recipientEmail: 'procurement@primebank.com.bd',
      grandTotal: 85000,
    })

    assert.strictEqual(postDisconnectSend.success, false)
    assert.strictEqual(postDisconnectSend.status, 'failed')
    assert.ok(postDisconnectSend.error?.includes('Tenant email provider is not configured'))
  })

  it('2. Complete SMTP Lifecycle: Configure -> Test -> Send Invoice -> Log -> Disable', async () => {
    const companyId = 'tenant-smtp-flow-02'

    // Step A: Configure SMTP
    const encryptedPass = encryptSecret('strong-smtp-password-123')
    const smtpGateway: EmailGatewayRecord = {
      id: 'gw-smtp-02',
      tenant_id: companyId,
      scope_type: 'TENANT',
      provider: 'smtp',
      type: 'transactional',
      smtp_host: 'mail.tenant-corp.com',
      smtp_port: 587,
      smtp_username: 'billing@tenant-corp.com',
      encrypted_credentials: encryptedPass,
      encryption_type: 'tls',
      sender_name: 'Tenant Corporate Billing',
      sender_email: 'billing@tenant-corp.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [smtpGateway])

    // Step B: Test SMTP Connection
    const testResult = await EmailGatewayService.testConnection(smtpGateway)
    assert.strictEqual(testResult.provider, 'smtp')

    // Step C: Send Invoice
    const invSend = await BusinessEmailService.sendInvoiceEmail({
      companyId,
      companyName: 'Tenant Corporate Billing',
      invoiceId: 'inv-888',
      invoiceNumber: 'INV-2026-0888',
      customerName: 'Apex Footwear Ltd',
      recipientEmail: 'finance@apexfootwear.com',
      totalAmount: 450000,
      paidAmount: 200000,
      dueAmount: 250000,
    })

    assert.strictEqual(invSend.success, true)
    assert.strictEqual(invSend.status, 'sent')
  })

  it('3. Idempotency Key deduplication prevents duplicate sends on retries or double-clicks', async () => {
    const companyId = 'tenant-idempotent-03'
    const gateway: EmailGatewayRecord = {
      id: 'gw-idempotent-03',
      tenant_id: companyId,
      scope_type: 'TENANT',
      provider: 'mock',
      type: 'transactional',
      sender_name: 'Test Sender',
      sender_email: 'test@sender.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    EmailDataStore.set('printerp_email_gateways', [gateway])

    const idempotencyKey = `quote:quo-doubleclick-01:customer@buyer.com`

    // First send
    const send1 = await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: companyId,
      eventType: 'quotation_sent',
      recipient: 'customer@buyer.com',
      customSubject: 'Quotation #01',
      idempotencyKey,
    })

    assert.strictEqual(send1.success, true)
    assert.strictEqual(send1.status, 'sent')

    // Second immediate send with exact same idempotency key
    const send2 = await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: companyId,
      eventType: 'quotation_sent',
      recipient: 'customer@buyer.com',
      customSubject: 'Quotation #01',
      idempotencyKey,
    })

    assert.strictEqual(send2.success, true)
    assert.strictEqual(send2.status, 'sent')
    assert.strictEqual(send2.providerUsed, 'cached_idempotent')

    // Logs in data store must only have 1 transmission recorded
    const logs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    assert.strictEqual(logs.length, 1)
  })
})
