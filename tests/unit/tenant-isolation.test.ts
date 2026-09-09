import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('Tenant Data Isolation & Clean Workspace Partitioning', () => {
  const mockStorage: Record<string, any> = {}

  const PLATFORM_KEYS = new Set([
    'printerp_platform_companies',
    'printerp_platform_plans',
    'printerp_platform_feature_flags',
    'printerp_platform_users',
    'printerp_platform_incidents',
    'printerp_platform_system_settings',
    'printerp_registered_users',
    'printerp_tenant_company_users',
  ])

  function isPlatformKey(key: string): boolean {
    return PLATFORM_KEYS.has(key)
  }

  function getEffectiveKey(key: string, tenantSlug?: string): string {
    if (isPlatformKey(key)) return key
    const slug = tenantSlug || 'tenant-alpha'
    if (!slug || slug === 'tenant-alpha') return key
    return `${key}__${slug}`
  }

  function storeGet<T>(key: string, tenantSlug?: string): T | null {
    const eff = getEffectiveKey(key, tenantSlug)
    const slug = tenantSlug || 'tenant-alpha'

    if (mockStorage[eff] !== undefined) {
      return JSON.parse(JSON.stringify(mockStorage[eff]))
    }
    if (slug !== 'tenant-alpha') {
      return [] as unknown as T
    }
    return null
  }

  function storeSet<T>(key: string, data: T, tenantSlug?: string): void {
    const eff = getEffectiveKey(key, tenantSlug)
    mockStorage[eff] = JSON.parse(JSON.stringify(data))
  }

  function storeAddItem<T extends { id?: string }>(key: string, item: T, tenantSlug?: string): T[] {
    const list = storeGet<T[]>(key, tenantSlug) || []
    const updated = [item, ...list]
    storeSet(key, updated, tenantSlug)
    return updated
  }

  it('1. Tenant Alpha receives seeded records', () => {
    // Seed alpha data
    storeSet('printerp_tenant_customers', [
      { id: 'cust-01', name: 'Beximco Pharmaceuticals Ltd.', company_id: 'c-01' },
      { id: 'cust-02', name: 'Square Toiletries Ltd.', company_id: 'c-01' },
    ], 'tenant-alpha')

    const alphaCustomers = storeGet<any[]>('printerp_tenant_customers', 'tenant-alpha')
    assert.ok(Array.isArray(alphaCustomers))
    assert.strictEqual(alphaCustomers?.length, 2)
    assert.strictEqual(alphaCustomers?.[0].name, 'Beximco Pharmaceuticals Ltd.')
  })

  it('2. New Trial Tenant (Tenant Beta) starts with a completely clean workspace', () => {
    const betaCustomers = storeGet<any[]>('printerp_tenant_customers', 'tenant-beta')
    assert.ok(Array.isArray(betaCustomers))
    assert.strictEqual(betaCustomers?.length, 0, 'New trial tenant must not see Tenant Alpha customers')

    const betaOrders = storeGet<any[]>('printerp_tenant_orders', 'tenant-beta')
    assert.ok(Array.isArray(betaOrders))
    assert.strictEqual(betaOrders?.length, 0, 'New trial tenant must not see Tenant Alpha orders')
  })

  it('3. Adding data in Tenant Beta isolates it from Tenant Alpha and other tenants', () => {
    const newCustomer = {
      id: 'cust-tb-01',
      company_id: 'c-08',
      name: 'Beta Commercial Client 1',
      mobile: '+8801711247247',
    }

    // Add to tenant-beta
    storeAddItem('printerp_tenant_customers', newCustomer, 'tenant-beta')

    // Verify tenant-beta has this customer
    const betaCustomers = storeGet<any[]>('printerp_tenant_customers', 'tenant-beta')
    assert.strictEqual(betaCustomers?.length, 1)
    assert.strictEqual(betaCustomers?.[0].name, 'Beta Commercial Client 1')

    // Verify tenant-alpha remains untouched with its original customers
    const alphaCustomers = storeGet<any[]>('printerp_tenant_customers', 'tenant-alpha')
    assert.strictEqual(alphaCustomers?.length, 2)
    assert.strictEqual(alphaCustomers?.[0].name, 'Beximco Pharmaceuticals Ltd.')

    // Verify another new tenant starts clean
    const gammaCustomers = storeGet<any[]>('printerp_tenant_customers', 'tenant-gamma')
    assert.strictEqual(gammaCustomers?.length, 0, 'Tenant Gamma must start with 0 customers')
  })

  it('4. Platform keys (like registered users and platform companies) remain global', () => {
    assert.strictEqual(isPlatformKey('printerp_platform_companies'), true)
    assert.strictEqual(isPlatformKey('printerp_registered_users'), true)
    assert.strictEqual(isPlatformKey('printerp_tenant_customers'), false)
    assert.strictEqual(isPlatformKey('printerp_tenant_orders'), false)
  })
})
