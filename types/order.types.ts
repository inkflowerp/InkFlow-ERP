export type OrderPriority = 'normal' | 'urgent' | 'very_urgent'

export type PaymentTerm = 'cash' | 'advance' | 'partial' | 'credit'

export type OrderStatus =
  | 'draft'
  | 'pending'
  | 'confirmed'
  | 'in_production'
  | 'finishing'
  | 'ready_for_delivery'
  | 'partially_delivered'
  | 'delivered'
  | 'installed'
  | 'completed'
  | 'cancelled'

export type JobDepartment =
  | 'design'
  | 'wide_format_print'
  | 'digital_offset'
  | 'laser_cnc'
  | 'fabrication'
  | 'finishing'
  | 'installation'

export type JobStatus =
  | 'queued'
  | 'in_progress'
  | 'paused'
  | 'quality_check'
  | 'completed'

export interface SalesOrderItemRecord {
  id: string
  order_id?: string
  product_id?: string | null
  item_name: string
  material_spec?: string | null
  width: number
  height: number
  dimension_unit: 'ft' | 'inch' | 'm'
  quantity: number
  unit: string
  unit_price: number
  total_price: number
}

export interface JobOrderRecord {
  id: string
  company_id: string
  job_number: string
  order_id: string
  order_item_id?: string | null
  product_name: string
  customer_name: string
  quantity: number
  size_spec: string
  material_spec: string
  artwork_url?: string | null
  artwork_status: 'pending' | 'approved' | 'revised'
  deadline: string
  assigned_department: JobDepartment
  assigned_employee_name?: string | null
  production_instructions?: string | null
  status: JobStatus
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface OrderTimelineEventRecord {
  id: string
  order_id: string
  stage:
    | 'quotation'
    | 'approval'
    | 'sales_order'
    | 'job_order'
    | 'production'
    | 'finishing'
    | 'delivery'
    | 'installation'
    | 'completion'
  title: string
  description?: string | null
  actor_name: string
  created_at: string
}

export interface SalesOrderRecord {
  id: string
  company_id: string
  order_number: string
  quotation_id?: string | null
  customer_id?: string | null
  customer_name: string
  customer_name_bn?: string | null
  customer_phone: string
  customer_address?: string | null
  salesperson_name: string
  order_date: string
  delivery_date: string
  priority: OrderPriority
  status: OrderStatus
  payment_terms: PaymentTerm
  subtotal: number
  discount_amount: number
  vat_amount: number
  final_price: number
  advance_amount: number
  due_amount: number
  notes?: string | null
  items: SalesOrderItemRecord[]
  jobs?: JobOrderRecord[]
  jobs_count?: number
  created_at: string
  updated_at: string
}
