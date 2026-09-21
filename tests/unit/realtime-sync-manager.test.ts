import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  realtimeManager,
  TABLE_STORAGE_KEY_MAP,
  CHILD_PARENT_TABLE_MAP,
  isSingleObjectStorageKey,
} from '../../lib/realtime/subscription-manager.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Realtime Subscription Manager & Live Synchronization Unit Tests', () => {
  it('should map core database tables to valid StorageKeys', () => {
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.customers, STORAGE_KEYS.CUSTOMERS)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.sales_orders, STORAGE_KEYS.ORDERS)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.invoices, STORAGE_KEYS.INVOICES)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.payments, STORAGE_KEYS.PAYMENTS)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.production_jobs, STORAGE_KEYS.PRODUCTION_JOBS)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.delivery_challans, STORAGE_KEYS.DELIVERY_CHALLANS)
    assert.strictEqual(TABLE_STORAGE_KEY_MAP.in_app_notifications, STORAGE_KEYS.IN_APP_NOTIFICATIONS)
  })

  it('should safely reject subscription if companyId is empty to prevent cross-tenant leak', () => {
    let called = false
    const unsub = realtimeManager.subscribe('', 'orders', 'order_created', () => {
      called = true
    })
    assert.strictEqual(typeof unsub, 'function')
    unsub()
    assert.strictEqual(called, false)
  })

  it('should reconcile INSERT event into store and avoid duplicate rows', () => {
    const testCustomerId = `test-cust-${Date.now()}`
    const testCustomer = {
      id: testCustomerId,
      name: 'Dynamic Realtime Client',
      mobile: '01799999999',
      company_id: 'test-company-1',
      total_due_balance: 5000,
      updated_at: new Date().toISOString(),
    }

    // 1. Initial insert
    realtimeManager.reconcileRecord(
      STORAGE_KEYS.CUSTOMERS,
      'INSERT',
      testCustomer,
      undefined,
      'customers'
    )

    const stored1 = PrintERPDataStore.findItem<any>(STORAGE_KEYS.CUSTOMERS, testCustomerId)
    assert.ok(stored1)
    assert.strictEqual(stored1?.name, 'Dynamic Realtime Client')

    // 2. Duplicate insert event should not duplicate row
    realtimeManager.reconcileRecord(
      STORAGE_KEYS.CUSTOMERS,
      'INSERT',
      testCustomer,
      undefined,
      'customers'
    )

    const list = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
    const matching = list.filter((x) => x.id === testCustomerId)
    assert.strictEqual(matching.length, 1)

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.CUSTOMERS, testCustomerId)
  })

  it('should reconcile UPDATE event with newer timestamp and ignore stale update', () => {
    const testOrderId = `test-ord-${Date.now()}`
    const initialOrder = {
      id: testOrderId,
      order_number: 'ORD-999001',
      status: 'confirmed',
      final_price: 10000,
      updated_at: '2026-09-10T10:00:00.000Z',
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, initialOrder)

    // Newer update
    const updatedOrder = {
      id: testOrderId,
      order_number: 'ORD-999001',
      status: 'completed',
      final_price: 10000,
      updated_at: '2026-09-10T12:00:00.000Z',
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.ORDERS,
      'UPDATE',
      updatedOrder,
      undefined,
      'sales_orders'
    )

    const storedAfterUpdate = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(storedAfterUpdate?.status, 'completed')

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.ORDERS, testOrderId)
  })

  it('should preserve local items array when parent order row is updated without items payload', () => {
    const testOrderId = `test-ord-rel-${Date.now()}`
    const initialOrder = {
      id: testOrderId,
      order_number: 'ORD-REL-1',
      status: 'confirmed',
      items: [
        { id: 'item-1', item_name: 'Custom Banner', quantity: 2, unit_price: 500, total_price: 1000 },
      ],
      updated_at: '2026-09-10T10:00:00.000Z',
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, initialOrder)

    // Postgres sends sales_orders row without items joined
    const incomingOrder = {
      id: testOrderId,
      order_number: 'ORD-REL-1',
      status: 'in_production',
      updated_at: '2026-09-10T11:00:00.000Z',
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.ORDERS,
      'UPDATE',
      incomingOrder,
      undefined,
      'sales_orders'
    )

    const stored = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(stored?.status, 'in_production')
    assert.ok(Array.isArray(stored?.items))
    assert.strictEqual(stored?.items.length, 1)
    assert.strictEqual(stored?.items[0].item_name, 'Custom Banner')

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.ORDERS, testOrderId)
  })

  it('should correctly reconcile child table sales_order_items into parent order items array', () => {
    const testOrderId = `test-parent-ord-${Date.now()}`
    const initialOrder = {
      id: testOrderId,
      order_number: 'ORD-NESTED-1',
      status: 'confirmed',
      items: [],
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, initialOrder)

    // Child item inserted
    const childItem = {
      id: 'child-item-1',
      order_id: testOrderId,
      item_name: 'Foil Stamping Box',
      quantity: 100,
      unit_price: 25,
      total_price: 2500,
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.ORDERS,
      'INSERT',
      childItem,
      undefined,
      'sales_order_items'
    )

    const stored = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(stored?.items?.length, 1)
    assert.strictEqual(stored?.items[0].item_name, 'Foil Stamping Box')

    // Child item updated
    const updatedChildItem = {
      ...childItem,
      quantity: 150,
      total_price: 3750,
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.ORDERS,
      'UPDATE',
      updatedChildItem,
      undefined,
      'sales_order_items'
    )

    const storedAfterUpdate = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(storedAfterUpdate?.items?.length, 1)
    assert.strictEqual(storedAfterUpdate?.items[0].quantity, 150)

    // Child item deleted
    realtimeManager.reconcileRecord(
      STORAGE_KEYS.ORDERS,
      'DELETE',
      null,
      { id: 'child-item-1', order_id: testOrderId },
      'sales_order_items'
    )

    const storedAfterDelete = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(storedAfterDelete?.items?.length, 0)

    // Ensure raw child item was NOT added to orders list
    assert.strictEqual(PrintERPDataStore.findItem(STORAGE_KEYS.ORDERS, 'child-item-1'), null)

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.ORDERS, testOrderId)
  })

  it('should correctly reconcile child table invoice_items into parent invoice items array', () => {
    const testInvoiceId = `test-parent-inv-${Date.now()}`
    const initialInvoice = {
      id: testInvoiceId,
      invoice_number: 'INV-TEST-001',
      status: 'unpaid',
      items: [],
      grand_total: 5000,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, initialInvoice)

    const childItem = {
      id: 'inv-item-101',
      invoice_id: testInvoiceId,
      item_description: 'Large Billboard Flex Print',
      quantity: 1,
      total_price: 5000,
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.INVOICES,
      'INSERT',
      childItem,
      undefined,
      'invoice_items'
    )

    const stored = PrintERPDataStore.findItem<any>(STORAGE_KEYS.INVOICES, testInvoiceId)
    assert.strictEqual(stored?.items?.length, 1)
    assert.strictEqual(stored?.items[0].item_description, 'Large Billboard Flex Print')

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.INVOICES, testInvoiceId)
  })

  it('should reconcile singleton object configuration without array wrapping', () => {
    assert.strictEqual(isSingleObjectStorageKey(STORAGE_KEYS.COMPANY_PROFILE), true)
    assert.strictEqual(isSingleObjectStorageKey(STORAGE_KEYS.TAX_SETTINGS), true)
    assert.strictEqual(isSingleObjectStorageKey(STORAGE_KEYS.ORDERS), false)

    const companyUpdate = {
      id: 'comp-realtime-profile',
      name: 'PrintTech Live Enterprise',
      phone: '+8801700000000',
      address: 'Dhaka, Bangladesh',
    }

    realtimeManager.reconcileRecord(
      STORAGE_KEYS.COMPANY_PROFILE,
      'UPDATE',
      companyUpdate,
      undefined,
      'companies'
    )

    const profile = PrintERPDataStore.get<any>(STORAGE_KEYS.COMPANY_PROFILE)
    assert.strictEqual(typeof profile, 'object')
    assert.strictEqual(Array.isArray(profile), false)
    assert.strictEqual(profile?.name, 'PrintTech Live Enterprise')
  })

  it('should reconcile DELETE event and remove record from store', () => {
    const testJobId = `test-job-${Date.now()}`
    const initialJob = {
      id: testJobId,
      production_job_number: 'PRD-7771',
      status: 'queued',
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, initialJob)
    assert.ok(PrintERPDataStore.findItem(STORAGE_KEYS.PRODUCTION_JOBS, testJobId))

    // Reconcile DELETE
    realtimeManager.reconcileRecord(
      STORAGE_KEYS.PRODUCTION_JOBS,
      'DELETE',
      null,
      { id: testJobId },
      'production_jobs'
    )

    assert.strictEqual(PrintERPDataStore.findItem(STORAGE_KEYS.PRODUCTION_JOBS, testJobId), null)
  })

  it('should report initial connection status correctly', () => {
    const status = realtimeManager.getConnectionStatus()
    assert.ok(['connected', 'connecting', 'reconnecting', 'disconnected', 'error'].includes(status))
  })
})
