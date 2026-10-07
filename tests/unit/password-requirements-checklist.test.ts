import { describe, it } from 'node:test'
import assert from 'node:assert'
import { registerSchema } from '../../features/auth/auth.schemas.ts'

describe('Password Requirements Checklist & Schema Validation', () => {
  it('1. Calculates individual password rules and strength correctly', () => {
    function evaluatePassword(pwd: string) {
      const hasMinLength = pwd.length >= 8
      const hasSmallLetter = /[a-z]/.test(pwd)
      const hasCapitalLetter = /[A-Z]/.test(pwd)
      const hasNumberOrSymbol = /[0-9]|[^A-Za-z0-9]/.test(pwd)

      const rules = [hasMinLength, hasSmallLetter, hasCapitalLetter, hasNumberOrSymbol]
      const metCount = rules.filter(Boolean).length
      const percent = pwd.length === 0 ? 0 : Math.round((metCount / rules.length) * 100)

      return {
        hasMinLength,
        hasSmallLetter,
        hasCapitalLetter,
        hasNumberOrSymbol,
        percent,
      }
    }

    // Empty password
    assert.deepStrictEqual(evaluatePassword(''), {
      hasMinLength: false,
      hasSmallLetter: false,
      hasCapitalLetter: false,
      hasNumberOrSymbol: false,
      percent: 0,
    })

    // Only small letters < 8 chars
    const r1 = evaluatePassword('abcd')
    assert.strictEqual(r1.hasMinLength, false)
    assert.strictEqual(r1.hasSmallLetter, true)
    assert.strictEqual(r1.hasCapitalLetter, false)
    assert.strictEqual(r1.hasNumberOrSymbol, false)
    assert.strictEqual(r1.percent, 25)

    // Small + capital letters < 8 chars
    const r2 = evaluatePassword('Abcd')
    assert.strictEqual(r2.hasMinLength, false)
    assert.strictEqual(r2.hasSmallLetter, true)
    assert.strictEqual(r2.hasCapitalLetter, true)
    assert.strictEqual(r2.hasNumberOrSymbol, false)
    assert.strictEqual(r2.percent, 50)

    // Small + capital + number < 8 chars
    const r3 = evaluatePassword('Abc1')
    assert.strictEqual(r3.hasMinLength, false)
    assert.strictEqual(r3.hasSmallLetter, true)
    assert.strictEqual(r3.hasCapitalLetter, true)
    assert.strictEqual(r3.hasNumberOrSymbol, true)
    assert.strictEqual(r3.percent, 75)

    // Full 8+ chars with small, capital, and symbol/number
    const r4 = evaluatePassword('SecurePassword2026!')
    assert.strictEqual(r4.hasMinLength, true)
    assert.strictEqual(r4.hasSmallLetter, true)
    assert.strictEqual(r4.hasCapitalLetter, true)
    assert.strictEqual(r4.hasNumberOrSymbol, true)
    assert.strictEqual(r4.percent, 100)
  })

  it('2. registerSchema rejects passwords missing any of the 4 security requirements', () => {
    const base = {
      fullName: 'Shamsul Alam',
      email: 'shamsul@example.com',
      phone: '01711223344',
    }

    // Too short (< 8 chars)
    const tooShort = registerSchema.safeParse({ ...base, password: 'Pass1!' })
    assert.strictEqual(tooShort.success, false)

    // No small letter
    const noSmall = registerSchema.safeParse({ ...base, password: 'PASSWORD123!' })
    assert.strictEqual(noSmall.success, false)

    // No capital letter
    const noCap = registerSchema.safeParse({ ...base, password: 'password123!' })
    assert.strictEqual(noCap.success, false)

    // No number or symbol
    const noNumSymbol = registerSchema.safeParse({ ...base, password: 'PasswordOnly' })
    assert.strictEqual(noNumSymbol.success, false)

    // Valid password meeting all requirements
    const valid = registerSchema.safeParse({ ...base, password: 'StrongPassword1!' })
    assert.strictEqual(valid.success, true)
  })
})
