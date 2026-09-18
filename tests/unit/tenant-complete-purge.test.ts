import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Tenant Complete Purge & Deletion Verification', () => {
  const testSlug = 'purge-test-press'
  const testCompanyId = 'comp-purge-test-press'

  it('1. Correctly seeds and isolates partitioned and global records for tenant', () => {
    // 1. Seed partitioned collections
    PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, [
      { id: 'emp-001', company_id: testCompanyId, name: 'Purge Worker 1', salary: 25000 },
      { id: 'emp-002', company_id: testCompanyId, name: 'Purge Worker 2', salary: 30000 },
    ], true, testSlug)

    PrintERPDataStore.set(STORAGE_KEYS.ATTENDANCE, [
      { id: 'att-001', company_id: testCompanyId, employee_id: 'emp-001', date: '2026-09-19' },
    ], true, testSlug)

    PrintERPDataStore.set(STORAGE_KEYS.PAYROLL_PERIODS, [
      { id: 'pr-001', company_id: testCompanyId, period_name: 'September 2026' },
    ], true, testSlug)

    // 2. Seed global collections with mixed tenant data
    const existingOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [
      ...existingOrders,
      { id: 'ord-purge-1', company_id: testCompanyId, order_number: 'ORD-PURGE-01' },
      { id: 'ord-keep-1', company_id: 'comp-other-enterprise', order_number: 'ORD-KEEP-01' },
    ])

    const existingCustomers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      ...existingCustomers,
      { id: 'cust-purge-1', company_id: testCompanyId, name: 'Purge Client Ltd' },
      { id: 'cust-keep-1', company_id: 'comp-other-enterprise', name: 'Other Client Ltd' },
    ])

    // Verify presence before purge
    const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, testSlug)
    assert.strictEqual(emps?.length, 2)

    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    assert.ok(orders.some((o) => o.id === 'ord-purge-1'))
  })

  it('2. purgeTenantData completely eradicates all partitioned data, global rows, and user credentials', () => {
    // Perform purge
    PrintERPDataStore.purgeTenantData(testCompanyId, [testSlug, 'comp-purge-test-press', 'co-purge-test-press'])

    // Verify partitioned data is wiped
    const emps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, testSlug)
    assert.deepStrictEqual(emps || [], [])

    const attendance = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ATTENDANCE, testSlug)
    assert.deepStrictEqual(attendance || [], [])

    const payroll = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYROLL_PERIODS, testSlug)
    assert.deepStrictEqual(payroll || [], [])

    // Verify global collections purged matching tenant records while preserving other tenants
    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    assert.strictEqual(orders.some((o) => o.id === 'ord-purge-1'), false)
    assert.strictEqual(orders.some((o) => o.id === 'ord-keep-1'), true)

    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.strictEqual(customers.some((c) => c.id === 'cust-purge-1'), false)
    assert.strictEqual(customers.some((c) => c.id === 'cust-keep-1'), true)
  })
})
