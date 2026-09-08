import { CompanyRow, CompanySettingsRow } from '@/types/tenant.types'
import { ApiResponse } from '@/types/common.types'
import { TenantRepository } from '@/lib/repositories/tenant.repository'

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

export class TenantService {
  /**
   * Create a new company/tenant workspace
   */
  static async createCompany(
    data: CreateCompanyInput,
    ownerUserId?: string
  ): Promise<ApiResponse<CompanyRow>> {
    try {
      if (!data.name || !data.slug) {
        return { success: false, error: 'Company name and slug are required' }
      }

      const isAvail = await this.isSlugAvailable(data.slug)
      if (!isAvail) {
        return { success: false, error: `Slug '${data.slug}' is already taken.` }
      }

      const created = await TenantRepository.createCompany(
        {
          name: data.name,
          name_bn: data.name_bn,
          slug: data.slug,
          business_type: data.business_type,
          trade_license_no: data.trade_license_no,
          bin_no: data.bin_no,
          tin_no: data.tin_no,
          phone: data.phone,
          email: data.email,
          whatsapp: data.whatsapp,
          division_id: data.division_id,
          district_id: data.district_id,
          upazila_id: data.upazila_id,
          address: data.address,
          address_bn: data.address_bn,
          currency: data.currency || 'BDT',
        },
        ownerUserId
      )

      return { success: true, data: created, message: 'Company created successfully' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to create company' }
    }
  }

  /**
   * Fetch company by slug
   */
  static async getCompanyBySlug(slug: string): Promise<ApiResponse<CompanyRow>> {
    try {
      const normalizedSlug = slug.toLowerCase().trim()
      const company = await TenantRepository.getCompanyBySlug(normalizedSlug)
      if (!company) {
        return { success: false, error: `Company with slug '${slug}' not found` }
      }
      return { success: true, data: company }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch company' }
    }
  }

  /**
   * Fetch company settings
   */
  static async getCompanySettings(companyId: string): Promise<ApiResponse<CompanySettingsRow>> {
    try {
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const settings = await TenantRepository.getCompanySettings(companyId)
      if (!settings) {
        return { success: false, error: 'Company settings not found' }
      }
      return { success: true, data: settings }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch company settings' }
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
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const updated = await TenantRepository.updateCompanySettings(companyId, settings)
      return { success: true, data: updated, message: 'Settings saved successfully' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update company settings' }
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
      if (!companyId) return { success: false, error: 'Company ID is required' }
      const updated = await TenantRepository.updateCompany(companyId, updates)
      return { success: true, data: updated, message: 'Company details updated' }
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to update company details' }
    }
  }

  /**
   * Check if a slug is available
   */
  static async isSlugAvailable(slug: string): Promise<boolean> {
    const normalizedSlug = slug.toLowerCase().trim()
    const company = await TenantRepository.getCompanyBySlug(normalizedSlug)
    return !company
  }
}

