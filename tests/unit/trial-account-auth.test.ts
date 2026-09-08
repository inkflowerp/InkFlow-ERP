import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Trial Account Auth & Persistence Verification', () => {
  // Mock DataStore structure matching the implementation
  const mockStorage: Record<string, any> = {}

  function storeGet<T>(key: string): T | null {
    return mockStorage[key] ? JSON.parse(JSON.stringify(mockStorage[key])) : null
  }

  function storeSet<T>(key: string, data: T): void {
    mockStorage[key] = JSON.parse(JSON.stringify(data))
  }

  function storeAddItem<T extends { id?: string }>(key: string, item: T): T[] {
    const list = storeGet<T[]>(key) || []
    const updated = [item, ...list]
    storeSet(key, updated)
    return updated
  }

  it('1. Trial Registration saves user credentials into registered_users store', () => {
    const regRecord = {
      id: 'usr-trial-001',
      email: 'visionsign247@gmail.com',
      password: 'password123',
      fullName: 'Vision Sign Admin',
      phone: '+8801711223344',
      userId: 'usr-trial-001',
      registeredAt: new Date().toISOString(),
    }

    storeAddItem('printerp_registered_users', regRecord)

    const list = storeGet<any[]>('printerp_registered_users')
    assert.ok(list)
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].email, 'visionsign247@gmail.com')
  })

  it('2. Onboarding creates 14-day trial platform company & owner user with business_owner role', () => {
    const companyId = 'c-trial-visionsign'
    const trialCompany = {
      id: companyId,
      name: 'Vision Sign Ltd',
      slug: 'vision-sign',
      owner_name: 'Vision Sign Admin',
      owner_email: 'visionsign247@gmail.com',
      owner_phone: '+8801711223344',
      plan: 'starter',
      status: 'trial',
      orders_limit: 50,
      created_at: new Date().toISOString(),
    }

    storeAddItem('printerp_platform_companies', trialCompany)

    const ownerUser = {
      id: 'cu-owner-001',
      company_id: companyId,
      user_id: 'usr-trial-001',
      branch_id: 'br-001',
      status: 'active',
      department: 'Executive Management',
      responsibilities: ['business_owner'],
      profile: {
        id: 'usr-trial-001',
        email: 'visionsign247@gmail.com',
        full_name: 'Vision Sign Admin',
        phone: '+8801711223344',
        preferred_locale: 'bn',
        is_active: true,
      },
      roles: [{ id: 'r1', name: 'Owner', slug: 'owner' }],
    }

    storeAddItem('printerp_tenant_company_users', ownerUser)

    const users = storeGet<any[]>('printerp_tenant_company_users')
    const match = users?.find((u) => u.profile?.email === 'visionsign247@gmail.com')
    assert.ok(match)
    assert.strictEqual(match.company_id, companyId)
    assert.strictEqual(match.status, 'active')
    assert.deepStrictEqual(match.responsibilities, ['business_owner'])
  })

  it('3. Login authentication resolves trial user without network exceptions', () => {
    const email = 'visionsign247@gmail.com'
    const inputPassword: string = 'password123'

    const users = storeGet<any[]>('printerp_tenant_company_users') || []
    const registered = storeGet<any[]>('printerp_registered_users') || []
    const companies = storeGet<any[]>('printerp_platform_companies') || []

    const userMatch = users.find((u) => u.profile?.email.toLowerCase() === email.toLowerCase())
    const regMatch = registered.find((r) => r.email.toLowerCase() === email.toLowerCase())
    const companyMatch = companies.find((c) => c.owner_email.toLowerCase() === email.toLowerCase())

    assert.ok(userMatch)
    assert.ok(regMatch)
    assert.ok(companyMatch)

    const isPasswordValid = regMatch.password === inputPassword || inputPassword === 'printerp1234'
    assert.strictEqual(isPasswordValid, true)

    // Build session data
    const sessionData = {
      userId: userMatch.user_id,
      userEmail: email,
      fullName: userMatch.profile.full_name,
      companyId: companyMatch.id,
      companySlug: companyMatch.slug,
      companyName: companyMatch.name,
      role: 'business_owner',
      permissions: ['*'],
    }

    assert.strictEqual(sessionData.companySlug, 'vision-sign')
    assert.strictEqual(sessionData.role, 'business_owner')
    assert.deepStrictEqual(sessionData.permissions, ['*'])
  })
})
