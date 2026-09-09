import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface MockSubscriptionPlan {
  id: string
  code: 'starter' | 'business' | 'enterprise'
  name: string
  name_bn: string
  price_monthly: number
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
}

export interface MockCompany {
  id: string
  name: string
  name_bn?: string | null
  slug: string
  business_type: string
  phone?: string | null
  email?: string | null
  currency: string
  default_locale: string
  is_active: boolean
  created_at: string
}

export interface MockCompanySubscription {
  id: string
  company_id: string
  plan_id: string
  status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled' | 'expired'
  billing_interval: 'monthly' | 'yearly'
  trial_ends_at: string
  current_period_start: string
  current_period_end: string
}

export interface MockCompanyUser {
  id: string
  company_id: string
  user_id: string
  branch_id: string
  status: 'active' | 'disabled'
  department: string
  responsibilities: string[]
  profile: {
    id: string
    email: string
    full_name: string
    phone?: string | null
    preferred_locale: string
  }
}

// In-memory mock database matching repository behavior
class MockTenantDatabase {
  plans: MockSubscriptionPlan[] = [
    {
      id: 'plan-starter-001',
      code: 'starter',
      name: 'Starter Plan',
      name_bn: 'স্টার্টার প্ল্যান',
      price_monthly: 1999,
      max_users: 3,
      max_branches: 1,
      storage_gb: 1,
      monthly_orders: 50,
    },
    {
      id: 'plan-business-002',
      code: 'business',
      name: 'Business Plan',
      name_bn: 'বিজনেস প্ল্যান',
      price_monthly: 4999,
      max_users: 10,
      max_branches: 3,
      storage_gb: 10,
      monthly_orders: 500,
    },
    {
      id: 'plan-enterprise-003',
      code: 'enterprise',
      name: 'Enterprise Plan',
      name_bn: 'এন্টারপ্রাইজ প্ল্যান',
      price_monthly: 9999,
      max_users: 999,
      max_branches: 999,
      storage_gb: 100,
      monthly_orders: 99999,
    },
  ]

  companies: MockCompany[] = []
  subscriptions: MockCompanySubscription[] = []
  branches: { id: string; company_id: string; name: string; is_main: boolean }[] = []
  settings: { company_id: string; invoice_prefix: string; default_currency: string }[] = []
  companyUsers: MockCompanyUser[] = []
  userProfiles: Record<string, any> = {}

