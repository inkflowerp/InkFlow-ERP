import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceService } from '../../services/workforce.service.ts'
import { WorkforceRepository } from '../../lib/repositories/workforce.repository.ts'
import { CostingRepository } from '../../lib/repositories/costing.repository.ts'
import type { JobCostingRecord } from '../../types/costing.types.ts'

describe('Workforce + Attendance + Costing Lifecycle Integration Test (V6)', () => {
  const companyId = 'co-workforce-lifecycle-test-v6'

  test('completes the full workforce, shift, daily worker, and V4 costing reconciliation cycle', async () => {
    // 1. Create a Master Employee with Bengali Unicode & Responsibilities
    const employee = await WorkforceService.createEmployee({
      company_id: companyId,
      name: 'Tanvir Hossain',
      name_bn: 'তানভীর হোসেন',
      mobile: '+8801711223344',
      email: 'tanvir@inkflow.com.bd',
      role: 'Machine Operator',
      responsibilities: ['Machine Operator', 'Finishing Operator'],
      department: 'printing',
      employee_type: 'permanent',
      base_salary: 30000,
      hourly_rate: 150,
      overtime_hourly_rate: 225,
      is_daily_worker: false,
    })

    assert.ok(employee.id)
    assert.match(employee.employee_id_number, /^EMP-\d{4}-\d{6}$/)
    assert.strictEqual(employee.name_bn, 'তানভীর হোসেন')
    assert.ok(employee.responsibilities?.includes('Machine Operator'))

    // 2. Create an Overnight Shift (22:00 -> 06:00)
    const nightShift = await WorkforceService.createShift({
      company_id: companyId,
      shift_code: 'SHF-NIGHT-01',
      shift_name: 'Overnight Production Run',
      start_time: '22:00',
      end_time: '06:00',
      is_overnight: true,
      break_duration_minutes: 60,
      overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
    })

    assert.strictEqual(nightShift.is_overnight, true)
    const shiftHours = WorkforceService.calculateShiftDurationHours(nightShift)
    assert.strictEqual(shiftHours, 7)

    // 3. Assign Shift to Employee
    const assignment = await WorkforceRepository.assignShiftToEmployee({
      id: 'asgn-1',
      company_id: companyId,
      employee_id: employee.id,
      shift_id: nightShift.id,
      effective_from: '2026-09-14',
      is_active: true,
      created_at: new Date().toISOString(),
    })

    assert.strictEqual(assignment.shift_id, nightShift.id)
    const activeShift = await WorkforceRepository.getActiveShiftForEmployee(employee.id, companyId)
    assert.strictEqual(activeShift?.id, nightShift.id)

    // 4. Create a Daily Labor Worker for a specific Job Order
    const dailyWorker = await WorkforceService.createEmployee({
      company_id: companyId,
      name: 'Rahim Mia',
      name_bn: 'রহিম মিয়া',
      mobile: '+8801811556677',
      role: 'Daily Fabricator',
      department: 'fabrication',
      employee_type: 'daily_labor',
      daily_rate: 1000,
      is_daily_worker: true,
    })

    assert.strictEqual(dailyWorker.is_daily_worker, true)

    // 5. Create V4 Job Costing baseline
    const jobOrderId = 'job-order-v6-test-101'
    const jobNumber = 'JOB-2026-101'
    const costingRecord: JobCostingRecord = {
      id: 'jc-v6-101',
      company_id: companyId,
      job_id: jobOrderId,
      job_number: jobNumber,
      customer_id: 'cust-101',
      customer_name: 'Test Customer',
      item_title: 'Outdoor Billboard Signage',
      quantity: 1,
      unit: 'pcs',
      selling_price: 15000,
      est: {
        material_cost: 5000,
        machine_cost: 1500,
        ink_cost: 0,
        printing_cost: 0,
        finishing_cost: 0,
        labor_cost: 2000,
        fabrication_cost: 0,
        installation_cost: 0,
        transport_cost: 0,
        other_cost: 500,
        total_cost: 9000,
        profit: 6000,
        margin_percentage: 40,
      },
      act: {
        material_cost: 4800,
        machine_cost: 1400,
        ink_cost: 0,
        printing_cost: 0,
        finishing_cost: 0,
        labor_cost: 0,
        fabrication_cost: 0,
        installation_cost: 0,
        transport_cost: 0,
        other_cost: 500,
        total_cost: 6700,
        profit: 8300,
        margin_percentage: 55.3,
      },
      variances: {
        material_variance: -200,
        machine_variance: -100,
        labor_variance: -2000,
        finishing_variance: 0,
        transport_variance: 0,
        total_variance: -2300,
      },
      costing_snapshot: {},
      labor_cost_mode: 'daily_worker',
      status: 'estimated',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    await CostingRepository.createJobCosting(costingRecord)

    // 6. Log Daily Labor work against this specific Job
    const laborLog = await WorkforceService.recordDailyLabor({
      companyId,
      employeeId: dailyWorker.id,
      employeeName: dailyWorker.name,
      workDate: '2026-09-14',
      assignedJobNumber: jobNumber,
      dailyRate: 1000,
      overtimeHours: 2,
      hourlyOvertimeRate: 200,
      productionContribution: 'CNC cutting & frame mounting for billboard',
    })

    assert.strictEqual(laborLog.total_payout, 1400)

    // 7. Reconcile Workforce Actual Labor with V4 Costing
    const reconciledLaborCost = await WorkforceService.reconcileJobLaborCost(
      companyId,
      jobOrderId,
      jobNumber
    )

    assert.strictEqual(reconciledLaborCost, 1400)

    // Verify V4 Job Costing was updated non-destructively
    const updatedCosting = await CostingRepository.getJobCostingByJobId(jobOrderId, companyId)
    assert.strictEqual(updatedCosting?.act.labor_cost, 1400)
  })
})
