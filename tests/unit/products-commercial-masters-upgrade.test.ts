import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import {
  calculateGrossMargin,
  calculateSuggestedSellingPrice,
  calculateCommercialPricing,
  calculateEffectiveUnitCost,
} from '../../lib/units.ts'
import { FinishingOptionRepository } from '../../lib/repositories/finishing-option.repository.ts'
import { AdditionalOptionRepository } from '../../lib/repositories/additional-option.repository.ts'
import { InstallationOptionRepository } from '../../lib/repositories/installation-option.repository.ts'
import { PrintingMethodRepository } from '../../lib/repositories/printing-method.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Unit: Products & Commercial Masters 2.0 Upgrade Suite', () => {
  const tenantAlpha = 'tenant-commercial-alpha-001'
  const tenantBeta = 'tenant-commercial-beta-002'

  beforeEach(() => {
    PrintERPDataStore.set(STORAGE_KEYS.FINISHING_OPTIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.ADDITIONAL_OPTIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.INSTALLATION_OPTIONS, [])
    PrintERPDataStore.set(STORAGE_KEYS.PRINTING_METHODS, [])
  })

  // =========================================================================
  // 1. LIVE GROSS MARGIN & PROFIT FORMULAS
  // =========================================================================
  describe('1. Live Gross Margin & Profit Math across Configuration Masters', () => {
    it('1.1 Finishing: Thermal Glossy Lamination (sell: ৳8.00, cost: ৳3.50)', () => {
      const margin = calculateGrossMargin(3.5, 8.0)
      assert.strictEqual(margin.grossProfit, 4.5)
      assert.strictEqual(margin.grossMarginPercent, 56.25)
    })

    it('1.2 Finishing: Heavy-Duty Brass Eyelets (sell: ৳5.00, cost: ৳1.80)', () => {
      const margin = calculateGrossMargin(1.8, 5.0)
      assert.strictEqual(margin.grossProfit, 3.2)
      assert.strictEqual(margin.grossMarginPercent, 64.0)
    })

    it('1.3 Additional: 3mm PVC Sunboard Pasting (sell: ৳35.00, cost: ৳18.00)', () => {
      const margin = calculateGrossMargin(18.0, 35.0)
      assert.strictEqual(margin.grossProfit, 17.0)
      assert.strictEqual(margin.grossMarginPercent, 48.57)
    })

    it('1.4 Additional: 5mm Clear Acrylic Sandwich Board (sell: ৳320.00, cost: ৳160.00)', () => {
      const margin = calculateGrossMargin(160.0, 320.0)
      assert.strictEqual(margin.grossProfit, 160.0)
      assert.strictEqual(margin.grossMarginPercent, 50.0)
    })

    it('1.5 Logistics: Shop Fascia Signboard Mounting (sell: ৳2,500, cost: ৳1,200)', () => {
      const margin = calculateGrossMargin(1200.0, 2500.0)
      assert.strictEqual(margin.grossProfit, 1300.0)
      assert.strictEqual(margin.grossMarginPercent, 52.0)
    })

    it('1.6 Logistics: Outside Dhaka Courier Transport (sell: ৳600, cost: ৳350)', () => {
      const margin = calculateGrossMargin(350.0, 600.0)
      assert.strictEqual(margin.grossProfit, 250.0)
      assert.strictEqual(margin.grossMarginPercent, 41.67)
    })

    it('1.7 Zero selling price or cost edge cases handle gracefully without NaN', () => {
      const zeroSell = calculateGrossMargin(10, 0)
      assert.strictEqual(zeroSell.grossProfit, -10)
      assert.strictEqual(zeroSell.grossMarginPercent, 0)

      const zeroCost = calculateGrossMargin(0, 50)
      assert.strictEqual(zeroCost.grossProfit, 50)
      assert.strictEqual(zeroCost.grossMarginPercent, 100)

      const zeroBoth = calculateGrossMargin(0, 0)
      assert.strictEqual(zeroBoth.grossProfit, 0)
      assert.strictEqual(zeroBoth.grossMarginPercent, 0)
    })
  })

  // =========================================================================
  // 2. CONSUMABLE VS REUSABLE CLASSIFICATION & DOMAIN RULES
  // =========================================================================
  describe('2. Consumable vs Reusable Material & Product Taxonomy', () => {
    const TAXONOMY_REGISTRY = [
      { name: 'Flex Banner Frontlit 280 GSM', type: 'material', nature: 'consumable', metric: 'roll_sqft' },
      { name: 'Self-Adhesive Glossy Vinyl Sticker', type: 'material', nature: 'consumable', metric: 'roll_sqft' },
      { name: 'Eco-Solvent CMYK Ink', type: 'printing_technology', nature: 'consumable', metric: 'sqft_coverage' },
      { name: 'Brass Punch Eyelets', type: 'finishing', nature: 'consumable', metric: 'pieces' },
      { name: '3mm PVC Sunboard Sheet', type: 'additional', nature: 'consumable', metric: 'sqft' },
      { name: 'X-Banner Adjustable Metal Stand', type: 'product', nature: 'reusable', metric: 'hardware_unit' },
      { name: 'Roll-Up Aluminum Base Cassette', type: 'product', nature: 'reusable', metric: 'hardware_unit' },
      { name: 'Pop-Up Backdrop Spider Frame 3x3', type: 'product', nature: 'reusable', metric: 'hardware_unit' },
      { name: 'High-Temperature Heat Gun', type: 'equipment', nature: 'reusable', metric: 'plant_asset' },
    ]

    it('2.1 Identifies consumables vs reusables correctly', () => {
      const consumables = TAXONOMY_REGISTRY.filter((i) => i.nature === 'consumable')
      const reusables = TAXONOMY_REGISTRY.filter((i) => i.nature === 'reusable')

      assert.strictEqual(consumables.length, 5)
      assert.strictEqual(reusables.length, 4)

      assert.ok(consumables.some((c) => c.name.includes('Flex Banner')))
      assert.ok(consumables.some((c) => c.name.includes('Eco-Solvent CMYK Ink')))
      assert.ok(reusables.some((r) => r.name.includes('X-Banner')))
      assert.ok(reusables.some((r) => r.name.includes('Roll-Up Aluminum Base')))
    })

    it('2.2 Consumable raw material cost rollups properly integrate into service pricing', () => {
      // Substrate cost: ৳5.45/sqft, Ink cost: ৳4.50/sqft, Lamination film cost: ৳3.50/sqft
      const substrateCost = 5.45
      const inkCost = 4.50
      const finishingCost = 3.50
      const totalDirectCostPerSqft = substrateCost + inkCost + finishingCost // ৳13.45/sqft

      const pricing = calculateCommercialPricing({
        pricingMethod: 'per_area',
        width: 10,
        height: 5,
        quantity: 1, // 50 sqft
        catalogSellingPrice: 35.0, // Selling at ৳35/sqft
        effectiveMaterialCost: totalDirectCostPerSqft,
      })

      assert.strictEqual(pricing.outputQuantity, 50)
      assert.strictEqual(pricing.finalAmount, 1750.0) // 50 * 35
      assert.strictEqual(pricing.estimatedMaterialCost, 672.5) // 50 * 13.45
      assert.strictEqual(pricing.grossProfitAmount, 1077.5) // 1750 - 672.5
      assert.strictEqual(pricing.grossMarginPercent, 61.57)
    })
  })

  // =========================================================================
  // 3. PRINTING METHODS & INK ESTIMATOR SUITE
  // =========================================================================
  describe('3. Dynamic Printing Methods & Technology Configuration', () => {
    it('3.1 Creates and seeds standard printing methods for tenant', async () => {
      const ecoSolvent = await PrintingMethodRepository.createPrintingMethod(tenantAlpha, {
        name: 'Eco-Solvent Print (1440 DPI)',
        name_bn: 'ইকো-সলভেন্ট প্রিন্ট (১৪৪০ ডিপিআই)',
        code: 'ECO_SOLVENT_1440',
        cost_per_sqft: 4.5,
        default_ink_type: 'Eco-Solvent DX5 / XP600 Ink',
        compatible_material_types: ['roll'],
        is_active: true,
      })

      assert.ok(ecoSolvent.id)
      assert.strictEqual(ecoSolvent.code, 'ECO_SOLVENT_1440')
      assert.strictEqual(ecoSolvent.cost_per_sqft, 4.5)
      assert.deepStrictEqual(ecoSolvent.compatible_material_types, ['roll'])

      const uvFlatbed = await PrintingMethodRepository.createPrintingMethod(tenantAlpha, {
        name: 'UV LED Curable Flatbed (1440 DPI)',
        name_bn: 'ইউভি ফ্ল্যাটবেড প্রিন্ট (১৪৪০ ডিপিআই)',
        code: 'UV_FLATBED_1440',
        cost_per_sqft: 14.0,
        default_ink_type: 'UV Curable Hard CMYK+White Ink',
        compatible_material_types: ['roll', 'sheet', 'rigid'],
        is_active: true,
      })

      assert.ok(uvFlatbed.id)
      assert.strictEqual(uvFlatbed.cost_per_sqft, 14.0)
      assert.strictEqual(uvFlatbed.compatible_material_types.length, 3)

      const allMethods = await PrintingMethodRepository.getPrintingMethods(tenantAlpha)
      assert.strictEqual(allMethods.length, 2)
    })
  })

  // =========================================================================
  // 4. FINISHING, ADDITIONAL WORK, & LOGISTICS REPOSITORIES & MULTI-TENANCY
  // =========================================================================
  describe('4. Master Repositories CRUD & Strict Multi-Tenant Boundary', () => {
    it('4.1 FinishingOptionRepository creates, updates, and isolates data by tenant', async () => {
      // Tenant Alpha creates eyelets
      const alphaEyelet = await FinishingOptionRepository.createFinishingOption(tenantAlpha, {
        name: 'Heavy Brass Eyelets',
        name_bn: 'ব্রাস আইলেট পাঞ্চিং',
        category: 'hardware',
        pricing_method: 'per_piece',
        selling_price: 5.0,
        cost: 1.8,
        is_active: true,
      })

      // Tenant Beta creates lamination
      const betaLamination = await FinishingOptionRepository.createFinishingOption(tenantBeta, {
        name: 'Diamond Matte Lamination',
        category: 'lamination',
        pricing_method: 'sqft',
        selling_price: 12.0,
        cost: 5.0,
        is_active: true,
      })

      const alphaList = await FinishingOptionRepository.getFinishingOptions(tenantAlpha)
      const betaList = await FinishingOptionRepository.getFinishingOptions(tenantBeta)

      assert.strictEqual(alphaList.length, 1)
      assert.strictEqual(alphaList[0].name, 'Heavy Brass Eyelets')

      assert.strictEqual(betaList.length, 1)
      assert.strictEqual(betaList[0].name, 'Diamond Matte Lamination')

      // Update Alpha Option
      await FinishingOptionRepository.updateFinishingOption(tenantAlpha, alphaEyelet.id, {
        selling_price: 6.0,
      })

      const updatedAlpha = await FinishingOptionRepository.getFinishingOptions(tenantAlpha)
      assert.strictEqual(updatedAlpha[0].selling_price, 6.0)

      // Delete Alpha Option
      await FinishingOptionRepository.deleteFinishingOption(tenantAlpha, alphaEyelet.id)
      const afterDeleteAlpha = await FinishingOptionRepository.getFinishingOptions(tenantAlpha)
      assert.strictEqual(afterDeleteAlpha.length, 0)
      assert.ok(!afterDeleteAlpha.some((item) => item.id === alphaEyelet.id))
    })

    it('4.2 AdditionalOptionRepository correctly binds to tenant', async () => {
      const additional = await AdditionalOptionRepository.createAdditionalOption(tenantAlpha, {
        name: '1" MS Box Pipe Welded Frame',
        name_bn: '১ ইঞ্চি এমএস বক্স পাইপ ফ্রেম',
        pricing_method: 'sqft',
        selling_price: 45.0,
        cost: 22.0,
        is_active: true,
      })

      assert.ok(additional.id)
      assert.strictEqual(additional.selling_price, 45.0)

      const alphaAdditionals = await AdditionalOptionRepository.getAdditionalOptions(tenantAlpha)
      assert.strictEqual(alphaAdditionals.length, 1)
      assert.strictEqual(alphaAdditionals[0].name, '1" MS Box Pipe Welded Frame')
    })

    it('4.3 InstallationOptionRepository correctly preserves creates_task and rates', async () => {
      const install = await InstallationOptionRepository.createInstallationOption(tenantAlpha, {
        name: 'Rooftop Billboard Banner Fitting',
        name_bn: 'বিলবোর্ড ব্যানার ফিটিং (উঁচু ছাদ)',
        fulfillment_type: 'installation',
        pricing_method: 'fixed',
        selling_price: 5000.0,
        cost: 2500.0,
        creates_task: true,
        is_active: true,
      })

      assert.ok(install.id)
      assert.strictEqual(install.creates_task, true)
      assert.strictEqual(install.selling_price, 5000.0)

      const alphaInstalls = await InstallationOptionRepository.getInstallationOptions(tenantAlpha)
      assert.strictEqual(alphaInstalls.length, 1)
      assert.strictEqual(alphaInstalls[0].creates_task, true)
    })
  })
})
