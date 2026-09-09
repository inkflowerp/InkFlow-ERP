import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  EmailGatewayService,
  EmailDataStore,
} from '../../services/email-gateway.service.ts'
import { sanitizeGatewayRecord } from '../../lib/security/encryption.ts'
import type { EmailGatewayRecord, EmailLogRecord } from '../../types/communication.types.ts'

describe('Email Gateway Multi-Tenant Isolation & Security Tests', () => {
  beforeEach(() => {
    EmailDataStore.set('printerp_email_gateways', [])
    EmailDataStore.set('printerp_email_logs', [])
  })

  it('1. Verifies Tenant A cannot see or access Tenant B custom gateways', async () => {
    const tenantAGateway: EmailGatewayRecord = {
      id: 'gw-tenant-a',
      tenant_id: 'tenant-a-id',
      provider: 'smtp',
      type: 'transactional',
      smtp_host: 'smtp.tenant-a.com',
      smtp_port: 587,
      smtp_username: 'user@tenant-a.com',
      encrypted_credentials: 'v1:a:b:c',
      sender_name: 'Tenant A Press',
      sender_email: 'billing@tenant-a.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const tenantBGateway: EmailGatewayRecord = {
      id: 'gw-tenant-b',
      tenant_id: 'tenant-b-id',
      provider: 'resend',
      type: 'transactional',
      encrypted_credentials: 'v1:d:e:f',
      sender_name: 'Tenant B Graphics',
      sender_email: 'hello@tenant-b.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [tenantAGateway, tenantBGateway])

    const resA = await EmailGatewayService.resolveGateway('tenant-a-id')
    assert.ok(resA)
    assert.strictEqual(resA.id, 'gw-tenant-a')
    assert.strictEqual(resA.sender_email, 'billing@tenant-a.com')

    const resB = await EmailGatewayService.resolveGateway('tenant-b-id')
    assert.ok(resB)
    assert.strictEqual(resB.id, 'gw-tenant-b')
    assert.strictEqual(resB.sender_email, 'hello@tenant-b.com')

    // Verify Tenant A resolving gateway never receives Tenant B gateway
    assert.notStrictEqual(resA.id, 'gw-tenant-b')
  })

  it('2. Verifies secret credentials are never exposed through sanitized gateway records', () => {
    const rawGateway: EmailGatewayRecord = {
      id: 'gw-sensitive',
      tenant_id: 'tenant-a-id',
      provider: 'smtp',
      type: 'transactional',
      smtp_username: 'user@tenant.com',
      encrypted_credentials: 'v1:super-secret-iv:encrypted-ciphertext:auth-tag',
      sender_name: 'Tenant A',
      sender_email: 'user@tenant.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const sanitized = sanitizeGatewayRecord(rawGateway)
    assert.strictEqual(sanitized.encrypted_credentials, undefined)
    assert.strictEqual((sanitized as any).password, undefined)
    assert.strictEqual((sanitized as any).api_key, undefined)
    assert.strictEqual(sanitized.sender_email, 'user@tenant.com')
  })

  it('3. Verifies Tenant A cannot view Tenant B email logs', () => {
    const logA: EmailLogRecord = {
      id: 'log-a-01',
      tenant_id: 'tenant-a-id',
      gateway_id: 'gw-tenant-a',
      event_type: 'invoice_created',
      recipient: 'buyer-a@client.com',
      subject: 'Invoice for Tenant A Client',
      status: 'sent',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    }

    const logB: EmailLogRecord = {
      id: 'log-b-01',
      tenant_id: 'tenant-b-id',
      gateway_id: 'gw-tenant-b',
      event_type: 'quotation_sent',
      recipient: 'secret-buyer-b@topclient.com',
      subject: 'Confidential Quotation for Tenant B',
      status: 'sent',
      retry_count: 0,
      max_retries: 3,
      created_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_logs', [logA, logB])

    const allLogs = EmailDataStore.get<EmailLogRecord[]>('printerp_email_logs') || []
    const logsA = allLogs.filter((l) => l.tenant_id === 'tenant-a-id')
    const logsB = allLogs.filter((l) => l.tenant_id === 'tenant-b-id')

    assert.strictEqual(logsA.length, 1)
    assert.strictEqual(logsA[0].recipient, 'buyer-a@client.com')
    assert.strictEqual(
      logsA.some((l) => l.recipient === 'secret-buyer-b@topclient.com'),
      false,
      'Tenant A must not have visibility into Tenant B logs'
    )

    assert.strictEqual(logsB.length, 1)
    assert.strictEqual(logsB[0].recipient, 'secret-buyer-b@topclient.com')
  })
})
