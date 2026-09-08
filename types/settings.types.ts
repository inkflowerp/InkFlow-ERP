export type DocumentType =
  | 'quotation'
  | 'order'
  | 'invoice'
  | 'challan'
  | 'payment'
  | 'purchase'

export interface DocumentSequenceItem {
  id: string
  company_id: string
  doc_type: DocumentType
  prefix: string
  current_val: number
  padding: number
  sample_preview: string
  updated_at: string
}

export interface AuditLogItem {
  id: string
  company_id: string
  user_id: string | null
  user_name?: string
  entity_type: string
  entity_id: string | null
  action: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address?: string | null
  created_at: string
}

export interface BrandingSettings {
  company_name: string
  company_name_bn: string
  logo_url?: string | null
  invoice_logo_url?: string | null
  quotation_logo_url?: string | null
  primary_color: string
  document_footer_text: string
  document_footer_text_bn: string
}

export interface LocalizationSettings {
  default_language: 'en' | 'bn'
  default_currency: string
  date_format: string
}

export interface TaxSettings {
  vat_enabled: boolean
  vat_rate: number
  bin_no?: string | null
  tin_no?: string | null
  trade_license_no?: string | null
}

export interface NotificationSettings {
  whatsapp_enabled: boolean
  whatsapp_number?: string | null
  sms_enabled: boolean
  sms_sender_id?: string | null
  sms_api_key?: string | null
  email_notifications: boolean
  low_stock_alerts: boolean
}
