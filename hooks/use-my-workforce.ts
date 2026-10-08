'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useTenant } from '@/hooks/use-tenant'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  getMyWorkforceDataAction,
  recordSelfAttendancePunchAction,
  requestSelfSalaryAdvanceAction,
} from '@/actions/workforce.actions'
import type {
  EmployeeRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  SalaryBasis,
} from '@/types/workforce.types'

export interface LeaveRequestItem {
  id: string
  employee_id: string
  leave_type: 'casual_leave' | 'sick_leave' | 'paid_leave' | 'unpaid_leave' | 'other'
  start_date: string
  end_date: string
  days_count: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
  approved_by_name?: string
  rejection_reason?: string
}

export function useMyWorkforce() {
  const { company, currentUser } = useTenant()
  const [serverEmployee, setServerEmployee] = useState<EmployeeRecord | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [attendances, setAttendances] = useState<AttendanceDailySummaryRecord[]>([])
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequestItem[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Load from DataStore and Server Action
  const loadData = useCallback(async () => {
    try {
      // 1. Instant local cache hydration for zero layout shift
      const localEmps = PrintFlowDataStore.get<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES) || []
      const localAtts = PrintFlowDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.ATTENDANCE) || []
      const localAdvs = PrintFlowDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES) || []
      const localLeaves = PrintFlowDataStore.get<LeaveRequestItem[]>('printflow_tenant_leave_requests' as any) || []
      const localOts = PrintFlowDataStore.get<OvertimeRecord[]>('printflow_tenant_overtime' as any) || []

      setEmployees(localEmps)
      setAttendances(localAtts)
      setAdvances(localAdvs)
      setLeaveRequests(localLeaves)
      setOvertimeRecords(localOts)

      // 2. Authoritative server sync from PostgreSQL
      const res = await getMyWorkforceDataAction()
      if (res?.success && res?.data) {
        if (res.data.employee) {
          setServerEmployee(res.data.employee)
          PrintFlowDataStore.addItem(STORAGE_KEYS.EMPLOYEES, res.data.employee, res.data.employee.company_id)
        }
        if (res.data.attendances && res.data.attendances.length > 0) {
          setAttendances(res.data.attendances)
        }
        if (res.data.advances) {
          setAdvances(res.data.advances)
        }
        if (res.data.overtimes) {
          setOvertimeRecords(res.data.overtimes)
        }
      }
    } catch (err) {
      console.warn('[useMyWorkforce] Server sync error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 1. Resolve current logged-in employee record strictly
  const currentEmployee = useMemo<EmployeeRecord | null>(() => {
    if (serverEmployee) return serverEmployee

    if (!employees || employees.length === 0) return null

    const targetUserId = currentUser?.user_id || currentUser?.id
    if (targetUserId) {
      const byUserId = employees.find((e) => e.user_id === targetUserId)
      if (byUserId) return byUserId
    }

    return null
  }, [serverEmployee, employees, currentUser])

  const empId = currentEmployee?.id || ''
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentMonthStr = useMemo(() => todayStr.slice(0, 7), [todayStr]) // 'YYYY-MM'

  // 2. Personal Attendance Records
  const myAttendances = useMemo(() => {
    if (!empId) return []
    return attendances
      .filter((a) => a.employee_id === empId)
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date))
  }, [attendances, empId])

  const myMonthAttendances = useMemo(() => {
    return myAttendances.filter((a) => a.attendance_date?.startsWith(currentMonthStr))
  }, [myAttendances, currentMonthStr])

  const todayAttendance = useMemo(() => {
    return myAttendances.find((a) => a.attendance_date === todayStr) || null
  }, [myAttendances, todayStr])

  const isClockedIn = Boolean(todayAttendance && (todayAttendance.check_in_time || todayAttendance.check_in_at))
  const isClockedOut = Boolean(todayAttendance && (todayAttendance.check_out_time || todayAttendance.check_out_at))

  // Attendance metrics
  const presentDaysCount = useMemo(() => {
    return myMonthAttendances.filter((a) => a.status === 'present' || a.status === 'late' || a.status === 'half_day').length
  }, [myMonthAttendances])

  const lateDaysCount = useMemo(() => {
    return myMonthAttendances.filter((a) => a.status === 'late' || (a.late_minutes && a.late_minutes > 0)).length
  }, [myMonthAttendances])

  const totalLateMinutes = useMemo(() => {
    return myMonthAttendances.reduce((sum, a) => sum + (a.late_minutes || 0), 0)
  }, [myMonthAttendances])

  const totalWorkedMinutes = useMemo(() => {
    return myMonthAttendances.reduce((sum, a) => sum + (a.worked_minutes || 0), 0)
  }, [myMonthAttendances])

  // 3. Personal Overtime Records & Calculation
  const myOvertimes = useMemo(() => {
    if (!empId) return []
    return overtimeRecords
      .filter((o) => o.employee_id === empId)
      .sort((a, b) => (b.ot_date || '').localeCompare(a.ot_date || ''))
  }, [overtimeRecords, empId])

  const approvedMonthOtHours = useMemo(() => {
    const otRecordSum = myOvertimes
      .filter((o) => o.ot_date?.startsWith(currentMonthStr) && o.status !== 'rejected')
      .reduce((sum, o) => sum + (o.duration_hours || o.duration_minutes / 60 || 0), 0)

    const attOtSum = myMonthAttendances.reduce((sum, a) => sum + ((a.approved_ot_minutes || a.potential_ot_minutes || 0) / 60), 0)

    return Math.max(otRecordSum, Math.round(attOtSum * 10) / 10)
  }, [myOvertimes, myMonthAttendances, currentMonthStr])

  const otHourlyRate = useMemo(() => {
    if (!currentEmployee) return 0
    if (currentEmployee.overtime_hourly_rate && currentEmployee.overtime_hourly_rate > 0) {
      return currentEmployee.overtime_hourly_rate
    }
    const hourly = currentEmployee.hourly_rate || (currentEmployee.base_salary ? Math.round(currentEmployee.base_salary / 208) : 0)
    return hourly > 0 ? Math.round(hourly * 1.5) : 0
  }, [currentEmployee])

  const totalOtEarnings = Math.round(approvedMonthOtHours * otHourlyRate)

  // 4. Personal Leaves
  const myLeaves = useMemo(() => {
    if (!empId) return []
    return leaveRequests
      .filter((l) => l.employee_id === empId)
      .sort((a, b) => b.applied_at.localeCompare(a.applied_at))
  }, [leaveRequests, empId])

  const allowedLeaves = currentEmployee?.allowed_monthly_leaves ?? 2
  const consumedMonthLeaves = useMemo(() => {
    return myLeaves
      .filter((l) => l.status === 'approved' && l.start_date?.startsWith(currentMonthStr))
      .reduce((sum, l) => sum + (l.days_count || 1), 0)
  }, [myLeaves, currentMonthStr])

  const remainingLeaves = Math.max(0, allowedLeaves - consumedMonthLeaves)

  // 5. Personal Salary Advances
  const myAdvances = useMemo(() => {
    if (!empId) return []
    return advances
      .filter((a) => a.employee_id === empId)
      .sort((a, b) => (b.disbursed_date || '').localeCompare(a.disbursed_date || ''))
  }, [advances, empId])

  const currentAdvanceBalance = useMemo(() => {
    if (currentEmployee?.current_advance_balance !== undefined && currentEmployee.current_advance_balance > 0) {
      return currentEmployee.current_advance_balance
    }
    return myAdvances
      .filter((a) => a.status === 'disbursed' && !a.is_settled)
      .reduce((sum, a) => sum + (a.remaining_amount !== undefined ? a.remaining_amount : a.amount), 0)
  }, [currentEmployee, myAdvances])

  // 6. Salary & Payslip Breakdown
  const salaryStructure = useMemo(() => {
    if (!currentEmployee) {
      return {
        basis: 'monthly' as SalaryBasis,
        base: 0,
        dailyRate: 0,
        hourlyRate: 0,
        otHourlyRate: 0,
        basic: 0,
        house: 0,
        transport: 0,
        medical: 0,
        food: 0,
        totalOtEarnings: 0,
        grossEarnings: 0,
        advanceDeduction: 0,
        lateFine: 0,
        totalDeductions: 0,
        netPayable: 0,
      }
    }

    const base = Number(currentEmployee.base_salary || 0)
    const basis: SalaryBasis = currentEmployee.salary_basis || (currentEmployee.is_daily_worker ? 'daily_rate' : 'monthly')
    const dailyRate = Number(currentEmployee.daily_rate || (base > 0 ? Math.round(base / 26) : 0))
    const hourlyRate = Number(currentEmployee.hourly_rate || (base > 0 ? Math.round(base / 208) : 0))

    let basic = 0
    let house = 0
    let transport = 0
    let medical = 0
    let food = 0

    if (currentEmployee.salary_structure && Number(currentEmployee.salary_structure.basic || 0) > 0) {
      basic = Number(currentEmployee.salary_structure.basic || 0)
      house = Number(currentEmployee.salary_structure.house_allowance || 0)
      transport = Number(currentEmployee.salary_structure.transport_allowance || 0)
      medical = Number(currentEmployee.salary_structure.medical_allowance || 0)
      food = Number(currentEmployee.salary_structure.food_allowance || 0)
    } else if (basis === 'monthly' && base > 0) {
      basic = Math.round(base * 0.6)
      house = Math.round(base * 0.2)
      transport = Math.round(base * 0.1)
      medical = Math.round(base * 0.1)
    }

    let grossEarnings = 0
    if (basis === 'daily_rate') {
      grossEarnings = (presentDaysCount * dailyRate) + totalOtEarnings
      basic = grossEarnings
    } else if (basis === 'hourly_rate') {
      const hoursWorked = Math.round((totalWorkedMinutes / 60) * 10) / 10
      grossEarnings = (hoursWorked * hourlyRate) + totalOtEarnings
      basic = grossEarnings
    } else {
      // Monthly salaried: gross = basic + allowances + overtime
      const totalAllowances = house + transport + medical + food
      grossEarnings = (basic > 0 ? basic + totalAllowances : base) + totalOtEarnings
    }

    // Estimated monthly deductions
    const advanceDeduction = Math.min(currentAdvanceBalance, Math.round(base * 0.2))
    const lateFine = lateDaysCount > 3 ? Math.round((lateDaysCount - 3) * (dailyRate * 0.5)) : 0
    const totalDeductions = advanceDeduction + lateFine
    const netPayable = Math.max(0, grossEarnings - totalDeductions)

    return {
      basis,
      base,
      dailyRate,
      hourlyRate,
      otHourlyRate,
      basic,
      house,
      transport,
      medical,
      food,
      totalOtEarnings,
      grossEarnings,
      advanceDeduction,
      lateFine,
      totalDeductions,
      netPayable,
    }
  }, [
    currentEmployee,
    totalOtEarnings,
    currentAdvanceBalance,
    lateDaysCount,
    presentDaysCount,
    totalWorkedMinutes,
    otHourlyRate,
  ])

  // =========================================================================
  // ACTIONS
  // =========================================================================

  // 1-Tap Clock In
  const clockIn = useCallback(async (notes?: string) => {
    if (!currentEmployee) return { success: false, error: 'Employee record not found.' }

    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5) // 'HH:mm'
    const isoStr = now.toISOString()

    // Determine late minutes based on duty settings
    const startTimeStr = currentEmployee.duty_settings?.office_start_time || '09:00'
    const graceMin = currentEmployee.duty_settings?.late_grace_minutes || 15
    const [startH, startM] = startTimeStr.split(':').map(Number)
    const [curH, curM] = timeStr.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const curMinutes = curH * 60 + curM
    const diff = curMinutes - (startMinutes + graceMin)
    const lateMinutes = diff > 0 ? diff : 0
    const status = lateMinutes > 0 ? 'late' : 'present'

    const newRecord: AttendanceDailySummaryRecord = {
      id: `att_${Date.now()}`,
      company_id: company?.id || '',
      branch_id: currentEmployee.branch_id || null,
      branch_name: currentEmployee.branch_name || null,
      employee_id: currentEmployee.id,
      employee_name: currentEmployee.name,
      employee_role: currentEmployee.role,
      employee_department: currentEmployee.department,
      attendance_date: todayStr,
      status: status as any,
      check_in_time: timeStr,
      check_in_at: isoStr,
      late_minutes: lateMinutes,
      early_leave_minutes: 0,
      worked_minutes: 0,
      potential_ot_minutes: 0,
      approved_ot_minutes: 0,
      attendance_source: 'qr_geo',
      notes: notes || 'Operator Self-Service Punch In',
      created_at: isoStr,
      updated_at: isoStr,
    }

    try {
      // 1. Local update
      const existing = PrintFlowDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.ATTENDANCE) || []
      const filtered = existing.filter((a) => !(a.employee_id === currentEmployee.id && a.attendance_date === todayStr))
      PrintFlowDataStore.set(STORAGE_KEYS.ATTENDANCE, [newRecord, ...filtered])

      // 2. Authoritative server record
      await recordSelfAttendancePunchAction({ type: 'clock_in', notes })
      loadData()
      return { success: true, record: newRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record check in' }
    }
  }, [currentEmployee, company?.id, todayStr, loadData])

  // 1-Tap Clock Out
  const clockOut = useCallback(async (notes?: string) => {
    if (!currentEmployee) return { success: false, error: 'Employee record not found.' }

    const now = new Date()
    const timeStr = now.toTimeString().slice(0, 5)
    const isoStr = now.toISOString()

    try {
      // 1. Local update
      const existing = PrintFlowDataStore.get<AttendanceDailySummaryRecord[]>(STORAGE_KEYS.ATTENDANCE) || []
      const todayIndex = existing.findIndex((a) => a.employee_id === currentEmployee.id && a.attendance_date === todayStr)

      let updatedRecord: AttendanceDailySummaryRecord
      if (todayIndex >= 0) {
        const prev = existing[todayIndex]
        let workedMins = 0
        if (prev.check_in_time) {
          const [inH, inM] = prev.check_in_time.split(':').map(Number)
          const [outH, outM] = timeStr.split(':').map(Number)
          workedMins = Math.max(0, (outH * 60 + outM) - (inH * 60 + inM))
        }

        const dutyMins = (currentEmployee.duty_settings?.daily_duty_hours || 8) * 60
        const potentialOtMins = workedMins > dutyMins ? workedMins - dutyMins : 0

        updatedRecord = {
          ...prev,
          check_out_time: timeStr,
          check_out_at: isoStr,
          worked_minutes: workedMins,
          worked_duration_formatted: `${Math.floor(workedMins / 60)}h ${workedMins % 60}m`,
          potential_ot_minutes: potentialOtMins,
          potential_ot_formatted: potentialOtMins > 0 ? `${Math.floor(potentialOtMins / 60)}h ${potentialOtMins % 60}m` : '0m',
          notes: notes ? `${prev.notes || ''} | ${notes}` : prev.notes,
          updated_at: isoStr,
        }
        existing[todayIndex] = updatedRecord
      } else {
        updatedRecord = {
          id: `att_${Date.now()}`,
          company_id: company?.id || '',
          branch_id: currentEmployee.branch_id || null,
          employee_id: currentEmployee.id,
          employee_name: currentEmployee.name,
          employee_role: currentEmployee.role,
          employee_department: currentEmployee.department,
          attendance_date: todayStr,
          status: 'present',
          check_out_time: timeStr,
          check_out_at: isoStr,
          late_minutes: 0,
          early_leave_minutes: 0,
          worked_minutes: 0,
          potential_ot_minutes: 0,
          approved_ot_minutes: 0,
          attendance_source: 'qr_geo',
          notes: notes || 'Operator Self-Service Punch Out',
          created_at: isoStr,
          updated_at: isoStr,
        }
        existing.unshift(updatedRecord)
      }

      PrintFlowDataStore.set(STORAGE_KEYS.ATTENDANCE, existing)

      // 2. Authoritative server record
      await recordSelfAttendancePunchAction({ type: 'clock_out', notes })
      loadData()
      return { success: true, record: updatedRecord }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to record check out' }
    }
  }, [currentEmployee, company?.id, todayStr, loadData])

  // Submit Leave Request
  const submitLeaveRequest = useCallback(async (data: {
    leave_type: LeaveRequestItem['leave_type']
    start_date: string
    end_date: string
    reason: string
  }) => {
    if (!currentEmployee) return { success: false, error: 'Employee not found.' }

    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)

    const item: LeaveRequestItem = {
      id: `leave_${Date.now()}`,
      employee_id: currentEmployee.id,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      days_count: days,
      reason: data.reason,
      status: 'pending',
      applied_at: new Date().toISOString(),
    }

    try {
      const existing = PrintFlowDataStore.get<LeaveRequestItem[]>('printflow_tenant_leave_requests' as any) || []
      PrintFlowDataStore.set('printflow_tenant_leave_requests' as any, [item, ...existing])
      loadData()
      return { success: true, item }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit leave request' }
    }
  }, [currentEmployee, loadData])

  // Submit Salary Advance Request
  const submitAdvanceRequest = useCallback(async (data: {
    amount: number
    reason: string
  }) => {
    if (!currentEmployee) return { success: false, error: 'Employee not found.' }

    const item: SalaryAdvanceRecord = {
      id: `adv_${Date.now()}`,
      company_id: company?.id || '',
      branch_id: currentEmployee.branch_id || null,
      advance_voucher_number: `ADV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      employee_id: currentEmployee.id,
      employee_name: currentEmployee.name,
      amount: data.amount,
      deducted_amount: 0,
      remaining_amount: data.amount,
      disbursed_date: todayStr,
      payment_method: 'cash',
      reason: data.reason,
      status: 'pending',
      is_settled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    try {
      // 1. Local update
      const existing = PrintFlowDataStore.get<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES) || []
      PrintFlowDataStore.set(STORAGE_KEYS.SALARY_ADVANCES, [item, ...existing])

      // 2. Authoritative server record
      await requestSelfSalaryAdvanceAction({ amount: data.amount, reason: data.reason })
      loadData()
      return { success: true, item }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to submit advance request' }
    }
  }, [currentEmployee, company?.id, todayStr, loadData])

  return {
    employee: currentEmployee,
    isLoading,
    isClockedIn,
    isClockedOut,
    todayAttendance,
    myAttendances,
    myMonthAttendances,
    presentDaysCount,
    lateDaysCount,
    totalLateMinutes,
    totalWorkedMinutes,
    approvedMonthOtHours,
    otHourlyRate,
    totalOtEarnings,
    myOvertimes,
    myLeaves,
    allowedLeaves,
    consumedMonthLeaves,
    remainingLeaves,
    myAdvances,
    currentAdvanceBalance,
    salaryStructure,
    clockIn,
    clockOut,
    submitLeaveRequest,
    submitAdvanceRequest,
    refreshWorkforce: loadData,
  }
}

