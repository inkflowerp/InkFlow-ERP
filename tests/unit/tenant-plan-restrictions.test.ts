import { describe, it } from 'node:test'
import assert from 'node:assert'

export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'

export interface CompanySubscriptionRecord {
  plan_code: PlanCode
  status: SubscriptionStatus
  trial_ends_at?: string | null
  current_period_end?: string
}

export interface SubscriptionPlanRecord {
  id: string
  code: PlanCode
  name: string
  name_bn: string
  price_monthly: number
  price_yearly: number
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  trial_days?: number
  features: string[]
  is_active: boolean
}

export interface TenantResourceUsage {
  users_count: number
  branches_count: number
  orders_this_month_count: number
  customers_count: number
  products_count: number
  storage_mb: number
}

export function getTrialDaysRemaining(sub: CompanySubscriptionRecord | null): number | null {
  if (!sub || sub.status !== 'trial' || !sub.trial_ends_at) return null
  const now = new Date()
  const trialEnd = new Date(sub.trial_ends_at)
  const diffMs = trialEnd.getTime() - now.getTime()
  if (diffMs <= 0) return 0
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function getNextTierPlan(currentPlanCode: PlanCode): PlanCode {
  switch (currentPlanCode) {
    case 'trial':
      return 'business'
    case 'starter':
      return 'business'
    case 'business':
      return 'enterprise'
    case 'enterprise':
      return 'enterprise'
    default:
      return 'starter'
  }
}

export function checkResourceLimit(
  resource: 'users' | 'branches' | 'orders' | 'customers' | 'products',
  usage: TenantResourceUsage,
  plan: SubscriptionPlanRecord | null
): { allowed: boolean; current: number; limit: number; reasonEn: string; reasonBn: string } {
  if (!plan) {
    return {
      allowed: false,
      current: 0,
      limit: 0,
      reasonEn: 'No active subscription plan found. Please subscribe or activate a trial plan.',
      reasonBn: 'কোন সক্রিয় সাবস্ক্রিপশন প্ল্যান পাওয়া যায়নি। অনুগ্রহ করে সাবস্ক্রাইব করুন।',
    }
  }

  let current = 0
  let limit = 0
  let nameEn = 'items'
  let nameBn = 'আইটেম'

  switch (resource) {
    case 'users':
      current = usage.users_count
      limit = plan.max_users
      nameEn = 'team users'
      nameBn = 'টিম মেম্বার'
      break
    case 'branches':
      current = usage.branches_count
      limit = plan.max_branches
      nameEn = 'company branches'
      nameBn = 'শাখা বা ব্রাঞ্চ'
      break
    case 'orders':
      current = usage.orders_this_month_count
      limit = plan.monthly_orders
      nameEn = 'orders this month'
      nameBn = 'এই মাসের অর্ডার'
      break
    case 'customers':
      current = usage.customers_count
      limit = plan.max_customers
      nameEn = 'customer accounts'
      nameBn = 'কাস্টমার প্রোফাইল'
      break
    case 'products':
      current = usage.products_count
      limit = plan.max_products
      nameEn = 'catalog products / materials'
      nameBn = 'প্রোডাক্ট বা কাঁচামাল'
      break
  }

  if (limit <= 0 || limit >= 99999) {
    return { allowed: true, current, limit, reasonEn: '', reasonBn: '' }
  }

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      reasonEn: `Limit reached (${current}/${limit} ${nameEn}). Please upgrade your plan to add more.`,
      reasonBn: `সর্বোচ্চ সীমা শেষ (${current}/${limit} ${nameBn})। অতিরিক্ত যোগ করতে আপনার প্ল্যান আপগ্রেড করুন।`,
    }
  }

  return { allowed: true, current, limit, reasonEn: '', reasonBn: '' }
}

