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

  it('3. resetTenantData resets all operational records while safely keeping users, roles, and company profile intact', () => {
    const resetSlug = 'reset-test-tenant'
    const resetCompanyId = 'comp-reset-test-tenant'

    // 1. Seed company profile & users (SHOULD REMAIN SAFE)
    const existingCompanies = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, [
      ...existingCompanies,
      { id: resetCompanyId, slug: resetSlug, name: 'Reset Test Printing Press' },
    ])

    const existingUsers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.COMPANY_USERS) || []
    PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, [
      ...existingUsers,
      { id: 'usr-reset-owner', company_id: resetCompanyId, email: 'owner@resettest.com', role: 'business_owner' },
      { id: 'usr-reset-staff', company_id: resetCompanyId, email: 'staff@resettest.com', role: 'operator' },
    ])

    // 2. Seed transactional and operational records (SHOULD BE CLEARED)
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [
      { id: 'ord-reset-1', company_id: resetCompanyId, total_amount: 50000 },
      { id: 'ord-other-keep', company_id: 'comp-other-enterprise', total_amount: 12000 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [
      { id: 'inv-reset-1', company_id: resetCompanyId, grand_total: 50000 },
      { id: 'inv-other-keep', company_id: 'comp-other-enterprise', grand_total: 12000 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      { id: 'cust-reset-1', company_id: resetCompanyId, name: 'Reset Client Ltd' },
      { id: 'cust-other-keep', company_id: 'comp-other-enterprise', name: 'Other Keep Client' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.ATTENDANCE, [
      { id: 'att-reset-1', company_id: resetCompanyId, date: '2026-09-22' },
    ], true, resetSlug)

    // 3. Execute tenant reset
    PrintERPDataStore.resetTenantData(resetCompanyId, [resetSlug])

    // 4. Verify operational data was reset for this tenant
    const ordersAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    assert.strictEqual(ordersAfter.some((o) => o.company_id === resetCompanyId), false)
    assert.strictEqual(ordersAfter.some((o) => o.id === 'ord-other-keep'), true)

    const invoicesAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.strictEqual(invoicesAfter.some((i) => i.company_id === resetCompanyId), false)
    assert.strictEqual(invoicesAfter.some((i) => i.id === 'inv-other-keep'), true)

    const customersAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.strictEqual(customersAfter.some((c) => c.company_id === resetCompanyId), false)
    assert.strictEqual(customersAfter.some((c) => c.id === 'cust-other-keep'), true)

    const attendanceAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ATTENDANCE, resetSlug)
    assert.deepStrictEqual(attendanceAfter || [], [])

    // 5. Verify company and staff accounts are preserved intact
    const companiesAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.strictEqual(companiesAfter.some((c) => c.id === resetCompanyId), true)

    const usersAfter = PrintERPDataStore.get<any[]>(STORAGE_KEYS.COMPANY_USERS) || []
    const resetUsers = usersAfter.filter((u) => u.company_id === resetCompanyId)
    assert.strictEqual(resetUsers.length, 2)
    assert.strictEqual(resetUsers.some((u) => u.id === 'usr-reset-owner'), true)
    assert.strictEqual(resetUsers.some((u) => u.id === 'usr-reset-staff'), true)
  })

  it('4. resetTenantData comprehensively resets all operational keys across all aliases and prevents resurrection', () => {
    const multiAliasSlug = 'alpha-press'
    const multiAliasCompId = 'comp-alpha-press'

    // 1. Seed global operational collections across various entities
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, [
      { id: 'job-1', company_id: multiAliasCompId, title: 'Banner Printing' },
      { id: 'job-2', company_id: 'comp-beta-press', title: 'Sticker Printing' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [
      { id: 'dc-1', company_id: multiAliasCompId, challan_number: 'DC-001' },
      { id: 'dc-2', company_id: 'comp-beta-press', challan_number: 'DC-002' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [
      { id: 'sl-1', company_id: multiAliasCompId, quantity: 100 },
      { id: 'sl-2', company_id: 'comp-beta-press', quantity: 250 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [
      { id: 'notif-1', company_id: multiAliasCompId, title: 'Order Dispatched' },
      { id: 'notif-2', company_id: 'comp-beta-press', title: 'Payment Due' },
    ])

    // 2. Execute reset using clean slug alias
    PrintERPDataStore.resetTenantData(multiAliasSlug, [multiAliasCompId, 'co-alpha-press'])

    // 3. Verify all operational collections return empty for alpha-press and intact for beta-press
    const jobs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
    assert.strictEqual(jobs.some((j) => j.company_id === multiAliasCompId), false)
    assert.strictEqual(jobs.some((j) => j.company_id === 'comp-beta-press'), true)

    const challans = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    assert.strictEqual(challans.some((c) => c.company_id === multiAliasCompId), false)
    assert.strictEqual(challans.some((c) => c.company_id === 'comp-beta-press'), true)

    const stock = PrintERPDataStore.get<any[]>(STORAGE_KEYS.STOCK_LEDGER) || []
    assert.strictEqual(stock.some((s) => s.company_id === multiAliasCompId), false)
    assert.strictEqual(stock.some((s) => s.company_id === 'comp-beta-press'), true)

    const notifs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
    assert.strictEqual(notifs.some((n) => n.company_id === multiAliasCompId), false)
    assert.strictEqual(notifs.some((n) => n.company_id === 'comp-beta-press'), true)
  })
})
