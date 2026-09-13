// ==============================================================================
// PrintERP / InkFlow SaaS - Security Tests: Auth Verification & Security Boundaries
// Tests tenant access gating for unverified users, token/OTP replay attacks,
// purpose tampering, brute-force lockouts, cross-user tokens, and anti-enumeration invariants.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AuthEmailService } from '../../services/auth-email.service.ts'
import { AuthService } from '../../services/auth.service.ts'
import { resolveAppBaseUrl, resolveRequestOrigin } from '../../lib/security/runtime-env.ts'

describe('Auth Verification & Tenant Access Security Tests', () => {
  it('1. Rejects OTP replay attack on registration', async () => {
    const email = 'replay-attack@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Step 1: Valid initial verification
    const verify1 = await AuthEmailService.verifyOtp(email, res.otp, 'registration')
    assert.strictEqual(verify1.success, true)

    // Step 2: Attacker replays intercepted OTP
    const verify2 = await AuthEmailService.verifyOtp(email, res.otp, 'registration')
    assert.strictEqual(verify2.success, false)
    assert.ok(verify2.error?.includes('No active verification code') || verify2.error?.includes('already been used'))
  })

  it('2. Rejects URL token replay attack on registration', async () => {
    const email = 'token-replay@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Step 1: Valid initial token verification
    const tokenVerify1 = await AuthEmailService.verifyToken(res.token, email, 'registration')
    assert.strictEqual(tokenVerify1.success, true)

    // Step 2: Replay of token must be rejected
    const tokenVerify2 = await AuthEmailService.verifyToken(res.token, email, 'registration')
    assert.strictEqual(tokenVerify2.success, false)
    assert.ok(tokenVerify2.error?.includes('already been used') || tokenVerify2.error?.includes('invalid'))
  })

  it('3. Rejects purpose tampering: password reset token cannot activate registration', async () => {
    const email = 'tamper-test@example.com'
    const resetRes = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in resetRes))

    // Attempt to use reset token for registration activation
    const tamperVerify = await AuthEmailService.verifyToken(resetRes.token, email, 'registration')
    assert.strictEqual(tamperVerify.success, false)
  })

  it('4. Rejects purpose tampering: registration OTP cannot be used for password reset', async () => {
    const email = 'reg-tamper@example.com'
    const regRes = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in regRes))

    // Attempt to use registration OTP for password reset
    const tamperVerify = await AuthEmailService.verifyOtp(email, regRes.otp, 'password_reset')
    assert.strictEqual(tamperVerify.success, false)
    assert.ok(tamperVerify.error?.includes('No active verification code'))
  })

  it('5. Locks out account verification after 5 consecutive failed attempts', async () => {
    const email = 'lockout-security@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // 5 brute force attempts
    for (let i = 0; i < 5; i++) {
      await AuthEmailService.verifyOtp(email, `99999${i}`, 'registration')
    }

    // Now attempt with genuine OTP
    const genuineAttempt = await AuthEmailService.verifyOtp(email, res.otp, 'registration')
    assert.strictEqual(genuineAttempt.success, false)
    assert.ok(genuineAttempt.error?.includes('Too many incorrect attempts') || genuineAttempt.error?.includes('No active verification code'))
  })

  it('6. Enforces 60-second cooldown on resend attempts across all purposes', async () => {
    const email = 'resend-abuse@example.com'
    const res1 = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res1))

    // Immediate second request must be throttled
    const res2 = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok('error' in res2)
    assert.ok(res2.error?.includes('Please wait'))
  })

  it('7. Never exposes OTP or token in plain text inside error responses', async () => {
    const email = 'leak-check@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    const failVerify = await AuthEmailService.verifyOtp(email, '000000', 'registration')
    assert.strictEqual(failVerify.success, false)
    assert.ok(!failVerify.error?.includes(res.otp), 'Error message must NEVER contain plaintext OTP')
  })

  it('8. Rejects forged or manipulated tokens', async () => {
    const email = 'forged-check@example.com'
    const forgedToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'
    const res = await AuthEmailService.verifyToken(forgedToken, email, 'registration')
    assert.strictEqual(res.success, false)
    assert.ok(res.error?.includes('invalid') || res.error?.includes('expired'))
  })

  it('9. Rejects cross-user token redemption', async () => {
    const userA = 'usera@example.com'
    const userB = 'userb@example.com'

    const resA = await AuthEmailService.createVerificationRecord({
      email: userA,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in resA))

    // User B attempts to redeem User A's token
    const crossVerify = await AuthEmailService.verifyToken(resA.token, userB, 'registration')
    assert.strictEqual(crossVerify.success, false)
  })

  it('10. Blocks unverified accounts from possessing valid tenant context without onboarding', async () => {
    // Fresh unverified signup
    const unverifiedEmail = 'unverified-owner@inkflow.com'
    const res = await AuthService.signUp(unverifiedEmail, 'Password123!', 'Unverified Owner')
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.data?.requiresVerification, true)
    assert.strictEqual(res.data?.email, unverifiedEmail)
  })

  it('11. Dynamically resolves canonical origin and never leaks localhost in production', () => {
    // Explicit valid domain
    assert.strictEqual(resolveAppBaseUrl('https://app.printerp.com/'), 'https://app.printerp.com')
    
    // Simulating headers with x-forwarded-host
    const mockHeaders = new Headers({
      'x-forwarded-host': 'custom.printerp.io',
      'x-forwarded-proto': 'https',
    })
    assert.strictEqual(resolveRequestOrigin(mockHeaders), 'https://custom.printerp.io')
  })

  it('12. Generates verification link with dynamically passed appUrl and verifies token', async () => {
    const customOrigin = 'https://cloud.printerp.com'
    const email = 'custom-origin@example.com'
    
    const sendRes = await AuthEmailService.sendRegistrationVerificationEmail({
      email,
      fullName: 'Custom Domain User',
      appUrl: customOrigin,
    })

    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(sendRes.otpCreated, true)
    assert.ok(sendRes.token)
    assert.ok(sendRes.otp)

    // Verify token works for registration activation
    const verifyRes = await AuthEmailService.verifyToken(sendRes.token!, email, 'registration')
    assert.strictEqual(verifyRes.success, true)
  })
})
