import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { getNavigationConfig } from '../../config/navigation.config.ts'
import { TrashRepository } from '../../lib/repositories/trash.repository.ts'
import { TrashService } from '../../services/trash.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import type { QuotationRecord } from '../../types/quotation.types.ts'
import type { InvoiceRecord } from '../../types/billing.types.ts'
import type { CustomerRecord, SupplierRecord } from '../../types/crm.types.ts'
import type { ProductRecord } from '../../types/product.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

const COMPANY_A = 'company-trash-test-a'
const COMPANY_B = 'company-trash-test-b'

describe('Trash & Recycle Bin Unified System for 6 Entities', () => {
  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [])
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [])
    PrintERPDataStore.set(STORAGE_KEYS.SUPPLIERS, [])
  })

  it('1. Navigation configuration includes Trash / Recycle Bin under settings', () => {
    const navSections = getNavigationConfig('acme-press')
    const settingsSection = navSections.find((s) => s.id === 'settings')
    assert.ok(settingsSection, 'Settings section should exist in navigation')

    const trashItem = settingsSection.items.find((item) => item.key === 'trash')
    assert.ok(trashItem, 'Trash navigation item must exist')
    assert.strictEqual(trashItem.title, 'Recycle Bin')
    assert.strictEqual(trashItem.titleBn, 'রিসাইকেল বিন')
    assert.strictEqual(trashItem.href, '/trash')
    assert.strictEqual(trashItem.icon, 'Trash2')
  })

  it('2. Soft-deleting Quotations moves item to Trash and removes from active collection', async () => {
    const sampleQuote: Partial<QuotationRecord> = {
      id: 'quote-test-101',
      quotation_number: 'QUO-2026-001',
      customer_name: 'Beximco Pharma',
      customer_phone: '01711223344',
      grand_total: 25000,
      status: 'draft',
      company_id: COMPANY_A,
    }
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [sampleQuote])

    // Move to trash
    const trashRec = await TrashRepository.moveToTrash({
      category: 'quotations',
      item: sampleQuote,
      companyId: COMPANY_A,
      deletedByName: 'Shamim Officer',
    })

    assert.ok(trashRec.id)
    assert.strictEqual(trashRec.category, 'quotations')
    assert.strictEqual(trashRec.original_id, 'quote-test-101')
    assert.strictEqual(trashRec.reference_number, 'QUO-2026-001')

    // Verify active collection is now empty
    const activeQuotes = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
    assert.strictEqual(activeQuotes.length, 0, 'Quotation should be removed from active collection')

    // Verify trash store has the item
    const trashed = await TrashRepository.getTrashItems(COMPANY_A, 'quotations')
    assert.strictEqual(trashed.length, 1)
    assert.strictEqual(trashed[0].payload.customer_name, 'Beximco Pharma')
  })

  it('3. Soft-deleting Invoices moves item to Trash and removes from active collection', async () => {
    const sampleInvoice: Partial<InvoiceRecord> = {
      id: 'inv-test-201',
      invoice_number: 'INV-2026-5501',
      customer_name: 'Pran RFL Group',
      grand_total: 48000,
      status: 'unpaid',
      company_id: COMPANY_A,
    }
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [sampleInvoice])

    const trashRec = await TrashRepository.moveToTrash({
      category: 'invoices',
      item: sampleInvoice,
      companyId: COMPANY_A,
      deletedByName: 'Audit Manager',
    })

    assert.strictEqual(trashRec.category, 'invoices')
    assert.strictEqual(trashRec.reference_number, 'INV-2026-5501')

    const activeInvoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
    assert.strictEqual(activeInvoices.length, 0)
  })

  it('4. Soft-deleting Customers, Products, Materials, and Suppliers works seamlessly', async () => {
    const sampleCustomer: Partial<CustomerRecord> = {
      id: 'cust-301',
      name: 'Rahim Textiles',
      mobile: '01811223344',
      company_id: COMPANY_A,
    }
    const sampleProduct: Partial<ProductRecord> = {
      id: 'prod-401',
      name: 'Gloss Vinyl Sticker',
      sku: 'PRD-VINYL-01',
      company_id: COMPANY_A,
    }
    const sampleMaterial: Partial<MaterialRecord> = {
      id: 'mat-501',
      name: 'Korean Backlit Flex 440gsm',
      sku: 'MAT-FLEX-01',
      company_id: COMPANY_A,
    }
    const sampleSupplier: Partial<SupplierRecord> = {
      id: 'sup-601',
      supplier_name: 'Nayabazar Media Hub Ltd',
      mobile: '01911223344',
      company_id: COMPANY_A,
    }

    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [sampleCustomer])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [sampleProduct])
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, [sampleMaterial])
    PrintERPDataStore.set(STORAGE_KEYS.SUPPLIERS, [sampleSupplier])

    await TrashRepository.moveToTrash({ category: 'customers', item: sampleCustomer, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'products', item: sampleProduct, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'materials', item: sampleMaterial, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'suppliers', item: sampleSupplier, companyId: COMPANY_A })

    // Verify all active collections are now empty
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []).length, 0)
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []).length, 0)
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []).length, 0)
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.SUPPLIERS) || []).length, 0)

    // Verify summary counts
    const summary = await TrashService.getTrashSummary(COMPANY_A)
    assert.strictEqual(summary.total, 4)
    assert.strictEqual(summary.customers, 1)
    assert.strictEqual(summary.products, 1)
    assert.strictEqual(summary.materials, 1)
    assert.strictEqual(summary.suppliers, 1)
  })

  it('5. Restoring a record from Trash re-inserts it into active collection and removes from Trash', async () => {
    const sampleQuote: Partial<QuotationRecord> = {
      id: 'quote-restore-01',
      quotation_number: 'QUO-RESTORE-01',
      customer_name: 'Square Pharmaceuticals',
      company_id: COMPANY_A,
    }

    const trashed = await TrashRepository.moveToTrash({
      category: 'quotations',
      item: sampleQuote,
      companyId: COMPANY_A,
    })

    assert.strictEqual((await TrashRepository.getTrashItems(COMPANY_A)).length, 1)
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []).length, 0)

    // Restore
    const restored = await TrashRepository.restoreFromTrash(trashed.id, COMPANY_A)
    assert.strictEqual(restored.id, 'quote-restore-01')

    // Verify active collection has it back
    const active = PrintERPDataStore.get<any[]>(STORAGE_KEYS.QUOTATIONS) || []
    assert.strictEqual(active.length, 1)
    assert.strictEqual(active[0].quotation_number, 'QUO-RESTORE-01')

    // Verify trash is now empty
    const trashAfter = await TrashRepository.getTrashItems(COMPANY_A)
    assert.strictEqual(trashAfter.length, 0)
  })

  it('6. Permanently deleting an item from Trash removes it without re-inserting to active', async () => {
    const sampleInvoice: Partial<InvoiceRecord> = {
      id: 'inv-perm-del-01',
      invoice_number: 'INV-PERM-01',
      company_id: COMPANY_A,
    }

    const trashed = await TrashRepository.moveToTrash({
      category: 'invoices',
      item: sampleInvoice,
      companyId: COMPANY_A,
    })

    const deleted = await TrashRepository.permanentDelete(trashed.id, COMPANY_A)
    assert.strictEqual(deleted, true)

    assert.strictEqual((await TrashRepository.getTrashItems(COMPANY_A)).length, 0)
    assert.strictEqual((PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []).length, 0)
  })

  it('7. Emptying Trash by category or entirely purges target records cleanly', async () => {
    await TrashRepository.moveToTrash({ category: 'quotations', item: { id: 'q1' }, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'quotations', item: { id: 'q2' }, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'invoices', item: { id: 'i1' }, companyId: COMPANY_A })
    await TrashRepository.moveToTrash({ category: 'customers', item: { id: 'c1' }, companyId: COMPANY_A })

    // Purge only quotations category
    const purgedQuotations = await TrashRepository.emptyTrash(COMPANY_A, 'quotations')
    assert.strictEqual(purgedQuotations, 2)

    const remaining = await TrashRepository.getTrashItems(COMPANY_A)
    assert.strictEqual(remaining.length, 2)
    assert.ok(remaining.every((r) => r.category !== 'quotations'))

    // Purge all remaining
    const purgedAll = await TrashRepository.emptyTrash(COMPANY_A)
    assert.strictEqual(purgedAll, 2)
    assert.strictEqual((await TrashRepository.getTrashItems(COMPANY_A)).length, 0)
  })

  it('8. Tenant isolation is strictly preserved across trash partitions', async () => {
    await TrashRepository.moveToTrash({
      category: 'products',
      item: { id: 'prod-a-1', name: 'Company A Secret Product' },
      companyId: COMPANY_A,
    })
    await TrashRepository.moveToTrash({
      category: 'products',
      item: { id: 'prod-b-1', name: 'Company B Product' },
      companyId: COMPANY_B,
    })

    const itemsA = await TrashRepository.getTrashItems(COMPANY_A)
    assert.strictEqual(itemsA.length, 1)
    assert.strictEqual(itemsA[0].payload.name, 'Company A Secret Product')

    const itemsB = await TrashRepository.getTrashItems(COMPANY_B)
    assert.strictEqual(itemsB.length, 1)
    assert.strictEqual(itemsB[0].payload.name, 'Company B Product')
  })

  it('9. Trash items record 30-day expiration date automatically upon moving to trash', async () => {
    const item = await TrashRepository.moveToTrash({
      category: 'materials',
      item: { id: 'mat-exp-01', name: 'Reflective Vinyl 3M' },
      companyId: COMPANY_A,
    })

    assert.ok(item.deleted_at)
    assert.ok(item.expires_at)
    const deletedTime = new Date(item.deleted_at).getTime()
    const expiresTime = new Date(item.expires_at).getTime()
    const diffDays = Math.round((expiresTime - deletedTime) / (1000 * 60 * 60 * 24))
    assert.strictEqual(diffDays, 30, 'Expiration must be exactly 30 days after deletion')
  })

  it('10. Items older than 30 days are automatically purged permanently on getTrashItems and getTrashSummary', async () => {
    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()

    const expiredRecord = {
      id: 'trash-expired-1',
      company_id: COMPANY_A,
      category: 'quotations' as const,
      original_id: 'quote-old-01',
      title: 'Quotation Old',
      deleted_at: thirtyOneDaysAgo,
      expires_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      payload: { id: 'quote-old-01' },
    }

    const activeRecord = {
      id: 'trash-active-1',
      company_id: COMPANY_A,
      category: 'invoices' as const,
      original_id: 'inv-recent-01',
      title: 'Invoice Recent',
      deleted_at: tenDaysAgo,
      expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
      payload: { id: 'inv-recent-01' },
    }

    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [expiredRecord, activeRecord])

    // Fetching items should auto-purge expired items permanently
    const items = await TrashRepository.getTrashItems(COMPANY_A)
    assert.strictEqual(items.length, 1)
    assert.strictEqual(items[0].id, 'trash-active-1')

    // Verify underlying store was permanently modified
    const inStore = PrintERPDataStore.get<any[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    assert.strictEqual(inStore.length, 1)
    assert.strictEqual(inStore[0].id, 'trash-active-1')
  })

  it('11. purgeExpiredTrash explicitly purges all expired records across or per tenant', async () => {
    const fortyDaysAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()

    const oldA = {
      id: 'old-a',
      company_id: COMPANY_A,
      category: 'customers' as const,
      original_id: 'c-a',
      title: 'Old Customer A',
      deleted_at: fortyDaysAgo,
      expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      payload: { id: 'c-a' },
    }

    const oldB = {
      id: 'old-b',
      company_id: COMPANY_B,
      category: 'suppliers' as const,
      original_id: 's-b',
      title: 'Old Supplier B',
      deleted_at: fortyDaysAgo,
      expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      payload: { id: 's-b' },
    }

    const recentA = {
      id: 'recent-a',
      company_id: COMPANY_A,
      category: 'products' as const,
      original_id: 'p-a',
      title: 'Recent Product A',
      deleted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      payload: { id: 'p-a' },
    }

    PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [oldA, oldB, recentA])

    // Global purge across all tenants
    const result = await TrashService.purgeExpiredTrash()
    assert.strictEqual(result.purgedCount, 2)
    assert.deepStrictEqual(result.purgedIds.sort(), ['old-a', 'old-b'].sort())

    const remaining = PrintERPDataStore.get<any[]>(STORAGE_KEYS.TRASH_ITEMS) || []
    assert.strictEqual(remaining.length, 1)
    assert.strictEqual(remaining[0].id, 'recent-a')
  })
})
