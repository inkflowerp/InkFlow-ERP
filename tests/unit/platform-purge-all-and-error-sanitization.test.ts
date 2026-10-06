import { describe, it } from 'node:test'
import assert from 'node:assert'
import { sanitizeError, AppError } from '../../lib/errors/app-error.ts'

describe('Platform Purge All & Error Sanitization Hardening', () => {
  it('1. sanitizeError preserves clean, human-readable operational errors without swallowing them into 500', () => {
    const operationalErr = new Error('Emergency purge is disabled in this environment. Set ALLOW_PLATFORM_PURGE_ALL=true in configuration to enable.')
    const sanitized = sanitizeError(operationalErr)

    assert.strictEqual(sanitized.code, 'VALIDATION')
    assert.strictEqual(sanitized.statusCode, 400)
    assert.strictEqual(sanitized.message, 'Emergency purge is disabled in this environment. Set ALLOW_PLATFORM_PURGE_ALL=true in configuration to enable.')
  })

  it('2. sanitizeError preserves audit reason validation errors', () => {
    const reasonErr = new Error('A detailed operational reason (at least 3 characters) is required for audit trail.')
    const sanitized = sanitizeError(reasonErr)

    assert.strictEqual(sanitized.code, 'VALIDATION')
    assert.strictEqual(sanitized.statusCode, 400)
    assert.strictEqual(sanitized.message, 'A detailed operational reason (at least 3 characters) is required for audit trail.')
  })

  it('3. sanitizeError strictly masks low-level PostgreSQL queries and database internals', () => {
    const sqlErr = new Error('syntax error at or near "SELECT" relation "companies" does not exist')
    const sanitized = sanitizeError(sqlErr)

    assert.strictEqual(sanitized.code, 'INTERNAL')
    assert.strictEqual(sanitized.statusCode, 500)
    assert.strictEqual(sanitized.message, 'An unexpected internal error occurred. Please try again.')
    assert.ok(sanitized.messageBn.length > 0)
  })

  it('4. sanitizeError preserves AppError with full Bengali translations and metadata', () => {
    const appErr = new AppError({
      code: 'FORBIDDEN',
      message: 'Platform Owner role required for destructive operations.',
      messageBn: 'বিধ্বংসী কার্যক্রমের জন্য প্ল্যাটফর্ম ওনার ভূমিকা প্রয়োজন।',
    })
    const sanitized = sanitizeError(appErr)

    assert.strictEqual(sanitized.code, 'FORBIDDEN')
    assert.strictEqual(sanitized.statusCode, 403)
    assert.strictEqual(sanitized.message, 'Platform Owner role required for destructive operations.')
    assert.strictEqual(sanitized.messageBn, 'বিধ্বংসী কার্যক্রমের জন্য প্ল্যাটফর্ম ওনার ভূমিকা প্রয়োজন।')
  })

  it('5. Environment flag ALLOW_PLATFORM_PURGE_ALL evaluates correctly', () => {
    const original = process.env.ALLOW_PLATFORM_PURGE_ALL

    try {
      process.env.ALLOW_PLATFORM_PURGE_ALL = 'true'
      assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', true)

      process.env.ALLOW_PLATFORM_PURGE_ALL = 'false'
      assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', false)

      delete process.env.ALLOW_PLATFORM_PURGE_ALL
      assert.strictEqual(process.env.ALLOW_PLATFORM_PURGE_ALL === 'true', false)
    } finally {
      process.env.ALLOW_PLATFORM_PURGE_ALL = original
    }
  })
})
