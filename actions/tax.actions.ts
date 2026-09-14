'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Tax Server Actions (V7)
// Protected, Multi-Tenant VAT Configuration, Calculation & Reporting Actions
// ==============================================================================

import { TaxService } from '../services/tax.service.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'
import type { TaxProfileRecord, VatCalculationItemInput } from '../types/tax.types.ts'

export async function getTaxProfilesAction() {
  try {
    const companyId = await getTenantCompanyId()
    const profiles = await TaxService.getTaxProfiles(companyId)
    return { success: true, data: profiles }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch tax profiles.' }
  }
}

export async function createTaxProfileAction(input: Partial<TaxProfileRecord> & { code: string; name: string; rate: number }) {
  try {
    const companyId = await getTenantCompanyId()
    const profile = await TaxService.createTaxProfile({ ...input, company_id: companyId })
    return { success: true, data: profile }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create tax profile.' }
  }
}

export async function updateTaxProfileAction(id: string, updates: Partial<TaxProfileRecord>) {
  try {
    const companyId = await getTenantCompanyId()
    const updated = await TaxService.updateTaxProfile(id, companyId, updates)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update tax profile.' }
  }
}

export async function calculateVatAction(items: VatCalculationItemInput[]) {
  try {
    const companyId = await getTenantCompanyId()
    const profiles = await TaxService.getTaxProfiles(companyId)
    const profileMap = new Map(profiles.map((p) => [p.id, p]))
    const result = TaxService.calculateDocumentVat(items, profileMap)
    return { success: true, data: result }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to calculate VAT.' }
  }
}

export async function getTaxReportAction(startDate?: string, endDate?: string) {
  try {
    const companyId = await getTenantCompanyId()
    const summary = await TaxService.getTaxReport(companyId, startDate, endDate)
    return { success: true, data: summary }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate tax report.' }
  }
}
