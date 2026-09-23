import { test } from 'node:test'
import assert from 'node:assert/strict'
import { getProductConversionRatio } from '../../lib/units.ts'
import { enrichProductRecord } from '../../lib/repositories/product.repository.ts'

test('Commercial Master — Product Conversion Ratio & Purchase Economics Audit', async (t) => {
  await t.test('1. Derives 984 sft conversion ratio for PVC MAT-74352 from purchase price ৳6888 and cost ৳7', () => {
    const pvcItem = {
      id: 'prod-pvc-74352',
      name: 'PVC',
      sku: 'MAT-74352',
      product_type: 'material',
      entity_type: 'material',
      purchase_unit: 'roll',
      purchase_price: 6888,
      selling_unit: 'sft',
      unit: 'sft',
      base_cost: 7,
      selling_price: 0,
      default_wastage_percentage: 5,
    }

    const ratio = getProductConversionRatio(pvcItem)
    assert.strictEqual(ratio, 984, 'Conversion ratio should be 984 sft per roll for ৳6888 / ৳7')

    const enriched = enrichProductRecord(pvcItem)
    assert.strictEqual(enriched.conversion_ratio, 984, 'Enriched product conversion_ratio must be 984')
  })

  await t.test('2. Derives conversion ratio from roll dimensions (6ft x 164ft = 984 sft)', () => {
    const itemWithDims = {
      id: 'prod-roll-dims',
      name: 'Star Flex Banner',
      sku: 'MAT-FLEX-06',
      purchase_unit: 'roll',
      selling_unit: 'sft',
      unit: 'sft',
      roll_width_ft: 6,
      roll_length_ft: 164,
      purchase_price: 8500,
      base_cost: 8.64,
    }

    const ratio = getProductConversionRatio(itemWithDims)
    assert.strictEqual(ratio, 984, '6ft x 164ft should derive 984')
  })

  await t.test('3. Derives conversion ratio from roll_sizes array (5.25ft x 164ft = 861 sft)', () => {
    const itemWithRollSizes = {
      id: 'prod-roll-sizes',
      name: 'Vinyl Sticker',
      sku: 'MAT-VINYL-525',
      purchase_unit: 'roll',
      selling_unit: 'sft',
      unit: 'sft',
      material_config: {
        roll_sizes: [
          { width_ft: 5.25, length_ft: 164 }
        ]
      }
    }

    const ratio = getProductConversionRatio(itemWithRollSizes)
    assert.strictEqual(ratio, 861, '5.25ft x 164ft should derive 861')
  })

  await t.test('4. Derives conversion ratio for Rigid Sheet (4ft x 8ft = 32 sft)', () => {
    const sheetItem = {
      id: 'prod-sheet-acrylic',
      name: 'Acrylic Sheet 3mm',
      sku: 'MAT-ACR-3MM',
      purchase_unit: 'sheet',
      selling_unit: 'sft',
      unit: 'sft',
      sheet_width_ft: 4,
      sheet_length_ft: 8,
      purchase_price: 3200,
      base_cost: 100,
    }

    const ratio = getProductConversionRatio(sheetItem)
    assert.strictEqual(ratio, 32, '4ft x 8ft sheet should derive 32 sft')
  })

  await t.test('5. Derives conversion ratio for Pack / Box (1000 pcs / box)', () => {
    const boxItem = {
      id: 'prod-eyelet-box',
      name: 'Brass Eyelets #4',
      sku: 'MAT-EYELET-04',
      purchase_unit: 'box',
      selling_unit: 'piece',
      unit: 'piece',
      pack_quantity: 1000,
      purchase_price: 500,
      base_cost: 0.5,
    }

    const ratio = getProductConversionRatio(boxItem)
    assert.strictEqual(ratio, 1000, 'Pack quantity of 1000 should derive 1000')
  })

  await t.test('6. Preserves explicit custom conversion ratio (> 1)', () => {
    const customRatioItem = {
      id: 'prod-custom-ratio',
      name: 'Special Fabric',
      sku: 'MAT-FAB-01',
      purchase_unit: 'roll',
      selling_unit: 'sft',
      unit: 'sft',
      conversion_ratio: 1640,
    }

    const ratio = getProductConversionRatio(customRatioItem)
    assert.strictEqual(ratio, 1640, 'Explicit conversion ratio of 1640 should be preserved')
  })

  await t.test('7. Default standard roll fallback is 492 sft when no other dimensions or price ratios exist', () => {
    const defaultRollItem = {
      id: 'prod-roll-fallback',
      name: 'Generic Roll',
      sku: 'MAT-GEN-ROLL',
      purchase_unit: 'roll',
      selling_unit: 'sft',
      unit: 'sft',
    }

    const ratio = getProductConversionRatio(defaultRollItem)
    assert.strictEqual(ratio, 492, 'Standard default roll should be 492 (3ft x 164ft)')
  })
})
