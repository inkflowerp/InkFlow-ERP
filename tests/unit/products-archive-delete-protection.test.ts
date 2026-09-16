import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Products Archive & Delete Protection Suite', () => {
  const companyId = `comp-protect-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.QUOTATIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
  })

  it('1. Permanently deletes an unreferenced product with zero dependencies', async () => {
    const unreferenced = await ProductService.createProduct({
      company_id: companyId,
      name: 'Temporary Test Banner',
      sku: 'TEMP-01',
      unit: 'sft',
      selling_price: 20.0,
    })

    const safety = await ProductService.checkProductDeletionSafety(unreferenced.id, companyId)
    assert.strictEqual(safety.isSafe, true)

    const delResult = await ProductService.deleteProduct(unreferenced.id, companyId)
    assert.strictEqual(delResult.deleted, true)
    assert.strictEqual(delResult.archived, false)

    const remaining = await ProductService.getProductById(unreferenced.id, companyId)
    assert.strictEqual(remaining, null)
  })

  it('2. Safely archives a product referenced in a formal quotation (blocks physical deletion)', async () => {
    const referencedProd = await ProductService.createProduct({
      company_id: companyId,
      name: 'Star Frontlit Flex 280 GSM',
      sku: 'FLX-REF-01',
      unit: 'sft',
      selling_price: 18.0,
    })

    // Create a Quotation referencing this product
    await QuotationRepository.createQuotation({
      company_id: companyId,
      customer_name: 'Client Alpha',
      customer_phone: '+8801711223344',
      valid_until: new Date(Date.now() + 86400000 * 30).toISOString(),
      salesperson_name: 'Admin',
      items: [
        {
          id: 'item-ref-01',
          product_id: referencedProd.id,
          description: referencedProd.name,
          width: 10,
          height: 4,
          dimension_unit: 'ft',
          area_sft: 40,
          quantity: 1,
          unit: 'sft',
          unit_rate: 18,
          item_total: 720,
        },
      ],
    })

    const safety = await ProductService.checkProductDeletionSafety(referencedProd.id, companyId)
    assert.strictEqual(safety.isSafe, false)
    assert.strictEqual(safety.references.quotations, 1)

    // Attempting delete must automatically archive rather than hard delete
    const delResult = await ProductService.deleteProduct(referencedProd.id, companyId)
    assert.strictEqual(delResult.deleted, false)
    assert.strictEqual(delResult.archived, true)

    // Verify record still exists in catalog with is_active = false
    const catalogItem = await ProductService.getProductById(referencedProd.id, companyId)
    assert.ok(catalogItem)
    assert.strictEqual(catalogItem.is_active, false)
  })

  it('3. Excludes archived items when activeOnly filter is true', async () => {
    const pActive = await ProductService.createProduct({
      company_id: companyId,
      name: 'Active Product',
      sku: 'ACT-01',
      unit: 'sft',
      selling_price: 25.0,
      is_active: true,
    })

    const pArchived = await ProductService.createProduct({
      company_id: companyId,
      name: 'Old Archived Product',
      sku: 'ARC-01',
      unit: 'sft',
      selling_price: 25.0,
      is_active: false,
    })

    const activeList = await ProductService.getProducts(companyId, true)
    assert.strictEqual(activeList.some((p) => p.id === pActive.id), true)
    assert.strictEqual(activeList.some((p) => p.id === pArchived.id), false)

    const allList = await ProductService.getProducts(companyId, false)
    assert.strictEqual(allList.some((p) => p.id === pArchived.id), true)
  })
})
