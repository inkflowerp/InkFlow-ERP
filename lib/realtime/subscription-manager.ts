// ==============================================================================
// PrintERP SaaS - Universal Realtime Subscription Manager
// Authoritative Supabase Realtime synchronization with strict tenant isolation,
// PostgreSQL replication reconciliation, cross-tab BroadcastChannel, and
// instant live updates across all application modules without browser reload.
// ==============================================================================

import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '../supabase/client.ts'
import { PrintERPDataStore, STORAGE_KEYS, type StorageKey, CLIENT_TAB_ID, getInitialSeedData } from '../db/data-store.ts'

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
  | 'support'

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

export interface ChildParentRelation {
  parentTable: string
  parentKey: StorageKey
  fkField: string
  itemsArrayField: string
}

// Child entity to parent entity relationship mapping for nested array reconciliation
export const CHILD_PARENT_TABLE_MAP: Record<string, ChildParentRelation> = {
  sales_order_items: {
    parentTable: 'sales_orders',
    parentKey: STORAGE_KEYS.ORDERS,
    fkField: 'order_id',
    itemsArrayField: 'items',
  },
  quotation_items: {
    parentTable: 'quotations',
    parentKey: STORAGE_KEYS.QUOTATIONS,
    fkField: 'quotation_id',
    itemsArrayField: 'items',
  },
  invoice_items: {
    parentTable: 'invoices',
    parentKey: STORAGE_KEYS.INVOICES,
    fkField: 'invoice_id',
    itemsArrayField: 'items',
  },
  design_versions: {
    parentTable: 'design_jobs',
    parentKey: STORAGE_KEYS.DESIGN_JOBS,
    fkField: 'design_job_id',
    itemsArrayField: 'versions',
  },
  purchase_request_items: {
    parentTable: 'purchase_requests',
    parentKey: STORAGE_KEYS.PURCHASE_REQUESTS,
    fkField: 'request_id',
    itemsArrayField: 'items',
  },
  goods_received_note_items: {
    parentTable: 'goods_received_notes',
    parentKey: STORAGE_KEYS.GOODS_RECEIVED_NOTES,
    fkField: 'grn_id',
    itemsArrayField: 'items',
  },
  supplier_return_items: {
    parentTable: 'supplier_returns',
    parentKey: STORAGE_KEYS.SUPPLIER_RETURNS,
    fkField: 'return_id',
    itemsArrayField: 'items',
  },
}

