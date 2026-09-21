export type DesignStatus =
  | 'received'
  | 'designing'
  | 'in_progress'
  | 'customer_approval'
  | 'revision'
  | 'approved'
  | 'rejected'

export type DesignFormat = 'jpg' | 'png' | 'pdf' | 'svg' | 'ai' | 'psd' | 'cdr' | 'zip'

export type DesignPriority = 'normal' | 'urgent' | 'very_urgent'

export interface DesignVersionRecord {
  id: string
  company_id?: string
  design_job_id: string
  version_number: number
  version_label?: string
  proof_file_url?: string // Web previewable for jpg, png, pdf, svg
  proof_file_name?: string
  preview_url?: string | null
  file_name?: string
  file_url?: string
  file_type?: string | null
  source_file_url?: string | null // Raw AI, PSD, CDR, ZIP download link
  source_file_name?: string | null
  file_format?: DesignFormat
  file_size_bytes?: number | null
  change_notes?: string | null
  notes?: string | null
  customer_feedback?: string | null
  uploaded_by_name?: string
  created_by_name?: string
  approval_status?: 'pending_review' | 'approved' | 'rejected' | 'changes_requested' | 'revision_requested'
  is_approved?: boolean
  created_at: string
}

export interface DesignFeedbackRecord {
  id: string
  design_job_id: string
  version_number: number
  sender_type: 'customer' | 'designer' | 'sales'
  sender_name: string
  message: string
  created_at: string
}

export interface DesignJobRecord {
  id: string
  company_id: string
  design_number: string
  job_order_id?: string | null
  sales_order_id?: string | null
  order_id?: string | null
  order_number?: string | null
  customer_id?: string | null
  customer_name: string
  title: string
  designer_id?: string | null
  designer_name: string
  priority?: DesignPriority
  status: DesignStatus
  deadline: string
  instructions?: string | null
  dimensions_spec?: string | null
  current_version?: number
  revision_count?: number
  version_count?: number
  customer_feedback?: string | null
  approved_version?: number | null
  approved_by?: string | null
  approval_timestamp?: string | null
  approval_note?: string | null
  is_locked?: boolean // Prevents accidental replacement once approved
  workflow_routing?: 'design_required' | 'design_ok' | 'ready_production' | 'custom'
  commercial_status?: 'invoice_required' | 'invoice_requested' | 'invoice_created' | 'unpaid' | 'partially_paid' | 'paid'
  invoice_id?: string | null
  invoice_number?: string | null
  invoice_request_id?: string | null
  intake_source?: 'direct_customer' | 'manager_billing'
  customer_approval_required?: boolean
  invoice_item_id?: string | null
  product_name?: string | null
  material?: string | null
  finishing?: string | null
  quantity?: number | null
  unit?: string | null
  items_summary?: string | null
  work_order_id?: string | null
  is_invoice_created?: boolean
  selected_finishing?: Array<{ id?: string; name: string; rate?: number; cost?: number }> | null
  selected_add_ons?: Array<{ id?: string; name: string; rate?: number; cost?: number }> | null
  customer_phone?: string | null
  customer_address?: string | null
  customer_company_name?: string | null
  unit_price?: number | null
  total_price?: number | null
  area_sft?: number | null
  item_kind?: string | null
  all_invoice_items?: any[]
  versions: DesignVersionRecord[]
  feedback_logs?: DesignFeedbackRecord[]
  created_at: string
  updated_at: string
}

