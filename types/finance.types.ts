// ==============================================================================
// InkFlow ERP - Finance & Double-Entry Accounting Types (V6)
// ==============================================================================

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

export type AccountSubtype =
  | 'CASH'
  | 'BANK'
  | 'MFS'
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'INVENTORY'
  | 'REVENUE'
  | 'COGS_MATERIAL'
  | 'COGS_LABOR'
  | 'COGS_MACHINE'
  | 'OPEX_RENT'
  | 'OPEX_UTILITIES'
  | 'OPEX_SALARY'
  | 'OPEX_TRANSPORT'
  | 'OPEX_MAINTENANCE'
  | 'OPEX_MARKETING'
  | 'OPEX_GENERAL'
  | 'EQUITY'
  | 'OTHER'

export interface AccountRecord {
  id: string
  company_id: string
  branch_id?: string | null
  code: string
  name: string
  name_bn?: string | null
  account_type: AccountType
  account_subtype: AccountSubtype
  currency: string
  opening_balance: number
  current_balance: number
  is_system: boolean
  is_active: boolean
  metadata?: {
    bank_name?: string
    account_number_masked?: string
    routing_number?: string
    branch_name?: string
    mfs_provider?: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'other'
    mfs_wallet_number?: string
    mfs_account_type?: 'merchant' | 'personal' | 'agent'
  } | null
  created_at: string
  updated_at: string
}

export type FinancialTransactionType =
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE'
  | 'ACCOUNT_TRANSFER'
  | 'REFUND'
  | 'JOURNAL_ADJUSTMENT'
  | 'CASH_CLOSING_ADJUSTMENT'
  | 'SALARY_PAYMENT'
  | 'SALES_INVOICE'
  | 'PURCHASE_GRN'

export type FinancialTransactionStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'POSTED'
  | 'REVERSED'
  | 'CANCELLED'

export interface JournalEntryLineRecord {
  id: string
  transaction_id: string
  company_id: string
  account_id: string
  account_code?: string
  account_name?: string
  debit: number
  credit: number
  memo?: string | null
  created_at: string
}

export interface FinancialTransactionRecord {
  id: string
  company_id: string
  branch_id?: string | null
  transaction_number: string
  transaction_date: string
  transaction_type: FinancialTransactionType
  status: FinancialTransactionStatus
  total_amount: number
  reference_type?: string | null
  reference_id?: string | null
  narration: string
  posted_by_id?: string | null
  posted_by_name: string
  posted_at: string
  reversal_of_id?: string | null
  metadata?: Record<string, any> | null
  lines?: JournalEntryLineRecord[]
  created_at: string
  updated_at: string
}

export interface AccountTransferRecord {
  id: string
  company_id: string
  branch_id?: string | null
  transfer_number: string
  from_account_id: string
  from_account_name?: string
  to_account_id: string
  to_account_name?: string
  amount: number
  fee_amount: number
  transfer_date: string
  transaction_id?: string | null
  status: 'PENDING' | 'POSTED' | 'CANCELLED'
  notes?: string | null
  created_by_name: string
  created_at: string
}

export type CashClosingStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface CashClosingRecord {
  id: string
  company_id: string
  branch_id?: string | null
  closing_number: string
  closing_date: string
  account_id: string
  account_name?: string
  opening_cash: number
  cash_inflows: number
  cash_outflows: number
  expected_cash: number
  counted_cash: number
  variance: number
  variance_reason?: string | null
  status: CashClosingStatus
  adjustment_transaction_id?: string | null
  closed_by_name: string
  approved_by_name?: string | null
  approved_at?: string | null
  created_at: string
  updated_at?: string
}

export interface FinancialPeriodRecord {
  id: string
  company_id: string
  period_name: string
  start_date: string
  end_date: string
  status: 'OPEN' | 'CLOSED'
  closed_at?: string | null
  closed_by_name?: string | null
  created_at: string
}

// Financial Statements & Dashboards
export interface ProfitAndLossStatement {
  company_id: string
  start_date: string
  end_date: string
  revenue: {
    total: number
    accounts: { code: string; name: string; amount: number }[]
  }
  cost_of_goods_sold: {
    total: number
    material_cost: number
    labor_cost: number
    machine_cost: number
    other_cogs: number
  }
  gross_profit: number
  gross_margin_percentage: number
  operating_expenses: {
    total: number
    categories: { category: string; amount: number }[]
  }
  operating_profit: number
  operating_margin_percentage: number
  net_profit: number
}

export interface AgingBucketItem {
  reference_id: string
  party_id: string
  party_name: string
  issue_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  due_amount: number
  days_overdue: number
  bucket: '0_30' | '31_60' | '61_90' | '90_plus'
}

export interface ReceivablesAgingSummary {
  total_receivable: number
  current_due: number
  overdue_total: number
  bucket_0_30: number
  bucket_31_60: number
  bucket_61_90: number
  bucket_90_plus: number
  items: AgingBucketItem[]
}

export interface PayablesAgingSummary {
  total_payable: number
  current_due: number
  overdue_total: number
  bucket_0_30: number
  bucket_31_60: number
  bucket_61_90: number
  bucket_90_plus: number
  items: AgingBucketItem[]
}

export interface FinancialDashboardMetrics {
  total_cash_balance: number
  total_bank_balance: number
  total_mfs_balance: number
  total_liquid_assets: number
  total_receivables: number
  total_payables: number
  monthly_revenue: number
  monthly_expenses: number
  monthly_gross_profit: number
  monthly_net_profit: number
}
