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
  })
})
