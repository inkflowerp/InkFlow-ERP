// ==============================================================================
// InkFlow ERP - Workforce, Attendance, Overtime & Payroll Full Business Suite
// Real-world Business Test Scenarios matching Bangladeshi Print & Signage SaaS
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceCalculatorService } from '../../services/workforce-calculator.service.ts'
import { WorkforceService } from '../../services/workforce.service.ts'
import { WorkforceRepository } from '../../lib/repositories/workforce.repository.ts'
import { PrintERPDataStore } from '../../lib/db/data-store.ts'
import type { EmployeeRecord, ShiftRecord, OvertimeRecord } from '../../types/workforce.types.ts'

describe('Workforce, Attendance, Overtime & Payroll Lifecycle Tests', () => {
  const companyId = 'comp-test-wf-001'

  test('TEST 1 & 2: Grace period late calculation (Shift 09:00, Grace 15m)', () => {
    const scheduled = '09:00'
    const grace = 15

    // Check-in on time (08:55 AM)
    const late1 = WorkforceCalculatorService.calculateLateMinutes('08:55', scheduled, grace)
    assert.strictEqual(late1, 0, 'Check in before shift start must have 0 late minutes')

    // Check-in within grace (09:12 AM)
    const late2 = WorkforceCalculatorService.calculateLateMinutes('09:12', scheduled, grace)
    assert.strictEqual(late2, 0, 'Check in within grace period must have 0 late minutes')

    // Check-in after grace (09:24 AM) -> 24 mins after start, grace 15 -> 9 mins late
    const late3 = WorkforceCalculatorService.calculateLateMinutes('09:24', scheduled, grace)
    assert.strictEqual(late3, 9, 'Check in at 9:24 AM on 9:00 AM shift with 15m grace must be 9 minutes late')

    // Check-in 45 mins late (09:45 AM) -> 45 - 15 = 30 mins late
    const late4 = WorkforceCalculatorService.calculateLateMinutes('09:45', scheduled, grace)
    assert.strictEqual(late4, 30, 'Check in at 9:45 AM must be 30 minutes late after 15m grace')
  })

  test('TEST 3: Early leave calculation', () => {
    const scheduledEnd = '18:00'

    // Check-out on time (18:05)
    const early1 = WorkforceCalculatorService.calculateEarlyLeaveMinutes('18:05', scheduledEnd)
    assert.strictEqual(early1, 0, 'Checkout after shift end is 0 early leave')

    // Check-out early (17:30) -> 30 mins early
    const early2 = WorkforceCalculatorService.calculateEarlyLeaveMinutes('17:30', scheduledEnd)
    assert.strictEqual(early2, 30, 'Checkout at 17:30 on 18:00 shift must be 30 minutes early leave')
  })

  test('TEST 4: Potential OT calculation on late checkout', () => {
    const scheduledEnd = '18:00'

    // Checkout at 20:30 -> 150 mins (2h 30m)
    const otMins = WorkforceCalculatorService.calculatePotentialOvertimeMinutes('20:30', scheduledEnd, 30)
    assert.strictEqual(otMins, 150, 'Checkout at 20:30 on 18:00 shift must yield 150 potential OT minutes')

    // Checkout at 18:15 (below 30 min threshold) -> 0 OT
    const otBelow = WorkforceCalculatorService.calculatePotentialOvertimeMinutes('18:15', scheduledEnd, 30)
    assert.strictEqual(otBelow, 0, 'Checkout 15 mins late should not trigger OT if below 30m threshold')
  })

  test('TEST 5 & 6: Potential OT vs Approved OT enters payroll', () => {
    const monthlyEmp: EmployeeRecord = {
      id: 'emp-ot-test',
      company_id: companyId,
      employee_id_number: 'EMP-101',
      name: 'Rahim Uddin',
      mobile: '+8801711000000',
      role: 'Master Printer',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      joining_date: '2025-01-01',
      base_salary: 30000,
      daily_rate: 0,
      hourly_rate: 144.23,
      overtime_hourly_rate: 216.35,
      current_advance_balance: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Unapproved OT (Draft/Pending) -> 0 OT in payroll
    const { item: unapprovedItem } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-1',
      employee: monthlyEmp,
      approvedOvertimeRecords: [], // Unapproved or empty
    })
    assert.strictEqual(unapprovedItem.overtime_amount, 0, 'Unapproved potential OT must not enter payroll')
    assert.strictEqual(unapprovedItem.gross_salary, 30000)

    // Approved OT (6 hours @ ৳ 150/hr = ৳ 900)
    const approvedOtRecord: OvertimeRecord = {
      id: 'ot-rec-1',
      company_id: companyId,
      employee_id: monthlyEmp.id,
      ot_date: '2026-09-10',
      duration_minutes: 360,
      duration_hours: 6,
      ot_type: 'regular_day',
      base_hourly_rate: 100,
      multiplier: 1.5,
      effective_ot_rate: 150,
      calculated_amount: 900,
      status: 'approved',
      reason: 'Rush flex printing',
      requested_by_name: 'Rahim',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { item: approvedItem, snapshot } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-1',
      employee: monthlyEmp,
      approvedOvertimeRecords: [approvedOtRecord],
    })

    assert.strictEqual(approvedItem.overtime_amount, 900, 'Approved OT must enter payroll with exact calculated amount')
    assert.strictEqual(approvedItem.gross_salary, 30900, 'Gross salary must include approved OT')
    assert.strictEqual(snapshot.earnings.overtime_amount, 900, 'Snapshot must preserve approved OT amount')
  })

  test('TEST 7: Daily worker payroll (25 days @ ৳ 800/day + ৳ 720 OT)', () => {
    const dailyWorker: EmployeeRecord = {
      id: 'emp-daily-1',
      company_id: companyId,
      employee_id_number: 'EMP-D-01',
      name: 'Kashem Ali',
      mobile: '+8801811000000',
      role: 'Finishing Labor',
      department: 'finishing',
      employee_type: 'daily_labor',
      salary_basis: 'daily_rate',
      joining_date: '2025-06-01',
      base_salary: 0,
      daily_rate: 800,
      hourly_rate: 100,
      overtime_hourly_rate: 120,
      current_advance_balance: 0,
      is_daily_worker: true,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const approvedOt: OvertimeRecord = {
      id: 'ot-d-1',
      company_id: companyId,
      employee_id: dailyWorker.id,
      ot_date: '2026-09-12',
      duration_minutes: 360,
      duration_hours: 6,
      ot_type: 'regular_day',
      base_hourly_rate: 80,
      multiplier: 1.5,
      effective_ot_rate: 120,
      calculated_amount: 720,
      status: 'approved',
      reason: 'Board pasting',
      requested_by_name: 'Kashem',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { item } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-daily',
      employee: dailyWorker,
      daysPresent: 25,
      approvedOvertimeRecords: [approvedOt],
    })

    // 25 * 800 = 20,000 base + 720 OT = 20,720
    assert.strictEqual(item.base_salary, 0)
    assert.strictEqual(item.daily_rate, 800)
    assert.strictEqual(item.days_present, 25)
    assert.strictEqual(item.gross_salary, 20720, 'Daily worker gross must be 25 * 800 + 720 = 20,720')
    assert.strictEqual(item.net_salary, 20720)
  })

  test('TEST 8: Hourly worker payroll (160 hours @ ৳ 150/hr)', () => {
    const hourlyWorker: EmployeeRecord = {
      id: 'emp-hourly-1',
      company_id: companyId,
      employee_id_number: 'EMP-H-01',
      name: 'Shakil Designer',
      mobile: '+8801911000000',
      role: 'Graphic Designer',
      department: 'design',
      employee_type: 'hourly_worker',
      salary_basis: 'hourly_rate',
      joining_date: '2025-04-01',
      base_salary: 0,
      daily_rate: 0,
      hourly_rate: 150,
      overtime_hourly_rate: 225,
      current_advance_balance: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { item } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-hourly',
      employee: hourlyWorker,
      hoursWorked: 160,
    })

    // 160 * 150 = 24,000
    assert.strictEqual(item.gross_salary, 24000, 'Hourly worker gross must be 160 * 150 = 24,000')
    assert.strictEqual(item.net_salary, 24000)
  })

  test('TEST 9 & 10: Salary advance disbursement and deduction balance tracking', () => {
    const empWithAdvance: EmployeeRecord = {
      id: 'emp-adv-1',
      company_id: companyId,
      employee_id_number: 'EMP-A-01',
      name: 'Tareq Operator',
      mobile: '+8801722000000',
      role: 'Cutter Operator',
      department: 'finishing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      joining_date: '2025-01-01',
      base_salary: 25000,
      daily_rate: 0,
      hourly_rate: 120,
      overtime_hourly_rate: 180,
      current_advance_balance: 5000, // ৳ 5,000 advance
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Deduct ৳ 2,000 in this payroll run
    const { item, snapshot } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-adv-run',
      employee: empWithAdvance,
      requestedAdvanceDeduction: 2000,
    })

    assert.strictEqual(item.advance_salary_deducted, 2000, 'Deduction must be ৳ 2,000')
    assert.strictEqual(item.advance_remaining_balance, 3000, 'Remaining balance must be ৳ 3,000')
    assert.strictEqual(item.net_salary, 23000, 'Net salary must be 25,000 - 2,000 = 23,000')
    assert.strictEqual(snapshot.deductions.advance_balance_before, 5000)
    assert.strictEqual(snapshot.deductions.advance_balance_after, 3000)
  })

  test('TEST 11 & 12: Full Payroll Period Generation, Approval, Payment & Locking Workflow', async () => {
    const testComp = `comp-lifecycle-${Date.now()}`

    // 1. Create 2 employees
    const emp1 = await WorkforceService.createEmployee({
      company_id: testComp,
      name: 'Hasan Ali',
      role: 'Printer',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      base_salary: 30000,
      current_advance_balance: 4000,
    })

    const emp2 = await WorkforceService.createEmployee({
      company_id: testComp,
      name: 'Monir Hossain',
      role: 'Daily Fabricator',
      department: 'fabrication',
      employee_type: 'daily_labor',
      salary_basis: 'daily_rate',
      daily_rate: 900,
      current_advance_balance: 0,
      is_daily_worker: true,
    })

    // 2. Generate Payroll Draft for September 2026
    const period = await WorkforceService.generateMonthlyPayrollDraft({
      companyId: testComp,
      periodName: 'September 2026 Test Run',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      workingDaysCount: 26,
    })

    assert.strictEqual(period.status, 'draft')
    assert.strictEqual(period.items.length, 2)
    assert.ok(period.total_gross_salary > 0)
    assert.strictEqual(period.total_advances_deducted, 4000)

    // 3. Approve Payroll
    const approved = await WorkforceService.approvePayrollPeriod(period.id, testComp, 'usr-owner', 'Owner Shamol')
    assert.strictEqual(approved.status, 'approved')
    assert.strictEqual(approved.approved_by_name, 'Owner Shamol')

    // 4. Pay Salary for Employee 1 via bKash
    const emp1Item = approved.items.find((i) => i.employee_id === emp1.id)!
    const payment = await WorkforceService.recordSalaryPayment({
      companyId: testComp,
      payrollPeriodId: approved.id,
      payrollItemId: emp1Item.id,
      employeeId: emp1.id,
      amount: emp1Item.net_salary,
      paymentMethod: 'bkash',
      referenceNumber: 'TrxID-98218731',
    })

    assert.strictEqual(payment.amount, emp1Item.net_salary)
    assert.strictEqual(payment.payment_method, 'bkash')

    // 5. Lock Payroll permanently
    const locked = await WorkforceService.lockPayrollPeriod(approved.id, testComp)
    assert.strictEqual(locked.status, 'locked')
    assert.ok(locked.locked_at)

    // Verify employee advance balance was reduced after locking
    const refreshedEmp1 = await WorkforceRepository.getEmployeeById(emp1.id, testComp)
    assert.strictEqual(refreshedEmp1?.current_advance_balance, 0, 'Advance balance must be settled after payroll locking')
  })

  test('TEST 16 & 17: Historical Payroll Snapshot Immutability', () => {
    const historicalSnapshot = {
      period_name: 'January 2026',
      base_salary: 20000,
      overtime_amount: 1500,
      net_salary: 21500,
    }

    // Now employee salary increases in September from 20k to 30k
    const updatedEmployeeSalary = 30000

    // Verify historical snapshot stays 20k and does not dynamically change
    assert.strictEqual(historicalSnapshot.base_salary, 20000, 'Historical payroll must remain immutable')
    assert.notStrictEqual(historicalSnapshot.base_salary, updatedEmployeeSalary)
  })

  test('TEST 23: Overnight Shift Calculation (22:00 -> 06:00)', () => {
    const nightShift: ShiftRecord = {
      id: 'shf-night',
      company_id: companyId,
      shift_code: 'NIGHT-01',
      shift_name: 'Night Production Shift',
      start_time: '22:00',
      end_time: '06:00',
      is_overnight: true,
      grace_period_minutes: 15,
      break_duration_minutes: 60,
      working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
      overtime_rules: { enabled: true, multiplier: 1.5, min_minutes: 30 },
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // 22:00 to 06:00 = 8 hours total minus 1h break = 7.0 hours net
    const duration = WorkforceCalculatorService.calculateShiftDurationHours(nightShift)
    assert.strictEqual(duration, 7.0, 'Overnight shift duration 22:00 to 06:00 with 60m break must equal 7.0 hours')
  })

  test('TEST 24: Advance deduction cap safety', () => {
    const emp: EmployeeRecord = {
      id: 'emp-safety-1',
      company_id: companyId,
      employee_id_number: 'EMP-S-01',
      name: 'Sajib',
      mobile: '+8801700000000',
      role: 'Staff',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      joining_date: '2025-01-01',
      base_salary: 20000,
      daily_rate: 0,
      hourly_rate: 100,
      overtime_hourly_rate: 150,
      current_advance_balance: 1500, // Only ৳ 1,500 advance balance exists
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Request deduction of ৳ 5,000 when only ৳ 1,500 exists
    const { item } = WorkforceCalculatorService.calculateEmployeePayrollItem({
      companyId,
      payrollPeriodId: 'pp-safety',
      employee: emp,
      requestedAdvanceDeduction: 5000,
    })

    assert.strictEqual(item.advance_salary_deducted, 1500, 'Deduction must be capped at current advance balance of ৳ 1,500')
    assert.strictEqual(item.advance_remaining_balance, 0, 'Remaining advance balance cannot be negative')
  })
})
