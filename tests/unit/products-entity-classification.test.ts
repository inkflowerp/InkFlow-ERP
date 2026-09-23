import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  isServiceProduct,
  isReadyProduct,
  isMaterialProduct,
  getProductEntityKind,
  getProductEntityKindLabel,
} from '../../lib/units.ts'
import { ProductService } from '../../services/product.service.ts'
import { ProductRepository, sanitizeProductDbPayload } from '../../lib/repositories/product.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Product Entity Type Classification (Ready Product vs Raw Material vs Service)', () => {
  const companyId = 'tenant-entity-class-01'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRICE_HISTORY, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_VARIANTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCT_FORMULAS, [])
  })

  it('1. Correctly classifies X-Stand Ready Product with RP-41284 SKU as Ready Product (NOT Raw Material)', async () => {
    const xstandData = {
      name: 'X-Stand',
      name_bn: 'এক্স-স্ট্যান্ড',
      sku: 'RP-41284',
      category: 'display_stands',
      product_type: 'ready_product' as const,
      entity_type: 'product' as const,
      commercial_type: 'ready_product' as const,
      is_ready_product: true,
      unit: 'piece',
      selling_unit: 'piece',
      purchase_unit: 'piece',
      selling_price: 300,
      base_cost: 200,
      purchase_price: 200,
      material_spec: 'Aluminum + Fiberglass Tension Rods',
      material_config: {}, // empty object default from DB schema
      service_config: {},
    }

    assert.strictEqual(isReadyProduct(xstandData), true, 'isReadyProduct must be true')
    assert.strictEqual(isMaterialProduct(xstandData), false, 'isMaterialProduct must be false')
    assert.strictEqual(isServiceProduct(xstandData), false, 'isServiceProduct must be false')
    assert.strictEqual(getProductEntityKind(xstandData), 'product')
    assert.strictEqual(getProductEntityKindLabel(xstandData), 'Ready Product')

    const created = await ProductService.createProduct({
      ...xstandData,
      company_id: companyId,
    })

    assert.strictEqual(created.entity_type, 'product')
    assert.strictEqual(created.is_ready_product, true)
    assert.strictEqual(getProductEntityKindLabel(created), 'Ready Product')
  })

  it('2. Correctly classifies Raw Material (Star Flex Roll) as Raw Material', async () => {
    const materialData = {
      name: 'Star Flex Banner Roll 10ft',
      sku: 'MAT-FLEX-10',
      category: 'roll_media',
      product_type: 'material' as const,
      entity_type: 'material' as const,
      commercial_type: 'material' as const,
      unit: 'sft',
      selling_unit: 'sft',
      purchase_unit: 'roll',
      selling_price: 28,
      base_cost: 16,
      purchase_price: 8500,
      material_config: {
        available_widths_ft: [10, 8, 6],
        standard_roll_length_ft: 164,
        purchase_price_per_sft: 16,
      },
    }

    assert.strictEqual(isMaterialProduct(materialData), true, 'isMaterialProduct must be true')
    assert.strictEqual(isReadyProduct(materialData), false, 'isReadyProduct must be false')
    assert.strictEqual(isServiceProduct(materialData), false, 'isServiceProduct must be false')
    assert.strictEqual(getProductEntityKind(materialData), 'material')
    assert.strictEqual(getProductEntityKindLabel(materialData), 'Raw Material')

    const created = await ProductService.createProduct({
      ...materialData,
      company_id: companyId,
    })

    assert.strictEqual(created.entity_type, 'material')
    assert.strictEqual(getProductEntityKindLabel(created), 'Raw Material')
  })

  it('3. Correctly classifies Print Service (Flex Banner Printing) as Service', async () => {
    const serviceData = {
      name: 'Flex Banner Printing Service',
      sku: 'SRV-FLEX-01',
      category: 'printing',
      product_type: 'print_service' as const,
      entity_type: 'service' as const,
      commercial_type: 'service' as const,
      is_service: true,
      unit: 'sft',
      selling_unit: 'sft',
      selling_price: 35,
      base_cost: 20,
    }

    assert.strictEqual(isServiceProduct(serviceData), true, 'isServiceProduct must be true')
    assert.strictEqual(isReadyProduct(serviceData), false, 'isReadyProduct must be false')
    assert.strictEqual(isMaterialProduct(serviceData), false, 'isMaterialProduct must be false')
    assert.strictEqual(getProductEntityKind(serviceData), 'service')
    assert.strictEqual(getProductEntityKindLabel(serviceData), 'Service')

    const created = await ProductService.createProduct({
      ...serviceData,
      company_id: companyId,
    })

    assert.strictEqual(created.entity_type, 'service')
    assert.strictEqual(getProductEntityKindLabel(created), 'Service')
  })

  it('4. Handles legacy products with missing entity_type by inspecting SKU and category heuristics', async () => {
    const legacyReadyProduct = {
      name: 'Roll-up Standee Luxury',
      sku: 'RP-88312',
      category: 'display_stands',
      unit: 'piece',
      selling_price: 1850,
      base_cost: 1100,
    }

    assert.strictEqual(isReadyProduct(legacyReadyProduct), true)
    assert.strictEqual(isMaterialProduct(legacyReadyProduct), false)
    assert.strictEqual(getProductEntityKindLabel(legacyReadyProduct), 'Ready Product')
  })

  it('5. Correctly classifies Finishing Services (Glossy Lamination & Matte Lamication) as Service (NOT Raw Material)', async () => {
    const glossyLamination = {
      name: 'Glossy Lamination',
      unit: 'sft',
      selling_unit: 'sft',
      selling_price: 10,
      base_cost: 4,
      category: 'finishing',
      pricing_method: 'per_sqft' as const,
    }

    const matteLamication = {
      name: 'Matte Lamication', // user typo tolerance
      unit: 'sft',
      selling_price: 10,
      base_cost: 4,
    }

    assert.strictEqual(isServiceProduct(glossyLamination), true, 'Glossy Lamination must be a service')
    assert.strictEqual(isMaterialProduct(glossyLamination), false, 'Glossy Lamination must not be material')
    assert.strictEqual(isReadyProduct(glossyLamination), false, 'Glossy Lamination must not be ready product')
    assert.strictEqual(getProductEntityKind(glossyLamination), 'service')
    assert.strictEqual(getProductEntityKindLabel(glossyLamination), 'Service')

    assert.strictEqual(isServiceProduct(matteLamication), true, 'Matte Lamication must be a service')
    assert.strictEqual(isMaterialProduct(matteLamication), false, 'Matte Lamication must not be material')
    assert.strictEqual(isReadyProduct(matteLamication), false, 'Matte Lamication must not be ready product')
    assert.strictEqual(getProductEntityKind(matteLamication), 'service')
    assert.strictEqual(getProductEntityKindLabel(matteLamication), 'Service')
  })

  it('6. Correctly classifies Consumable Raw Material (Eyelet piece) as Raw Material', async () => {
    const eyelet = {
      name: 'Eyelet',
      unit: 'piece',
      selling_unit: 'piece',
      selling_price: 5,
      base_cost: 2,
      entity_type: 'material' as const,
      product_type: 'material' as const,
      category: 'materials',
    }

    assert.strictEqual(isServiceProduct(eyelet), false, 'Eyelet must not be a service')
    assert.strictEqual(isMaterialProduct(eyelet), true, 'Eyelet must be a raw material')
    assert.strictEqual(isReadyProduct(eyelet), false, 'Eyelet must not be a ready product')
    assert.strictEqual(getProductEntityKind(eyelet), 'material')
    assert.strictEqual(getProductEntityKindLabel(eyelet), 'Raw Material')
  })

  it('7. sanitizeProductDbPayload guarantees non-null JSONB defaults for material_config and service_config', () => {
    const rawPayload = {
      name: 'Banner Flex 280gsm',
      sku: 'PRD-TEST-001',
      unit: 'sft',
      selling_price: 25,
      material_config: null,
      service_config: null,
      price_tiers: null,
      cost_breakdown: null,
      components: null,
      pricing_formula: null,
    }

    const sanitized = sanitizeProductDbPayload(rawPayload)
    assert.deepStrictEqual(sanitized.material_config, {}, 'material_config must default to empty object, never null')
    assert.deepStrictEqual(sanitized.service_config, {}, 'service_config must default to empty object, never null')
    assert.deepStrictEqual(sanitized.price_tiers, {}, 'price_tiers must default to empty object, never null')
    assert.deepStrictEqual(sanitized.cost_breakdown, {}, 'cost_breakdown must default to empty object, never null')
    assert.deepStrictEqual(sanitized.components, [], 'components must default to empty array, never null')
    assert.deepStrictEqual(sanitized.pricing_formula, {}, 'pricing_formula must default to empty object, never null')
  })
})
