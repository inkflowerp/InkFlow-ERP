export type TrashCategory =
  | 'quotations'
  | 'invoices'
  | 'customers'
  | 'products'
  | 'materials'
  | 'suppliers'

export interface TrashRecord {
  id: string
  company_id: string
  category: TrashCategory
  original_id: string
  title: string
  subtitle?: string
  reference_number?: string
  deleted_at: string
  deleted_by_name?: string
  payload: any
}

export interface TrashSummary {
  total: number
  quotations: number
  invoices: number
  customers: number
  products: number
  materials: number
  suppliers: number
}
