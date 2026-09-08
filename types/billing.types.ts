export type InvoiceType = 'sales_invoice' | 'vat_invoice' | 'payment_receipt'

export type InvoiceStatus =
  | 'unpaid'
  | 'partially_paid'
  | 'paid'
  | 'overdue'
  | 'written_off'
  | 'cancelled'

export type PaymentType =
  | 'full_payment'
  | 'partial_payment'
  | 'advance_payment'
  | 'due_payment'

export type PaymentMethod =
  | 'cash'
  | 'bank'
  | 'cheque'
  | 'bkash'
  | 'nagad'
  | 'other_mfs'

export interface InvoiceItemRecord {
  id: string
  invoice_id?: string
  item_description: string
  dimensions_spec?: string | null
  quantity: number
  unit: string
  unit_price: number
  vat_percentage: number
  total_price: number
}

export interface PaymentAllocationRecord {
  id: string
  payment_id: string
  invoice_id: string
  invoice_number: string
  allocated_amount: number
  created_at: string
}

export interface FinancialWriteOffRecord {
  id: string
  company_id: string
  invoice_id: string
  amount: number
  reason: string
  authorized_by_name: string
  created_at: string
}

export interface PaymentRecord {
  id: string
  company_id: string
  receipt_number: string
  customer_id: string
  customer_name: string
  payment_date: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  amount: number
  bank_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  mfs_transaction_id?: string | null
  notes?: string | null
  received_by_name: string
  allocations?: PaymentAllocationRecord[]
  created_at: string
}

export interface InvoiceRecord {
  id: string
  company_id: string
  invoice_number: string
  invoice_type: InvoiceType
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_bin?: string | null
  customer_tin?: string | null
  customer_address?: string | null
  sales_order_id?: string | null
  order_number?: string | null
  invoice_date: string
  due_date: string
  status: InvoiceStatus
  subtotal: number
  discount_amount: number
  vat_percentage: number
  vat_amount: number
  grand_total: number
  paid_amount: number
  due_amount: number
  write_off_amount: number
  notes?: string | null
  terms_and_conditions?: string | null
  created_by_name: string
  items: InvoiceItemRecord[]
  payments?: PaymentAllocationRecord[]
  write_offs?: FinancialWriteOffRecord[]
  created_at: string
  updated_at: string
}
