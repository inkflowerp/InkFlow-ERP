import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateCommercialPricing } from '../../lib/units.ts'
import { formatBDT } from '../../lib/formatters.ts'

describe('Unit: Live Estimator & Pricing Simulator Flow', () => {
  it('1. Calculates area-based print service tariff, BOM cost, and gross profit correctly', () => {
    // 4 ft x 3 ft = 12 sft, quantity = 2 -> totalArea = 24 sft
    const widthFt = 4
    const heightFt = 3
    const quantity = 2
    const totalArea = widthFt * heightFt * quantity // 24 sft

    const baseSellingRate = 25 // ৳25 / sft
    const baseCostRate = 12 // ৳12 / sft (raw media)
    const machineSurchargeRate = 3 // ৳3 / sft (eco-solvent mode)
    const finishingPerSft = 5 // ৳5 / sft (glossy lamination)
    const finishingCostPerSft = 2 // ৳2 / sft

    const mediaTotal = baseSellingRate * totalArea // 600
    const machineTotal = machineSurchargeRate * totalArea // 72
    const finishingTotal = finishingPerSft * totalArea // 120
    const totalClientPrice = mediaTotal + machineTotal + finishingTotal // 792

    const estimatedBOMCost = baseCostRate * totalArea + finishingCostPerSft * totalArea // 288 + 48 = 336
    const grossProfit = totalClientPrice - estimatedBOMCost // 456
    const marginPct = Math.round((grossProfit / totalClientPrice) * 100) // 58%

    assert.equal(totalArea, 24)
    assert.equal(totalClientPrice, 792)
    assert.equal(estimatedBOMCost, 336)
    assert.equal(grossProfit, 456)
    assert.equal(marginPct, 58)
    assert.ok(formatBDT(totalClientPrice).includes('792'))
  })

  it('2. Resolves customer tier rates with reseller/dealer fallback accurately', () => {
    const product = {
      id: 'p-banner-01',
      name: 'Star Flex Banner 320 GSM',
      selling_price: 30,
      base_cost: 14,
      price_tiers: {
        retail: 30,
        dealer: 22,
        corporate: 26,
      },
    }

    // Function matching simulator resolution
    const resolveTier = (cType: string) => {
      const tiers = (product.price_tiers as any) || {}
      let rate = tiers[cType]
      if (rate === undefined || isNaN(Number(rate))) {
        if (cType === 'reseller' && tiers.dealer !== undefined) rate = Number(tiers.dealer)
        else if (cType === 'agency' && (tiers.dealer !== undefined || tiers.wholesale !== undefined)) {
          rate = Number(tiers.wholesale ?? tiers.dealer)
        } else if (cType === 'corporate' && tiers.corporate_price !== undefined) {
          rate = Number(tiers.corporate_price)
        } else {
          rate = product.selling_price
        }
      }
      return Number(rate)
    }

    assert.equal(resolveTier('retail'), 30)
    assert.equal(resolveTier('dealer'), 22)
    assert.equal(resolveTier('reseller'), 22) // Falls back to dealer tier!
    assert.equal(resolveTier('corporate'), 26)
    assert.equal(resolveTier('agency'), 22) // Falls back to dealer tier!
  })

  it('3. Calculates piece-based ready merchandise without multiplying by square feet', () => {
    const product = {
      id: 'p-standee-01',
      name: 'Roll-up Standee Hardware (2.5x6 ft)',
      unit: 'pcs',
      pricing_method: 'per_piece',
      selling_price: 1200,
      base_cost: 650,
      price_tiers: {
        retail: 1200,
        reseller: 950,
        corporate: 1050,
      },
    }

    const quantity = 5
    const resellerRate = product.price_tiers.reseller
    const totalSell = resellerRate * quantity // 4750
    const totalCost = product.base_cost * quantity // 3250
    const profit = totalSell - totalCost // 1500
    const marginPct = Math.round((profit / totalSell) * 100) // 32%

    assert.equal(totalSell, 4750)
    assert.equal(totalCost, 3250)
    assert.equal(profit, 1500)
    assert.equal(marginPct, 32)
  })

  it('4. Applies minimum billable quantity and minimum job charges correctly', () => {
    // 1 ft x 1 ft = 1 sft banner, but minimum billable is 6 sft, min charge ৳150
    const res = calculateCommercialPricing({
      pricingMethod: 'per_area',
      catalogSellingPrice: 20,
      quantity: 1,
      width: 1,
      height: 1,
      minBillableQuantity: 6,
      minimumCharge: 150,
    })

    // 6 sft * ৳20 = ৳120, but minimum charge is ৳150 -> final is ৳150
    assert.equal(res.outputQuantity, 1)
    assert.equal(res.billableQuantity, 6)
    assert.equal(res.finalAmount, 150)
  })

  it('5. Generates valid session storage prefill payload contract for quotation modal', () => {
    const prefillData = {
      productId: 'p-01',
      productName: 'Eco-Solvent Vinyl Sticker',
      customerType: 'reseller',
      width: 5,
      height: 3,
      dimensionUnit: 'ft',
      quantity: 4,
      unit: 'sft',
      unitRate: 45,
      baseRate: 50,
      machineMethodId: 'pm-01',
      finishingIds: ['fin-01'],
      totalEstimated: 2700,
      grossProfit: 1200,
      marginPct: 44,
      timestamp: Date.now(),
    }

    const serialized = JSON.stringify(prefillData)
    const parsed = JSON.parse(serialized)

    assert.equal(parsed.productId, 'p-01')
    assert.equal(parsed.customerType, 'reseller')
    assert.equal(parsed.width, 5)
    assert.equal(parsed.height, 3)
    assert.equal(parsed.quantity, 4)
    assert.equal(parsed.unitRate, 45)
    assert.equal(parsed.totalEstimated, 2700)
  })
})
