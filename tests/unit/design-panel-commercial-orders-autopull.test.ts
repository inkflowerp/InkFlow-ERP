import { describe, it } from 'node:test'
import assert from 'node:assert'
import { OrderRepository } from '../../lib/repositories/order.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Design Studio & Commercial Orders Hub - Auto Pull Tests', () => {
  const TENANT_ID = `tenant-autopull-${Date.now()}`

  it('1. Auto pulls design_required work orders from Commercial Orders into Design Studio', async () => {
    // 1. Create a commercial sales order requiring graphic design
    const order = await OrderRepository.createOrder({
      company_id: TENANT_ID,
      customer_id: `cust-1`,
      customer_name: 'Navana Commercial Tower',
      customer_phone: '01711223344',
      customer_address: 'Gulshan-1, Dhaka',
      delivery_date: '2026-10-30',
      workflow_routing: 'design_required',
      priority: 'urgent',
      subtotal: 15000,
      final_price: 15000,
      items: [
        {
          item_name: 'Outdoor Flex Billboard 20x10ft',
          material_spec: 'Star Blackout Flex 380 GSM',
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'pcs',
          unit_price: 15000,
          total_price: 15000,
          design_required: true,
        } as any,
      ],
    })

    assert.ok(order.id)
    assert.ok(order.order_number)

    // 2. Fetch design jobs for tenant via DesignRepository
    const jobs = await DesignRepository.getDesignJobs(TENANT_ID)
    assert.ok(jobs.length >= 1, 'Design jobs must pull the design required work order')

    const pulledJob = jobs.find((j) => j.sales_order_id === order.id || j.order_number === order.order_number)
    assert.ok(pulledJob, 'Pulled job for Navana Commercial Tower must exist')
    assert.strictEqual(pulledJob.workflow_routing, 'design_required')
    assert.strictEqual(pulledJob.customer_approval_required, true)
    assert.strictEqual(pulledJob.order_number, order.order_number)
    assert.strictEqual(pulledJob.customer_name, 'Navana Commercial Tower')
    assert.strictEqual(pulledJob.status, 'received')
  })

  it('2. Auto pulls design_ok (Design Check) work orders into Design Studio', async () => {
    const order = await OrderRepository.createOrder({
      company_id: TENANT_ID,
      customer_id: `cust-2`,
      customer_name: 'Square Pharmaceuticals Ltd',
      customer_phone: '01899001122',
      customer_address: 'Uttara, Dhaka',
      delivery_date: '2026-10-25',
      workflow_routing: 'design_ok',
      priority: 'urgent',
      subtotal: 35000,
      final_price: 35000,
      items: [
        {
          item_name: 'Product Catalog 32-Pages',
          material_spec: '150 GSM Art Paper + Matt Lamination',
          width: 8.5,
          height: 11,
          dimension_unit: 'inch',
          quantity: 1000,
          unit: 'pcs',
          unit_price: 35,
          total_price: 35000,
          workflow_routing: 'design_ok',
          design_required: false,
        } as any,
      ],
    })

    const jobs = await DesignRepository.getDesignJobs(TENANT_ID)
    const pulledJob = jobs.find((j) => j.sales_order_id === order.id || j.order_number === order.order_number)
    assert.ok(pulledJob, 'Design Check job must be pulled from Commercial Orders')
    assert.strictEqual(pulledJob.workflow_routing, 'design_ok')
    assert.strictEqual(pulledJob.customer_approval_required, false)
    assert.strictEqual(pulledJob.status, 'received')
  })

  it('3. Ignores ready products and pulls only custom manufacturing items needing design', async () => {
    const mixedOrder = await OrderRepository.createOrder({
      company_id: TENANT_ID,
      customer_id: `cust-3`,
      customer_name: 'Pran-RFL Group',
      customer_phone: '01911998877',
      delivery_date: '2026-11-05',
      subtotal: 50000,
      final_price: 50000,
      items: [
        {
          item_name: 'Ready Roll-Up Stand Hardware Only',
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          quantity: 5,
          unit: 'pcs',
          unit_price: 2000,
          total_price: 10000,
          design_required: false,
        } as any,
        {
          item_name: 'Custom Event Backdrop 12x8ft',
          item_kind: 'custom',
          workflow_routing: 'design_required',
          design_required: true,
          quantity: 1,
          unit: 'pcs',
          unit_price: 40000,
          total_price: 40000,
        } as any,
      ],
    })

    const jobs = await DesignRepository.getDesignJobs(TENANT_ID)
    const readyJob = jobs.find((j) => (j.sales_order_id === mixedOrder.id || j.order_number === mixedOrder.order_number) && j.title.includes('Ready Roll-Up Stand'))
    const customJob = jobs.find((j) => (j.sales_order_id === mixedOrder.id || j.order_number === mixedOrder.order_number) && j.title.includes('Custom Event Backdrop'))

    assert.strictEqual(readyJob, undefined, 'Ready product must NOT be pulled into Design Studio')
    assert.ok(customJob, 'Custom Event Backdrop must be pulled into Design Studio')
    assert.strictEqual(customJob.workflow_routing, 'design_required')
  })
})
