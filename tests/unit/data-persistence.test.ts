import { describe, it } from 'node:test'
import assert from 'node:assert'

// Unit test mock of PrintERP unified persistence storage engine
class PersistenceEngine {
  private cache: Map<string, any> = new Map()

  set<T>(key: string, data: T): void {
    this.cache.set(key, JSON.parse(JSON.stringify(data)))
  }

  get<T>(key: string): T | null {
    const val = this.cache.get(key)
    return val !== undefined ? JSON.parse(JSON.stringify(val)) : null
  }

  updateItem<T extends { id: string }>(key: string, id: string, patch: Partial<T>): T | null {
    const list = this.get<T[]>(key) || []
    const idx = list.findIndex((i) => i.id === id)
    if (idx === -1) return null
    const updated = { ...list[idx], ...patch, updated_at: new Date().toISOString() }
    list[idx] = updated
    this.set(key, list)
    return updated
  }

  addItem<T extends { id: string }>(key: string, item: T): T {
    const list = this.get<T[]>(key) || []
    const filtered = list.filter((i) => i.id !== item.id)
    filtered.unshift(item)
    this.set(key, filtered)
    return item
  }

  removeItem<T extends { id: string }>(key: string, id: string): boolean {
    const list = this.get<T[]>(key) || []
    const next = list.filter((i) => i.id !== id)
    this.set(key, next)
    return next.length < list.length
  }
}

describe('Unified DataStore Persistence Engine', () => {
  const store = new PersistenceEngine()

  it('1. Basic Store & Retrieve: items persist in cache accurately', () => {
    store.set('company_profile', {
      id: 'c-01',
      name: 'Padma Digital Ltd.',
      phone: '+8801711223344',
      bin_no: '004819284-9999',
    })

    const retrieved = store.get<any>('company_profile')
    assert.ok(retrieved)
    assert.strictEqual(retrieved.name, 'Padma Digital Ltd.')
    assert.strictEqual(retrieved.phone, '+8801711223344')
    assert.strictEqual(retrieved.bin_no, '004819284-9999')
  })

  it('2. Add and Update Array Items: updates preserve existing fields and update dirty properties', () => {
    interface TestCustomer {
      id: string
      name: string
      mobile: string
      credit_limit: number
    }

    store.set<TestCustomer[]>('customers', [
      { id: 'cust-1', name: 'Beximco Pharma', mobile: '+8801711000000', credit_limit: 50000 },
      { id: 'cust-2', name: 'Square Toiletries', mobile: '+8801819000000', credit_limit: 30000 },
    ])

    // Add item
    store.addItem<TestCustomer>('customers', {
      id: 'cust-3',
      name: 'Acme Signs',
      mobile: '+8801911000000',
      credit_limit: 20000,
    })
    let list = store.get<TestCustomer[]>('customers')
    assert.strictEqual(list?.length, 3)
    assert.strictEqual(list?.[0].id, 'cust-3')

    // Update item
    const updated = store.updateItem<TestCustomer>('customers', 'cust-1', {
      credit_limit: 80000,
      name: 'Beximco Pharmaceuticals Ltd.',
    })
    assert.ok(updated)
    assert.strictEqual(updated.credit_limit, 80000)
    assert.strictEqual(updated.mobile, '+8801711000000') // Preserved

    list = store.get<TestCustomer[]>('customers')
    const found = list?.find((c) => c.id === 'cust-1')
    assert.strictEqual(found?.credit_limit, 80000)
    assert.strictEqual(found?.name, 'Beximco Pharmaceuticals Ltd.')
  })

  it('3. Safe Removal: items are removed without corrupting other records', () => {
    const ok = store.removeItem('customers', 'cust-2')
    assert.strictEqual(ok, true)

    const list = store.get<any[]>('customers')
    assert.strictEqual(list?.length, 2)
    assert.strictEqual(list?.find((c) => c.id === 'cust-2'), undefined)
  })

  it('4. Deep Isolation: mutations on returned objects do not pollute internal store without set', () => {
    const initial = store.get<any>('company_profile')
    initial.name = 'Hacked Name'

    const secondFetch = store.get<any>('company_profile')
    assert.strictEqual(secondFetch.name, 'Padma Digital Ltd.')
  })
})
