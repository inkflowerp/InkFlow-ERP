import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Security: Products & Pricing Multi-Tenant Quarantine & RBAC Shielding', () => {
  const companyA = `tenant-alpha-${Date.now()}`
  const companyB = `tenant-beta-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_LISTS, [])
  })

  it('1. Strict Read Isolation: Company A cannot see products belonging to Company B', async () => {
    const prodA = await ProductService.createProduct({
      company_id: companyA,
      name: 'Alpha Exclusive Banner',
      sku: 'ALPHA-01',
      unit: 'sft',
      selling_price: 25.0,
    })

    const prodB = await ProductService.createProduct({
      company_id: companyB,
      name: 'Beta Exclusive Sign',
      sku: 'BETA-01',
      unit: 'sft',
      selling_price: 30.0,
    })

    const listA = await ProductService.getProducts(companyA, false)
    assert.strictEqual(listA.some((p) => p.id === prodA.id), true)
    assert.strictEqual(listA.some((p) => p.id === prodB.id), false)

    const listB = await ProductService.getProducts(companyB, false)
    assert.strictEqual(listB.some((p) => p.id === prodB.id), true)
    assert.strictEqual(listB.some((p) => p.id === prodA.id), false)
  })

  it('2. Cross-Tenant Update Shield: Company A cannot update Company B products', async () => {
    const prodB = await ProductService.createProduct({
      company_id: companyB,
      name: 'Beta Protected Product',
      sku: 'BETA-PROT',
      unit: 'sft',
      selling_price: 50.0,
    })

    // Attempt to update Company B product using Company A context
    await assert.rejects(
      async () => {
        await ProductService.updateProduct(
          prodB.id,
          { selling_price: 1.0 },
          companyA // Forged / mismatched tenant context
        )
      },
      /not found/i,
      'Cross-tenant product mutation must be rejected with not found error'
    )

    // Verify Company B product was not mutated
    const currentB = await ProductService.getProductById(prodB.id, companyB)
    assert.strictEqual(currentB?.selling_price, 50.0)
  })

  it('3. Cross-Tenant Price History Quarantine: Company A cannot read Company B price logs', async () => {
    const prodB = await ProductService.createProduct({
      company_id: companyB,
      name: 'Beta Signboard',
      sku: 'BETA-SGN',
      unit: 'pcs',
      selling_price: 5000.0,
    })

    await ProductService.updatePrice(
      prodB.id,
      6000.0,
      'Confidential price adjustment',
      'Beta Owner',
      'user-beta-01',
      companyB
    )

    // Company A queries price history
    const historyA = await ProductService.getPriceHistory(prodB.id, companyA)
    assert.strictEqual(historyA.length, 0, 'Company A must receive zero price history entries for Company B product')

    const historyB = await ProductService.getPriceHistory(prodB.id, companyB)
    assert.strictEqual(historyB.length, 1)
    assert.strictEqual(historyB[0].new_price, 6000.0)
  })

  it('4. Cross-Tenant Deletion Block: Company A cannot delete Company B products', async () => {
    const prodB = await ProductService.createProduct({
      company_id: companyB,
      name: 'Beta Critical Item',
      sku: 'BETA-CRIT',
      unit: 'pcs',
      selling_price: 1200.0,
    })

    // Attempting delete with Company A context must be rejected
    await assert.rejects(
      async () => {
        await ProductService.deleteProduct(prodB.id, companyA)
      },
      /not found/i,
      'Cross-tenant deletion must be rejected'
    )

    // Verify still exists in Company B catalog
    const checkB = await ProductService.getProductById(prodB.id, companyB)
    assert.ok(checkB, 'Company B product must remain unharmed after malicious cross-tenant delete attempt')
    assert.strictEqual(checkB?.selling_price, 1200.0)
  })
})
