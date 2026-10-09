import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository, sanitizeProductDbPayload, enrichProductRecord } from '../../lib/repositories/product.repository.ts'
import { PrintFlowDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Outsource Product Type Database Check Constraint Compatibility', () => {
  const companyId = 'tenant-outsource-test-01'

  beforeEach(() => {
    PrintFlowDataStore.set(STORAGE_KEYS.PRODUCTS, [], companyId)
  })

  it('1. sanitizeProductDbPayload maps product_type to custom_job to satisfy products_product_type_check while storing outsource in formula', () => {
    const rawPayload = {
      name: 'Offset Leaflet 1000 Pcs',
      product_type: 'outsource',
      entity_type: 'outsource',
      commercial_type: 'outsource',
      pricing_formula: {
        vendor_name: 'Al-Hasan Offset Press',
      },
    }

    const sanitized = sanitizeProductDbPayload(rawPayload, true)

    // PostgreSQL column value must be 'custom_job' to satisfy check constraints in older and current Supabase schemas
    assert.strictEqual(
      sanitized.product_type,
      'custom_job',
      'sanitized.product_type must be mapped to custom_job for DB constraint safety'
    )

    // original_product_type must be preserved in JSONB pricing_formula
    assert.strictEqual(
      sanitized.pricing_formula.original_product_type,
      'outsource',
      'original_product_type must be preserved as outsource in pricing_formula'
    )
    assert.strictEqual(
      sanitized.pricing_formula.is_outsource,
      true,
      'is_outsource flag must be preserved in pricing_formula'
    )
  })

  it('2. enrichProductRecord restores product_type to outsource when read from DB', () => {
    const dbRow = {
      id: 'prod-outsource-99',
      company_id: companyId,
      name: 'Neon Sign Board Outsource',
      sku: 'OUT-NEON-01',
      product_type: 'custom_job', // Physical DB column value
      commercial_type: 'outsource',
      entity_type: 'outsource',
      unit: 'piece',
      selling_price: 5000,
      base_cost: 3500,
      pricing_formula: {
        original_product_type: 'outsource',
        is_outsource: true,
      },
    }

    const enriched = enrichProductRecord(dbRow)

    assert.strictEqual(enriched.product_type, 'outsource', 'enriched.product_type must be restored to outsource')
    assert.strictEqual(enriched.is_outsource, true, 'is_outsource must be true')
    assert.strictEqual(enriched.commercial_type, 'outsource', 'commercial_type must be outsource')
    assert.strictEqual(enriched.entity_type, 'outsource', 'entity_type must be outsource')
  })

  it('3. ProductService creates and fetches Outsource Product seamlessly without constraint failures', async () => {
    const created = await ProductService.createProduct({
      name: 'Embroidered Polo Shirts',
      sku: 'OUT-POLO-50',
      product_type: 'outsource' as any,
      entity_type: 'outsource' as any,
      commercial_type: 'outsource' as any,
      is_outsource: true,
      is_non_inventory: true,
      unit: 'piece',
      selling_price: 650,
      base_cost: 450,
      purchase_price: 450,
      company_id: companyId,
    })

    assert.strictEqual(created.is_outsource, true)
    assert.strictEqual(created.product_type, 'outsource')

    const fetched = await ProductService.getProductById(created.id, companyId)
    assert.ok(fetched)
    assert.strictEqual(fetched.is_outsource, true)
    assert.strictEqual(fetched.product_type, 'outsource')
  })
})
