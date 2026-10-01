import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OtpService } from '../../services/otp.service.ts';

describe('Dual-Channel OTP Gateway Unit Tests', () => {
  it('1. generateNumericOtp creates a 6-digit numeric string', () => {
    const code1 = OtpService.generateNumericOtp();
    const code2 = OtpService.generateNumericOtp();

    assert.equal(code1.length, 6);
    assert.equal(code2.length, 6);
    assert.match(code1, /^\d{6}$/);
    assert.match(code2, /^\d{6}$/);
    assert.ok(parseInt(code1, 10) >= 100000 && parseInt(code1, 10) <= 999999);
  });

  it('2. requestOtp rejects invalid phone numbers fail-closed', async () => {
    const res = await OtpService.requestOtp({
      tenantId: '00000000-0000-0000-0000-000000000000',
      phone: 'invalid-number-123',
      purpose: 'verify_phone',
    });

    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Invalid'));
  });

  it('3. verifyOtp rejects non-6-digit verification code formats', async () => {
    const res1 = await OtpService.verifyOtp({
      tenantId: '00000000-0000-0000-0000-000000000000',
      phone: '01712345678',
      purpose: 'login',
      otpCode: '123',
    });
    assert.equal(res1.success, false);
    assert.ok(res1.error?.includes('6 digits'));

    const res2 = await OtpService.verifyOtp({
      tenantId: '00000000-0000-0000-0000-000000000000',
      phone: '01712345678',
      purpose: 'login',
      otpCode: '12345678',
    });
    assert.equal(res2.success, false);
    assert.ok(res2.error?.includes('6 digits'));
  });
});
