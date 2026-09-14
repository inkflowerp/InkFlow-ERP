// ==============================================================================
// InkFlow ERP - Phase 24: V8 Sync Engine & Outbox Types
// Multi-Tenant, Idempotent, Server-Authoritative Synchronization
// ==============================================================================

export type SyncStatus =
  | 'pending'
  | 'syncing'
  | 'synced'
  | 'conflict'
  | 'failed'
  | 'cancelled'

export type SyncActionType =
  | 'quotation.draft'
  | 'quotation.create'
  | 'order.draft'
  | 'order.status_update'
  | 'task.start'
  | 'task.pause'
  | 'task.resume'
  | 'task.hold'
  | 'task.complete'
  | 'task.rework'
  | 'production.material_issue'
  | 'production.note'
  | 'delivery.status_update'
  | 'delivery.proof_capture'
  | 'attendance.punch'
  | 'customer.note_add'
  | 'customer.draft'
  | 'expense.draft'
  | 'purchase_request.draft'
  | 'communication.send_draft'

export interface SyncConflictRecord {
  reason: string
  entity_type: string
  entity_id?: string | null
  client_payload: Record<string, any>
  server_state?: Record<string, any>
  resolution_strategy: 'server_authoritative' | 'field_merge' | 'manual_review'
  message: string
  occurred_at: string
}

export interface SyncOutboxRecord {
  id: string
  company_id: string
  branch_id?: string | null
  user_id?: string | null
  idempotency_key: string
  device_id: string
  action_type: SyncActionType | string
  entity_type: string
  entity_id?: string | null
  payload: Record<string, any>
  status: SyncStatus
  retry_count: number
  max_retries: number
  last_error?: string | null
  conflict_details?: SyncConflictRecord | null
  server_version?: number
  synced_at?: string | null
  created_at: string
  updated_at: string
}

export interface SyncBatchItemPayload {
  idempotency_key: string
  device_id: string
  action_type: SyncActionType | string
  entity_type: string
  entity_id?: string | null
  payload: Record<string, any>
  branch_id?: string | null
}

export interface SyncItemProcessResult {
  idempotency_key: string
  status: SyncStatus
  entity_id?: string | null
  action_type: string
  error?: string | null
  conflict_details?: SyncConflictRecord | null
  synced_at?: string | null
}

export interface SyncBatchResult {
  success: boolean
  total_processed: number
  synced_count: number
  conflict_count: number
  failed_count: number
  results: SyncItemProcessResult[]
}

export interface ClientDeviceRecord {
  id: string
  company_id: string
  user_id: string
  device_id: string
  device_name?: string | null
  platform: 'android' | 'ios' | 'pwa' | 'desktop_web' | string
  app_version?: string | null
  push_subscription?: Record<string, any> | null
  last_ip_address?: string | null
  last_active_at: string
  is_active: boolean
  created_at: string
}
