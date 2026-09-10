// ==============================================================================
// PrintERP SaaS - Production Realtime Subscription Manager
// Authoritative Supabase Realtime synchronization with strict tenant isolation,
// Postgres changes reconciliation, reference counting, and auto-reconnect backoff.
// ==============================================================================

import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '../supabase/client.ts'
import { PrintERPDataStore, STORAGE_KEYS, type StorageKey } from '../db/data-store.ts'

export type RealtimeTopic =
  | 'orders'
  | 'jobs'
  | 'notifications'
  | 'inventory'
  | 'billing'
  | 'production'
  | 'delivery'
  | 'subscriptions'
  | 'live-sync'

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface PostgresChangeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  new: T
  old: T
}

// Table to StorageKey mapping for automatic reconciliation
export const TABLE_STORAGE_KEY_MAP: Record<string, StorageKey> = {
  customers: STORAGE_KEYS.CUSTOMERS,
  sales_orders: STORAGE_KEYS.ORDERS,
  job_orders: STORAGE_KEYS.JOB_ORDERS,
  invoices: STORAGE_KEYS.INVOICES,
  payments: STORAGE_KEYS.PAYMENTS,
  production_jobs: STORAGE_KEYS.PRODUCTION_JOBS,
  delivery_challans: STORAGE_KEYS.DELIVERY_CHALLANS,
  in_app_notifications: STORAGE_KEYS.IN_APP_NOTIFICATIONS,
  company_subscriptions: STORAGE_KEYS.COMPANY_SUBSCRIPTIONS,
}

class RealtimeSubscriptionManager {
  private activeChannels = new Map<string, { channel: RealtimeChannel; refCount: number; status: RealtimeConnectionStatus }>()
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>()
  private currentStatus: RealtimeConnectionStatus = 'disconnected'

  /**
   * Returns current global realtime connection status
   */
  getConnectionStatus(): RealtimeConnectionStatus {
    return this.currentStatus
  }

  /**
   * Subscribe to global connection status changes
   */
  onConnectionStatusChange(listener: (status: RealtimeConnectionStatus) => void): () => void {
    this.statusListeners.add(listener)
    listener(this.currentStatus)
    return () => {
      this.statusListeners.delete(listener)
    }
  }

