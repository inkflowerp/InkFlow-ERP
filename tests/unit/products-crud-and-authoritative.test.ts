import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Products & Services CRUD, Authority & Validation', () => {
  const companyA = `comp-prod-test-${Date.now()}`
  const companyB = `comp-prod-other-${Date.now()}`

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
  })

  it('1. Creates a valid print product with English & Bengali identity and pricing', async () => {
    const created = await ProductService.createProduct({
      company_id: companyA,
      name: 'Star Flex Banner (Frontlit 280 GSM)',
      name_bn: 'স্টার ফ্লেক্স ব্যানার (ফ্রন্টলিট)',
      sku: 'FLX-280-TEST',
      category: 'flex_banner',
      product_type: 'print_service',
      unit: 'sft',
      material_spec: '280 GSM Chinese Star Flex Media',
      description: 'High durability outdoor solvent banner',
      description_bn: 'উচ্চ স্থায়িত্ব সম্পন্ন আউটডোর সলভেন্ট ব্যানার',
      base_cost: 11.5,
      selling_price: 18.0,
      min_price: 15.0,
      tax_rate: 7.5,
      requires_finishing: true,
      default_department: 'printing',
    })

    assert.ok(created.id)
    assert.strictEqual(created.company_id, companyA)
    assert.strictEqual(created.name, 'Star Flex Banner (Frontlit 280 GSM)')
    assert.strictEqual(created.name_bn, 'স্টার ফ্লেক্স ব্যানার (ফ্রন্টলিট)')
    assert.strictEqual(created.sku, 'FLX-280-TEST')
    assert.strictEqual(created.selling_price, 18.0)
    assert.strictEqual(created.base_cost, 11.5)
    assert.strictEqual(created.min_price, 15.0)
    assert.strictEqual(created.is_active, true)
  })

  it('2. Enforces SKU uniqueness per company (blocks duplicates)', async () => {
    await ProductService.createProduct({
      company_id: companyA,
      name: 'Eco Vinyl Gloss',
      sku: 'VINYL-GLOSS-01',
      unit: 'sft',
      selling_price: 35.0,
    })

    // Attempt to create duplicate SKU in same company
    await assert.rejects(
      async () => {
        await ProductService.createProduct({
          company_id: companyA,
          name: 'Eco Vinyl Duplicate',
          sku: 'VINYL-GLOSS-01',
          unit: 'sft',
          selling_price: 38.0,
        })
      },
      /already exists/i,
      'Duplicate SKU in Company A must be rejected'
    )

    // Different company can use the same SKU (tenant-scoped uniqueness)
    const companyBProduct = await ProductService.createProduct({
      company_id: companyB,
      name: 'Company B Vinyl',
      sku: 'VINYL-GLOSS-01',
      unit: 'sft',
      selling_price: 40.0,
    })
    assert.ok(companyBProduct.id)
    assert.strictEqual(companyBProduct.company_id, companyB)
  })

  it('3. Updates catalog product specifications and pricing', async () => {
    const created = await ProductService.createProduct({
      company_id: companyA,
      name: 'Panaflex Signage Media',
      sku: 'PANA-01',
      unit: 'sft',
      selling_price: 32.0,
      base_cost: 20.0,
      min_price: 26.0,
    })

    const updated = await ProductService.updateProduct(
      created.id,
      {
        selling_price: 36.0,
        base_cost: 22.0,
        material_spec: '440 GSM Translucent Panaflex',
      },
      companyA
    )

    assert.strictEqual(updated.selling_price, 36.0)
    assert.strictEqual(updated.base_cost, 22.0)
    assert.strictEqual(updated.material_spec, '440 GSM Translucent Panaflex')
  })

  it('4. Updates price and records an immutable price history audit log', async () => {
    const created = await ProductService.createProduct({
      company_id: companyA,
      name: 'Roll-Up Standee 3x6.5ft',
      sku: 'STN-01',
      unit: 'pcs',
      selling_price: 1800.0,
      base_cost: 1100.0,
    })

    const updated = await ProductService.updatePrice(
      created.id,
      2000.0,
      'Aluminum hardware import duty hike',
      'Owner Admin',
      'user-admin-01',
      companyA
    )

    assert.ok(updated)
    assert.strictEqual(updated.selling_price, 2000.0)

    const history = await ProductService.getPriceHistory(created.id, companyA)
    assert.strictEqual(history.length, 1)
    assert.strictEqual(history[0].old_price, 1800.0)
    assert.strictEqual(history[0].new_price, 2000.0)
    assert.strictEqual(history[0].reason, 'Aluminum hardware import duty hike')
    assert.strictEqual(history[0].changed_by_name, 'Owner Admin')
  })

  it('5. Creates, retrieves and deletes product variants', async () => {
    const product = await ProductService.createProduct({
      company_id: companyA,
      name: 'Acrylic Sheet',
      sku: 'ACR-BASE',
      unit: 'sft',
      selling_price: 100.0,
    })

    const v1 = await ProductService.createProductVariant({
      company_id: companyA,
      product_id: product.id,
      variant_name: '3mm Cast Acrylic Clear',
      thickness_mm: 3,
      price_adjustment: 20,
      cost_adjustment: 12,
    })

    const v2 = await ProductService.createProductVariant({
      company_id: companyA,
      product_id: product.id,
      variant_name: '5mm Cast Acrylic Clear',
      thickness_mm: 5,
      price_adjustment: 50,
      cost_adjustment: 30,
    })

    const variants = await ProductService.getProductVariants(product.id, companyA)
    assert.strictEqual(variants.length, 2)

    await ProductService.deleteProductVariant(v1.id, companyA)
    const remaining = await ProductService.getProductVariants(product.id, companyA)
    assert.strictEqual(remaining.length, 1)
    assert.strictEqual(remaining[0].variant_name, '5mm Cast Acrylic Clear')
  })
})
