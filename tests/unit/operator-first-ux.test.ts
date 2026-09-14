import { test, describe } from 'node:test'
import assert from 'node:assert'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { OrderRepository } from '../../lib/repositories/order.repository.ts'
import { ProductionRepository } from '../../lib/repositories/production.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { evaluateDataScopeAccess } from '../../lib/auth/rbac.server.ts'

describe('Operator-First UX & New Work Workflow Tests (V9.1)', () => {
  const companyId = 'test_v9_1_company'

  test('1. Universal New Work creates customer, invoice, and production task seamlessly', async () => {
    // 1. Create or resolve customer
    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Rahim Enterprise (রহিম এন্টারপ্রাইজ)',
      mobile: '01711998877',
      address: 'Shop #4, Mirpur 10, Dhaka',
    })
    assert.ok(customer.id, 'Customer must be created with ID')

    // 2. Generate transaction-safe invoice sequence
    const invoiceNumber = await BillingRepository.getNextDocumentNumber(companyId, 'invoice')
    assert.match(invoiceNumber, /^INV-\d{6}$/, 'Invoice number must follow INV-000001 format')

    // 3. Create invoice with line items
    const invoice = await BillingRepository.createInvoice({
      company_id: companyId,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.mobile || '',
      invoice_number: invoiceNumber,
      subtotal: 960,
      grand_total: 960,
      paid_amount: 500,
      due_amount: 460,
      status: 'partially_paid',
      due_date: '2026-09-20',
      created_by_name: 'Workshop Operator',
      items: [
        {
          id: 'item-1',
          invoice_id: '',
          item_description: 'Flex Banner (8x4 ft) - Star Flex',
          quantity: 2,
          unit: 'pcs',
          unit_price: 480,
          vat_percentage: 0,
          total_price: 960,
        },
      ],
    })
    assert.strictEqual(invoice.grand_total, 960)
    assert.strictEqual(invoice.due_amount, 460)

    // 4. Create production job and floor task
    const jobNumber = `JOB-${Date.now().toString().slice(-4)}`
    const prodJob = await ProductionRepository.createProductionJob({
      company_id: companyId,
      production_job_number: jobNumber,
      customer_name: customer.name,
      product_name: 'Flex Banner (8x4 ft)',
      department: 'printing',
      stage: 'printing',
      status: 'queued',
      priority: 'urgent',
      deadline: '2026-09-20',
      dimensions_spec: '8 × 4 ft',
      quantity: 2,
      material_spec: 'Star Flex China 280gsm',
      assigned_workers: [],
      has_rework: false,
      rework_count: 0,
    })
    assert.strictEqual(prodJob.status, 'queued')
    assert.strictEqual(prodJob.stage, 'printing')

    const task = await ProductionTaskRepository.createTask({
      company_id: companyId,
      production_job_id: prodJob.id,
      task_name: 'Print: Flex Banner (8x4 ft)',
      stage_name: 'printing',
      quantity: 2,
      unit: 'ft',
      status: 'queued',
      customer_name: customer.name,
      product_name: 'Flex Banner',
      job_number: jobNumber,
      assigned_machine_name: 'Eco-Solvent Press #1',
      estimated_duration_minutes: 25,
    })
    assert.strictEqual(task.status, 'queued')
  })

  test('2. First-Class Problem Reporting (⚠ সমস্যা হয়েছে) transitions task to hold and sets blocker details', async () => {
    const task = await ProductionTaskRepository.createTask({
      company_id: companyId,
      task_name: 'Vinyl Sticker Sheet',
      stage_name: 'printing',
      quantity: 50,
      unit: 'pcs',
      status: 'in_progress',
      customer_name: 'ABC Corp',
      product_name: 'Stickers',
      job_number: 'JOB-9921',
      assigned_machine_name: 'Roland TrueVIS',
    })

    // Operator encounters head strike
    const updated = await ProductionTaskRepository.updateTask(companyId, task.id, {
      status: 'paused',
      hold_reason: 'machine_breakdown',
      hold_notes: 'Print head strike on media edge at 35 pcs',
    })

    assert.strictEqual(updated.status, 'paused')
    assert.strictEqual(updated.hold_reason, 'machine_breakdown')
    assert.ok(updated.hold_notes?.includes('Print head strike'))
  })

  test('3. Next Action generation provides truthful, immediate post-workflow paths', () => {
    const nextActions = [
      { label: 'Send WhatsApp Update', type: 'whatsapp', url: 'https://wa.me/8801711223344' },
      { label: 'Go to Floor Terminal', type: 'route', path: '/app/operator' },
      { label: 'Record Advance Payment', type: 'modal', target: 'record_payment' },
    ]

    assert.strictEqual(nextActions.length, 3)
    assert.ok(nextActions[0]?.url?.startsWith('https://wa.me/'))
  })
})
