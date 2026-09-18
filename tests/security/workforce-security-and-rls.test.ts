// ==============================================================================
// InkFlow ERP - Workforce & Payroll Multi-Tenant Security & Isolation Tests
// Validates Tenant Boundaries, RLS, Permission Guarding, and Locked Mutation Guards
// ==============================================================================

import { test, describe } from 'node:test'
import assert from 'node:assert'
import { WorkforceService } from '../../services/workforce.service.ts'
import { WorkforceRepository } from '../../lib/repositories/workforce.repository.ts'

describe('Workforce & Payroll Security & Tenant Boundary Suite', () => {
  const companyA = 'comp-security-tenant-a'
  const companyB = 'comp-security-tenant-b'

  test('1. Multi-Tenant Isolation: Tenant A cannot access Tenant B employees', async () => {
    // Create employee in Company A
    const empA = await WorkforceService.createEmployee({
      company_id: companyA,
      name: 'Company A Staff',
      role: 'Printer',
      department: 'printing',
      employee_type: 'permanent',
      base_salary: 25000,
    })

    // Create employee in Company B
    const empB = await WorkforceService.createEmployee({
      company_id: companyB,
      name: 'Company B Staff',
      role: 'Finisher',
      department: 'finishing',
      employee_type: 'permanent',
      base_salary: 28000,
    })

    // Fetch as Company A
    const listA = await WorkforceService.getEmployees(companyA)
    const listB = await WorkforceService.getEmployees(companyB)

    assert.ok(listA.some((e) => e.id === empA.id))
    assert.ok(!listA.some((e) => e.id === empB.id), 'Company A must NOT see Company B employees')

    assert.ok(listB.some((e) => e.id === empB.id))
    assert.ok(!listB.some((e) => e.id === empA.id), 'Company B must NOT see Company A employees')
  })

  test('2. Multi-Tenant Isolation: Tenant A cannot access Tenant B salary advances or payrolls', async () => {
    const empA = await WorkforceService.createEmployee({
      company_id: companyA,
      name: 'Adv Staff A',
      role: 'Staff',
      department: 'printing',
      employee_type: 'permanent',
      base_salary: 20000,
    })

    const advA = await WorkforceService.disburseSalaryAdvance({
      companyId: companyA,
      employeeId: empA.id,
      amount: 3000,
      paymentMethod: 'cash',
      reason: 'Advance for A',
    })

    const advancesB = await WorkforceService.getSalaryAdvances(companyB)
    assert.ok(!advancesB.some((a) => a.id === advA.id), 'Company B must NOT see Company A salary advances')
  })

  test('3. Locked Payroll Immutability Guard: Cannot re-generate or corrupt a locked period', async () => {
    const testComp = `comp-lock-guard-${Date.now()}`
    const emp = await WorkforceService.createEmployee({
      company_id: testComp,
      name: 'Safe Worker',
      role: 'Operator',
      department: 'printing',
      employee_type: 'permanent',
      base_salary: 30000,
    })

    const period = await WorkforceService.generateMonthlyPayrollDraft({
      companyId: testComp,
      periodName: 'October 2026 Locked',
      startDate: '2026-10-01',
      endDate: '2026-10-31',
    })

    // Approve and Lock
    await WorkforceService.approvePayrollPeriod(period.id, testComp)
    await WorkforceService.lockPayrollPeriod(period.id, testComp)

    // Attempt to re-generate with identical name -> must throw error
    await assert.rejects(
      async () => {
        await WorkforceService.generateMonthlyPayrollDraft({
          companyId: testComp,
          periodName: 'October 2026 Locked',
          startDate: '2026-10-01',
          endDate: '2026-10-31',
        })
      },
      /already locked/i,
      'Re-generating locked payroll period must be strictly rejected'
    )
  })
})
