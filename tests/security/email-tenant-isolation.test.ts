// ==============================================================================
// PrintERP SaaS - Security & Multi-Tenant Isolation Tests for Email System
// ==============================================================================

import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  EmailGatewayService,
  EmailDataStore,
} from '../../services/email-gateway.service.ts'
import { sanitizeGatewayRecord } from '../../lib/security/encryption.ts'
import {
  generateGoogleOAuthState,
  verifyGoogleOAuthState,
} from '../../lib/email/oauth/google-oauth.ts'
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
      scope_type: 'TENANT',
      provider: 'gmail',
      type: 'transactional',
      gmail_account_email: 'billing@tenant-a.com',
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
      scope_type: 'TENANT',
      provider: 'smtp',
      type: 'transactional',
      smtp_host: 'mail.tenant-b.com',
      encrypted_credentials: 'v1:d:e:f',
      sender_name: 'Tenant B Graphics',
      sender_email: 'hello@tenant-b.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [tenantAGateway, tenantBGateway])

    const resA = await EmailGatewayService.resolveGateway('tenant-a-id', 'TENANT')
    assert.ok(resA)
    assert.strictEqual(resA.id, 'gw-tenant-a')
    assert.strictEqual(resA.sender_email, 'billing@tenant-a.com')
    assert.strictEqual(resA.provider, 'gmail')

    const resB = await EmailGatewayService.resolveGateway('tenant-b-id', 'TENANT')
    assert.ok(resB)
    assert.strictEqual(resB.id, 'gw-tenant-b')
    assert.strictEqual(resB.sender_email, 'hello@tenant-b.com')
    assert.strictEqual(resB.provider, 'smtp')

    // Verify Tenant A resolving gateway never receives Tenant B gateway
    assert.notStrictEqual(resA.id, 'gw-tenant-b')
  })

  it('2. Enforces FAIL-CLOSED boundary: Tenant with no active provider does NOT fall back to Platform Email', async () => {
    const platformGateway: EmailGatewayRecord = {
      id: 'gw-platform-exclusive',
      tenant_id: null,
      scope_type: 'PLATFORM',
      provider: 'mock',
      type: 'transactional',
      sender_name: 'InkFlow Platform Admin',
      sender_email: 'platform-noreply@printerp.com',
      status: 'active',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    EmailDataStore.set('printerp_email_gateways', [platformGateway])

    // Resolving gateway for unconfigured tenant MUST return null
    const resolvedTenant = await EmailGatewayService.resolveGateway('unconfigured-tenant-id', 'TENANT')
    assert.strictEqual(resolvedTenant, null, 'Unconfigured tenant must NEVER resolve platform gateway')

    // Attempting to send an email for unconfigured tenant MUST fail closed
    const sendResult = await EmailGatewayService.sendEmail({
      scopeType: 'TENANT',
      tenantId: 'unconfigured-tenant-id',
      eventType: 'invoice_created',
      recipient: 'customer@buyer.com',
      customSubject: 'Invoice Notice',
    })

    assert.strictEqual(sendResult.success, false)
    assert.strictEqual(sendResult.status, 'failed')
    assert.ok(sendResult.error?.includes('Tenant email provider is not configured'))
  })

  it('3. Verifies secret credentials and OAuth tokens are never exposed through sanitized gateway records', () => {
    const rawGateway: EmailGatewayRecord = {
      id: 'gw-sensitive',
      tenant_id: 'tenant-a-id',
      scope_type: 'TENANT',
      provider: 'gmail',
      type: 'transactional',
      encrypted_credentials: 'v1:super-secret-iv:encrypted-ciphertext:auth-tag',
      extra_settings: {
        access_token: 'secret-raw-access-token',
        refresh_token: 'secret-raw-refresh-token',
        client_secret: 'google-client-secret-123',
        api_key: 'sk_live_1234567890abcdef',
      },
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
    assert.strictEqual(sanitized.extra_settings?.access_token, undefined)
    assert.strictEqual(sanitized.extra_settings?.refresh_token, undefined)
    assert.strictEqual(sanitized.extra_settings?.client_secret, undefined)
    assert.ok(sanitized.extra_settings?.api_key?.includes('••••••••'))
    assert.strictEqual(sanitized.sender_email, 'user@tenant.com')
  })

  it('4. HMAC-SHA256 OAuth State validation prevents tampering, substitution, and CSRF', () => {
    const state = generateGoogleOAuthState({
      scopeType: 'TENANT',
      tenantId: 'tenant-secure-123',
      userId: 'user-789',
      returnUrl: '/tenant-slug/settings/email',
    })

    // Valid state verifies correctly
    const decoded = verifyGoogleOAuthState(state)
    assert.ok(decoded)
    assert.strictEqual(decoded.scopeType, 'TENANT')
    assert.strictEqual(decoded.tenantId, 'tenant-secure-123')
    assert.strictEqual(decoded.userId, 'user-789')

    // Tampered state signature MUST be rejected
    const tampered = state.slice(0, -4) + 'abcd'
    const tamperedDecoded = verifyGoogleOAuthState(tampered)
    assert.strictEqual(tamperedDecoded, null, 'Tampered state signature must be rejected')

    // Forged state payload MUST be rejected
    const forged = 'eyJzY29wZVR5cGUiOiJQTEFURk9STSJ9.invalid_signature'
    assert.strictEqual(verifyGoogleOAuthState(forged), null)
  })

  it('5. Verifies Tenant A cannot view Tenant B email transmission logs', () => {
    const logA: EmailLogRecord = {
      id: 'log-a-01',
      tenant_id: 'tenant-a-id',
      scope_type: 'TENANT',
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
      scope_type: 'TENANT',
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