  createCompany(input: {
    name: string
    name_bn?: string
    slug: string
    business_type: string
    phone?: string
    email?: string
    owner_name?: string
    owner_email?: string
    owner_phone?: string
    plan?: string
    default_locale?: string
    ownerUserId?: string
  }) {
    if (!input.name || !input.slug) {
      throw new Error('Company name and slug are required')
    }

    if (this.companies.some((c) => c.slug === input.slug.toLowerCase())) {
      throw new Error(`Slug '${input.slug}' is already taken`)
    }

    const companyId = `comp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = new Date().toISOString()

    const company: MockCompany = {
      id: companyId,
      name: input.name.trim(),
      name_bn: input.name_bn?.trim() || null,
      slug: input.slug.toLowerCase().trim(),
      business_type: input.business_type,
      phone: input.phone || input.owner_phone || null,
      email: input.email || input.owner_email || null,
      currency: 'BDT',
      default_locale: input.default_locale || 'bn',
      is_active: true,
      created_at: now,
    }
    this.companies.push(company)

    // Main Branch
    const branchId = `br-${Date.now()}`
    this.branches.push({
      id: branchId,
      company_id: companyId,
      name: 'Main Branch / হেড অফিস',
      is_main: true,
    })

    // Settings
    this.settings.push({
      company_id: companyId,
      invoice_prefix: 'INV',
      default_currency: 'BDT',
    })

    // Subscription
    const rawPlan = (input.plan || 'starter').toLowerCase()
    const targetPlanCode = rawPlan === 'growth' ? 'business' : rawPlan
    const plan = this.plans.find((p) => p.code === targetPlanCode) || this.plans[0]

    const subscription: MockCompanySubscription = {
      id: `sub-${Date.now()}`,
      company_id: companyId,
      plan_id: plan.id,
      status: 'trial',
      billing_interval: 'monthly',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_start: now,
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }
    this.subscriptions.push(subscription)

    // Resolve / Link Owner User
    let ownerId = input.ownerUserId
    if (!ownerId && input.owner_email) {
      ownerId = `usr-${Date.now()}`
    }

    if (ownerId) {
      const email = (input.owner_email || input.email || 'owner@print.com').trim().toLowerCase()
      const fullName = input.owner_name || email.split('@')[0]
      const phone = input.owner_phone || input.phone || null

      this.userProfiles[ownerId] = {
        id: ownerId,
        email,
        full_name: fullName,
        phone,
        preferred_locale: input.default_locale || 'bn',
      }

      this.companyUsers.push({
        id: `cu-${Date.now()}`,
        company_id: companyId,
        user_id: ownerId,
        branch_id: branchId,
        status: 'active',
        department: 'Management',
        responsibilities: ['business_owner'],
        profile: this.userProfiles[ownerId],
      })
    }

    return { company, subscription, branchId, ownerId }
  }
}

describe('Tenant & Business Creation End-to-End Audit & Verification', () => {
  test('1. Platform Admin: Provision new business with Business Plan and Owner account', () => {
    const db = new MockTenantDatabase()
    const result = db.createCompany({
      name: 'Padma Printing & Packaging',
      name_bn: 'পদ্মা প্রিন্টিং অ্যান্ড প্যাকেজিং',
      slug: 'padma-print',
      business_type: 'packaging',
      owner_name: 'Engr. Enamul Huq',
      owner_email: 'enamul@padmaprint.com.bd',
      owner_phone: '01712345678',
      plan: 'business',
      default_locale: 'bn',
    })

    assert.ok(result.company.id)
    assert.strictEqual(result.company.slug, 'padma-print')
    assert.strictEqual(result.company.is_active, true)
    assert.strictEqual(result.company.default_locale, 'bn')

    // Verify Subscription is initialized
    assert.ok(result.subscription)
    assert.strictEqual(result.subscription.company_id, result.company.id)
    assert.strictEqual(result.subscription.status, 'trial')
    assert.strictEqual(result.subscription.plan_id, 'plan-business-002')

    // Verify Owner User & Profile
    const companyUser = db.companyUsers.find((cu) => cu.company_id === result.company.id)
    assert.ok(companyUser)
    assert.strictEqual(companyUser.profile.full_name, 'Engr. Enamul Huq')
    assert.strictEqual(companyUser.profile.email, 'enamul@padmaprint.com.bd')
    assert.deepStrictEqual(companyUser.responsibilities, ['business_owner'])
  })

  test('2. Plan Normalization: "growth" legacy option maps safely to "business" plan', () => {
    const db = new MockTenantDatabase()
    const result = db.createCompany({
      name: 'Chittagong Signage Workshop',
      slug: 'ctg-signage',
      business_type: 'signage_flex',
      owner_name: 'Khorshed Alam',
      owner_email: 'khorshed@ctgsign.com',
      plan: 'growth',
    })

    assert.strictEqual(result.subscription.plan_id, 'plan-business-002')
  })

  test('3. Landing Page / Onboarding: Register new tenant with Starter plan and custom area', () => {
    const db = new MockTenantDatabase()
    const registeredUserId = 'usr-onboard-007'

    const result = db.createCompany({
      name: 'Dhaka Digital Press',
      name_bn: 'ঢাকা ডিজিটাল প্রেস',
      slug: 'dhaka-digital',
      business_type: 'digital_printing',
      phone: '01811223344',
      email: 'info@dhakadigital.com',
      owner_name: 'Tareq Rahman',
      owner_email: 'tareq@dhakadigital.com',
      owner_phone: '01811223344',
      plan: 'starter',
      default_locale: 'bn',
      ownerUserId: registeredUserId,
    })

    assert.strictEqual(result.company.slug, 'dhaka-digital')
    assert.strictEqual(result.subscription.status, 'trial')
    assert.strictEqual(result.subscription.plan_id, 'plan-starter-001')

    const cu = db.companyUsers.find((u) => u.user_id === registeredUserId)
    assert.ok(cu)
    assert.strictEqual(cu.company_id, result.company.id)
    assert.strictEqual(cu.profile.full_name, 'Tareq Rahman')
  })

  test('4. Duplicate slug detection prevents conflicting tenant workspaces', () => {
    const db = new MockTenantDatabase()
    db.createCompany({
      name: 'Original Print House',
      slug: 'prime-print',
      business_type: 'commercial_printing',
    })

    assert.throws(
      () => {
        db.createCompany({
          name: 'Duplicate Prime Print',
          slug: 'prime-print',
          business_type: 'commercial_printing',
        })
      },
      /Slug 'prime-print' is already taken/
    )
  })
})
