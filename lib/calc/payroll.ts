// ==============================================================================
// InkFlow ERP - Authoritative Payroll & Workforce Formulas (lib/calc/payroll.ts)
// Implements Bangladesh Labor Act Compliant Salary, Overtime, and Deductions.
// Standard Work Month: 26 working days, 8 hours/day = 208 standard monthly hours.
// Overtime Rate: 2x basic hourly wage.
// ==============================================================================

import { moneyAdd, moneySub, moneyMul, moneyDiv, moneySum } from '../money.ts'

export interface PayrollCalculationInput {
  baseSalary: number | string
  allowances?: {
    houseRent?: number | string
    medical?: number | string
    conveyance?: number | string
    food?: number | string
    bonus?: number | string
  }
  overtimeHours?: number
  absentDays?: number
  salaryAdvanceDeduction?: number | string
  otherDeductions?: number | string
}

export interface ComputedPayrollItem {
  baseSalary: number
  hourlyBasicRate: number
  overtimeHourlyRate: number
  overtimeHours: number
  overtimeEarnings: number
  totalAllowances: number
  grossSalary: number
  absentDeduction: number
  advanceDeduction: number
  totalDeductions: number
  netPayable: number
}

export function calculatePayrollItem(input: PayrollCalculationInput): ComputedPayrollItem {
  const base = Math.max(0, Number(input.baseSalary) || 0)

  // Standard Bangladesh Labor Act: 26 days * 8 hours = 208 hours
  const hourlyBasicRate = moneyDiv(base, 208)
  
  // Overtime is paid at double the ordinary basic hourly wage
  const overtimeHourlyRate = moneyMul(hourlyBasicRate, 2)
  const otHours = Math.max(0, Number(input.overtimeHours) || 0)
  const overtimeEarnings = moneyMul(overtimeHourlyRate, otHours)

  // Allowances breakdown
  const allow = input.allowances || {}
  const totalAllowances = moneySum([
    allow.houseRent,
    allow.medical,
    allow.conveyance,
    allow.food,
    allow.bonus,
  ])

  // Gross Salary = Base + Total Allowances + Overtime Earnings
  const grossSalary = moneySum([base, totalAllowances, overtimeEarnings])

  // Absent days deduction (Daily rate = Base / 26)
  const dailyRate = moneyDiv(base, 26)
  const absDays = Math.max(0, Number(input.absentDays) || 0)
  const absentDeduction = moneyMul(dailyRate, absDays)

  // Salary advance & other deductions
  const advanceDeduction = Math.max(0, Number(input.salaryAdvanceDeduction) || 0)
  const otherDeductions = Math.max(0, Number(input.otherDeductions) || 0)
  const totalDeductions = moneySum([absentDeduction, advanceDeduction, otherDeductions])

  // Net Payable = Gross - Total Deductions (cannot be negative)
  const rawNet = moneySub(grossSalary, totalDeductions)
  const netPayable = Math.max(0, rawNet)

  return {
    baseSalary: base,
    hourlyBasicRate,
    overtimeHourlyRate,
    overtimeHours: otHours,
    overtimeEarnings,
    totalAllowances,
    grossSalary,
    absentDeduction,
    advanceDeduction,
    totalDeductions,
    netPayable,
  }
}
