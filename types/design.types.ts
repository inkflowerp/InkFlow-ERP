export type DesignStatus =
  | 'received'
  | 'designing'
  | 'customer_approval'
  | 'revision'
  | 'approved'
  | 'rejected'

export type DesignFormat = 'jpg' | 'png' | 'pdf' | 'svg' | 'ai' | 'psd' | 'cdr' | 'zip'

export type DesignPriority = 'normal' | 'urgent' | 'very_urgent'

export interface DesignVersionRecord {
  id: string
  design_job_id: string
  version_number: number
  version_label: string
  proof_file_url: string // Web previewable for jpg, png, pdf, svg
  proof_file_name: string
  source_file_url?: string | null // Raw AI, PSD, CDR, ZIP download link
  source_file_name?: string | null
  file_format: DesignFormat
  file_size_bytes?: number
  change_notes?: string | null
  uploaded_by_name: string
  is_approved: boolean
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
  customer_id?: string | null
  customer_name: string
  title: string
  designer_id?: string | null
  designer_name: string
  priority: DesignPriority
  status: DesignStatus
  deadline: string
  instructions?: string | null
  dimensions_spec?: string | null
  current_version: number
  revision_count: number
  customer_feedback?: string | null
  approved_version?: number | null
  approved_by?: string | null
  approval_timestamp?: string | null
  approval_note?: string | null
  is_locked: boolean // Prevents accidental replacement once approved
  versions: DesignVersionRecord[]
  feedback_logs?: DesignFeedbackRecord[]
  created_at: string
  updated_at: string
}
