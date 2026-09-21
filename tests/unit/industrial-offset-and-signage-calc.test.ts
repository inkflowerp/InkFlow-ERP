import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateOffsetPaperRequirement,
  calculateSignageStructureBOM,
  calculateRollCuttingYield,
  calculateProductionDimensions,
  calculateCommercialPricing,
} from '../../lib/units.ts'

describe('Bangladeshi Industrial Printing & Signage ERP Math Engine', () => {
  test('1. Offset Printing Paper Reams, Formas, CTP Plates & Impression Calculation', () => {
    // 5,000 copies of a 32-page A4 magazine on Demy sheet (8 pages per side / 16 pages per sheet)
    // 80 GSM Offset paper @ ৳3,200/ream, CTP Plate @ ৳450/plate, ৳120 per 1,000 impressions
    const result = calculateOffsetPaperRequirement({
      totalCopies: 5000,
      pagesPerCopy: 32,
      cutPerSheet: 8,
      isDoubleSided: true,
      wastagePercent: 5,
      sheetsPerReam: 500,
      reamPurchasePrice: 3200,
      plateCostPerUnit: 450,
      impressionRatePerThousand: 120,
    })

    // 32 pages / 16 pages per sheet = 2 formas
    assert.equal(result.totalSignaturesOrFormas, 2)
    // Net sheets = 5,000 * 2 = 10,000 sheets
    assert.equal(result.netSheetsRequired, 10000)
    // 5% wastage = 500 sheets
    assert.equal(result.wastageSheets, 500)
    // Gross sheets = 10,500 sheets = exactly 21 reams
    assert.equal(result.grossFullSheetsRequired, 10500)
    assert.equal(result.fullReamsRequired, 21)
    assert.equal(result.remainderSheets, 0)
    assert.equal(result.totalReamsFractional, 21)
    // Paper Cost = 21 reams * ৳3,200 = ৳67,200
    assert.equal(result.estimatedPaperCost, 67200)

    // 2 formas * 8 plates (4 front + 4 back CMYK) = 16 plates
    assert.equal(result.totalPlates, 16)
    // Plate Cost = 16 * 450 = ৳7,200
    assert.equal(result.estimatedPlateCost, 7200)

    // Impressions = 10,500 sheets * 2 sides = 21,000 impressions = 21.00 thousand impressions
    assert.equal(result.thousandImpressionsCount, 21)
    // Impression Cost = 21 * ৳120 = ৳2,520
    assert.equal(result.estimatedImpressionCost, 2520)

    // Total Cost = 67,200 + 7,200 + 2,520 = ৳76,920
    assert.equal(result.totalProductionCost, 76920)
    // Cost per copy = ৳76,920 / 5,000 = ৳15.38
    assert.equal(result.costPerCopy, 15.38)
  })

  test('2. 3D Acrylic & Backlit Signboard Structure BOM & Power Supply Sizing', () => {
    // 10ft x 4ft Backlit Signboard (40 sqft)
    const result = calculateSignageStructureBOM({
      widthFt: 10,
      heightFt: 4,
      hasBacklitLED: true,
      ledModulesPerSqft: 14,
      ledWattsPerModule: 1.2,
      hasACPBacking: true,
      acrylicFaceThicknessMm: 3,
    })

    assert.equal(result.totalSignboardAreaSqft, 40)
    // Perimeter = 2 * (10 + 4) = 28 rft
    assert.equal(result.perimeterRft, 28)
    // Internal braces: width has floor(10/2) - 1 = 4 vertical braces (4 * 4ft = 16 rft), height has 1 horizontal brace (10 rft)
    // Total MS pipe = 28 + 26 = 54 rft
    assert.equal(result.msPipeRequiredRft, 54)
    assert.equal(result.acpBackingSqft, 40)
    assert.equal(result.acrylicFaceSqft, 40)

    // 40 sqft * 14 modules = 560 LED modules
    assert.equal(result.totalLedModules, 560)
    // 560 * 1.2W = 672 Watts
    assert.equal(result.totalLedWattage, 672)
    // Safety 80%: 672 / 0.8 = 840W -> rounded to nearest 50W = 850W
    assert.equal(result.recommendedPowerSupplyWattage, 850)
    // 850W / 400W units = 3 power supply units
    assert.equal(result.powerSupplyCount, 3)
  })

  test('3. Large Format Roll Cutting Yield with Physical Wastage & Remnants', () => {
    // 10ft x 164ft Flex Roll (1,640 sqft). Job: 4ft x 3ft banners
    const result = calculateRollCuttingYield({
      rollWidthFt: 10,
      rollLengthFt: 164,
      sellingWidthFt: 4,
      sellingLengthFt: 3,
      allowRotation: true,
    })

    assert.equal(result.fitsRoll, true)
    assert.equal(result.totalRollAreaSqft, 1640)
    assert.ok(result.maxFullJobsYield > 0)
    assert.ok(result.cuttingEfficiencyPercent > 70)
  })
})
