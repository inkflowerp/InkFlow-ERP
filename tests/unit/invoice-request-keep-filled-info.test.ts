import test, { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { InvoiceRequestService } from '../../services/invoice-request.service.ts'
import { InvoiceRequestRepository } from '../../lib/repositories/invoice-request.repository.ts'
import type { SalesOrderRecord } from '../../types/order.types.ts'

describe('Invoice Request — Keep Filled Information Test Suite', () => {
  const companyAlpha = 'comp-tenant-alpha'

  beforeEach(() => {
    PrintERPDataStore.clear()
    PrintERPDataStore.set(STORAGE_KEYS.INVOICE_REQUESTS, [])
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, [])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
  })

  it('1. Keeps full customer contact info, company name, line items, rates, and notes when created directly', async () => {
    const input = {
      companyId: companyAlpha,
      customerName: 'Mahmudul Hasan',
      customerPhone: '01712345678',
      customerEmail: 'mahmud@techprint.com',
      customerAddress: 'Suite 5B, Gulshan-2, Dhaka',
      companyName: 'TechPrint Solutions Ltd.',
      items: [
        {
          productId: 'prod-flex-1',
          itemName: 'Panaflex Frontlit Banner Print',
          width: '10',
          height: '4',
          dimension_unit: 'ft',
          quantity: 2,
          unit: 'sft',
          rate: 35,
          unit_price: 35,
          total_price: 2800,
          finishing: 'Eyelet / Grommets',
          material_spec: 'Star Flex Heavy Duty',
          design_required: true,
        },
        {
          productId: 'prod-x-banner',
          itemName: 'X-Banner Stand 2x5 ft',
          width: '2',
          height: '5',
          dimension_unit: 'ft',
          quantity: 4,
          unit: 'pcs',
          rate: 650,
          unit_price: 650,
          total_price: 2600,
          finishing: 'None',
          design_required: false,
        },
      ],
      itemsSummary: 'Panaflex (10x4 ft, Qty: 2); X-Banner (2x5 ft, Qty: 4)',
      estimatedAmount: 5400,
      notes: 'Customer requested delivery by 4 PM on Saturday. Urgent.',
    }

    const created = await InvoiceRequestService.createInvoiceRequest(input)

    assert.ok(created.id, 'Invoice request ID must exist')
    assert.equal(created.customer_name, 'Mahmudul Hasan')
    assert.equal(created.customer_phone, '01712345678')
    assert.equal(created.customer_email, 'mahmud@techprint.com')
    assert.equal(created.customer_address, 'Suite 5B, Gulshan-2, Dhaka')
    assert.equal(created.company_name, 'TechPrint Solutions Ltd.')
    assert.equal(created.notes, 'Customer requested delivery by 4 PM on Saturday. Urgent.')
    assert.equal(created.estimated_amount, 5400)
    assert.equal(created.items?.length, 2)
    assert.equal(created.items?.[0].rate, 35)
    assert.equal(created.items?.[0].finishing, 'Eyelet / Grommets')
    assert.equal(created.items?.[0].material_spec, 'Star Flex Heavy Duty')
    assert.equal(created.items?.[1].rate, 650)
    assert.equal(created.items?.[1].quantity, 4)
  })

  it('2. Smartly backfills missing customer details and line items from linked Sales Order', async () => {
    // Seed existing Sales Order in datastore
    const mockOrder: SalesOrderRecord = {
      id: 'ord-test-888',
      company_id: companyAlpha,
      order_number: 'ORD-2026-888',
      customer_id: 'cust-anik-01',
      customer_name: 'Anik Chowdhury',
      customer_phone: '01811223344',
      customer_address: 'Dhanmondi 27, Dhaka',
      salesperson_name: 'Rubel Sales',
      order_date: '2026-09-19',
      delivery_date: '2026-09-21',
      priority: 'urgent',
      status: 'confirmed',
      payment_terms: 'cash',
      subtotal: 7500,
      discount_amount: 500,
      vat_amount: 0,
      final_price: 7000,
      advance_amount: 2000,
      due_amount: 5000,
      notes: 'Please ensure high resolution color calibration.',
      items: [
        {
          id: 'item-1',
          order_id: 'ord-test-888',
          product_id: 'prod-acrylic-01',
          item_name: 'Acrylic 3D LED Sign Board',
          material_spec: '5mm Clear Acrylic + Gold Sheet',
          width: 8,
          height: 3,
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          unit_price: 250,
          total_price: 6000,
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [mockOrder])

    // Dispatch request with minimal fields (as from a quick button)
    const request = await InvoiceRequestService.createInvoiceRequest({
      companyId: companyAlpha,
      salesOrderId: 'ord-test-888',
      customerName: 'Anik Chowdhury',
      notes: 'Dispatched from order view button',
    })

    assert.equal(request.sales_order_id, 'ord-test-888')
    assert.equal(request.order_number, 'ORD-2026-888')
    assert.equal(request.customer_phone, '01811223344')
    assert.equal(request.customer_address, 'Dhanmondi 27, Dhaka')
    assert.equal(request.estimated_amount, 7000)
    assert.equal(request.items?.length, 1)
    assert.equal(request.items?.[0].itemName, 'Acrylic 3D LED Sign Board')
    assert.equal(request.items?.[0].rate, 250)
    assert.equal(request.items?.[0].material_spec, '5mm Clear Acrylic + Gold Sheet')
  })

  it('3. Merges and updates filled information if a pending request is re-submitted with new data', async () => {
    // 1. Initial bare request
    const initial = await InvoiceRequestRepository.createRequest({
      company_id: companyAlpha,
      sales_order_id: 'ord-flow-101',
      order_number: 'ORD-FLOW-101',
      customer_name: 'Initial Customer Name',
      requested_by_name: 'Floor Operator',
      estimated_amount: 1000,
    })

    assert.equal(initial.status, 'pending')
    assert.equal(initial.customer_phone, null)

    // 2. Resubmit with filled details (e.g. customer phone, address, items, and revised estimate)
    const updated = await InvoiceRequestRepository.createRequest({
      company_id: companyAlpha,
      sales_order_id: 'ord-flow-101',
      order_number: 'ORD-FLOW-101',
      customer_name: 'Zakir Fabrics Ltd.',
      customer_phone: '01911998877',
      customer_address: 'Tejgaon I/A, Dhaka',
      company_name: 'Zakir Group',
      items: [
        {
          itemName: 'Fabric Lightbox Print',
          width: '12',
          height: '6',
          dimension_unit: 'ft',
          quantity: 1,
          unit: 'sft',
          rate: 120,
        },
      ],
      estimated_amount: 8640,
      notes: 'Fabric approved by client representative Mr. Zakir',
      requested_by_name: 'Designer Rifat',
    })

    assert.equal(updated.id, initial.id, 'Should keep the same request ID')
    assert.equal(updated.customer_name, 'Zakir Fabrics Ltd.')
    assert.equal(updated.customer_phone, '01911998877')
    assert.equal(updated.customer_address, 'Tejgaon I/A, Dhaka')
    assert.equal(updated.company_name, 'Zakir Group')
    assert.equal(updated.estimated_amount, 8640)
    assert.equal(updated.notes, 'Fabric approved by client representative Mr. Zakir')
    assert.equal(updated.items?.length, 1)
    assert.equal(updated.items?.[0].itemName, 'Fabric Lightbox Print')
    assert.equal(updated.items?.[0].rate, 120)
  })
})
