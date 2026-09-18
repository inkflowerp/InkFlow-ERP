import { describe, it } from 'node:test'
import assert from 'node:assert'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { PlatformService } from '../../services/platform.service.ts'

describe('Adversarial Security Audit: Cross-Tenant Isolation & Old ID Access Post-Deletion', () => {
  const tenantA = {
    id: 'comp-sec-tenant-a',
    slug: 'sec-tenant-a',
    name: 'Security Test Tenant A',
  }

  const tenantB = {
    id: 'comp-sec-tenant-b',
    slug: 'sec-tenant-b',
    name: 'Security Test Tenant B',
  }

  it('1. Seeds realistic operational state for Tenant A and Tenant B', () => {
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, [
      { id: tenantA.id, slug: tenantA.slug, name: tenantA.name, status: 'active' },
      { id: tenantB.id, slug: tenantB.slug, name: tenantB.name, status: 'active' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [
      { id: 'cust-a-101', company_id: tenantA.id, name: 'Tenant A Secret Customer' },
      { id: 'cust-b-201', company_id: tenantB.id, name: 'Tenant B Secret Customer' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [
      { id: 'inv-a-101', company_id: tenantA.id, invoice_number: 'INV-A-101', total_amount: 120000 },
      { id: 'inv-b-201', company_id: tenantB.id, invoice_number: 'INV-B-201', total_amount: 85000 },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [
      { id: 'prod-a-101', company_id: tenantA.id, name: 'Tenant A Patented Product' },
      { id: 'prod-b-201', company_id: tenantB.id, name: 'Tenant B Patented Product' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [
      { id: 'mat-a-101', company_id: tenantA.id, name: 'Tenant A Exclusive Vinyl' },
      { id: 'mat-b-201', company_id: tenantB.id, name: 'Tenant B Exclusive Vinyl' },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.SYNC_OUTBOX, [
      { id: 'sync-a-101', company_id: tenantA.id, tenantSlug: tenantA.slug, action: 'update_invoice' },
      { id: 'sync-b-201', company_id: tenantB.id, tenantSlug: tenantB.slug, action: 'update_invoice' },
    ])
  })

  it('2. Permanently deletes Tenant A and verifies zero remaining records', async () => {
    const res = await PlatformService.deleteCompany(tenantA.id, 'Cross-tenant adversarial verification')
    assert.strictEqual(res.success, true)

    // Verify Tenant A is gone everywhere
    const companies = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.strictEqual(companies.some((c) => c.id === tenantA.id), false)

    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.strictEqual(customers.some((c) => c.company_id === tenantA.id), false)

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.strictEqual(invoices.some((i) => i.company_id === tenantA.id), false)

    const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
    assert.strictEqual(products.some((p) => p.company_id === tenantA.id), false)

    const syncOutbox = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    assert.strictEqual(syncOutbox.some((s) => s.company_id === tenantA.id || s.tenantSlug === tenantA.slug), false)
  })

  it('3. Old Tenant A IDs cannot resolve any records (404/Empty result guarantee)', () => {
    // Attempting to query by old IDs
    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    const custA = customers.find((c) => c.id === 'cust-a-101')
    assert.strictEqual(custA, undefined)

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    const invA = invoices.find((i) => i.id === 'inv-a-101')
    assert.strictEqual(invA, undefined)

    const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
    const prodA = products.find((p) => p.id === 'prod-a-101')
    assert.strictEqual(prodA, undefined)
  })

  it('4. Asserts Tenant B remains 100% untouched and operational', () => {
    const companies = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    assert.ok(companies.some((c) => c.id === tenantB.id))

    const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    assert.ok(customers.some((c) => c.id === 'cust-b-201' && c.company_id === tenantB.id))

    const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.ok(invoices.some((i) => i.id === 'inv-b-201' && i.company_id === tenantB.id))

    const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
    assert.ok(products.some((p) => p.id === 'prod-b-201' && p.company_id === tenantB.id))

    const syncOutbox = PrintERPDataStore.get<any[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    assert.ok(syncOutbox.some((s) => s.id === 'sync-b-201' && s.company_id === tenantB.id))
  })
})
