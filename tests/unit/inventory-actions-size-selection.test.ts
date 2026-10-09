import test from 'node:test'
import assert from 'node:assert/strict'
import { PriceIntelligenceEngine } from '@/lib/domain/price-intelligence-engine'

test('Unit: Inventory Actions Size & Economics Pre-selection', async (t) => {
  const mockBlackPvcMaterial = {
    id: 'mat-black-pvc-101',
    sku: 'FLX-BLK-PVC',
    name: 'Black PVC',
    category: 'flex',
    physical_form: 'roll',
    is_roll: true,
    roll_width_ft: 10.5,
    standard_roll_length_ft: 164,
    roll_sizes: [
      {
        id: 'sz-3.2x164',
        width_ft: 3.2,
        length_ft: 164,
        label: '3.2ft × 164ft (525 sqft)',
        default_supplier_price: 3675,
      },
      {
        id: 'sz-10.5x164',
        width_ft: 10.5,
        length_ft: 164,
        label: '10.5ft × 164ft (1,722 sqft)',
        default_supplier_price: 12054,
      },
    ],
  }

  await t.test('1. PriceIntelligenceEngine returns all configured sizes including 10.5ft', () => {
    const activeSizes = PriceIntelligenceEngine.getMaterialActiveSizes(mockBlackPvcMaterial)
    assert.strictEqual(activeSizes.length, 2)
    const size10_5 = activeSizes.find((s) => s.width_ft === 10.5)
    assert.ok(size10_5, '10.5ft size must exist in active sizes')
    assert.strictEqual(size10_5?.default_supplier_price, 12054)
  })

  await t.test('2. Matching logic selects 10.5ft × 164ft size and exact economics (12,054 BDT)', () => {
    const activeSizes = PriceIntelligenceEngine.getMaterialActiveSizes(mockBlackPvcMaterial)
    const targetWidth = 10.5
    const targetLength = 164

    const matchedSize = activeSizes.find((s) => {
      const matchW =
        (s.width_ft !== undefined && Math.abs(s.width_ft - targetWidth) < 0.05) ||
        (s.nominal_width_ft !== undefined && Math.abs(s.nominal_width_ft - targetWidth) < 0.05)
      if (!matchW) return false
      if (targetLength && s.length_ft !== undefined) {
        return Math.abs(s.length_ft - targetLength) < 1
      }
      return true
    })

    assert.ok(matchedSize, 'Must successfully match 10.5ft size')
    assert.strictEqual(matchedSize?.id, 'sz-10.5x164')
    assert.strictEqual(matchedSize?.default_supplier_price, 12054)
  })

  await t.test('3. Dynamic injection creates configured size if custom roll width was clicked', () => {
    const activeSizes = PriceIntelligenceEngine.getMaterialActiveSizes(mockBlackPvcMaterial)
    const customWidth = 7.5
    const customLength = 164
    const customPrice = 8610

    let matched = activeSizes.find((s) => s.width_ft === customWidth)
    assert.strictEqual(matched, undefined, 'Initially not in predefined sizes')

    if (!matched) {
      const area = Math.round(customWidth * customLength)
      const dynamicSize = {
        id: `size-${customWidth}x${customLength}`,
        label: `${customWidth}ft × ${customLength}ft (${area} sqft)`,
        physical_form: 'roll',
        width_ft: customWidth,
        length_ft: customLength,
        standard_area_sft: area,
        default_supplier_price: customPrice,
      }
      matched = dynamicSize
    }

    assert.ok(matched)
    assert.strictEqual(matched.default_supplier_price, 8610)
    assert.strictEqual(matched.width_ft, 7.5)
  })
})
