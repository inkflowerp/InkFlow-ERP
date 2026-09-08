import {
  CompanyTaxSettingsRecord,
  DocumentTemplateConfigRecord,
  VatCalculationResult,
  VatPricingMode,
  VatReportSummary,
  DocumentType,
} from '@/types/tax-and-docs.types'

export function calculateVat(
  amount: number,
  rate: number,
  mode: VatPricingMode
): VatCalculationResult {
  if (mode === 'inclusive') {
    const totalAmount = amount
    const baseAmount = Math.round(totalAmount / (1 + rate / 100))
    const vatAmount = totalAmount - baseAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'inclusive' }
  } else {
    const baseAmount = amount
    const vatAmount = Math.round(baseAmount * (rate / 100))
    const totalAmount = baseAmount + vatAmount
    return { baseAmount, vatRate: rate, vatAmount, totalAmount, pricingMode: 'exclusive' }
  }
}

export const DEFAULT_TAX_SETTINGS: CompanyTaxSettingsRecord = {
  id: 'tax-default',
  company_id: 'default',
  vat_enabled: true,
  default_vat_rate: 15.0, // Standard 15% NBR Rate
  pricing_mode: 'exclusive',
  bin_number: '',
  tin_number: '',
  trade_license_number: '',
  vat_commissionerate: '',
  vat_circle: '',
  updated_at: new Date().toISOString(),
}

export const DEMO_TAX_SETTINGS = DEFAULT_TAX_SETTINGS

export const DEFAULT_DOCUMENT_TEMPLATES: Record<DocumentType, DocumentTemplateConfigRecord> = {
  quotation: {
    id: 'dt-01',
    company_id: 'default',
    document_type: 'quotation',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Commercial Price Proposal / বাণিজ্যিক দরপত্র',
    footer_terms_en: '1. Quotation valid for 15 days from issue date.\n2. Advance along with work order, remaining on delivery.',
    footer_terms_bn: '১. কোটেশনের মেয়াদ প্রদানের তারিখ হতে ১৫ দিন।\n২. কাজের অর্ডারের সাথে অগ্রিম এবং অবশিষ্ট মালামাল ডেলিভারির সময় প্রদেয়।',
    authorized_signatory_title: 'Authorized Signature',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  invoice: {
    id: 'dt-02',
    company_id: 'default',
    document_type: 'invoice',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Sales Invoice / বিক্রয় চালান বিল',
    footer_terms_en: '1. Payment is due within agreed terms.\n2. Please make account payee cheques or bank transfers to official company account.',
    footer_terms_bn: '১. নির্ধারিত মেয়াদের মধ্যে বিল পরিশোধযোগ্য।\n২. প্রতিষ্ঠানের ব্যাংক একাউন্টে চেক বা অনলাইন ট্রান্সফার করুন।',
    authorized_signatory_title: 'Authorized Signature',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  vat_mushak: {
    id: 'dt-03',
    company_id: 'default',
    document_type: 'vat_mushak',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড — কর চালানপত্র [মূসক-৬.৩]',
    footer_terms_en: 'Goods supplied are subject to National Board of Revenue VAT regulations. This Mushak 6.3 is an official tax credit document.',
    footer_terms_bn: 'সরবরাহকৃত পণ্য জাতীয় রাজস্ব বোর্ডের মূসক বিধিমালা অনুযায়ী করযুক্ত। এই মূসক-৬.৩ চালান কর রেয়াতের সরকারি দলিল।',
    authorized_signatory_title: 'Authorized VAT Officer / মূসক কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  receipt: {
    id: 'dt-04',
    company_id: 'default',
    document_type: 'receipt',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Official Money Receipt / আনুষ্ঠানিক মানি রিসিট',
    footer_terms_en: 'Received with thanks. Subject to realization in case of payment made by bank cheque.',
    footer_terms_bn: 'ধন্যবাদসহ গৃহীত হলো। চেকের মাধ্যমে প্রদেয় অর্থ ব্যাংকে ক্লিয়ারিং সাপেক্ষে কার্যকর।',
    authorized_signatory_title: 'Cashier / হিসাবরক্ষণ',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  challan: {
    id: 'dt-05',
    company_id: 'default',
    document_type: 'challan',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Delivery Challan / ডেলিভারি চালানপত্র',
    footer_terms_en: 'Goods received in sound physical condition and exact count.',
    footer_terms_bn: 'সঠিক গণনা ও অক্ষত অবস্থায় মালামাল বুঝে পাওয়া গেল।',
    authorized_signatory_title: 'Store & Dispatch / স্টোর ইনচার্জ',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
  purchase_order: {
    id: 'dt-06',
    company_id: 'default',
    document_type: 'purchase_order',
    default_language: 'bengali',
    show_company_logo: true,
    company_name_bn: '',
    header_disclaimer: 'Purchase Order / ক্রয় আদেশ',
    footer_terms_en: 'Supply strictly in accordance with approved specifications.',
    footer_terms_bn: 'অনুমোদিত নমুনা ও স্পেসিফিকেশন মোতাবেক মালামাল সরবরাহ করতে হবে।',
    authorized_signatory_title: 'Procurement Incharge / ক্রয় কর্মকর্তা',
    show_seal_box: true,
    updated_at: new Date().toISOString(),
  },
}

export const DEMO_DOCUMENT_TEMPLATES = DEFAULT_DOCUMENT_TEMPLATES

export const DEMO_VAT_MONTHLY_RETURN: VatReportSummary = {
  period: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  grossTurnover: 0,
  outputVat: 0,
  inputVat: 0,
  netPayableVat: 0,
  isExempted: false,
}
