export type PurchaseOrderStatus =
  | 'draft'
  | 'issued'
  | 'partially_received'
  | 'received'
  | 'billed'
  | 'paid'
  | 'cancelled'

export type SupplierPaymentMethod = 'cash' | 'bank' | 'cheque' | 'mfs'

export interface PurchaseOrderItemRecord {
  id: string
  purchase_order_id?: string
  material_id: string
  material_name: string
  quantity_ordered: number
  quantity_received: number
  quantity_remaining: number
  unit: string
  unit_cost: number
  total_cost: number
}

export interface GoodsReceivedNoteRecord {
  id: string
  company_id: string
  grn_number: string
  purchase_order_id: string
  supplier_name: string
  received_date: string
  challan_number?: string | null
  received_by_name: string
  notes?: string | null
  items_received?: {
    material_name: string
    quantity_received: number
    unit: string
  }[]
  created_at: string
}

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

export interface PurchaseOrderRecord {
  id: string
  company_id: string
  po_number: string
  supplier_id: string
  supplier_name: string
  supplier_phone: string
  supplier_email?: string | null
  supplier_address?: string | null
  po_date: string
  expected_delivery_date: string
  status: PurchaseOrderStatus
  subtotal: number
  vat_amount: number
  discount_amount: number
  grand_total: number
  paid_amount: number
  due_amount: number
  notes?: string | null
  created_by_name: string
  items: PurchaseOrderItemRecord[]
  grns?: GoodsReceivedNoteRecord[]
  payments?: SupplierPaymentRecord[]
  created_at: string
  updated_at: string
}
