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
  id?: string
  invoice_id?: string
  product_id?: string | null
  item_kind?: 'service' | 'ready_product' | 'material' | 'custom'
  product_type?: string | null
  item_name?: string | null
  item_description?: string | null
  dimensions_spec?: string | null
  width?: number
  height?: number
  dimension_unit?: 'ft' | 'inch' | 'm' | string
  area_sft?: number
  quantity: number
  unit: string
  unit_price: number
  vat_percentage?: number
  total_price: number
  tier_applied?: string | null
  moq?: number | null
  unit_cost?: number
  finishing?: string | null
  selected_finishing?: Array<{ id: string; name: string; rate?: number; cost?: number }> | null
  selected_add_ons?: Array<{ id: string; name: string; rate?: number; cost?: number }> | null
  design_required?: boolean
  customer_approval_required?: boolean
  workflow_routing?: 'ready_product' | 'design_required' | 'design_ok' | 'ready_production' | string | null
  design_job_id?: string | null
}

export type FinancialPersistenceMode = 'production' | 'training' | 'test'

export interface PaymentAllocationRecord {
  id: string
  payment_id: string
  invoice_id: string
  invoice_number?: string
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
  actor_user_id?: string | null
  created_at: string
}

export interface PaymentRecord {
  id: string
  company_id: string
  branch_id?: string | null
  receipt_number: string
  customer_id?: string | null
  customer_name: string
  payment_date: string
  payment_type: PaymentType
  payment_method: PaymentMethod
  amount: number
  unallocated_amount?: number
  bank_name?: string | null
  cheque_number?: string | null
  cheque_date?: string | null
  mfs_transaction_id?: string | null
  notes?: string | null
  received_by_name: string
  idempotency_key?: string | null
  actor_user_id?: string | null
  allocations?: PaymentAllocationRecord[]
  created_at: string
}

export interface InvoiceRecord {
  id: string
  company_id: string
  branch_id?: string | null
  invoice_number: string
  invoice_type: InvoiceType
  customer_id?: string | null
  customer_name: string
  customer_phone: string
  customer_email?: string | null
  customer_bin?: string | null
  customer_tin?: string | null
  customer_address?: string | null
  quotation_id?: string | null
  quotation_number?: string | null
  sales_order_id?: string | null
  order_number?: string | null
  job_order_id?: string | null
  job_number?: string | null
  salesperson_id?: string | null
  salesperson_name?: string | null
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
  idempotency_key?: string | null
  items: InvoiceItemRecord[]
  payments?: PaymentAllocationRecord[]
  write_offs?: FinancialWriteOffRecord[]
  created_at: string
  updated_at: string
}

export type BillingPeriod = 'today' | 'this_week' | 'this_month' | 'all_time' | 'custom'

export interface BillingOverviewMetrics {
  period: BillingPeriod
  periodLabel: string
  startDate?: string
  endDate?: string
  salesAmount: number
  salesCount: number
  collectionAmount: number
  collectionCount: number
  outstandingDue: number
  outstandingDueCount: number
  dueTodayAmount: number
  dueTodayCount: number
  overdueAmount: number
  overdueCount: number
  totalReceivables: number
  collectionRate: number
}

export type CollectionPriorityType = 'due_today' | 'overdue' | 'high_value' | 'near_credit_limit'

export interface CollectionPriorityItem {
  id: string
  invoiceId: string
  invoiceNumber: string
  customerId: string
  customerName: string
  customerPhone: string
  customerCompany?: string | null
  invoiceDate: string
  dueDate: string
  grandTotal: number
  paidAmount: number
  dueAmount: number
  daysOverdue: number
  salespersonName?: string | null
  status: InvoiceStatus
  priorityReason: CollectionPriorityType
  creditLimit?: number
  currentOutstanding?: number
  lastPaymentDate?: string | null
}

export interface ReceivablesAgingBucket {
  bucket: 'current' | '1_7' | '8_30' | '31_60' | '61_90' | '90_plus'
  label: string
  labelBn: string
  amount: number
  invoiceCount: number
  customerCount: number
}

export interface CustomerReceivablesAging {
  customerId: string
  customerName: string
  customerPhone: string
  companyName?: string | null
  creditLimit: number
  currentOutstanding: number
  totalOverdue: number
  current: number
  days1_7: number
  days8_30: number
  days31_60: number
  days61_90: number
  days90Plus: number
  oldestDueDays: number
  invoiceCount: number
}

export interface ReceivablesAgingSummary {
  buckets: ReceivablesAgingBucket[]
  customerAging: CustomerReceivablesAging[]
  totalReceivables: number
  totalOverdue: number
}

export interface SalespersonCollectionStat {
  salespersonId?: string | null
  salespersonName: string
  totalBilled: number
  totalCollected: number
  outstandingDue: number
  overdueAmount: number
  customerCount: number
  oldestDueDays: number
}

export interface PaymentMethodSummaryItem {
  method: PaymentMethod
  label: string
  labelBn: string
  icon: string
  totalAmount: number
  transactionCount: number
}

export interface MultiInvoiceAllocationItem {
  invoiceId: string
  amount: number
}

export interface MultiInvoicePaymentInput {
  companyId?: string
  branchId?: string
  customerId?: string | null
  customerName: string
  amount: number
  paymentMethod: PaymentMethod
  paymentDate?: string
  bankName?: string | null
  chequeNumber?: string | null
  chequeDate?: string | null
  mfsTransactionId?: string | null
  notes?: string | null
  receivedByName?: string
  idempotencyKey?: string
  actorUserId?: string
  allocations?: MultiInvoiceAllocationItem[]
}

export interface CreditLimitWarningInfo {
  customerId: string
  customerName: string
  creditLimit: number
  currentOutstanding: number
  newInvoiceAmount: number
  projectedOutstanding: number
  exceededBy: number
  isExceeded: boolean
  warningMessage: string
}

export interface CustomerBalanceReconciliationItem {
  customerId: string
  customerName: string
  storedDueBalance: number
  calculatedDueBalance: number
  difference: number
  totalInvoiced: number
  totalAllocatedPaid: number
  totalWriteOffs: number
  isBalanced: boolean
}

export interface CustomerReconciliationReport {
  companyId: string
  generatedAt: string
  totalCustomers: number
  balancedCustomers: number
  mismatchedCustomers: number
  totalStoredDue: number
  totalCalculatedDue: number
  reconciled: boolean
  items: CustomerBalanceReconciliationItem[]
}