describe('Tenant Subscription Plan Restrictions & Limit Enforcement', () => {
  const trialPlan: SubscriptionPlanRecord = {
    id: 'sp-00',
    code: 'trial',
    name: 'Free Trial (14 Days)',
    name_bn: '১৪ দিনের ফ্রি ট্রায়াল',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 5,
    max_branches: 1,
    storage_gb: 2,
    monthly_orders: 50,
    max_customers: 100,
    max_products: 150,
    trial_days: 14,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan', 'production', 'hr'],
    is_active: true,
  }

  it('should calculate trial days remaining accurately', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 8)

    const trialSub: CompanySubscriptionRecord = {
      plan_code: 'trial',
      status: 'trial',
      trial_ends_at: futureDate.toISOString(),
    }

    const daysLeft = getTrialDaysRemaining(trialSub)
    assert.ok(daysLeft !== null && daysLeft >= 7 && daysLeft <= 9, `Expected ~8 days left, got ${daysLeft}`)
  })

  it('should return 0 days remaining when trial has passed', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 2)

    const expiredTrialSub: CompanySubscriptionRecord = {
      plan_code: 'trial',
      status: 'trial',
      trial_ends_at: pastDate.toISOString(),
    }

    const daysLeft = getTrialDaysRemaining(expiredTrialSub)
    assert.strictEqual(daysLeft, 0)
  })

  it('should return null for trial days if subscription is active paid plan', () => {
    const activeSub: CompanySubscriptionRecord = {
      plan_code: 'business',
      status: 'active',
      trial_ends_at: null,
    }

    const daysLeft = getTrialDaysRemaining(activeSub)
    assert.strictEqual(daysLeft, null)
  })

  it('should allow creation when usage is below plan limits', () => {
    const usage: TenantResourceUsage = {
      users_count: 3,
      branches_count: 1,
      orders_this_month_count: 25,
      customers_count: 40,
      products_count: 50,
      storage_mb: 500,
    }

    const userCheck = checkResourceLimit('users', usage, trialPlan)
    assert.strictEqual(userCheck.allowed, true)
    assert.strictEqual(userCheck.current, 3)
    assert.strictEqual(userCheck.limit, 5)

    const orderCheck = checkResourceLimit('orders', usage, trialPlan)
    assert.strictEqual(orderCheck.allowed, true)
    assert.strictEqual(orderCheck.current, 25)
    assert.strictEqual(orderCheck.limit, 50)
  })

  it('should block creation when user quota limit is reached or exceeded', () => {
    const maxedUsage: TenantResourceUsage = {
      users_count: 5,
      branches_count: 1,
      orders_this_month_count: 50,
      customers_count: 100,
      products_count: 150,
      storage_mb: 2048,
    }

    const userCheck = checkResourceLimit('users', maxedUsage, trialPlan)
    assert.strictEqual(userCheck.allowed, false)
    assert.strictEqual(userCheck.current, 5)
    assert.strictEqual(userCheck.limit, 5)
    assert.ok(userCheck.reasonEn.includes('Limit reached'))

    const branchCheck = checkResourceLimit('branches', maxedUsage, trialPlan)
    assert.strictEqual(branchCheck.allowed, false)

    const orderCheck = checkResourceLimit('orders', maxedUsage, trialPlan)
    assert.strictEqual(orderCheck.allowed, false)

    const customerCheck = checkResourceLimit('customers', maxedUsage, trialPlan)
    assert.strictEqual(customerCheck.allowed, false)

    const productCheck = checkResourceLimit('products', maxedUsage, trialPlan)
    assert.strictEqual(productCheck.allowed, false)
  })

  it('should suggest the next tier plan accurately when upgrading', () => {
    assert.strictEqual(getNextTierPlan('trial'), 'business')
    assert.strictEqual(getNextTierPlan('starter'), 'business')
    assert.strictEqual(getNextTierPlan('business'), 'enterprise')
    assert.strictEqual(getNextTierPlan('enterprise'), 'enterprise')
  })

  it('should allow unlimited if limit is -1 or 0 (enterprise tier)', () => {
    const enterprisePlan: SubscriptionPlanRecord = {
      ...trialPlan,
      code: 'enterprise',
      max_users: -1,
      max_branches: -1,
      monthly_orders: -1,
      max_customers: -1,
      max_products: -1,
    }

    const hugeUsage: TenantResourceUsage = {
      users_count: 9999,
      branches_count: 50,
      orders_this_month_count: 100000,
      customers_count: 50000,
      products_count: 20000,
      storage_mb: 500000,
    }

    const userCheck = checkResourceLimit('users', hugeUsage, enterprisePlan)
    assert.strictEqual(userCheck.allowed, true)

    const orderCheck = checkResourceLimit('orders', hugeUsage, enterprisePlan)
    assert.strictEqual(orderCheck.allowed, true)
  })
})
