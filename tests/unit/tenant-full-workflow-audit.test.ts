import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { CustomerRepository } from '../../lib/repositories/customer.repository.ts'
import { QuotationRepository } from '../../lib/repositories/quotation.repository.ts'
import { BillingRepository } from '../../lib/repositories/billing.repository.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { ProductionPlanningService } from '../../services/production-planning.service.ts'
import { ProductionRepository } from '../../lib/repositories/production.repository.ts'
import { InventoryRepository } from '../../lib/repositories/inventory.repository.ts'
import { MachineryRepository } from '../../lib/repositories/machinery.repository.ts'
import { LogisticsRepository } from '../../lib/repositories/logistics.repository.ts'
import type { CustomerRecord } from '../../types/crm.types.ts'
import type { QuotationRecord } from '../../types/quotation.types.ts'
import type { InvoiceRecord, PaymentRecord } from '../../types/billing.types.ts'
import type { ProductionTaskRecord, ProductionJobRecord } from '../../types/production.types.ts'
import type { MachineryRecord } from '../../types/machinery.types.ts'
import type { MaterialRecord } from '../../types/inventory.types.ts'

describe('Comprehensive Tenant Full Workflow Audit (Bangladeshi Digital, Offset & Signage Press)', () => {
  const companyId = 'comp_audit_dhaka_press_2026'

  beforeEach(() => {
    PrintERPDataStore.clear()
  })

  it('Step 1: Customer CRM - Registers Corporate Client with Credit Limit & Bangla Billing Profile', async () => {
    const customer = await CustomerRepository.createCustomer({
      company_id: companyId,
      name: 'Walton Hi-Tech Industries PLC',
      name_bn: 'ওয়ালটন হাই-টেক ইন্ডাস্ট্রিজ পিএলসি',
      phone: '01712345678',
      email: 'procurement@waltonbd.com',
      company_name: 'Walton Bangladesh',
      customer_type: 'corporate',
      credit_limit: 500000,
      opening_balance: 0,
      current_balance: 0,
      total_billed: 0,
      total_paid: 0,
      area: 'Motijheel C/A, Dhaka',
      address: 'Plot 1088, Block I, Motijheel, Dhaka-1000',
      address_bn: 'প্লট ১০৮৮, ব্লক আই, মতিঝিল, ঢাকা-১০০০',
      is_active: true,
    })

    assert.ok(customer.id, 'Customer ID should be generated')
    assert.equal(customer.customer_type, 'corporate')
    assert.equal(customer.credit_limit, 500000)
    assert.equal(customer.name_bn, 'ওয়ালটন হাই-টেক ইন্ডাস্ট্রিজ পিএলসি')

    const storedCustomers = await CustomerRepository.getCustomers(companyId)
    assert.equal(storedCustomers.length, 1)
  })

  it('Step 2: Quotation Engine - Estimates Multi-Domain Print Job (Star Flex, 300gsm Card, Acrylic 3D LED)', async () => {
    const quote: QuotationRecord = {
      id: 'quote_audit_001',
      company_id: companyId,
      quotation_number: 'QUO-2026-00881',
      customer_id: 'cust_walton_001',
      customer_name: 'Walton Hi-Tech Industries PLC',
      customer_phone: '+8801712345678',
      status: 'approved',
      quotation_date: '2026-09-22',
      valid_until: '2026-10-15',
      salesperson_name: 'Tanvir Sales Lead',
      language_mode: 'bilingual',
      subtotal: 45000,
      discount_amount: 1000,
      vat_rate: 0,
      vat_amount: 0,
      grand_total: 44000,
      total_cost: 26000,
      margin_percent: 40.9,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'item_1_flex',
          description: 'Outdoor Star Flex Banner (20ft × 10ft)',
          item_kind: 'custom',
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 200,
          quantity: 2,
          unit: 'pcs',
          unit_rate: 45,
          item_total: 18000,
          material_spec: 'Star Flex 320gsm Frontlit',
          finishing: 'Corner Eyelets & Pipe Pocket',
          artwork_required: true,
        },
        {
          id: 'item_2_visiting_card',
          description: 'Executive Visiting Card (300gsm Art Card, Matt Lam + Gold Foil)',
          item_kind: 'custom',
          width: 3.5,
          height: 2,
          dimension_unit: 'inch',
          area_sft: 0.05,
          quantity: 2000,
          unit: 'pcs',
          unit_rate: 4.5,
          item_total: 9000,
          material_spec: '300gsm Art Card',
          finishing: 'Thermal Matt Lam + Gold Foil Stamping + Die-Cut',
          artwork_required: true,
        },
        {
          id: 'item_3_signage_3d',
          description: 'Walton Showroom Acrylic 3D LED Sign (8ft × 3ft)',
          item_kind: 'custom',
          width: 8,
          height: 3,
          dimension_unit: 'ft',
          area_sft: 24,
          quantity: 1,
          unit: 'pcs',
          unit_rate: 17000,
          item_total: 17000,
          material_spec: 'Cast Acrylic 3mm + Samsung 3-LED + 12V 33A Power Supply',
          finishing: 'Laser Cut, Channel Letter Bending, 12V Wiring',
          artwork_required: true,
        },
      ],
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.QUOTATIONS, quote)

    // Convert Quotation to Invoice
    const invoice = await QuotationRepository.convertQuotationToInvoice(quote.id, companyId, {
      createdByName: 'Tanvir Sales Lead',
    })

    assert.ok(invoice, 'Invoice should be generated')
    assert.equal(invoice.quotation_id, quote.id, 'Quotation ID link preserved')
    assert.equal(invoice.quotation_number, quote.quotation_number, 'Quotation Number link preserved')
    assert.equal(invoice.grand_total, 44000)
    assert.equal(invoice.items.length, 3)

    // Verify converted status
    const updatedQuote = await QuotationRepository.getQuotationById(quote.id, companyId)
    assert.equal(updatedQuote?.status, 'converted')
  })

  it('Step 3: Billing & Collections - Ingests 50% Advance with Money Receipt & NBR Mushak 6.3 Compliance', async () => {
    const invoice: InvoiceRecord = {
      id: 'inv_audit_001',
      company_id: companyId,
      invoice_number: 'INV-2026-00991',
      customer_id: 'cust_walton_001',
      customer_name: 'Walton Hi-Tech Industries PLC',
      customer_phone: '+8801712345678',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-09-22',
      due_date: '2026-09-30',
      subtotal: 44000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 44000,
      paid_amount: 22000, // 50% Token Advance in Bangladesh
      due_amount: 22000,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'POS Cashier',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'inv_item_1',
          invoice_id: 'inv_audit_001',
          item_description: 'Outdoor Star Flex Banner (20ft × 10ft)',
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 200,
          quantity: 2,
          unit: 'pcs',
          unit_price: 9000,
          total_price: 18000,
          workflow_routing: 'design_required',
          design_required: true,
          finishing: 'Corner Eyelets & Pipe Pocket',
        },
      ],
    }

    const advancePayment: PaymentRecord = {
      id: 'pay_adv_001',
      company_id: companyId,
      payment_number: 'PAY-2026-00991',
      receipt_number: 'MR-2026-00991',
      invoice_id: 'inv_audit_001',
      invoice_number: 'INV-2026-00991',
      customer_id: 'cust_walton_001',
      customer_name: 'Walton Hi-Tech Industries PLC',
      amount: 22000,
      payment_method: 'bkash',
      payment_date: '2026-09-22',
      transaction_reference: 'TRX-BKASH-998822',
      collected_by_name: 'Cashier Rashed',
      status: 'completed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)
    PrintERPDataStore.addItem(STORAGE_KEYS.PAYMENTS, advancePayment)

    const storedInvoice = await BillingRepository.getInvoiceById(invoice.id, companyId)
    assert.equal(storedInvoice?.paid_amount, 22000)
    assert.equal(storedInvoice?.due_amount, 22000)
    assert.equal(storedInvoice?.status, 'partially_paid')

    const storedPayments = await BillingRepository.getPayments(companyId)
    assert.equal(storedPayments.length, 1)
    assert.equal(storedPayments[0].receipt_number, 'MR-2026-00991')
  })

  it('Step 4: Design Gate & Preflight - Designer Uploads CMYK Artwork and WhatsApp Proofs Client', async () => {
    const designJob = await DesignRepository.createDesignJob({
      company_id: companyId,
      title: 'Walton Showroom Outdoor Flex Banner 20x10 ft',
      customer_id: 'cust_walton_001',
      customer_name: 'Walton Hi-Tech Industries PLC',
      deadline: '2026-09-25',
      priority: 'urgent',
      status: 'received',
      workflow_routing: 'design_required',
      commercial_status: 'invoice_created',
      invoice_number: 'INV-2026-00991',
      instructions: 'Corporate Navy Blue theme with high resolution product photos',
    })

    assert.ok(designJob.id)
    assert.equal(designJob.status, 'received')

    // Step 4a: Designer works on artwork
    const inReview = await DesignRepository.updateDesignJob(designJob.id, companyId, {
      status: 'in_review',
      artwork_proof_url: 'https://cdn.printerp.com/artworks/walton-flex-20x10.pdf',
    })
    assert.equal(inReview?.status, 'in_review')

    // Step 4b: Customer Approves Artwork via WhatsApp Link -> Pre-press Gate Cleared
    const approved = await DesignRepository.updateDesignJob(designJob.id, companyId, {
      status: 'approved',
      workflow_routing: 'ready_production',
    })
    assert.equal(approved?.status, 'approved')
  })

  it('Step 5: Production Floor & Machinery Roll Deduction - Prints on Fleet Printer and Consumes Roll Length', async () => {
    // 5a. Register Machine
    const printer: MachineryRecord = {
      id: 'mach_flora_320',
      company_id: companyId,
      name: 'Flora Konica 512i (10.5ft Wide Format)',
      code: 'FLR-01',
      machine_type: 'solvent_printer',
      department: 'printing',
      status: 'available',
      speed_sqft_per_hour: 450,
      max_width: 126,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MACHINERIES, printer)

    // 5b. Mount Star Flex Roll (10ft width, 150ft length = 1500 SFT)
    const material: MaterialRecord = {
      id: 'mat_flex_320',
      company_id: companyId,
      name: 'Star Flex Frontlit 320gsm (10ft roll)',
      sku: 'MED-FLX-320',
      category: 'wide_format_media',
      unit: 'sqft',
      current_stock: 4500,
      average_cost: 13.5,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.MATERIALS, material)

    const roll = await InventoryRepository.createPhysicalRoll({
      company_id: companyId,
      material_id: material.id,
      roll_tag: 'TAG-FLX-10FT-001',
      width_ft: 10,
      initial_length_ft: 150,
      current_length_ft: 150,
      total_area_sft: 1500,
      remaining_area_sft: 1500,
      status: 'mounted',
      mounted_machine_id: printer.id,
      mounted_machine_name: printer.name,
      location_name: 'Flora Press Stand 1',
    })

    // 5c. Print Task: 2 pcs of 20ft × 10ft = 400 SFT (40 linear feet on 10ft roll)
    const printTask: ProductionTaskRecord = {
      id: 'task_prn_walton_01',
      company_id: companyId,
      job_order_id: 'job_walton_01',
      task_number: 'TSK-PRN-00991',
      task_name: 'Flora 512i Banner Printing',
      task_type: 'printing',
      department: 'printing',
      status: 'in_progress',
      assigned_machine_id: printer.id,
      assigned_machine_name: printer.name,
      mounted_roll_id: roll.id,
      width: 10,
      height: 20,
      quantity: 2,
      unit: 'sft',
      sequence_order: 1,
    }
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, printTask)

    // Complete Task with scrap recording
    const { completedTask } = await ProductionPlanningService.completeTask(
      printTask.id,
      companyId,
      {
        good_quantity: 400,
        rejected_quantity: 20,
        defect_reason: 'banding',
        scrap_notes: '1 meter nozzle banding during early start, purged heads and resumed',
        consumed_material_qty: 420,
        consumed_material_unit: 'sft',
        mounted_roll_id: roll.id,
      },
      printTask
    )

    assert.equal(completedTask.status, 'completed')
    assert.equal(completedTask.good_quantity, 400)
    assert.equal(completedTask.rejected_quantity, 20)

    // Verify remaining roll SFT decreased (1500 - 420 = 1080 SFT)
    const updatedRoll = await InventoryRepository.getPhysicalRollById(roll.id, companyId)
    assert.equal(updatedRoll?.remaining_area_sft, 1080)
    assert.equal(updatedRoll?.current_length_ft, 108)
  })

  it('Step 6: Finishing & Signage Fabrication Floor - Eyeletting & 5-Point QC Sign-Off', async () => {
    const parentJob: ProductionJobRecord = {
      id: 'job_walton_01',
      company_id: companyId,
      production_job_number: 'JOB-2026-00991',
      job_order_id: 'ord_walton_01',
      customer_name: 'Walton Hi-Tech Industries PLC',
      product_name: 'Outdoor Star Flex Banner (20ft × 10ft)',
      department: 'finishing',
      stage: 'in_production',
      status: 'in_progress',
      quantity: 2,
      priority: 'urgent',
      deadline: '2026-09-25',
      dimensions_spec: '20 × 10 ft',
      material_spec: 'Star Flex 320gsm',
      assigned_workers: ['Salam Craftsman'],
      has_rework: false,
      rework_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'task_fin_walton_01',
      company_id: companyId,
      job_order_id: 'ord_walton_01',
      production_job_id: 'job_walton_01',
      task_number: 'TSK-FIN-00991',
      task_name: 'Border Hemming & Eyelet Rings (আইলেট ও বর্ডার সেলাই)',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 2,
      unit: 'pcs',
      priority: 'urgent',
      status: 'in_progress',
      assigned_operator_name: 'Salam Craftsman',
    }

    const salesOrder = {
      id: 'ord_walton_01',
      order_number: 'ORD-2026-00991',
      customer_name: 'Walton Hi-Tech Industries PLC',
      status: 'in_production',
      stage: 'in_production',
      items: [{ item_name: 'Outdoor Star Flex Banner (20ft × 10ft)', quantity: 2 }],
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, parentJob)
    PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_TASKS, finishingTask)
    PrintERPDataStore.addItem(STORAGE_KEYS.ORDERS, salesOrder)

    // Complete Finishing Task with 5-Point QC
    const { completedTask } = await ProductionPlanningService.completeTask(
      finishingTask.id,
      companyId,
      {
        good_quantity: 2,
        rejected_quantity: 0,
        notes: '5-Point QC Approved: 12 Brass Eyelets verified, clean border folds, packed in waterproof foil.',
      },
      finishingTask
    )

    assert.equal(completedTask.status, 'completed')
    assert.equal(completedTask.good_quantity, 2)

    // Downstream Sales Order updated to ready_delivery
    const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = orders.find((o) => o.id === 'ord_walton_01')
    assert.equal(matchingOrder?.stage, 'ready_delivery')
  })

  it('Step 7: Delivery Challan Synthesis & Full Completion Handshake', async () => {
    const invoice: InvoiceRecord = {
      id: 'inv_del_walton_01',
      company_id: companyId,
      invoice_number: 'INV-2026-00991',
      customer_id: 'cust_walton_001',
      customer_name: 'Walton Hi-Tech Industries PLC',
      customer_phone: '+8801712345678',
      customer_address: 'Plot 1088, Block I, Motijheel, Dhaka',
      invoice_type: 'sales_invoice',
      invoice_date: '2026-09-22',
      due_date: '2026-09-30',
      subtotal: 44000,
      discount_amount: 0,
      vat_percentage: 0,
      vat_amount: 0,
      grand_total: 44000,
      paid_amount: 22000,
      due_amount: 22000,
      write_off_amount: 0,
      status: 'partially_paid',
      created_by_name: 'Cashier Rashed',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: [
        {
          id: 'it_walton_1',
          invoice_id: 'inv_del_walton_01',
          item_description: 'Outdoor Star Flex Banner (20ft × 10ft)',
          width: 20,
          height: 10,
          dimension_unit: 'ft',
          area_sft: 200,
          quantity: 2,
          unit: 'pcs',
          unit_price: 9000,
          total_price: 18000,
          workflow_routing: 'ready_production',
          item_kind: 'custom_manufacturing',
        },
      ],
    }

    PrintERPDataStore.addItem(STORAGE_KEYS.INVOICES, invoice)

    const challans = await LogisticsRepository.getChallans(companyId)
    assert.equal(challans.length, 1)
    const ch = challans[0]
    assert.equal(ch.challan_number, 'CHL-2026-00991')
    assert.equal(ch.customer_name, 'Walton Hi-Tech Industries PLC')
    assert.equal(ch.due_amount, 22000, 'Highlights remaining ৳22,000 due collection on delivery gate pass')

    // Confirm delivery sign-off
    const deliveredChallan = PrintERPDataStore.updateItem(STORAGE_KEYS.DELIVERY_CHALLANS, ch.id, {
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      receiver_name: 'Engr. Enamul Hoque (Walton Project Manager)',
      receiver_phone: '+8801712345678',
      receiver_signature: 'Received 2 pcs banners in intact condition with 12 brass eyelets',
    })

    assert.equal(deliveredChallan?.status, 'delivered')
    assert.equal(deliveredChallan?.receiver_name, 'Engr. Enamul Hoque (Walton Project Manager)')
  })
})
