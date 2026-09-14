// ==============================================================================
// InkFlow ERP - Authoritative Localization Repository (V7)
// Company & Branch Bangladesh Profiles, Administrative Regions Master
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import type {
  CompanyBangladeshProfile,
  BranchBangladeshProfile,
  BangladeshLocationItem,
} from '../../types/localization.types.ts'
import { BD_DIVISIONS, BD_DISTRICTS } from '../../i18n/geo-data.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class LocalizationRepository {
  // ==========================================
  // 1. COMPANY BANGLADESH PROFILE
  // ==========================================

  static async getCompanyProfile(companyId: string): Promise<CompanyBangladeshProfile | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()

      if (!error && data) {
        return this.mapCompanyProfile(data)
      }
    } catch {}

    const all = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    const found = all.find((c) => c.id === companyId)
    return found ? this.mapCompanyProfile(found) : null
  }

  static async updateCompanyProfile(
    companyId: string,
    updates: Partial<CompanyBangladeshProfile>
  ): Promise<CompanyBangladeshProfile> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.slug

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('companies')
        .update(payload)
        .eq('id', companyId)
        .select()
        .single()

      if (!error && data) {
        return this.mapCompanyProfile(data)
      }
    } catch {}

    const all = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    const idx = all.findIndex((c) => c.id === companyId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, all)
      return this.mapCompanyProfile(all[idx])
    }

    const defaultProfile: CompanyBangladeshProfile = {
      id: companyId,
      name: updates.name || 'InkFlow Enterprise',
      slug: 'inkflow',
      default_language: updates.default_language || 'en',
      default_currency: 'BDT',
      date_format: 'DD/MM/YYYY',
      number_format: 'en_IN',
      fiscal_year_start: '07-01',
      is_active: true,
      updated_at: new Date().toISOString(),
      ...updates,
    }
    all.push(defaultProfile)
    PrintERPDataStore.set(STORAGE_KEYS.PLATFORM_COMPANIES, all)
    return defaultProfile
  }

  // ==========================================
  // 2. BRANCH BANGLADESH PROFILE
  // ==========================================

  static async getBranchProfile(branchId: string, companyId: string): Promise<BranchBangladeshProfile | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('branches')
        .select('*')
        .eq('id', branchId)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as BranchBangladeshProfile
      }
    } catch {}

    const all = PrintERPDataStore.get<BranchBangladeshProfile[]>(STORAGE_KEYS.BRANCHES) || []
    return all.find((b) => b.id === branchId && (!b.company_id || b.company_id === companyId)) || null
  }

  static async updateBranchProfile(
    branchId: string,
    companyId: string,
    updates: Partial<BranchBangladeshProfile>
  ): Promise<BranchBangladeshProfile> {
    const payload: any = { ...updates, updated_at: new Date().toISOString() }
    delete payload.id
    delete payload.company_id

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('branches')
        .update(payload)
        .eq('id', branchId)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        return data as unknown as BranchBangladeshProfile
      }
    } catch {}

    const all = PrintERPDataStore.get<BranchBangladeshProfile[]>(STORAGE_KEYS.BRANCHES) || []
    const idx = all.findIndex((b) => b.id === branchId)
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...payload }
      PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, all)
      return all[idx]
    }
    const newBranch: BranchBangladeshProfile = {
      id: branchId,
      company_id: companyId,
      name: updates.name || 'Main Branch',
      code: updates.code || 'MAIN',
      is_active: updates.is_active !== undefined ? updates.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...updates,
    }
    all.push(newBranch)
    PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, all)
    return newBranch
  }

  // ==========================================
  // 3. ADMINISTRATIVE LOCATIONS
  // ==========================================

  static getDivisions() {
    return BD_DIVISIONS
  }

  static getDistricts(divisionId?: number) {
    if (!divisionId) return BD_DISTRICTS
    return BD_DISTRICTS.filter((d) => d.division_id === divisionId)
  }

  private static mapCompanyProfile(raw: any): CompanyBangladeshProfile {
    return {
      id: raw.id,
      name: raw.name || 'Company',
      legal_name_bn: raw.legal_name_bn || null,
      trade_name: raw.trade_name || raw.name || null,
      trade_name_bn: raw.trade_name_bn || raw.legal_name_bn || null,
      slug: raw.slug || 'company',
      email: raw.email || null,
      phone: raw.phone || null,
      mobile: raw.mobile || raw.phone || null,
      bin_number: raw.bin_number || raw.bin || null,
      tin_number: raw.tin_number || raw.tin || null,
      trade_license_number: raw.trade_license_number || raw.trade_license || null,
      vat_commissionerate: raw.vat_commissionerate || null,
      vat_circle: raw.vat_circle || null,
      division_id: raw.division_id || null,
      district_id: raw.district_id || null,
      upazila_id: raw.upazila_id || null,
      area: raw.area || null,
      address: raw.address || null,
      full_address_bn: raw.full_address_bn || null,
      default_language: raw.default_language || 'en',
      default_currency: raw.default_currency || 'BDT',
      date_format: raw.date_format || 'DD/MM/YYYY',
      number_format: raw.number_format || 'en_IN',
      fiscal_year_start: raw.fiscal_year_start || '07-01',
      logo_url: raw.logo_url || null,
      is_active: raw.is_active !== undefined ? raw.is_active : true,
      updated_at: raw.updated_at || new Date().toISOString(),
    }
  }
}
