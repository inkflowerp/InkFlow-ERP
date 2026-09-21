export type DeliveryMethod =
  | 'company_vehicle'
  | 'courier'
  | 'local_transport'
  | 'customer_pickup'

export type DeliveryStatus =
  | 'pending_dispatch'
  | 'scheduled'
  | 'assigned'
  | 'out_for_delivery'
  | 'partially_delivered'
  | 'delivered'
  | 'failed'
  | 'returned'

export type InstallationStatus =
  | 'pending'
  | 'scheduled'
  | 'on_site'
  | 'completed'
  | 'failed'
  | 'rescheduled'

export type ChallanItemStatus =
  | 'ready_for_delivery'
  | 'design_pending'
  | 'in_design'
  | 'design_check'
  | 'in_production'
  | 'printing_pending'
  | 'finishing_pending'
  | 'delivered'
  | 'cancelled'

export interface ChallanItemRecord {
  id: string
  challan_id?: string
  invoice_item_id?: string | null
  product_description: string
  dimensions_spec?: string | null
  quantity: number
  unit: string
  item_kind?: 'ready_product' | 'custom_manufacturing' | 'service' | 'outsource' | string
  workflow_routing?: 'ready_product' | 'design_required' | 'design_ok' | 'ready_production'
  status?: ChallanItemStatus
  is_delivered?: boolean
  delivered_at?: string | null
  delivered_quantity?: number
  remarks?: string | null
}

export interface DeliveryChallanRecord {
  id: string
  company_id: string
  challan_number: string
  invoice_id?: string | null
  invoice_number?: string | null
  sales_order_id?: string | null
  order_number?: string | null
  customer_id: string
  customer_name: string
  customer_phone: string
  delivery_address: string
  delivery_method: DeliveryMethod
  delivery_person_name?: string | null
  delivery_person_phone?: string | null
  vehicle_info?: string | null
  transport_cost: number
  scheduled_date: string
  status: DeliveryStatus
  delivered_at?: string | null
  receiver_name?: string | null
  receiver_phone?: string | null
  receiver_signature?: string | null
  received_by?: string | null
  received_date?: string | null
  notes?: string | null
  grand_total?: number
  paid_amount?: number
  due_amount?: number
  payment_status?: 'paid' | 'partial' | 'unpaid'
  created_by_name: string
  items: ChallanItemRecord[]
  created_at: string
  updated_at: string
}

export interface InstallationRecord {
  id: string
  company_id: string
  installation_number: string
  sales_order_id?: string | null
  order_number?: string | null
  customer_id: string
  customer_name: string
  site_location: string
  installer_lead_name: string
  crew_members: string[]
  installation_date: string
  scheduled_time?: string | null
  status: InstallationStatus
  transport_cost: number
  labor_cost: number
  equipment_used?: string | null
  site_photos: string[]
  customer_confirmed_by?: string | null
  customer_confirmed_phone?: string | null
  customer_rating_or_note?: string | null
  confirmed_at?: string | null
  failure_reason?: string | null
  notes?: string | null
  created_at: string
  updated_at: string
}
