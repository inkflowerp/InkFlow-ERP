export type DocumentType =
  | 'quotation'
  | 'invoice'
  | 'vat_mushak'
  | 'receipt'
  | 'challan'
  | 'purchase_order'

export type DocumentLanguageMode = 'english' | 'bengali'

export type VatPricingMode = 'inclusive' | 'exclusive'

export interface CompanyTaxSettingsRecord {
  id: string
  company_id: string
  vat_enabled: boolean
  default_vat_rate: number
  pricing_mode: VatPricingMode
  bin_number?: string | null
  tin_number?: string | null
  trade_license_number?: string | null
  vat_commissionerate?: string | null
  vat_circle?: string | null
  updated_at: string
}

export interface DocumentTemplateConfigRecord {
  id: string
  company_id: string
  document_type: DocumentType
  default_language: DocumentLanguageMode
  show_company_logo: boolean
  company_name_bn?: string | null
  header_disclaimer?: string | null
  footer_terms_en: string
  footer_terms_bn: string
  authorized_signatory_title: string
  show_seal_box: boolean
  updated_at: string
}

export interface VatCalculationResult {
  baseAmount: number
  vatRate: number
  vatAmount: number
  totalAmount: number
  pricingMode: VatPricingMode
}

export interface VatReportSummary {
  period: string
  grossTurnover: number
  outputVat: number
  inputVat: number
  netPayableVat: number
  isExempted: boolean
}
