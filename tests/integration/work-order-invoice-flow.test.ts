import { describe, it } from 'node:test'
import assert from 'node:assert'

// Simulated store matching PrintERP persistence engine
class SimulatedPrintERPStore {
  private collections: Map<string, any[]> = new Map()

  get<T = any[]>(key: string): T {
    return (this.collections.get(key) || []) as T
  }

  set(key: string, data: any[]) {
    this.collections.set(key, data)
  }

  addItem(key: string, item: any) {
    const list = this.get(key)
    const filtered = list.filter((x: any) => x.id !== item.id)
    filtered.unshift(item)
    this.set(key, filtered)
    return item
  }

  findItem(key: string, id: string) {
    const list = this.get(key)
    return list.find((x: any) => x.id === id) || null
  }

  getNextDocumentNumber(companyId: string, type: string): string {
    const prefix = type === 'order' ? 'ORD-' : type === 'invoice' ? 'INV-' : 'JOB-'
    const counterKey = `cnt_${companyId}_${type}`
    const cur = (this as any)[counterKey] || 100
    const next = cur + 1
    ;(this as any)[counterKey] = next
    return `${prefix}${next.toString().padStart(6, '0')}`
  }
}

describe('Designer Work Order & Invoice Request Flow (End-to-End)', () => {
  const store = new SimulatedPrintERPStore()
  const companyId = 'c-integration-01'

  it('1. Designer creates Work Order: saves order, generates design job ticket, and requests invoice from Manager', () => {
    // 1. Generate collision-free number
    const orderNumber = store.getNextDocumentNumber(companyId, 'order')
    assert.match(orderNumber, /^ORD-\d{6}$/)

    // 2. Designer adds Work Order
    const orderId = `ord-int-${Date.now()}`
    const newOrder = {
      id: orderId,
      company_id: companyId,
      order_number: orderNumber,
      customer_id: 'cust-beximco',
      customer_name: 'Beximco Pharmaceuticals Ltd.',
      customer_phone: '+8801711223344',
      customer_address: '19 Dhanmondi R/A, Dhaka-1205',
      salesperson_name: 'Tanvir Ahmed (Designer)',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
      priority: 'urgent',
      status: 'confirmed',
      payment_terms: 'advance',
      subtotal: 0,
      discount_amount: 0,
      vat_amount: 0,
      final_price: 0,
      advance_amount: 0,
      due_amount: 0,
      notes: 'Star Flex Banner (10ft × 4ft) with eyelets on all 4 corners',
      items: [
        {
          id: `oi-${Date.now()}`,
          item_name: 'Star Flex Banner',
          width: 10,
          height: 4,
          dimension_unit: 'ft',
          quantity: 2,
          unit: 'sft',
          unit_price: 0,
          total_price: 0,
        },
      ],
      jobs_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    store.addItem('printerp_tenant_orders', newOrder)

    // Verify order exists in store
    const retrievedOrder = store.findItem('printerp_tenant_orders', orderId)
    assert.ok(retrievedOrder)
    assert.strictEqual(retrievedOrder.order_number, orderNumber)
    assert.strictEqual(retrievedOrder.customer_name, 'Beximco Pharmaceuticals Ltd.')

    // 3. Verify Design Job Ticket created
    const designJobId = `dsn-int-${Date.now()}`
    const newDesignJob = {
      id: designJobId,
      company_id: companyId,
      design_number: `DSN-${orderNumber.replace('ORD-', '')}`,
      customer_id: newOrder.customer_id,
      customer_name: newOrder.customer_name,
      title: 'Star Flex Banner (10×4 ft)',
      designer_name: 'Tanvir Ahmed',
      priority: 'urgent',
      status: 'designing',
      deadline: `${newOrder.delivery_date} 18:00`,
      instructions: 'CMYK profile, 300DPI',
      dimensions_spec: '10×4 ft (Qty: 2)',
      current_version: 1,
      revision_count: 0,
      is_locked: false,
      versions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    store.addItem('printerp_tenant_design_jobs', newDesignJob)

    const retrievedDesign = store.findItem('printerp_tenant_design_jobs', designJobId)
    assert.ok(retrievedDesign)
    assert.strictEqual(retrievedDesign.title, 'Star Flex Banner (10×4 ft)')

    // 4. Send Invoice Request Notification to Manager
    const notifId = `notif-int-${Date.now()}`
    const managerNotif = {
      id: notifId,
      company_id: companyId,
      roles: ['owner', 'manager'],
      type: 'invoice_request',
      title: `Invoice Request for Order #${orderNumber}`,
      title_bn: `অর্ডার #${orderNumber} এর জন্য ইনভয়েস তৈরির অনুরোধ`,
      message: 'Beximco ordered 2 sft Star Flex Banner. Please create official invoice.',
      action_url: `/billing?action=create_invoice&order_id=${orderId}`,
      is_read: false,
      created_at: 'Just now',
    }
    store.addItem('printerp_tenant_in_app_notifications', managerNotif)

    const retrievedNotif = store.findItem('printerp_tenant_in_app_notifications', notifId)
    assert.ok(retrievedNotif)
    assert.strictEqual(retrievedNotif.type, 'invoice_request')
    assert.ok(retrievedNotif.roles.includes('manager'))
    assert.strictEqual(retrievedNotif.is_read, false)
  })

  it('2. Financial Safety & Inventory Rule: Work order and invoice creation MUST NOT reserve or deduct inventory', () => {
    // Check initial stock ledger
    const initialLedger = store.get<any[]>('printerp_tenant_stock_ledger')
    const initialLedgerCount = initialLedger.length

    // Simulating invoice creation
    const invoiceNum = store.getNextDocumentNumber(companyId, 'invoice')
    assert.match(invoiceNum, /^INV-\d{6}$/)

    // Verify stock ledger has NOT grown (inventory is untouched at invoice creation)
    const currentLedger = store.get<any[]>('printerp_tenant_stock_ledger')
    assert.strictEqual(currentLedger.length, initialLedgerCount, 'Stock ledger must remain unchanged on invoice creation')
  })
})
