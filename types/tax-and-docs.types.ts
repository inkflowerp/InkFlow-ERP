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
  // Extended Bangladeshi Industrial Tax & Compliance Fields
  vds_enabled?: boolean
  vds_rate?: number
  tds_enabled?: boolean
  tds_rate?: number
  mushak_6_3_enabled?: boolean
  mushak_6_5_enabled?: boolean
  mushak_6_6_enabled?: boolean
  rebate_enabled?: boolean
  vat_responsible_person?: string | null
  vat_responsible_phone?: string | null
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
  // Customizable Communication Templates
  email_subject_template?: string | null
  email_subject_template_bn?: string | null
  email_body_template?: string | null
  email_body_template_bn?: string | null
  whatsapp_template?: string | null
  whatsapp_template_bn?: string | null
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

export const DEFAULT_TAX_SETTINGS: CompanyTaxSettingsRecord = {
  id: 'tax-default',
  company_id: 'default',
  vat_enabled: true,
  default_vat_rate: 15.0,
  pricing_mode: 'exclusive',
  bin_number: '',
  tin_number: '',
  trade_license_number: '',
  vat_commissionerate: 'Customs, Excise & VAT Commissionerate, Dhaka South',
  vat_circle: 'Motijheel Circle, Revenue Division-02',
  vds_enabled: true,
  vds_rate: 7.5,
  tds_enabled: false,
  tds_rate: 3.0,
  mushak_6_3_enabled: true,
  mushak_6_5_enabled: true,
  mushak_6_6_enabled: true,
  rebate_enabled: true,
  vat_responsible_person: '',
  vat_responsible_phone: '',
  updated_at: new Date().toISOString(),
}
