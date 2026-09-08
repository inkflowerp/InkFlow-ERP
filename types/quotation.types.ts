export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'negotiation'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'

export type LanguageMode = 'en' | 'bn'

export interface QuotationItemRecord {
  id: string
  quotation_id?: string
  product_id?: string | null
  description: string
  description_bn?: string | null
  material_spec?: string | null
  width: number
  height: number
  dimension_unit: 'ft' | 'inch' | 'm'
  area_sft: number
  quantity: number
  unit: string
  unit_rate: number
  material_cost?: number
  labor_cost?: number
  finishing_cost?: number
  installation_cost?: number
  item_total: number
}

export interface QuotationRecord {
  id: string
  company_id: string
  quotation_number: string
  customer_id?: string | null
  customer_name: string
  customer_name_bn?: string | null
  customer_phone: string
  customer_email?: string | null
  customer_address?: string | null
  customer_bin?: string | null
  status: QuotationStatus
  quotation_date: string
  valid_until: string
  salesperson_id?: string | null
  salesperson_name: string
  items: QuotationItemRecord[]
  subtotal: number
  discount_amount: number
  vat_rate: number
  vat_amount: number
  grand_total: number
  total_cost: number // Internal only - strictly shielded from client PDF
  margin_percent: number // Internal only
  language_mode: LanguageMode
  notes?: string | null
  terms_and_conditions?: string | null
  converted_order_id?: string | null
  created_at: string
  updated_at: string
}

export interface QuotationActivityRecord {
  id: string
  quotation_id: string
  action: 'created' | 'sent' | 'viewed' | 'negotiated' | 'approved' | 'rejected' | 'expired' | 'converted'
  details?: string | null
  actor_name: string
  created_at: string
}
