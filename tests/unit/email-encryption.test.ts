import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  encryptSecret,
  decryptSecret,
  maskCredential,
  maskEmail,
  sanitizeGatewayRecord,
} from '../../lib/security/encryption.ts'

describe('Email Gateway Security & Encryption Tests', () => {
  it('1. Encrypts and decrypts secret credentials reliably using AES-256-GCM', () => {
    const rawApiKey = 're_123456789_abcdef_sec_live_key'
    const encrypted = encryptSecret(rawApiKey)

    assert.ok(encrypted.startsWith('v1:'), 'Encrypted string must start with version prefix')
    assert.notStrictEqual(encrypted, rawApiKey, 'Encrypted string must not match raw key')

    const decrypted = decryptSecret(encrypted)
    assert.strictEqual(decrypted, rawApiKey, 'Decrypted string must match original raw key')
  })

  it('2. Correctly encrypts SMTP passwords containing special characters', () => {
    const rawPassword = 'P@$$w0rd_!#%&*(bangladesh)2026'
    const encrypted = encryptSecret(rawPassword)
    const decrypted = decryptSecret(encrypted)

    assert.strictEqual(decrypted, rawPassword, 'Decrypted password must match special chars')
  })

  it('3. Handles plain text fallback gracefully if string is not encrypted', () => {
    const plain = 'unencrypted_string'
    const result = decryptSecret(plain)
    assert.strictEqual(result, plain)
  })

  it('4. Masks credentials and API keys for UI display', () => {
    const apiKey = 'sk_live_998877665544332211'
    const masked = maskCredential(apiKey)

    assert.ok(masked.includes('••••••••'), 'Masked key must contain bullets')
    assert.strictEqual(masked.startsWith('sk_'), true, 'Masked key should preserve prefix')
    assert.strictEqual(masked.endsWith('211'), true, 'Masked key should preserve suffix')
  })

  it('5. Masks email addresses correctly', () => {
    const email = 'finance@printerp.com'
    const masked = maskEmail(email)

    assert.ok(masked.includes('***'), 'Masked email must hide intermediate chars')
    assert.ok(masked.endsWith('@printerp.com'), 'Masked email must preserve domain')
  })

  it('6. Sanitizes gateway records to strip raw passwords and encrypted payloads', () => {
    const rawRecord = {
      id: 'gw-01',
      provider: 'smtp',
      smtp_username: 'admin',
      encrypted_credentials: 'v1:a:b:c',
      password: 'raw_pass_must_be_stripped',
      api_key: 'sk_secret_123456789',
      sender_name: 'PrintERP',
    }

    const sanitized = sanitizeGatewayRecord(rawRecord)
    assert.strictEqual((sanitized as any).encrypted_credentials, undefined)
    assert.strictEqual((sanitized as any).password, undefined)
    assert.ok(sanitized.api_key.includes('••••••••'))
  })
})
