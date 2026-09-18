// ==============================================================================
// InkFlow ERP - Authoritative Workforce & Salary Calculation Engine
// Single source of truth for Shift, Attendance, Overtime, Advance & Payroll Math
// ==============================================================================

import type {
  EmployeeRecord,
  ShiftRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollItemSnapshot,
  PayrollItemRecord,
  SalaryStructure,
  SalaryBasis,
} from '../types/workforce.types.ts'

export class WorkforceCalculatorService {
  // ============================================================================
  // 1. SHIFT DURATION & OVERNIGHT CALCULATION
  // ============================================================================

  /**
   * Calculates planned net working hours for a shift, properly supporting overnight shifts (e.g. 22:00 -> 06:00).
   */
  static calculateShiftDurationHours(shift: {
    start_time: string
    end_time: string
    is_overnight?: boolean
    break_duration_minutes?: number
  }): number {
    const [startH, startM] = (shift.start_time || '09:00').split(':').map(Number)
    const [endH, endM] = (shift.end_time || '18:00').split(':').map(Number)

    let startTotalMins = startH * 60 + (startM || 0)
    let endTotalMins = endH * 60 + (endM || 0)

    if (shift.is_overnight || endTotalMins <= startTotalMins) {
      endTotalMins += 24 * 60
    }

    const breakMins = shift.break_duration_minutes !== undefined ? shift.break_duration_minutes : 60
    const netMins = Math.max(0, endTotalMins - startTotalMins - breakMins)
    return Math.round((netMins / 60) * 100) / 100
  }

  // ============================================================================
  // 2. LATE MINUTES CALCULATION WITH GRACE PERIOD
  // ============================================================================

  /**
   * Calculates late minutes taking the company grace period into account.
   * Business Rule:
   *   Shift start: 9:00 AM, Grace: 15 mins.
   *   Check-in at 9:12 AM -> 0 late mins (within grace).
   *   Check-in at 9:24 AM -> 9 late mins (minutes after grace).
   */
  static calculateLateMinutes(
    actualCheckInTimeStr: string, // 'HH:mm' or 'HH:mm:ss' or ISO
    scheduledStartTimeStr: string, // '09:00'
    gracePeriodMinutes = 15
  ): number {
    const actualMins = this.parseTimeToMinutes(actualCheckInTimeStr)
    const scheduledMins = this.parseTimeToMinutes(scheduledStartTimeStr)

    if (actualMins <= scheduledMins) {
      return 0
    }

    const diffMins = actualMins - scheduledMins

    if (diffMins <= gracePeriodMinutes) {
      return 0
    }

    return diffMins - gracePeriodMinutes
  }

  // ============================================================================
  // 3. EARLY LEAVE CALCULATION
  // ============================================================================

  /**
   * Calculates early leave minutes if an employee checks out before scheduled shift end.
   */
  static calculateEarlyLeaveMinutes(
    actualCheckOutTimeStr: string,
    scheduledEndTimeStr: string,
    isOvernight = false
  ): number {
    let actualMins = this.parseTimeToMinutes(actualCheckOutTimeStr)
    let scheduledMins = this.parseTimeToMinutes(scheduledEndTimeStr)

    if (isOvernight && actualMins < scheduledMins) {
      // In overnight shifts e.g. end 06:00, checkout 05:30 -> diff = 30
      // scheduled is 6:00 (360m), actual is 5:30 (330m)
    }

    if (actualMins >= scheduledMins) {
      return 0
    }

    return Math.max(0, scheduledMins - actualMins)
  }

  // ============================================================================
  // 4. POTENTIAL OVERTIME CALCULATION
  // ============================================================================

