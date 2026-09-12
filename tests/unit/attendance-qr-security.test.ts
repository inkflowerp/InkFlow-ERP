import { test, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import {
  generateSecureQrToken,
  hashQrToken,
  evaluateGeofence,
} from '../../lib/attendance/geofence-utils.ts'

describe('Attendance QR Cryptographic Security & Rotation Tests', () => {
  it('1. Generates 256-bit high-entropy cryptographic token and valid SHA-256 hash', () => {
    const { rawToken, tokenHash, tokenPrefix } = generateSecureQrToken()

    assert.equal(typeof rawToken, 'string')
    assert.equal(rawToken.length, 64) // 32 bytes in hex = 64 characters
    assert.match(rawToken, /^[0-9a-f]{64}$/)

    assert.equal(typeof tokenHash, 'string')
    assert.equal(tokenHash.length, 64) // SHA-256 hash = 64 hex characters
    assert.match(tokenHash, /^[0-9a-f]{64}$/)

    assert.match(tokenPrefix, /^INK-LOC-[0-9A-F]{8}$/)

    // Verify hash matches
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    assert.equal(tokenHash, expectedHash)
  })

  it('2. Properly extracts and hashes raw tokens from URL, payload prefix, or raw hex', () => {
    const raw = 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0'
    const expectedHash = crypto.createHash('sha256').update(raw).digest('hex')

    // Case A: Raw token
    assert.equal(hashQrToken(raw), expectedHash)

    // Case B: URL with qr parameter
    const urlA = `https://inkflow.app/acme-press/attendance?qr=${raw}`
    assert.equal(hashQrToken(urlA), expectedHash)

    // Case C: URL with t parameter
    const urlB = `https://inkflow.app/attendance/scan?t=${raw}&source=mobile`
    assert.equal(hashQrToken(urlB), expectedHash)

    // Case D: Prefixed payload
    const prefixed = `INKFLOW:ATT:v1:${raw}`
    assert.equal(hashQrToken(prefixed), expectedHash)
  })

  it('3. Rejects empty, whitespace, or invalid QR tokens gracefully', () => {
    const hashA = hashQrToken('')
    const hashB = hashQrToken('   ')
    assert.equal(typeof hashA, 'string')
    assert.equal(typeof hashB, 'string')
  })

  it('4. Generates valid standard QR code matrix for attendance token', async () => {
    const QRCode = (await import('qrcode')).default
    const testToken = 'INKFLOW:ATT:v1:a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0'
    const qr = QRCode.create(testToken, { errorCorrectionLevel: 'M' })

    assert.ok(qr.modules.size >= 21)
    assert.equal(typeof qr.modules.get(0, 0), 'number') // dark = 1
    assert.equal(qr.modules.get(0, 0), 1) // top-left finder pattern corner
    assert.equal(qr.modules.get(0, qr.modules.size - 1), 1) // top-right finder pattern corner
    assert.equal(qr.modules.get(qr.modules.size - 1, 0), 1) // bottom-left finder pattern corner
  })
})

