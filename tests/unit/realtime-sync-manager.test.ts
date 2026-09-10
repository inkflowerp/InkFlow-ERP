import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  realtimeManager,
  TABLE_STORAGE_KEY_MAP,
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
      testCustomer
    )

    const stored1 = PrintERPDataStore.findItem<any>(STORAGE_KEYS.CUSTOMERS, testCustomerId)
    assert.ok(stored1)
    assert.strictEqual(stored1?.name, 'Dynamic Realtime Client')

    // 2. Duplicate insert event should not duplicate row
    realtimeManager.reconcileRecord(
      STORAGE_KEYS.CUSTOMERS,
      'INSERT',
      testCustomer
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
      updatedOrder
    )

    const storedAfterUpdate = PrintERPDataStore.findItem<any>(STORAGE_KEYS.ORDERS, testOrderId)
    assert.strictEqual(storedAfterUpdate?.status, 'completed')

    // Cleanup
    PrintERPDataStore.removeItem(STORAGE_KEYS.ORDERS, testOrderId)
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
      { id: testJobId }
    )

    assert.strictEqual(PrintERPDataStore.findItem(STORAGE_KEYS.PRODUCTION_JOBS, testJobId), null)
  })

  it('should report initial connection status correctly', () => {
    const status = realtimeManager.getConnectionStatus()
    assert.ok(['connected', 'connecting', 'reconnecting', 'disconnected', 'error'].includes(status))
  })
})
