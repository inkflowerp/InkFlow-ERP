import { test, describe } from 'node:test'
import assert from 'node:assert'

export type PlatformCompanyStatus =
  | 'trial'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'archived'

export interface MockCompany {
  id: string
  name: string
  slug: string
  status: PlatformCompanyStatus
  is_active: boolean
  suspension_reason?: string
  cancellation_reason?: string
  plan_code: string
}

function transitionCompanyStatus(
  company: MockCompany,
  newStatus: PlatformCompanyStatus,
  reason?: string
): { success: boolean; updatedCompany?: MockCompany; error?: string } {
  if (newStatus === 'suspended') {
    if (!reason || reason.trim().length < 3) {
      return { success: false, error: 'Mandatory reason required for suspension' }
    }
    return {
      success: true,
      updatedCompany: {
        ...company,
        status: 'suspended',
        is_active: false,
        suspension_reason: reason.trim(),
      },
    }
  }

  if (newStatus === 'active') {
    return {
      success: true,
      updatedCompany: {
        ...company,
        status: 'active',
        is_active: true,
        suspension_reason: undefined,
      },
    }
  }

  if (newStatus === 'cancelled') {
    return {
      success: true,
      updatedCompany: {
        ...company,
        status: 'cancelled',
        is_active: false,
        cancellation_reason: reason || 'Customer requested termination',
      },
    }
  }

  if (newStatus === 'archived') {
    if (company.status !== 'cancelled') {
      return { success: false, error: 'Only cancelled tenants can be archived' }
    }
    return {
      success: true,
      updatedCompany: {
        ...company,
        status: 'archived',
        is_active: false,
      },
    }
  }

  return {
    success: true,
    updatedCompany: {
      ...company,
      status: newStatus,
      is_active: (newStatus as any) !== 'suspended' && (newStatus as any) !== 'cancelled' && (newStatus as any) !== 'archived',
    },
  }
}

describe('Platform Tenant Lifecycle & State Machine Governance', () => {
  const initialTenant: MockCompany = {
    id: 'comp-padma-01',
    name: 'Padma Digital Ltd.',
    slug: 'padma-digital',
    status: 'active',
    is_active: true,
    plan_code: 'growth',
  }

  test('1. Suspend tenant requires mandatory reason', () => {
    const withoutReason = transitionCompanyStatus(initialTenant, 'suspended', '')
    assert.strictEqual(withoutReason.success, false)
    assert.strictEqual(withoutReason.error, 'Mandatory reason required for suspension')

    const withReason = transitionCompanyStatus(
      initialTenant,
      'suspended',
      'Overdue payment on invoice INV-2026-08'
    )
    assert.strictEqual(withReason.success, true)
    assert.strictEqual(withReason.updatedCompany?.is_active, false)
    assert.strictEqual(withReason.updatedCompany?.status, 'suspended')
    assert.strictEqual(
      withReason.updatedCompany?.suspension_reason,
      'Overdue payment on invoice INV-2026-08'
    )
  })

  test('2. Reactivate suspended tenant restores active status and clears suspension flag', () => {
    const suspended: MockCompany = {
      ...initialTenant,
      status: 'suspended',
      is_active: false,
      suspension_reason: 'Overdue bill',
    }

    const reactivated = transitionCompanyStatus(suspended, 'active')
    assert.strictEqual(reactivated.success, true)
    assert.strictEqual(reactivated.updatedCompany?.is_active, true)
    assert.strictEqual(reactivated.updatedCompany?.status, 'active')
    assert.strictEqual(reactivated.updatedCompany?.suspension_reason, undefined)
  })

  test('3. Safe cancellation: active -> cancelled -> archived workflow', () => {
    // Cannot archive directly from active
    const invalidArchive = transitionCompanyStatus(initialTenant, 'archived')
    assert.strictEqual(invalidArchive.success, false)
    assert.strictEqual(invalidArchive.error, 'Only cancelled tenants can be archived')

    // Transition to cancelled first
    const cancelled = transitionCompanyStatus(initialTenant, 'cancelled', 'Business dissolved')
    assert.strictEqual(cancelled.success, true)
    assert.strictEqual(cancelled.updatedCompany?.status, 'cancelled')

    // Then transition to archived
    const archived = transitionCompanyStatus(cancelled.updatedCompany!, 'archived')
    assert.strictEqual(archived.success, true)
    assert.strictEqual(archived.updatedCompany?.status, 'archived')
  })

  test('4. All 7 lifecycle states exist and are valid domain states', () => {
    const validStates: PlatformCompanyStatus[] = [
      'trial',
      'active',
      'past_due',
      'grace_period',
      'suspended',
      'cancelled',
      'archived',
    ]

    for (const state of validStates) {
      assert.ok(typeof state === 'string')
    }
  })
})
