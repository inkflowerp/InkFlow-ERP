import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Security: Products & Pricing Multi-Tenant Isolation & Attack Paths', () => {
  const tenantA = `company-tenant-alpha-${Date.now()}`
  const tenantB = `company-tenant-beta-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_LISTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
  })

  it('1. Prevents Tenant A from listing Tenant B catalog items', async () => {
    // Tenant A creates product
    await ProductService.createProduct({
      company_id: tenantA,
      name: 'Tenant A Flex Banner',
      sku: 'FLX-A-01',
      unit: 'sft',
      selling_price: 25.0,
    })

    // Tenant B creates product
    await ProductService.createProduct({
      company_id: tenantB,
      name: 'Tenant B Secret Product',
      sku: 'SECRET-B-01',
      unit: 'pcs',
      selling_price: 999.0,
    })

    const prodsA = await ProductService.getProducts(tenantA)
    assert.strictEqual(prodsA.length, 1)
    assert.strictEqual(prodsA[0].name, 'Tenant A Flex Banner')

    const prodsB = await ProductService.getProducts(tenantB)
    assert.strictEqual(prodsB.length, 1)
    assert.strictEqual(prodsB[0].name, 'Tenant B Secret Product')
  })

  it('2. Prevents Tenant A from fetching Tenant B product by ID', async () => {
    const prodB = await ProductService.createProduct({
      company_id: tenantB,
      name: 'Tenant B Confidential Signage',
      sku: 'CONF-B-01',
      unit: 'sft',
      selling_price: 450.0,
    })

    // Tenant A tries to read Tenant B's product
    const retrievedByA = await ProductService.getProductById(prodB.id, tenantA)
    assert.strictEqual(retrievedByA, null, 'Tenant A must not be able to retrieve Tenant B product')
  })

  it('3. Prevents Tenant A from mutating Tenant B product price', async () => {
    const prodB = await ProductService.createProduct({
      company_id: tenantB,
      name: 'Tenant B Premium Item',
      sku: 'PREM-B-01',
      unit: 'pcs',
      selling_price: 500.0,
    })

    // Tenant A tries to change price of Tenant B's product
    const updated = await ProductService.updatePrice(
      prodB.id,
      10.0, // Malicious deflated price
      'Unauthorized price deflating attack',
      'Attacker',
      'user-attacker-01',
      tenantA
    )

    assert.strictEqual(updated, null, 'Tenant A price update attempt must return null and fail closed')

    // Verify Tenant B's product remains untouched at ৳500
    const verifiedB = await ProductService.getProductById(prodB.id, tenantB)
    assert.strictEqual(verifiedB?.selling_price, 500.0)
  })

  it('4. Prevents Tenant A from deleting or archiving Tenant B product', async () => {
    const prodB = await ProductService.createProduct({
      company_id: tenantB,
      name: 'Tenant B Protected Master',
      sku: 'PROT-B-01',
      unit: 'sft',
      selling_price: 60.0,
    })

    // Tenant A tries to delete Tenant B product
    await assert.rejects(
      async () => {
        await ProductService.deleteProduct(prodB.id, tenantA)
      },
      /not found in tenant catalog/
    )

    // Verify Tenant B's product is still active
    const verifiedB = await ProductService.getProductById(prodB.id, tenantB)
    assert.ok(verifiedB)
    assert.strictEqual(verifiedB.is_active, true)
  })

  it('5. Allows identical SKU across different tenants without collision', async () => {
    // Both tenants use standard SKU "FLX-280"
    const prodA = await ProductService.createProduct({
      company_id: tenantA,
      name: 'Flex 280 (Tenant A)',
      sku: 'FLX-280',
      unit: 'sft',
      selling_price: 18.0,
    })

    const prodB = await ProductService.createProduct({
      company_id: tenantB,
      name: 'Flex 280 (Tenant B)',
      sku: 'FLX-280',
      unit: 'sft',
      selling_price: 22.0,
    })

    assert.ok(prodA.id)
    assert.ok(prodB.id)
    assert.notStrictEqual(prodA.id, prodB.id)

    // But duplicate SKU within the SAME tenant must be rejected
    await assert.rejects(
      async () => {
        await ProductService.createProduct({
          company_id: tenantA,
          name: 'Duplicate Flex in Tenant A',
          sku: 'FLX-280',
          unit: 'sft',
          selling_price: 20.0,
        })
      },
      /already exists in your company catalog/
    )
  })
})
