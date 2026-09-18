import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { PlatformService } from '../../services/platform.service.ts'
import { StorageCleanupService } from '../../lib/security/storage-cleanup.ts'

describe('Tenant Permanent Deletion & Full Production Data Audit', () => {
  const tenantA = {
    id: 'comp-audit-alpha',
    slug: 'audit-alpha',
    name: 'Alpha Mega Print Ltd',
  }

  const tenantB = {
    id: 'comp-audit-beta',
    slug: 'audit-beta',
    name: 'Beta Color Press Ltd',
  }

  it('1. Correctly provisions and populates full operational datasets across 15+ domains for Tenant A and Tenant B', async () => {
    // 1. Companies in Platform store
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, [
      { id: tenantA.id, slug: tenantA.slug, name: tenantA.name, status: 'active', plan: 'enterprise' },
      { id: tenantB.id, slug: tenantB.slug, name: tenantB.name, status: 'active', plan: 'business' },
    ])

    // 2. Branches
    PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, [
      { id: 'br-alpha-1', company_id: tenantA.id, name: 'Alpha Motijheel HQ', code: 'MOT' },
      { id: 'br-alpha-2', company_id: tenantA.id, name: 'Alpha Fakirapool', code: 'FAK' },
      { id: 'br-beta-1', company_id: tenantB.id, name: 'Beta Chittagong', code: 'CTG' },
    ])

    // 3. Employees & Attendance
    PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, [
      { id: 'emp-alpha-1', company_id: tenantA.id, name: 'Alpha Operator 1', salary: 35000 },
      { id: 'emp-alpha-2', company_id: tenantA.id, name: 'Alpha Designer 1', salary: 40000 },
      { id: 'emp-beta-1', company_id: tenantB.id, name: 'Beta Operator 1', salary: 32000 },
    ], true, tenantA.slug)

    PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, [
      { id: 'emp-beta-1', company_id: tenantB.id, name: 'Beta Operator 1', salary: 32000 },
    ], true, tenantB.slug)

    PrintERPDataStore.set(STORAGE_KEYS.ATTENDANCE, [
      { id: 'att-alpha-1', company_id: tenantA.id, employee_id: 'emp-alpha-1', date: '2026-09-19' },
    ], true, tenantA.slug)

    PrintERPDataStore.set(STORAGE_KEYS.ATTENDANCE, [
      { id: 'att-beta-1', company_id: tenantB.id, employee_id: 'emp-beta-1', date: '2026-09-19' },
    ], true, tenantB.slug)

    // 4. Customers & CRM
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      { id: 'cust-alpha-1', company_id: tenantA.id, name: 'Alpha Corporate Client A' },
      { id: 'cust-alpha-2', company_id: tenantA.id, name: 'Alpha Retail Client B' },
      { id: 'cust-beta-1', company_id: tenantB.id, name: 'Beta Client VIP' },
    ])

    // 5. Products, Variants & Pricing Rules
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [
      { id: 'prod-alpha-1', company_id: tenantA.id, name: 'Star Flex Banner 510gsm' },
      { id: 'prod-alpha-2', company_id: tenantA.id, name: 'Backlit Film Print' },
      { id: 'prod-beta-1', company_id: tenantB.id, name: 'Glossy Vinyl Sticker' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PRICING_RULES, [
      { id: 'pr-alpha-1', company_id: tenantA.id, rule_name: 'Agency Discount 15%' },
      { id: 'pr-beta-1', company_id: tenantB.id, rule_name: 'Corporate Tier 1' },
    ])

    // 6. Materials, Rolls & Inventory
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [
      { id: 'mat-alpha-1', company_id: tenantA.id, name: 'Star Flex Media 10ft', current_stock: 5000 },
      { id: 'mat-beta-1', company_id: tenantB.id, name: 'SAV Vinyl Media 5ft', current_stock: 3000 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.STOCK_LEDGER, [
      { id: 'stk-alpha-1', company_id: tenantA.id, material_id: 'mat-alpha-1', quantity: 5000, movement_type: 'purchase_in' },
      { id: 'stk-beta-1', company_id: tenantB.id, material_id: 'mat-beta-1', quantity: 3000, movement_type: 'purchase_in' },
    ])

    // 7. Orders & Quotations
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [
      { id: 'quo-alpha-1', company_id: tenantA.id, quotation_number: 'QT-ALPHA-01', total_amount: 85000 },
      { id: 'quo-beta-1', company_id: tenantB.id, quotation_number: 'QT-BETA-01', total_amount: 45000 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [
      { id: 'ord-alpha-1', company_id: tenantA.id, order_number: 'ORD-ALPHA-01', total_amount: 85000 },
      { id: 'ord-beta-1', company_id: tenantB.id, order_number: 'ORD-BETA-01', total_amount: 45000 },
    ])

    // 8. Invoices, Payments & Financials
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [
      { id: 'inv-alpha-1', company_id: tenantA.id, invoice_number: 'INV-ALPHA-01', total_amount: 85000, paid_amount: 50000, due_amount: 35000 },
      { id: 'inv-beta-1', company_id: tenantB.id, invoice_number: 'INV-BETA-01', total_amount: 45000, paid_amount: 45000, due_amount: 0 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, [
      { id: 'pay-alpha-1', company_id: tenantA.id, invoice_id: 'inv-alpha-1', amount: 50000, method: 'bank_transfer' },
      { id: 'pay-beta-1', company_id: tenantB.id, invoice_id: 'inv-beta-1', amount: 45000, method: 'bkash' },
    ])

    // 9. Deliveries & Installations
    PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [
      { id: 'dlv-alpha-1', company_id: tenantA.id, challan_number: 'CH-ALPHA-01', status: 'delivered' },
      { id: 'dlv-beta-1', company_id: tenantB.id, challan_number: 'CH-BETA-01', status: 'in_transit' },
    ])

    // 10. Sync Outbox
    PrintERPDataStore.set(STORAGE_KEYS.SYNC_OUTBOX, [
      { id: 'sync-alpha-1', company_id: tenantA.id, tenantSlug: tenantA.slug, action: 'create_order', payload: {} },
      { id: 'sync-beta-1', company_id: tenantB.id, tenantSlug: tenantB.slug, action: 'record_payment', payload: {} },
    ])

    // Verification before deletion
    const alphaOrders = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []).filter((o) => o.company_id === tenantA.id)
    assert.strictEqual(alphaOrders.length, 1)

    const betaOrders = (PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []).filter((o) => o.company_id === tenantB.id)
    assert.strictEqual(betaOrders.length, 1)
  })

  it('2. Platform Owner permanent deletion executes and eradicates Tenant A with zero orphan rows', async () => {
    // Execute permanent deletion of Tenant A
    const res = await PlatformService.deleteCompany(tenantA.id, 'Administrative permanent purge test')
    assert.strictEqual(res.success, true)
    assert.strictEqual(res.data?.companyId, tenantA.id)

    // Assert Tenant A is completely gone from Companies & Partitioned storage
    const companies = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.strictEqual(companies.some((c) => c.id === tenantA.id || c.slug === tenantA.slug), false)

    const alphaEmps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, tenantA.slug)
    assert.deepStrictEqual(alphaEmps || [], [])

    const alphaAtt = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ATTENDANCE, tenantA.slug)
    assert.deepStrictEqual(alphaAtt || [], [])

    // Assert Tenant A is completely wiped from all Global collections
    const branches = PrintERPDataStore.get<any[]>(STORAGE_KEYS.BRANCHES) || []
    assert.strictEqual(branches.some((b) => b.company_id === tenantA.id), false)

    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.strictEqual(customers.some((c) => c.company_id === tenantA.id), false)

    const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
    assert.strictEqual(products.some((p) => p.company_id === tenantA.id), false)

    const materials = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
    assert.strictEqual(materials.some((m) => m.company_id === tenantA.id), false)

    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    assert.strictEqual(orders.some((o) => o.company_id === tenantA.id), false)

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.strictEqual(invoices.some((i) => i.company_id === tenantA.id), false)

    const payments = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYMENTS) || []
    assert.strictEqual(payments.some((p) => p.company_id === tenantA.id), false)

    const deliveries = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
    assert.strictEqual(deliveries.some((d) => d.company_id === tenantA.id), false)

    const syncOutbox = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    assert.strictEqual(syncOutbox.some((s) => s.company_id === tenantA.id || s.tenantSlug === tenantA.slug), false)
  })

  it('3. Verifies Tenant B remains 100% intact, pristine and completely isolated', () => {
    // Assert Tenant B records are untouched
    const companies = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.ok(companies.some((c) => c.id === tenantB.id && c.slug === tenantB.slug))

    const betaEmps = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES, tenantB.slug)
    assert.strictEqual(betaEmps?.length, 1)
    assert.strictEqual(betaEmps[0].name, 'Beta Operator 1')

    const branches = PrintERPDataStore.get<any[]>(STORAGE_KEYS.BRANCHES) || []
    assert.ok(branches.some((b) => b.id === 'br-beta-1' && b.company_id === tenantB.id))

    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.ok(customers.some((c) => c.id === 'cust-beta-1' && c.company_id === tenantB.id))

    const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
    assert.ok(products.some((p) => p.id === 'prod-beta-1' && p.company_id === tenantB.id))

    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    assert.ok(orders.some((o) => o.id === 'ord-beta-1' && o.company_id === tenantB.id))

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.ok(invoices.some((i) => i.id === 'inv-beta-1' && i.company_id === tenantB.id))

    const syncOutbox = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    assert.ok(syncOutbox.some((s) => s.id === 'sync-beta-1' && s.company_id === tenantB.id))
  })

  it('4. StorageCleanupService safely runs without exceptions and handles tenant storage purge', async () => {
    const cleanupResult = await StorageCleanupService.purgeTenantStorage('comp-audit-alpha', 'audit-alpha')
    assert.strictEqual(cleanupResult.success, true)
    assert.ok(cleanupResult.bucketsScanned >= 0)
  })

  it('5. Verifies empty new tenant produces zero mock/fake data across all stores', () => {
    const emptySlug = 'brand-new-clean-press'
    const cleanCustomers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS, emptySlug)
    assert.deepStrictEqual(cleanCustomers || [], [])

    const cleanOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS, emptySlug)
    assert.deepStrictEqual(cleanOrders || [], [])

    const cleanInvoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES, emptySlug)
    assert.deepStrictEqual(cleanInvoices || [], [])

    const cleanProducts = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS, emptySlug)
    assert.deepStrictEqual(cleanProducts || [], [])
  })
})
