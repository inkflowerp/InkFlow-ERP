'use server'

// ==============================================================================
// InkFlow ERP - Authoritative Localization Server Actions (V7)
// Protected, Multi-Tenant Bangladesh Business Profile & Locations
// ==============================================================================

import { LocalizationService } from '../services/localization.service.ts'
import { getTenantCompanyId } from '../lib/auth/tenant-auth.ts'
import type { CompanyBangladeshProfile, BranchBangladeshProfile } from '../types/localization.types.ts'

export async function getCompanyBangladeshProfileAction() {
  try {
    const companyId = await getTenantCompanyId()
    const profile = await LocalizationService.getCompanyProfile(companyId)
    return { success: true, data: profile }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch company profile.' }
  }
}

export async function updateCompanyBangladeshProfileAction(updates: Partial<CompanyBangladeshProfile>) {
  try {
    const companyId = await getTenantCompanyId()
    const updated = await LocalizationService.updateCompanyProfile(companyId, updates)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update company profile.' }
  }
}

export async function getBranchBangladeshProfileAction(branchId: string) {
  try {
    const companyId = await getTenantCompanyId()
    const profile = await LocalizationService.getBranchProfile(branchId, companyId)
    return { success: true, data: profile }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch branch profile.' }
  }
}

export async function updateBranchBangladeshProfileAction(branchId: string, updates: Partial<BranchBangladeshProfile>) {
  try {
    const companyId = await getTenantCompanyId()
    const updated = await LocalizationService.updateBranchProfile(branchId, companyId, updates)
    return { success: true, data: updated }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update branch profile.' }
  }
}

export async function getBangladeshDivisionsAction() {
  try {
    const divisions = LocalizationService.getDivisions()
    return { success: true, data: divisions }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch divisions.' }
  }
}

export async function getBangladeshDistrictsAction(divisionId?: number) {
  try {
    const districts = LocalizationService.getDistricts(divisionId)
    return { success: true, data: districts }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch districts.' }
  }
}
