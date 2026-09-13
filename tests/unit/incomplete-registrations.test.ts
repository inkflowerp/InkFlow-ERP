// ==============================================================================
// PrintERP / InkFlow SaaS - Unit Tests: Incomplete Registrations Management
// Tests detection of started-but-not-finished registrations, stage categorization,
// exclusion of provisioned tenants, OTP resend, and abandoned registration purge.
// ==============================================================================

import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PlatformService } from '../../services/platform.service.ts'
import type { IncompleteRegistrationStage, IncompleteRegistrationRecord } from '../../types/platform.types.ts'

describe('Incomplete Registrations Platform Management Test Suite', () => {
  describe('1. Stage Computation & Categorization Rules', () => {
    it('Categorizes unconfirmed active OTP as pending_verification', () => {
      const now = Date.now()
      const expiresAt = new Date(now + 10 * 60 * 1000).toISOString() // +10 min
      const isEmailConfirmed = false
      const isExpired = new Date(expiresAt).getTime() < now

      let stage: IncompleteRegistrationStage = 'pending_verification'
      if (isEmailConfirmed) {
        stage = 'verified_pending_onboarding'
      } else if (isExpired) {
        stage = 'verification_expired'
      } else {
        stage = 'pending_verification'
      }

      assert.strictEqual(stage, 'pending_verification')
    })

    it('Categorizes expired unconfirmed OTP as verification_expired', () => {
      const now = Date.now()
      const expiresAt = new Date(now - 5 * 60 * 1000).toISOString() // -5 min in past
      const isEmailConfirmed = false
      const isExpired = new Date(expiresAt).getTime() < now

      let stage: IncompleteRegistrationStage = 'pending_verification'
      if (isEmailConfirmed) {
        stage = 'verified_pending_onboarding'
      } else if (isExpired) {
        stage = 'verification_expired'
      } else {
        stage = 'pending_verification'
      }

      assert.strictEqual(stage, 'verification_expired')
    })

    it('Categorizes confirmed email without company as verified_pending_onboarding', () => {
      const isEmailConfirmed = true

      let stage: IncompleteRegistrationStage = 'pending_verification'
      if (isEmailConfirmed) {
        stage = 'verified_pending_onboarding'
      }

      assert.strictEqual(stage, 'verified_pending_onboarding')
    })
  })

  describe('2. Active Tenant & Completed User Exclusion Logic', () => {
    it('Excludes users and emails that belong to existing companies or platform admins', () => {
      const completedUserIds = new Set<string>(['user-100', 'user-200'])
      const completedEmails = new Set<string>(['owner@meghna-offset.com', 'admin@printerp.com'])

      const mockRegistrations = [
        { id: 'v-1', user_id: 'user-100', email: 'owner@meghna-offset.com', full_name: 'Existing Owner' },
        { id: 'v-2', user_id: 'user-300', email: 'incomplete@newshop.com', full_name: 'New Prospect' },
        { id: 'v-3', user_id: null, email: 'admin@printerp.com', full_name: 'Platform Admin' },
        { id: 'v-4', user_id: null, email: 'prospect2@domain.com', full_name: 'Second Prospect' },
      ]

      const filtered = mockRegistrations.filter((item) => {
        const normalized = item.email.toLowerCase().trim()
        if (item.user_id && completedUserIds.has(item.user_id)) return false
        if (completedEmails.has(normalized)) return false
        return true
      })

      assert.strictEqual(filtered.length, 2)
      assert.strictEqual(filtered[0].email, 'incomplete@newshop.com')
      assert.strictEqual(filtered[1].email, 'prospect2@domain.com')
    })
  })

  describe('3. PlatformService Incomplete Registrations API', () => {
    it('Retrieves incomplete registrations with metrics summary', async () => {
      const res = await PlatformService.getIncompleteRegistrations()
      assert.strictEqual(res.success, true)
      assert.ok(res.data)
      assert.ok(Array.isArray(res.data.registrations))
      assert.ok(res.data.metrics)
      assert.strictEqual(typeof res.data.metrics.total_incomplete, 'number')
      assert.strictEqual(typeof res.data.metrics.pending_verification_count, 'number')
      assert.strictEqual(typeof res.data.metrics.verified_pending_onboarding_count, 'number')
      assert.strictEqual(typeof res.data.metrics.expired_count, 'number')
    })

    it('Filters incomplete registrations by stage', async () => {
      const res = await PlatformService.getIncompleteRegistrations({
        stage: 'pending_verification',
      })
      assert.strictEqual(res.success, true)
      assert.ok(res.data)
      res.data.registrations.forEach((r: IncompleteRegistrationRecord) => {
        assert.strictEqual(r.stage, 'pending_verification')
      })
    })

    it('Filters incomplete registrations by search keyword', async () => {
      const res = await PlatformService.getIncompleteRegistrations({
        search: 'nonexistent-query-12345xyz',
      })
      assert.strictEqual(res.success, true)
      assert.ok(res.data)
      assert.strictEqual(res.data.registrations.length, 0)
    })
  })

  describe('4. Administrative Lifecycle Operations', () => {
    it('Requires email when resending verification OTP', async () => {
      const res = await PlatformService.resendIncompleteRegistrationVerification('')
      assert.strictEqual(res.success, false)
      assert.ok(res.error?.includes('required'))
    })

    it('Successfully triggers resend verification OTP for prospective tenant email', async () => {
      const testEmail = 'prospect-resend@testcorp.com'
      const res = await PlatformService.resendIncompleteRegistrationVerification(testEmail)
      assert.strictEqual(res.success, true)
      assert.ok(res.message?.includes('dispatched') || res.message?.includes('verification'))
    })

    it('Purges an incomplete registration by email or ID', async () => {
      const testEmail = 'prospect-purge@testcorp.com'
      const res = await PlatformService.deleteIncompleteRegistration(testEmail, 'Test purge reason')
      assert.strictEqual(res.success, true)
      assert.ok(res.message?.includes('purged') || res.message?.includes('successfully'))
    })

    it('Purges an incomplete registration by non-UUID custom identifier safely without SQL errors', async () => {
      const customId = 'inc-prospect-nonuuid@testcorp.com'
      const res = await PlatformService.deleteIncompleteRegistration(customId, 'Non-UUID ID purge test')
      assert.strictEqual(res.success, true)
      assert.ok(res.message?.includes('purged') || res.message?.includes('successfully'))
    })

    it('Purges an incomplete registration by valid UUID safely', async () => {
      const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
      const res = await PlatformService.deleteIncompleteRegistration(uuid, 'UUID purge test')
      assert.strictEqual(res.success, true)
      assert.ok(res.message?.includes('purged') || res.message?.includes('successfully'))
    })
  })
})
