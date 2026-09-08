export type CustomerKind = 'business' | 'individual'

export type CustomerCategory =
  | 'retail'
  | 'corporate'
  | 'agency'
  | 'dealer'
  | 'government'
  | 'regular'

// Legacy / alias for backwards compatibility
export type CustomerType = CustomerCategory

export type CustomerRateLevel =
  | 'default'
  | 'retail'
  | 'corporate'
  | 'dealer'
  | 'custom'

export type CustomerPaymentTerms =
  | 'cash'
  | 'advance'
  | 'partial'
  | 'credit'
  | 'cash_on_delivery'
  | 'net_7'
  | 'net_15'
  | 'net_30'
  | 'advance_50'

export type SupplierCategory =
  | 'media'
  | 'acrylic'
  | 'led'
  | 'hardware'
  | 'ink'
  | 'paper'
  | 'pvc'
  | 'aluminum'
  | 'other'

export type SupplierPaymentTerms =
  | 'cash'
  | 'credit_15'
  | 'credit_30'
  | 'advance'

export interface CustomerRecord {
  id: string
  company_id: string
  customer_kind?: CustomerKind
  customer_type?: CustomerType
  customer_category?: CustomerCategory
  rate_level?: CustomerRateLevel
  rate_level_id?: string | null

  name: string
  name_bn?: string | null
  company_name?: string | null
  contact_person?: string | null

  mobile: string
  whatsapp?: string | null
  email?: string | null
  alternative_phone?: string | null

  division_id?: number | null
  division?: string | null
  district_id?: number | null
  district?: string | null
  upazila_id?: number | null
  upazila_thana?: string | null
  area?: string | null
  address?: string | null
  address_bn?: string | null
  full_address?: string | null

  bin_no?: string | null
  tin_no?: string | null

  credit_limit: number
  payment_terms: CustomerPaymentTerms
  notes?: string | null
  tags: string[]
  is_active: boolean

  total_orders_count?: number
  total_orders_amount?: number
  total_due_balance?: number

  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CustomerCommunication {
  id: string
  company_id: string
  customer_id: string
  type: 'phone_call' | 'whatsapp_message' | 'email' | 'meeting' | 'site_visit'
  summary: string
  details?: string | null
  logged_by_name?: string | null
  created_at: string
}

export interface SupplierRecord {
  id: string
  company_id: string
  supplier_name: string
  company?: string | null
  contact_person?: string | null
  mobile: string
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  category: SupplierCategory
  payment_terms: SupplierPaymentTerms
  notes?: string | null
  is_active: boolean
  outstanding_balance?: number
  total_purchases_amount?: number
  created_at: string
  updated_at: string
}

export interface SupplierMaterialPrice {
  id: string
  company_id: string
  supplier_id: string
  material_name: string
  category: string
  unit: string
  contract_price_bdt: number
  effective_date: string
  notes?: string | null
  created_at: string
}

export interface DuplicateMatchResult {
  customer: CustomerRecord
  matchReason: string
  matchField: 'mobile' | 'whatsapp' | 'name' | 'company_name'
  confidence: 'exact' | 'high' | 'possible'
}

export interface DuplicateCheckResponse {
  hasDuplicate: boolean
  matches: DuplicateMatchResult[]
}
