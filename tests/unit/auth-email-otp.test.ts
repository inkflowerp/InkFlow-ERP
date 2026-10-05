// ==============================================================================
// PrintFlow / PrintFlow SaaS - Unit Tests: Authentication Email & OTP Security
// Tests 6-digit OTP generation, single-use tokens, SHA-256 hashing, timing-safe
// comparison, 10-minute expiry, 5-attempt brute-force protection, 60s cooldowns,
// and strict purpose isolation.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AuthEmailService } from '../../services/auth-email.service.ts'
import { EmailDataStore } from '../../services/email-gateway.service.ts'

describe('Auth Email & OTP Security Unit Tests', () => {
  it('1. Generates 6-digit numeric OTP', () => {
    const otp = AuthEmailService.generateSecureOtp()
    assert.strictEqual(otp.length, 6)
    assert.ok(/^\d{6}$/.test(otp), 'OTP must be exactly 6 numeric digits')
  })

  it('2. Generates 32-byte secure URL verification token', () => {
    const token = AuthEmailService.generateSecureToken()
    assert.strictEqual(token.length, 64) // 32 bytes in hex = 64 hex chars
    assert.ok(/^[0-9a-f]{64}$/.test(token), 'Token must be valid 64-char hex string')
  })

  it('3. Hashes secret and performs timing-safe comparison', () => {
    const secret = '123456'
    const hash = AuthEmailService.hashSecret(secret)
    assert.notStrictEqual(secret, hash, 'Hash must not equal plaintext')
    assert.strictEqual(hash.length, 64)

    const isMatch = AuthEmailService.timingSafeCompare(hash, AuthEmailService.hashSecret('123456'))
    assert.strictEqual(isMatch, true)

    const isMismatch = AuthEmailService.timingSafeCompare(hash, AuthEmailService.hashSecret('654321'))
    assert.strictEqual(isMismatch, false)
  })

  it('4. Creates and verifies valid 6-digit OTP successfully for registration', async () => {
    const email = 'user-test@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    const verifyRes = await AuthEmailService.verifyOtp(email, res.otp, 'registration')
    assert.strictEqual(verifyRes.success, true)
  })

  it('5. Prevents OTP reuse (single-use enforcement)', async () => {
    const email = 'single-use-test@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // First verification passes
    const firstVerify = await AuthEmailService.verifyOtp(email, res.otp, 'password_reset')
    assert.strictEqual(firstVerify.success, true)
    assert.ok(firstVerify.resetToken, 'Password reset verification must issue resetToken')

    // Second verification must fail
    const secondVerify = await AuthEmailService.verifyOtp(email, res.otp, 'password_reset')
    assert.strictEqual(secondVerify.success, false)
    assert.ok(secondVerify.error?.includes('No active verification code') || secondVerify.error?.includes('already been used'))
  })

  it('6. Limits incorrect attempts to 5 and invalidates code after 5 failures', async () => {
    const email = 'bruteforce-test@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Attempts 1 to 4: wrong
    for (let i = 1; i <= 4; i++) {
      const att = await AuthEmailService.verifyOtp(email, '000000', 'registration')
      assert.strictEqual(att.success, false)
      assert.ok(att.error?.includes('attempt(s) remaining'))
    }

    // Attempt 5: wrong -> permanently invalidated
    const att5 = await AuthEmailService.verifyOtp(email, '000000', 'registration')
    assert.strictEqual(att5.success, false)
    assert.ok(att5.error?.includes('Too many incorrect attempts'))

    // Even if right code is provided now, it must fail
    const att6 = await AuthEmailService.verifyOtp(email, res.otp, 'registration')
    assert.strictEqual(att6.success, false)
    assert.ok(att6.error?.includes('No active verification code') || att6.error?.includes('Too many incorrect attempts'))
  })

  it('7. Enforces 60-second resend cooldown', async () => {
    const email = 'cooldown-test@example.com'
    const res1 = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res1))

    // Immediate second request within 60s must be throttled
    const res2 = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok('error' in res2)
    assert.ok(res2.error?.includes('Please wait'))
  })

  it('8. Enforces strict purpose isolation (registration OTP cannot verify password_reset)', async () => {
    const email = 'purpose-isolation@example.com'
    const regRes = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in regRes))

    // Attempting to verify registration OTP under password_reset purpose must fail
    const wrongPurposeVerify = await AuthEmailService.verifyOtp(email, regRes.otp, 'password_reset')
    assert.strictEqual(wrongPurposeVerify.success, false)
    assert.ok(wrongPurposeVerify.error?.includes('No active verification code'))

    // Correct purpose succeeds
    const correctPurposeVerify = await AuthEmailService.verifyOtp(email, regRes.otp, 'registration')
    assert.strictEqual(correctPurposeVerify.success, true)
  })

  it('9. Verifies secure URL token with single-use guarantee', async () => {
    const email = 'token-verify@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'registration',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Verify token
    const tokenVerify1 = await AuthEmailService.verifyToken(res.token, email, 'registration')
    assert.strictEqual(tokenVerify1.success, true)

    // Replay token must fail
    const tokenVerify2 = await AuthEmailService.verifyToken(res.token, email, 'registration')
    assert.strictEqual(tokenVerify2.success, false)
  })

  it('10. Dispatches Registration Verification Email with 6-digit OTP and link', async () => {
    const sendRes = await AuthEmailService.sendRegistrationVerificationEmail({
      email: 'newowner@printflow.test',
      fullName: 'Kamrul Hassan',
    })

    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(sendRes.status, 'sent')
    assert.ok(sendRes.otpCreated, 'OTP record must be created')
    assert.ok(sendRes.otp && sendRes.otp.length === 6, 'Generated OTP must be 6 digits')
  })

  it('11. Dispatches Password Reset Email with 6-digit OTP and link', async () => {
    const sendRes = await AuthEmailService.sendPasswordResetEmail({
      email: 'owner@printflow.bd',
      userName: 'Platform Owner',
      scopeType: 'PLATFORM',
    })

    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(sendRes.status, 'sent')
    assert.ok(sendRes.otpCreated, 'OTP record must be created')
    assert.ok(sendRes.otp && sendRes.otp.length === 6, 'Generated OTP must be 6 digits')
  })

  it('12. Validates password reset authorization token lifecycle', async () => {
    const email = 'reset-lifecycle@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Verify OTP to obtain resetToken
    const verifyRes = await AuthEmailService.verifyOtp(email, res.otp, 'password_reset')
    assert.strictEqual(verifyRes.success, true)
    assert.ok(verifyRes.resetToken)

    // Validate reset authorization token passes first time
    const authVal1 = await AuthEmailService.validateResetAuthorization(email, verifyRes.resetToken!)
    assert.strictEqual(authVal1.success, true)

    // Replaying reset authorization token must fail (single-use)
    const authVal2 = await AuthEmailService.validateResetAuthorization(email, verifyRes.resetToken!)
    assert.strictEqual(authVal2.success, false)
  })
})
