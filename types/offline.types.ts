// ==============================================================================
// PrintERP SaaS - Phase 23: Offline-Friendly Architecture Types
// ==============================================================================

export type OfflineSyncStatus = 'queued' | 'syncing' | 'synced' | 'failed' | 'conflict'

export type OfflineActionType =
  | 'quotation.create'
  | 'order.create'
  | 'payment.record'
  | 'production.start'
  | 'production.complete'
  | 'inventory.adjust'
  | 'customer.create'
  | 'attendance.punch'

export interface OfflineSyncItem {
  id: string
  companyId: string
  actionType: OfflineActionType
  title: string
  endpoint: string
  payload: Record<string, any>
  timestamp: string
  status: OfflineSyncStatus
  retryCount: number
  maxRetries: number
  error?: string | null
  entityVersion?: number
}

export type OfflineFormType = 'quotation' | 'order' | 'payment' | 'customer' | 'job'

export interface OfflineDraft {
  id: string
  companyId: string
  formType: OfflineFormType
  title: string
  data: Record<string, any>
  updatedAt: string
}

export interface NetworkStatusState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  lastSyncTime?: string | null
}
