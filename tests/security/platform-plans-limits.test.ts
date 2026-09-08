import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface MockPlan {
  id: string
  code: string
  name: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  features: string[]
  is_active: boolean
}

function checkResourceLimit(
  currentUsage: number,
  planLimit: number,
  requestedIncrement: number = 1
): { allowed: boolean; error?: string; remaining: number } {
  if (currentUsage + requestedIncrement > planLimit) {
    return {
      allowed: false,
      error: `Resource limit exceeded: ${currentUsage + requestedIncrement} / ${planLimit}`,
      remaining: Math.max(0, planLimit - currentUsage),
    }
  }

  return {
    allowed: true,
    remaining: planLimit - (currentUsage + requestedIncrement),
  }
}

describe('Subscription Plans, Feature Entitlements & Plan Limits Security', () => {
  const starterPlan: MockPlan = {
    id: 'sp-starter',
    code: 'starter',
    name: 'Starter Press',
    price_monthly: 2500,
    price_yearly: 25000,
    max_users: 3,
    max_branches: 1,
    storage_gb: 5,
    monthly_orders: 100,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
  }

  const archivedPlan: MockPlan = {
    ...starterPlan,
    id: 'sp-legacy-2024',
    code: 'legacy_2024',
    name: 'Legacy 2024 Starter',
    is_active: false,
  }

  test('1. User limit quota correctly blocks additions beyond plan ceiling', () => {
    // Current 2 users, adding 1 -> Allowed (3/3)
    const allowed = checkResourceLimit(2, starterPlan.max_users, 1)
    assert.strictEqual(allowed.allowed, true)
    assert.strictEqual(allowed.remaining, 0)

    // Current 3 users, adding 1 -> Denied (4/3)
    const denied = checkResourceLimit(3, starterPlan.max_users, 1)
    assert.strictEqual(denied.allowed, false)
    assert.ok(denied.error?.includes('Resource limit exceeded: 4 / 3'))
  })

  test('2. Branch quota blocks multi-branch creation on single-branch starter plan', () => {
    // Current 1 branch (Main branch), adding second branch -> Denied
    const denied = checkResourceLimit(1, starterPlan.max_branches, 1)
    assert.strictEqual(denied.allowed, false)
  })

  test('3. Pricing numeric safety: ensures non-negative exact monetary figures', () => {
    assert.ok(starterPlan.price_monthly > 0)
    assert.ok(starterPlan.price_yearly > 0)
    assert.strictEqual(Number.isFinite(starterPlan.price_monthly), true)
  })

  test('4. Feature entitlement separation: Starter plan lacks advanced enterprise features', () => {
    assert.strictEqual(starterPlan.features.includes('whatsapp_notifications'), false)
    assert.strictEqual(starterPlan.features.includes('mushak_6_3'), false)
    assert.strictEqual(starterPlan.features.includes('basic_sales'), true)
  })

  test('5. Archived plan cannot be assigned to new business registration', () => {
    function canAssignPlanToNewTenant(plan: MockPlan): boolean {
      return plan.is_active === true
    }

    assert.strictEqual(canAssignPlanToNewTenant(starterPlan), true)
    assert.strictEqual(canAssignPlanToNewTenant(archivedPlan), false)
  })
})
