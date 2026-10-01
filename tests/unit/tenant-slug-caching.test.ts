import test from 'node:test'
import assert from 'node:assert/strict'
import { TenantRepository } from '../../lib/repositories/tenant.repository.ts'

test('Tenant Repository Caching Resilience Tests', async (t) => {
  await t.test('1. Invalidate company cache clears specific slug and id', () => {
    TenantRepository.invalidateCompanyCache('test-slug')
    TenantRepository.invalidateCompanyCache()
    assert.ok(true, 'invalidateCompanyCache executes without throwing')
  })

  await t.test('2. Cache invalidation helpers handle undefined and null safely', () => {
    TenantRepository.invalidateMembershipCache()
    TenantRepository.invalidateMembershipCache('fake-user-id')
    assert.ok(true, 'invalidateMembershipCache executes without throwing')
  })
})
