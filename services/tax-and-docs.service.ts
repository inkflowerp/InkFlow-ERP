import {
  CompanyTaxSettingsRecord,
  DocumentTemplateConfigRecord,
  VatCalculationResult,
  VatPricingMode,
  VatReportSummary,
  DocumentType,
} from '@/types/tax-and-docs.types'

import { calculateVat } from '@/lib/tax/vat-calculator'

export { calculateVat }

export const DEFAULT_TAX_SETTINGS: CompanyTaxSettingsRecord = {
  id: 'tax-default',
  company_id: 'default',
  vat_enabled: true,
  default_vat_rate: 15.0, // Standard 15% NBR Rate
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

export const DEMO_TAX_SETTINGS = DEFAULT_TAX_SETTINGS

export { DEFAULT_DOCUMENT_TEMPLATES, DEMO_DOCUMENT_TEMPLATES } from '@/lib/communication/document-templates'

export const DEMO_VAT_MONTHLY_RETURN: VatReportSummary = {
  period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  grossTurnover: 0,
  outputVat: 0,
  inputVat: 0,
  netPayableVat: 0,
  isExempted: false,
}
