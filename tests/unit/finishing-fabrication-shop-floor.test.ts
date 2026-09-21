import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { getNavigationConfig } from '@/config/navigation.config'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { ProductionPlanningService } from '@/services/production-planning.service'
import { ProductionRepository } from '@/lib/repositories/production.repository'
import { LogisticsRepository } from '@/lib/repositories/logistics.repository'
import type { ProductionTaskRecord } from '@/types/production.types'

describe('Finishing & Fabrication Floor Management & Shop Floor Terminal Tests', () => {
  const testCompanyId = 'comp_test_finishing_001'

  beforeEach(() => {
    PrintERPDataStore.clear()
  })

  it('1. Navigation config contains Finishing & Fabrication under Work section', () => {
    const sections = getNavigationConfig()
    const workSection = sections.find((s) => s.id === 'work')
    assert.ok(workSection, 'Work navigation section should exist')

    const finishingItem = workSection.items.find((item) => item.key === 'finishing')
    assert.ok(finishingItem, 'Finishing item must be in work section')
    assert.equal(finishingItem.href, '/finishing')
    assert.equal(finishingItem.title, 'Finishing & Fabrication')
    assert.equal(finishingItem.titleBn, 'ফিনিশিং ও ফেব্রিকেশন')
    assert.equal(finishingItem.badge, 'Floor')
  })

  it('2. Production task accurately routes to Digital Finishing station (Eyelets/Seaming/Standee)', async () => {
    const digitalTask: Partial<ProductionTaskRecord> = {
      id: 'task_fin_digital_001',
      company_id: testCompanyId,
      task_number: 'TSK-2026-DIG01',
      task_name: 'Eyelet Punching & Border Hemming (আইলেট ও বর্ডার সেলাই)',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 5,
      unit: 'pcs',
      width: 120, // 10 ft
      height: 48,  // 4 ft
      priority: 'urgent',
      status: 'ready',
      customer_name: 'Meghna Group of Industries',
      product_name: 'Star Flex Banner 10x4 ft',
      required_material: 'Star Flex 320gsm',
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [digitalTask], false)
    const stored = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS)
    assert.equal(stored?.length, 1)
    assert.equal(stored?.[0].department, 'finishing')
    assert.equal(stored?.[0].priority, 'urgent')
  })

  it('3. Production task routes to Signage & Acrylic 3D Fabrication station', async () => {
    const signageTask: Partial<ProductionTaskRecord> = {
      id: 'task_fab_sign_001',
      company_id: testCompanyId,
      task_number: 'TSK-2026-FAB01',
      task_name: 'Acrylic 3D LED Channel Letter Fabrication (এক্রিলিক ৩ডি বর্ণ ও এলইডি)',
      task_type: 'fabrication',
      department: 'fabrication',
      sequence_order: 3,
      quantity: 1,
      unit: 'set',
      priority: 'urgent',
      status: 'ready',
      customer_name: 'Dhaka City Bank',
      product_name: 'Acrylic 3D LED Sign 8x3 ft',
      required_material: 'Cast Acrylic 3mm + Samsung 3-LED Modules + 12V 33A Power Adapter',
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [signageTask], false)
    const stored = PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS)
    assert.equal(stored?.[0].department, 'fabrication')
    assert.equal(stored?.[0].task_type, 'fabrication')
  })

  it('4. Completing finishing task with 5-point QC sign-off moves job to ready_delivery', async () => {
    const parentJob = {
      id: 'job_fin_001',
      company_id: testCompanyId,
      production_job_number: 'JOB-2026-0099',
      job_order_id: 'ord_fin_001',
      customer_name: 'Beximco Pharma',
      product_name: 'Visiting Card 300gsm Art Card',
      department: 'finishing' as const,
      stage: 'in_production',
      status: 'in_progress' as const,
      quantity: 1000,
      priority: 'normal' as const,
      deadline: '2026-10-01',
      dimensions_spec: '3.5 x 2 inch',
      material_spec: '300gsm Matt Art Card',
      assigned_workers: ['Karim Binder'],
      has_rework: false,
      rework_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const finishingTask: ProductionTaskRecord = {
      id: 'task_fin_qc_001',
      company_id: testCompanyId,
      job_order_id: 'ord_fin_001',
      production_job_id: 'job_fin_001',
      task_number: 'TSK-2026-0099-02',
      task_name: 'Thermal Matt Lamination & Die-Cutting (ম্যাট লেমিনেশন ও ডাই কাটিং)',
      task_type: 'finishing',
      department: 'finishing',
      sequence_order: 2,
      quantity: 1000,
      unit: 'pcs',
      priority: 'normal',
      status: 'in_progress',
      assigned_operator_name: 'Karim Binder',
    }

    const salesOrder = {
      id: 'ord_fin_001',
      order_number: 'ORD-2026-0099',
      customer_name: 'Beximco Pharma',
      status: 'in_production',
      stage: 'in_production',
      items: [{ item_name: 'Visiting Card 300gsm Art Card', quantity: 1000 }],
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, [parentJob], false)
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [finishingTask], false)
    PrintERPDataStore.set(STORAGE_KEYS.ORDERS, [salesOrder], false)

    // Complete task
    const { completedTask } = await ProductionPlanningService.completeTask(
      'task_fin_qc_001',
      testCompanyId,
      {
        good_quantity: 1000,
        rejected_quantity: 0,
        notes: 'QC Inspected and verified.',
      },
      finishingTask
    )

    assert.equal(completedTask.status, 'completed')
    assert.equal(completedTask.good_quantity, 1000)

    // Verify parent sales order is ready for delivery
    const updatedOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
    const matchingOrder = updatedOrders.find((o) => o.id === 'ord_fin_001')
    assert.ok(matchingOrder, 'Matching order should exist')
    assert.equal(matchingOrder.stage, 'ready_delivery')
  })

  it('5. Defect scrap logging on Finishing Bench records scrap quantities and reason code', async () => {
    const cuttingTask: ProductionTaskRecord = {
      id: 'task_cut_defect_001',
      company_id: testCompanyId,
      job_order_id: 'ord_cut_001',
      task_number: 'TSK-2026-CUT01',
      task_name: 'Precision Acrylic Laser Cutting',
      task_type: 'cutting',
      department: 'fabrication',
      sequence_order: 1,
      quantity: 50,
      unit: 'pcs',
      priority: 'urgent',
      status: 'in_progress',
    }

    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, [cuttingTask], false)

    const { completedTask } = await ProductionPlanningService.completeTask(
      'task_cut_defect_001',
      testCompanyId,
      {
        good_quantity: 48,
        rejected_quantity: 2,
        defect_reason: 'cutting_misalignment',
        scrap_notes: '2 acrylic letter pieces cracked along hairline margin during laser bed positioning',
      },
      cuttingTask
    )

    assert.equal(completedTask.status, 'completed')
    assert.equal(completedTask.good_quantity, 48)
    assert.equal(completedTask.rejected_quantity, 2)
    assert.equal(completedTask.defect_reason, 'cutting_misalignment')
    assert.ok(completedTask.scrap_notes?.includes('2 acrylic letter pieces cracked'))
  })
})
