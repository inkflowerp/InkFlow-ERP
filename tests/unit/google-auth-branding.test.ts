// ==============================================================================
// PrintERP / InkFlow SaaS - Unit Tests: Google Auth Branding & Security Audit
// Tests direct domain Google OAuth initiation, HMAC-SHA256 CSRF protection,
// state expiration, ID token decoding, tenant resolution, and platform boundaries.
// ==============================================================================

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert'
import crypto from 'crypto'
import {
  getGoogleAuthClientConfig,
  generateGoogleAuthState,
  verifyGoogleAuthState,
  generateGoogleAuthSignInUrl,
  verifyGoogleTokenIdentity,
  authenticateGoogleUser,
  getGoogleAuthBrandingDiagnostics,
  type GoogleAuthStatePayload,
  type GoogleVerifiedIdentity,
} from '../../lib/auth/google-auth.ts'
import { TenantRepository } from '../../lib/repositories/tenant.repository.ts'
import { getTenantLink } from '../../lib/tenant/tenant-url.ts'

describe('Google Auth Branding & Security Audit Tests', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.ENCRYPTION_SECRET = 'test-secret-for-hmac-sha256-google-auth'
    process.env.NEXT_PUBLIC_APP_URL = 'https://inkflowerp.com'
    ;(process.env as any).NODE_ENV = 'test'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('1. Detects missing or placeholder Google credentials and reports fallback mode', () => {
    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

    const config = getGoogleAuthClientConfig('https://inkflowerp.com')
    assert.strictEqual(config.isConfigured, false)
    assert.strictEqual(config.hasClientId, false)
    assert.strictEqual(config.hasClientSecret, false)
    assert.strictEqual(config.mode, 'supabase_default')
    assert.strictEqual(config.redirectUri, 'https://inkflowerp.com/api/auth/google/callback')
  })

  it('2. Detects configured Google OAuth credentials and enables direct domain mode', () => {
    process.env.GOOGLE_CLIENT_ID = '1234567890-test.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-Secret123'

    const config = getGoogleAuthClientConfig('https://inkflowerp.com')
    assert.strictEqual(config.isConfigured, true)
    assert.strictEqual(config.hasClientId, true)
    assert.strictEqual(config.hasClientSecret, true)
    assert.strictEqual(config.mode, 'direct_domain')
    assert.strictEqual(config.redirectUri, 'https://inkflowerp.com/api/auth/google/callback')
  })

  it('3. generateGoogleAuthSignInUrl uses the application domain redirect URI and never leaks client secret', () => {
    process.env.GOOGLE_CLIENT_ID = '1234567890-test.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-Secret123'

    const { url, state } = generateGoogleAuthSignInUrl({
      origin: 'https://inkflowerp.com',
      next: '/speedy-print/orders',
      prompt: 'select_account',
    })

    const parsedUrl = new URL(url)
    assert.strictEqual(parsedUrl.origin, 'https://accounts.google.com')
    assert.strictEqual(parsedUrl.pathname, '/o/oauth2/v2/auth')
    assert.strictEqual(parsedUrl.searchParams.get('client_id'), '1234567890-test.apps.googleusercontent.com')
    assert.strictEqual(parsedUrl.searchParams.get('redirect_uri'), 'https://inkflowerp.com/api/auth/google/callback')
    assert.strictEqual(parsedUrl.searchParams.get('response_type'), 'code')
    assert.strictEqual(parsedUrl.searchParams.get('prompt'), 'select_account')
    assert.strictEqual(parsedUrl.searchParams.get('scope'), 'openid email profile')
    assert.strictEqual(parsedUrl.searchParams.get('state'), state)

    // Security: Secret must NEVER be present in authorization URL
    assert.strictEqual(parsedUrl.searchParams.get('client_secret'), null)
    assert.ok(!url.includes('GOCSPX-Secret123'))
  })

  it('4. Generates and verifies cryptographic HMAC-SHA256 OAuth state', () => {
    const state = generateGoogleAuthState({
      next: '/speedy-print/dashboard',
      purpose: 'login',
      sourceOrigin: 'https://inkflowerp.com',
    })

    assert.ok(state.includes('.'))
    const verified = verifyGoogleAuthState(state)
    assert.ok(verified)
    assert.strictEqual(verified?.next, '/speedy-print/dashboard')
    assert.strictEqual(verified?.purpose, 'login')
    assert.strictEqual(verified?.sourceOrigin, 'https://inkflowerp.com')
    assert.ok(verified?.nonce)
  })

  it('5. Rejects tampered OAuth state payload or altered signature', () => {
    const validState = generateGoogleAuthState({
      next: '/speedy-print/dashboard',
      purpose: 'login',
    })

    const [payloadB64, sig] = validState.split('.')
    const rawPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))

    // Tamper with payload (attacker attempts redirection hijack)
    const tamperedPayload = { ...rawPayload, next: 'https://evil-site.com' }
    const tamperedB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url')
    const tamperedState = `${tamperedB64}.${sig}`

    assert.strictEqual(verifyGoogleAuthState(tamperedState), null)

    // Tamper with signature
    assert.strictEqual(verifyGoogleAuthState(`${payloadB64}.forged_sig`), null)
  })

  it('6. Rejects expired OAuth state older than 10 minutes', () => {
    const expiredPayload: GoogleAuthStatePayload = {
      next: '/dashboard',
      purpose: 'login',
      ts: Date.now() - 15 * 60 * 1000, // 15 minutes ago
      nonce: 'expired-nonce',
    }

    const serialized = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url')
    const hmac = crypto
      .createHmac('sha256', process.env.ENCRYPTION_SECRET!)
      .update(serialized)
      .digest('base64url')

    const expiredState = `${serialized}.${hmac}`
    assert.strictEqual(verifyGoogleAuthState(expiredState), null)
  })

  it('7. verifyGoogleTokenIdentity extracts identity from simulated ID token payload', async () => {
    const dummyHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const dummyPayload = Buffer.from(
      JSON.stringify({
        sub: 'google-sub-12345',
        email: 'kamrul@gmail.com',
        email_verified: true,
        name: 'Kamrul Islam',
        picture: 'https://lh3.googleusercontent.com/a/avatar.jpg',
      })
    ).toString('base64url')
    const dummySignature = 'dummy_sig'

    const idToken = `${dummyHeader}.${dummyPayload}.${dummySignature}`

    const res = await verifyGoogleTokenIdentity({
      access_token: 'dummy_access_token',
      id_token: idToken,
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'openid email profile',
    })

    assert.strictEqual(res.success, true)
    assert.strictEqual(res.data?.sub, 'google-sub-12345')
    assert.strictEqual(res.data?.email, 'kamrul@gmail.com')
    assert.strictEqual(res.data?.email_verified, true)
    assert.strictEqual(res.data?.name, 'Kamrul Islam')
  })

  it('8. authenticateGoogleUser routes existing tenant user directly to workspace dashboard', async () => {
    const identity: GoogleVerifiedIdentity = {
      sub: 'google-sub-member-1',
      email: 'member@speedyprint.com',
      email_verified: true,
      name: 'Speedy Member',
    }

    const origResolve = (TenantRepository as any).resolveUserMembership
    try {
      (TenantRepository as any).resolveUserMembership = async (userId: string) => {
        return {
          company: {
            id: 'comp-speedy',
            name: 'Speedy Print Shop',
            slug: 'speedy-print',
            is_active: true,
          },
          companyUser: {
            id: 'cu-1',
            user_id: userId,
            company_id: 'comp-speedy',
            status: 'active',
            profile: {
              full_name: 'Speedy Member',
            },
          },
          effectivePermissions: ['order.view', 'order.create'],
          primaryRole: 'business_owner',
        }
      }

      const res = await authenticateGoogleUser(identity)
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.data?.requiresOnboarding, false)
      assert.strictEqual(res.data?.destinationUrl, getTenantLink('speedy-print', '/dashboard'))
      assert.strictEqual(res.data?.session?.companySlug, 'speedy-print')
    } finally {
      (TenantRepository as any).resolveUserMembership = origResolve
    }
  })

  it('9. authenticateGoogleUser routes new Google user to onboarding with active session', async () => {
    const identity: GoogleVerifiedIdentity = {
      sub: 'google-sub-newuser-99',
      email: 'newowner@gmail.com',
      email_verified: true,
      name: 'New Owner',
    }

    const origResolve = (TenantRepository as any).resolveUserMembership
    try {
      (TenantRepository as any).resolveUserMembership = async () => null

      const res = await authenticateGoogleUser(identity)
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.data?.requiresOnboarding, true)
      assert.strictEqual(res.data?.destinationUrl, '/onboarding')
      assert.strictEqual(res.data?.session?.userEmail, 'newowner@gmail.com')
      assert.strictEqual(res.data?.isNewUser, true)
    } finally {
      (TenantRepository as any).resolveUserMembership = origResolve
    }
  })

  it('10. getGoogleAuthBrandingDiagnostics returns actionable branding report', () => {
    process.env.GOOGLE_CLIENT_ID = '1234567890-test.apps.googleusercontent.com'
    process.env.GOOGLE_CLIENT_SECRET = 'GOCSPX-Secret123'
    process.env.NEXT_PUBLIC_APP_URL = 'https://inkflowerp.com'

    const diag = getGoogleAuthBrandingDiagnostics('https://inkflowerp.com')
    assert.strictEqual(diag.isDirectDomainActive, true)
    assert.strictEqual(diag.isBranded, true)
    assert.strictEqual(diag.domainDisplayedToUser, 'inkflowerp.com')
    assert.strictEqual(diag.redirectUri, 'https://inkflowerp.com/api/auth/google/callback')
  })
})
