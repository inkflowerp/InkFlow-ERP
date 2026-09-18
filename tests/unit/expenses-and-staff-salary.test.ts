import { test, describe } from 'node:test'
import assert from 'node:assert'
import { FinanceRepository } from '../../lib/repositories/finance.repository.ts'
import { FinanceService } from '../../services/finance.service.ts'
import { WorkforceRepository } from '../../lib/repositories/workforce.repository.ts'

describe('Expense 360 & Staff Salary / Advances Integration Tests', () => {
  const companyId = 'co-expense-salary-test-v1'

  test('1. Staff Salary Expense posting debits OPEX_SALARY (6030), credits Cash account, and embeds employee metadata', async () => {
    const compId = `${companyId}-salary`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const salaryExpenseAcc = accounts.find((a) => a.code === '6030')!

    // Seed cash balance ৳50,000
    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 50000)

    // Create test employee
    const now = new Date().toISOString()
    const emp = await WorkforceRepository.createEmployee({
      id: `emp-${Date.now()}-1`,
      company_id: compId,
      employee_id_number: 'EMP-001',
      name: 'Kabir Hossain',
      mobile: '01711000001',
      role: 'Press Operator',
      designation: 'Senior Press Operator',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      salary_type: 'monthly',
      joining_date: '2026-01-01',
      base_salary: 22000,
      daily_rate: 0,
      hourly_rate: 0,
      overtime_hourly_rate: 150,
      current_advance_balance: 0,
      status: 'active',
      is_daily_worker: false,
      created_at: now,
      updated_at: now,
    })

    // Record monthly staff salary payout: ৳22,000
    const txn = await FinanceService.recordExpense({
      companyId: compId,
      category: 'staff_salary',
      amount: 22000,
      paymentAccountId: cashAcc.id,
      employeeId: emp.id,
      employeeName: emp.name,
      paymentMethod: 'cash',
      description: 'Monthly salary for Kabir Hossain (November)',
    })

    assert.strictEqual(txn.status, 'POSTED')
    assert.strictEqual(txn.total_amount, 22000)
    assert.strictEqual(txn.metadata?.category, 'staff_salary')
    assert.strictEqual(txn.metadata?.employee_id, emp.id)
    assert.strictEqual(txn.metadata?.employee_name, 'Kabir Hossain')

    // Verify double-entry lines
    const lines = txn.lines || []
    assert.strictEqual(lines.length, 2)
    const debitLine = lines.find((l) => l.account_id === salaryExpenseAcc.id)
    const creditLine = lines.find((l) => l.account_id === cashAcc.id)

    assert.strictEqual(debitLine?.debit, 22000)
    assert.strictEqual(debitLine?.credit, 0)
    assert.strictEqual(creditLine?.debit, 0)
    assert.strictEqual(creditLine?.credit, 22000)

    // Verify account balances
    const updatedCash = await FinanceRepository.getAccountById(cashAcc.id, compId)
    const updatedSalary = await FinanceRepository.getAccountById(salaryExpenseAcc.id, compId)

    assert.strictEqual(updatedCash?.current_balance, 28000) // 50000 - 22000 = 28000
    assert.strictEqual(updatedSalary?.current_balance, 22000)
  })

  test('2. Salary Advance Expense updates employee current advance balance and posts double-entry journal', async () => {
    const compId = `${companyId}-advance`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const bkashAcc = accounts.find((a) => a.code === '1030')!
    const salaryExpenseAcc = accounts.find((a) => a.code === '6030')!

    // Seed bKash balance ৳30,000
    await FinanceRepository.updateAccountBalance(bkashAcc.id, compId, 30000)

    // Create employee
    const now = new Date().toISOString()
    const emp = await WorkforceRepository.createEmployee({
      id: `emp-${Date.now()}-2`,
      company_id: compId,
      employee_id_number: 'EMP-002',
      name: 'Rafiqul Islam',
      mobile: '01711000002',
      role: 'Graphic Designer',
      designation: 'Graphic Designer',
      department: 'design',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      salary_type: 'monthly',
      joining_date: '2026-01-01',
      base_salary: 25000,
      daily_rate: 0,
      hourly_rate: 0,
      overtime_hourly_rate: 180,
      current_advance_balance: 1000,
      status: 'active',
      is_daily_worker: false,
      created_at: now,
      updated_at: now,
    })

    // Record salary advance payout: ৳5,000
    const txn = await FinanceService.recordExpense({
      companyId: compId,
      category: 'salary_advance',
      amount: 5000,
      paymentAccountId: bkashAcc.id,
      employeeId: emp.id,
      employeeName: emp.name,
      paymentMethod: 'bkash',
      description: 'Emergency medical advance for Rafiqul Islam',
    })

    assert.strictEqual(txn.status, 'POSTED')
    assert.strictEqual(txn.total_amount, 5000)
    assert.strictEqual(txn.metadata?.employee_id, emp.id)

    // Verify employee advance balance updated: 1000 + 5000 = 6000
    const updatedEmp = await WorkforceRepository.getEmployeeById(emp.id, compId)
    assert.strictEqual(updatedEmp?.current_advance_balance, 6000)

    // Verify account balance: 30000 - 5000 = 25000
    const updatedBkash = await FinanceRepository.getAccountById(bkashAcc.id, compId)
    assert.strictEqual(updatedBkash?.current_balance, 25000)
  })

  test('3. Daily Labor & Wages routes to Direct Labor COGS (5020)', async () => {
    const compId = `${companyId}-labor`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const laborCogsAcc = accounts.find((a) => a.code === '5020')!

    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 20000)

    const txn = await FinanceService.recordExpense({
      companyId: compId,
      category: 'daily_labor',
      amount: 3500,
      paymentAccountId: cashAcc.id,
      vendorName: 'Daily Binding Crew',
      description: 'Overtime payment for 5 binding workers on catalog job',
    })

    assert.strictEqual(txn.status, 'POSTED')
    assert.strictEqual(txn.total_amount, 3500)

    const updatedLabor = await FinanceRepository.getAccountById(laborCogsAcc.id, compId)
    assert.strictEqual(updatedLabor?.current_balance, 3500)
  })

  test('4. Comprehensive Operational Categories map to correct accounts (Rent, Utilities, Maintenance, Materials, Fuel, Tea)', async () => {
    const compId = `${companyId}-categories`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!

    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 200000)

    const categoriesToTest = [
      { cat: 'factory_rent', code: '6010', amount: 15000, desc: 'Shop rent' },
      { cat: 'electricity_utility', code: '6020', amount: 8000, desc: 'DESCO electricity bill' },
      { cat: 'machine_maintenance', code: '6050', amount: 4500, desc: 'Print head replacement' },
      { cat: 'raw_materials', code: '5010', amount: 12000, desc: 'Retail solvent ink purchase' },
      { cat: 'transport_fuel', code: '6040', amount: 1800, desc: 'Delivery van diesel' },
      { cat: 'tea_snacks', code: '6070', amount: 650, desc: 'Weekly office tea & biscuit' },
      { cat: 'office_stationery', code: '6070', amount: 1200, desc: 'Challan and memo books' },
      { cat: 'marketing_promo', code: '6060', amount: 3000, desc: 'Facebook page sponsored ad' },
      { cat: 'govt_tax_fees', code: '6070', amount: 5000, desc: 'Trade license renewal' },
      { cat: 'miscellaneous', code: '6070', amount: 400, desc: 'Cleaning supplies' },
    ]

    for (const testCase of categoriesToTest) {
      const txn = await FinanceService.recordExpense({
        companyId: compId,
        category: testCase.cat,
        amount: testCase.amount,
        paymentAccountId: cashAcc.id,
        description: testCase.desc,
      })

      assert.strictEqual(txn.status, 'POSTED')
      const targetAcc = accounts.find((a) => a.code === testCase.code)!
      const debitLine = (txn.lines || []).find((l) => l.account_id === targetAcc.id)
      assert.strictEqual(debitLine !== undefined, true, `Category ${testCase.cat} should debit account ${testCase.code}`)
      assert.strictEqual(debitLine?.debit, testCase.amount)
    }
  })

  test('5. FinanceService.getExpenses aggregates summary totals, employee breakdowns, and category groupings', async () => {
    const compId = `${companyId}-reporting`
    await FinanceRepository.seedDefaultAccounts(compId)
    const accounts = await FinanceRepository.getAccounts(compId)
    const cashAcc = accounts.find((a) => a.code === '1010')!
    const bankAcc = accounts.find((a) => a.code === '1020')!

    await FinanceRepository.updateAccountBalance(cashAcc.id, compId, 100000)
    await FinanceRepository.updateAccountBalance(bankAcc.id, compId, 100000)

    const now = new Date().toISOString()
    const emp1 = await WorkforceRepository.createEmployee({
      id: `emp-${Date.now()}-3`,
      company_id: compId,
      employee_id_number: 'EMP-003',
      name: 'Anisur Rahman',
      mobile: '01711000003',
      role: 'Production Lead',
      designation: 'Production Lead',
      department: 'printing',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      salary_type: 'monthly',
      joining_date: '2026-01-01',
      base_salary: 20000,
      daily_rate: 0,
      hourly_rate: 0,
      overtime_hourly_rate: 150,
      current_advance_balance: 0,
      status: 'active',
      is_daily_worker: false,
      created_at: now,
      updated_at: now,
    })

    const emp2 = await WorkforceRepository.createEmployee({
      id: `emp-${Date.now()}-4`,
      company_id: compId,
      employee_id_number: 'EMP-004',
      name: 'Sultana Begum',
      mobile: '01711000004',
      role: 'Accountant',
      designation: 'Accountant',
      department: 'accounts',
      employee_type: 'permanent',
      salary_basis: 'monthly',
      salary_type: 'monthly',
      joining_date: '2026-01-01',
      base_salary: 18000,
      daily_rate: 0,
      hourly_rate: 0,
      overtime_hourly_rate: 120,
      current_advance_balance: 0,
      status: 'active',
      is_daily_worker: false,
      created_at: now,
      updated_at: now,
    })

    // 1. Staff Salary: ৳20,000 to emp1
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'staff_salary',
      amount: 20000,
      paymentAccountId: bankAcc.id,
      employeeId: emp1.id,
      employeeName: emp1.name,
      description: 'Salary for Anisur Rahman',
    })

    // 2. Staff Salary: ৳18,000 to emp2
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'staff_salary',
      amount: 18000,
      paymentAccountId: bankAcc.id,
      employeeId: emp2.id,
      employeeName: emp2.name,
      description: 'Salary for Sultana Begum',
    })

    // 3. Salary Advance: ৳4,000 to emp1
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'salary_advance',
      amount: 4000,
      paymentAccountId: cashAcc.id,
      employeeId: emp1.id,
      employeeName: emp1.name,
      description: 'Advance to Anisur',
    })

    // 4. Daily Labor: ৳2,500
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'daily_labor',
      amount: 2500,
      paymentAccountId: cashAcc.id,
      description: 'Overtime labor',
    })

    // 5. Factory Rent: ৳12,000
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'factory_rent',
      amount: 12000,
      paymentAccountId: bankAcc.id,
      description: 'Factory rent',
    })

    // 6. Tea & Snacks: ৳800
    await FinanceService.recordExpense({
      companyId: compId,
      category: 'tea_snacks',
      amount: 800,
      paymentAccountId: cashAcc.id,
      description: 'Snacks & tea',
    })

    const report = await FinanceService.getExpenses(compId)

    // Total: 20000 + 18000 + 4000 + 2500 + 12000 + 800 = 57300
    assert.strictEqual(report.total_expenses, 57300)
    // Staff salary total: 20000 + 18000 = 38000
    assert.strictEqual(report.total_staff_salary, 38000)
    // Advance total: 4000
    assert.strictEqual(report.total_salary_advance, 4000)
    // Daily labor: 2500
    assert.strictEqual(report.total_daily_labor, 2500)
    // Overhead: 12000 + 800 = 12800
    assert.strictEqual(report.total_operational_overhead, 12800)

    // Check employee breakdowns
    assert.strictEqual(report.by_employee.length, 2)
    const emp1Summary = report.by_employee.find((e) => e.employee_id === emp1.id)
    assert.strictEqual(emp1Summary?.salary_total, 20000)
    assert.strictEqual(emp1Summary?.advance_total, 4000)
    assert.strictEqual(emp1Summary?.total_paid, 24000)
    assert.strictEqual(emp1Summary?.transaction_count, 2)

    // Check items count
    assert.strictEqual(report.items.length, 6)

    // Check category filter
    const salaryOnlyReport = await FinanceService.getExpenses(compId, { category: 'staff_salary' })
    assert.strictEqual(salaryOnlyReport.items.length, 2)
    assert.strictEqual(salaryOnlyReport.total_expenses, 38000)

    // Check employee filter
    const emp1OnlyReport = await FinanceService.getExpenses(compId, { employeeId: emp1.id })
    assert.strictEqual(emp1OnlyReport.items.length, 2)
    assert.strictEqual(emp1OnlyReport.total_expenses, 24000)
  })
})