  private setStatus(status: RealtimeConnectionStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status
      this.statusListeners.forEach((fn) => fn(status))
    }
  }

  /**
   * Subscribe to a tenant-scoped channel topic with automatic deduplication.
   */
  subscribe<T>(
    companyId: string,
    topic: RealtimeTopic,
    event: string,
    callback: (payload: T) => void
  ): () => void {
    if (!companyId) {
      console.warn('[RealtimeManager] Cannot subscribe without companyId. Skipping.')
      return () => {}
    }

    const channelName = `company:${companyId}:${topic}`
    let channelRef = this.activeChannels.get(channelName)

    if (!channelRef) {
      const supabase = createClient()
      this.setStatus('connecting')

      const channel = supabase
        .channel(channelName)
        .on('broadcast' as never, { event } as never, (response: { payload: T }) => {
          callback(response.payload)
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('connected')
            if (channelRef) channelRef.status = 'connected'
            console.log(`[RealtimeManager] Connected to ${channelName}`)
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            this.setStatus('reconnecting')
            if (channelRef) channelRef.status = 'error'
          } else if (status === 'CLOSED') {
            this.setStatus('disconnected')
            if (channelRef) channelRef.status = 'disconnected'
          }
        })

      channelRef = { channel, refCount: 1, status: 'connecting' }
      this.activeChannels.set(channelName, channelRef)
    } else {
      channelRef.refCount += 1
    }

    return () => {
      this.unsubscribe(channelName)
    }
  }

  /**
   * Subscribes to PostgreSQL database changes with strict tenant isolation (`company_id=eq.${companyId}`)
   */
  subscribeToPostgresChanges(
    companyId: string,
    table: string,
    callback: (payload: PostgresChangeEvent) => void
  ): () => void {
    if (!companyId) return () => {}

    const channelName = `company:${companyId}:db-${table}`
    let channelRef = this.activeChannels.get(channelName)

    if (!channelRef) {
      const supabase = createClient()
      this.setStatus('connecting')

      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `company_id=eq.${companyId}`,
          },
          (payload: any) => {
            callback({
              eventType: payload.eventType,
              schema: payload.schema,
              table: payload.table,
              new: payload.new,
              old: payload.old,
            })
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.setStatus('connected')
            if (channelRef) channelRef.status = 'connected'
          } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            this.setStatus('reconnecting')
            if (channelRef) channelRef.status = 'error'
          }
        })

      channelRef = { channel, refCount: 1, status: 'connecting' }
      this.activeChannels.set(channelName, channelRef)
    } else {
      channelRef.refCount += 1
    }

    return () => {
      this.unsubscribe(channelName)
    }
  }

  /**
   * Reconciles a PostgreSQL record into PrintERPDataStore with timestamp/id check
   */
  reconcileRecord(
    storageKey: StorageKey,
    eventType: 'INSERT' | 'UPDATE' | 'DELETE',
    newRecord: any,
    oldRecord?: any
  ) {
    if (!storageKey) return

    try {
      if (eventType === 'DELETE') {
        const idToRemove = oldRecord?.id || newRecord?.id
        if (idToRemove) {
          PrintERPDataStore.removeItem(storageKey, idToRemove)
        }
      } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
        if (!newRecord || !newRecord.id) return
        const existing = PrintERPDataStore.findItem<any>(storageKey, newRecord.id)

        if (!existing) {
          PrintERPDataStore.addItem(storageKey, newRecord)
        } else {
          // Compare timestamps/versions if available to prevent stale overwrite
          const existingUpdated = (existing as any)?.updated_at ? new Date((existing as any).updated_at).getTime() : 0
          const incomingUpdated = newRecord?.updated_at ? new Date(newRecord.updated_at).getTime() : Date.now()

          if (incomingUpdated >= existingUpdated) {
            PrintERPDataStore.updateItem(storageKey, newRecord.id, newRecord)
          }
        }
      }
    } catch (err) {
      console.error(`[RealtimeManager] Reconciliation error on ${storageKey}:`, err)
    }
  }

  /**
   * Full tenant synchronization: listens to all core tenant operational tables and broadcasts
   */
  subscribeToTenantSync(
    companyId: string,
    onSyncEvent?: (event: { topic: string; eventType: string; record: any }) => void
  ): () => void {
    if (!companyId) return () => {}

    const unsubs: Array<() => void> = []

    // 1. Listen to broadcast sync events
    const unsubBroadcast = this.subscribe(
      companyId,
      'live-sync',
      'tenant_sync_event',
      (payload: any) => {
        if (payload?.table && TABLE_STORAGE_KEY_MAP[payload.table]) {
          this.reconcileRecord(
            TABLE_STORAGE_KEY_MAP[payload.table],
            payload.eventType || 'UPDATE',
            payload.record,
            payload.oldRecord
          )
        }
        if (onSyncEvent) {
          onSyncEvent({
            topic: payload?.topic || 'general',
            eventType: payload?.eventType || 'SYNC',
            record: payload?.record,
          })
        }
      }
    )
    unsubs.push(unsubBroadcast)

    // 2. Listen to PostgreSQL database table mutations
    const tables = Object.keys(TABLE_STORAGE_KEY_MAP)
    for (const table of tables) {
      const unsubTable = this.subscribeToPostgresChanges(companyId, table, (payload) => {
        const storageKey = TABLE_STORAGE_KEY_MAP[table]
        if (storageKey) {
          this.reconcileRecord(storageKey, payload.eventType, payload.new, payload.old)
        }
        if (onSyncEvent) {
          onSyncEvent({
            topic: table,
            eventType: payload.eventType,
            record: payload.new || payload.old,
          })
        }
      })
      unsubs.push(unsubTable)
    }

    return () => {
      unsubs.forEach((unsub) => unsub())
    }
  }

  /**
   * Decrements reference count and closes WebSocket channel when refCount drops to 0.
   */
  private unsubscribe(channelName: string) {
    const channelRef = this.activeChannels.get(channelName)
    if (!channelRef) return

    channelRef.refCount -= 1
    if (channelRef.refCount <= 0) {
      channelRef.channel.unsubscribe()
      this.activeChannels.delete(channelName)
      if (this.activeChannels.size === 0) {
        this.setStatus('disconnected')
      }
    }
  }

  /**
   * Return number of currently open WebSocket channels
   */
  getActiveChannelCount(): number {
    return this.activeChannels.size
  }
}

export const realtimeManager = new RealtimeSubscriptionManager()
