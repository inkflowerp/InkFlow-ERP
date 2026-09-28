import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  inferMaterialFromItemName,
  resolveOrderItemSpecs,
  formatOrderItemQuantityAndUnit,
  type OrderItemSpec,
} from '../../components/orders/types.ts'

describe('Order Item Specs & Material Resolution', () => {
  const tBilingual = (en: string, bn: string) => bn

  it('infers material correctly from various print item titles', () => {
    assert.equal(inferMaterialFromItemName('Eco Vinyl Print'), 'Eco Vinyl (ইকো ভিনাইল)')
    assert.equal(inferMaterialFromItemName('Star Flex Banner (Backlit)'), 'Star Flex Media (স্টার ফ্লেক্স)')
    assert.equal(inferMaterialFromItemName('PVC Foam Board 5mm'), 'PVC Foam Board (পিভিসি বোর্ড)')
    assert.equal(inferMaterialFromItemName('Visiting Card 4 Color'), '300gsm Matt Art Card')
    assert.equal(inferMaterialFromItemName('Cash Memo 3 Part'), 'NCR Carbonless Paper (এনসিআর)')
    assert.equal(inferMaterialFromItemName('One Way Vision Glass Sticker'), 'One Way Vision (ওয়ান ওয়ে ভিশন)')
  })

  it('resolves specs for wide format item with sft unit when dimensions are not explicitly provided', () => {
    const item: OrderItemSpec = {
      id: 'it-1',
      itemName: 'Eco Vinyl Print',
      quantity: 10,
      unit: 'sft',
    }
    const specs = resolveOrderItemSpecs(item, undefined, undefined, tBilingual)

    assert.equal(specs.material, 'Eco Vinyl (ইকো ভিনাইল)')
    assert.equal(specs.size, '10 বর্গফুট')
    assert.equal(specs.quantity, '10 বর্গফুট (১টি)')
  })

  it('resolves specs when width, height, and custom finishing are specified', () => {
    const item: OrderItemSpec = {
      id: 'it-2',
      itemName: 'Frontlit Banner Print',
      width: 10,
      height: 3,
      dimensionUnit: 'ft',
      quantity: 2,
      unit: 'sft',
      materialSpec: 'Star Flex Banner',
      finishing: 'Eyelets 4 corners + Hemming',
    }
    const specs = resolveOrderItemSpecs(item, undefined, undefined, tBilingual)

    assert.equal(specs.material, 'Star Flex Banner')
    assert.equal(specs.size, '10 × 3 ft')
    assert.equal(specs.quantity, '60 বর্গফুট (2 টি)')
    assert.equal(specs.finishing, 'Eyelets 4 corners + Hemming')
  })

  it('resolves specs from linked fallback job when item fields are empty', () => {
    const item: OrderItemSpec = {
      id: 'it-3',
      itemName: 'Custom Production Job',
      quantity: 1,
      unit: 'pcs',
    }
    const fallbackJob: any = {
      id: 'job-123',
      product_name: 'Backlit Signboard Face',
      material_spec: 'Backlit Film 220mic',
      size_spec: '12 × 4 ft',
      quantity: 1,
      production_instructions: 'Finishing: High Gloss Lamination',
    }
    const specs = resolveOrderItemSpecs(item, fallbackJob, undefined, tBilingual)

    assert.equal(specs.material, 'Backlit Film 220mic')
    assert.equal(specs.size, '12 × 4 ft')
    assert.equal(specs.quantity, '1 পিস')
    assert.equal(specs.finishing, 'High Gloss Lamination')
    assert.equal(specs.addOn, 'None')
  })

  it('resolves all 6 structured specs for the user screenshot example (Eco Vinyl 100 × 100 sft, 10 pcs)', () => {
    const item: OrderItemSpec = {
      id: 'it-user-case',
      serviceName: 'Eco Vinyl Print',
      itemName: 'Eco Vinyl Print',
      dimensions: '100 × 100 sft',
      quantity: 10,
      unit: 'sft',
      materialSpec: 'Eco Vinyl (ইকো ভিনাইল)',
      finishing: 'None',
      addOn: 'None',
    }
    const specs = resolveOrderItemSpecs(item, undefined, undefined, (en, _bn) => en)

    assert.equal(specs.serviceName, 'Eco Vinyl Print')
    assert.equal(specs.material, 'Eco Vinyl (ইকো ভিনাইল)')
    // Crucial fix: linear dimensions "100 × 100 sft" must normalize to "100 × 100 ft"
    assert.equal(specs.size, '100 × 100 ft')
    assert.equal(specs.quantity, '100000 sft (10 pcs)')
    assert.equal(specs.finishing, 'None')
    assert.equal(specs.addOn, 'None')
  })

  it('resolves Add-on correctly from addOn property and job instructions', () => {
    const itemWithAddOn: OrderItemSpec = {
      id: 'it-addon',
      serviceName: 'PVC Board Sign',
      itemName: 'PVC Board Sign',
      dimensions: '4 × 2 ft',
      quantity: 1,
      addOn: '3mm PVC Board Pasting',
    }
    const specs1 = resolveOrderItemSpecs(itemWithAddOn, undefined, undefined, (en, _bn) => en)
    assert.equal(specs1.serviceName, 'PVC Board Sign')
    assert.equal(specs1.addOn, '3mm PVC Board Pasting')

    const itemWithoutAddOn: OrderItemSpec = {
      id: 'it-job-addon',
      itemName: 'Vinyl Print',
      quantity: 1,
    }
    const jobWithInstructions: any = {
      id: 'job-addon-1',
      product_name: 'Sticker Print',
      production_instructions: 'Finishing: Matt Lamination | Add-on: 5mm Acrylic Mount',
    }
    const specs2 = resolveOrderItemSpecs(itemWithoutAddOn, jobWithInstructions, undefined, (en, _bn) => en)
    assert.equal(specs2.finishing, 'Matt Lamination')
    assert.equal(specs2.addOn, '5mm Acrylic Mount')
  })
})

