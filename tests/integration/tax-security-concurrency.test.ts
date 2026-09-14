import { test, describe } from 'node:test'
import assert from 'node:assert'
import { TaxService } from '../../services/tax.service.ts'
import { LocalizationService } from '../../services/localization.service.ts'
import { TaxRepository } from '../../lib/repositories/tax.repository.ts'
import { LocalizationRepository } from '../../lib/repositories/localization.repository.ts'
import type { VatCalculationItemInput } from '../../types/tax.types.ts'

describe('Tax & Localization Security, Tenant Isolation & Concurrency Integration Test (V7)', () => {
  const tenantA = 'co-tenant-alpha-v7'
  const tenantB = 'co-tenant-beta-v7'

  test('enforces strict multi-tenant isolation across tax profiles, tax registers, and company profiles', async () => {
    // 1. Tenant A creates custom tax profile
    const profileA = await TaxService.createTaxProfile({
      company_id: tenantA,
      code: 'VAT-SPECIAL-10',
      name: 'Special Print Promo Tax 10%',
      rate: 10.0,
      calculation_mode: 'exclusive',
      tax_type: 'STANDARD',
    })

    // 2. Tenant B seeds default profiles
    await TaxService.seedDefaultTaxProfiles(tenantB)
    const profilesB = await TaxService.getTaxProfiles(tenantB)

    // Verify Tenant B cannot see Tenant A's custom profile
    const leakedProfile = profilesB.find((p) => p.code === 'VAT-SPECIAL-10' || p.id === profileA.id)
    assert.strictEqual(leakedProfile, undefined, 'Tenant B must not see Tenant A tax profile')

    // 3. Tenant A records sales tax lines
    const salesItemA: VatCalculationItemInput = {
      item_id: 'item-a1',
      description: 'Signage Job Order Alpha',
      quantity: 1,
      unit_price: 50000,
      discount_amount: 0,
      custom_rate: 10,
      tax_type: 'STANDARD',
      custom_mode: 'exclusive',
      tax_profile_id: profileA.id,
    }

    await TaxService.recordSalesTaxLines({
      companyId: tenantA,
      documentType: 'invoice',
      documentId: 'inv-tenant-a-01',
      documentNumber: 'INV-A-001',
      partyId: 'cust-a1',
      partyName: 'Client Alpha Ltd',
      taxDate: '2026-09-14',
      items: [salesItemA],
    })

    // 4. Verify Tenant B tax register and summary has ZERO of Tenant A's transactions
    const registerB = await TaxService.getTaxRegister(tenantB, 'sales')
    assert.strictEqual(registerB.length, 0, 'Tenant B sales tax register must be empty')

    const summaryB = await TaxService.getTaxSummaryReport(tenantB)
    assert.strictEqual(summaryB.output_vat.total_output_vat, 0)
    assert.strictEqual(summaryB.output_vat.total_taxable_sales, 0)

    const summaryA = await TaxService.getTaxSummaryReport(tenantA)
    assert.strictEqual(summaryA.output_vat.total_output_vat, 5000)
    assert.strictEqual(summaryA.output_vat.total_taxable_sales, 50000)

    // 5. Tenant Isolation on Bangladesh Company Profiles
    await LocalizationService.updateCompanyProfile(tenantA, {
      name: 'Alpha Signage Bangladesh',
      bin_number: '1111222233334',
    })

    await LocalizationService.updateCompanyProfile(tenantB, {
      name: 'Beta Packaging Ltd',
      bin_number: '9999888877776',
    })

    const profileAData = await LocalizationService.getCompanyProfile(tenantA)
    const profileBData = await LocalizationService.getCompanyProfile(tenantB)

    assert.strictEqual(profileAData?.bin_number, '1111222233334')
    assert.strictEqual(profileBData?.bin_number, '9999888877776')
    assert.notStrictEqual(profileAData?.bin_number, profileBData?.bin_number)
  })

  test('handles concurrent tax line recordings and ensures calculation idempotency without race conditions', async () => {
    const concurrentCompanyId = 'co-concurrent-tax-v7'
    await TaxService.seedDefaultTaxProfiles(concurrentCompanyId)

    const baseItem: VatCalculationItemInput = {
      item_id: 'conc-item-1',
      description: 'Concurrent Banner Print',
      quantity: 10,
      unit_price: 1000, // Gross 10,000, 15% VAT = 1,500
      custom_rate: 15,
      tax_type: 'STANDARD',
      custom_mode: 'exclusive',
    }

    // Launch 10 simultaneous tax line recording requests
    const tasks = Array.from({ length: 10 }, (_, i) =>
      TaxService.recordSalesTaxLines({
        companyId: concurrentCompanyId,
        documentType: 'invoice',
        documentId: `inv-conc-${i + 1}`,
        documentNumber: `INV-C-${String(i + 1).padStart(3, '0')}`,
        partyId: `cust-conc-${i + 1}`,
        partyName: `Customer ${i + 1}`,
        taxDate: '2026-09-14',
        items: [baseItem],
      })
    )

    const results = await Promise.all(tasks)
    assert.strictEqual(results.length, 10)

    // Verify all 10 transaction lines are recorded accurately
    const register = await TaxService.getTaxRegister(concurrentCompanyId, 'sales')
    assert.strictEqual(register.length, 10)

    const summary = await TaxService.getTaxSummaryReport(concurrentCompanyId)
    assert.strictEqual(summary.output_vat.total_taxable_sales, 100000) // 10 * 10,000
    assert.strictEqual(summary.output_vat.total_output_vat, 15000)     // 10 * 1,500
    assert.strictEqual(summary.net_tax_position, 15000)
  })
})