  /**
   * Calculates potential overtime in minutes when an employee stays past scheduled shift end.
   * Note: Potential overtime is a candidate record and does NOT become payable OT without approval.
   */
  static calculatePotentialOvertimeMinutes(
    actualCheckOutTimeStr: string,
    scheduledEndTimeStr: string,
    minThresholdMinutes = 30
  ): number {
    const actualMins = this.parseTimeToMinutes(actualCheckOutTimeStr)
    const scheduledMins = this.parseTimeToMinutes(scheduledEndTimeStr)

    if (actualMins <= scheduledMins) {
      return 0
    }

    const diffMins = actualMins - scheduledMins
    return diffMins >= minThresholdMinutes ? diffMins : 0
  }

  // ============================================================================
  // 5. OVERTIME MONETARY AMOUNT CALCULATION
  // ============================================================================

  /**
   * Computes overtime payable amount based on duration, base rate, and multiplier.
   * Multipliers: 1.0x, 1.5x, 2.0x, custom.
   */
  static calculateOvertimeAmount(params: {
    durationMinutes: number
    baseHourlyRate: number
    multiplier?: number
  }): { durationHours: number; effectiveRate: number; amount: number } {
    const durationHours = Math.round((Math.max(0, params.durationMinutes) / 60) * 100) / 100
    const multiplier = params.multiplier !== undefined && params.multiplier >= 1.0 ? params.multiplier : 1.5
    const effectiveRate = Math.round(params.baseHourlyRate * multiplier * 100) / 100
    const amount = Math.round(durationHours * effectiveRate * 100) / 100

    return {
      durationHours,
      effectiveRate,
      amount,
    }
  }

  // ============================================================================
  // 6. AUTHORITATIVE SALARY & PAYROLL CALCULATION
  // ============================================================================

