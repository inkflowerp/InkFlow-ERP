// ==============================================================================
// PrintERP SaaS - Unit Tests: Authentication Email & OTP Security
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { AuthEmailService } from '../../services/auth-email.service.ts'
import { EmailDataStore } from '../../services/email-gateway.service.ts'

describe('Auth Email & OTP Security Unit Tests', () => {
  it('1. Generates 6-digit numeric OTP', () => {
    const otp = AuthEmailService.generateSecureOtp()
    assert.strictEqual(otp.length, 6)
    assert.ok(/^\d{6}$/.test(otp), 'OTP must be 6 digits')
  })

  it('2. Creates and verifies valid OTP successfully', () => {
    const email = 'user-test@example.com'
    const res = AuthEmailService.createOtpRecord(email, 'verification', 300)
    assert.ok(!('error' in res))

    const verifyRes = AuthEmailService.verifyOtp(email, res.otp, 'verification')
    assert.strictEqual(verifyRes.success, true)
  })

  it('3. Prevents OTP reuse (single-use enforcement)', () => {
    const email = 'single-use@example.com'
    const res = AuthEmailService.createOtpRecord(email, 'password_reset', 300)
    assert.ok(!('error' in res))

    // First verification passes
    const firstVerify = AuthEmailService.verifyOtp(email, res.otp, 'password_reset')
    assert.strictEqual(firstVerify.success, true)

    // Second verification must fail
    const secondVerify = AuthEmailService.verifyOtp(email, res.otp, 'password_reset')
    assert.strictEqual(secondVerify.success, false)
    assert.ok(secondVerify.error?.includes('No active verification code') || secondVerify.error?.includes('already been used'))
  })

  it('4. Limits incorrect attempts to 3 and invalidates after threshold', () => {
    const email = 'bruteforce-test@example.com'
    const res = AuthEmailService.createOtpRecord(email, 'login_2fa', 300)
    assert.ok(!('error' in res))

    // Attempt 1: wrong
    const att1 = AuthEmailService.verifyOtp(email, '000000', 'login_2fa')
    assert.strictEqual(att1.success, false)
    assert.ok(att1.error?.includes('2 attempt(s) remaining'))

    // Attempt 2: wrong
    const att2 = AuthEmailService.verifyOtp(email, '111111', 'login_2fa')
    assert.strictEqual(att2.success, false)
    assert.ok(att2.error?.includes('1 attempt(s) remaining'))

    // Attempt 3: wrong -> invalidated
    const att3 = AuthEmailService.verifyOtp(email, '222222', 'login_2fa')
    assert.strictEqual(att3.success, false)
    assert.ok(att3.error?.includes('Maximum attempts exceeded'))

    // Even if right code is provided now, it must fail
    const att4 = AuthEmailService.verifyOtp(email, res.otp, 'login_2fa')
    assert.strictEqual(att4.success, false)
  })

  it('5. Enforces 60-second resend cooldown', () => {
    const email = 'cooldown-test@example.com'
    const res1 = AuthEmailService.createOtpRecord(email, 'verification', 300)
    assert.ok(!('error' in res1))

    // Immediate second request within 60s must be throttled
    const res2 = AuthEmailService.createOtpRecord(email, 'verification', 300)
    assert.ok('error' in res2)
    assert.ok(res2.error?.includes('Please wait'))
  })

  it('6. Dispatches Password Reset Email with Platform scope', async () => {
    const sendRes = await AuthEmailService.sendPasswordResetEmail({
      email: 'owner@printerp.com',
      resetUrl: 'https://printerp.com/reset-password?token=secret123',
      userName: 'Platform Owner',
      scopeType: 'PLATFORM',
    })

    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(sendRes.status, 'sent')
  })

  it('7. Dispatches User Invitation Email with Tenant scope', async () => {
    // Setup a tenant gateway
    EmailDataStore.set('printerp_email_gateways', [
      {
        id: 'gw-invite-tenant',
        tenant_id: 'tenant-invite-id',
        scope_type: 'TENANT',
        provider: 'mock',
        type: 'transactional',
        sender_name: 'Vision Sign BD',
        sender_email: 'admin@visionsign.com',
        status: 'active',
        is_default: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ])

    const sendRes = await AuthEmailService.sendUserInvitationEmail({
      email: 'newdesigner@domain.com',
      inviteUrl: 'https://printerp.com/join/invite-456',
      companyName: 'Vision Sign BD',
      roleName: 'Graphic Designer',
      invitedByName: 'Managing Director',
      tenantId: 'tenant-invite-id',
    })

    assert.strictEqual(sendRes.success, true)
    assert.strictEqual(sendRes.status, 'sent')
  })
})
