// ==============================================================================
// PrintERP SaaS - Encryption & Security Utilities (AES-256-GCM v2)
// Securely encrypts and decrypts SMTP passwords, API keys, and third-party secrets.
// Supports versioned keys (v2:k1:iv:tag:data), legacy v1 migration, and explicit error types.
// ==============================================================================

import crypto from 'crypto'
import { isTestEnvironment } from './runtime-env.ts'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits recommended for GCM
const AUTH_TAG_LENGTH = 16 // 128 bits
const DEFAULT_SALT = 'printerp-saas-master-key-salt-2026'
export const CURRENT_KEY_ID = 'k1'

export type CredentialErrorCode =
  | 'CREDENTIAL_DECRYPTION_FAILED'
  | 'CREDENTIAL_KEY_MISMATCH'
  | 'CREDENTIAL_FORMAT_INVALID'
  | 'CREDENTIAL_NOT_CONFIGURED'

export class CredentialEncryptionError extends Error {
  code: CredentialErrorCode
  constructor(code: CredentialErrorCode, message: string) {
    super(message)
    this.name = 'CredentialEncryptionError'
    this.code = code
  }
}

export interface DecryptedCredentialsResult {
  success: boolean
  credentials: Record<string, string>
  error?: CredentialErrorCode
  errorMessage?: string
  needsReentry?: boolean
  version?: 'v1' | 'v2' | 'plaintext' | 'none' | 'unknown'
  shouldUpgrade?: boolean
}

/**
 * Derives a 32-byte master key from the dedicated ENCRYPTION_SECRET environment variable
 * or server-side secret keys (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SECRET_KEY, APP_SECRET).
 * Fails closed if missing in non-test environments.
 */
export function getMasterKey(keyId = CURRENT_KEY_ID): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.APP_SECRET

  if (!secret) {
    if (isTestEnvironment()) {
      return crypto.scryptSync('test_encryption_secret_key_32_chars_ok!', DEFAULT_SALT, 32)
    }
    throw new CredentialEncryptionError(
      'CREDENTIAL_NOT_CONFIGURED',
      'FAIL CLOSED: ENCRYPTION_SECRET or server secret key is required on server for credential encryption.'
    )
  }

  // Derive key using keyId context
  const salt = `${DEFAULT_SALT}-${keyId}`
  return crypto.scryptSync(secret, salt, 32)
}

/**
 * Returns candidate legacy keys for graceful migration of older v1 ciphertext
 */
function getLegacyKeyCandidates(): Buffer[] {
  const candidates: string[] = []

  if (process.env.ENCRYPTION_SECRET) candidates.push(process.env.ENCRYPTION_SECRET)
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) candidates.push(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (process.env.SUPABASE_SECRET_KEY) candidates.push(process.env.SUPABASE_SECRET_KEY)
  if (process.env.APP_SECRET) candidates.push(process.env.APP_SECRET)

  if (isTestEnvironment()) {
    candidates.push('test_encryption_secret_key_32_chars_ok!')
  }

  // Unique keys with original v1 salt
  const seen = new Set<string>()
  const keys: Buffer[] = []
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c)
      keys.push(crypto.scryptSync(c, DEFAULT_SALT, 32))
    }
  }
  return keys
}

/**
 * Encrypts a plaintext string using AES-256-GCM with versioned envelope
 * Returns serialized string format: `v2:<key-id>:<iv>:<auth-tag>:<encryptedData>`
 */
