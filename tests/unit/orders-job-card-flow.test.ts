import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isServiceProduct, isReadyProduct, isMaterialProduct } from '../../lib/units.ts'
import {
  resolveOrderItemSpecs,
  type OrderItemSpec,
} from '../../components/orders/types.ts'

describe('Job Card & Orders Flow: Print Service vs Ready Product Classification', () => {
  const tBilingual = (en: string, bn: string) => en

  it('1. Correctly classifies Pana Flex Banner Print with unit "pcs" as service and NOT ready product', () => {
    const bannerItem = {
      product_name: 'Pana Flex Banner Print',
      item_name: 'Pana Flex Banner Print',
      service_name: 'Pana Flex Banner Print',
      quantity: 1,
      unit: 'pcs',
      material_spec: 'Flex Banner (ফ্লেক্স ব্যানার)',
    }

    assert.equal(isServiceProduct(bannerItem), true, 'Pana Flex Banner Print must be identified as service product')
    assert.equal(isReadyProduct(bannerItem), false, 'Pana Flex Banner Print must NOT be classified as ready product')
    assert.equal(isMaterialProduct(bannerItem), false, 'Pana Flex Banner Print must NOT be raw material')
  })

  it('2. Preserves genuine ready products (X-Stand, Display Stand, Acrylic Frame) as ready products', () => {
    const xstandItem = {
      product_name: 'X-Stand 2x5ft',
      item_name: 'X-Stand 2x5ft',
      product_type: 'ready_product',
      sku: 'RP-XSTAND-01',
      unit: 'pcs',
      quantity: 1,
    }

    assert.equal(isReadyProduct(xstandItem), true, 'X-Stand should be identified as ready product')
    assert.equal(isServiceProduct(xstandItem), false, 'X-Stand must NOT be service product')
  })

  it('3. Resolves 6-field specs for Pana Flex Banner Print with "Standard Size" instead of "Standard Unit"', () => {
    const item: OrderItemSpec = {
      id: 'ord-item-12',
      serviceName: 'Pana Flex Banner Print',
      itemName: 'Pana Flex Banner Print',
      quantity: 1,
      unit: 'pcs',
      materialSpec: 'Flex Banner (ফ্লেক্স ব্যানার)',
      finishing: 'None',
      addOn: 'None',
      itemKind: 'custom',
      workflowRouting: 'ready_production',
    }

    const specs = resolveOrderItemSpecs(item, undefined, undefined, tBilingual)
    assert.equal(specs.serviceName, 'Pana Flex Banner Print')
    assert.equal(specs.material, 'Flex Banner (ফ্লেক্স ব্যানার)')
    assert.equal(specs.size, 'Standard Size')
    assert.equal(specs.quantity, '1 pcs')
    assert.equal(specs.finishing, 'None')
    assert.equal(specs.addOn, 'None')
  })

  it('4. Custom dimensions normalize to linear ft with square footage calculation', () => {
    const item: OrderItemSpec = {
      id: 'ord-item-13',
      serviceName: 'Pana Flex Banner Print',
      itemName: 'Pana Flex Banner Print',
      dimensions: '10 × 4 ft',
      width: 10,
      height: 4,
      dimensionUnit: 'ft',
      quantity: 2,
      unit: 'sft',
      materialSpec: 'Flex Banner (ফ্লেক্স ব্যানার)',
      finishing: 'Eyelets 4 corners',
      addOn: 'None',
    }

    const specs = resolveOrderItemSpecs(item, undefined, undefined, tBilingual)
    assert.equal(specs.size, '10 × 4 ft')
    assert.equal(specs.quantity, '80 sft (2 pcs)')
    assert.equal(specs.finishing, 'Eyelets 4 corners')
  })
})
