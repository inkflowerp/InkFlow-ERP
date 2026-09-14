// ==============================================================================
// InkFlow ERP - Authoritative Sync Repository (V8)
// Multi-Tenant Outbox Queue, Idempotency & Registered Client Devices
// ==============================================================================

import { createClient } from '../supabase/server.ts'
import type {
  SyncOutboxRecord,
  ClientDeviceRecord,
  SyncStatus,
  SyncConflictRecord,
} from '../../types/sync.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

export class SyncRepository {
  // ============================================================================
  // 1. SYNC OUTBOX OPERATIONS
  // ============================================================================

  static async getOutboxItemByIdempotencyKey(
    idempotencyKey: string,
    companyId: string
  ): Promise<SyncOutboxRecord | null> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('sync_outbox')
        .select('*')
        .eq('idempotency_key', idempotencyKey)
        .eq('company_id', companyId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as SyncOutboxRecord
      }
    } catch {}

    const all = PrintERPDataStore.get<SyncOutboxRecord[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    return (
      all.find(
        (item) =>
          item.idempotency_key === idempotencyKey &&
          (!item.company_id || item.company_id === companyId)
      ) || null
    )
  }

  static async getOutboxItems(
    companyId: string,
    options?: {
      deviceId?: string
      status?: SyncStatus
      limit?: number
    }
  ): Promise<SyncOutboxRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('sync_outbox')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      if (options?.deviceId) {
        query = query.eq('device_id', options.deviceId)
      }
      if (options?.status) {
        query = query.eq('status', options.status)
      }
      if (options?.limit) {
        query = query.limit(options.limit)
      }

      const { data, error } = await query
      if (!error && data) {
        return data as unknown as SyncOutboxRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<SyncOutboxRecord[]>(STORAGE_KEYS.SYNC_OUTBOX) || []
    return all
      .filter((item) => {
        if (item.company_id && item.company_id !== companyId) return false
        if (options?.deviceId && item.device_id !== options.deviceId) return false
        if (options?.status && item.status !== options.status) return false
        return true
      })
      .slice(0, options?.limit || 100)
  }

  static async saveOutboxItem(record: SyncOutboxRecord): Promise<SyncOutboxRecord> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('sync_outbox')
        .upsert(record, { onConflict: 'idempotency_key' })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.SYNC_OUTBOX, data)
        return data as unknown as SyncOutboxRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.SYNC_OUTBOX, record)
    return record
  }

  static async updateOutboxItemStatus(
    idempotencyKey: string,
    companyId: string,
    status: SyncStatus,
    details?: {
      last_error?: string | null
      conflict_details?: SyncConflictRecord | null
      synced_at?: string | null
      retry_count_increment?: boolean
    }
  ): Promise<SyncOutboxRecord | null> {
    const existing = await this.getOutboxItemByIdempotencyKey(idempotencyKey, companyId)
    if (!existing) return null

    const retryCount = details?.retry_count_increment
      ? (existing.retry_count || 0) + 1
      : existing.retry_count || 0

    const updates: Partial<SyncOutboxRecord> = {
      status,
      retry_count: retryCount,
      last_error: details?.last_error !== undefined ? details.last_error : existing.last_error,
      conflict_details:
        details?.conflict_details !== undefined
          ? details.conflict_details
          : existing.conflict_details,
      synced_at: details?.synced_at !== undefined ? details.synced_at : existing.synced_at,
      updated_at: new Date().toISOString(),
    }

    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('sync_outbox')
        .update(updates)
        .eq('idempotency_key', idempotencyKey)
        .eq('company_id', companyId)
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.updateItem<SyncOutboxRecord>(
          STORAGE_KEYS.SYNC_OUTBOX,
          (item) => item.idempotency_key === idempotencyKey,
          data
        )
        return data as unknown as SyncOutboxRecord
      }
    } catch {}

    const updated = PrintERPDataStore.updateItem<SyncOutboxRecord>(
      STORAGE_KEYS.SYNC_OUTBOX,
      (item) => item.idempotency_key === idempotencyKey,
      updates
    )
    return updated || ({ ...existing, ...updates } as SyncOutboxRecord)
  }

  // ============================================================================
  // 2. CLIENT DEVICE REGISTRATION & ACTIVE TRACKING
  // ============================================================================

  static async registerClientDevice(device: ClientDeviceRecord): Promise<ClientDeviceRecord> {
    try {
      const supabase = await createClient()
      const { data, error } = await (supabase as any)
        .from('client_devices')
        .upsert(device, { onConflict: 'company_id,user_id,device_id' })
        .select()
        .single()

      if (!error && data) {
        PrintERPDataStore.addItem(STORAGE_KEYS.CLIENT_DEVICES, data)
        return data as unknown as ClientDeviceRecord
      }
    } catch {}

    PrintERPDataStore.addItem(STORAGE_KEYS.CLIENT_DEVICES, device)
    return device
  }

  static async getClientDevices(
    companyId: string,
    userId?: string
  ): Promise<ClientDeviceRecord[]> {
    try {
      const supabase = await createClient()
      let query = (supabase as any)
        .from('client_devices')
        .select('*')
        .eq('company_id', companyId)
        .order('last_active_at', { ascending: false })

      if (userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query
      if (!error && data) {
        return data as unknown as ClientDeviceRecord[]
      }
    } catch {}

    const all = PrintERPDataStore.get<ClientDeviceRecord[]>(STORAGE_KEYS.CLIENT_DEVICES) || []
    return all.filter((d) => {
      if (d.company_id && d.company_id !== companyId) return false
      if (userId && d.user_id !== userId) return false
      return true
    })
  }
}
