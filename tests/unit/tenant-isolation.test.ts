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
    const slug = tenantSlug || 'padma-digital'
    if (!slug || slug === 'padma-digital') return key
    return `${key}__${slug}`
  }

  function storeGet<T>(key: string, tenantSlug?: string): T | null {
    const eff = getEffectiveKey(key, tenantSlug)
    const slug = tenantSlug || 'padma-digital'

    if (mockStorage[eff] !== undefined) {
      return JSON.parse(JSON.stringify(mockStorage[eff]))
    }
    if (slug !== 'padma-digital') {
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

  it('1. Demo Tenant (Padma Digital) receives rich pre-seeded records', () => {
    // Seed padma demo data
    storeSet('printerp_tenant_customers', [
      { id: 'cust-01', name: 'Beximco Pharmaceuticals Ltd.', company_id: 'c-01' },
      { id: 'cust-02', name: 'Square Toiletries Ltd.', company_id: 'c-01' },
    ], 'padma-digital')

    const padmaCustomers = storeGet<any[]>('printerp_tenant_customers', 'padma-digital')
    assert.ok(Array.isArray(padmaCustomers))
    assert.strictEqual(padmaCustomers?.length, 2)
    assert.strictEqual(padmaCustomers?.[0].name, 'Beximco Pharmaceuticals Ltd.')
  })

  it('2. New Trial Tenant (Vision Sign) starts with a completely clean workspace', () => {
    const visionCustomers = storeGet<any[]>('printerp_tenant_customers', 'vision-sign')
    assert.ok(Array.isArray(visionCustomers))
    assert.strictEqual(visionCustomers?.length, 0, 'New trial tenant must not see Padma demo customers')

    const visionOrders = storeGet<any[]>('printerp_tenant_orders', 'vision-sign')
    assert.ok(Array.isArray(visionOrders))
    assert.strictEqual(visionOrders?.length, 0, 'New trial tenant must not see Padma demo orders')
  })

  it('3. Adding data in Vision Sign isolates it from Padma Digital and other tenants', () => {
    const newCustomer = {
      id: 'cust-vs-01',
      company_id: 'c-08',
      name: 'Vision Commercial Client 1',
      mobile: '+8801711247247',
    }

    // Add to vision-sign
    storeAddItem('printerp_tenant_customers', newCustomer, 'vision-sign')

    // Verify vision-sign has this customer
    const visionCustomers = storeGet<any[]>('printerp_tenant_customers', 'vision-sign')
    assert.strictEqual(visionCustomers?.length, 1)
    assert.strictEqual(visionCustomers?.[0].name, 'Vision Commercial Client 1')

    // Verify padma-digital remains untouched with its original demo customers
    const padmaCustomers = storeGet<any[]>('printerp_tenant_customers', 'padma-digital')
    assert.strictEqual(padmaCustomers?.length, 2)
    assert.strictEqual(padmaCustomers?.[0].name, 'Beximco Pharmaceuticals Ltd.')

    // Verify another new tenant starts clean
    const sylhetCustomers = storeGet<any[]>('printerp_tenant_customers', 'sylhet-flex')
    assert.strictEqual(sylhetCustomers?.length, 0, 'Sylhet Flex must start with 0 customers')
  })

  it('4. Platform keys (like registered users and platform companies) remain global', () => {
    assert.strictEqual(isPlatformKey('printerp_platform_companies'), true)
    assert.strictEqual(isPlatformKey('printerp_registered_users'), true)
    assert.strictEqual(isPlatformKey('printerp_tenant_customers'), false)
    assert.strictEqual(isPlatformKey('printerp_tenant_orders'), false)
  })
})
