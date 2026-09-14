import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert'
import { BranchManagementService } from '../../services/branch-management.service.ts'
import { CrossBranchOperationsService } from '../../services/cross-branch-operations.service.ts'
import { BranchAnalyticsService } from '../../services/branch-analytics.service.ts'
import { WorkflowRoutingService } from '../../services/workflow-routing.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Multi-Branch Enterprise Lifecycle Integration Suite (V9)', () => {
  const companyId = 'enterprise-print-v9-e2e'

  beforeEach(() => {
    PrintERPDataStore.clearAll(companyId)
  })

  test('End-to-End Multi-Branch Flow: Branch Setup -> Sales -> Production Routing -> Inventory Transfer -> Finance -> Consolidated Analytics', async () => {
    // 1. Setup 2 Physical Branches: Dhaka HQ & Uttara Factory
    const dhakaBranch = await BranchManagementService.createBranch(companyId, {
      name: 'Dhaka Headquarters & Commercial Outlet',
      name_bn: 'ঢাকা প্রধান কার্যালয় ও শোরুম',
      code: 'DHK-HQ',
      phone: '01711000001',
      address: 'Motijheel Commercial Area, Dhaka-1000',
      is_main: true,
      manager_name: 'Tanvir Hossain',
    })

    const uttaraBranch = await BranchManagementService.createBranch(companyId, {
      name: 'Uttara Large-Format Print Factory',
      name_bn: 'উত্তরা লার্জ ফরম্যাট প্রিন্ট ফ্যাক্টরি',
      code: 'UTR-FCT',
      phone: '01711000002',
      address: 'Sector 3, Uttara, Dhaka-1230',
      is_main: false,
      manager_name: 'Farhan Ahmed',
    })

    assert.ok(dhakaBranch.id)
    assert.ok(uttaraBranch.id)
    assert.strictEqual(dhakaBranch.is_main, true)
    assert.strictEqual(uttaraBranch.is_main, false)

    // 2. Configure Inventory & Stocks
    const vinylMatId = 'mat-vinyl-glossy'
    PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, companyId, [
      {
        id: vinylMatId,
        company_id: companyId,
        branch_id: dhakaBranch.id,
        name: 'Glossy Vinyl Roll 5ft',
        unit: 'sqft',
        unit_cost: 45,
        current_stock: 500,
        min_stock_level: 50,
      },
    ])

    // 3. Configure Workflow Rule: Transfers > 100 sqft require manager approval
    await WorkflowRoutingService.configureWorkflow(
      companyId,
      'inventory_transfer',
      { auto_approve_max_quantity: 100, require_manager_approval: false },
      dhakaBranch.id
    )

    const smallEvaluation = await WorkflowRoutingService.evaluateTransferApproval(
      companyId,
      50,
      'vinyl',
      dhakaBranch.id
    )
    assert.strictEqual(smallEvaluation.requiresApproval, false, '50 sqft should auto-approve')

    const largeEvaluation = await WorkflowRoutingService.evaluateTransferApproval(
      companyId,
      200,
      'vinyl',
      dhakaBranch.id
    )
    assert.strictEqual(largeEvaluation.requiresApproval, true, '200 sqft exceeds 100 threshold')

    // 4. Request, Dispatch & Receive Transfer of 150 sqft from Dhaka to Uttara
    const transfer = await CrossBranchOperationsService.requestTransfer(companyId, {
      from_branch_id: dhakaBranch.id,
      to_branch_id: uttaraBranch.id,
      material_id: vinylMatId,
      quantity: 150,
    })

    await CrossBranchOperationsService.approveTransfer(companyId, transfer.id, {
      id: 'tanvir-mgr',
      name: 'Tanvir Hossain',
    })
    await CrossBranchOperationsService.dispatchTransfer(companyId, transfer.id, {
      id: 'dhaka-dispatch',
      name: 'Dhaka Logistics',
    })
    await CrossBranchOperationsService.receiveTransfer(companyId, transfer.id, {
      id: 'uttara-receive',
      name: 'Uttara Storekeeper',
    })

    // 5. Commercial Sales: Customer places ৳75,000 Billboard Order booked at Dhaka HQ
    const invoiceId = 'inv-bb-001'
    PrintERPDataStore.set(STORAGE_KEYS.INVOICES, companyId, [
      {
        id: invoiceId,
        company_id: companyId,
        branch_id: dhakaBranch.id,
        total_amount: 75000,
        status: 'paid',
        created_at: new Date().toISOString(),
      },
    ])

    PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, companyId, [
      {
        id: 'pay-bb-001',
        company_id: companyId,
        branch_id: dhakaBranch.id,
        amount: 75000,
      },
    ])

    // 6. Cross-Branch Production Routing: Route Heavy Billboard Printing from Dhaka to Uttara Factory
    const taskId = 'task-print-bb-001'
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, companyId, [
      {
        id: taskId,
        company_id: companyId,
        branch_id: dhakaBranch.id,
        name: 'Print 20x10ft Frontlit Billboard',
        status: 'queued',
      },
    ])

    const routedTask = await CrossBranchOperationsService.routeProductionTaskToBranch(
      companyId,
      taskId,
      uttaraBranch.id,
      { id: 'ops-lead', name: 'Production Planner' },
      'Uttara has 10ft Roland High-Speed Solvent Press'
    )
    assert.strictEqual(routedTask.branch_id, uttaraBranch.id)

    // Complete task in Uttara
    const allTasks = PrintERPDataStore.get<any>(STORAGE_KEYS.PRODUCTION_TASKS, companyId) || []
    allTasks[0].status = 'completed'
    PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, companyId, allTasks)

    // 7. Temporary Employee Deployment: Deploy Vinyl Fabricator from Dhaka to Uttara for 3 days
    const empId = 'emp-fabricator-01'
    PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, companyId, [
      {
        id: empId,
        company_id: companyId,
        branch_id: dhakaBranch.id,
        name: 'Habibur Rahman',
        designation: 'Master Fabricator',
      },
    ])

    const assignment = await CrossBranchOperationsService.assignEmployeeToBranch(
      companyId,
      {
        employee_id: empId,
        branch_id: uttaraBranch.id,
        start_date: '2026-09-15',
        end_date: '2026-09-18',
        notes: 'Signage welding and frame installation support',
      }
    )
    assert.strictEqual(assignment.status, 'active')
    assert.strictEqual(assignment.branch_id, uttaraBranch.id)

    // 8. Inter-Branch Financial Settlement: Transfer ৳20,000 operational cash from Dhaka HQ to Uttara Factory
    const finTransfer = await CrossBranchOperationsService.requestFinancialTransfer(
      companyId,
      {
        from_branch_id: dhakaBranch.id,
        to_branch_id: uttaraBranch.id,
        amount: 20000,
        currency: 'BDT',
        reference: 'DHK-UTR-OPS-SETTLE-01',
      }
    )

    await CrossBranchOperationsService.completeFinancialTransfer(
      companyId,
      finTransfer.id,
      { id: 'cfo', name: 'Chief Accountant' }
    )

    // 9. Consolidated Executive Multi-Branch Reconciliation
    const dashboard = await BranchAnalyticsService.getConsolidatedDashboard(companyId)

    assert.strictEqual(dashboard.active_branch_count, 2)
    assert.strictEqual(dashboard.kpis.revenue, 75000)
    assert.strictEqual(dashboard.kpis.receivables, 0, 'Full payment collected')
    assert.strictEqual(dashboard.kpis.employee_count, 1)
  })
})
