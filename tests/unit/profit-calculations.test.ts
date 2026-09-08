import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface JobCostingParams {
  revenue: number
  directMaterials: {
    substrateCost: number
    inkCost: number
    accessoriesCost?: number
  }
  directLaborCost: number
  machineOverheadCost: number
  operatingExpenses?: number
}

export function calculateJobProfitability(params: JobCostingParams) {
  const totalMaterialCost =
    params.directMaterials.substrateCost +
    params.directMaterials.inkCost +
    (params.directMaterials.accessoriesCost || 0)

  const totalCostOfGoodsSold =
    totalMaterialCost + params.directLaborCost + params.machineOverheadCost

  const grossProfit = Number((params.revenue - totalCostOfGoodsSold).toFixed(2))
  const grossMarginPercent =
    params.revenue > 0 ? Number(((grossProfit / params.revenue) * 100).toFixed(2)) : 0

  const operatingExpenses = params.operatingExpenses || 0
  const netProfit = Number((grossProfit - operatingExpenses).toFixed(2))
  const netMarginPercent =
    params.revenue > 0 ? Number(((netProfit / params.revenue) * 100).toFixed(2)) : 0

  return {
    revenue: params.revenue,
    totalMaterialCost,
    totalCostOfGoodsSold,
    grossProfit,
    grossMarginPercent,
    operatingExpenses,
    netProfit,
    netMarginPercent,
    isProfitable: netProfit > 0,
  }
}

describe('Job Profitability & Margin Unit Tests', () => {
  test('Standard Flex Print Job: ৳28,500 billboard order profitability', () => {
    // Revenue: 28,500
    // Materials: Flex roll 8,000 + Solvent Ink 2,000 + Grommets 500 = 10,500
    // Labor: 2,500
    // Machine electricity & wear: 1,500
    // Total COGS: 14,500
    // Gross Profit: 14,000 (49.12% gross margin)
    // Operating overhead: 3,000
    // Net Profit: 11,000 (38.60% net margin)
    const res = calculateJobProfitability({
      revenue: 28500,
      directMaterials: {
        substrateCost: 8000,
        inkCost: 2000,
        accessoriesCost: 500,
      },
      directLaborCost: 2500,
      machineOverheadCost: 1500,
      operatingExpenses: 3000,
    })

    assert.strictEqual(res.totalMaterialCost, 10500)
    assert.strictEqual(res.totalCostOfGoodsSold, 14500)
    assert.strictEqual(res.grossProfit, 14000)
    assert.strictEqual(res.grossMarginPercent, 49.12)
    assert.strictEqual(res.netProfit, 11000)
    assert.strictEqual(res.netMarginPercent, 38.60)
    assert.strictEqual(res.isProfitable, true)
  })

  test('Loss-making job detection: Under-quoted promotional work', () => {
    // Revenue: 5,000
    // Material: 4,000 + Labor: 1,500 + Machine: 800 = COGS 6,300
    // Gross Profit: -1,300
    const res = calculateJobProfitability({
      revenue: 5000,
      directMaterials: {
        substrateCost: 3500,
        inkCost: 500,
      },
      directLaborCost: 1500,
      machineOverheadCost: 800,
    })

    assert.strictEqual(res.grossProfit, -1300)
    assert.strictEqual(res.isProfitable, false)
  })
})
