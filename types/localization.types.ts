// ==============================================================================
// InkFlow ERP - Bangladesh Localization Types (V7)
// Multi-Language, Address Hierarchy, Business Identity & Formatting Types
// ==============================================================================

export type LanguageMode = 'en' | 'bn' | 'bilingual'

export type NumberFormatMode = 'en_IN' | 'bn_BD' | 'en_US'

export interface BangladeshAddressRecord {
  division_id?: number | null
  division_name?: string | null
  division_name_bn?: string | null
  district_id?: number | null
  district_name?: string | null
  district_name_bn?: string | null
  upazila_id?: number | null
  upazila_name?: string | null
  upazila_name_bn?: string | null
  area?: string | null
  post_code?: string | null
  full_address?: string | null
  full_address_bn?: string | null
}

export interface CompanyBangladeshProfile {
  id: string
  name: string
  legal_name_bn?: string | null
  trade_name?: string | null
  trade_name_bn?: string | null
  slug: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  bin_number?: string | null          // 13-digit NBR Business Identification Number
  tin_number?: string | null          // 12-digit Taxpayer Identification Number
  trade_license_number?: string | null
  vat_commissionerate?: string | null
  vat_circle?: string | null
  division_id?: number | null
  district_id?: number | null
  upazila_id?: number | null
  area?: string | null
  address?: string | null
  full_address_bn?: string | null
  default_language: LanguageMode
  default_currency: string            // 'BDT'
  date_format: string                 // 'DD/MM/YYYY'
  number_format: NumberFormatMode     // 'en_IN' | 'bn_BD'
  fiscal_year_start: string           // '07-01' (July 1 for Bangladesh)
  logo_url?: string | null
  is_active: boolean
  updated_at: string
}

export interface BranchBangladeshProfile {
  id: string
  company_id: string
  name: string
  branch_name_bn?: string | null
  name_bn?: string | null
  code: string
  bin_number?: string | null
  division_id?: number | null
  district_id?: number | null
  upazila_id?: number | null
  area?: string | null
  address?: string | null
  full_address_bn?: string | null
  address_bn?: string | null
  phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BangladeshLocationItem {
  id: string
  division_id: number
  division_name: string
  division_name_bn: string
  district_id: number
  district_name: string
  district_name_bn: string
  upazila_id?: number | null
  upazila_name?: string | null
  upazila_name_bn?: string | null
  post_code?: string | null
  is_active: boolean
}
