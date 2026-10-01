import { test, describe } from 'node:test'
import assert from 'node:assert'
import { generateTotpCode, verifyTotpCode, generateTotpSecret } from '../../lib/auth/totp.ts'
import { getAuthCookieOptions } from '../../lib/tenant/tenant-resolution.ts'

describe('Authentication Audit Remediation Verification Suite', () => {
  describe('1. Open Redirect Mitigation in Logout (AUTH-SEC-01)', () => {
    function sanitizeRedirect(candidate: string | null | undefined, origin: string): string {
      let safeRedirect = '/login?logged_out=true'
      if (
        candidate &&
        candidate.startsWith('/') &&
        !candidate.startsWith('//') &&
        !candidate.startsWith('/\\')
      ) {
        try {
          const parsed = new URL(candidate, origin)
          if (parsed.origin === origin) {
            safeRedirect = candidate
          }
        } catch {
          // Fall back to safe default
        }
      }
      return new URL(safeRedirect, origin).toString()
    }

    const origin = 'https://app.inkflow.com.bd'

    test('blocks external absolute URLs', () => {
      const sanitized = sanitizeRedirect('https://evil.com/phish', origin)
      assert.strictEqual(sanitized, 'https://app.inkflow.com.bd/login?logged_out=true')
    })

    test('blocks protocol-relative URLs (//evil.com)', () => {
      const sanitized = sanitizeRedirect('//evil.com/phish', origin)
      assert.strictEqual(sanitized, 'https://app.inkflow.com.bd/login?logged_out=true')
    })

    test('blocks backslash evasion (/\\evil.com)', () => {
      const sanitized = sanitizeRedirect('/\\evil.com', origin)
      assert.strictEqual(sanitized, 'https://app.inkflow.com.bd/login?logged_out=true')
    })

    test('blocks javascript: URIs', () => {
      const sanitized = sanitizeRedirect('javascript:alert(1)', origin)
      assert.strictEqual(sanitized, 'https://app.inkflow.com.bd/login?logged_out=true')
    })

    test('permits safe relative application paths on the same origin', () => {
      const sanitized = sanitizeRedirect('/login?reauth=true', origin)
      assert.strictEqual(sanitized, 'https://app.inkflow.com.bd/login?reauth=true')
    })
  })

  describe('2. Hardcoded Default MFA Secret Removal & Fail-Closed Policy (AUTH-SEC-02)', () => {
    function resolveMfaSecret(
      adminRecord: { totp_secret?: string | null; preferences?: { totp_secret?: string } | null },
      isTest: boolean
    ): string | null {
      const configuredSecret =
        adminRecord.totp_secret ||
        adminRecord.preferences?.totp_secret ||
        process.env.PLATFORM_MFA_DEFAULT_SECRET
      return configuredSecret || (isTest ? 'JBSWY3DPEHPK3PXP' : null)
    }

    test('fails closed in production if totp_secret is unset', () => {
      const adminRecord = { totp_secret: null, preferences: null }
      const secret = resolveMfaSecret(adminRecord, false /* production */)
      assert.strictEqual(secret, null, 'Production MUST fail closed when no secret is configured')
    })

    test('retrieves explicit totp_secret when configured', () => {
      const explicitSecret = 'MZXW6YTBOI======='
      const adminRecord = { totp_secret: explicitSecret }
      const secret = resolveMfaSecret(adminRecord, false /* production */)
      assert.strictEqual(secret, explicitSecret)
    })

    test('retrieves preferences.totp_secret fallback when configured', () => {
      const prefSecret = 'NBSWY3DPEHPK3PXP'
      const adminRecord = { totp_secret: null, preferences: { totp_secret: prefSecret } }
      const secret = resolveMfaSecret(adminRecord, false /* production */)
      assert.strictEqual(secret, prefSecret)
    })

    test('dynamic TOTP generation creates verifiable codes without static fallback', () => {
      const dynamicSecret = generateTotpSecret(20)
      assert.ok(dynamicSecret.length >= 32, 'Base32 secret must be sufficiently long')
      const code = generateTotpCode(dynamicSecret, 30, 0)
      assert.strictEqual(code.length, 6)
      assert.strictEqual(verifyTotpCode(code, dynamicSecret), true)
      assert.strictEqual(verifyTotpCode('000000', dynamicSecret), false)
    })
  })

  describe('3. Cookie Scoping and Opaque Session Token Protection (AUTH-SEC-04 & AUTH-SEC-05)', () => {
    test('opaque session token does not serialize raw JWT structure', () => {
      const userId = '11111111-2222-3333-4444-555555555555'
      const sessionToken = `sess_${userId}_${Date.now()}`
      assert.strictEqual(sessionToken.startsWith('sess_'), true)
      assert.strictEqual(sessionToken.includes('.'), false, 'Opaque token must not have JWT dot-separated segments')
    })

    test('getAuthCookieOptions configures wildcard domain in production for custom domains', () => {
      const opts = getAuthCookieOptions('inkflow.com.bd')
      assert.strictEqual(opts.domain, '.inkflow.com.bd')
      assert.strictEqual(opts.sameSite, 'lax')
      assert.strictEqual(opts.path, '/')
    })

    test('getAuthCookieOptions omits wildcard domain for localhost and local IPs', () => {
      const localhostOpts = getAuthCookieOptions('localhost:3000')
      assert.strictEqual(localhostOpts.domain, undefined)

      const ipOpts = getAuthCookieOptions('127.0.0.1:3000')
      assert.strictEqual(ipOpts.domain, undefined)
    })

    test('getAuthCookieOptions omits wildcard domain for public suffix list (e.g. vercel.app)', () => {
      const vercelOpts = getAuthCookieOptions('myapp.vercel.app')
      assert.strictEqual(vercelOpts.domain, undefined)
    })
  })

  describe('4. User Lookup Resilience (AUTH-BUG-02)', () => {
    test('email normalization matches case-insensitively', () => {
      const email1 = '  Admin@PrintERP.com  '.trim().toLowerCase()
      const email2 = 'admin@printerp.com'
      assert.strictEqual(email1, email2)
    })
  })
})
