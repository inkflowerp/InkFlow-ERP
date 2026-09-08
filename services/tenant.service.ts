import { createClient } from '@/lib/supabase/client'
import { CompanyRow, CompanySettingsRow, CompanyUserWithProfile, BranchRow } from '@/types/tenant.types'
import { ApiResponse } from '@/types/common.types'
import { DEMO_COMPANIES } from '@/hooks/use-tenant'
import { DEMO_PLATFORM_COMPANIES } from '@/services/platform.service'
import { DEMO_ROLES, DEMO_BRANCHES } from '@/services/company-users.service'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { PlatformTenantCompany } from '@/types/platform.types'
import { RegisteredUserRecord } from '@/services/auth.service'

export interface CreateCompanyInput {
  name: string
  name_bn?: string
  slug: string
  business_type: string
  division_id?: number | null
  district_id?: number | null
  upazila_id?: number | null
  address?: string | null
  address_bn?: string | null
  trade_license_no?: string | null
  bin_no?: string | null
  tin_no?: string | null
  currency?: string
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  owner_name?: string
  owner_email?: string
  owner_phone?: string
  owner_password?: string
  plan?: 'starter' | 'business' | 'enterprise'
}

export const DEMO_COMPANY_SETTINGS: CompanySettingsRow = {
  id: 'cs-default',
  company_id: '',
  invoice_prefix: 'INV',
  quotation_prefix: 'QT',
  challan_prefix: 'CH',
  vat_enabled: true,
  vat_rate: 7.5,
  default_currency: 'BDT',
  default_language: 'bn',
  phone: null,
  whatsapp: null,
  email: null,
  logo_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export class TenantService {
  /**
   * Fetch company by slug (with clean local storage fallback)
   */
  static async getCompanyBySlug(slug: string): Promise<ApiResponse<CompanyRow>> {
    const normalizedSlug = slug.toLowerCase().trim()
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', normalizedSlug)
        .single()

      if (!error && data) {
        return { success: true, data: data as CompanyRow }
      }
    } catch {
      // Offline / fallback to local DataStore
    }

    // 1. Check in Platform Companies (Trial accounts & custom tenants)
    const storedPlatform =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []

    const platformMatch = storedPlatform.find((c) => c.slug === normalizedSlug)
    if (platformMatch) {
      const converted: CompanyRow = {
        id: platformMatch.id,
        slug: platformMatch.slug,
        name: platformMatch.name,
        name_bn: platformMatch.name_bn || null,
        legal_name: null,
        trade_license_no: null,
        bin_no: null,
        tin_no: null,
        business_type: 'printing_signage',
        phone: platformMatch.owner_phone || null,
        whatsapp: platformMatch.owner_phone || null,
        email: platformMatch.owner_email || null,
        website: null,
        division_id: 1,
        district_id: 1,
        upazila_id: 1,
        area: platformMatch.hub || null,
        address: platformMatch.hub || 'Dhaka, Bangladesh',
        address_bn: null,
        currency: 'BDT',
        default_locale: 'bn',
        logo_url: null,
        is_active: platformMatch.status !== 'suspended',
        settings: { vat_rate: 7.5, bilingual_invoicing: true },
        created_at: platformMatch.created_at || new Date().toISOString(),
        updated_at: platformMatch.created_at || new Date().toISOString(),
      }
      return { success: true, data: converted }
    }

    // 2. Check in persisted company profile
    const profile = PrintERPDataStore.get<Partial<CompanyRow>>(STORAGE_KEYS.COMPANY_PROFILE)
    if (profile && (profile.slug === normalizedSlug || profile.name)) {
      const fallback = { ...profile, slug: normalizedSlug } as CompanyRow
      return { success: true, data: fallback }
    }

    // 3. Clean minimal tenant for requested slug
    const cleanCompany: CompanyRow = {
      id: `c-${normalizedSlug}`,
      slug: normalizedSlug,
      name: normalizedSlug.split(/[-_]+/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      name_bn: null,
      legal_name: null,
      trade_license_no: null,
      bin_no: null,
      tin_no: null,
      business_type: 'printing_signage',
      phone: null,
      whatsapp: null,
      email: null,
      website: null,
      division_id: 1,
      district_id: 1,
      upazila_id: 1,
      area: null,
      address: 'Dhaka, Bangladesh',
      address_bn: null,
      currency: 'BDT',
      default_locale: 'bn',
      logo_url: null,
      is_active: true,
      settings: { vat_rate: 7.5, bilingual_invoicing: true },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    return { success: true, data: cleanCompany }
  }

  /**
   * Fetch company settings
   */
  static async getCompanySettings(companyId: string): Promise<ApiResponse<CompanySettingsRow>> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (error || !data) {
        const persistedSettings = PrintERPDataStore.get<CompanySettingsRow>(STORAGE_KEYS.TAX_SETTINGS)
        return { success: true, data: persistedSettings || DEMO_COMPANY_SETTINGS }
      }

      return { success: true, data: data as CompanySettingsRow }
    } catch {
      const persistedSettings = PrintERPDataStore.get<CompanySettingsRow>(STORAGE_KEYS.TAX_SETTINGS)
      return { success: true, data: persistedSettings || DEMO_COMPANY_SETTINGS }
    }
  }

  /**
   * Update company settings
   */
  static async updateCompanySettings(
    companyId: string,
    settings: Partial<CompanySettingsRow>
  ): Promise<ApiResponse<CompanySettingsRow>> {
    try {
      const existingSettings = PrintERPDataStore.get(STORAGE_KEYS.TAX_SETTINGS) || DEMO_COMPANY_SETTINGS
      const updatedSettings = { ...existingSettings, ...settings, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.TAX_SETTINGS, updatedSettings)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_settings')
        .update(settings)
        .eq('company_id', companyId)
        .select()
        .single()

      if (error || !data) {
        return { success: true, data: updatedSettings as CompanySettingsRow, message: 'Settings saved successfully' }
      }

      return { success: true, data: data as CompanySettingsRow, message: 'Settings saved successfully' }
    } catch {
      const existingSettings = PrintERPDataStore.get(STORAGE_KEYS.TAX_SETTINGS) || DEMO_COMPANY_SETTINGS
      const updatedSettings = { ...existingSettings, ...settings, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.TAX_SETTINGS, updatedSettings)
      return { success: true, data: updatedSettings as CompanySettingsRow, message: 'Settings updated' }
    }
  }

  /**
   * Update company general info
   */
  static async updateCompany(
    companyId: string,
    updates: Partial<CompanyRow>
  ): Promise<ApiResponse<CompanyRow>> {
    try {
      const existingProfile = PrintERPDataStore.get(STORAGE_KEYS.COMPANY_PROFILE) || {}
      const updatedProfile = { ...existingProfile, ...updates, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_PROFILE, updatedProfile)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', companyId)
        .select()
        .single()

      if (error || !data) {
        return { success: true, data: updatedProfile as CompanyRow, message: 'Company details updated' }
      }

      return { success: true, data: data as CompanyRow, message: 'Company details updated' }
    } catch {
      const existingProfile = PrintERPDataStore.get(STORAGE_KEYS.COMPANY_PROFILE) || {}
      const updatedProfile = { ...existingProfile, ...updates, updated_at: new Date().toISOString() }
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_PROFILE, updatedProfile)
      return { success: true, data: updatedProfile as CompanyRow, message: 'Company details saved' }
    }
  }

  /**
   * Check if a slug is available
   */
  static async isSlugAvailable(slug: string): Promise<boolean> {
    const normalizedSlug = slug.toLowerCase().trim()
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('companies')
        .select('id')
        .eq('slug', normalizedSlug)
        .maybeSingle()
      if (data) return false
    } catch {
      // Fallback
    }

    const storedPlatform =
      PrintERPDataStore.get<PlatformTenantCompany[]>(STORAGE_KEYS.PLATFORM_COMPANIES) || []
    const platformCompanies = [...storedPlatform, ...DEMO_PLATFORM_COMPANIES]

    const exists =
      DEMO_COMPANIES.some((c) => c.slug === normalizedSlug) ||
      platformCompanies.some((c) => c.slug === normalizedSlug)

    return !exists
  }

  /**
   * Create a new tenant company and assign creator as 'owner'
   */
  static async createCompany(
    input: CreateCompanyInput,
    userId: string
  ): Promise<ApiResponse<CompanyRow>> {
    try {
      const companyId = 'c-trial-' + Date.now()
      const normalizedSlug = input.slug.toLowerCase().trim()
      const ownerEmail = (input.owner_email || input.email || '').trim().toLowerCase()
      const ownerName = input.owner_name || input.name
      const ownerPhone = input.owner_phone || input.phone || '+8801711000000'

      const newCompanyData: CompanyRow = {
        id: companyId,
        name: input.name,
        name_bn: input.name_bn || null,
        legal_name: null,
        trade_license_no: input.trade_license_no || null,
        bin_no: input.bin_no || null,
        tin_no: input.tin_no || null,
        slug: normalizedSlug,
        business_type: input.business_type,
        phone: input.phone || ownerPhone,
        whatsapp: input.whatsapp || ownerPhone,
        email: ownerEmail,
        website: null,
        division_id: input.division_id || 1,
        district_id: input.district_id || 1,
        upazila_id: input.upazila_id || 1,
        area: input.address || null,
        address: input.address || 'Dhaka, Bangladesh',
        address_bn: input.address_bn || null,
        currency: input.currency || 'BDT',
        default_locale: 'bn',
        logo_url: null,
        is_active: true,
        settings: { vat_rate: 7.5, bilingual_invoicing: true },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // 1. Persist to Platform Companies (14-Day Free Trial Account)
      const trialCompanyRecord: PlatformTenantCompany = {
        id: companyId,
        name: input.name,
        name_bn: input.name_bn || input.name,
        slug: normalizedSlug,
        owner_name: ownerName,
        owner_email: ownerEmail,
        owner_phone: ownerPhone,
        plan: input.plan || 'starter',
        status: 'trial',
        health: 'healthy',
        users_count: 1,
        users_limit: input.plan === 'business' ? 10 : input.plan === 'enterprise' ? 50 : 3,
        branches_count: 1,
        branches_limit: input.plan === 'business' ? 3 : input.plan === 'enterprise' ? 10 : 1,
        storage_used_gb: 0.05,
        storage_limit_gb: input.plan === 'business' ? 10.0 : input.plan === 'enterprise' ? 50.0 : 1.0,
        orders_this_month: 0,
        orders_limit: input.plan === 'business' ? 500 : input.plan === 'enterprise' ? 99999 : 50,
        monthly_fee: input.plan === 'business' ? 4999 : input.plan === 'enterprise' ? 9999 : 1999,
        billing_interval: 'monthly',
        hub: input.address || 'Dhaka Printing Hub',
        division: 'Dhaka',
        district: 'Dhaka',
        created_at: new Date().toISOString(),
        last_activity: 'Just now',
        last_meaningful_activity: {
          action: 'Provisioned 14-Day Evaluation Trial',
          entity: 'TENANT_ONBOARDING',
          timestamp: 'Just now',
          reference: 'Trial Activation',
        },
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.PLATFORM_COMPANIES, trialCompanyRecord)

      // 2. Set active Company Profile
      PrintERPDataStore.set(STORAGE_KEYS.COMPANY_PROFILE, newCompanyData)

      // 3. Create default Head Office branch
      const mainBranch: BranchRow = {
        id: `br-${companyId}-01`,
        company_id: companyId,
        name: `${input.name} - Head Office`,
        name_bn: `${input.name_bn || input.name} - প্রধান শাখা`,
        code: 'HQ-MAIN',
        phone: ownerPhone,
        address: input.address || 'Dhaka',
        is_main: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.BRANCHES, mainBranch)

      // 4. Create Owner user in COMPANY_USERS
      const resolvedUserId = userId.startsWith('owner-') ? `usr-${Date.now()}` : userId
      const ownerUserRecord: CompanyUserWithProfile = {
        id: `cu-${Date.now()}`,
        company_id: companyId,
        user_id: resolvedUserId,
        branch_id: mainBranch.id,
        status: 'active',
        department: 'Executive Management',
        responsibilities: ['business_owner'],
        overrides: {},
        data_scopes: {
          customers: 'company',
          orders: 'company',
          invoices: 'company',
          reports: 'company',
          production: 'company',
          inventory: 'company',
        },
        invited_email: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profile: {
          id: resolvedUserId,
          email: ownerEmail,
          full_name: ownerName,
          full_name_bn: input.name_bn || null,
          phone: ownerPhone,
          avatar_url: null,
          preferred_locale: 'bn',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        roles: [DEMO_ROLES[0]],
        branch: mainBranch,
      }
      PrintERPDataStore.addItem(STORAGE_KEYS.COMPANY_USERS, ownerUserRecord)

      // 5. Store registered credentials
      if (input.owner_password) {
        const regRecord: RegisteredUserRecord = {
          id: resolvedUserId,
          email: ownerEmail,
          password: input.owner_password,
          fullName: ownerName,
          phone: ownerPhone,
          userId: resolvedUserId,
          companyId,
          companySlug: normalizedSlug,
          companyName: input.name,
          role: 'owner',
          registeredAt: new Date().toISOString(),
        }
        PrintERPDataStore.addItem(STORAGE_KEYS.REGISTERED_USERS, regRecord)
      }

      // 6. Attempt Supabase insert if reachable
      try {
        const supabase = createClient()
        await supabase.from('companies').insert({
          id: companyId,
          name: input.name,
          name_bn: input.name_bn || null,
          slug: normalizedSlug,
          business_type: input.business_type,
          division_id: input.division_id || null,
          district_id: input.district_id || null,
          upazila_id: input.upazila_id || null,
          address: input.address || null,
          address_bn: input.address_bn || null,
          trade_license_no: input.trade_license_no || null,
          bin_no: input.bin_no || null,
          tin_no: input.tin_no || null,
          currency: input.currency || 'BDT',
          default_locale: 'bn',
          phone: input.phone || null,
          whatsapp: input.whatsapp || null,
          email: ownerEmail,
          is_active: true,
          settings: { vat_rate: 7.5, bilingual_invoicing: true },
        })
      } catch {
        // Dev fallback
      }

      return { success: true, data: newCompanyData }
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create organization',
      }
    }
  }
}
