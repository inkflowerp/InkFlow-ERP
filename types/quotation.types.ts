export type QuotationStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'negotiation'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'converted'

export type LanguageMode = 'en' | 'bn' | 'bilingual'

export type QuotationDeliveryMethod = 'customer_pickup' | 'company_delivery' | 'courier'

export type RateSource = 'custom' | 'last_invoice' | 'default' | 'override'

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
  rate_source?: RateSource
  finishing?: string | null
  color_spec?: string | null
  artwork_required?: boolean
  installation_required?: boolean
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
  customer_company?: string | null
  customer_phone: string
  customer_whatsapp?: string | null
  customer_email?: string | null
  customer_address?: string | null
  customer_bin?: string | null
  customer_type?: 'retail' | 'reseller' | 'corporate' | 'government' | string | null
  status: QuotationStatus
  quotation_date: string
  valid_until: string
  reference_no?: string | null // Reference / Customer PO No.
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
  delivery_date?: string | null
  delivery_location?: string | null
  delivery_method?: QuotationDeliveryMethod | string | null
  installation_required?: boolean | null
  notes?: string | null // Customer-facing notes
  terms_and_conditions?: string | null // Terms & conditions
  internal_notes?: string | null // Internal notes (visible only to staff)
  converted_order_id?: string | null
  converted_invoice_id?: string | null
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

export interface CreateQuotationItemInput {
  id?: string
  product_id?: string | null
  description: string
  description_bn?: string | null
  material_spec?: string | null
  width?: number
  height?: number
  dimension_unit?: 'ft' | 'inch' | 'm'
  area_sft?: number
  quantity: number
  unit?: string
  unit_rate: number
  rate_source?: RateSource
  finishing?: string | null
  color_spec?: string | null
  artwork_required?: boolean
  installation_required?: boolean
  material_cost?: number
  labor_cost?: number
  finishing_cost?: number
  installation_cost?: number
  item_total?: number
}

export interface CreateQuotationPayload {
  customer_id?: string | null
  new_customer?: {
    name: string
    company_name?: string
    mobile: string
    whatsapp?: string
    email?: string
    address: string
    customer_type?: 'retail' | 'reseller' | 'corporate' | 'government'
    save_customer?: boolean
  }
  customer_name?: string
  customer_name_bn?: string | null
  customer_company?: string | null
  customer_phone?: string
  customer_whatsapp?: string | null
  customer_email?: string | null
  customer_address?: string | null
  customer_bin?: string | null
  customer_type?: string | null
  quotation_date?: string
  valid_until?: string
  reference_no?: string | null
  salesperson_id?: string | null
  salesperson_name?: string
  items: CreateQuotationItemInput[]
  discount_amount?: number
  vat_rate?: number
  delivery_date?: string | null
  delivery_location?: string | null
  delivery_method?: QuotationDeliveryMethod | string | null
  installation_required?: boolean | null
  notes?: string | null
  terms_and_conditions?: string | null
  internal_notes?: string | null
  language_mode?: LanguageMode
}

export interface SendQuotationPayload {
  quotationId: string
  channel: 'whatsapp' | 'email' | 'sms'
  format: 'pdf' | 'text'
  recipientOverride?: string
}
