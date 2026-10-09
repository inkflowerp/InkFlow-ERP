import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository, enrichProductRecord } from '../../lib/repositories/product.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Ready Product Factory Purchase Price & Freight/Landed Cost Isolation', () => {
  const companyId = 'tenant-ready-freight-test-01'

  beforeEach(() => {
    PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTS, [], companyId)
  })

  it('1. Correctly preserves factory purchase price (৳230) and landed freight (৳30) on save without blending into factory price', async () => {
    const factoryPrice = 230
    const freightCost = 30
    const landedCost = factoryPrice + freightCost // 260

    const readyProductData = {
      name: 'X-Stand Deluxe 2x5 ft',
      sku: 'RP-XSTAND-2X5',
      category: 'display_stands',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_unit: 'piece',
      purchase_unit: 'piece',
      selling_price: 350,
      base_cost: landedCost,
      purchase_price: factoryPrice,
      freight_cost: freightCost,
      cost_breakdown: {
        material_cost: factoryPrice,
        delivery_cost: freightCost,
        freight_cost: freightCost,
        other_direct_cost: 0,
        total_direct_cost: landedCost,
      },
      pricing_formula: {
        factory_purchase_price: factoryPrice,
        freight_cost: freightCost,
        total_landed_cost: landedCost,
      },
      company_id: companyId,
    }

    const created = await ProductService.createProduct(readyProductData)

    assert.strictEqual(created.purchase_price, 230, 'Factory purchase price must remain 230, never auto-incremented to 260')
    assert.strictEqual(created.base_cost, 260, 'Base cost must equal total landed cost 260')
    assert.strictEqual(created.freight_cost, 30, 'Freight cost must be accurately preserved as 30')
  })

  it('2. Subsequent update preserves factory purchase price (230) and does not accumulate freight on every save', async () => {
    const factoryPrice = 230
    const freightCost = 30
    const landedCost = 260

    const created = await ProductService.createProduct({
      name: 'Roll-Up Banner Stand',
      sku: 'RP-ROLLUP-01',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_price: 350,
      base_cost: landedCost,
      purchase_price: factoryPrice,
      freight_cost: freightCost,
      cost_breakdown: {
        material_cost: factoryPrice,
        delivery_cost: freightCost,
        freight_cost: freightCost,
        total_direct_cost: landedCost,
      },
      pricing_formula: {
        factory_purchase_price: factoryPrice,
        freight_cost: freightCost,
        total_landed_cost: landedCost,
      },
      company_id: companyId,
    })

    // Simulate second save (e.g. changing price or updating inventory)
    const updated = await ProductService.updateProduct(
      created.id,
      {
        selling_price: 380,
        purchase_price: factoryPrice,
        base_cost: landedCost,
        freight_cost: freightCost,
        pricing_formula: {
          factory_purchase_price: factoryPrice,
          freight_cost: freightCost,
          total_landed_cost: landedCost,
        },
      },
      companyId
    )

    assert.strictEqual(updated.purchase_price, 230, 'Factory purchase price must still be 230 after second save')
    assert.strictEqual(updated.base_cost, 260, 'Base cost must remain landed cost 260')
    assert.strictEqual(updated.freight_cost, 30, 'Freight cost must remain 30')

    const fetched = await ProductService.getProductById(created.id, companyId)
    assert.strictEqual(fetched?.purchase_price, 230)
    assert.strictEqual(fetched?.base_cost, 260)
    assert.strictEqual(fetched?.freight_cost, 30)
  })

  it('3. enrichProductRecord accurately resolves factory_purchase_price and freight_cost from formula & breakdown', () => {
    const raw = {
      id: 'p-legacy-01',
      name: 'Legacy Stand',
      base_cost: 260,
      purchase_price: 260, // Legacy bug where purchase_price got overwritten with landed base_cost
      pricing_formula: {
        factory_purchase_price: 230,
        freight_cost: 30,
      },
    }

    const enriched = enrichProductRecord(raw)
    assert.strictEqual(enriched.purchase_price, 230, 'enrichProductRecord must prioritize factory_purchase_price over corrupted base_cost copy')
    assert.strictEqual(enriched.freight_cost, 30, 'enrichProductRecord must recover freight_cost')
  })
})
