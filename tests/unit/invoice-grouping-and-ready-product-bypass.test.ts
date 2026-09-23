import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'
import { DesignRepository } from '../../lib/repositories/design.repository.ts'
import { ProductionTaskRepository } from '../../lib/repositories/production-task.repository.ts'
import { LogisticsRepository } from '../../lib/repositories/logistics.repository.ts'
import { isReadyProduct, isOutsourceProduct, isServiceProduct } from '../../lib/units.ts'

test('Unified Invoice Item Grouping & Ready Product Bypass Across Panels', async (t) => {
  const testCompanyId = 'comp-test-invoice-grouping'

  // Reset stores for test
  PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [])
  PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])
  PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [])
  PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [])

  await t.test('1. Ready product identification helpers work reliably', () => {
    const readyStand = {
      product_name: 'X-Stand Banner Holder 2x5ft',
      item_name: 'X-Stand Banner Holder 2x5ft',
      product_type: 'ready_product',
      unit: 'pcs',
      quantity: 2,
    }
    const customBanner = {
      product_name: 'PVC Vinyl Banner Print',
      item_name: 'PVC Vinyl Banner Print',
      product_type: 'production_product',
      width: 5,
      height: 3,
      unit: 'sft',
      workflow_routing: 'design_required',
    }
    const outsourceDeboss = {
      product_name: 'Gold Foil Debossing (Vendor)',
      item_name: 'Gold Foil Debossing (Vendor)',
      product_type: 'outsource',
      item_kind: 'outsource',
      unit: 'pcs',
    }

    assert.equal(isReadyProduct(readyStand), true, 'X-Stand must be recognized as ready product')
    assert.equal(isReadyProduct(customBanner), false, 'Custom banner must not be recognized as ready product')
    assert.equal(isOutsourceProduct(outsourceDeboss), true, 'Outsource item must be recognized as outsource')
  })

  await t.test('2. Design Panel: Mixed invoice generates design job ONLY for custom print, ready product bypasses design task queue', async () => {
    const mixedInvoice = {
      id: 'inv-mixed-001',
      company_id: testCompanyId,
      invoice_number: 'INV-MIX-001',
      customer_name: 'Prime Media Ltd',
      customer_phone: '01711223344',
      due_date: '2026-10-01',
      items: [
        {
          id: 'item-custom-banner',
          item_name: 'PVC Flex Backlit Banner',
          item_description: 'Backlit Signboard Flex 10x4ft',
          width: 10,
          height: 4,
          unit: 'sft',
          quantity: 1,
          workflow_routing: 'design_required',
          design_required: true,
        },
        {
          id: 'item-ready-xstand',
          item_name: 'Roll-up Standee Hardware 6x3ft',
          item_description: 'Roll-up Standee Hardware 6x3ft (In-Stock)',
          product_type: 'ready_product',
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          quantity: 2,
          unit: 'pcs',
        },
        {
          id: 'item-outsource-crest',
          item_name: 'Wooden Crest Laser Engraving',
          product_type: 'outsource',
          item_kind: 'outsource',
          quantity: 5,
          unit: 'pcs',
        },
      ],
    }

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [mixedInvoice])

    await DesignRepository.createDesignJob({
      id: 'dsn-banner-001',
      company_id: testCompanyId,
      invoice_id: 'inv-mixed-001',
      invoice_number: 'INV-MIX-001',
      customer_name: 'Prime Media Ltd',
      customer_phone: '01711223344',
      title: 'Backlit Signboard Flex 10x4ft',
      workflow_routing: 'design_required',
      all_invoice_items: mixedInvoice.items,
      status: 'received',
    } as any)

    const designJobs = await DesignRepository.getDesignJobs(testCompanyId)

    // Only the Custom Banner should generate a DesignJobRecord
    assert.equal(designJobs.length, 1, 'Should create exactly 1 design job for the custom banner')
    assert.equal(designJobs[0].invoice_id, 'inv-mixed-001')
    assert.equal(designJobs[0].title, 'Backlit Signboard Flex 10x4ft')
    assert.equal(designJobs[0].workflow_routing, 'design_required')

    // Sibling items (all_invoice_items) must be present for invoice grouping
    assert.ok(designJobs[0].all_invoice_items, 'all_invoice_items must be attached')
    assert.equal(designJobs[0].all_invoice_items.length, 3, 'All 3 items must be available for group rendering')

    // Ready Product should NOT be in designJobs list
    const hasReadyProductAsDesignJob = designJobs.some((j) => j.title.includes('Roll-up Standee'))
    assert.equal(hasReadyProductAsDesignJob, false, 'Ready product must not become a standalone design job')
  })

  await t.test('3. Design Panel: All-ready-product invoice completely bypasses Design Panel (0 design jobs)', async () => {
    const readyOnlyInvoice = {
      id: 'inv-ready-only-002',
      company_id: testCompanyId,
      invoice_number: 'INV-READY-002',
      customer_name: 'Walk-in Frame Buyer',
      customer_phone: '01811223344',
      items: [
        {
          id: 'item-ready-frame-1',
          item_name: 'Photo Frame A4 Black',
          product_type: 'ready_product',
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          quantity: 10,
          unit: 'pcs',
        },
        {
          id: 'item-ready-ink',
          item_name: 'Eco Solvent Cleaning Solution Bottle',
          product_type: 'ready_product',
          item_kind: 'ready_product',
          workflow_routing: 'ready_product',
          quantity: 1,
          unit: 'bottle',
        },
      ],
    }

    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, [readyOnlyInvoice])
    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [])

    const designJobs = await DesignRepository.getDesignJobs(testCompanyId)
    assert.equal(designJobs.length, 0, 'Invoices with only ready products must produce 0 design jobs')
  })

  await t.test('4. Production Panel: Ready products bypass machine task generation', async () => {
    // Add an approved design job that is a ready product vs custom job
    const approvedCustomJob = {
      id: 'dsn-custom-001',
      company_id: testCompanyId,
      design_number: 'DSN-001',
      title: 'Visiting Card 300gsm Matt',
      customer_name: 'Karim Brothers',
      status: 'approved' as const,
      workflow_routing: 'ready_production' as const,
      customer_approval_required: false,
      versions: [{ is_approved: true }],
      created_at: new Date().toISOString(),
    }

    const approvedReadyProductJob = {
      id: 'dsn-ready-002',
      company_id: testCompanyId,
      design_number: 'DSN-002',
      title: 'Ready Standee Frame',
      product_type: 'ready_product',
      item_kind: 'ready_product',
      workflow_routing: 'ready_product' as const,
      customer_name: 'Karim Brothers',
      status: 'approved' as const,
      customer_approval_required: false,
      versions: [{ is_approved: true }],
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, [approvedCustomJob, approvedReadyProductJob])

    const productionTasks = await ProductionTaskRepository.getTasks(testCompanyId)

    // Should only create printing and finishing tasks for the custom job
    const customTasks = productionTasks.filter((t) => t.task_name.includes('Visiting Card'))
    const readyTasks = productionTasks.filter((t) => t.task_name.includes('Ready Standee'))

    assert.ok(customTasks.length > 0, 'Custom print job must generate machine production tasks')
    assert.equal(readyTasks.length, 0, 'Ready product must NOT generate machine production tasks')
  })

  await t.test('5. Delivery Panel: Mixed invoice groups items into unified challan with ready product marked ready_for_delivery immediately', async () => {
    const createdChallan = await LogisticsRepository.createChallan({
      company_id: testCompanyId,
      challan_number: 'CHL-DEL-999',
      invoice_id: 'inv-delivery-test',
      invoice_number: 'INV-DEL-999',
      recipient_name: 'Dhaka Trade House',
      recipient_phone: '01911223344',
      delivery_address: 'Motijheel C/A, Dhaka',
      status: 'draft',
      items: [
        {
          id: 'item-del-banner',
          product_name: 'Outdoor BillBoard Flex',
          product_description: 'Outdoor BillBoard Flex 20x10ft',
          quantity: 1,
          delivered_quantity: 0,
          remaining_quantity: 1,
          unit: 'pcs',
          item_kind: 'custom_manufacturing',
          status: 'pending',
        },
        {
          id: 'item-del-stand',
          product_name: 'X-Standee Metal Base',
          product_description: 'X-Standee Metal Base',
          quantity: 4,
          delivered_quantity: 0,
          remaining_quantity: 4,
          unit: 'pcs',
          item_kind: 'ready_product',
          status: 'ready_for_delivery',
        },
      ],
    } as any)

    const challans = await LogisticsRepository.getChallans(testCompanyId)
    const matchedChallan = challans.find((c) => c.id === createdChallan.id || c.invoice_number === 'INV-DEL-999')

    assert.ok(matchedChallan, 'Must find created delivery challan for the invoice')
    assert.equal(matchedChallan.items.length, 2, 'Challan must contain all grouped items of the invoice')

    const bannerItem = matchedChallan.items.find((it) => it.product_description?.includes('BillBoard'))
    const standItem = matchedChallan.items.find((it) => it.product_description?.includes('X-Standee'))

    assert.ok(bannerItem, 'Banner item must be in challan')
    assert.ok(standItem, 'Stand item must be in challan')

    assert.equal(standItem?.item_kind, 'ready_product', 'Stand must have item_kind="ready_product"')
    assert.equal(standItem?.status, 'ready_for_delivery', 'Ready stock product must immediately have status="ready_for_delivery"')
  })
})
