// ==============================================================================
// InkFlow ERP - Authoritative Bangladesh VAT & Tax Types (V7)
// Multi-Tenant, Multi-Rate, Deterministic VAT Engine & Tax Reporting Models
// ==============================================================================

export type TaxType =
  | 'STANDARD'      // Standard NBR 15% VAT
  | 'TRUNCATED'     // Truncated / Reduced service VAT (e.g. 7.5%, 10%)
  | 'REDUCED'       // Specific reduced rates (e.g. 5% retail / printing POS)
  | 'ZERO_RATED'    // 0% VAT on direct exports / qualified supply with refund eligibility
  | 'EXEMPT'        // Statutory exempted supply under NBR Schedule
  | 'NON_TAXABLE'   // Out of scope / non-VAT items
  | 'OUT_OF_SCOPE'  // Non-commercial / internal transfers

export type TaxCalculationMode = 'inclusive' | 'exclusive'

export type TaxTransactionType =
  | 'SALES_INVOICE'
  | 'PURCHASE_BILL'
  | 'CREDIT_NOTE'
  | 'DEBIT_NOTE'
  | 'PURCHASE_RETURN'
  | 'MANUAL_ADJUSTMENT'

export interface TaxProfileRecord {
  id: string
  company_id: string
  branch_id?: string | null
  code: string                  // e.g. 'VAT-15', 'VAT-7.5', 'VAT-5', 'VAT-ZERO', 'VAT-EXEMPT'
  name: string                  // e.g. 'Standard VAT 15%'
  name_bn?: string | null       // e.g. 'আদর্শ ভ্যাট ১৫%'
  rate: number                  // 0.00 to 100.00
  calculation_mode: TaxCalculationMode
  tax_type: TaxType
  is_recoverable: boolean       // true for eligible input VAT on business purchases
  effective_from: string        // YYYY-MM-DD
  effective_to?: string | null  // YYYY-MM-DD
  is_active: boolean
  is_default: boolean
  description?: string | null
  created_at: string
  updated_at: string
}

export interface TaxTransactionLineRecord {
  id: string
  company_id: string
  branch_id?: string | null
  transaction_type: TaxTransactionType
  document_id: string
  document_number: string
  document_date: string         // YYYY-MM-DD
  line_id?: string | null
  party_type: 'CUSTOMER' | 'SUPPLIER'
  party_id: string
  party_name: string
  party_bin?: string | null
  party_tin?: string | null
  tax_profile_id?: string | null
  tax_profile_code: string
  tax_type: TaxType
  tax_rate: number
  calculation_mode: TaxCalculationMode
  gross_amount: number          // Qty * Unit Price
  discount_amount: number       // Item level discount
  taxable_amount: number        // Base on which VAT is computed
  vat_amount: number            // Computed VAT
  total_amount: number          // Final item total
  is_recoverable: boolean
  financial_transaction_id?: string | null
  financial_period_id?: string | null
  notes?: string | null
  created_at: string
}

export interface VatCalculationItemInput {
  item_id?: string
  description?: string
  quantity: number
  unit_price: number
  discount_amount?: number
  tax_profile_id?: string | null
  custom_rate?: number | null
  custom_mode?: TaxCalculationMode | null
  tax_type?: TaxType | null
}

export interface VatCalculationItemResult {
  item_id?: string
  description?: string
  quantity: number
  unit_price: number
  gross_amount: number
  discount_amount: number
  taxable_amount: number
  tax_profile_code: string
  tax_type: TaxType
  vat_rate: number
  vat_amount: number
  total_amount: number
  pricing_mode: TaxCalculationMode
}

export interface RateBreakdownSummary {
  tax_profile_code: string
  tax_type: TaxType
  vat_rate: number
  pricing_mode: TaxCalculationMode
  taxable_amount: number
  vat_amount: number
  total_amount: number
}

export interface DocumentVatBreakdown {
  subtotal: number              // Total gross amount
  total_discount: number        // Total discounts applied
  taxable_subtotal: number      // Total taxable base
  total_vat: number             // Total VAT amount
  grand_total: number           // Final payable / invoice total
  rate_breakdowns: RateBreakdownSummary[]
}

export interface TaxReportSummary {
  period_start: string
  period_end: string
  output_vat: {
    total_taxable_sales: number
    standard_vat_15: number
    truncated_vat: number
    reduced_vat: number
    zero_rated_sales: number
    exempt_sales: number
    total_output_vat: number
  }
  input_vat: {
    total_taxable_purchases: number
    eligible_input_vat: number
    ineligible_input_vat: number
    total_input_vat: number
  }
  net_tax_position: number      // Output VAT - Eligible Input VAT
  transactions_count: number
}

export interface TaxPeriodSummary {
  company_id: string
  branch_id?: string | null
  fiscal_year: string
  month_period: string          // YYYY-MM
  output_vat: number
  input_vat: number
  net_vat_payable: number
  status: 'OPEN' | 'RECONCILED' | 'LOCKED'
}
