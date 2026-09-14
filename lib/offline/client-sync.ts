// ==============================================================================
// InkFlow ERP - Client Offline Sync & Idempotency Manager (V8)
// Client Device Registration, Outbox Enqueueing & Server Reconciliation
// ==============================================================================

import type {
  SyncBatchItemPayload,
  SyncActionType,
  SyncBatchResult,
} from '../../types/sync.types.ts'

const DEVICE_ID_KEY = 'inkflow_device_id'
const CLIENT_OUTBOX_KEY = 'inkflow_client_outbox'

export class ClientSyncManager {
  /**
   * Retrieves or provisions a persistent unique client device identifier
   */
  static getDeviceId(): string {
    if (typeof window === 'undefined') return 'server_runtime_device'

    let deviceId = localStorage.getItem(DEVICE_ID_KEY)
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      localStorage.setItem(DEVICE_ID_KEY, deviceId)
    }
    return deviceId
  }

  /**
   * Generates a collision-resistant idempotency key: device_id + uuid
   */
  static generateIdempotencyKey(): string {
    const devId = this.getDeviceId()
    const uuid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    return `${devId}_${uuid}`
  }

  /**
   * Enqueues an operation into the local browser outbox queue
   */
  static queueOperation(
    companyId: string,
    actionType: SyncActionType | string,
    entityType: string,
    payload: Record<string, any>,
    entityId?: string | null,
    branchId?: string | null
  ): SyncBatchItemPayload {
    const idempotencyKey = this.generateIdempotencyKey()
    const item: SyncBatchItemPayload = {
      idempotency_key: idempotencyKey,
      device_id: this.getDeviceId(),
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId || null,
      payload,
      branch_id: branchId || null,
    }

    if (typeof window !== 'undefined') {
      const existing = this.getLocalOutbox(companyId)
      existing.push(item)
      localStorage.setItem(`${CLIENT_OUTBOX_KEY}_${companyId}`, JSON.stringify(existing))

      // Emit sync event for UI
      window.dispatchEvent(
        new CustomEvent('inkflow_sync_queue_changed', {
          detail: { companyId, pendingCount: existing.length },
        })
      )
    }

    return item
  }

  /**
   * Retrieves all pending operations in local browser outbox
   */
  static getLocalOutbox(companyId: string): SyncBatchItemPayload[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(`${CLIENT_OUTBOX_KEY}_${companyId}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  /**
   * Clears or updates processed items from local browser outbox
   */
  static removeProcessedItems(companyId: string, idempotencyKeys: string[]): void {
    if (typeof window === 'undefined') return
    const keysSet = new Set(idempotencyKeys)
    const current = this.getLocalOutbox(companyId)
    const remaining = current.filter((item) => !keysSet.has(item.idempotency_key))
    localStorage.setItem(`${CLIENT_OUTBOX_KEY}_${companyId}`, JSON.stringify(remaining))

    window.dispatchEvent(
      new CustomEvent('inkflow_sync_queue_changed', {
        detail: { companyId, pendingCount: remaining.length },
      })
    )
  }
}
