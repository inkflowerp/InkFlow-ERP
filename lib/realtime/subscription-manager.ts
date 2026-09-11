// ==============================================================================
// PrintERP SaaS - Universal Realtime Subscription Manager
// Authoritative Supabase Realtime synchronization with strict tenant isolation,
// PostgreSQL replication reconciliation, cross-tab BroadcastChannel, and
// instant live updates across all application modules without browser reload.
// ==============================================================================

import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '../supabase/client.ts'
import { PrintERPDataStore, STORAGE_KEYS, type StorageKey } from '../db/data-store.ts'

function triggerPopupNotification(notification: any) {
  if (typeof window === 'undefined') return
  const id = notification.id || `popup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  const event = new CustomEvent('printerp_popup_notification', {
    detail: { ...notification, id },
  })
  window.dispatchEvent(event)
}

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
  | 'users'
  | 'settings'

export type RealtimeConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error'

export interface RealtimePopupNotification {
  id: string
  type: string
  title: string
  titleBn?: string
  message: string
  messageBn?: string
  actionUrl?: string
}

export interface PostgresChangeEvent<T = any> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  new: T
  old: T
}

// Complete Table to StorageKey mapping for universal automatic reconciliation
export const TABLE_STORAGE_KEY_MAP: Record<string, StorageKey> = {
  // CRM & Contacts
  customers: STORAGE_KEYS.CUSTOMERS,
  customer_communications: STORAGE_KEYS.COMMUNICATIONS,
  suppliers: STORAGE_KEYS.SUPPLIERS,
  supplier_material_prices: STORAGE_KEYS.SUPPLIER_PRICES,

  // Orders & Quotations
  sales_orders: STORAGE_KEYS.ORDERS,
  job_orders: STORAGE_KEYS.JOB_ORDERS,
  order_timeline_events: STORAGE_KEYS.TIMELINE_EVENTS,
  quotations: STORAGE_KEYS.QUOTATIONS,
  quotation_activities: STORAGE_KEYS.QUOTATION_ACTIVITIES,

  // Products & Pricing
  products: STORAGE_KEYS.PRODUCTS,
  product_price_history: STORAGE_KEYS.PRICE_HISTORY,

  // Inventory & Materials
  materials: STORAGE_KEYS.MATERIALS,
  inventory_rolls: STORAGE_KEYS.MOUNTED_ROLLS,
  stock_ledger: STORAGE_KEYS.STOCK_LEDGER,

  // Production & Shop Floor
  production_jobs: STORAGE_KEYS.PRODUCTION_JOBS,
  production_reworks: STORAGE_KEYS.REWORKS,

  // Billing & Accounting
  invoices: STORAGE_KEYS.INVOICES,
  payments: STORAGE_KEYS.PAYMENTS,
  expenses: STORAGE_KEYS.EXPENSES,
  bank_accounts: STORAGE_KEYS.BANK_ACCOUNTS,
  cash_book_entries: STORAGE_KEYS.CASH_BOOK,
  purchase_orders: STORAGE_KEYS.PURCHASE_ORDERS,

  // Logistics & Installations
  delivery_challans: STORAGE_KEYS.DELIVERY_CHALLANS,
  installations: STORAGE_KEYS.INSTALLATIONS,

  // Design & Pre-Press
  design_jobs: STORAGE_KEYS.DESIGN_JOBS,
  job_costings: STORAGE_KEYS.JOB_COSTINGS,

  // HR & Payroll
  employees: STORAGE_KEYS.EMPLOYEES,
  attendance: STORAGE_KEYS.ATTENDANCE,
  salary_advances: STORAGE_KEYS.SALARY_ADVANCES,
  daily_labor_logs: STORAGE_KEYS.DAILY_LABOR_LOGS,
  payroll_periods: STORAGE_KEYS.PAYROLL_PERIODS,
  payroll_items: STORAGE_KEYS.PAYROLL,

  // Communications & Notifications
  in_app_notifications: STORAGE_KEYS.IN_APP_NOTIFICATIONS,
  communication_logs: STORAGE_KEYS.COMMUNICATION_LOGS,
  message_templates: STORAGE_KEYS.MESSAGE_TEMPLATES,
  channel_configs: STORAGE_KEYS.CHANNEL_CONFIGS,

  // Tenant Settings & Access
  companies: STORAGE_KEYS.COMPANY_PROFILE,
  company_users: STORAGE_KEYS.COMPANY_USERS,
  company_subscriptions: STORAGE_KEYS.COMPANY_SUBSCRIPTIONS,
  roles: STORAGE_KEYS.ROLES,
  branches: STORAGE_KEYS.BRANCHES,
  company_tax_settings: STORAGE_KEYS.TAX_SETTINGS,
  document_numbering: STORAGE_KEYS.DOCUMENT_NUMBERING,
  document_templates: STORAGE_KEYS.DOCUMENT_TEMPLATES,
  notification_settings: STORAGE_KEYS.NOTIFICATION_SETTINGS,
  automation_rules: STORAGE_KEYS.AUTOMATION_RULES,
  audit_logs: STORAGE_KEYS.AUDIT_LOGS,

  // Platform Level
  platform_companies: STORAGE_KEYS.PLATFORM_COMPANIES,
  platform_plans: STORAGE_KEYS.PLATFORM_PLANS,
  platform_feature_flags: STORAGE_KEYS.PLATFORM_FEATURE_FLAGS,
  platform_users: STORAGE_KEYS.PLATFORM_USERS,
  platform_incidents: STORAGE_KEYS.PLATFORM_INCIDENTS,
  platform_system_settings: STORAGE_KEYS.PLATFORM_SYSTEM_SETTINGS,
}

class RealtimeSubscriptionManager {
  private activeChannels = new Map<string, { channel: RealtimeChannel; refCount: number; status: RealtimeConnectionStatus }>()
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>()
  private currentStatus: RealtimeConnectionStatus = 'disconnected'
  private localBroadcastChannel: BroadcastChannel | null = null
  private currentTenantCompanyId: string | null = null

  constructor() {
    this.initLocalBroadcast()
  }

  /**
   * Initializes browser-level cross-tab synchronization via BroadcastChannel
   */
  private initLocalBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.localBroadcastChannel = new BroadcastChannel('printerp_realtime_bus')
        this.localBroadcastChannel.onmessage = (event) => {
          const msg = event.data
          if (!msg || typeof msg !== 'object') return

          if (msg.type === 'LOCAL_STORE_MUTATION' && msg.storageKey) {
            // Reconcile into DataStore without re-emitting cross-tab message to avoid infinite loop
            if (msg.mutationType === 'DELETE') {
              PrintERPDataStore.removeItem(msg.storageKey, msg.id, msg.tenantSlug)
            } else if (msg.mutationType === 'ADD') {
              PrintERPDataStore.addItem(msg.storageKey, msg.record, msg.tenantSlug)
            } else if (msg.mutationType === 'UPDATE') {
              PrintERPDataStore.updateItem(msg.storageKey, msg.id, msg.record, msg.tenantSlug)
            } else if (msg.mutationType === 'SET') {
              PrintERPDataStore.set(msg.storageKey, msg.data, true, msg.tenantSlug)
            }
          } else if (msg.type === 'POPUP_NOTIFICATION' && msg.payload) {
            triggerPopupNotification(msg.payload)
          }
        }
      } catch (err) {
        console.warn('[RealtimeManager] BroadcastChannel init warning:', err)
      }
    }
  }

  /**
   * Broadcasts a local mutation across all tabs of the same browser
   */
  broadcastLocalMutation(
    storageKey: StorageKey,
    mutationType: 'ADD' | 'UPDATE' | 'DELETE' | 'SET',
    payload: { id?: string; record?: any; data?: any; tenantSlug?: string }
  ) {
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.postMessage({
          type: 'LOCAL_STORE_MUTATION',
          storageKey,
          mutationType,
          ...payload,
          timestamp: Date.now(),
        })
      } catch (err) {
        console.warn('[RealtimeManager] Failed to post to BroadcastChannel:', err)
      }
    }
  }

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
   * Subscribe to a tenant-scoped broadcast channel topic
   */
  subscribe<T>(
    companyId: string,
    topic: RealtimeTopic,
    event: string,
    callback: (payload: T) => void
  ): () => void {
    if (!companyId) return () => {}

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
          // Compare timestamps to prevent stale overwrite
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
   * Triggers intelligent popup notifications when remote operations occur
   */
  private handleIncomingNotification(table: string, eventType: 'INSERT' | 'UPDATE' | 'DELETE', record: any) {
    if (!record) return

    try {
      let popup: RealtimePopupNotification | null = null

      if (table === 'sales_orders') {
        if (eventType === 'INSERT') {
          popup = {
            id: `so-${record.id}-${Date.now()}`,
            type: 'order',
            title: `New Order #${record.order_number || 'New'} Booked`,
            titleBn: `নতুন সেলস অর্ডার #${record.order_number || ''} বুকিং হয়েছে`,
            message: `${record.customer_name || 'Customer'} • ৳ ${(record.final_price || 0).toLocaleString()}`,
            messageBn: `${record.customer_name || 'গ্রাহক'} • ৳ ${(record.final_price || 0).toLocaleString()}`,
            actionUrl: `/orders`,
          }
        } else if (eventType === 'UPDATE' && record.status) {
          popup = {
            id: `so-up-${record.id}-${Date.now()}`,
            type: 'order',
            title: `Order #${record.order_number} Status Updated`,
            titleBn: `অর্ডার #${record.order_number} স্ট্যাটাস আপডেট`,
            message: `Current Status: ${record.status.replace(/_/g, ' ').toUpperCase()}`,
            messageBn: `বর্তমান স্ট্যাটাস: ${record.status}`,
            actionUrl: `/orders`,
          }
        }
      } else if (table === 'production_jobs') {
        if (eventType === 'UPDATE' && record.stage) {
          popup = {
            id: `prd-${record.id}-${Date.now()}`,
            type: 'job',
            title: `Shop Floor: ${record.product_name || 'Job'} Update`,
            titleBn: `প্রোডাকশন জব: ${record.product_name || 'জব'} আপডেট`,
            message: `Stage: ${record.stage.toUpperCase()} (${record.status || 'Active'})`,
            messageBn: `ধাপ: ${record.stage} (${record.status || 'চলমান'})`,
            actionUrl: `/production`,
          }
        }
      } else if (table === 'payments') {
        if (eventType === 'INSERT') {
          popup = {
            id: `pay-${record.id}-${Date.now()}`,
            type: 'payment',
            title: `Payment Received: ৳ ${(record.amount || 0).toLocaleString()}`,
            titleBn: `পেমেন্ট গ্রহণ: ৳ ${(record.amount || 0).toLocaleString()}`,
            message: `Receipt #${record.receipt_number || ''} • ${record.payment_method || 'Cash'}`,
            messageBn: `মানি রিসিট #${record.receipt_number || ''} • ${record.payment_method || 'ক্যাশ'}`,
            actionUrl: `/billing`,
          }
        }
      } else if (table === 'delivery_challans') {
        if (eventType === 'INSERT') {
          popup = {
            id: `del-${record.id}-${Date.now()}`,
            type: 'delivery',
            title: `Delivery Challan #${record.challan_number || ''} Dispatched`,
            titleBn: `ডেলিভারি চালান #${record.challan_number || ''} প্রস্তুত হয়েছে`,
            message: `Customer: ${record.customer_name || 'Client'}`,
            messageBn: `গ্রাহক: ${record.customer_name || 'ক্লায়েন্ট'}`,
            actionUrl: `/delivery`,
          }
        }
      } else if (table === 'in_app_notifications') {
        if (eventType === 'INSERT') {
          popup = {
            id: `notif-${record.id}-${Date.now()}`,
            type: 'system',
            title: record.title || 'System Notification',
            titleBn: record.title_bn || record.title,
            message: record.message || '',
            messageBn: record.message_bn || record.message,
            actionUrl: record.action_url || undefined,
          }
        }
      }

      if (popup) {
        triggerPopupNotification(popup)
      }
    } catch (err) {
      console.warn('[RealtimeManager] Notification parsing error:', err)
    }
  }

  /**
   * Full tenant synchronization: Unified multiplexed WebSocket channel for all operational tables
   */
  subscribeToTenantSync(
    companyId: string,
    onSyncEvent?: (event: { topic: string; eventType: string; record: any }) => void
  ): () => void {
    if (!companyId) return () => {}

    this.currentTenantCompanyId = companyId
    const channelName = `company:${companyId}:realtime`
    let channelRef = this.activeChannels.get(channelName)

    if (!channelRef) {
      const supabase = createClient()
      this.setStatus('connecting')

      const channel = supabase.channel(channelName)

      // 1. Listen to broadcast live-sync events (peer-to-peer fast path)
      channel.on('broadcast', { event: 'tenant_sync_event' }, (response: any) => {
        const payload = response.payload
        if (payload?.table && TABLE_STORAGE_KEY_MAP[payload.table]) {
          this.reconcileRecord(
            TABLE_STORAGE_KEY_MAP[payload.table],
            payload.eventType || 'UPDATE',
            payload.record,
            payload.oldRecord
          )
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('printerp_table_synced', {
              detail: payload,
            })
          )
          if (payload?.table) {
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${payload.table}`, {
                detail: payload,
              })
            )
          }
        }
        if (onSyncEvent) {
          onSyncEvent({
            topic: payload?.table || payload?.topic || 'general',
            eventType: payload?.eventType || 'SYNC',
            record: payload?.record,
          })
        }
      })

      // 2. Listen to broadcast user notifications
      channel.on('broadcast', { event: 'user_notification' }, (response: any) => {
        if (response.payload) {
          triggerPopupNotification(response.payload)
        }
      })

      // 3. Listen to all PostgreSQL table mutations for this company
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          filter: `company_id=eq.${companyId}`,
        },
        (payload: any) => {
          const table = payload.table
          const storageKey = TABLE_STORAGE_KEY_MAP[table]
          if (storageKey) {
            this.reconcileRecord(storageKey, payload.eventType, payload.new, payload.old)
          }

          // Dispatch window events so non-data-store pages (e.g. settings/users) update in place
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('printerp_table_synced', {
                detail: { table, eventType: payload.eventType, record: payload.new || payload.old },
              })
            )
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${table}`, {
                detail: { eventType: payload.eventType, record: payload.new || payload.old },
              })
            )
          }

          this.handleIncomingNotification(table, payload.eventType, payload.new)

          if (onSyncEvent) {
            onSyncEvent({
              topic: table,
              eventType: payload.eventType,
              record: payload.new || payload.old,
            })
          }
        }
      )

      // 4. Listen to company table changes (where id = companyId)
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies',
          filter: `id=eq.${companyId}`,
        },
        (payload: any) => {
          this.reconcileRecord(STORAGE_KEYS.COMPANY_PROFILE, payload.eventType, payload.new, payload.old)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('printerp_table_synced:companies', {
                detail: payload,
              })
            )
          }
        }
      )

      // Subscribe and manage connection lifecycle
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected')
          if (channelRef) channelRef.status = 'connected'
          console.log(`[RealtimeManager] Unified Realtime Active: ${channelName}`)
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
   * Broadcasts a realtime event to other connected clients/users in the company
   */
  broadcastSyncEvent(
    companyId: string,
    event: {
      table: string
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      record: any
      oldRecord?: any
    }
  ) {
    const channelName = `company:${companyId}:realtime`
    const channelRef = this.activeChannels.get(channelName)
    if (channelRef && channelRef.status === 'connected') {
      channelRef.channel.send({
        type: 'broadcast',
        event: 'tenant_sync_event',
        payload: event,
      })
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
