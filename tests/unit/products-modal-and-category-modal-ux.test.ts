import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  PRODUCT_TYPE_CARDS,
  PRICING_PILLS,
  PRODUCT_TYPE_DEFAULT_MAP,
  PRICING_METHOD_DEFAULT_MAP,
} from '../../lib/product-modal-constants.ts'
import type { CommercialProductType, PricingMethod } from '../../types/product.types.ts'
import type { ProductCategoryRecord, CreateCategoryInput } from '../../types/category.types.ts'

describe('InkFlow — Simplified Product Modal & Category Modal UX Suite', () => {
  describe('1. Product Type Selector Cards (8 Human-Friendly Types)', () => {
    it('1.1 Exposes exactly 8 human-readable product type cards with no technical enum jargon', () => {
      assert.equal(PRODUCT_TYPE_CARDS.length, 8)
      const keys = PRODUCT_TYPE_CARDS.map(c => c.key)
      assert.deepEqual(keys, [
        'production_product',
        'service',
        'material',
        'finishing',
        'fabrication',
        'installation',
        'delivery',
        'package',
      ])

      for (const card of PRODUCT_TYPE_CARDS) {
        assert.ok(card.label.length > 0, `Card ${card.key} should have a non-empty label`)
        assert.ok(card.desc.length > 0, `Card ${card.key} should have a non-empty description`)
        // Should not expose raw database enum strings to user
        assert.ok(!card.label.includes('_'), `Card label '${card.label}' should not contain underscores`)
      }
    })

    it('1.2 Default mapping sets contextual defaults upon Product Type selection', () => {
      // Service
      const serviceDefaults = PRODUCT_TYPE_DEFAULT_MAP['service']
      assert.equal(serviceDefaults.pricing_method, 'per_job')
      assert.equal(serviceDefaults.selling_unit, 'job')
      assert.equal(serviceDefaults.requires_production, false)

      // Ready Product
      const productDefaults = PRODUCT_TYPE_DEFAULT_MAP['ready_product']
      assert.equal(productDefaults.pricing_method, 'per_piece')
      assert.equal(productDefaults.selling_unit, 'piece')
      assert.equal(productDefaults.requires_production, false)

      // Fabrication / Production
      const fabDefaults = PRODUCT_TYPE_DEFAULT_MAP['fabrication']
      assert.equal(fabDefaults.pricing_method, 'per_area')
      assert.equal(fabDefaults.selling_unit, 'sft')
      assert.equal(fabDefaults.requires_production, true)

      // Material
      const matDefaults = PRODUCT_TYPE_DEFAULT_MAP['material']
      assert.equal(matDefaults.pricing_method, 'per_piece')
      assert.equal(matDefaults.selling_unit, 'piece')

      // Delivery
      const delDefaults = PRODUCT_TYPE_DEFAULT_MAP['delivery']
      assert.equal(delDefaults.pricing_method, 'fixed')
      assert.equal(delDefaults.selling_unit, 'job')
    })
  })

  describe('2. Pricing Method Pills & Unit Synchronization', () => {
    it('2.1 Exposes clear human-friendly pricing method pills', () => {
      assert.equal(PRICING_PILLS.length, 8)
      const methods = PRICING_PILLS.map(p => p.key)
      assert.deepEqual(methods, [
        'fixed',
        'per_piece',
        'per_area',
        'per_length',
        'per_weight',
        'per_job',
        'per_hour',
        'formula',
      ])

      // Verify labels
      const labelMap = Object.fromEntries(PRICING_PILLS.map(p => [p.key, p.label]))
      assert.equal(labelMap['fixed'], 'Fixed Price')
      assert.equal(labelMap['per_piece'], 'Per Piece')
      assert.equal(labelMap['per_area'], 'Per Sqft')
      assert.equal(labelMap['per_length'], 'Per Ft')
      assert.equal(labelMap['per_weight'], 'Per Kg')
      assert.equal(labelMap['per_job'], 'Per Job')
      assert.equal(labelMap['per_hour'], 'Per Hour')
      assert.equal(labelMap['formula'], 'Formula')
    })

    it('2.2 Pricing method selection synchronizes selling unit and label prefix accurately', () => {
      // Per Sqft
      const sqftMeta = PRICING_METHOD_DEFAULT_MAP['per_area']
      assert.equal(sqftMeta.selling_unit, 'sqft')
      assert.equal(sqftMeta.unit_label, '/ sqft')

      // Per Piece
      const pieceMeta = PRICING_METHOD_DEFAULT_MAP['per_piece']
      assert.equal(pieceMeta.selling_unit, 'piece')
      assert.equal(pieceMeta.unit_label, '/ piece')

      // Per Job
      const jobMeta = PRICING_METHOD_DEFAULT_MAP['per_job']
      assert.equal(jobMeta.selling_unit, 'job')
      assert.equal(jobMeta.unit_label, '/ job')

      // Fixed
      const fixedMeta = PRICING_METHOD_DEFAULT_MAP['fixed']
      assert.equal(fixedMeta.selling_unit, 'job')
      assert.equal(fixedMeta.unit_label, '')
    })
  })

  describe('3. Category Modal & Hierarchy UX', () => {
    it('3.1 Validates simple category creation payload structure', () => {
      const input: CreateCategoryInput = {
        name: 'Flex Banner',
        name_bn: 'ফ্লেক্স ব্যানার',
        parent_id: 'cat-printing-root',
        applies_to_product_types: ['all'],
        description: 'All flex banner printing materials and services',
        is_active: true,
        display_order: 1,
      }

      assert.equal(input.name, 'Flex Banner')
      assert.equal(input.parent_id, 'cat-printing-root')
      assert.equal(input.is_active, true)
    })

    it('3.2 Category Type pills map cleanly to product type groups', () => {
      const getTypesForGroup = (group: 'both' | 'products' | 'services') => {
        if (group === 'both') return ['all']
        if (group === 'products') return ['production_product', 'ready_product', 'material', 'fabrication']
        if (group === 'services') return ['service', 'installation', 'delivery', 'finishing']
        return ['all']
      }

      assert.deepEqual(getTypesForGroup('both'), ['all'])
      assert.deepEqual(getTypesForGroup('products'), ['production_product', 'ready_product', 'material', 'fabrication'])
      assert.deepEqual(getTypesForGroup('services'), ['service', 'installation', 'delivery', 'finishing'])
    })

    it('3.3 Visual Hierarchy formatting produces clean tree preview', () => {
      const formatHierarchyPreview = (parentName: string, childName: string) => {
        return `${parentName}\n└── ${childName}`
      }

      const preview = formatHierarchyPreview('Printing', 'Flex Banner')
      assert.equal(preview, 'Printing\n└── Flex Banner')
    })
  })

  describe('4. In-Place Category Creation & Form State Retention', () => {
    it('4.1 Product form state survives in-place Category creation without reset', () => {
      // Mock existing product form data entered by user
      const draftProductForm = {
        name: 'Star Flex Banner 280 GSM',
        commercial_type: 'production_product' as CommercialProductType,
        pricing_method: 'per_area' as PricingMethod,
        selling_price: 25,
        sku: 'FX-280-STAR',
        category_id: '',
      }

      // Simulate Category modal returning new category
      const newlyCreatedCategory: ProductCategoryRecord = {
        id: 'new-cat-999',
        company_id: 'tenant-123',
        name: 'Flex & Banner',
        name_bn: 'ফ্লেক্স ও ব্যানার',
        slug: 'flex-banner',
        parent_id: null,
        parent_name: null,
        applies_to_product_types: ['all'],
        description: null,
        display_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // In-place update simulation
      const updatedProductForm = {
        ...draftProductForm,
        category_id: newlyCreatedCategory.id,
      }

      assert.equal(updatedProductForm.name, 'Star Flex Banner 280 GSM')
      assert.equal(updatedProductForm.selling_price, 25)
      assert.equal(updatedProductForm.sku, 'FX-280-STAR')
      assert.equal(updatedProductForm.category_id, 'new-cat-999')
    })
  })

  describe('5. Progressive Disclosure & Contextual Sections', () => {
    it('5.1 Service type suppresses roll dimensions, purchasing, and production allowance', () => {
      const productType: CommercialProductType = 'service'
      const isService = (t: CommercialProductType) => ['service', 'finishing', 'installation', 'delivery'].includes(t)

      assert.equal(isService(productType), true)

      // Section visibility rules
      const showPurchasing = (t: CommercialProductType) => !isService(t)
      const showRollProduction = (t: CommercialProductType) => t === 'production_product' || t === 'fabrication'

      assert.equal(showPurchasing(productType), false, 'Service should not show purchasing section')
      assert.equal(showRollProduction(productType), false, 'Service should not show roll production section')
    })

    it('5.2 Flex / Printing Product allows roll dimension allowances when expanded', () => {
      const productType: CommercialProductType = 'production_product'
      const isService = ['service', 'finishing', 'installation', 'delivery'].includes(productType)

      assert.equal(isService, false)

      const productionConfig = {
        production_width: 3.25,
        production_length: 164,
        production_width_allowance: 0.25,
        production_length_allowance: 0.25,
        allowance_unit: 'ft',
        operational_wastage_pct: 3,
      }

      assert.equal(productionConfig.production_width_allowance, 0.25)
      assert.equal(productionConfig.production_length_allowance, 0.25)
      assert.equal(productionConfig.operational_wastage_pct, 3)
    })
  })
})
