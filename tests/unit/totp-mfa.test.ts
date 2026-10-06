import { test, describe } from 'node:test'
import assert from 'node:assert'
import crypto from 'node:crypto'
import {
  base32Encode,
  base32Decode,
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  generateOtpauthUri,
  generateTotpQrCodeDataUrl,
} from '../../lib/auth/totp.ts'

describe('RFC 6238 TOTP Multi-Factor Authentication Suite', () => {
  describe('1. RFC 6238 Standard Test Vectors (SHA1)', () => {
    // Standard RFC 6238 Appendix B test vector for SHA1:
    // Secret string: '12345678901234567890' (20 bytes)
    // Base32 encoded: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
    const rfcSecret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

    const testVectors = [
      { timeSec: 59, expected: '287082' },
      { timeSec: 1111111109, expected: '081804' },
      { timeSec: 1111111111, expected: '050471' },
      { timeSec: 1234567890, expected: '005924' },
      { timeSec: 2000000000, expected: '279037' },
    ]

    for (const { timeSec, expected } of testVectors) {
      test(`verifies exact RFC 6238 code for T=${timeSec}s -> ${expected}`, () => {
        const code = generateTotpCode(rfcSecret, 30, 0, timeSec * 1000)
        assert.strictEqual(code, expected, `Generated code must match RFC 6238 vector for time ${timeSec}`)
      })
    }
  })

  describe('2. Base32 Codec Integrity and Overflow Resilience', () => {
    test('accurately decodes and re-encodes user screenshot secret key', () => {
      const userSecret = 'KID4DSJZANHJ62B7M33QXKZU4RLRL53W'
      const decoded = base32Decode(userSecret)
      assert.strictEqual(decoded.length, 20, '20-byte decoded HMAC key expected')
      const reEncoded = base32Encode(decoded)
      assert.strictEqual(reEncoded, userSecret)
    })

    test('handles lowercase, hyphens, and whitespace formatting gracefully', () => {
      const formatted = 'kid4-dsjz anhj 62b7-m33q-xkzu-4rlr-l53w'
      const decoded = base32Decode(formatted)
      assert.strictEqual(decoded.length, 20)
      const canonical = base32Encode(decoded)
      assert.strictEqual(canonical, 'KID4DSJZANHJ62B7M33QXKZU4RLRL53W')
    })

    test('preserves byte integrity across various buffer lengths (1 to 64 bytes)', () => {
      for (let len = 1; len <= 64; len++) {
        const originalBuf = crypto.randomBytes(len)
        const encoded = base32Encode(originalBuf)
        const decoded = base32Decode(encoded)
        assert.deepStrictEqual(
          decoded,
          originalBuf,
          `Round-trip failure on buffer length ${len}`
        )
      }
    })
  })

  describe('3. Dynamic Secret & Otpauth URI Generation', () => {
    test('generates valid 32-character Base32 secret by default (160 bits)', () => {
      const secret = generateTotpSecret(20)
      assert.strictEqual(secret.length, 32)
      assert.match(secret, /^[A-Z2-7]{32}$/)
    })

    test('constructs compliant otpauth:// Key URI for authenticator apps', () => {
      const secret = 'KID4DSJZANHJ62B7M33QXKZU4RLRL53W'
      const email = 'admin@printflow.bd'
      const uri = generateOtpauthUri(email, 'PrintFlow', secret)

      assert.ok(uri.startsWith('otpauth://totp/'), 'Must start with otpauth://totp/ protocol')
      assert.ok(uri.includes('PrintFlow'), 'Must include PrintFlow issuer')
      assert.ok(uri.includes('admin%40printflow.bd') || uri.includes('admin@printflow.bd'))
      assert.ok(uri.includes(`secret=${secret}`))
      assert.ok(uri.includes('algorithm=SHA1'))
      assert.ok(uri.includes('digits=6'))
      assert.ok(uri.includes('period=30'))
    })

    test('generates high-contrast PNG Data URL QR code', async () => {
      const secret = 'KID4DSJZANHJ62B7M33QXKZU4RLRL53W'
      const uri = generateOtpauthUri('admin@printflow.bd', 'PrintFlow', secret)
      const dataUrl = await generateTotpQrCodeDataUrl(uri)

      assert.ok(dataUrl.startsWith('data:image/png;base64,'), 'Must return a base64 PNG data URL')
      assert.ok(dataUrl.length > 500, 'Data URL must contain valid image payload')
    })
  })

  describe('4. TOTP Verification and Drift Window Tolerance', () => {
    test('accepts valid code generated at current timestamp', () => {
      const secret = generateTotpSecret(20)
      const now = Date.now()
      const code = generateTotpCode(secret, 30, 0, now)

      assert.strictEqual(verifyTotpCode(code, secret, { timestampMs: now }), true)
    })

    test('tolerates clock drift within +- 30 seconds window', () => {
      const secret = generateTotpSecret(20)
      const now = 1700000000000
      // Code generated 25 seconds in the past
      const pastCode = generateTotpCode(secret, 30, 0, now - 25000)
      assert.strictEqual(verifyTotpCode(pastCode, secret, { timestampMs: now }), true)

      // Code generated 25 seconds in the future
      const futureCode = generateTotpCode(secret, 30, 0, now + 25000)
      assert.strictEqual(verifyTotpCode(futureCode, secret, { timestampMs: now }), true)
    })

    test('rejects stale codes beyond the tolerance window (> 60 seconds)', () => {
      const secret = generateTotpSecret(20)
      const now = 1700000000000
      // 90 seconds ago = 3 full intervals ago
      const staleCode = generateTotpCode(secret, 30, 0, now - 90000)
      assert.strictEqual(verifyTotpCode(staleCode, secret, { timestampMs: now }), false)
    })

    test('rejects malformed, empty, or non-numeric codes safely without throwing', () => {
      const secret = generateTotpSecret(20)
      assert.strictEqual(verifyTotpCode('', secret), false)
      assert.strictEqual(verifyTotpCode('12345', secret), false)
      assert.strictEqual(verifyTotpCode('1234567', secret), false)
      assert.strictEqual(verifyTotpCode('abcdef', secret), false)
      assert.strictEqual(verifyTotpCode('12 34 56', secret), verifyTotpCode('123456', secret))
      assert.strictEqual(verifyTotpCode('000000', ''), false)
    })
  })
})