  /**
   * Authoritative salary calculation engine for all employee types:
   *   - Monthly Salaried Staff
   *   - Daily Labor Workers
   *   - Hourly Workers
   *   - Contract Workers
   *
   * Invariants:
   *   - Never deduct advances greater than outstanding advance balance.
   *   - Preserves complete immutable snapshot of all inputs and intermediate numbers.
   */
  static calculateEmployeePayrollItem(params: {
    companyId: string
    payrollPeriodId: string
    employee: EmployeeRecord
    workingDaysInMonth?: number
    daysPresent?: number
    hoursWorked?: number
    approvedOvertimeRecords?: OvertimeRecord[]
    approvedAdvances?: SalaryAdvanceRecord[]
    requestedAdvanceDeduction?: number
    bonusAmount?: number
    commissionAmount?: number
    absenceFine?: number
    lateFine?: number
    loanDeduction?: number
    otherDeductions?: number
  }): {
    item: Omit<PayrollItemRecord, 'id' | 'created_at' | 'updated_at'>
    snapshot: PayrollItemSnapshot
  } {
    const {
      companyId,
      payrollPeriodId,
      employee,
      workingDaysInMonth = 26,
      daysPresent = 26,
      hoursWorked = 208,
      approvedOvertimeRecords = [],
      approvedAdvances = [],
      requestedAdvanceDeduction,
      bonusAmount = 0,
      commissionAmount = 0,
      absenceFine = 0,
      lateFine = 0,
      loanDeduction = 0,
      otherDeductions = 0,
    } = params

    const salaryBasis: SalaryBasis = employee.salary_basis || (employee.is_daily_worker ? 'daily_rate' : 'monthly')

    // 1. Calculate Approved Overtime
    const approvedOtHours = approvedOvertimeRecords.reduce((sum, r) => sum + (r.duration_hours || r.duration_minutes / 60), 0)
    const approvedOtAmount = approvedOvertimeRecords.reduce((sum, r) => sum + Number(r.calculated_amount || 0), 0)

    // 2. Base Earnings by Employment Basis
    let baseSalary = Number(employee.base_salary || 0)
    let dailyRate = Number(employee.daily_rate || 0)
    let hourlyRate = Number(employee.hourly_rate || (baseSalary > 0 ? baseSalary / 208 : 0))

    let grossBaseEarnings = 0
    let allowancesBreakdown: SalaryStructure = {
      basic: 0,
      house_allowance: 0,
      transport_allowance: 0,
      food_allowance: 0,
      medical_allowance: 0,
      other_allowances: 0,
    }

    if (salaryBasis === 'monthly') {
      if (employee.salary_structure && employee.salary_structure.basic > 0) {
        allowancesBreakdown = {
          basic: Number(employee.salary_structure.basic || 0),
          house_allowance: Number(employee.salary_structure.house_allowance || 0),
          transport_allowance: Number(employee.salary_structure.transport_allowance || 0),
          food_allowance: Number(employee.salary_structure.food_allowance || 0),
          medical_allowance: Number(employee.salary_structure.medical_allowance || 0),
          other_allowances: Number(employee.salary_structure.other_allowances || 0),
        }
        grossBaseEarnings =
          allowancesBreakdown.basic +
          allowancesBreakdown.house_allowance +
          allowancesBreakdown.transport_allowance +
          allowancesBreakdown.food_allowance +
          allowancesBreakdown.medical_allowance +
          allowancesBreakdown.other_allowances
      } else {
        // Default standard breakdown: 60% Basic, 20% House, 10% Transport, 10% Medical
        allowancesBreakdown = {
          basic: Math.round(baseSalary * 0.6),
          house_allowance: Math.round(baseSalary * 0.2),
          transport_allowance: Math.round(baseSalary * 0.1),
          food_allowance: 0,
          medical_allowance: Math.round(baseSalary * 0.1),
          other_allowances: 0,
        }
        grossBaseEarnings = baseSalary
      }
    } else if (salaryBasis === 'daily_rate') {
      grossBaseEarnings = Math.round(daysPresent * dailyRate * 100) / 100
      allowancesBreakdown = {
        basic: grossBaseEarnings,
        house_allowance: 0,
        transport_allowance: 0,
        food_allowance: 0,
        medical_allowance: 0,
        other_allowances: 0,
      }
    } else if (salaryBasis === 'hourly_rate') {
      grossBaseEarnings = Math.round(hoursWorked * hourlyRate * 100) / 100
      allowancesBreakdown = {
        basic: grossBaseEarnings,
        house_allowance: 0,
        transport_allowance: 0,
        food_allowance: 0,
        medical_allowance: 0,
        other_allowances: 0,
      }
    } else if (salaryBasis === 'contract') {
      grossBaseEarnings = baseSalary
      allowancesBreakdown = {
        basic: baseSalary,
        house_allowance: 0,
        transport_allowance: 0,
        food_allowance: 0,
        medical_allowance: 0,
        other_allowances: 0,
      }
    }

    const totalGrossSalary = Math.round(
      (grossBaseEarnings + approvedOtAmount + bonusAmount + commissionAmount) * 100
    ) / 100

    // 3. Advance Deduction Calculation
    const totalAdvanceBalance = Number(employee.current_advance_balance || 0)
    let advanceDeduction = 0

    if (requestedAdvanceDeduction !== undefined) {
      advanceDeduction = Math.min(requestedAdvanceDeduction, totalAdvanceBalance)
    } else {
      // Auto-deduct either full advance or reasonable monthly portion
      advanceDeduction = Math.min(totalAdvanceBalance, totalGrossSalary)
    }

    const advanceRemainingBalance = Math.max(0, totalAdvanceBalance - advanceDeduction)

    // 4. Deductions Total
    const totalDeductions = Math.round(
      (advanceDeduction + absenceFine + lateFine + loanDeduction + otherDeductions) * 100
    ) / 100

    // 5. Net Payable
    const netSalary = Math.max(0, Math.round((totalGrossSalary - totalDeductions) * 100) / 100)

    // 6. Snapshot Data
    const snapshot: PayrollItemSnapshot = {
      calculated_at: new Date().toISOString(),
      salary_basis: salaryBasis,
      base_rate_used: salaryBasis === 'daily_rate' ? dailyRate : salaryBasis === 'hourly_rate' ? hourlyRate : baseSalary,
      overtime_rate_used: Number(employee.overtime_hourly_rate || 0),
      days_in_month: 30,
      working_days_count: workingDaysInMonth,
      days_present: daysPresent,
      hours_worked: hoursWorked,
      earnings: {
        basic: allowancesBreakdown.basic,
        house_allowance: allowancesBreakdown.house_allowance,
        transport_allowance: allowancesBreakdown.transport_allowance,
        food_allowance: allowancesBreakdown.food_allowance,
        medical_allowance: allowancesBreakdown.medical_allowance,
        other_allowances: allowancesBreakdown.other_allowances,
        overtime_amount: approvedOtAmount,
        bonuses: bonusAmount,
        commission: commissionAmount,
        gross_earnings: totalGrossSalary,
      },
      deductions: {
        advance_deducted: advanceDeduction,
        advance_balance_before: totalAdvanceBalance,
        advance_balance_after: advanceRemainingBalance,
        absence_deduction: absenceFine,
        late_deduction: lateFine,
        loan_deduction: loanDeduction,
        other_deductions: otherDeductions,
        total_deductions: totalDeductions,
      },
      net_payable: netSalary,
    }

    const item: Omit<PayrollItemRecord, 'id' | 'created_at' | 'updated_at'> = {
      company_id: companyId,
      payroll_period_id: payrollPeriodId,
      employee_id: employee.id,
      employee_name: employee.name,
      employee_name_bn: employee.name_bn || null,
      employee_id_number: employee.employee_id_number,
      role: employee.role,
      department: employee.department,
      employee_type: employee.employee_type,
      salary_basis: salaryBasis,
      base_salary: baseSalary,
      daily_rate: dailyRate,
      hourly_rate: hourlyRate,
      days_present: daysPresent,
      hours_worked: hoursWorked,
      overtime_hours: Math.round(approvedOtHours * 100) / 100,
      overtime_amount: approvedOtAmount,
      allowances_breakdown: allowancesBreakdown,
      bonuses: bonusAmount,
      gross_salary: totalGrossSalary,
      advance_salary_deducted: advanceDeduction,
      advance_remaining_balance: advanceRemainingBalance,
      absence_deduction: absenceFine,
      late_fine: lateFine,
      loan_deduction: loanDeduction,
      other_deductions: otherDeductions,
      net_salary: netSalary,
      paid_amount: 0,
      due_amount: netSalary,
      payment_status: 'unpaid',
      snapshot_data: snapshot,
    }

    return { item, snapshot }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private static parseTimeToMinutes(timeStr: string): number {
    if (!timeStr) return 0

    // Handle ISO timestamp e.g. "2026-09-18T09:24:00+06:00"
    if (timeStr.includes('T')) {
      const d = new Date(timeStr)
      if (!isNaN(d.getTime())) {
        // Convert to BD time (UTC+6)
        const utcHours = d.getUTCHours()
        const utcMins = d.getUTCMinutes()
        const bdHours = (utcHours + 6) % 24
        return bdHours * 60 + utcMins
      }
    }

    // Handle AM/PM format e.g. "09:24 AM"
    if (/am|pm/i.test(timeStr)) {
      const match = timeStr.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i)
      if (match) {
        let h = parseInt(match[1], 10)
        const m = parseInt(match[2], 10)
        const meridiem = match[3].toUpperCase()
        if (meridiem === 'PM' && h < 12) h += 12
        if (meridiem === 'AM' && h === 12) h = 0
        return h * 60 + m
      }
    }

    // Handle standard "HH:mm" or "HH:mm:ss"
    const parts = timeStr.split(':').map(Number)
    const h = parts[0] || 0
    const m = parts[1] || 0
    return h * 60 + m
  }
}
