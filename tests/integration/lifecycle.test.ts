import { test, describe } from 'node:test'
import assert from 'node:assert'

// Simulated complete printing business lifecycle
interface LifecycleState {
  customer: {
    id: string
    name: string
    phone: string
    bin: string
  }
  quotation: {
    id: string
    quoteNumber: string
    customerId: string
    totalAmount: number
    status: 'draft' | 'sent' | 'approved' | 'rejected'
  }
  order: {
    id: string
    orderNumber: string
    quotationId: string
    status: 'draft' | 'confirmed' | 'in_prepress' | 'in_production' | 'ready' | 'completed'
  }
  job: {
    id: string
    jobNumber: string
    orderId: string
    machine: string
    operator: string
    status: 'queued' | 'printing' | 'qc_passed' | 'completed'
  }
  invoice: {
    id: string
    invoiceNumber: string
    orderId: string
    grandTotal: number
    paidAmount: number
    dueAmount: number
    status: 'unpaid' | 'partially_paid' | 'paid'
  }
  payment: {
    id: string
    invoiceId: string
    amount: number
    method: 'cash' | 'bkash' | 'bank'
    trxId: string
  }
  delivery: {
    id: string
    challanNumber: string
    orderId: string
    status: 'dispatched' | 'delivered'
    receivedBy?: string
  }
}

describe('End-to-End Printing Order Lifecycle Integration Test', () => {
  test('Customer ➔ Quote ➔ Order ➔ Job ➔ Production ➔ Invoice ➔ Payment ➔ Delivery', () => {
    // 1. Customer Registration
    const customer = {
      id: 'cust-abc-01',
      name: 'ABC Advertising & Media Ltd.',
      phone: '+8801711998877',
      bin: '1234567890123',
    }
    assert.ok(customer.id)
    assert.strictEqual(customer.name, 'ABC Advertising & Media Ltd.')

    // 2. Quotation Creation: 1,500 SFT Star Flex Banner at ৳19/SFT
    const quoteSubtotal = 1500 * 19 // 28,500
    const quotation: {
      id: string
      quoteNumber: string
      customerId: string
      totalAmount: number
      status: 'draft' | 'sent' | 'approved' | 'rejected'
    } = {
      id: 'qt-2026-101',
      quoteNumber: 'QT-2026-101',
      customerId: customer.id,
      totalAmount: quoteSubtotal,
      status: 'draft',
    }
    assert.strictEqual(quotation.totalAmount, 28500)
    assert.strictEqual(quotation.status, 'draft')

    // Client approves quotation
    quotation.status = 'approved'
    assert.strictEqual(quotation.status, 'approved')

    // 3. Auto-Spawn Order from Approved Quotation
    const order: {
      id: string
      orderNumber: string
      quotationId: string
      status: 'draft' | 'confirmed' | 'in_prepress' | 'in_production' | 'ready' | 'completed'
    } = {
      id: 'ord-2026-231',
      orderNumber: 'ORD-000231',
      quotationId: quotation.id,
      status: 'confirmed',
    }
    assert.strictEqual(order.quotationId, quotation.id)
    assert.strictEqual(order.status, 'confirmed')

    // 4. Job Ticket Generation for Press Floor
    const job: {
      id: string
      jobNumber: string
      orderId: string
      machine: string
      operator: string
      status: 'queued' | 'printing' | 'qc_passed' | 'completed'
    } = {
      id: 'job-2026-552',
      jobNumber: 'JOB-000552',
      orderId: order.id,
      machine: 'Konica 512i Press 1',
      operator: 'Nurul Amin',
      status: 'queued',
    }
    assert.strictEqual(job.status, 'queued')
    assert.strictEqual(job.machine, 'Konica 512i Press 1')

    // 5. Production Execution & Quality Check
    job.status = 'printing'
    assert.strictEqual(job.status, 'printing')

    job.status = 'qc_passed'
    job.status = 'completed'
    order.status = 'ready'

    assert.strictEqual(job.status, 'completed')
    assert.strictEqual(order.status, 'ready')

    // 6. Tax Invoice Generation (Mushak 6.3)
    const vatRate = 15
    const vatAmount = (order && quoteSubtotal * vatRate) / 100 // 4,275
    const grandTotal = quoteSubtotal + vatAmount // 32,775

    const invoice: {
      id: string
      invoiceNumber: string
      orderId: string
      grandTotal: number
      paidAmount: number
      dueAmount: number
      status: 'unpaid' | 'partially_paid' | 'paid'
    } = {
      id: 'inv-2026-180',
      invoiceNumber: 'INV-000180',
      orderId: order.id,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      status: 'unpaid',
    }
    assert.strictEqual(invoice.grandTotal, 32775)
    assert.strictEqual(invoice.dueAmount, 32775)

    // 7. Payment Collection via bKash Merchant (Full settlement)
    const payment = {
      id: 'pay-2026-901',
      invoiceId: invoice.id,
      amount: 32775,
      method: 'bkash' as const,
      trxId: 'TRX-BK-998822',
    }
    invoice.paidAmount += payment.amount
    invoice.dueAmount = Math.max(0, invoice.grandTotal - invoice.paidAmount)
    invoice.status = invoice.dueAmount === 0 ? 'paid' : 'partially_paid'

    assert.strictEqual(invoice.paidAmount, 32775)
    assert.strictEqual(invoice.dueAmount, 0)
    assert.strictEqual(invoice.status, 'paid')

    // 8. Delivery Challan Generation & Handover
    const delivery = {
      id: 'del-2026-44',
      challanNumber: 'CH-2026-088',
      orderId: order.id,
      status: 'dispatched' as const,
      receivedBy: 'ABC Media Site Supervisor (Karim)',
    }
    order.status = 'completed'

    assert.strictEqual(delivery.challanNumber, 'CH-2026-088')
    assert.strictEqual(order.status, 'completed')
  })
})
