import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import crypto from 'crypto'
import {
  getGoogleOAuthDiagnostics,
  getGoogleOAuthConfig,
  generateGoogleAuthUrl,
  generateGoogleOAuthState,
  verifyGoogleOAuthState,
  generateOAuthState,
  verifyOAuthState,
  getOAuthErrorMessage,
  type GoogleOAuthStatePayload,
} from '../../lib/email/oauth/google-oauth.ts'

describe('Google OAuth Configuration & Security Audit Tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('1. Correctly diagnoses missing Google OAuth credentials in environment', () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.GOOGLE_GMAIL_REDIRECT_URI

    const diag = getGoogleOAuthDiagnostics()
    assert.strictEqual(diag.isConfigured, false)
    assert.strictEqual(diag.hasClientId, false)
    assert.strictEqual(diag.hasClientSecret, false)
    assert.ok(diag.issues.length >= 2)
    assert.ok(diag.redirectUri.includes('/api/email/oauth/google/callback'))
  })

  it('2. Correctly identifies mock/placeholder Google credentials as unconfigured', () => {
    process.env.GOOGLE_CLIENT_ID = 'mock-google-client-id.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'mock-google-client-secret'

    const diag = getGoogleOAuthDiagnostics()
    assert.strictEqual(diag.isConfigured, false)
    assert.strictEqual(diag.hasClientId, false)
    assert.strictEqual(diag.hasClientSecret, false)
    assert.ok(diag.issues.some((i) => i.includes('placeholder')))
  })

  it('3. Correctly validates valid Google OAuth credentials', () => {
    process.env.GOOGLE_CLIENT_ID = '1234567890-abcdef.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-ValidSecret12345'
    process.env.GOOGLE_GMAIL_REDIRECT_URI = 'https://app.printerp.com/api/email/oauth/google/callback'

    const diag = getGoogleOAuthDiagnostics()
    assert.strictEqual(diag.isConfigured, true)
    assert.strictEqual(diag.hasClientId, true)
    assert.strictEqual(diag.hasClientSecret, true)
    assert.strictEqual(diag.hasRedirectUri, true)
    assert.strictEqual(diag.redirectUri, 'https://app.printerp.com/api/email/oauth/google/callback')
    assert.strictEqual(diag.issues.length, 0)
  })

  it('4. Canonical redirect URI resolution fallback hierarchy works correctly', () => {
    delete process.env.GOOGLE_GMAIL_REDIRECT_URI

    // Test NEXT_PUBLIC_APP_URL fallback
    process.env.NEXT_PUBLIC_APP_URL = 'https://custom-erp.com'
    let diag = getGoogleOAuthDiagnostics()
    assert.strictEqual(diag.redirectUri, 'https://custom-erp.com/api/email/oauth/google/callback')

    // Test localhost fallback
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.VERCEL_URL
    diag = getGoogleOAuthDiagnostics()
    assert.strictEqual(diag.redirectUri, 'http://localhost:3000/api/email/oauth/google/callback')
  })

  it('5. generateGoogleAuthUrl constructs standard RFC-compliant Google OAuth URL', () => {
    process.env.GOOGLE_CLIENT_ID = '9876543210-xyz.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-SecretForTesting'
    process.env.GOOGLE_GMAIL_REDIRECT_URI = 'https://app.printerp.com/api/email/oauth/google/callback'

    const authUrlString = generateGoogleAuthUrl({
      scopeType: 'TENANT',
      tenantId: 'tenant-test-456',
      userId: 'usr-admin-1',
    })
    const authUrl = new URL(authUrlString)

    assert.strictEqual(authUrl.origin, 'https://accounts.google.com')
    assert.strictEqual(authUrl.pathname, '/o/oauth2/v2/auth')
    assert.strictEqual(authUrl.searchParams.get('client_id'), '9876543210-xyz.apps.googleusercontent.com')
    assert.strictEqual(authUrl.searchParams.get('response_type'), 'code')
    assert.strictEqual(authUrl.searchParams.get('access_type'), 'offline')
    assert.strictEqual(authUrl.searchParams.get('prompt'), 'consent')
    assert.ok(authUrl.searchParams.get('scope')?.includes('https://www.googleapis.com/auth/gmail.send'))
    assert.strictEqual(authUrl.searchParams.get('redirect_uri'), 'https://app.printerp.com/api/email/oauth/google/callback')
    assert.ok(authUrl.searchParams.get('state'))

    // CRITICAL SECURITY: Never leak client_secret in URL!
    assert.strictEqual(authUrl.searchParams.get('client_secret'), null)
    assert.ok(!authUrlString.includes('GOCSPX-SecretForTesting'))
  })

  it('6. HMAC-SHA256 OAuth state generation & timing-safe verification', () => {
    process.env.OAUTH_STATE_SECRET = 'super-secret-hmac-key-for-inkflow-testing'

    const stateString = generateOAuthState({
      tenantId: 'tenant-secure-789',
      userId: 'usr-owner-9',
      scopeType: 'TENANT',
    })
    assert.ok(stateString.includes('.'))

    const verified = verifyOAuthState(stateString)
    assert.ok(verified)
    assert.strictEqual(verified?.tenantId, 'tenant-secure-789')
    assert.strictEqual(verified?.userId, 'usr-owner-9')
    assert.strictEqual(verified?.scopeType, 'TENANT')
    assert.ok(verified?.nonce)
  })

  it('7. Rejects tampered state payload or signature', () => {
    process.env.OAUTH_STATE_SECRET = 'super-secret-hmac-key-for-inkflow-testing'

    const validState = generateOAuthState({
      tenantId: 'tenant-legit',
      userId: 'usr-1',
      scopeType: 'TENANT',
    })
    const [payloadB64, sig] = validState.split('.')

    // Tamper with payload (change tenant to tenant-attacker)
    const originalJson = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    const tamperedPayloadObj = { ...originalJson, tenantId: 'tenant-attacker' }
    const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString('base64url')
    const tamperedState = `${tamperedPayloadB64}.${sig}`

    assert.strictEqual(verifyOAuthState(tamperedState), null)

    // Tamper with signature
    const badSigState = `${payloadB64}.invalidsignature12345`
    assert.strictEqual(verifyOAuthState(badSigState), null)
  })

  it('8. Rejects expired state (>10 minutes old)', () => {
    process.env.OAUTH_STATE_SECRET = 'super-secret-hmac-key-for-inkflow-testing'

    const expiredTimestamp = Date.now() - (15 * 60 * 1000) // 15 minutes ago
    const expiredPayload: GoogleOAuthStatePayload = {
      tenantId: 'tenant-1',
      userId: 'usr-1',
      scopeType: 'TENANT',
      nonce: 'nonce-expired',
      ts: expiredTimestamp,
    }

    // Manually serialize and sign expired state to test verification expiration check
    const serialized = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')
    const hmac = crypto
      .createHmac('sha256', process.env.OAUTH_STATE_SECRET!)
      .update(serialized)
      .digest('base64url')
    const expiredState = `${serialized}.${hmac}`

    assert.strictEqual(verifyOAuthState(expiredState), null)
  })

  it('9. Maps Google OAuth error query parameters to actionable safe messages', () => {
    const invalidClientMsg = getOAuthErrorMessage('invalid_client')
    assert.ok(invalidClientMsg.includes('Client ID') || invalidClientMsg.includes('configured'))
    assert.ok(!invalidClientMsg.includes('secret_key_leak'))

    const redirectMismatchMsg = getOAuthErrorMessage('redirect_uri_mismatch')
    assert.ok(redirectMismatchMsg.includes('redirect URI') || redirectMismatchMsg.includes('Google Cloud'))

    const accessDeniedMsg = getOAuthErrorMessage('access_denied')
    assert.ok(accessDeniedMsg.includes('cancelled') || accessDeniedMsg.includes('declined'))

    const missingIdMsg = getOAuthErrorMessage('google_client_id_missing')
    assert.ok(missingIdMsg.includes('GOOGLE_CLIENT_ID'))
  })
})
