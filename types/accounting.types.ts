export type ExpenseCategory =
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

export interface ExpenseRecord {
  id: string
  company_id: string
  expense_number: string
  expense_date: string
  category: ExpenseCategory
  amount: number
  payment_method: 'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'
  vendor_name?: string | null
  description: string
  attachment_url?: string | null
  branch_name: string
  bank_account_id?: string | null
  recorded_by_name: string
  created_at: string
}

export interface BankAccountRecord {
  id: string
  company_id: string
  bank_name: string
  account_name: string
  account_number: string
  branch_name?: string | null
  routing_number?: string | null
  opening_balance: number
  current_balance: number
  is_active: boolean
  created_at: string
}

export interface CashBookEntryRecord {
  id: string
  company_id: string
  entry_date: string
  entry_type: 'cash_in' | 'cash_out'
  amount: number
  category: string
  description: string
  reference_id?: string | null
  performed_by_name: string
  created_at: string
}

export interface ProfitWaterfallData {
  gross_sales: number
  material_cost: number
  labor_cost: number
  delivery_cost: number
  installation_cost: number
  operating_expenses: number
  estimated_profit: number
  margin_percentage: number
}