// Complete Table to StorageKey mapping for universal automatic reconciliation
export const TABLE_STORAGE_KEY_MAP: Record<string, StorageKey> = {
  // CRM & Contacts
  customers: STORAGE_KEYS.CUSTOMERS,
  customer_communications: STORAGE_KEYS.COMMUNICATIONS,
  customer_rates: STORAGE_KEYS.CUSTOMER_RATES,
  suppliers: STORAGE_KEYS.SUPPLIERS,
  supplier_items: STORAGE_KEYS.SUPPLIER_ITEMS,
  supplier_material_prices: STORAGE_KEYS.SUPPLIER_PRICES,
  supplier_returns: STORAGE_KEYS.SUPPLIER_RETURNS,
  supplier_return_items: STORAGE_KEYS.SUPPLIER_RETURNS,
  supplier_ledger_entries: STORAGE_KEYS.SUPPLIER_LEDGER_ENTRIES,

  // Orders & Quotations
  sales_orders: STORAGE_KEYS.ORDERS,
  sales_order_items: STORAGE_KEYS.ORDERS,
  job_orders: STORAGE_KEYS.JOB_ORDERS,
  order_timeline_events: STORAGE_KEYS.TIMELINE_EVENTS,
  quotations: STORAGE_KEYS.QUOTATIONS,
  quotation_items: STORAGE_KEYS.QUOTATIONS,
  quotation_activities: STORAGE_KEYS.QUOTATION_ACTIVITIES,

  // Products & Pricing
  products: STORAGE_KEYS.PRODUCTS,
  product_variants: STORAGE_KEYS.PRODUCT_VARIANTS,
  product_formulas: STORAGE_KEYS.PRODUCT_FORMULAS,
  product_categories: STORAGE_KEYS.PRODUCT_CATEGORIES,
  price_lists: STORAGE_KEYS.PRICE_LISTS,
  price_list_items: STORAGE_KEYS.PRICE_LIST_ITEMS,
  pricing_rules: STORAGE_KEYS.PRICING_RULES,
  product_price_history: STORAGE_KEYS.PRICE_HISTORY,
  product_supplier_prices: STORAGE_KEYS.PRODUCT_SUPPLIER_PRICES,

  // Inventory & Materials
  materials: STORAGE_KEYS.MATERIALS,
  inventory_rolls: STORAGE_KEYS.MOUNTED_ROLLS,
  stock_ledger: STORAGE_KEYS.STOCK_LEDGER,
  inventory_locations: STORAGE_KEYS.LOCATIONS,
  locations_master: STORAGE_KEYS.LOCATIONS_MASTER,
  inventory_remnants: STORAGE_KEYS.REMNANTS,
  inventory_stock_balances: STORAGE_KEYS.INVENTORY_STOCK_BALANCES,
  inventory_transfers: STORAGE_KEYS.INVENTORY_TRANSFERS,
  inventory_adjustments: STORAGE_KEYS.INVENTORY_ADJUSTMENTS,
  material_requests: STORAGE_KEYS.MATERIAL_REQUESTS,
  material_issues: STORAGE_KEYS.MATERIAL_ISSUES,

  // Production & Shop Floor
  production_jobs: STORAGE_KEYS.PRODUCTION_JOBS,
  production_tasks: STORAGE_KEYS.PRODUCTION_TASKS,
  production_reworks: STORAGE_KEYS.REWORKS,
  operator_jobs: STORAGE_KEYS.OPERATOR_JOBS,
  machineries: STORAGE_KEYS.MACHINERIES,
  machinery_assignments: STORAGE_KEYS.MACHINERY_ASSIGNMENTS,
  machinery_maintenances: STORAGE_KEYS.MACHINERY_MAINTENANCES,
  machinery_breakdowns: STORAGE_KEYS.MACHINERY_BREAKDOWNS,

  // Billing & Accounting
  invoices: STORAGE_KEYS.INVOICES,
  invoice_items: STORAGE_KEYS.INVOICES,
  invoice_requests: STORAGE_KEYS.INVOICE_REQUESTS,
  payments: STORAGE_KEYS.PAYMENTS,
  expenses: STORAGE_KEYS.EXPENSES,
  bank_accounts: STORAGE_KEYS.BANK_ACCOUNTS,
  cash_book_entries: STORAGE_KEYS.CASH_BOOK,
  accounts: STORAGE_KEYS.ACCOUNTS,
  financial_transactions: STORAGE_KEYS.FINANCIAL_TRANSACTIONS,
  journal_entry_lines: STORAGE_KEYS.JOURNAL_ENTRY_LINES,
  account_transfers: STORAGE_KEYS.ACCOUNT_TRANSFERS,
  cash_closings: STORAGE_KEYS.CASH_CLOSINGS,
  financial_periods: STORAGE_KEYS.FINANCIAL_PERIODS,
  bank_statements: STORAGE_KEYS.BANK_STATEMENTS,
  purchase_orders: STORAGE_KEYS.PURCHASE_ORDERS,
  purchase_requests: STORAGE_KEYS.PURCHASE_REQUESTS,
  purchase_request_items: STORAGE_KEYS.PURCHASE_REQUESTS,
  goods_received_notes: STORAGE_KEYS.GOODS_RECEIVED_NOTES,
  goods_received_note_items: STORAGE_KEYS.GOODS_RECEIVED_NOTES,

  // Logistics & Installations
  delivery_challans: STORAGE_KEYS.DELIVERY_CHALLANS,
  installations: STORAGE_KEYS.INSTALLATIONS,

  // Design & Pre-Press
  design_jobs: STORAGE_KEYS.DESIGN_JOBS,
  design_versions: STORAGE_KEYS.DESIGN_JOBS,
  job_costings: STORAGE_KEYS.JOB_COSTINGS,

  // HR & Payroll
  employees: STORAGE_KEYS.EMPLOYEES,
  attendance: STORAGE_KEYS.ATTENDANCE,
  shifts: STORAGE_KEYS.SHIFTS,
  employee_shifts: STORAGE_KEYS.EMPLOYEE_SHIFTS,
  salary_advances: STORAGE_KEYS.SALARY_ADVANCES,
  daily_labor_logs: STORAGE_KEYS.DAILY_LABOR_LOGS,
  payroll_periods: STORAGE_KEYS.PAYROLL_PERIODS,
  payroll_items: STORAGE_KEYS.PAYROLL,

  // Communications & Notifications
  in_app_notifications: STORAGE_KEYS.IN_APP_NOTIFICATIONS,
  communication_logs: STORAGE_KEYS.COMMUNICATION_LOGS,
  communication_messages: STORAGE_KEYS.COMMUNICATION_MESSAGES,
  communication_templates: STORAGE_KEYS.COMMUNICATION_TEMPLATES,
  message_templates: STORAGE_KEYS.MESSAGE_TEMPLATES,
  channel_configs: STORAGE_KEYS.CHANNEL_CONFIGS,

  // Support & Help Desk
  support_conversations: STORAGE_KEYS.SUPPORT_CONVERSATIONS,
  support_messages: STORAGE_KEYS.SUPPORT_MESSAGES,

  // Tenant Settings & Access
  companies: STORAGE_KEYS.COMPANY_PROFILE,
  company_users: STORAGE_KEYS.COMPANY_USERS,
  company_subscriptions: STORAGE_KEYS.COMPANY_SUBSCRIPTIONS,
  roles: STORAGE_KEYS.ROLES,
  role_matrices: STORAGE_KEYS.ROLE_MATRICES,
  branches: STORAGE_KEYS.BRANCHES,
  branch_transfers: STORAGE_KEYS.BRANCH_TRANSFERS,
  inter_branch_financial_transfers: STORAGE_KEYS.INTER_BRANCH_FINANCIAL_TRANSFERS,
  employee_branch_assignments: STORAGE_KEYS.EMPLOYEE_BRANCH_ASSIGNMENTS,
  user_branch_access: STORAGE_KEYS.USER_BRANCH_ACCESS,
  workflow_configurations: STORAGE_KEYS.WORKFLOW_CONFIGURATIONS,
  saved_views: STORAGE_KEYS.SAVED_VIEWS,
  company_tax_settings: STORAGE_KEYS.TAX_SETTINGS,
  tax_profiles: STORAGE_KEYS.TAX_PROFILES,
  tax_transaction_lines: STORAGE_KEYS.TAX_TRANSACTION_LINES,
  document_numbering: STORAGE_KEYS.DOCUMENT_NUMBERING,
  document_templates: STORAGE_KEYS.DOCUMENT_TEMPLATES,
  branding_settings: STORAGE_KEYS.BRANDING_SETTINGS,
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

export function isSingleObjectStorageKey(key: StorageKey): boolean {
  return (
    key === STORAGE_KEYS.COMPANY_PROFILE ||
    key === STORAGE_KEYS.BRANDING_SETTINGS ||
    key === STORAGE_KEYS.TAX_SETTINGS ||
    key === STORAGE_KEYS.DOCUMENT_NUMBERING ||
    key === STORAGE_KEYS.DOCUMENT_TEMPLATES ||
    key === STORAGE_KEYS.NOTIFICATION_SETTINGS ||
    key === STORAGE_KEYS.PLATFORM_SYSTEM_SETTINGS ||
    key === STORAGE_KEYS.ROLE_MATRICES
  )
}

class RealtimeSubscriptionManager {
  private activeChannels = new Map<string, { channel: RealtimeChannel; refCount: number; status: RealtimeConnectionStatus }>()
  private statusListeners = new Set<(status: RealtimeConnectionStatus) => void>()
  private currentStatus: RealtimeConnectionStatus = 'disconnected'
  private localBroadcastChannel: BroadcastChannel | null = null
  private currentTenantCompanyId: string | null = null
  private reconnectTimers = new Map<string, NodeJS.Timeout>()
  private reconnectAttempts = new Map<string, number>()

  constructor() {
    this.initLocalBroadcast()
    this.initBrowserLifecycleListeners()
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
          if (msg.senderId && msg.senderId === CLIENT_TAB_ID) {
            // Ignore messages dispatched by this exact same tab
            return
          }

          if (msg.type === 'LOCAL_STORE_MUTATION' && msg.storageKey) {
            // Reconcile into DataStore without re-emitting cross-tab message to avoid infinite loop
            if (msg.mutationType === 'DELETE') {
              PrintERPDataStore.removeItem(msg.storageKey, msg.id, msg.tenantSlug, false)
            } else if (msg.mutationType === 'ADD') {
              PrintERPDataStore.addItem(msg.storageKey, msg.record, msg.tenantSlug, false)
            } else if (msg.mutationType === 'UPDATE') {
              PrintERPDataStore.updateItem(msg.storageKey, msg.id, msg.record, msg.tenantSlug, false)
            } else if (msg.mutationType === 'SET') {
              PrintERPDataStore.set(msg.storageKey, msg.data, true, msg.tenantSlug, false)
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
   * Handles browser network reconnection & tab visibility switches
   */
  private initBrowserLifecycleListeners() {
    if (typeof window === 'undefined') return

    // Auto-reconnect when device comes back online
    window.addEventListener('online', () => {
      console.log('[RealtimeManager] Network online restored. Re-verifying active channels...')
      this.reconnectAllChannels()
    })

    // Re-verify when user switches back to this tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        if (this.currentStatus === 'disconnected' || this.currentStatus === 'error') {
          console.log('[RealtimeManager] Tab focused. Restoring realtime connections...')
          this.reconnectAllChannels()
        }
      }
    })
  }

  /**
   * Reconnects all currently registered active channels
   */
  public reconnectAllChannels() {
    if (!this.currentTenantCompanyId || !isSupabaseConfigured()) return
    const companyId = this.currentTenantCompanyId
    const channelName = `company:${companyId}:realtime`
    const channelRef = this.activeChannels.get(channelName)
    if (channelRef) {
      this.activeChannels.delete(channelName)
      try {
        channelRef.channel.unsubscribe()
      } catch {}
      this.subscribeToTenantSync(companyId)
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
          senderId: CLIENT_TAB_ID,
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
    if (!companyId || !isSupabaseConfigured()) return () => {}

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
    oldRecord?: any,
    tableName?: string
  ) {
    if (!storageKey) return

    try {
      // 1. Check if table is a child entity that lives inside a parent record's array
      const childRelation = tableName ? CHILD_PARENT_TABLE_MAP[tableName] : null
      if (childRelation) {
        const record = newRecord || oldRecord
        const parentId =
          record?.[childRelation.fkField] ||
          record?.sales_order_id ||
          record?.order_id ||
          record?.invoice_id ||
          record?.quotation_id ||
          record?.design_job_id ||
          record?.request_id ||
          record?.grn_id ||
          record?.return_id

        if (parentId) {
          const parent = PrintERPDataStore.findItem<any>(childRelation.parentKey, parentId)
          if (parent) {
            const rawArray = parent[childRelation.itemsArrayField]
            const itemsList = Array.isArray(rawArray) ? [...rawArray] : []
            const childId = record?.id

            if (eventType === 'DELETE') {
              const filtered = itemsList.filter((item) => item.id !== childId)
              PrintERPDataStore.updateItem(childRelation.parentKey, parentId, {
                [childRelation.itemsArrayField]: filtered,
              } as any)
            } else if (eventType === 'INSERT' || eventType === 'UPDATE') {
              const idx = itemsList.findIndex((item) => item.id === childId)
              if (idx >= 0) {
                itemsList[idx] = { ...itemsList[idx], ...record }
              } else {
                itemsList.push(record)
              }
              PrintERPDataStore.updateItem(childRelation.parentKey, parentId, {
                [childRelation.itemsArrayField]: itemsList,
              } as any)
            }

            // Emit fine-grained child events
            if (typeof window !== 'undefined') {
              if (tableName === 'sales_order_items') {
                window.dispatchEvent(
                  new CustomEvent('printerp_order_items_updated', {
                    detail: { orderId: parentId, item: record, eventType },
                  })
                )
              } else if (tableName === 'invoice_items') {
                window.dispatchEvent(
                  new CustomEvent('printerp_invoice_items_updated', {
                    detail: { invoiceId: parentId, item: record, eventType },
                  })
                )
              } else if (tableName === 'quotation_items') {
                window.dispatchEvent(
                  new CustomEvent('printerp_quotation_items_updated', {
                    detail: { quotationId: parentId, item: record, eventType },
                  })
                )
              } else if (tableName === 'design_versions') {
                window.dispatchEvent(
                  new CustomEvent('printerp_design_versions_updated', {
                    detail: { designJobId: parentId, version: record, eventType },
                  })
                )
              }
            }
            return
          }
        }
      }

      // 2. Check if storage key is a singleton configuration/profile object
      if (isSingleObjectStorageKey(storageKey)) {
        if (eventType === 'DELETE') {
          PrintERPDataStore.set(storageKey, getInitialSeedData(storageKey))
        } else if (newRecord) {
          const existing = PrintERPDataStore.get(storageKey) || {}
          PrintERPDataStore.set(storageKey, { ...existing, ...newRecord })
        }
        return
      }

      // 3. Standard collection array reconciliation
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
            // Preserve nested relations if incoming record doesn't include them
            const updatedRecord = { ...existing, ...newRecord }
            if (existing.items && !newRecord.items) {
              updatedRecord.items = existing.items
            }
            if (existing.versions && !newRecord.versions) {
              updatedRecord.versions = existing.versions
            }
            PrintERPDataStore.updateItem(storageKey, newRecord.id, updatedRecord)
          }
        }
      }

      // 4. Also handle specific timeline events notification
      if (storageKey === STORAGE_KEYS.TIMELINE_EVENTS && (newRecord?.order_id || oldRecord?.order_id)) {
        const orderId = newRecord?.order_id || oldRecord?.order_id
        if (orderId && typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('printerp_timeline_updated', {
              detail: { orderId, record: newRecord || oldRecord, eventType },
            })
          )
        }
      }
    } catch (err) {
      console.error(`[RealtimeManager] Reconciliation error on ${storageKey}${tableName ? ` (${tableName})` : ''}:`, err)
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
      } else if (table === 'invoices') {
        if (eventType === 'INSERT') {
          popup = {
            id: `inv-${record.id}-${Date.now()}`,
            type: 'billing',
            title: `Invoice Created #${record.invoice_number || 'New'}`,
            titleBn: `নতুন ইনভয়েস #${record.invoice_number || ''} তৈরি হয়েছে`,
            message: `${record.customer_name || 'Customer'} • Total: ৳ ${(record.grand_total || 0).toLocaleString()}`,
            messageBn: `${record.customer_name || 'গ্রাহক'} • মোট: ৳ ${(record.grand_total || 0).toLocaleString()}`,
            actionUrl: `/billing`,
          }
        } else if (eventType === 'UPDATE' && record.status === 'paid') {
          popup = {
            id: `inv-paid-${record.id}-${Date.now()}`,
            type: 'payment',
            title: `Invoice #${record.invoice_number} Paid in Full`,
            titleBn: `ইনভয়েস #${record.invoice_number} সম্পূর্ণ পরিশোধ হয়েছে`,
            message: `${record.customer_name || 'Customer'} • ৳ ${(record.grand_total || 0).toLocaleString()}`,
            messageBn: `${record.customer_name || 'গ্রাহক'} • ৳ ${(record.grand_total || 0).toLocaleString()}`,
            actionUrl: `/billing`,
          }
        }
      } else if (table === 'design_jobs') {
        if (eventType === 'INSERT') {
          popup = {
            id: `dsn-${record.id}-${Date.now()}`,
            type: 'design',
            title: `New Design Job #${record.design_number || 'New'}`,
            titleBn: `নতুন ডিজাইন জব #${record.design_number || ''} রিকুয়েস্ট`,
            message: `${record.title || 'Artwork'} for ${record.customer_name || 'Customer'}`,
            messageBn: `${record.title || 'আর্টওয়ার্ক'} — ${record.customer_name || 'গ্রাহক'}`,
            actionUrl: `/design`,
          }
        } else if (eventType === 'UPDATE' && (record.status === 'approved' || record.workflow_routing === 'design_ok')) {
          popup = {
            id: `dsn-app-${record.id}-${Date.now()}`,
            type: 'design',
            title: `Design #${record.design_number} Approved & Ready`,
            titleBn: `ডিজাইন #${record.design_number} অনুমোদিত ও রেডি`,
            message: `Ready for Print Operator / Production`,
            messageBn: `প্রিন্টিং প্রোডাকশনের জন্য প্রস্তুত`,
            actionUrl: `/design`,
          }
        }
      } else if (table === 'production_jobs' || table === 'production_tasks') {
        if (eventType === 'UPDATE' && (record.stage || record.status)) {
          popup = {
            id: `prd-${record.id}-${Date.now()}`,
            type: 'job',
            title: `Shop Floor: ${record.product_name || record.task_name || 'Job'} Update`,
            titleBn: `প্রোডাকশন জব: ${record.product_name || record.task_name || 'জব'} আপডেট`,
            message: `Stage: ${(record.stage || record.status || '').toUpperCase()}`,
            messageBn: `ধাপ: ${record.stage || record.status || 'চলমান'}`,
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
      } else if (table === 'quotations') {
        if (eventType === 'INSERT') {
          popup = {
            id: `quo-${record.id}-${Date.now()}`,
            type: 'quotation',
            title: `Quotation #${record.quotation_number || 'New'} Generated`,
            titleBn: `কোটেশন #${record.quotation_number || ''} তৈরি হয়েছে`,
            message: `${record.customer_name || 'Client'} • ৳ ${(record.grand_total || record.estimated_total || 0).toLocaleString()}`,
            messageBn: `${record.customer_name || 'ক্লায়েন্ট'} • ৳ ${(record.grand_total || record.estimated_total || 0).toLocaleString()}`,
            actionUrl: `/quotations`,
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
        } else if (eventType === 'UPDATE' && record.status === 'delivered') {
          popup = {
            id: `del-ok-${record.id}-${Date.now()}`,
            type: 'delivery',
            title: `Challan #${record.challan_number} Delivered`,
            titleBn: `চালান #${record.challan_number} সফলভাবে ডেলিভার্ড হয়েছে`,
            message: `Received by: ${record.receiver_name || record.customer_name || 'Customer'}`,
            messageBn: `গ্রহণ করেছেন: ${record.receiver_name || record.customer_name || 'গ্রাহক'}`,
            actionUrl: `/delivery`,
          }
        }
      } else if (table === 'materials') {
        if (eventType === 'UPDATE' && record.current_stock !== undefined && record.reorder_level !== undefined && Number(record.current_stock) <= Number(record.reorder_level)) {
          popup = {
            id: `mat-low-${record.id}-${Date.now()}`,
            type: 'inventory',
            title: `Low Stock Alert: ${record.name}`,
            titleBn: `স্টক সতর্কতা: ${record.name} রিয়র্ডার লেভেলে`,
            message: `Current Stock: ${record.current_stock} ${record.unit || 'units'} (Reorder Level: ${record.reorder_level})`,
            messageBn: `বর্তমান স্টক: ${record.current_stock} ${record.unit || ''} (রিয়র্ডার লেভেল: ${record.reorder_level})`,
            actionUrl: `/inventory?view=materials`,
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
   * Schedules an automatic backoff reconnection attempt for a channel
   */
  private scheduleReconnect(companyId: string, channelName: string) {
    if (this.reconnectTimers.has(channelName)) return
    const attempts = this.reconnectAttempts.get(channelName) || 0
    if (attempts > 5) {
      console.warn(`[RealtimeManager] Max reconnect attempts reached for ${channelName}. Waiting for next window event.`)
      return
    }

    const backoffMs = Math.min(1000 * Math.pow(2, attempts), 10000)
    this.reconnectAttempts.set(channelName, attempts + 1)
    console.log(`[RealtimeManager] Scheduling reconnect in ${backoffMs}ms (attempt ${attempts + 1}) for ${channelName}...`)

    const timer = setTimeout(() => {
      this.reconnectTimers.delete(channelName)
      const existing = this.activeChannels.get(channelName)
      if (existing) {
        try {
          existing.channel.unsubscribe()
        } catch {}
        this.activeChannels.delete(channelName)
      }
      this.subscribeToTenantSync(companyId)
    }, backoffMs)

    this.reconnectTimers.set(channelName, timer)
  }

  /**
   * Full tenant synchronization: Unified multiplexed WebSocket channel for all operational tables
   */
  subscribeToTenantSync(
    companyId: string,
    onSyncEvent?: (event: { topic: string; eventType: string; record: any }) => void
  ): () => void {
    if (!companyId || !isSupabaseConfigured()) return () => {}

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
        const table = payload?.table
        const storageKey = table ? TABLE_STORAGE_KEY_MAP[table] : payload?.storageKey
        if (storageKey || (table && CHILD_PARENT_TABLE_MAP[table])) {
          this.reconcileRecord(
            storageKey || CHILD_PARENT_TABLE_MAP[table].parentKey,
            payload.eventType || 'UPDATE',
            payload.record,
            payload.oldRecord,
            table
          )
        }
        if (typeof window !== 'undefined') {
          const enrichedDetail = {
            ...payload,
            table,
            storageKey: payload?.storageKey || storageKey,
            eventType: payload?.eventType || 'SYNC',
            record: payload?.record,
            oldRecord: payload?.oldRecord,
            timestamp: Date.now(),
          }
          window.dispatchEvent(
            new CustomEvent('printerp_table_synced', {
              detail: enrichedDetail,
            })
          )
          if (table) {
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${table}`, {
                detail: enrichedDetail,
              })
            )
          }
          if (storageKey) {
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${storageKey}`, {
                detail: enrichedDetail,
              })
            )
          }
        }
        if (onSyncEvent) {
          onSyncEvent({
            topic: table || payload?.topic || 'general',
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
          if (storageKey || CHILD_PARENT_TABLE_MAP[table]) {
            this.reconcileRecord(
              storageKey || CHILD_PARENT_TABLE_MAP[table].parentKey,
              payload.eventType,
              payload.new,
              payload.old,
              table
            )
          }

          // Dispatch window events so non-data-store pages (e.g. settings/users) and useDataStore update in place
          if (typeof window !== 'undefined') {
            const detail = {
              table,
              storageKey: storageKey || (CHILD_PARENT_TABLE_MAP[table] ? CHILD_PARENT_TABLE_MAP[table].parentKey : undefined),
              eventType: payload.eventType,
              record: payload.new || payload.old,
              oldRecord: payload.old,
              timestamp: Date.now(),
            }
            window.dispatchEvent(
              new CustomEvent('printerp_table_synced', {
                detail,
              })
            )
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${table}`, {
                detail,
              })
            )
            if (storageKey) {
              window.dispatchEvent(
                new CustomEvent(`printerp_table_synced:${storageKey}`, {
                  detail,
                })
              )
            }
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
          this.reconcileRecord(STORAGE_KEYS.COMPANY_PROFILE, payload.eventType, payload.new, payload.old, 'companies')
          if (typeof window !== 'undefined') {
            const detail = {
              table: 'companies',
              storageKey: STORAGE_KEYS.COMPANY_PROFILE,
              eventType: payload.eventType,
              record: payload.new || payload.old,
              oldRecord: payload.old,
              timestamp: Date.now(),
            }
            window.dispatchEvent(
              new CustomEvent('printerp_table_synced', {
                detail,
              })
            )
            window.dispatchEvent(
              new CustomEvent('printerp_table_synced:companies', {
                detail,
              })
            )
            window.dispatchEvent(
              new CustomEvent(`printerp_table_synced:${STORAGE_KEYS.COMPANY_PROFILE}`, {
                detail,
              })
            )
          }
        }
      )

      // Subscribe and manage connection lifecycle
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected')
          this.reconnectAttempts.delete(channelName)
          if (channelRef) channelRef.status = 'connected'
          console.log(`[RealtimeManager] Unified Realtime Active: ${channelName}`)
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          this.setStatus('reconnecting')
          if (channelRef) channelRef.status = 'error'
          this.scheduleReconnect(companyId, channelName)
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
   * Platform Administrator Realtime: Multiplexed WebSocket channel for platform_notifications
   */
  subscribeToPlatformNotifications(
    onEvent?: (event: PostgresChangeEvent<any>) => void
  ): () => void {
    if (typeof window === 'undefined' || !isSupabaseConfigured()) {
      return () => {}
    }

    const channelName = 'platform:notifications:admin'
    let channelRef = this.activeChannels.get(channelName)

    if (!channelRef) {
      const supabase = createClient()
      this.setStatus('connecting')

      const channel = supabase.channel(channelName)

      // 1. Broadcast channel listener for administrative announcements
      channel.on('broadcast', { event: 'platform_notification_event' }, (response: any) => {
        const payload = response.payload
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('printerp_platform_notification', {
              detail: payload,
            })
          )
        }
        if (payload?.title) {
          triggerPopupNotification({
            id: payload.id || `plat-bc-${Date.now()}`,
            type: payload.type || 'system',
            title: payload.title,
            message: payload.message || '',
            actionUrl: payload.action_url || '/platform/notifications',
          })
        }
      })

      // 2. PostgreSQL Replication changes on public.platform_notifications
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'platform_notifications',
        },
        (payload: any) => {
          const changeEvent: PostgresChangeEvent<any> = {
            eventType: payload.eventType,
            schema: payload.schema,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('printerp_platform_notification_change', {
                detail: changeEvent,
              })
            )
          }

          if (payload.eventType === 'INSERT' && payload.new) {
            triggerPopupNotification({
              id: payload.new.id || `plat-notif-${Date.now()}`,
              type: payload.new.type || 'system',
              title: payload.new.title || 'Platform Alert',
              message: payload.new.message || '',
              actionUrl: payload.new.action_url || '/platform/notifications',
            })
          }

          if (onEvent) {
            onEvent(changeEvent)
          }
        }
      )

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.setStatus('connected')
          if (channelRef) channelRef.status = 'connected'
          console.log(`[RealtimeManager] Platform Realtime Active: ${channelName}`)
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

    let windowListener: ((e: any) => void) | null = null
    if (onEvent && typeof window !== 'undefined') {
      windowListener = (e: any) => {
        if (e?.detail) {
          onEvent(e.detail)
        }
      }
      window.addEventListener('printerp_platform_notification_change', windowListener)
    }

    return () => {
      if (windowListener && typeof window !== 'undefined') {
        window.removeEventListener('printerp_platform_notification_change', windowListener)
      }
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
    const timer = this.reconnectTimers.get(channelName)
    if (timer) {
      clearTimeout(timer)
      this.reconnectTimers.delete(channelName)
    }
    this.reconnectAttempts.delete(channelName)

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
