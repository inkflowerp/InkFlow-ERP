export type PurchaseRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export type PurchaseOrderStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'issued'
  | 'partially_received'
  | 'received'
  | 'billed'
  | 'paid'
  | 'cancelled'

export type GoodsReceivedNoteStatus =
  | 'draft'
  | 'received'
  | 'inspected'
  | 'quarantined'
  | 'posted'
  | 'cancelled'

export type SupplierReturnStatus =
  | 'draft'
  | 'approved'
  | 'completed'
  | 'cancelled'

export type SupplierPaymentMethod = 'cash' | 'bank' | 'cheque' | 'mfs'

export type SupplierLedgerEntryType =
  | 'PURCHASE_ORDER'
  | 'GOODS_RECEIPT'
  | 'PAYMENT'
  | 'RETURN'
  | 'ADJUSTMENT'

// ==========================================
// 1. SUPPLIER ITEMS CATALOG
// ==========================================
export interface SupplierItemRecord {
  id: string
  company_id: string
  branch_id?: string | null
  supplier_id: string
  material_id: string
  supplier_sku?: string | null
  supplier_item_name?: string | null
  purchase_unit: string
  conversion_factor: number
  unit_price: number
  currency: string
  moq?: number
  lead_time_days?: number
  is_preferred: boolean
  is_active: boolean
  effective_date: string
  notes?: string | null
  created_at: string
  updated_at: string
  material?: {
    id: string
    sku: string
    name: string
    unit: string
    current_stock: number
  }
}

// ==========================================
// 2. PURCHASE REQUESTS
// ==========================================
export interface PurchaseRequestItemRecord {
  id: string
  purchase_request_id?: string
  material_id?: string | null
  material_name: string
  quantity: number
  unit: string
  required_date?: string | null
  estimated_unit_price?: number
  estimated_amount?: number
  preferred_supplier_id?: string | null
  notes?: string | null
  created_at?: string
}

export interface PurchaseRequestRecord {
  id: string
  company_id: string
  branch_id?: string | null
  pr_number: string
  department?: string
  requested_by_id?: string | null
  requested_by_name: string
  request_date: string
  required_date: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  supplier_id?: string | null
  supplier_name?: string | null
  reason?: string | null
  notes?: string | null
  status: PurchaseRequestStatus
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  items: PurchaseRequestItemRecord[]
  created_at: string
  updated_at: string
}

// ==========================================
// 3. PURCHASE ORDERS
// ==========================================
export interface PurchaseOrderItemRecord {
  id: string
  purchase_order_id?: string
  material_id: string
  material_name: string
  supplier_sku?: string | null
  quantity_ordered: number
  quantity_received: number
  quantity_remaining: number
  unit: string
  unit_cost: number
  discount_percent?: number
  tax_percent?: number
  total_cost: number
  expected_date?: string | null
  notes?: string | null
}

export interface PurchaseOrderRecord {
  id: string
  company_id: string
  branch_id?: string | null
  po_number: string
  purchase_request_id?: string | null
  supplier_id: string
  supplier_name: string
  supplier_phone: string
  supplier_email?: string | null
  supplier_address?: string | null
  supplier_reference?: string | null
  po_date: string
  expected_delivery_date: string
  currency?: string
  payment_terms?: string
  status: PurchaseOrderStatus
  subtotal: number
  vat_amount: number
  discount_amount: number
  shipping_cost?: number
  other_charges?: number
  grand_total: number
  paid_amount: number
  due_amount: number
  notes?: string | null
  terms_and_conditions?: string | null
  created_by_name: string
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  sent_at?: string | null
  cancelled_at?: string | null
  cancellation_reason?: string | null
  items: PurchaseOrderItemRecord[]
  grns?: GoodsReceivedNoteRecord[]
  payments?: SupplierPaymentRecord[]
  created_at: string
  updated_at: string
}

// ==========================================
// 4. GOODS RECEIVED NOTES (GRN)
// ==========================================
export interface GoodsReceivedNoteItemRecord {
  id: string
  grn_id?: string
  po_item_id?: string | null
  material_id: string
  material_name: string
  quantity_ordered: number
  previously_received: number
  current_received: number
  accepted_quantity: number
  rejected_quantity: number
  damaged_quantity: number
  unit: string
  unit_cost: number
  total_cost: number
  batch_lot_number?: string | null
  roll_id?: string | null
  expiry_date?: string | null
  rejection_reason?: string | null
  notes?: string | null
  created_at?: string
}

export interface GoodsReceivedNoteRecord {
  id: string
  company_id: string
  branch_id?: string | null
  grn_number: string
  purchase_order_id: string
  supplier_id?: string | null
  supplier_name: string
  receiving_location_id?: string | null
  received_date: string
  challan_number?: string | null
  supplier_delivery_note?: string | null
  supplier_invoice_number?: string | null
  received_by_name: string
  status?: GoodsReceivedNoteStatus
  accepted_total?: number
  rejected_total?: number
  damaged_total?: number
  posted_at?: string | null
  posted_by_id?: string | null
  posted_by_name?: string | null
  notes?: string | null
  items_received?:
    | GoodsReceivedNoteItemRecord[]
    | Array<{
        material_name: string
        quantity_received?: number
        accepted_quantity?: number
        unit: string
      }>
  created_at: string
}

// ==========================================
// 5. SUPPLIER RETURNS
// ==========================================
export interface SupplierReturnItemRecord {
  id: string
  return_id?: string
  grn_item_id?: string | null
  material_id: string
  material_name: string
  return_quantity: number
  unit: string
  unit_cost: number
  total_amount: number
  reason?: string | null
  location_id?: string | null
  created_at?: string
}

export interface SupplierReturnRecord {
  id: string
  company_id: string
  branch_id?: string | null
  return_number: string
  grn_id?: string | null
  purchase_order_id?: string | null
  supplier_id: string
  supplier_name: string
  return_date: string
  status: SupplierReturnStatus
  reason: string
  total_return_amount: number
  approved_by_id?: string | null
  approved_by_name?: string | null
  approved_at?: string | null
  notes?: string | null
  created_by_name: string
  items: SupplierReturnItemRecord[]
  created_at: string
  updated_at: string
}

// ==========================================
// 6. SUPPLIER PRICE HISTORY & BENCHMARKS
// ==========================================
export interface SupplierPriceHistoryRecord {
  id: string
  company_id: string
  material_id: string
  material_name: string
  supplier_id: string
  supplier_name: string
  purchase_price: number
  previous_price?: number | null
  quantity: number
  po_id?: string | null
  po_date: string
  created_at: string
}

export interface SupplierPriceBenchmark {
  material_id: string
  material_name: string
  last_price: number
  average_price: number
  lowest_price: number
  highest_price: number
  history: SupplierPriceHistoryRecord[]
}

// ==========================================
// 7. SUPPLIER PAYMENTS & LEDGER
// ==========================================
export interface SupplierPaymentRecord {
  id: string
  company_id: string
  purchase_order_id?: string | null
  supplier_id: string
  supplier_name: string
  payment_method: SupplierPaymentMethod
  amount: number
  payment_date: string
  cheque_number?: string | null
  bank_name?: string | null
  mfs_transaction_id?: string | null
  notes?: string | null
  recorded_by_name: string
  created_at: string
}

export interface SupplierLedgerEntryRecord {
  id: string
  company_id: string
  branch_id?: string | null
  supplier_id: string
  entry_type: SupplierLedgerEntryType
  reference_type?: string | null
  reference_id?: string | null
  debit: number
  credit: number
  running_balance: number
  notes?: string | null
  created_at: string
}
