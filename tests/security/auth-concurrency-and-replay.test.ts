import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AuthEmailService } from '../../services/auth-email.service.ts'

describe('Auth Concurrency, Race Condition & Replay Security Tests', () => {
  const testEmail = 'concurrency_victim@printerp.test'

  it('1. High-burst concurrent OTP redemption (10 simultaneous requests) allows exactly ONE success', async () => {
    // Generate valid OTP
    const res = await AuthEmailService.createVerificationRecord({
      email: testEmail,
      purpose: 'registration',
    })

    assert.ok('otp' in res)
    assert.ok('record' in res)
    const { otp, record } = res
    assert.strictEqual(record.email, testEmail)

    // Launch 10 simultaneous verification requests using the exact same OTP
    const concurrentRequests = Array.from({ length: 10 }).map(() =>
      AuthEmailService.verifyOtp(testEmail, otp!, 'registration')
    )

    const results = await Promise.all(concurrentRequests)

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    // Invariant: Exactly one request must succeed, all other 9 must fail
    assert.strictEqual(successes.length, 1, `Expected exactly 1 success, got ${successes.length}`)
    assert.strictEqual(failures.length, 9, `Expected exactly 9 failures, got ${failures.length}`)

    // Any subsequent redemption request must also fail
    const subsequentAttempt = await AuthEmailService.verifyOtp(testEmail, otp!, 'registration')
    assert.strictEqual(subsequentAttempt.success, false)
    assert.ok(subsequentAttempt.error)
  })

  it('2. Concurrent URL verification token redemption allows exactly ONE success', async () => {
    // Generate valid token
    const res = await AuthEmailService.createVerificationRecord({
      email: 'link_victim@printerp.test',
      purpose: 'registration',
    })

    assert.ok('token' in res)
    assert.ok('record' in res)
    const { token, record } = res

    // Launch 5 simultaneous requests with the same token
    const concurrentRequests = Array.from({ length: 5 }).map(() =>
      AuthEmailService.verifyToken(token!, 'link_victim@printerp.test', 'registration')
    )

    const results = await Promise.all(concurrentRequests)

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    assert.strictEqual(successes.length, 1, `Expected exactly 1 success, got ${successes.length}`)
    assert.strictEqual(failures.length, 4, `Expected exactly 4 failures, got ${failures.length}`)

    // Subsequent call must fail
    const replayAttempt = await AuthEmailService.verifyToken(token!, 'link_victim@printerp.test', 'registration')
    assert.strictEqual(replayAttempt.success, false)
  })

  it('3. Concurrent password reset authorization token redemption allows exactly ONE success', async () => {
    // First, create and verify a password_reset OTP to get a real reset authorization token
    const res = await AuthEmailService.createVerificationRecord({
      email: 'pwd_reset_victim@printerp.test',
      purpose: 'password_reset',
    })

    assert.ok('otp' in res)
    const { otp } = res

    const verifyResult = await AuthEmailService.verifyOtp('pwd_reset_victim@printerp.test', otp!, 'password_reset')
    assert.strictEqual(verifyResult.success, true)
    assert.ok(verifyResult.resetToken)

    const resetToken = verifyResult.resetToken!

    // Launch 4 simultaneous requests attempting to consume the reset authorization token
    const concurrentResetRequests = Array.from({ length: 4 }).map(() =>
      AuthEmailService.validateResetAuthorization('pwd_reset_victim@printerp.test', resetToken)
    )

    const results = await Promise.all(concurrentResetRequests)

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    assert.strictEqual(successes.length, 1, `Expected exactly 1 success, got ${successes.length}`)
    assert.strictEqual(failures.length, 3, `Expected exactly 3 failures, got ${failures.length}`)

    // Replay attempt must fail
    const replayReset = await AuthEmailService.validateResetAuthorization('pwd_reset_victim@printerp.test', resetToken)
    assert.strictEqual(replayReset.success, false)
    assert.ok(replayReset.error)
  })

  it('4. Concurrent multi-purpose attack: Registration OTP cannot be hijacked concurrently for Password Reset', async () => {
    const res = await AuthEmailService.createVerificationRecord({
      email: 'multi_purpose@printerp.test',
      purpose: 'registration',
    })

    assert.ok('otp' in res)
    const { otp } = res

    // Simultaneously attempt registration verification and password reset verification
    const [regResult, resetResult] = await Promise.all([
      AuthEmailService.verifyOtp('multi_purpose@printerp.test', otp!, 'registration'),
      AuthEmailService.verifyOtp('multi_purpose@printerp.test', otp!, 'password_reset'),
    ])

    // Registration must succeed
    assert.strictEqual(regResult.success, true)
    // Password reset must fail due to purpose isolation
    assert.strictEqual(resetResult.success, false)
  })
})
