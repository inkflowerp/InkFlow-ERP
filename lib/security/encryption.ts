// ==============================================================================
// PrintERP SaaS - Encryption & Security Utilities (AES-256-GCM)
// Securely encrypts and decrypts SMTP passwords, API keys, and third-party secrets.
// ==============================================================================

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const DEFAULT_SALT = 'printerp-saas-master-key-salt-2026'

/**
 * Derives a 32-byte key from environment or fallback secret
 */
function getMasterKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.APP_SECRET ||
    'printerp_enterprise_communication_gateway_secret_key_32b!'

  return crypto.scryptSync(secret, DEFAULT_SALT, 32)
}

export interface EncryptedPayload {
  iv: string
  tag: string
  data: string
}

/**
 * Encrypts a plaintext string using AES-256-GCM
 * Returns serialized string format: `v1:iv:tag:encryptedData`
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return ''

  try {
    const key = getMasterKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plainText, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Encryption failed:', error)
    throw new Error('Failed to encrypt secret credentials')
  }
}

/**
 * Decrypts a ciphertext string formatted as `v1:iv:tag:encryptedData`
 */
export function decryptSecret(encryptedString: string): string {
  if (!encryptedString) return ''

  // If plain text (not encrypted or mock string)
  if (!encryptedString.startsWith('v1:')) {
    return encryptedString
  }

  try {
    const parts = encryptedString.split(':')
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('Invalid encrypted payload format')
    }

    const iv = Buffer.from(parts[1], 'hex')
    const authTag = Buffer.from(parts[2], 'hex')
    const encryptedText = parts[3]

    const key = getMasterKey()
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (error) {
    console.error('Decryption failed:', error)
    throw new Error('Failed to decrypt secret credentials')
  }
}

/**
 * Masks a secret string for UI presentation (e.g. `sk_live_••••••••1234`)
 */
export function maskCredential(secret?: string | null): string {
  if (!secret) return '••••••••'
  if (secret.length <= 6) return '••••••••'
  return `${secret.slice(0, 3)}••••••••${secret.slice(-3)}`
}

/**
 * Masks an email for privacy (e.g. `sup••••@printerp.com`)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}*@${domain}`
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`
}

/**
 * Sanitizes gateway records so encrypted credentials are stripped or masked before returning to client
 */
export function sanitizeGatewayRecord<T extends Record<string, any>>(record: T): T {
  if (!record) return record
  const clone = { ...record }
  if ('encrypted_credentials' in clone) {
    delete clone.encrypted_credentials
  }
  if ('password' in clone) {
    delete clone.password
  }
  if ('api_key' in clone) {
    ;(clone as any).api_key = maskCredential((clone as any).api_key)
  }
  return clone
}