export function encryptSecret(plainText: string, keyId = CURRENT_KEY_ID): string {
  if (!plainText) return ''

  try {
    const key = getMasterKey(keyId)
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(plainText, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    return `v2:${keyId}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error: any) {
    if (error instanceof CredentialEncryptionError) {
      throw error
    }
    throw new CredentialEncryptionError(
      'CREDENTIAL_DECRYPTION_FAILED',
      `Failed to encrypt credentials: ${error?.message || 'Unknown error'}`
    )
  }
}

/**
 * Decrypts a ciphertext string supporting `v2:<key-id>:<iv>:<tag>:<data>`
 * and backwards-compatible `v1:<iv>:<tag>:<data>` with safe legacy migration
 */
export function decryptSecret(encryptedString: string): string {
  if (!encryptedString) return ''

  // If plain text (not encrypted)
  if (!encryptedString.startsWith('v1:') && !encryptedString.startsWith('v2:')) {
    return encryptedString
  }

  // Handle v2 format: v2:keyId:iv:authTag:data
  if (encryptedString.startsWith('v2:')) {
    const parts = encryptedString.split(':')
    if (parts.length !== 5) {
      throw new CredentialEncryptionError(
        'CREDENTIAL_FORMAT_INVALID',
        'Invalid v2 encrypted credential payload structure'
      )
    }

    const [, keyId, ivHex, authTagHex, cipherHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    try {
      const key = getMasterKey(keyId)
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
      decipher.setAuthTag(authTag)

      let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch (err: any) {
      if (err instanceof CredentialEncryptionError && err.code === 'CREDENTIAL_NOT_CONFIGURED') throw err

      // Attempt key rotation fallback candidates with this keyId
      const candidateSecrets: string[] = []
      if (process.env.ENCRYPTION_SECRET) candidateSecrets.push(process.env.ENCRYPTION_SECRET)
      if (process.env.ENCRYPTION_KEY) candidateSecrets.push(process.env.ENCRYPTION_KEY)
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) candidateSecrets.push(process.env.SUPABASE_SERVICE_ROLE_KEY)
      if (process.env.SUPABASE_SECRET_KEY) candidateSecrets.push(process.env.SUPABASE_SECRET_KEY)
      if (process.env.APP_SECRET) candidateSecrets.push(process.env.APP_SECRET)
      if (isTestEnvironment()) candidateSecrets.push('test_encryption_secret_key_32_chars_ok!')

      const salt = `${DEFAULT_SALT}-${keyId}`
      for (const candSecret of candidateSecrets) {
        try {
          const candKey = crypto.scryptSync(candSecret, salt, 32)
          const candDecipher = crypto.createDecipheriv(ALGORITHM, candKey, iv)
          candDecipher.setAuthTag(authTag)
          let dec = candDecipher.update(cipherHex, 'hex', 'utf8')
          dec += candDecipher.final('utf8')
          return dec
        } catch {
          // try next candidate
        }
      }

      throw new CredentialEncryptionError(
        'CREDENTIAL_KEY_MISMATCH',
        'Decryption failed: Unsupported state or unable to authenticate data'
      )
    }
  }

  // Handle legacy v1 format: v1:iv:authTag:data
  if (encryptedString.startsWith('v1:')) {
    const parts = encryptedString.split(':')
    if (parts.length !== 4) {
      throw new CredentialEncryptionError(
        'CREDENTIAL_FORMAT_INVALID',
        'Invalid v1 encrypted credential payload structure'
      )
    }

    const [, ivHex, authTagHex, cipherHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    // First try with v2 master key
    try {
      const primaryKey = getMasterKey(CURRENT_KEY_ID)
      const decipher = crypto.createDecipheriv(ALGORITHM, primaryKey, iv)
      decipher.setAuthTag(authTag)
      let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    } catch {
      // Primary key failed, try legacy candidates
    }

    // Attempt legacy keys
    const legacyKeys = getLegacyKeyCandidates()
    for (const legacyKey of legacyKeys) {
      try {
        const decipher = crypto.createDecipheriv(ALGORITHM, legacyKey, iv)
        decipher.setAuthTag(authTag)
        let decrypted = decipher.update(cipherHex, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      } catch {
        // try next candidate
      }
    }

    throw new CredentialEncryptionError(
      'CREDENTIAL_KEY_MISMATCH',
      'Decryption failed: Unsupported state or unable to authenticate data (legacy key mismatch)'
    )
  }

  return encryptedString
}

/**
 * Safely decrypts gateway credentials for server operations without throwing exceptions
 * Returns structured result indicating success, parsed credentials, or error details with needsReentry flag
 */
export function decryptGatewayCredentials(
  encryptedString?: string | null
): DecryptedCredentialsResult {
  if (!encryptedString || encryptedString.trim().length === 0) {
    return {
      success: false,
      credentials: {},
      error: 'CREDENTIAL_NOT_CONFIGURED',
      errorMessage: 'No credentials stored for this gateway',
      needsReentry: false,
      version: 'none',
    }
  }

  const isV2 = encryptedString.startsWith('v2:')
  const isV1 = encryptedString.startsWith('v1:')

  try {
    const decryptedStr = decryptSecret(encryptedString)
    if (!decryptedStr) {
      return {
        success: false,
        credentials: {},
        error: 'CREDENTIAL_NOT_CONFIGURED',
        needsReentry: false,
        version: 'none',
      }
    }

    let parsed: Record<string, string>
    try {
      parsed = JSON.parse(decryptedStr)
    } catch {
      return {
        success: false,
        credentials: {},
        error: 'CREDENTIAL_FORMAT_INVALID',
        errorMessage: 'Decrypted credentials are not formatted as valid JSON',
        needsReentry: true,
        version: isV2 ? 'v2' : isV1 ? 'v1' : 'plaintext',
      }
    }

    return {
      success: true,
      credentials: parsed,
      needsReentry: false,
      version: isV2 ? 'v2' : isV1 ? 'v1' : 'plaintext',
      shouldUpgrade: !isV2,
    }
  } catch (err: any) {
    const code: CredentialErrorCode =
      err instanceof CredentialEncryptionError ? err.code : 'CREDENTIAL_DECRYPTION_FAILED'

    return {
      success: false,
      credentials: {},
      error: code,
      errorMessage: err?.message || 'Unsupported state or unable to authenticate data',
      needsReentry: true,
      version: isV2 ? 'v2' : isV1 ? 'v1' : 'unknown',
    }
  }
}

/**
 * Masks a secret string for UI presentation (e.g. `sk_live_••••••••1234` or `••••••••••••`)
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
 * Sanitizes gateway records so encrypted credentials, passwords, and OAuth tokens are stripped or masked before returning to client
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
  if ('oauth_refresh_token' in clone) {
    delete (clone as any).oauth_refresh_token
  }
  if ('oauth_access_token' in clone) {
    delete (clone as any).oauth_access_token
  }
  if ('extra_settings' in clone && (clone as any).extra_settings && typeof (clone as any).extra_settings === 'object') {
    const extra = { ...(clone as any).extra_settings }
    delete extra.refresh_token
    delete extra.access_token
    delete extra.client_secret
    if (extra.api_key) {
      extra.api_key = maskCredential(extra.api_key)
    }
    ;(clone as any).extra_settings = extra
  }
  return clone
}
