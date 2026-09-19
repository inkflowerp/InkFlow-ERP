import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  isReservedSlug,
  isValidSlugFormat,
  normalizeSlug,
  RESERVED_SLUGS,
} from '../../lib/tenant/tenant-resolution.ts'

// In-Memory Database simulator for tenant registration & slug availability
class MockTenantRepository {
  private existingSlugs = new Set<string>([
    'vision',
    'abc-print',
    'rahman-sign',
    'dhaka-press',
  ])

  async checkSlugAvailability(rawSlug: string): Promise<{
    available: boolean
    normalizedSlug: string
    reason?: 'reserved' | 'invalid_format' | 'already_taken'
  }> {
    const clean = (rawSlug || '').toLowerCase().trim()

    if (!isValidSlugFormat(clean)) {
      return { available: false, normalizedSlug: clean, reason: 'invalid_format' }
    }

    if (isReservedSlug(clean)) {
      return { available: false, normalizedSlug: clean, reason: 'reserved' }
    }

    if (this.existingSlugs.has(clean)) {
      return { available: false, normalizedSlug: clean, reason: 'already_taken' }
    }

    return { available: true, normalizedSlug: clean }
  }

  // Atomic creation with race-condition collision simulation
  async registerTenant(slug: string, name: string): Promise<{ success: boolean; error?: string }> {
    const check = await this.checkSlugAvailability(slug)
    if (!check.available) {
      return { success: false, error: `Slug unavailable: ${check.reason}` }
    }

    // Simulate database unique constraint check
    if (this.existingSlugs.has(check.normalizedSlug)) {
      return { success: false, error: 'Database constraint violation: slug already exists' }
    }

    this.existingSlugs.add(check.normalizedSlug)
    return { success: true }
  }
}

describe('Tenant Slug Availability & Creation Integration Tests', () => {
  const repo = new MockTenantRepository()

  test('1. Valid available slug returns available=true', async () => {
    const res = await repo.checkSlugAvailability('green-valley-printing')
    assert.equal(res.available, true)
    assert.equal(res.normalizedSlug, 'green-valley-printing')
  })

  test('2. Existing registered slug returns already_taken', async () => {
    const res = await repo.checkSlugAvailability('vision')
    assert.equal(res.available, false)
    assert.equal(res.reason, 'already_taken')
  })

  test('3. Reserved system slug returns reserved', async () => {
    for (const slug of ['admin', 'billing', 'api', 'login', 'signup', 'mail', 'status', 'app', 'auth']) {
      const res = await repo.checkSlugAvailability(slug)
      assert.equal(res.available, false, `Reserved slug '${slug}' should be rejected`)
      assert.equal(res.reason, 'reserved')
    }
  })

  test('4. Malformed slug (spaces, underscores, special chars) returns invalid_format or normalizes', async () => {
    const res1 = await repo.checkSlugAvailability('a') // too short
    assert.equal(res1.available, false)
    assert.equal(res1.reason, 'invalid_format')

    const res2 = await repo.checkSlugAvailability('___') // becomes empty
    assert.equal(res2.available, false)
    assert.equal(res2.reason, 'invalid_format')
  })

  test('5. Successfully creates tenant and subsequent availability check returns already_taken', async () => {
    const slug = 'star-sign-sylhet'
    const regRes = await repo.registerTenant(slug, 'Star Sign Sylhet')
    assert.equal(regRes.success, true)

    const checkAgain = await repo.checkSlugAvailability(slug)
    assert.equal(checkAgain.available, false)
    assert.equal(checkAgain.reason, 'already_taken')
  })

  test('6. Concurrent race condition handling: two identical registrations only allow one winner', async () => {
    const raceSlug = 'rapid-print-2026'

    const [first, second] = await Promise.all([
      repo.registerTenant(raceSlug, 'Rapid Print 1'),
      repo.registerTenant(raceSlug, 'Rapid Print 2'),
    ])

    // Exactly one must succeed and one must fail
    const successes = [first, second].filter((r) => r.success).length
    const failures = [first, second].filter((r) => !r.success).length

    assert.equal(successes, 1, 'Only one concurrent registration should succeed')
    assert.equal(failures, 1, 'The colliding registration must be safely rejected')
  })
})
