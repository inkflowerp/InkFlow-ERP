// ==============================================================================
// PrintFlow Document Template Designer Types & Default Data
// ==============================================================================

export type DocumentTypeKey =
  | 'quotation'
  | 'invoice'
  | 'challan'
  | 'receipt'
  | 'purchase_order'

export type DocumentLanguageMode = 'english' | 'bengali' | 'bilingual'
export type PageSizeMode = 'a4' | 'letter' | 'legal'
export type OrientationMode = 'portrait' | 'landscape'
export type LetterheadMode = 'full_page' | 'header_footer'
export type RepeatLetterheadMode = 'every_page' | 'first_page_only'
export type ItemDisplayMode = 'compact' | 'detailed'

export interface LetterheadFileRecord {
  name: string
  url?: string
  size_label: string
  pages: number
}

export interface DocumentTemplateSettings {
  id: string
  template_name: string
  document_type: DocumentTypeKey
  language: DocumentLanguageMode
  page_size: PageSizeMode
  orientation: OrientationMode
  use_letterhead: boolean
  letterhead_file: LetterheadFileRecord | null
  letterhead_mode: LetterheadMode
  repeat_letterhead: RepeatLetterheadMode
  padding_top: number // in millimeters
  padding_right: number // in millimeters
  padding_bottom: number // in millimeters
  padding_left: number // in millimeters
  item_display_mode: ItemDisplayMode
  terms_and_conditions: string
  updated_at: string
}

export interface DocumentTypeTabDefinition {
  key: DocumentTypeKey
  labelEn: string
  labelBn: string
  docCodePrefix: string
}

export const DOCUMENT_TYPE_TABS: DocumentTypeTabDefinition[] = [
  {
    key: 'quotation',
    labelEn: 'Quotation',
    labelBn: 'কোটেশন',
    docCodePrefix: 'QT-2026-001',
  },
  {
    key: 'invoice',
    labelEn: 'Invoice',
    labelBn: 'ইনভয়েস',
    docCodePrefix: 'INV-2026-001',
  },
  {
    key: 'challan',
    labelEn: 'Delivery Challan',
    labelBn: 'ডেলিভারি চালান',
    docCodePrefix: 'DC-2026-001',
  },
  {
    key: 'receipt',
    labelEn: 'Payment Receipt',
    labelBn: 'পেমেন্ট রিসিট',
    docCodePrefix: 'REC-2026-001',
  },
  {
    key: 'purchase_order',
    labelEn: 'Purchase Order',
    labelBn: 'পারচেজ অর্ডার',
    docCodePrefix: 'PO-2026-001',
  },
]

export const DEFAULT_PADDING_CONFIG = {
  top: 42,
  right: 10,
  bottom: 25,
  left: 10,
} as const

export const DEFAULT_TEMPLATE_SETTINGS: Record<DocumentTypeKey, DocumentTemplateSettings> = {
  quotation: {
    id: 'tpl_quotation',
    template_name: 'Default Quotation (Letterhead)',
    document_type: 'quotation',
    language: 'english',
    page_size: 'a4',
    orientation: 'portrait',
    use_letterhead: true,
    letterhead_file: {
      name: 'company-letterhead.pdf',
      size_label: 'A4 • 210 × 297 mm',
      pages: 1,
    },
    letterhead_mode: 'full_page',
    repeat_letterhead: 'every_page',
    padding_top: 42,
    padding_right: 10,
    padding_bottom: 25,
    padding_left: 10,
    item_display_mode: 'detailed',
    terms_and_conditions: `1. This quotation is valid for 7 days from the date of issue.
2. Price may vary based on final design, material and site condition.
3. 50% advance payment is required to confirm the order.
4. Delivery timeline may vary based on design approval and material availability.
5. Any additional work outside the scope will be charged separately.
6. This is a computer generated quotation, no signature is required.`,
    updated_at: new Date().toISOString(),
  },
  invoice: {
    id: 'tpl_invoice',
    template_name: 'Standard Commercial Sales Invoice',
    document_type: 'invoice',
    language: 'english',
    page_size: 'a4',
    orientation: 'portrait',
    use_letterhead: true,
    letterhead_file: {
      name: 'company-letterhead.pdf',
      size_label: 'A4 • 210 × 297 mm',
      pages: 1,
    },
    letterhead_mode: 'full_page',
    repeat_letterhead: 'every_page',
    padding_top: 42,
    padding_right: 10,
    padding_bottom: 25,
    padding_left: 10,
    item_display_mode: 'detailed',
    terms_and_conditions: `1. Payment is due within 15 days of invoice date.
2. Goods once delivered in good condition cannot be returned.
3. Please make cheques payable to official company account or online bank transfer.
4. Late payments are subject to a 2% monthly service charge.`,
    updated_at: new Date().toISOString(),
  },
  challan: {
    id: 'tpl_challan',
    template_name: 'Official Delivery & Dispatch Challan',
    document_type: 'challan',
    language: 'english',
    page_size: 'a4',
    orientation: 'portrait',
    use_letterhead: true,
    letterhead_file: {
      name: 'company-letterhead.pdf',
      size_label: 'A4 • 210 × 297 mm',
      pages: 1,
    },
    letterhead_mode: 'full_page',
    repeat_letterhead: 'every_page',
    padding_top: 42,
    padding_right: 10,
    padding_bottom: 25,
    padding_left: 10,
    item_display_mode: 'detailed',
    terms_and_conditions: `1. Please inspect and verify all materials upon receipt.
2. Any discrepancy or damage must be endorsed on the challan copy immediately.
3. Signed copy must be returned to the delivery representative.`,
    updated_at: new Date().toISOString(),
  },
  receipt: {
    id: 'tpl_receipt',
    template_name: 'Official Money & Payment Receipt',
    document_type: 'receipt',
    language: 'english',
    page_size: 'a4',
    orientation: 'portrait',
    use_letterhead: true,
    letterhead_file: {
      name: 'company-letterhead.pdf',
      size_label: 'A4 • 210 × 297 mm',
      pages: 1,
    },
    letterhead_mode: 'full_page',
    repeat_letterhead: 'every_page',
    padding_top: 42,
    padding_right: 10,
    padding_bottom: 25,
    padding_left: 10,
    item_display_mode: 'detailed',
    terms_and_conditions: `1. Receipt issued subject to realization of cheque / online transfer.
2. Official seal and authorized signature required for validity.
3. Retain this receipt for future reference and account settlement.`,
    updated_at: new Date().toISOString(),
  },
  purchase_order: {
    id: 'tpl_purchase_order',
    template_name: 'Standard Procurement Purchase Order',
    document_type: 'purchase_order',
    language: 'english',
    page_size: 'a4',
    orientation: 'portrait',
    use_letterhead: true,
    letterhead_file: {
      name: 'company-letterhead.pdf',
      size_label: 'A4 • 210 × 297 mm',
      pages: 1,
    },
    letterhead_mode: 'full_page',
    repeat_letterhead: 'every_page',
    padding_top: 42,
    padding_right: 10,
    padding_bottom: 25,
    padding_left: 10,
    item_display_mode: 'detailed',
    terms_and_conditions: `1. Deliver strictly as per specifications and agreed sample.
2. Enclose delivery challan and invoice with order number.
3. Material inspection will be performed prior to warehouse acceptance.`,
    updated_at: new Date().toISOString(),
  },
}
