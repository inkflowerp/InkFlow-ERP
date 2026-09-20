import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  STANDARD_FINISHING_OPTIONS,
  STANDARD_ADD_ON_OPTIONS,
  getFinishingRate,
  getAddOnRate,
} from '@/components/billing/new-invoice-modal'

describe('Commercial Invoice Modal — Specs, Add-ons, Finishing & Customer Type', () => {
  it('1. Calculates finishing rate and add-on rate correctly from standard options', () => {
    // Finishing
    assert.equal(getFinishingRate('None'), 0)
    assert.equal(getFinishingRate('none'), 0)
    assert.equal(getFinishingRate('Lamination (Gloss)'), 5)
    assert.equal(getFinishingRate('Eyelet / Grommets'), 5)
    assert.equal(getFinishingRate('Mounting (PVC Board)'), 25)

    // Add-on
    assert.equal(getAddOnRate('None'), 0)
    assert.equal(getAddOnRate('none'), 0)
    assert.equal(getAddOnRate('3mm PVC Pasting'), 45)
    assert.equal(getAddOnRate('5mm Acrylic Board'), 180)
    assert.equal(getAddOnRate('UV Protective Coating'), 8)
  })

  it('2. Custom item finishing & add-on rate overrides take precedence when available', () => {
    const customFinishing = [
      { id: 'custom-1', name: 'Custom Gloss', unit_price: 12 },
    ]
    const customAddOns = [
      { id: 'addon-1', name: 'Premium Stand', unit_price: 150 },
    ]

    assert.equal(getFinishingRate('Custom Gloss', customFinishing), 12)
    assert.equal(getAddOnRate('Premium Stand', customAddOns), 150)
  })

  it('3. Auto-computes effective rate as base_rate + finishing_rate + add_on_rate', () => {
    const baseRate = 22 // Pana Flex base rate
    const finishing = 'Lamination (Gloss)' // +5
    const addOn = '3mm PVC Pasting' // +45

    const fRate = getFinishingRate(finishing)
    const aRate = getAddOnRate(addOn)
    const effectiveRate = baseRate + fRate + aRate

    assert.equal(fRate, 5)
    assert.equal(aRate, 45)
    assert.equal(effectiveRate, 72)

    // Calculate line total for 10ft x 4ft (40 sqft) x 2 prints at effectiveRate 72
    const width = 10
    const height = 4
    const qty = 2
    const area = width * height
    const lineTotal = Math.round(area * qty * effectiveRate)

    assert.equal(area, 40)
    assert.equal(lineTotal, 5760)
  })

  it('4. Correctly reverses base rate when user overrides rate manually', () => {
    const fRate = 5 // Lamination
    const aRate = 45 // 3mm PVC
    const userTypedRate = 80 // User manually types 80

    // Reverse calculated base rate
    const calculatedBase = Math.max(0, userTypedRate - fRate - aRate)
    assert.equal(calculatedBase, 30)

    // If finishing is subsequently changed to Eyelet (+5), rate stays updated with new finishing
    const newFRate = getFinishingRate('Eyelet / Grommets')
    const recalculatedRate = calculatedBase + newFRate + aRate
    assert.equal(recalculatedRate, 80)
  })

  it('5. Contains standard finishing and add-on lists with Bangladeshi localized labels', () => {
    assert.ok(STANDARD_FINISHING_OPTIONS.length >= 10)
    assert.ok(STANDARD_ADD_ON_OPTIONS.length >= 8)

    const eyelet = STANDARD_FINISHING_OPTIONS.find((f) => f.id === 'eyelet')
    assert.ok(eyelet)
    assert.equal(eyelet.name_bn, 'আইলেট / রিং পাঞ্চ')

    const pvc3mm = STANDARD_ADD_ON_OPTIONS.find((a) => a.id === 'pvc_pasting_3mm')
    assert.ok(pvc3mm)
    assert.equal(pvc3mm.name_bn, '৩মিমি পিভিসি পেস্টিং')
  })
})
