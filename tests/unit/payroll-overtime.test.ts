import { test, describe } from 'node:test'
import assert from 'node:assert'

export interface SalaryBreakdownParams {
  basicSalary: number
  houseRentAllowance?: number
  medicalAllowance?: number
  conveyanceAllowance?: number
  overtimeHours?: number
  unauthorizedAbsenceDays?: number
  advanceSalaryDeduction?: number
  taxDeduction?: number
}

export function calculateMonthlyPayroll(params: SalaryBreakdownParams) {
  const houseRent = params.houseRentAllowance ?? params.basicSalary * 0.5 // Default 50% basic
  const medical = params.medicalAllowance ?? 1500
  const conveyance = params.conveyanceAllowance ?? 1000

  const grossSalary = params.basicSalary + houseRent + medical + conveyance

  // Bangladesh Labor Act: Overtime rate = (Basic Salary / 208 hrs) * 2
  const standardMonthlyHours = 208
  const hourlyBasicRate = params.basicSalary / standardMonthlyHours
  const doubleOvertimeRate = hourlyBasicRate * 2
  const overtimeHours = params.overtimeHours || 0
  const overtimePay = Number((doubleOvertimeRate * overtimeHours).toFixed(2))

  // Absence deduction based on 30-day month
  const dailyGrossRate = grossSalary / 30
  const absenceDays = params.unauthorizedAbsenceDays || 0
  const absenceDeduction = Number((dailyGrossRate * absenceDays).toFixed(2))

  const advanceRecovery = params.advanceSalaryDeduction || 0
  const tax = params.taxDeduction || 0
  const totalDeductions = Number((absenceDeduction + advanceRecovery + tax).toFixed(2))

  const netPayable = Number((grossSalary + overtimePay - totalDeductions).toFixed(2))

  return {
    basicSalary: params.basicSalary,
    houseRent,
    medical,
    conveyance,
    grossSalary,
    hourlyBasicRate: Number(hourlyBasicRate.toFixed(2)),
    doubleOvertimeRate: Number(doubleOvertimeRate.toFixed(2)),
    overtimeHours,
    overtimePay,
    absenceDays,
    absenceDeduction,
    advanceRecovery,
    totalDeductions,
    netPayable,
  }
}

describe('Payroll & Overtime Unit Tests (Bangladesh Labor Law)', () => {
  test('Standard press operator salary: Basic ৳15,000 without deductions or overtime', () => {
    // Basic 15,000 + House Rent 7,500 + Medical 1,500 + Conveyance 1,000 = Gross 25,000.
    const res = calculateMonthlyPayroll({ basicSalary: 15000 })
    assert.strictEqual(res.grossSalary, 25000)
    assert.strictEqual(res.overtimePay, 0)
    assert.strictEqual(res.totalDeductions, 0)
    assert.strictEqual(res.netPayable, 25000)
  })

  test('Overtime calculation: 20 hours OT at double rate for Basic ৳20,800', () => {
    // Basic = 20,800. Hourly = 20,800 / 208 = ৳100/hr.
    // Double rate = ৳200/hr.
    // 20 hours OT = ৳4,000.
    // Gross = 20,800 + 10,400 + 1,500 + 1,000 = 33,700.
    // Net = 33,700 + 4,000 = 37,700.
    const res = calculateMonthlyPayroll({
      basicSalary: 20800,
      overtimeHours: 20,
    })

    assert.strictEqual(res.hourlyBasicRate, 100)
    assert.strictEqual(res.doubleOvertimeRate, 200)
    assert.strictEqual(res.overtimePay, 4000)
    assert.strictEqual(res.netPayable, 37700)
  })

  test('Absence deduction: 3 days unauthorized leave on Gross ৳30,000', () => {
    // Daily rate = 30,000 / 30 = ৳1,000/day.
    // 3 days absence = ৳3,000 deduction.
    // Net payable = 30,000 - 3,000 = ৳27,000.
    const res = calculateMonthlyPayroll({
      basicSalary: 18333.33,
      houseRentAllowance: 9166.67,
      medicalAllowance: 1500,
      conveyanceAllowance: 1000,
      unauthorizedAbsenceDays: 3,
    })

    assert.strictEqual(res.grossSalary, 30000)
    assert.strictEqual(res.absenceDeduction, 3000)
    assert.strictEqual(res.netPayable, 27000)
  })

  test('Advance salary recovery: ৳5,000 mid-month advance recovered from payroll', () => {
    const res = calculateMonthlyPayroll({
      basicSalary: 20000,
      advanceSalaryDeduction: 5000,
    })

    // Gross = 20,000 + 10,000 + 1,500 + 1,000 = 32,500.
    // Advance = 5,000.
    // Net = 27,500.
    assert.strictEqual(res.advanceRecovery, 5000)
    assert.strictEqual(res.netPayable, 27500)
  })

  test('Combined overtime and deductions edge case', () => {
    const res = calculateMonthlyPayroll({
      basicSalary: 20800,
      overtimeHours: 10, // 10 * 200 = +2,000
      unauthorizedAbsenceDays: 2, // 2 * (33,700 / 30 = 1123.33) = -2,246.67
      advanceSalaryDeduction: 3000, // -3,000
    })

    // Gross 33,700 + OT 2,000 - Absence 2,246.67 - Advance 3,000 = 30,453.33
    assert.strictEqual(res.overtimePay, 2000)
    assert.strictEqual(res.netPayable, 30453.33)
  })
})
