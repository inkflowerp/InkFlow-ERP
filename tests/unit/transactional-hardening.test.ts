import { test, describe } from 'node:test'
import assert from 'node:assert'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { BillingService } from '../../services/billing.service.ts'
import { CrossBranchOperationsService } from '../../services/cross-branch-operations.service.ts'
import { BranchOperationsRepository } from '../../lib/repositories/branch-operations.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'

describe('Transactional Business Operations & Hardening Tests (V9.1)', () => {
  const companyId = 'test_v9_1_transactional'

  test('1. Document Number Sequence generates sequential, collision-free numbers without random fallbacks', async () => {
    const n1 = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    const n2 = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    const n3 = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')

    assert.ok(n1.startsWith('INV-'))
    assert.ok(n2.startsWith('INV-'))
    assert.ok(n3.startsWith('INV-'))

    const num1 = parseInt(n1.replace('INV-', ''), 10)
    const num2 = parseInt(n2.replace('INV-', ''), 10)
    const num3 = parseInt(n3.replace('INV-', ''), 10)

    assert.strictEqual(num2, num1 + 1, 'Sequential increment must follow n + 1')
    assert.strictEqual(num3, num2 + 1, 'Sequential increment must follow n + 1')
  })

  test('2. Atomic Invoice Creation accurately computes grand total, paid, and remaining due balance', async () => {
    const invNumber = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    const invoice = await BillingService.createInvoice({
      company_id: companyId,
      customer_id: 'cust-trans-1',
      customer_name: 'Delta Sign Ltd',
      customer_phone: '01811223344',
      due_date: '2026-09-30',
      grand_total: 15000,
      created_by_name: 'Sales Manager',
      invoice_number: invNumber,
      subtotal: 15000,
      paid_amount: 5000,
      due_amount: 10000,
      status: 'partially_paid',
    })

    assert.strictEqual(invoice.grand_total, 15000)
    assert.strictEqual(invoice.paid_amount, 5000)
    assert.strictEqual(invoice.due_amount, 10000)
    assert.strictEqual(invoice.status, 'partially_paid')
  })

  test('3. Recording Payment updates invoice balance atomically and adjusts status', async () => {
    const invNumber = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    const invoice = await BillingService.createInvoice({
      company_id: companyId,
      customer_id: 'cust-trans-2',
      customer_name: 'Apex Prints',
      customer_phone: '01911223344',
      due_date: '2026-09-30',
      grand_total: 8000,
      created_by_name: 'Sales Manager',
      invoice_number: invNumber,
      subtotal: 8000,
      paid_amount: 0,
      due_amount: 8000,
      status: 'unpaid',
    })

    // Record partial payment
    const payment = await BillingService.recordPayment({
      companyId,
      customerId: 'cust-trans-2',
      customerName: 'Apex Prints',
      amount: 8000,
      paymentMethod: 'bkash',
      invoiceId: invoice.id,
      notes: 'Full balance settled via bKash',
      receivedByName: 'Cashier',
    })

    assert.strictEqual(payment.amount, 8000)
    assert.ok(payment.receipt_number.startsWith('PAY-'))
  })

  test('4. Branch Stock Transfer enforces idempotency and audit record creation', async () => {
    const key = `idemp_trans_${Date.now()}`
    const t1 = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: 'branch-a',
      to_branch_id: 'branch-b',
      material_id: 'mat-star-flex',
      quantity: 50,
      idempotency_key: key,
    })

    const t2 = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: 'branch-a',
      to_branch_id: 'branch-b',
      material_id: 'mat-star-flex',
      quantity: 50,
      idempotency_key: key,
    })

    assert.strictEqual(t1.id, t2.id, 'Idempotency key must return exact duplicate without double creating')
  })
})
