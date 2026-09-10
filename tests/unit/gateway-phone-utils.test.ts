import { describe, it } from 'node:test'
import assert from 'node:assert'
import { normalizeBdPhoneNumber, isValidEmail } from '../../lib/gateway/phone-utils.ts'

describe('Gateway Phone & Email Validation Utils', () => {
  it('1. Normalizes domestic 11-digit Bangladeshi numbers (017XXXXXXXX)', () => {
    const res = normalizeBdPhoneNumber('01711234567')
    assert.strictEqual(res.isValid, true)
    assert.strictEqual(res.formatted, '8801711234567')
    assert.strictEqual(res.operator, 'Grameenphone')
  })

  it('2. Normalizes +880 prefix and spaces/dashes (e.g. +880 1819-876543)', () => {
    const res = normalizeBdPhoneNumber('+880 1819-876543')
    assert.strictEqual(res.isValid, true)
    assert.strictEqual(res.formatted, '8801819876543')
    assert.strictEqual(res.operator, 'Robi')
  })

  it('3. Detects carriers: Banglalink, Teletalk, Airtel', () => {
    const bl = normalizeBdPhoneNumber('01912345678')
    assert.strictEqual(bl.operator, 'Banglalink')

    const tt = normalizeBdPhoneNumber('01512345678')
    assert.strictEqual(tt.operator, 'Teletalk')

    const airtel = normalizeBdPhoneNumber('01612345678')
    assert.strictEqual(airtel.operator, 'Airtel')
  })

  it('4. Rejects invalid BD numbers', () => {
    const invalid = normalizeBdPhoneNumber('12345')
    assert.strictEqual(invalid.isValid, false)
    assert.ok(invalid.error)
  })

  it('5. Validates email syntax', () => {
    assert.strictEqual(isValidEmail('admin@printerp.com'), true)
    assert.strictEqual(isValidEmail('invalid-email'), false)
  })
})
