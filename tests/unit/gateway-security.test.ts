import { describe, it } from 'node:test'
import assert from 'node:assert'
import { encryptSecret, decryptSecret, maskCredential } from '../../lib/security/encryption.ts'
import { GatewayService } from '../../services/gateway.service.ts'
import type { GatewayIntegrationRecord } from '../../types/gateway.types.ts'

describe('Gateway Security & Encryption Tests', () => {
  it('1. Encrypts and decrypts sensitive credentials with AES-256-GCM', () => {
    const rawSecret = 'sk_live_very_secret_bKash_app_key_998877'
    const encrypted = encryptSecret(rawSecret)

    assert.ok(encrypted.startsWith('v1:'))
    assert.notStrictEqual(encrypted, rawSecret)

    const decrypted = decryptSecret(encrypted)
    assert.strictEqual(decrypted, rawSecret)
  })

  it('2. Correctly masks credentials for UI safe rendering', () => {
    const masked = maskCredential('sk_live_1234567890abcdef')
    assert.ok(masked.includes('••••••••'))
    assert.ok(!masked.includes('1234567890'))
  })

  it('3. Sanitizes gateway records to prevent secrets leakage in client responses', () => {
    const rawCreds = JSON.stringify({
      api_key: 'sk_live_secret_key_12345',
      password: 'SuperSecretPassword99!',
    })
    const encrypted = encryptSecret(rawCreds)

    const dbRecord: GatewayIntegrationRecord = {
      id: 'gw-123',
      tenant_id: null,
      category: 'payment',
      provider: 'bkash',
      name: 'bKash Merchant',
      is_enabled: true,
      is_default: true,
      environment: 'live',
      encrypted_credentials: encrypted,
      public_config: { username: 'merchant01' },
      status: 'connected',
      failure_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const sanitized = GatewayService.sanitizeRecord(dbRecord)

    // Verify raw secrets and encrypted cipher are NOT present in sanitized record
    assert.strictEqual((sanitized as any).encrypted_credentials, undefined)
    assert.strictEqual(sanitized.has_credentials, true)
    assert.ok(sanitized.masked_credentials.api_key.includes('••••'))
    assert.ok(sanitized.masked_credentials.password.includes('••••'))
    assert.strictEqual(sanitized.public_config.username, 'merchant01')
  })
})
