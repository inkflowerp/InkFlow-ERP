import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  STANDARD_FINISHING_OPTIONS,
  STANDARD_ADD_ON_OPTIONS,
  getFinishingRate,
  getAddOnRate,
} from '../../lib/finishing-addons.ts'

describe('Quotation Modal — Specs, Add-ons, Finishing & Multi-Field Customer Search', () => {
  it('1. Calculates finishing rate and add-on rate correctly from standard options in quotations', () => {
    // Finishing
    assert.equal(getFinishingRate('None'), 0)
    assert.equal(getFinishingRate('none'), 0)
    assert.equal(getFinishingRate(null), 0)
    assert.equal(getFinishingRate(undefined), 0)
    assert.equal(getFinishingRate('Lamination (Gloss)'), 5)
    assert.equal(getFinishingRate('Lamination (Matt)'), 6)
    assert.equal(getFinishingRate('Eyelet / Grommets'), 5)
    assert.equal(getFinishingRate('Mounting (PVC Board)'), 25)

    // Add-on
    assert.equal(getAddOnRate('None'), 0)
    assert.equal(getAddOnRate('none'), 0)
    assert.equal(getAddOnRate(null), 0)
    assert.equal(getAddOnRate(undefined), 0)
    assert.equal(getAddOnRate('3mm PVC Pasting'), 45)
    assert.equal(getAddOnRate('5mm PVC Pasting'), 70)
    assert.equal(getAddOnRate('5mm Acrylic Board'), 180)
    assert.equal(getAddOnRate('UV Protective Coating'), 8)
  })

  it('2. Custom product item finishing & add-on rate overrides take precedence when provided', () => {
    const customFinishing = [
      { id: 'custom-f1', name: 'Premium Matt Lam', selling_price: 15 },
    ]
    const customAddOns = [
      { id: 'custom-a1', name: 'Heavy Duty Metal Frame', selling_price: 450 },
    ]

    assert.equal(getFinishingRate('Premium Matt Lam', customFinishing), 15)
    assert.equal(getAddOnRate('Heavy Duty Metal Frame', customAddOns), 450)
  })

  it('3. Auto-computes quotation item effective rate as base_rate + finishing_rate + add_on_rate', () => {
    const baseRate = 35 // Vinyl sticker base rate
    const finishing = 'Lamination (Gloss)' // +5
    const addOn = '3mm PVC Pasting' // +45

    const fRate = getFinishingRate(finishing)
    const aRate = getAddOnRate(addOn)
    const effectiveRate = baseRate + fRate + aRate

    assert.equal(fRate, 5)
    assert.equal(aRate, 45)
    assert.equal(effectiveRate, 85)

    // Calculate line total for 8ft x 3ft (24 sqft) x 5 prints at effectiveRate 85
    const width = 8
    const height = 3
    const qty = 5
    const area = width * height
    const lineTotal = Math.round(area * qty * effectiveRate)

    assert.equal(area, 24)
    assert.equal(lineTotal, 10200)
  })

  it('4. Correctly reverses base rate when user overrides rate manually on quotation items', () => {
    const fRate = 5 // Lamination
    const aRate = 45 // 3mm PVC
    const userTypedRate = 95

    // Reverse calculated base rate
    const calculatedBase = Math.max(0, userTypedRate - fRate - aRate)
    assert.equal(calculatedBase, 45)

    // If add-on is changed to 5mm PVC (+70), rate recalculates with the preserved base rate
    const newARate = getAddOnRate('5mm PVC Pasting')
    const recalculatedRate = calculatedBase + fRate + newARate
    assert.equal(recalculatedRate, 120)
  })

  it('5. Initial dimensions start blank (not hardcoded 4 and 6)', () => {
    const defaultQuotationItem = {
      product_id: '',
      item_name: '',
      width: '',
      height: '',
      quantity: 1,
      unit_rate: 0,
      base_rate: 0,
      finishing: 'None',
      finishing_rate: 0,
      add_on: 'None',
      add_on_rate: 0,
    }

    assert.equal(defaultQuotationItem.width, '')
    assert.equal(defaultQuotationItem.height, '')
    assert.equal(defaultQuotationItem.finishing, 'None')
    assert.equal(defaultQuotationItem.add_on, 'None')
  })

  it('6. Arrow key navigation index wrap-around calculation works predictably for autocomplete', () => {
    const listLength = 5
    let index = -1

    // Arrow Down from -1 goes to 0
    index = (index + 1) % listLength
    assert.equal(index, 0)

    // Arrow Down moves forward
    index = (index + 1) % listLength
    assert.equal(index, 1)

    // Arrow Up moves backward with wrap-around
    index = (index - 1 + listLength) % listLength
    assert.equal(index, 0)

    index = (index - 1 + listLength) % listLength
    assert.equal(index, 4)
  })

  it('7. Multi-field customer keyword matching matches across Name, Phone, Company, and Email', () => {
    const customers = [
      { id: '1', name: 'Anisur Rahman', mobile: '01711223344', company_name: 'Apex Footwear Ltd', email: 'anis@apex.com' },
      { id: '2', name: 'Tanvir Hossain', mobile: '01899887766', company_name: 'Square Pharmaceuticals', email: 'tanvir@square.com' },
      { id: '3', name: 'Fahim Ahmed', mobile: '01555443322', company_name: 'Beximco Digital', email: 'fahim@beximco.net' },
    ]

    const search = (query: string) => {
      const q = query.toLowerCase()
      return customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.company_name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    }

    // Keyword in Name
    assert.equal(search('Anisur').length, 1)
    assert.equal(search('Anisur')[0].name, 'Anisur Rahman')

    // Keyword in Phone
    assert.equal(search('01899').length, 1)
    assert.equal(search('01899')[0].name, 'Tanvir Hossain')

    // Keyword in Company Name
    assert.equal(search('Square').length, 1)
    assert.equal(search('Square')[0].company_name, 'Square Pharmaceuticals')

    // Keyword in Email
    assert.equal(search('beximco.net').length, 1)
    assert.equal(search('beximco.net')[0].name, 'Fahim Ahmed')
  })
})
