// ==============================================================================
// InkFlow ERP - Finance 360 & Double-Entry Accounting Types (V9.1)
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

export interface BalanceSheetAccountCategory {
  name: string
  total: number
  accounts: { code: string; name: string; balance: number }[]
}

export interface BalanceSheetStatement {
  company_id: string
  as_of_date: string
  assets: {
    total: number
    liquid_assets: BalanceSheetAccountCategory // Cash, Bank, MFS
    receivables: BalanceSheetAccountCategory  // Accounts Receivable
    inventory: BalanceSheetAccountCategory    // Stock
    fixed_assets: BalanceSheetAccountCategory // Equipment
  }
  liabilities: {
    total: number
    payables: BalanceSheetAccountCategory     // Accounts Payable
    advances: BalanceSheetAccountCategory     // Customer Advance Deposits
    tax_payable: BalanceSheetAccountCategory  // VAT/Tax
    other_liabilities: BalanceSheetAccountCategory
  }
  equity: {
    total: number
    capital: number
    retained_earnings: number
    current_period_profit: number
    drawings: number
  }
  is_balanced: boolean
  imbalance_amount: number
}

export interface CashFlowStatement {
  company_id: string
  start_date: string
  end_date: string
  opening_cash_balance: number
  operating_activities: {
    total: number
    customer_receipts: number
    supplier_payments: number
    operating_expenses_paid: number
  }
  investing_activities: {
    total: number
    equipment_purchases: number
  }
  financing_activities: {
    total: number
    capital_injections: number
    owner_drawings: number
  }
  net_cash_movement: number
  closing_cash_balance: number
}

export interface TrialBalanceAccountItem {
  account_id: string
  code: string
  name: string
  name_bn?: string | null
  account_type: AccountType
  account_subtype: AccountSubtype
  debit: number
  credit: number
  net_balance: number
}

export interface TrialBalanceStatement {
  company_id: string
  as_of_date: string
  total_debit: number
  total_credit: number
  is_balanced: boolean
  accounts: TrialBalanceAccountItem[]
}

export interface GeneralLedgerEntry {
  id: string
  transaction_id: string
  transaction_number: string
  transaction_date: string
  transaction_type: FinancialTransactionType
  reference_type?: string | null
  reference_id?: string | null
  narration: string
  account_id: string
  account_code: string
  account_name: string
  debit: number
  credit: number
  running_balance: number
  posted_by_name: string
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

export interface BankStatementRecord {
  id: string
  company_id: string
  branch_id?: string | null
  account_id: string
  statement_identifier: string
  start_date: string
  end_date: string
  opening_balance: number
  closing_balance: number
  status: 'OPEN' | 'RECONCILING' | 'RECONCILED'
  imported_by_name: string
  lines?: BankStatementLineRecord[]
  created_at: string
}

export interface BankStatementLineRecord {
  id: string
  statement_id: string
  company_id: string
  line_date: string
  description: string
  reference_number?: string | null
  debit: number
  credit: number
  balance: number
  reconciliation_status: 'UNMATCHED' | 'SUGGESTED' | 'MATCHED' | 'RECONCILED'
  matched_transaction_id?: string | null
  reconciled_at?: string | null
}

export interface BankReconciliationSummary {
  statement_id: string
  account_name: string
  statement_balance: number
  book_balance: number
  difference: number
  matched_count: number
  unmatched_count: number
  is_reconciled: boolean
}

export interface JobProfitabilityMetric {
  job_id: string
  job_number: string
  customer_name: string
  item_title: string
  selling_price: number
  material_cost: number
  labor_cost: number
  machine_cost: number
  transport_cost: number
  total_actual_cost: number
  gross_profit: number
  margin_percentage: number
  status: string
}

export interface BranchProfitabilityMetric {
  branch_id: string
  branch_name: string
  revenue: number
  cogs: number
  gross_profit: number
  gross_margin_percent: number
  operating_expenses: number
  net_profit: number
  net_margin_percent: number
  receivables: number
  payables: number
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

// ============================================================================
// EXPENSE MANAGEMENT & STAFF SALARY TYPES
// ============================================================================

export type ExpenseCategory =
  | 'staff_salary'
  | 'salary_advance'
  | 'daily_labor'
  | 'factory_rent'
  | 'electricity_utility'
  | 'machine_maintenance'
  | 'raw_materials'
  | 'transport_fuel'
  | 'tea_snacks'
  | 'office_stationery'
  | 'marketing_promo'
  | 'govt_tax_fees'
  | 'miscellaneous'
  // Legacy aliases
  | 'rent'
  | 'salary'
  | 'labor'
  | 'electricity'
  | 'internet'
  | 'transport'
  | 'fuel'
  | 'marketing'
  | 'maintenance'
  | 'materials'
  | 'office'
  | 'other'
  | string

export interface ExpenseItemRecord {
  id: string
  transaction_number: string
  transaction_date: string
  category: string
  category_label: string
  category_label_bn: string
  amount: number
  payment_account_id: string
  payment_account_name: string
  payment_account_code: string
  payment_method?: string
  employee_id?: string | null
  employee_name?: string | null
  vendor_name?: string | null
  description: string
  attachment_url?: string | null
  posted_by_name: string
  created_at: string
}

export interface ExpenseSummaryReport {
  company_id: string
  start_date: string
  end_date: string
  total_expenses: number
  total_staff_salary: number
  total_salary_advance: number
  total_daily_labor: number
  total_operational_overhead: number
  by_category: {
    category: string
    labelEn: string
    labelBn: string
    count: number
    total: number
  }[]
  by_payment_account: {
    account_id: string
    account_name: string
    account_code: string
    count: number
    total: number
  }[]
  by_employee: {
    employee_id: string
    employee_name: string
    salary_total: number
    advance_total: number
    labor_total: number
    total_paid: number
    transaction_count: number
  }[]
  items: ExpenseItemRecord[]
}

