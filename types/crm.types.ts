export type CustomerKind = 'business' | 'individual'

export type CustomerCategory =
  | 'retail'
  | 'corporate'
  | 'agency'
  | 'dealer'
  | 'government'
  | 'regular'
  | 'reseller'

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
  | 'vinyl'
  | 'flex'
  | 'fabrication'
  | 'packaging'
  | 'finishing'
  | 'outsourcing'
  | 'general'
  | 'other'
  | string

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

  // Computed / Financial values
  total_invoices_count?: number
  total_invoiced_amount?: number
  total_paid_amount?: number
  total_orders_count?: number
  total_orders_amount?: number
  total_due_balance?: number
  last_order_date?: string | null
  last_order_number?: string | null
  last_payment_date?: string | null
  last_payment_amount?: number | null

  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface CustomerRateRecord {
  id: string
  company_id: string
  customer_id: string
  product_id: string
  rate: number
  notes?: string | null
  created_at: string
  updated_at: string
}

export type RateSource = 'custom' | 'last_invoice' | 'default'

export interface ResolvedProductRate {
  productId: string
  productName: string
  productNameBn?: string | null
  sku: string
  unit: string
  category: string
  customerRate: number | null
  lastInvoiceRate: number | null
  lastInvoiceNumber?: string | null
  lastInvoiceDate?: string | null
  defaultRate: number
  effectiveRate: number
  source: RateSource
  hasCustomRate: boolean
}

export interface CustomerFinancialSummary {
  totalInvoices: number
  totalInvoiceAmount: number
  totalPaid: number
  totalDue: number
  totalOverdue?: number
  creditLimit?: number
  availableCredit?: number
  paymentTerms?: string | null
  lastPayment: {
    amount: number
    date: string
    receiptNumber?: string | null
    paymentMethod?: string | null
  } | null
  lastOrder: {
    orderNumber: string
    date: string
    amount: number
    status?: string | null
  } | null
}

export interface CustomerProductPurchaseStat {
  productId: string
  productName: string
  productNameBn?: string | null
  unit: string
  category?: string | null
  totalQuantity: number
  totalAmount: number
  lastRate: number
  lastPurchaseDate: string
  invoiceCount: number
}

export interface CustomerTimelineEvent {
  id: string
  type:
    | 'customer_created'
    | 'customer_updated'
    | 'rate_updated'
    | 'quotation_created'
    | 'quotation_sent'
    | 'order_created'
    | 'job_started'
    | 'invoice_created'
    | 'payment_received'
    | 'delivery_completed'
    | 'communication_logged'
  title: string
  description?: string | null
  timestamp: string
  amount?: number | null
  referenceId?: string | null
  referenceNumber?: string | null
  referenceType?: 'invoice' | 'payment' | 'quotation' | 'order' | 'job' | 'delivery' | 'customer'
  actorName?: string | null
  status?: string | null
}

export interface CustomerSummaryStatistics {
  totalCustomers: number
  activeCustomers: number
  customersWithDue: number
  totalOutstandingDue: number
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
  branch_id?: string | null
  supplier_code?: string | null
  supplier_name: string
  name_bn?: string | null
  company?: string | null
  contact_person?: string | null
  designation?: string | null
  mobile: string
  alt_phone?: string | null
  whatsapp?: string | null
  email?: string | null
  address?: string | null
  market_hub?: string | null
  division?: string | null
  district?: string | null
  upazila?: string | null
  area?: string | null
  bin?: string | null
  tin?: string | null
  trade_license?: string | null
  website?: string | null
  category: SupplierCategory
  payment_terms: SupplierPaymentTerms
  credit_limit?: number
  lead_time_days?: number
  default_currency?: string
  bank_name?: string | null
  bank_account_name?: string | null
  bank_account_number?: string | null
  bank_branch?: string | null
  bank_routing_number?: string | null
  notes?: string | null
  is_active: boolean
  outstanding_balance?: number
  total_purchases_amount?: number
  created_by?: string | null
  updated_by?: string | null
  created_at: string
  updated_at: string
}

export interface SupplierMaterialPrice {
  id: string
  company_id: string
  supplier_id: string
  material_id?: string | null
  material_name: string
  category: string
  unit: string
  contract_price_bdt: number
  moq?: number
  lead_time_days?: number
  effective_date: string
  notes?: string | null
  created_at: string
  updated_at?: string
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
