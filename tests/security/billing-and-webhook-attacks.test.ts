import { describe, it } from 'node:test'
import assert from 'node:assert'
import { GatewayService } from '../../services/gateway.service.ts'
import { encryptSecret, decryptSecret, maskCredential } from '../../lib/security/encryption.ts'
import type { GatewayIntegrationRecord } from '../../types/gateway.types.ts'

describe('Security Attack Tests: Billing, Gateway Credentials & Webhooks', () => {
  it('1. Credential Protection: Sanitized gateway records NEVER expose raw secrets', () => {
    const rawSecret = 'sk_live_very_secret_merchant_api_key_998877'
    const encrypted = encryptSecret(JSON.stringify({
      app_secret: rawSecret,
      merchant_password: 'super_secure_bank_password_123',
    }))

    const rawRecord: GatewayIntegrationRecord = {
      id: 'gw-bkash-test-uuid',
      tenant_id: 'tenant-alpha-uuid',
      category: 'payment',
      provider: 'bkash',
      name: 'bKash Merchant Alpha',
      is_enabled: true,
      is_default: true,
      environment: 'live',
      encrypted_credentials: encrypted,
      public_config: { app_key: 'app_key_public_123' },
      status: 'connected',
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const sanitized = GatewayService.sanitizeRecord(rawRecord)

    // Verify raw secrets are completely absent from sanitized payload
    assert.strictEqual('encrypted_credentials' in sanitized, false)
    assert.strictEqual(sanitized.has_credentials, true)
    assert.ok(sanitized.masked_credentials)
    assert.ok(sanitized.masked_credentials.app_secret.includes('••••'))
    assert.strictEqual(sanitized.masked_credentials.app_secret.includes(rawSecret), false)
    assert.ok(sanitized.masked_credentials.merchant_password.includes('••••'))
  })

  it('2. Credential Encryption: Encrypt and decrypt roundtrips correctly', () => {
    const originalText = 'SuperSecretDbPassword2026!$%'
    const ciphertext = encryptSecret(originalText)
    assert.notStrictEqual(ciphertext, originalText)
    assert.ok(ciphertext.startsWith('v1:'), 'Ciphertext must be serialized with version header')

    const decrypted = decryptSecret(ciphertext)
    assert.strictEqual(decrypted, originalText)
  })

  it('3. Credential Masking: Correctly masks secrets of various lengths', () => {
    assert.strictEqual(maskCredential(null), '••••••••')
    assert.strictEqual(maskCredential(''), '••••••••')
    assert.strictEqual(maskCredential('12345'), '••••••••')
    assert.strictEqual(maskCredential('sk_live_1234567890abcdef'), 'sk_••••••••def')
  })

  it('4. Fail Closed: Encrypting with missing secret throws error in production runtime', () => {
    const originalEnv = process.env.NODE_ENV
    const originalSecret = process.env.ENCRYPTION_SECRET
    try {
      delete process.env.ENCRYPTION_SECRET
      delete process.env.SUPABASE_SERVICE_ROLE_KEY
      delete process.env.SUPABASE_SECRET_KEY
      delete process.env.APP_SECRET
      ;(process.env as any).NODE_ENV = 'production'

      assert.throws(() => {
        encryptSecret('test_payload')
      }, /FAIL CLOSED/i)
    } finally {
      ;(process.env as any).NODE_ENV = originalEnv
      if (originalSecret) process.env.ENCRYPTION_SECRET = originalSecret
    }
  })
})
