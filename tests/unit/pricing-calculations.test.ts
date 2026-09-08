import { test, describe } from 'node:test'
import assert from 'node:assert'

// Pricing calculations logic for digital and signage printing
export function calculatePrintItemPrice(params: {
  widthFt: number
  heightFt: number
  quantity: number
  ratePerSft: number
  minSft?: number
  minBill?: number
  addons?: {
    eyelets?: { count: number; ratePerPiece: number }
    lamination?: { ratePerSft: number }
    welding?: { perimeterFt: number; ratePerFt: number }
  }
}) {
  const rawSft = params.widthFt * params.heightFt
  const billableSft = params.minSft ? Math.max(rawSft, params.minSft) : rawSft
  let basePrice = billableSft * params.ratePerSft * params.quantity

  if (params.minBill && basePrice < params.minBill) {
    basePrice = params.minBill
  }

  let addonsPrice = 0
  if (params.addons?.eyelets) {
    addonsPrice += params.addons.eyelets.count * params.addons.eyelets.ratePerPiece * params.quantity
  }
  if (params.addons?.lamination) {
    addonsPrice += rawSft * params.addons.lamination.ratePerSft * params.quantity
  }
  if (params.addons?.welding) {
    addonsPrice += params.addons.welding.perimeterFt * params.addons.welding.ratePerFt * params.quantity
  }

  return {
    rawSft,
    billableSft,
    basePrice,
    addonsPrice,
    totalPrice: basePrice + addonsPrice,
  }
}

describe('Pricing Calculations Unit Tests', () => {
  test('Standard SFT Area Pricing: 10ft x 5ft Star Flex at ৳18.50/sft', () => {
    const result = calculatePrintItemPrice({
      widthFt: 10,
      heightFt: 5,
      quantity: 1,
      ratePerSft: 18.5,
    })

    assert.strictEqual(result.rawSft, 50)
    assert.strictEqual(result.billableSft, 50)
    assert.strictEqual(result.basePrice, 925)
    assert.strictEqual(result.totalPrice, 925)
  })

  test('Multi-quantity billboard print: 20ft x 10ft, 3 pcs at ৳25/sft', () => {
    const result = calculatePrintItemPrice({
      widthFt: 20,
      heightFt: 10,
      quantity: 3,
      ratePerSft: 25.0,
    })

    assert.strictEqual(result.rawSft, 200)
    assert.strictEqual(result.basePrice, 15000) // 200 * 25 * 3
    assert.strictEqual(result.totalPrice, 15000)
  })

  test('Minimum SFT threshold enforcement: 1ft x 1ft item with min 5 SFT rule', () => {
    const result = calculatePrintItemPrice({
      widthFt: 1,
      heightFt: 1,
      quantity: 1,
      ratePerSft: 20.0,
      minSft: 5,
    })

    assert.strictEqual(result.rawSft, 1)
    assert.strictEqual(result.billableSft, 5) // Enforced min 5 SFT
    assert.strictEqual(result.basePrice, 100)
  })

  test('Minimum bill floor: tiny sticker job capped at min bill ৳250', () => {
    const result = calculatePrintItemPrice({
      widthFt: 2,
      heightFt: 1,
      quantity: 1,
      ratePerSft: 35.0, // 70 BDT raw
      minBill: 250,
    })

    assert.strictEqual(result.basePrice, 250)
    assert.strictEqual(result.totalPrice, 250)
  })

  test('Finishing add-ons: eyelets and gloss lamination', () => {
    const result = calculatePrintItemPrice({
      widthFt: 10,
      heightFt: 4, // 40 SFT
      quantity: 2,
      ratePerSft: 20.0, // 40 * 20 * 2 = 1600
      addons: {
        eyelets: { count: 8, ratePerPiece: 5.0 }, // 8 * 5 * 2 = 80
        lamination: { ratePerSft: 6.0 }, // 40 * 6 * 2 = 480
        welding: { perimeterFt: 28, ratePerFt: 2.0 }, // 28 * 2 * 2 = 112
      },
    })

    assert.strictEqual(result.basePrice, 1600)
    assert.strictEqual(result.addonsPrice, 80 + 480 + 112) // 672
    assert.strictEqual(result.totalPrice, 2272)
  })
})
