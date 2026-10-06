// ==============================================================================
// PrintFlow SaaS - RFC 6238 TOTP (Time-Based One-Time Password) Implementation
// Cryptographically verified 6-digit MFA using Node.js built-in crypto (HMAC-SHA1).
// Compatible with Google Authenticator, Microsoft Authenticator, Authy, 1Password.
// ==============================================================================

import crypto from 'node:crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

/**
 * Encodes a buffer to RFC 3548 / RFC 4648 Base32 string
 */
export function base32Encode(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8

    while (bits >= 5) {
      bits -= 5
      output += BASE32_ALPHABET[(value >>> bits) & 31]
      value &= (1 << bits) - 1
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  }

  return output
}

/**
 * Decodes an RFC 3548 / RFC 4648 Base32 string into a Buffer
 */
export function base32Decode(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/=+$/, '').replace(/[\s-]/g, '')
  let bits = 0
  let value = 0
  const output: number[] = []

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i])
    if (idx === -1) continue
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      bits -= 8
      output.push((value >>> bits) & 0xff)
      value &= (1 << bits) - 1
    }
  }

  return Buffer.from(output)
}

/**
 * Generates a new cryptographically random Base32 secret for TOTP (default: 20 bytes = 160 bits)
 */
export function generateTotpSecret(bytes = 20): string {
  const randomBuf = crypto.randomBytes(bytes)
  return base32Encode(randomBuf)
}

/**
 * Constructs a standard RFC 6238 Key URI for Authenticator apps:
 * otpauth://totp/{issuer}:{accountName}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30
 */
export function generateOtpauthUri(
  accountName: string,
  issuer: string = 'PrintFlow',
  secret: string
): string {
  const cleanAccount = accountName.trim()
  const cleanIssuer = issuer.trim()
  const label = `${encodeURIComponent(cleanIssuer)}:${encodeURIComponent(cleanAccount)}`
  const params = new URLSearchParams({
    secret: secret.trim(),
    issuer: cleanIssuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}

/**
 * Generates a high-contrast QR Code Data URL (PNG) from an otpauth:// URI
 */
export async function generateTotpQrCodeDataUrl(otpauthUri: string): Promise<string> {
  const QRCode = (await import('qrcode')).default
  return await QRCode.toDataURL(otpauthUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 240,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

/**
 * Generates a 6-digit TOTP code for a given secret and counter/time
 */
export function generateTotpCode(
  secretBase32: string,
  timeStepSec = 30,
  timeOffset = 0,
  timestampMs?: number
): string {
  try {
    const key = base32Decode(secretBase32)
    const epoch = Math.floor((timestampMs ?? Date.now()) / 1000)
    const counter = Math.floor(epoch / timeStepSec) + timeOffset

    const buf = Buffer.alloc(8)
    buf.writeBigInt64BE(BigInt(counter))

    const hmac = crypto.createHmac('sha1', key).update(buf).digest()
    const offset = hmac[hmac.length - 1] & 0x0f
    const codeInt =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)

    const otp = codeInt % 1000000
    return String(otp).padStart(6, '0')
  } catch {
    return ''
  }
}

/**
 * Verifies a 6-digit TOTP code with time drift window tolerance (+- 1 step = 30 seconds)
 */
export function verifyTotpCode(
  code: string,
  secretBase32: string,
  options?: { window?: number; timestampMs?: number }
): boolean {
  if (!code || typeof code !== 'string') return false
  const cleanCode = code.trim().replace(/\s+/g, '')
  if (!/^\d{6}$/.test(cleanCode)) return false
  if (!secretBase32) return false

  const window = options?.window ?? 1
  const ts = options?.timestampMs

  // Check current window and adjacent windows to account for clock skew (+- window * 30 seconds)
  for (let offset = -window; offset <= window; offset++) {
    const expected = generateTotpCode(secretBase32, 30, offset, ts)
    if (expected && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(cleanCode))) {
      return true
    }
  }

  return false
}

