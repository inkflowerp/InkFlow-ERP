// ==============================================================================
// PrintERP / InkFlow SaaS - Unit Tests: Password Reset Flow & Security
// Tests anti-enumeration, OTP verification, reset authorization, token expiry,
// and password change invariants.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AuthService } from '../../services/auth.service.ts'
import { AuthEmailService } from '../../services/auth-email.service.ts'

describe('Password Reset Flow & Anti-Enumeration Unit Tests', () => {
  it('1. Enforces email anti-enumeration protection on forgotPassword', async () => {
    // Test with non-existent email
    const nonExistentEmail = 'nonexistent_user_999@inkflow-fake.com'
    const res1 = await AuthService.forgotPassword(nonExistentEmail)

    assert.strictEqual(res1.success, true)
    assert.strictEqual(
      res1.message,
      'If an account exists for this email address, we have sent password reset instructions.'
    )

    // Test with standard email format
    const validEmail = 'owner@inkflow.com'
    const res2 = await AuthService.forgotPassword(validEmail)

    assert.strictEqual(res2.success, true)
    assert.strictEqual(
      res2.message,
      'If an account exists for this email address, we have sent password reset instructions.'
    )
  })

  it('2. Rejects password reset with invalid or unverified OTP', async () => {
    const email = 'test-pwd-reset@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Attempt verification with wrong OTP
    const invalidVerify = await AuthService.verifyPasswordResetOtp(email, '999999')
    assert.strictEqual(invalidVerify.success, false)
    assert.ok(invalidVerify.error?.includes('Incorrect') || invalidVerify.error?.includes('attempt(s) remaining'))
  })

  it('3. Successfully verifies valid OTP and issues reset authorization token', async () => {
    const email = 'valid-pwd-reset@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    const verifyRes = await AuthService.verifyPasswordResetOtp(email, res.otp)
    assert.strictEqual(verifyRes.success, true)
    assert.ok(verifyRes.data?.resetToken, 'Reset authorization token must be returned')
  })

  it('4. Rejects short or weak passwords on confirmation', async () => {
    const email = 'short-pwd@example.com'
    const res = await AuthService.confirmPasswordReset(email, 'fake-token', '123')
    assert.strictEqual(res.success, false)
    assert.ok(res.error?.includes('at least 6 characters'))
  })

  it('5. Rejects password reset when forged or fake reset authorization token is used', async () => {
    const email = 'forged-token@example.com'
    const forgedToken = '0000000000000000000000000000000000000000000000000000000000000000'
    const res = await AuthService.confirmPasswordReset(email, forgedToken, 'NewSecurePass123!')
    assert.strictEqual(res.success, false)
    assert.ok(res.error?.includes('expired') || res.error?.includes('Invalid'))
  })

  it('6. Successfully confirms password reset with valid reset authorization token', async () => {
    const email = 'complete-flow@example.com'
    const res = await AuthEmailService.createVerificationRecord({
      email,
      purpose: 'password_reset',
      ttlSeconds: 600,
    })
    assert.ok(!('error' in res))

    // Verify OTP
    const verifyRes = await AuthService.verifyPasswordResetOtp(email, res.otp)
    assert.strictEqual(verifyRes.success, true)
    const resetToken = verifyRes.data?.resetToken
    assert.ok(resetToken)

    // Confirm password update
    const confirmRes = await AuthService.confirmPasswordReset(email, resetToken, 'BrandNewPass2026!')
    assert.strictEqual(confirmRes.success, true)
    assert.ok(confirmRes.message?.includes('updated successfully'))

    // Replay with the same resetToken must now be rejected
    const replayRes = await AuthService.confirmPasswordReset(email, resetToken, 'AnotherPass2026!')
    assert.strictEqual(replayRes.success, false)
  })
})
