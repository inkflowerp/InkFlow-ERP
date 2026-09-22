'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Attendance, Time Tracking & Overtime Hub
// Designed for Bangladeshi Print & Signage Owners, Floor In-charges & HR
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  UserCheck,
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  QrCode,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Printer,
  ShieldCheck,
  Building,
  Radio,
  FileText,
  Wallet,
  SlidersHorizontal,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  CalendarRange,
  Clock3,
  User,
  Eye,
  Edit2,
  Layers,
  BarChart3,
  Activity,
  History,
  CheckCheck,
  ListChecks,
  HelpCircle,
  AlertCircle,
  Share2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'
import { PrintableQrPoster } from '@/components/attendance/printable-qr-poster'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
} from '@/types/workforce.types'
import {
  getEmployeesAction,
  getShiftsAction,
  createShiftAction,
  getDailyAttendanceAction,
  recordAttendanceSummaryAction,
  getOvertimeRecordsAction,
  createOvertimeRequestAction,
  reviewOvertimeAction,
} from '@/actions/workforce.actions'

const MONTHS_LIST = [
  { value: 1, nameEn: 'January', nameBn: 'জানুয়ারি' },
  { value: 2, nameEn: 'February', nameBn: 'ফেব্রুয়ারি' },
  { value: 3, nameEn: 'March', nameBn: 'মার্চ' },
  { value: 4, nameEn: 'April', nameBn: 'এপ্রিল' },
  { value: 5, nameEn: 'May', nameBn: 'মে' },
  { value: 6, nameEn: 'June', nameBn: 'জুন' },
  { value: 7, nameEn: 'July', nameBn: 'জুলাই' },
  { value: 8, nameEn: 'August', nameBn: 'আগস্ট' },
  { value: 9, nameEn: 'September', nameBn: 'সেপ্টেম্বর' },
  { value: 10, nameEn: 'October', nameBn: 'অক্টোবর' },
  { value: 11, nameEn: 'November', nameBn: 'নভেম্বর' },
  { value: 12, nameEn: 'December', nameBn: 'ডিসেম্বর' },
]

const YEARS_LIST = [2024, 2025, 2026, 2027, 2028, 2029, 2030]

function toLocalDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthDateRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  const startStr = `${year}-${String(month).padStart(2, '0')}-01`
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { startStr, endStr, lastDay }
}

function timeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null
  const parts = timeStr.trim().split(':')
  if (parts.length < 2) return null
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return null
  return h * 60 + m
}

function minutesToTimeString(minutes: number | null): string {
  if (minutes === null || isNaN(minutes)) return '--:--'
  const totalMins = Math.round(minutes) % 1440
  const h24 = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const period = h24 >= 12 ? 'PM' : 'AM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

function format12Hour(timeStr?: string | null): string {
  if (!timeStr) return '--:--'
  const mins = timeStringToMinutes(timeStr)
  return minutesToTimeString(mins)
}

function AttendanceContent() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || ''

  const [mounted, setMounted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roster' | 'duty_log' | 'reports' | 'overtime' | 'shifts'>('roster')
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateString(new Date()))

  // Data States
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  // Filters for Floor Roster
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')

  // ==========================================
  // EMPLOYEE DUTY LOG STATE
  // ==========================================
  const [logEmployeeId, setLogEmployeeId] = useState<string>('ALL')
  const [logStartDate, setLogStartDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return toLocalDateString(d)
  })
  const [logEndDate, setLogEndDate] = useState<string>(() => toLocalDateString(new Date()))
  const [logStatusFilter, setLogStatusFilter] = useState<string>('ALL')
  const [logSourceFilter, setLogSourceFilter] = useState<string>('ALL')
  const [logSearchTerm, setLogSearchTerm] = useState<string>('')
  const [logRecords, setLogRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [isLogLoading, setIsLogLoading] = useState<boolean>(false)

  // ==========================================
  // ATTENDANCE REPORTS STATE
  // ==========================================
  const now = new Date()
  const [reportSelectedYear, setReportSelectedYear] = useState<number>(now.getFullYear())
  const [reportSelectedMonth, setReportSelectedMonth] = useState<number>(now.getMonth() + 1)
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [reportMonth, setReportMonth] = useState<string>(currentMonthStr)
  const [reportPreset, setReportPreset] = useState<'this_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'custom'>('this_month')
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    return getMonthDateRange(now.getFullYear(), now.getMonth() + 1).startStr
  })
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return getMonthDateRange(now.getFullYear(), now.getMonth() + 1).endStr
  })
  const [reportDeptFilter, setReportDeptFilter] = useState<string>('ALL')
  const [reportSearchTerm, setReportSearchTerm] = useState<string>('')
  const [reportViewMode, setReportViewMode] = useState<'matrix' | 'summary' | 'departments'>('summary')
  const [reportRecords, setReportRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [isReportLoading, setIsReportLoading] = useState<boolean>(false)

  // View Log Modal State
  const [isViewLogModalOpen, setIsViewLogModalOpen] = useState<boolean>(false)
  const [viewLogEmployee, setViewLogEmployee] = useState<EmployeeRecord | null>(null)

  // ==========================================
  // MODALS & DIALOGS
  // ==========================================
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isOtModalOpen, setIsOtModalOpen] = useState(false)
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false)
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false)
  const [isQrPosterOpen, setIsQrPosterOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDailySummaryRecord | null>(null)

  // Time Adjustment Modal for Duty Log
  const [isTimeAdjustModalOpen, setIsTimeAdjustModalOpen] = useState(false)
  const [timeAdjustForm, setTimeAdjustForm] = useState<{
    employeeId: string
    employeeName: string
    attendanceDate: string
    status: AttendanceDailySummaryRecord['status']
    checkInTime: string
    checkOutTime: string
    shiftId: string
    notes: string
  }>({
    employeeId: '',
    employeeName: '',
    attendanceDate: '',
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    shiftId: '',
    notes: 'Duty time adjusted by supervisor',
  })

  // Printable Employee Timesheet Modal
  const [isPrintTimesheetModalOpen, setIsPrintTimesheetModalOpen] = useState(false)
  const [printTimesheetEmployee, setPrintTimesheetEmployee] = useState<EmployeeRecord | null>(null)

  // Manual Attendance Form
  const [manualForm, setManualForm] = useState<{
    employeeId: string
    attendanceDate: string
    status: AttendanceDailySummaryRecord['status']
    checkInTime: string
    checkOutTime: string
    shiftId: string
    notes: string
  }>({
    employeeId: '',
    attendanceDate: toLocalDateString(new Date()),
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    shiftId: '',
    notes: 'Floor manual attendance entry',
  })

  // Overtime Form
  const [otForm, setOtForm] = useState<{
    employeeId: string
    otDate: string
    durationMinutes: number
    otType: OvertimeRecord['ot_type']
    reason: string
  }>({
    employeeId: '',
    otDate: toLocalDateString(new Date()),
    durationMinutes: 120,
    otType: 'regular_day',
    reason: 'Urgent production delivery overtime',
  })

  // Shift Form
  const [shiftForm, setShiftForm] = useState<{
    shift_name: string
    start_time: string
    end_time: string
    grace_period_minutes: number
    is_overnight: boolean
  }>({
    shift_name: 'Regular Day Shift',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_overnight: false,
  })

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Initial & Daily Data Loading
  const loadData = async () => {
    setIsLoading(true)
    try {
      const [empRes, attRes, otRes, shiftRes] = await Promise.all([
        getEmployeesAction({ status: 'active' }),
        getDailyAttendanceAction({ date: selectedDate }),
        getOvertimeRecordsAction(),
        getShiftsAction(),
      ])

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (attRes.success && attRes.data) setAttendanceRecords(attRes.data)
      if (otRes.success && otRes.data) setOvertimeRecords(otRes.data)
      if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data)
    } catch (err: any) {
      console.error('Failed to load attendance data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadData()
  }, [selectedDate])

  // Realtime Broadcast & Synced Event Listeners
  useEffect(() => {
    const handleSync = () => {
      loadData()
      if (activeTab === 'duty_log') loadDutyLogData()
      if (activeTab === 'reports') loadReportsData()
    }

    window.addEventListener('printerp_table_synced:attendance', handleSync)
    window.addEventListener('printerp_table_synced:employees', handleSync)
    window.addEventListener('printerp_table_synced:overtime_records', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:attendance', handleSync)
      window.removeEventListener('printerp_table_synced:employees', handleSync)
      window.removeEventListener('printerp_table_synced:overtime_records', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [activeTab, selectedDate, logStartDate, logEndDate, logEmployeeId, reportStartDate, reportEndDate])

  // Load Duty Log Data when tab or filters change
  const loadDutyLogData = async () => {
    setIsLogLoading(true)
    try {
      const res = await getDailyAttendanceAction({
        startDate: logStartDate,
        endDate: logEndDate,
        employeeId: logEmployeeId === 'ALL' ? undefined : logEmployeeId,
      })
      if (res.success && res.data) {
        setLogRecords(res.data)
      }
    } catch (err) {
      console.error('Failed to load duty log records', err)
    } finally {
      setIsLogLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'duty_log') {
      loadDutyLogData()
    }
  }, [activeTab, logStartDate, logEndDate, logEmployeeId])

  // Load Reports Data when tab or date range changes
  const loadReportsData = async () => {
    setIsReportLoading(true)
    try {
      const res = await getDailyAttendanceAction({
        startDate: reportStartDate,
        endDate: reportEndDate,
      })
      if (res.success && res.data) {
        setReportRecords(res.data)
      }
    } catch (err) {
      console.error('Failed to load report attendance records', err)
    } finally {
      setIsReportLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'reports' || isViewLogModalOpen) {
      loadReportsData()
    }
  }, [activeTab, reportStartDate, reportEndDate, isViewLogModalOpen])

  // Date Preset Switcher for Reports
  const handleSelectReportPreset = (preset: 'this_month' | 'last_month' | 'last_7_days' | 'last_30_days' | 'custom') => {
    setReportPreset(preset)
    const today = new Date()
    if (preset === 'this_month') {
      const y = today.getFullYear()
      const m = today.getMonth() + 1
      const { startStr, endStr } = getMonthDateRange(y, m)
      setReportStartDate(startStr)
      setReportEndDate(endStr)
      setReportSelectedYear(y)
      setReportSelectedMonth(m)
      setReportMonth(`${y}-${String(m).padStart(2, '0')}`)
    } else if (preset === 'last_month') {
      const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const y = prev.getFullYear()
      const m = prev.getMonth() + 1
      const { startStr, endStr } = getMonthDateRange(y, m)
      setReportStartDate(startStr)
      setReportEndDate(endStr)
      setReportSelectedYear(y)
      setReportSelectedMonth(m)
      setReportMonth(`${y}-${String(m).padStart(2, '0')}`)
    } else if (preset === 'last_7_days') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
      setReportStartDate(toLocalDateString(start))
      setReportEndDate(toLocalDateString(today))
    } else if (preset === 'last_30_days') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29)
      setReportStartDate(toLocalDateString(start))
      setReportEndDate(toLocalDateString(today))
    }
  }

  const handlePeriodChange = (year: number, month: number) => {
    setReportSelectedYear(year)
    setReportSelectedMonth(month)
    setReportPreset('custom')
    const { startStr, endStr } = getMonthDateRange(year, month)
    setReportStartDate(startStr)
    setReportEndDate(endStr)
    setReportMonth(`${year}-${String(month).padStart(2, '0')}`)
  }

  const handleMonthChange = (monthStr: string) => {
    setReportMonth(monthStr)
    setReportPreset('custom')
    const [y, m] = monthStr.split('-').map(Number)
    if (y && m) {
      setReportSelectedYear(y)
      setReportSelectedMonth(m)
      const { startStr, endStr } = getMonthDateRange(y, m)
      setReportStartDate(startStr)
      setReportEndDate(endStr)
    }
  }

  const handleOpenViewLogModal = (emp: EmployeeRecord) => {
    setViewLogEmployee(emp)
    setIsViewLogModalOpen(true)
  }

  // Generate Array of Calendar Days for the active report range
  const reportDays = React.useMemo(() => {
    const days: { dayNum: number; dateStr: string; dayOfWeek: string; isFriday: boolean }[] = []
    if (!reportStartDate || !reportEndDate) return days

    const [sY, sM, sD] = reportStartDate.split('-').map(Number)
    const [eY, eM, eD] = reportEndDate.split('-').map(Number)
    if (!sY || !sM || !sD || !eY || !eM || !eD) return days

    // Use local noon (12:00:00) to prevent daylight savings / UTC midnight shifting
    const cur = new Date(sY, sM - 1, sD, 12, 0, 0)
    const end = new Date(eY, eM - 1, eD, 12, 0, 0)

    while (cur <= end) {
      const year = cur.getFullYear()
      const month = String(cur.getMonth() + 1).padStart(2, '0')
      const day = String(cur.getDate()).padStart(2, '0')
      const dateStr = `${year}-${month}-${day}`
      const dayNum = cur.getDate()
      const dayOfWeek = cur.toLocaleDateString('en-US', { weekday: 'short' })
      const isFriday = cur.getDay() === 5 // Friday = 5 in JS Date

      days.push({ dayNum, dateStr, dayOfWeek, isFriday })
      cur.setDate(cur.getDate() + 1)
    }

    return days
  }, [reportStartDate, reportEndDate])

  // Date Navigator Helpers for Daily Roster
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d, 12, 0, 0)
    date.setDate(date.getDate() - 1)
    setSelectedDate(toLocalDateString(date))
  }

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d, 12, 0, 0)
    date.setDate(date.getDate() + 1)
    setSelectedDate(toLocalDateString(date))
  }

  const handleToday = () => {
    setSelectedDate(toLocalDateString(new Date()))
  }

  const handleOpenManualModal = (emp?: EmployeeRecord, existing?: AttendanceDailySummaryRecord) => {
    if (existing) {
      setSelectedAttendance(existing)
      setManualForm({
        employeeId: existing.employee_id,
        attendanceDate: existing.attendance_date,
        status: existing.status,
        checkInTime: existing.check_in_time || '09:00',
        checkOutTime: existing.check_out_time || '18:00',
        shiftId: existing.shift_id || '',
        notes: existing.notes || '',
      })
    } else {
      setSelectedAttendance(null)
      setManualForm({
        employeeId: emp?.id || employees[0]?.id || '',
        attendanceDate: selectedDate,
        status: 'present',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        shiftId: shifts[0]?.id || '',
        notes: 'Floor manual attendance',
      })
    }
    setIsManualModalOpen(true)
  }

  const handleOpenTimeAdjust = (record: AttendanceDailySummaryRecord) => {
    const emp = employees.find((e) => e.id === record.employee_id)
    setTimeAdjustForm({
      employeeId: record.employee_id,
      employeeName: emp?.name || record.employee_name || 'Staff',
      attendanceDate: record.attendance_date,
      status: record.status,
      checkInTime: record.check_in_time || '09:00',
      checkOutTime: record.check_out_time || '18:00',
      shiftId: record.shift_id || '',
      notes: record.notes || 'Duty time adjusted by supervisor',
    })
    setIsTimeAdjustModalOpen(true)
  }

  const handleSaveTimeAdjust = async () => {
    if (!timeAdjustForm.employeeId) return
    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: timeAdjustForm.employeeId,
        attendanceDate: timeAdjustForm.attendanceDate,
        status: timeAdjustForm.status,
        checkInTime: timeAdjustForm.checkInTime,
        checkOutTime: timeAdjustForm.checkOutTime,
        shiftId: timeAdjustForm.shiftId || undefined,
        attendanceSource: 'manual',
        notes: timeAdjustForm.notes,
      })

      if (res.success) {
        notify('Duty log time adjusted and recalculated successfully.')
        setIsTimeAdjustModalOpen(false)
        loadDutyLogData()
        loadData()
      } else {
        notify(res.error || 'Failed to adjust duty time.')
      }
    })
  }

  const handleOpenPrintTimesheet = (emp: EmployeeRecord) => {
    setPrintTimesheetEmployee(emp)
    setIsPrintTimesheetModalOpen(true)
  }

  const handleSaveManualAttendance = async () => {
    if (!manualForm.employeeId) {
      notify('Please select an employee.')
      return
    }

    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: manualForm.employeeId,
        attendanceDate: manualForm.attendanceDate,
        status: manualForm.status,
        checkInTime: manualForm.checkInTime,
        checkOutTime: manualForm.checkOutTime,
        shiftId: manualForm.shiftId || undefined,
        attendanceSource: 'manual',
        notes: manualForm.notes,
      })

      if (res.success) {
        notify('Attendance record saved successfully.')
        setIsManualModalOpen(false)
        loadData()
        if (activeTab === 'duty_log') loadDutyLogData()
        if (activeTab === 'reports') loadReportsData()
      } else {
        notify(res.error || 'Failed to record attendance.')
      }
    })
  }

  const handleSaveOtRequest = async () => {
    if (!otForm.employeeId) {
      notify('Please select an employee.')
      return
    }

    startTransition(async () => {
      const res = await createOvertimeRequestAction({
        employeeId: otForm.employeeId,
        otDate: otForm.otDate,
        durationMinutes: Number(otForm.durationMinutes),
        otType: otForm.otType,
        reason: otForm.reason,
      })

      if (res.success) {
        notify('Overtime request submitted for approval.')
        setIsOtModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to submit overtime request.')
      }
    })
  }

  const handleReviewOt = async (id: string, status: 'approved' | 'rejected', multiplier = 1.5) => {
    startTransition(async () => {
      const res = await reviewOvertimeAction({ id, status, multiplier })
      if (res.success) {
        notify(`Overtime request ${status === 'approved' ? 'Approved' : 'Rejected'}.`)
        loadData()
        if (activeTab === 'duty_log') loadDutyLogData()
      } else {
        notify(res.error || 'Failed to review overtime.')
      }
    })
  }

  const handleCreateShift = async () => {
    if (!shiftForm.shift_name.trim()) {
      notify('Please enter shift name.')
      return
    }

    startTransition(async () => {
      const res = await createShiftAction({
        shift_name: shiftForm.shift_name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        grace_period_minutes: Number(shiftForm.grace_period_minutes),
        is_overnight: shiftForm.is_overnight,
      })

      if (res.success) {
        notify('New work shift created successfully.')
        setIsNewShiftModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to create shift.')
      }
    })
  }

  // Export Attendance Report to CSV
  const handleExportReportCSV = () => {
    if (employees.length === 0) return
    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Role',
      'Employment Type',
      'Salary Basis',
      'Base Salary (BDT)',
      'Total Working Days',
      'Present Days',
      'Late Arrivals',
      'Total Late Minutes',
      'Absent Days',
      'Approved Leaves',
      'Field Work Days',
      'Total Worked Hours',
      'Total OT Hours',
      'Estimated OT Pay (BDT)',
      'Attendance Score %',
    ]

    const filteredEmps = employees.filter((emp) => {
      const matchSearch =
        !reportSearchTerm.trim() ||
        emp.name.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        emp.employee_id_number.toLowerCase().includes(reportSearchTerm.toLowerCase())
      const matchDept = reportDeptFilter === 'ALL' || emp.department === reportDeptFilter
      return matchSearch && matchDept
    })

    const rows = filteredEmps.map((emp) => {
      const empAtts = reportRecords.filter((r) => r.employee_id === emp.id)
      const pCount = empAtts.filter((r) => r.status === 'present' || r.status === 'half_day' || r.status === 'late').length
      const lCount = empAtts.filter((r) => r.status === 'late' || (r.late_minutes && r.late_minutes > 0)).length
      const lMins = empAtts.reduce((sum, r) => sum + (r.late_minutes || 0), 0)
      const aCount = empAtts.filter((r) => r.status === 'absent').length
      const lvCount = empAtts.filter((r) => r.status === 'leave').length
      const fCount = empAtts.filter((r) => r.status === 'field_work').length
      const workedHrs = Math.round((empAtts.reduce((sum, r) => sum + (r.worked_minutes || 0), 0) / 60) * 10) / 10
      const otHrs = Math.round((empAtts.reduce((sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0), 0) / 60) * 10) / 10
      const otPay = Math.round(otHrs * (emp.overtime_hourly_rate || (emp.base_salary ? Math.round(emp.base_salary / 208 * 1.5) : 0)))
      const workDays = reportDays.filter((d) => !d.isFriday).length || 26
      const score = workDays > 0 ? Math.min(100, Math.round((pCount / workDays) * 100)) : 100

      return [
        `"${emp.employee_id_number}"`,
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${emp.department}"`,
        `"${emp.role.replace(/"/g, '""')}"`,
        `"${emp.employee_type}"`,
        `"${emp.salary_basis}"`,
        emp.base_salary || 0,
        workDays,
        pCount,
        lCount,
        lMins,
        aCount,
        lvCount,
        fCount,
        workedHrs,
        otHrs,
        otPay,
        `${score}%`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Attendance_Report_${reportStartDate}_to_${reportEndDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    notify('Attendance report exported to CSV successfully.')
  }

  // Attendance Calculations for Selected Date
  const presentCount = attendanceRecords.filter((a) => a.status === 'present' || a.status === 'half_day').length
  const lateCount = attendanceRecords.filter((a) => a.status === 'late' || (a.late_minutes && a.late_minutes > 0)).length
  const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length
  const leaveCount = attendanceRecords.filter((a) => a.status === 'leave').length
  const fieldCount = attendanceRecords.filter((a) => a.status === 'field_work' || a.job_order_id).length
  const totalPotentialOtMins = attendanceRecords.reduce((sum, a) => sum + (a.potential_ot_minutes || 0), 0)

  // Map employee rows with their attendance record for the date
  const combinedRoster = React.useMemo(() => {
    return employees.map((emp) => {
      const att = attendanceRecords.find((a) => a.employee_id === emp.id)
      return {
        emp,
        att: att || null,
      }
    }).filter(({ emp, att }) => {
      const matchSearch =
        !searchTerm.trim() ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter
      const matchStatus = statusFilter === 'ALL' || (att ? att.status === statusFilter : statusFilter === 'unmarked')
      return matchSearch && matchDept && matchStatus
    })
  }, [employees, attendanceRecords, searchTerm, deptFilter, statusFilter])

  // Filtered Duty Log Records
  const filteredDutyLogs = React.useMemo(() => {
    return logRecords.filter((r) => {
      const emp = employees.find((e) => e.id === r.employee_id)
      const empName = emp?.name || r.employee_name || ''
      const empIdNum = emp?.employee_id_number || ''
      const matchSearch =
        !logSearchTerm.trim() ||
        empName.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        empIdNum.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
        (r.job_order_id && r.job_order_id.toLowerCase().includes(logSearchTerm.toLowerCase()))
      const matchStatus = logStatusFilter === 'ALL' || r.status === logStatusFilter
      const matchSource = logSourceFilter === 'ALL' || r.attendance_source === logSourceFilter
      return matchSearch && matchStatus && matchSource
    })
  }, [logRecords, employees, logSearchTerm, logStatusFilter, logSourceFilter])

  const logTotalHours = React.useMemo(() => {
    return Math.round((filteredDutyLogs.reduce((sum, r) => sum + (r.worked_minutes || 0), 0) / 60) * 10) / 10
  }, [filteredDutyLogs])

  const logTotalOtHours = React.useMemo(() => {
    return Math.round((filteredDutyLogs.reduce((sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0), 0) / 60) * 10) / 10
  }, [filteredDutyLogs])

  const logOnTimeRate = React.useMemo(() => {
    if (filteredDutyLogs.length === 0) return 100
    const onTimeCount = filteredDutyLogs.filter((r) => r.status === 'present' && (!r.late_minutes || r.late_minutes === 0)).length
    return Math.round((onTimeCount / filteredDutyLogs.length) * 100)
  }, [filteredDutyLogs])

  // Filtered Employees for Reports
  const reportFilteredEmps = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !reportSearchTerm.trim() ||
        emp.name.toLowerCase().includes(reportSearchTerm.toLowerCase()) ||
        emp.employee_id_number.toLowerCase().includes(reportSearchTerm.toLowerCase())
      const matchDept = reportDeptFilter === 'ALL' || emp.department === reportDeptFilter
      return matchSearch && matchDept
    })
  }, [employees, reportSearchTerm, reportDeptFilter])

  // Aggregate stats for Reports
  const reportSummaryStats = React.useMemo(() => {
    const totalWorkingDays = reportDays.filter((d) => !d.isFriday).length || 26
    const empIds = new Set(reportFilteredEmps.map((e) => e.id))
    const relevantRecords = reportRecords.filter((r) => empIds.has(r.employee_id))

    const presentCount = relevantRecords.filter((r) => r.status === 'present' || r.status === 'half_day' || r.status === 'late').length
    const lateCount = relevantRecords.filter((r) => r.status === 'late' || (r.late_minutes && r.late_minutes > 0)).length
    const totalLateMins = relevantRecords.reduce((sum, r) => sum + (r.late_minutes || 0), 0)
    const absentCount = relevantRecords.filter((r) => r.status === 'absent').length
    const leaveCount = relevantRecords.filter((r) => r.status === 'leave').length
    const fieldCount = relevantRecords.filter((r) => r.status === 'field_work').length
    const workedHrs = Math.round((relevantRecords.reduce((sum, r) => sum + (r.worked_minutes || 0), 0) / 60) * 10) / 10
    const otHrs = Math.round((relevantRecords.reduce((sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0), 0) / 60) * 10) / 10

    let estimatedOtPay = 0
    reportFilteredEmps.forEach((emp) => {
      const empAtts = relevantRecords.filter((r) => r.employee_id === emp.id)
      const empOtHrs = empAtts.reduce((sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0), 0) / 60
      const rate = emp.overtime_hourly_rate || (emp.base_salary ? Math.round(emp.base_salary / 208 * 1.5) : 0)
      estimatedOtPay += Math.round(empOtHrs * rate)
    })

    const potentialManDays = (reportFilteredEmps.length || 1) * totalWorkingDays
    const presentRate = potentialManDays > 0 ? Math.min(100, Math.round((presentCount / potentialManDays) * 100)) : 0

    return {
      totalWorkingDays,
      presentCount,
      lateCount,
      totalLateMins,
      absentCount,
      leaveCount,
      fieldCount,
      workedHrs,
      otHrs,
      estimatedOtPay,
      presentRate,
      workforceCount: reportFilteredEmps.length,
    }
  }, [reportDays, reportFilteredEmps, reportRecords])

  // Departmental breakdown for Report View Mode 3
  const departmentBreakdown = React.useMemo(() => {
    const depts = ['printing', 'finishing', 'fabrication', 'design', 'installation', 'accounts', 'sales', 'management']
    return depts.map((d) => {
      const emps = reportFilteredEmps.filter((e) => e.department === d)
      if (emps.length === 0) return null
      const empIds = new Set(emps.map((e) => e.id))
      const atts = reportRecords.filter((r) => empIds.has(r.employee_id))
      const pCount = atts.filter((r) => r.status === 'present' || r.status === 'half_day' || r.status === 'late').length
      const totalDays = (reportDays.filter((day) => !day.isFriday).length || 26) * emps.length
      const pRate = totalDays > 0 ? Math.min(100, Math.round((pCount / totalDays) * 100)) : 0
      const workedHrs = Math.round((atts.reduce((sum, r) => sum + (r.worked_minutes || 0), 0) / 60) * 10) / 10
      const otHrs = Math.round((atts.reduce((sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0), 0) / 60) * 10) / 10
      const lateMins = atts.reduce((sum, r) => sum + (r.late_minutes || 0), 0)

      return {
        dept: d,
        headcount: emps.length,
        presentRate: pRate,
        workedHrs,
        otHrs,
        lateMins,
      }
    }).filter(Boolean)
  }, [reportFilteredEmps, reportRecords, reportDays])

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="h-14 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Floor Attendance & Overtime"
        titleBn="কারখানার হাজিরা ও ওভারটাইম"
        descriptionEn="Daily check-ins, employee duty punch logs, monthly attendance matrix & overtime approvals"
        descriptionBn="দৈনিক উপস্থিতি, কর্মীদের ডিউটি ও পাঞ্চ লগ, মাসিক হাজিরা ম্যাট্রিক্স ও ওভারটাইম অনুমোদন"
        icon={UserCheck}
        iconColor="text-emerald-600 dark:text-emerald-400"
        badge={
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 bangla-text">
            {tBilingual('Live Shift Tracker', 'লাইভ শিফট ট্র্যাকার')}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 hidden md:inline-flex"
            >
              <Link href={getTenantNavHref('/hr/employees', pathname, tenantSlug)}>
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {tBilingual('Staff Directory', 'কর্মী তালিকা')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 hidden sm:inline-flex"
            >
              <Link href={getTenantNavHref('/hr/payroll', pathname, tenantSlug)}>
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                {tBilingual('Payroll & Salary', 'পেরোল')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsQrPosterOpen(true)}
              className="gap-1.5 text-xs h-9"
            >
              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
              {tBilingual('Print QR Poster', 'পোস্টার প্রিন্ট')}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPunchModalOpen(true)}
              className="gap-1.5 text-xs h-9 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
            >
              <QrCode className="w-3.5 h-3.5" />
              {tBilingual('Live QR Scanner', 'কিউআর স্ক্যানার')}
            </Button>

            <Button
              size="sm"
              onClick={() => handleOpenManualModal()}
              className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs bangla-text"
            >
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Mark Manual Attendance', 'ম্যানুয়াল হাজিরা')}
            </Button>
          </div>
        }
      />

      {/* Date Navigator Bar & Tabs */}
      <Card className="p-3 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation Tabs (5 Tabs) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'roster'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{tBilingual('Floor Roster', 'দৈনিক হাজিরা')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('duty_log')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'duty_log'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>{tBilingual('Duty & Punch Log', 'ডিউটি ও পাঞ্চ লগ')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'reports'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{tBilingual('Attendance Reports', 'হাজিরা রিপোর্ট ও ম্যাট্রিক্স')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overtime')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'overtime'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{tBilingual('Overtime Approvals', 'ওভারটাইম অনুমোদন')}</span>
              {overtimeRecords.filter((o) => o.status === 'pending_approval').length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'overtime'
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold'
                }`}>
                  {overtimeRecords.filter((o) => o.status === 'pending_approval').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shifts')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'shifts'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{tBilingual('Shift Config', 'শিফট কনফিগ')}</span>
            </button>
          </div>

          {/* Date Controls (For Daily Floor Roster) */}
          {activeTab === 'roster' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800" onClick={handlePrevDay} title="Previous Day">
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </Button>

              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-xs h-8 w-36 font-medium border-slate-200 dark:border-slate-800"
              />

              <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800" onClick={handleNextDay} title="Next Day">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </Button>

              <Button size="sm" variant="secondary" className="text-xs h-8 px-2.5 font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200" onClick={handleToday}>
                {tBilingual('Today', 'আজ')}
              </Button>
            </div>
          )}

          {activeTab === 'duty_log' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={loadDutyLogData}
                disabled={isLogLoading}
                className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLogLoading ? 'animate-spin' : ''}`} />
                {tBilingual('Refresh Log', 'রিফ্রেশ')}
              </Button>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportReportCSV}
                className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
              >
                <Download className="w-3.5 h-3.5" />
                {tBilingual('Export CSV', 'সিএসভি ডাউনলোড')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                {tBilingual('Print Report', 'প্রিন্ট')}
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* ======================================================== */}
      {/* TAB 1: DAILY FLOOR ATTENDANCE ROSTER                     */}
      {/* ======================================================== */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Top KPI Metrics Row for Selected Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Present', 'উপস্থিত')}
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {presentCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Late Check-ins', 'দেরিতে প্রবেশ')}
              </span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {lateCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Absent', 'অনুপস্থিত')}
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {absentCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('On Leave', 'ছুটিতে')}
              </span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {leaveCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Field Work', 'বাইরের কাজ')}
              </span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {fieldCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Potential OT', 'সম্ভাব্য ওভারটাইম')}
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {Math.round(totalPotentialOtMins / 60 * 10) / 10}h
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={tBilingual('Search employee...', 'কর্মী খুঁজুন...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-8 font-medium"
                  />
                </div>

                {/* Status Filter */}
                <select
                  aria-label="Filter roster by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="ALL">{tBilingual('All Statuses', 'সব স্ট্যাটাস')}</option>
                  <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                  <option value="unmarked">{tBilingual('Unmarked', 'হাজিরা দেওয়া হয়নি')}</option>
                </select>

                {/* Department Filter */}
                <select
                  aria-label="Filter roster by department"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="ALL">{tBilingual('All Departments', 'সব বিভাগ')}</option>
                  <option value="printing">{tBilingual('Printing', 'প্রিন্টিং')}</option>
                  <option value="finishing">{tBilingual('Finishing', 'ফিনিশিং')}</option>
                  <option value="fabrication">{tBilingual('Fabrication', 'ফ্যাব্রিকেশন')}</option>
                  <option value="design">{tBilingual('Design', 'ডিজাইন')}</option>
                  <option value="installation">{tBilingual('Installation', 'ইনস্টলেশন')}</option>
                  <option value="accounts">{tBilingual('Accounts', 'হিসাব')}</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-mono">
                Date: <strong>{formatDate(selectedDate)}</strong>
              </div>
            </div>
          </Card>

          {/* Roster Table */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Daily Floor Attendance Roster', 'দৈনিক ফ্লোর হাজিরা তালিকা')}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {combinedRoster.length} employees
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                    <th className="p-3.5">{tBilingual('Shift', 'শিফট')}</th>
                    <th className="p-3.5">{tBilingual('Check In', 'প্রবেশ')}</th>
                    <th className="p-3.5">{tBilingual('Check Out', 'প্রস্থান')}</th>
                    <th className="p-3.5">{tBilingual('Worked Hours', 'কাজের সময়')}</th>
                    <th className="p-3.5">{tBilingual('Late / OT', 'দেরি / ওভারটাইম')}</th>
                    <th className="p-3.5">{tBilingual('Source', 'উৎস')}</th>
                    <th className="p-3.5">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                    <th className="p-3.5 pr-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {combinedRoster.map(({ emp, att }) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.employee_id_number} • <span className="capitalize">{emp.department}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400">
                        {att?.shift_name || 'Regular Shift (09:00 - 18:00)'}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_in_time ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{att.check_in_time}</span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_out_time ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{att.check_out_time}</span>
                        ) : att?.check_in_time ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            On Floor
                          </Badge>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {att?.worked_minutes ? (
                          <span>{Math.round((att.worked_minutes / 60) * 10) / 10} hrs</span>
                        ) : (
                          <span className="text-slate-400">0 hrs</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {att?.late_minutes && att.late_minutes > 0 ? (
                            <div className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                              +{att.late_minutes}m Late
                            </div>
                          ) : null}
                          {att?.potential_ot_minutes && att.potential_ot_minutes > 0 ? (
                            <div className="text-purple-600 dark:text-purple-400 font-medium text-[11px]">
                              +{Math.round((att.potential_ot_minutes / 60) * 10) / 10}h OT
                            </div>
                          ) : null}
                          {!att?.late_minutes && !att?.potential_ot_minutes && (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {att?.attendance_source || 'manual'}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        {att ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 capitalize ${
                              att.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : att.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : att.status === 'absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : att.status === 'leave'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {att.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-dashed border-slate-300 dark:border-slate-700">
                            Unmarked
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 px-2 font-medium"
                          onClick={() => handleOpenManualModal(emp, att || undefined)}
                        >
                          {att ? tBilingual('Edit', 'সম্পাদন') : tBilingual('Mark', 'হাজিরা দিন')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: EMPLOYEE DUTY LOG & PUNCH AUDIT TRAIL             */}
      {/* ======================================================== */}
      {activeTab === 'duty_log' && (
        <div className="space-y-4">
          {/* Duty Log Top Stats Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">
                  {tBilingual('Total Duty Logs', 'মোট লগ এন্ট্রি')}
                </span>
                <History className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {filteredDutyLogs.length}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">
                  {tBilingual('On-Time Check-in Rate', 'সময়মতো আগমন হার')}
                </span>
                <CheckCheck className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {logOnTimeRate}%
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">
                  {tBilingual('Total Worked Hours', 'মোট কাজের ঘণ্টা')}
                </span>
                <Clock3 className="w-4 h-4 text-purple-500" />
              </div>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
                {logTotalHours} hrs
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 uppercase font-semibold">
                  {tBilingual('Overtime Logged', 'রেকর্ডকৃত ওভারটাইম')}
                </span>
                <Activity className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {logTotalOtHours} hrs
              </div>
            </Card>
          </div>

          {/* Filter Bar */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Employee Selector */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">
                  {tBilingual('Employee', 'কর্মী')}
                </Label>
                <select
                  aria-label="Filter duty log by employee"
                  value={logEmployeeId}
                  onChange={(e) => setLogEmployeeId(e.target.value)}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">{tBilingual('All Floor Workers', 'সব কর্মী')}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id_number})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">
                  {tBilingual('From Date', 'শুরুর তারিখ')}
                </Label>
                <Input
                  type="date"
                  value={logStartDate}
                  onChange={(e) => setLogStartDate(e.target.value)}
                  className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* End Date */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">
                  {tBilingual('To Date', 'শেষের তারিখ')}
                </Label>
                <Input
                  type="date"
                  value={logEndDate}
                  onChange={(e) => setLogEndDate(e.target.value)}
                  className="h-8 text-xs font-medium border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Status Filter */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">
                  {tBilingual('Duty Status', 'স্ট্যাটাস')}
                </Label>
                <select
                  aria-label="Filter duty log by status"
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">{tBilingual('All Statuses', 'সব স্ট্যাটাস')}</option>
                  <option value="present">{tBilingual('Present / Regular', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late Check-in', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                </select>
              </div>

              {/* Punch Source Filter */}
              <div>
                <Label className="text-[10px] text-slate-500 uppercase font-semibold mb-1 block">
                  {tBilingual('Punch Source', 'পাঞ্চের মাধ্যম')}
                </Label>
                <select
                  aria-label="Filter duty log by source"
                  value={logSourceFilter}
                  onChange={(e) => setLogSourceFilter(e.target.value)}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">{tBilingual('All Sources', 'সব মাধ্যম')}</option>
                  <option value="qr_scanner">{tBilingual('QR Scanner Station', 'কিউআর স্ক্যানার')}</option>
                  <option value="mobile_gps">{tBilingual('Mobile GPS Self-Punch', 'মোবাইল জিপিএস')}</option>
                  <option value="manual">{tBilingual('Manual / Supervisor', 'ম্যানুয়াল এন্ট্রি')}</option>
                </select>
              </div>
            </div>

            {/* Quick Search */}
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={tBilingual('Search employee, ID or Job Order #...', 'কর্মী, আইডি বা জব অর্ডার দিয়ে খুঁজুন...')}
                  value={logSearchTerm}
                  onChange={(e) => setLogSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 font-medium"
                />
              </div>

              {logEmployeeId !== 'ALL' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const emp = employees.find((e) => e.id === logEmployeeId)
                    if (emp) handleOpenPrintTimesheet(emp)
                  }}
                  className="text-xs h-8 gap-1.5 border-slate-200 dark:border-slate-800"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  {tBilingual('Print Employee Timesheet', 'টাইমশিট প্রিন্ট')}
                </Button>
              )}
            </div>
          </Card>

          {/* Duty Log Audit Table */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Continuous Duty & Attendance Log', 'ধারাবাহিক ডিউটি ও পাঞ্চ লগ হিস্ট্রি')}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {filteredDutyLogs.length} logs
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                    <th className="p-3.5 pl-4">{tBilingual('Date / Day', 'তারিখ / বার')}</th>
                    <th className="p-3.5">{tBilingual('Employee', 'কর্মী')}</th>
                    <th className="p-3.5">{tBilingual('Shift / Schedule', 'শিফট')}</th>
                    <th className="p-3.5">{tBilingual('Punch In', 'প্রবেশ')}</th>
                    <th className="p-3.5">{tBilingual('Punch Out', 'প্রস্থান')}</th>
                    <th className="p-3.5">{tBilingual('Worked Hours', 'কাজের সময়')}</th>
                    <th className="p-3.5">{tBilingual('Late / OT', 'বিলম্ব / ওভারটাইম')}</th>
                    <th className="p-3.5">{tBilingual('Source & Mode', 'উৎস ও মোড')}</th>
                    <th className="p-3.5">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                    <th className="p-3.5 pr-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredDutyLogs.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400">
                        <History className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                        <p className="text-xs font-medium">{tBilingual('No duty logs found for selected criteria', 'নির্বাচিত ফিল্টারে কোনো ডিউটি লগ পাওয়া যায়নি')}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredDutyLogs.map((log) => {
                      const emp = employees.find((e) => e.id === log.employee_id)
                      const dayName = new Date(log.attendance_date).toLocaleDateString('en-US', { weekday: 'short' })
                      const isFri = dayName === 'Fri'

                      return (
                        <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="p-3.5 pl-4 font-medium">
                            <div className="text-slate-900 dark:text-white font-mono">{log.attendance_date}</div>
                            <div className={`text-[11px] font-semibold ${isFri ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                              {dayName} {isFri && '(Off-Day)'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {emp?.name || log.employee_name || 'Floor Worker'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {emp?.employee_id_number || log.employee_id} • <span className="capitalize">{emp?.department || 'Production'}</span>
                            </div>
                          </td>

                          <td className="p-3.5 text-slate-500 dark:text-slate-400">
                            {log.shift_name || 'Regular (09:00-18:00)'}
                          </td>

                          <td className="p-3.5 font-mono">
                            {log.check_in_time ? (
                              <span className="font-semibold text-slate-900 dark:text-white">{log.check_in_time}</span>
                            ) : (
                              <span className="text-slate-400">--:--</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono">
                            {log.check_out_time ? (
                              <span className="font-semibold text-slate-900 dark:text-white">{log.check_out_time}</span>
                            ) : log.check_in_time ? (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                                In Duty
                              </Badge>
                            ) : (
                              <span className="text-slate-400">--:--</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {log.worked_minutes ? (
                              <span className="font-semibold">{Math.round((log.worked_minutes / 60) * 10) / 10} hrs</span>
                            ) : (
                              <span className="text-slate-400">0 hrs</span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              {log.late_minutes && log.late_minutes > 0 ? (
                                <div className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                                  +{log.late_minutes}m Late
                                </div>
                              ) : null}
                              {log.potential_ot_minutes && log.potential_ot_minutes > 0 ? (
                                <div className="text-purple-600 dark:text-purple-400 font-medium text-[11px]">
                                  +{Math.round((log.potential_ot_minutes / 60) * 10) / 10}h OT
                                </div>
                              ) : null}
                              {!log.late_minutes && !log.potential_ot_minutes && (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {log.attendance_source || 'manual'}
                              </Badge>
                              {log.job_order_id && (
                                <Badge variant="outline" className="text-[10px] font-mono border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300">
                                  Job #{log.job_order_id.slice(0, 6)}
                                </Badge>
                              )}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 capitalize ${
                                log.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : log.status === 'late'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                  : log.status === 'absent'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                  : log.status === 'leave'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                  : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                              }`}
                            >
                              {log.status}
                            </Badge>
                          </td>

                          <td className="p-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 px-2 font-medium gap-1"
                                onClick={() => handleOpenTimeAdjust(log)}
                                title="Adjust punch times and recalculate duration"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>{tBilingual('Adjust', 'সংশোধন')}</span>
                              </Button>

                              {emp && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 px-1.5"
                                  onClick={() => handleOpenPrintTimesheet(emp)}
                                  title="Print individual employee monthly punch card"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: COMPREHENSIVE ATTENDANCE REPORTS & MATRIX         */}
      {/* ======================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {/* Period Selector & Toolbar */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Range Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={reportPreset === 'this_month' ? 'default' : 'outline'}
                  onClick={() => handleSelectReportPreset('this_month')}
                  className="text-xs h-8 px-3 font-semibold"
                >
                  {tBilingual('This Month', 'চলতি মাস')}
                </Button>
                <Button
                  size="sm"
                  variant={reportPreset === 'last_month' ? 'default' : 'outline'}
                  onClick={() => handleSelectReportPreset('last_month')}
                  className="text-xs h-8 px-3 font-semibold"
                >
                  {tBilingual('Last Month', 'গত মাস')}
                </Button>
                <Button
                  size="sm"
                  variant={reportPreset === 'last_7_days' ? 'default' : 'outline'}
                  onClick={() => handleSelectReportPreset('last_7_days')}
                  className="text-xs h-8 px-3 font-semibold"
                >
                  {tBilingual('Last 7 Days', 'গত ৭ দিন')}
                </Button>
                <Button
                  size="sm"
                  variant={reportPreset === 'last_30_days' ? 'default' : 'outline'}
                  onClick={() => handleSelectReportPreset('last_30_days')}
                  className="text-xs h-8 px-3 font-semibold"
                >
                  {tBilingual('Last 30 Days', 'গত ৩০ দিন')}
                </Button>
              </div>

              {/* View Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReportViewMode('summary')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    reportViewMode === 'summary'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{tBilingual('Attendance Report', 'হাজিরা রিপোর্ট')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportViewMode('matrix')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    reportViewMode === 'matrix'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{tBilingual('Monthly Matrix', 'মাসিক ম্যাট্রিক্স')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportViewMode('departments')}
                  className={`h-7 px-2.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    reportViewMode === 'departments'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>{tBilingual('Departments', 'বিভাগভিত্তিক')}</span>
                </button>
              </div>
            </div>

            {/* Sub-toolbar: Select Period (Month, Year), Department & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {/* Select Period: Month */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-500 shrink-0 font-medium">
                  {tBilingual('Month:', 'মাস:')}
                </Label>
                <select
                  aria-label="Select Report Month"
                  value={reportSelectedMonth}
                  onChange={(e) => handlePeriodChange(reportSelectedYear, Number(e.target.value))}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {MONTHS_LIST.map((m) => (
                    <option key={m.value} value={m.value}>
                      {locale === 'bn' ? `${m.value} - ${m.nameBn}` : `${m.nameEn}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Period: Year */}
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-slate-500 shrink-0 font-medium">
                  {tBilingual('Year:', 'বছর:')}
                </Label>
                <select
                  aria-label="Select Report Year"
                  value={reportSelectedYear}
                  onChange={(e) => handlePeriodChange(Number(e.target.value), reportSelectedMonth)}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  {YEARS_LIST.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              {/* Department Filter */}
              <div>
                <select
                  aria-label="Filter report by department"
                  value={reportDeptFilter}
                  onChange={(e) => setReportDeptFilter(e.target.value)}
                  className="w-full h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
                >
                  <option value="ALL">{tBilingual('All Departments', 'সব বিভাগ')}</option>
                  <option value="printing">{tBilingual('Printing', 'প্রিন্টিং')}</option>
                  <option value="finishing">{tBilingual('Finishing', 'ফিনিশিং')}</option>
                  <option value="fabrication">{tBilingual('Fabrication', 'ফ্যাব্রিকেশন')}</option>
                  <option value="design">{tBilingual('Design', 'ডিজাইন')}</option>
                  <option value="installation">{tBilingual('Installation', 'ইনস্টলেশন')}</option>
                  <option value="accounts">{tBilingual('Accounts', 'হিসাব')}</option>
                </select>
              </div>

              {/* Search Employee */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder={tBilingual('Filter worker by name or ID...', 'কর্মী বা আইডি দিয়ে ফিল্টার...')}
                  value={reportSearchTerm}
                  onChange={(e) => setReportSearchTerm(e.target.value)}
                  className="pl-8 text-xs h-8 font-medium"
                />
              </div>
            </div>
          </Card>

          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Workforce', 'মোট কর্মী')}
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {reportSummaryStats.workforceCount}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {reportSummaryStats.totalWorkingDays} work days
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Present Rate', 'উপস্থিতি হার')}
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {reportSummaryStats.presentRate}%
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {reportSummaryStats.presentCount} check-ins
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Late Arrivals', 'বিলম্ব আগমন')}
              </span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {reportSummaryStats.lateCount}
              </div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                {reportSummaryStats.totalLateMins} mins total
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Absent & Leave', 'অনুপস্থিত ও ছুটি')}
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {reportSummaryStats.absentCount} / {reportSummaryStats.leaveCount}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {reportSummaryStats.absentCount} Abs • {reportSummaryStats.leaveCount} Leaves
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Total Worked Hrs', 'মোট কাজের ঘণ্টা')}
              </span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {reportSummaryStats.workedHrs}h
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                {(reportSummaryStats.workforceCount > 0 ? Math.round((reportSummaryStats.workedHrs / reportSummaryStats.workforceCount) * 10) / 10 : 0)}h / employee
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Overtime Pay', 'ওভারটাইম প্রদেয়')}
              </span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {formatBDT(reportSummaryStats.estimatedOtPay)}
              </div>
              <div className="text-[11px] text-purple-600 dark:text-purple-400 font-mono mt-0.5">
                {reportSummaryStats.otHrs} hrs OT
              </div>
            </Card>
          </div>

          {/* VIEW MODE 1: EXACT REQUESTED ATTENDANCE REPORT TABLE */}
          {reportViewMode === 'summary' && (
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {tBilingual('Employee Attendance & Overtime Summary', 'কর্মীভিত্তিক হাজিরা ও ওভারটাইম রিপোর্ট')}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    {reportFilteredEmps.length} employees
                  </Badge>
                </div>

                <div className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <span>{tBilingual('Period:', 'সময়কাল:')}</span>
                  <Badge variant="secondary" className="font-semibold text-xs">
                    {MONTHS_LIST.find((m) => m.value === reportSelectedMonth)?.nameEn} {reportSelectedYear}
                  </Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                      <th className="p-3.5 pl-4">{tBilingual('Employee Name, ID', 'কর্মী ও আইডি')}</th>
                      <th className="p-3.5">{tBilingual('Average Check In', 'গড় প্রবেশ')}</th>
                      <th className="p-3.5">{tBilingual('Average Check Out', 'গড় প্রস্থান')}</th>
                      <th className="p-3.5">{tBilingual('Day Present', 'উপস্থিত দিন')}</th>
                      <th className="p-3.5">{tBilingual('Day Absent', 'অনুপস্থিত দিন')}</th>
                      <th className="p-3.5">{tBilingual('Overtime', 'ওভারটাইম')}</th>
                      <th className="p-3.5 pr-4 text-right">{tBilingual('Action', 'পদক্ষেপ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {reportFilteredEmps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          <UserCheck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                          <p className="text-xs font-medium">{tBilingual('No employee attendance records found for this period', 'এই সময়ের জন্য কোনো হাজিরার তথ্য পাওয়া যায়নি')}</p>
                        </td>
                      </tr>
                    ) : (
                      reportFilteredEmps.map((emp) => {
                        const empAtts = reportRecords.filter((r) => r.employee_id === emp.id)

                        // Average Check In
                        const checkIns = empAtts
                          .filter((r) => r.check_in_time)
                          .map((r) => timeStringToMinutes(r.check_in_time))
                          .filter((m): m is number => m !== null)
                        const avgInMinutes = checkIns.length > 0
                          ? Math.round(checkIns.reduce((a, b) => a + b, 0) / checkIns.length)
                          : null
                        const avgCheckIn = minutesToTimeString(avgInMinutes)

                        // Average Check Out
                        const checkOuts = empAtts
                          .filter((r) => r.check_out_time)
                          .map((r) => timeStringToMinutes(r.check_out_time))
                          .filter((m): m is number => m !== null)
                        const avgOutMinutes = checkOuts.length > 0
                          ? Math.round(checkOuts.reduce((a, b) => a + b, 0) / checkOuts.length)
                          : null
                        const avgCheckOut = minutesToTimeString(avgOutMinutes)

                        // Day Present & Absent
                        const dayPresent = empAtts.filter((r) =>
                          r.status === 'present' || r.status === 'late' || r.status === 'half_day' || r.status === 'field_work'
                        ).length
                        const dayAbsent = empAtts.filter((r) => r.status === 'absent').length

                        // Overtime
                        const otMins = empAtts.reduce(
                          (sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0),
                          0
                        )
                        const otHrs = Math.round((otMins / 60) * 10) / 10

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="p-3.5 pl-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <span>{emp.name}</span>
                                    {emp.name_bn && (
                                      <span className="text-[11px] text-slate-400 font-normal bangla-text">
                                        ({emp.name_bn})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                                      {emp.employee_id_number}
                                    </span>
                                    <span>•</span>
                                    <span className="capitalize">{emp.department}</span>
                                    <span>•</span>
                                    <span className="capitalize text-slate-400">{emp.role}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="p-3.5 font-mono">
                              {avgInMinutes !== null ? (
                                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  {avgCheckIn}
                                </span>
                              ) : (
                                <span className="text-slate-400">--:--</span>
                              )}
                            </td>

                            <td className="p-3.5 font-mono">
                              {avgOutMinutes !== null ? (
                                <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  {avgCheckOut}
                                </span>
                              ) : (
                                <span className="text-slate-400">--:--</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 font-bold text-xs px-2.5 py-0.5"
                              >
                                {dayPresent} Days
                              </Badge>
                            </td>

                            <td className="p-3.5">
                              {dayAbsent > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 font-bold text-xs px-2.5 py-0.5"
                                >
                                  {dayAbsent} Days
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">0 Days</span>
                              )}
                            </td>

                            <td className="p-3.5">
                              {otHrs > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 font-bold font-mono text-xs px-2.5 py-0.5"
                                >
                                  +{otHrs} hrs
                                </Badge>
                              ) : (
                                <span className="text-slate-400 font-mono text-xs">0 hrs</span>
                              )}
                            </td>

                            <td className="p-3.5 pr-4 text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50 shadow-xs"
                                onClick={() => handleOpenViewLogModal(emp)}
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>{tBilingual('View Log', 'লগ দেখুন')}</span>
                              </Button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* VIEW MODE 2: MONTHLY 31-DAY ATTENDANCE HEATMAP MATRIX */}
          {reportViewMode === 'matrix' && (
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {tBilingual('Monthly Attendance Calendar Matrix', 'মাসিক হাজিরা ক্যালেন্ডার ম্যাট্রিক্স')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {tBilingual('Daily presence grid with visual status codes: P = Present, L = Late, A = Absent, LV = Leave, W = Off-Day', 'দৈনিক উপস্থিতির ভিজ্যুয়াল গ্রিড ও কোড সংকেত')}
                  </CardDescription>
                </div>

                {/* Legend Badges */}
                <div className="hidden md:flex items-center gap-2 text-[10px] font-semibold">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span> P: Present</span>
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400"><span className="w-2.5 h-2.5 rounded bg-amber-500 inline-block"></span> L: Late</span>
                  <span className="flex items-center gap-1 text-rose-700 dark:text-rose-400"><span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> A: Absent</span>
                  <span className="flex items-center gap-1 text-purple-700 dark:text-purple-400"><span className="w-2.5 h-2.5 rounded bg-purple-500 inline-block"></span> LV: Leave</span>
                  <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700 inline-block"></span> W: Off-day</span>
                </div>
              </CardHeader>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase">
                      <th className="p-2.5 pl-4 sticky left-0 z-10 bg-slate-100 dark:bg-slate-900 min-w-[180px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        {tBilingual('Employee', 'কর্মী')}
                      </th>
                      {reportDays.map((d) => (
                        <th
                          key={d.dateStr}
                          className={`p-1 text-center min-w-[28px] border-l border-slate-200/60 dark:border-slate-800/60 ${
                            d.isFriday ? 'bg-rose-50/70 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-black' : ''
                          }`}
                        >
                          <div>{d.dayNum}</div>
                          <div className="text-[9px] font-normal opacity-80">{d.dayOfWeek[0]}</div>
                        </th>
                      ))}
                      {/* Summary Columns */}
                      <th className="p-2 text-center bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 min-w-[36px] font-bold border-l border-slate-200 dark:border-slate-800">P</th>
                      <th className="p-2 text-center bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 min-w-[36px] font-bold border-l border-slate-200 dark:border-slate-800">L</th>
                      <th className="p-2 text-center bg-rose-50/80 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 min-w-[36px] font-bold border-l border-slate-200 dark:border-slate-800">A</th>
                      <th className="p-2 text-center bg-purple-50/80 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 min-w-[36px] font-bold border-l border-slate-200 dark:border-slate-800">LV</th>
                      <th className="p-2 pr-4 text-center bg-slate-200/80 dark:bg-slate-800/80 text-slate-900 dark:text-white min-w-[50px] font-bold border-l border-slate-200 dark:border-slate-800">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                    {reportFilteredEmps.map((emp) => {
                      const empAtts = reportRecords.filter((r) => r.employee_id === emp.id)
                      const pCount = empAtts.filter((r) => r.status === 'present' || r.status === 'half_day' || r.status === 'late').length
                      const lCount = empAtts.filter((r) => r.status === 'late' || (r.late_minutes && r.late_minutes > 0)).length
                      const aCount = empAtts.filter((r) => r.status === 'absent').length
                      const lvCount = empAtts.filter((r) => r.status === 'leave').length
                      const workDays = reportDays.filter((d) => !d.isFriday).length || 26
                      const score = workDays > 0 ? Math.min(100, Math.round((pCount / workDays) * 100)) : 100

                      return (
                        <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="p-2.5 pl-4 sticky left-0 z-10 bg-white dark:bg-slate-950 font-sans shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                            <div className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[170px]">
                              {emp.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[170px]">
                              {emp.employee_id_number} • <span className="capitalize">{emp.department}</span>
                            </div>
                          </td>

                          {reportDays.map((d) => {
                            const rec = empAtts.find((r) => r.attendance_date === d.dateStr)
                            let badgeClass = 'text-slate-300 dark:text-slate-700'
                            let label = '-'

                            if (rec) {
                              if (rec.status === 'present') {
                                badgeClass = 'bg-emerald-500 text-white font-bold'
                                label = 'P'
                              } else if (rec.status === 'late') {
                                badgeClass = 'bg-amber-500 text-white font-bold'
                                label = 'L'
                              } else if (rec.status === 'absent') {
                                badgeClass = 'bg-rose-500 text-white font-bold'
                                label = 'A'
                              } else if (rec.status === 'leave') {
                                badgeClass = 'bg-purple-500 text-white font-bold'
                                label = 'LV'
                              } else if (rec.status === 'field_work') {
                                badgeClass = 'bg-blue-500 text-white font-bold'
                                label = 'FW'
                              } else if (rec.status === 'half_day') {
                                badgeClass = 'bg-sky-500 text-white font-bold'
                                label = 'HD'
                              }
                            } else if (d.isFriday) {
                              badgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold'
                              label = 'W'
                            }

                            return (
                              <td
                                key={d.dateStr}
                                className={`p-1 text-center border-l border-slate-100 dark:border-slate-800/50 ${
                                  d.isFriday ? 'bg-rose-50/20 dark:bg-rose-950/20' : ''
                                }`}
                                title={`${emp.name} - ${d.dateStr}: ${rec ? `${rec.status} (In: ${rec.check_in_time || '--'}, Out: ${rec.check_out_time || '--'})` : d.isFriday ? 'Weekly Off' : 'Unmarked'}`}
                              >
                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] ${badgeClass}`}>
                                  {label}
                                </span>
                              </td>
                            )
                          })}

                          {/* Summary Row Totals */}
                          <td className="p-2 text-center bg-emerald-50/40 dark:bg-emerald-950/20 font-bold text-emerald-700 dark:text-emerald-400 border-l border-slate-200 dark:border-slate-800">
                            {pCount}
                          </td>
                          <td className="p-2 text-center bg-amber-50/40 dark:bg-amber-950/20 font-bold text-amber-700 dark:text-amber-400 border-l border-slate-200 dark:border-slate-800">
                            {lCount}
                          </td>
                          <td className="p-2 text-center bg-rose-50/40 dark:bg-rose-950/20 font-bold text-rose-700 dark:text-rose-400 border-l border-slate-200 dark:border-slate-800">
                            {aCount}
                          </td>
                          <td className="p-2 text-center bg-purple-50/40 dark:bg-purple-950/20 font-bold text-purple-700 dark:text-purple-400 border-l border-slate-200 dark:border-slate-800">
                            {lvCount}
                          </td>
                          <td className="p-2 pr-4 text-center bg-slate-100/50 dark:bg-slate-900/50 font-black border-l border-slate-200 dark:border-slate-800">
                            <span className={score >= 90 ? 'text-emerald-600' : score >= 75 ? 'text-amber-600' : 'text-rose-600'}>
                              {score}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* VIEW MODE 3: DEPARTMENTAL BREAKDOWN */}
          {reportViewMode === 'departments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departmentBreakdown.map((item) => item && (
                <Card key={item.dept} className="p-4 border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white capitalize">
                        {item.dept}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {item.headcount} active workforce
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {item.presentRate}% Present
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Total Worked Hours:', 'মোট কাজের ঘণ্টা:')}</span>
                      <strong className="text-slate-900 dark:text-white font-mono">{item.workedHrs} hrs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Total Overtime Hours:', 'মোট ওভারটাইম ঘণ্টা:')}</span>
                      <strong className="text-purple-600 dark:text-purple-400 font-mono">+{item.otHrs} hrs</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Total Late Delay:', 'দেরিতে আগমন:')}</span>
                      <strong className="text-amber-600 dark:text-amber-400 font-mono">{item.lateMins} mins</strong>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: OVERTIME APPROVALS HUB                            */}
      {/* ======================================================== */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Overtime Requests & Approvals Queue', 'ওভারটাইম অনুমোদন ও নিয়ন্ত্রণ')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Review, adjust multiplier and approve floor overtime hours before payroll closing', 'পেরোল ক্লোজিংয়ের আগে ওভারটাইম ঘণ্টা ও গুণক অনুমোদন করুন')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsOtModalOpen(true)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Submit Overtime Request', 'ওভারটাইম আবেদন')}
            </Button>
          </div>

          {overtimeRecords.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tBilingual('No overtime records found', 'কোন ওভারটাইম তথ্য পাওয়া যায়নি')}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tBilingual('Submit an overtime request for floor staff when completing rush orders.', 'জরুরি অর্ডারের ক্ষেত্রে কর্মীদের ওভারটাইম আবেদন জমা দিন।')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overtimeRecords.map((ot) => (
                <Card key={ot.id} className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ot.employee_name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(ot.ot_date)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 capitalize ${
                        ot.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : ot.status === 'pending_approval'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {ot.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Duration:', 'সময়কাল:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{Math.round((ot.duration_minutes / 60) * 10) / 10} hrs ({ot.duration_minutes}m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Multiplier:', 'গুণক:')}</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{ot.multiplier}x</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{tBilingual('Calculated Payout:', 'প্রদেয় অর্থ:')}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{formatBDT(ot.calculated_amount || 0)}</span>
                    </div>
                  </div>

                  {ot.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                      &ldquo;{ot.reason}&rdquo;
                    </p>
                  )}

                  {ot.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        onClick={() => handleReviewOt(ot.id, 'approved', 1.5)}
                        disabled={isPending}
                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {tBilingual('Approve 1.5x', 'অনুমোদন')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewOt(ot.id, 'rejected')}
                        disabled={isPending}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800 gap-1 font-semibold"
                      >
                        <X className="w-3.5 h-3.5" />
                        {tBilingual('Reject', 'বাতিল')}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: SHIFT CONFIGURATION                               */}
      {/* ======================================================== */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Shop Floor Work Shifts', 'কারখানার কাজের শিফট')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Define factory operating hours, grace period and overnight schedules', 'কারখানার কাজের সময়, শিফট শুরু-শেষ ও গ্রেস পিরিয়ড নির্ধারণ')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsNewShiftModalOpen(true)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Create New Shift', 'নতুন শিফট')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <Card key={shift.id} className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{shift.shift_name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {shift.start_time} → {shift.end_time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    Active
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Period:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{shift.grace_period_minutes || 15} mins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overnight Shift:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{shift.is_overnight ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TIME ADJUSTMENT (FOR DUTY LOG)                    */}
      {/* ======================================================== */}
      {isTimeAdjustModalOpen && (
        <ModalDialog
          open={isTimeAdjustModalOpen}
          onOpenChange={(open) => setIsTimeAdjustModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Adjust Punch & Duty Time', 'পাঞ্চ ও ডিউটি সময় সংশোধন')}
          description={tBilingual(`Adjust punch records and recalculate duration & OT for ${timeAdjustForm.employeeName}`, 'সঠিক প্রবেশ ও প্রস্থান সময় নির্ধারণ করে কাজের সময় ও ওভারটাইম পুনর্গণনা করুন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-200/60 dark:border-blue-800/60 text-xs">
              <div className="font-semibold text-blue-900 dark:text-blue-200">{timeAdjustForm.employeeName}</div>
              <div className="text-blue-700 dark:text-blue-400 font-mono text-[11px] mt-0.5">Date: {timeAdjustForm.attendanceDate}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check In Time', 'প্রবেশ সময়')}</Label>
                <Input
                  type="time"
                  value={timeAdjustForm.checkInTime}
                  onChange={(e) => setTimeAdjustForm({ ...timeAdjustForm, checkInTime: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check Out Time', 'প্রস্থান সময়')}</Label>
                <Input
                  type="time"
                  value={timeAdjustForm.checkOutTime}
                  onChange={(e) => setTimeAdjustForm({ ...timeAdjustForm, checkOutTime: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Duty Status', 'স্ট্যাটাস')}</Label>
                <select
                  aria-label="Adjusted duty status"
                  value={timeAdjustForm.status}
                  onChange={(e) => setTimeAdjustForm({ ...timeAdjustForm, status: e.target.value as any })}
                  className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Shift', 'শিফট')}</Label>
                <select
                  aria-label="Adjusted shift schedule"
                  value={timeAdjustForm.shiftId}
                  onChange={(e) => setTimeAdjustForm({ ...timeAdjustForm, shiftId: e.target.value })}
                  className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="">{tBilingual('Default Factory Shift', 'ডিফল্ট শিফট')}</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shift_name} ({s.start_time} - {s.end_time})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Supervisor Adjustment Reason *', 'সংশোধনের কারণ *')}</Label>
              <Input
                placeholder="e.g. Punch missed due to network offline / supervisor approved"
                value={timeAdjustForm.notes}
                onChange={(e) => setTimeAdjustForm({ ...timeAdjustForm, notes: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimeAdjustModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTimeAdjust}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Save & Recalculate', 'সংরক্ষণ ও পুনর্গণনা')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW LOG MODAL (EMPLOYEE ATTENDANCE & DUTY AUDIT) */}
      {/* ======================================================== */}
      {isViewLogModalOpen && viewLogEmployee && (
        <ModalDialog
          open={isViewLogModalOpen}
          onOpenChange={(open) => setIsViewLogModalOpen(open)}
          title={tBilingual('Employee Attendance & Duty Log', 'কর্মীর হাজিরা ও ডিউটি লগ')}
          description={tBilingual(
            `Detailed daily check-in, check-out and overtime audit trail for ${viewLogEmployee.name}`,
            `${viewLogEmployee.name}-এর দৈনিক পাঞ্চ লগ, প্রবেশ-প্রস্থান ও ওভারটাইম বিবরণ`
          )}
          size="5xl"
          className="h-[88vh] max-h-[820px] flex flex-col overflow-hidden"
          bodyClassName="flex-1 min-h-0 flex flex-col overflow-hidden p-4 sm:p-5 gap-3"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewLogModalOpen(false)
                  handleOpenPrintTimesheet(viewLogEmployee)
                }}
                className="text-xs h-9 gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                {tBilingual('Print Official Timesheet', 'অফিসিয়াল টাইমশিট প্রিন্ট')}
              </Button>

              <Button
                size="sm"
                onClick={() => setIsViewLogModalOpen(false)}
                className="text-xs h-9 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 font-semibold px-5 cursor-pointer shadow-xs"
              >
                {tBilingual('Close', 'বন্ধ করুন')}
              </Button>
            </div>
          }
        >
          {/* Employee Info & Period Selector Header Box (Fixed at top of body) */}
          <div className="shrink-0 p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/70 dark:from-slate-900/60 dark:to-slate-900/30 border border-slate-200 dark:border-slate-800 space-y-2.5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                  {viewLogEmployee.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                      {viewLogEmployee.name}
                    </h3>
                    {viewLogEmployee.name_bn && (
                      <span className="text-xs text-slate-500 bangla-text font-medium">
                        ({viewLogEmployee.name_bn})
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {viewLogEmployee.employee_id_number}
                    </span>
                    <span>•</span>
                    <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                      {viewLogEmployee.department}
                    </span>
                    <span>•</span>
                    <span className="capitalize text-slate-600 dark:text-slate-400">
                      {viewLogEmployee.role}
                    </span>
                    <span>•</span>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {viewLogEmployee.employee_type}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Changeable Period Controls */}
              <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0 self-start lg:self-center whitespace-nowrap">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium px-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                  <span>{tBilingual('Period:', 'সময়কাল:')}</span>
                  {isReportLoading && <RefreshCw className="w-3 h-3 animate-spin text-blue-500 ml-0.5" />}
                </div>

                {/* Month/Year Grouped Navigation Pill */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200/80 dark:border-slate-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      let newM = reportSelectedMonth - 1
                      let newY = reportSelectedYear
                      if (newM < 1) {
                        newM = 12
                        newY -= 1
                      }
                      handlePeriodChange(newY, newM)
                    }}
                    className="h-7 w-7 p-0 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-md"
                    title={tBilingual('Previous Month', 'আগের মাস')}
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>

                  <select
                    aria-label="Change Log Month"
                    value={reportSelectedMonth}
                    onChange={(e) => handlePeriodChange(reportSelectedYear, Number(e.target.value))}
                    className="h-7 text-xs font-semibold px-2 bg-transparent text-slate-900 dark:text-white border-0 focus:ring-0 cursor-pointer outline-none"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.value} value={m.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {locale === 'bn' ? `${m.value} - ${m.nameBn}` : `${m.nameEn}`}
                      </option>
                    ))}
                  </select>

                  <span className="text-slate-300 dark:text-slate-700">/</span>

                  <select
                    aria-label="Change Log Year"
                    value={reportSelectedYear}
                    onChange={(e) => handlePeriodChange(Number(e.target.value), reportSelectedMonth)}
                    className="h-7 text-xs font-semibold px-2 bg-transparent text-slate-900 dark:text-white border-0 focus:ring-0 cursor-pointer outline-none"
                  >
                    {YEARS_LIST.map((y) => (
                      <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {y}
                      </option>
                    ))}
                  </select>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      let newM = reportSelectedMonth + 1
                      let newY = reportSelectedYear
                      if (newM > 12) {
                        newM = 1
                        newY += 1
                      }
                      handlePeriodChange(newY, newM)
                    }}
                    className="h-7 w-7 p-0 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-md"
                    title={tBilingual('Next Month', 'পরের মাস')}
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Quick This Month Preset */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectReportPreset('this_month')}
                  className="h-8 text-xs px-2.5 font-medium bg-blue-50/70 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60 shrink-0"
                >
                  {tBilingual('This Month', 'চলতি মাস')}
                </Button>
              </div>
            </div>

            {/* Summary KPI Badges */}
            {(() => {
              const empAtts = reportRecords.filter((r) => r.employee_id === viewLogEmployee.id)
              const checkIns = empAtts
                .filter((r) => r.check_in_time)
                .map((r) => timeStringToMinutes(r.check_in_time))
                .filter((m): m is number => m !== null)
              const avgInMinutes = checkIns.length > 0
                ? Math.round(checkIns.reduce((a, b) => a + b, 0) / checkIns.length)
                : null
              const avgCheckIn = minutesToTimeString(avgInMinutes)

              const checkOuts = empAtts
                .filter((r) => r.check_out_time)
                .map((r) => timeStringToMinutes(r.check_out_time))
                .filter((m): m is number => m !== null)
              const avgOutMinutes = checkOuts.length > 0
                ? Math.round(checkOuts.reduce((a, b) => a + b, 0) / checkOuts.length)
                : null
              const avgCheckOut = minutesToTimeString(avgOutMinutes)

              const presentDays = empAtts.filter((r) =>
                r.status === 'present' || r.status === 'late' || r.status === 'half_day' || r.status === 'field_work'
              ).length
              const absentDays = empAtts.filter((r) => r.status === 'absent').length
              const otMins = empAtts.reduce(
                (sum, r) => sum + (r.potential_ot_minutes || r.approved_ot_minutes || 0),
                0
              )
              const totalOtHrs = Math.round((otMins / 60) * 10) / 10

              return (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800/80">
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">{tBilingual('Day Present', 'উপস্থিত দিন')}</span>
                    <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{presentDays} Days</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">{tBilingual('Day Absent', 'অনুপস্থিত দিন')}</span>
                    <strong className="text-sm font-bold text-rose-600 dark:text-rose-400">{absentDays} Days</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">{tBilingual('Avg Check In', 'গড় প্রবেশ')}</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">{avgCheckIn}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">{tBilingual('Avg Check Out', 'গড় প্রস্থান')}</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">{avgCheckOut}</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">{tBilingual('Total OT', 'মোট ওটি')}</span>
                    <strong className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">+{totalOtHrs} hrs</strong>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Detailed Daily Log Table (Scrollable Body) */}
          <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl relative shadow-2xs">
            {isReportLoading && (
              <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-20">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{tBilingual('Loading attendance logs...', 'হাজিরা লগ লোড হচ্ছে...')}</span>
                </div>
              </div>
            )}
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/95 dark:bg-slate-900/95 backdrop-blur-xs text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 font-bold text-[11px] uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="p-3 pl-4">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="p-3">{tBilingual('Day', 'বার')}</th>
                  <th className="p-3">{tBilingual('Check In', 'প্রবেশ')}</th>
                  <th className="p-3">{tBilingual('Check Out', 'প্রস্থান')}</th>
                  <th className="p-3">{tBilingual('OT In/Out', 'ওটি ইন/আউট')}</th>
                  <th className="p-3 pr-4">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                {reportDays.map((d) => {
                  const rec = reportRecords.find(
                    (r) => r.employee_id === viewLogEmployee.id && r.attendance_date === d.dateStr
                  )
                  const isFri = d.isFriday
                  const otMinutes = rec?.potential_ot_minutes || rec?.approved_ot_minutes || 0
                  const otHrs = Math.round((otMinutes / 60) * 10) / 10

                  return (
                    <tr
                      key={d.dateStr}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors ${
                        isFri ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="p-3 pl-4 font-sans font-medium text-slate-900 dark:text-white">
                        {d.dateStr}
                      </td>

                      <td className="p-3 font-sans">
                        <span
                          className={`font-medium ${
                            isFri ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {d.dayOfWeek} {isFri && `(${tBilingual('Off-Day', 'ছুটি')})`}
                        </span>
                      </td>

                      <td className="p-3">
                        {rec?.check_in_time ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {format12Hour(rec.check_in_time)}
                            </span>
                            {rec.late_minutes && rec.late_minutes > 0 ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 font-sans font-medium"
                              >
                                +{rec.late_minutes}m Late
                              </Badge>
                            ) : null}
                          </div>
                        ) : isFri ? (
                          <span className="text-slate-400 font-sans text-xs">{tBilingual('Off-Day', 'সাপ্তাহিক ছুটি')}</span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3">
                        {rec?.check_out_time ? (
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {format12Hour(rec.check_out_time)}
                          </span>
                        ) : rec?.check_in_time ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-sans font-medium"
                          >
                            {tBilingual('On Floor', 'ফ্লোরে আছেন')}
                          </Badge>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3">
                        {otMinutes > 0 ? (
                          <div className="flex items-center gap-1">
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 font-bold"
                            >
                              +{otHrs} hrs
                            </Badge>
                            {rec?.check_out_time && (
                              <span className="text-[11px] text-slate-400 font-normal">
                                (18:00 - {rec.check_out_time})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="p-3 pr-4 font-sans">
                        {rec ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 capitalize ${
                              rec.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : rec.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : rec.status === 'absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : rec.status === 'leave'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : rec.status === 'field_work'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                                : 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
                            }`}
                          >
                            {rec.status}
                          </Badge>
                        ) : isFri ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                          >
                            {tBilingual('Off-Day', 'সাপ্তাহিক ছুটি')}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-slate-400 border-dashed border-slate-300 dark:border-slate-700"
                          >
                            {tBilingual('Unmarked', 'অনুপস্থিত')}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ModalDialog>
      )}

      {/* ======================================================== */}
      {/* MODAL: PRINTABLE EMPLOYEE TIMESHEET                      */}
      {/* ======================================================== */}
      {isPrintTimesheetModalOpen && printTimesheetEmployee && (
        <ModalDialog
          open={isPrintTimesheetModalOpen}
          onOpenChange={(open) => setIsPrintTimesheetModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Employee Monthly Duty Timesheet', 'কর্মীর মাসিক ডিউটি টাইমশিট')}
          description={tBilingual('Official monthly punch card and duty audit sheet with signature blocks', 'স্বাক্ষরযুক্ত অফিসিয়াল মাসিক পাঞ্চ কার্ড ও ডিউটি শিট')}
          size="lg"
        >
          <div className="space-y-4 pt-2">
            {/* Action Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-xs text-slate-500 font-medium">
                Period: <strong>{reportStartDate}</strong> to <strong>{reportEndDate}</strong>
              </div>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs h-8 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" />
                {tBilingual('Print Timesheet (A4)', 'প্রিন্ট টাইমশিট')}
              </Button>
            </div>

            {/* Printable Content Box */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4 text-xs">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {company?.name || 'InkFlow ERP'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Employee Attendance & Duty Audit Timesheet
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs text-slate-500">Date: {new Date().toLocaleDateString('en-GB')}</div>
                  <Badge variant="outline" className="text-[10px] mt-0.5">Authoritative Record</Badge>
                </div>
              </div>

              {/* Employee Info Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Employee Name</span>
                  <strong className="text-slate-900 dark:text-white">{printTimesheetEmployee.name}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Employee ID</span>
                  <strong className="text-slate-900 dark:text-white font-mono">{printTimesheetEmployee.employee_id_number}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Department & Role</span>
                  <strong className="text-slate-900 dark:text-white capitalize">{printTimesheetEmployee.department} - {printTimesheetEmployee.role}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Employment Type</span>
                  <strong className="text-slate-900 dark:text-white capitalize">{printTimesheetEmployee.employee_type} ({printTimesheetEmployee.salary_basis})</strong>
                </div>
              </div>

              {/* Timesheet Table */}
              <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0">
                    <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400">
                      <th className="p-2">Date / Day</th>
                      <th className="p-2">Check In</th>
                      <th className="p-2">Check Out</th>
                      <th className="p-2">Worked Hrs</th>
                      <th className="p-2">Late Mins</th>
                      <th className="p-2">OT Hrs</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {reportDays.map((d) => {
                      const rec = reportRecords.find((r) => r.employee_id === printTimesheetEmployee.id && r.attendance_date === d.dateStr)
                      return (
                        <tr key={d.dateStr} className="hover:bg-slate-50/50">
                          <td className="p-2 font-sans font-medium">
                            {d.dateStr} ({d.dayOfWeek}) {d.isFriday && <span className="text-rose-500 font-bold">*</span>}
                          </td>
                          <td className="p-2">{rec?.check_in_time || (d.isFriday ? 'Off-day' : '--:--')}</td>
                          <td className="p-2">{rec?.check_out_time || '--:--'}</td>
                          <td className="p-2">{rec?.worked_minutes ? `${Math.round(rec.worked_minutes / 60 * 10) / 10}h` : '-'}</td>
                          <td className="p-2 text-amber-600">{rec?.late_minutes && rec.late_minutes > 0 ? `${rec.late_minutes}m` : '-'}</td>
                          <td className="p-2 text-purple-600">{rec?.potential_ot_minutes ? `+${Math.round(rec.potential_ot_minutes / 60 * 10) / 10}h` : '-'}</td>
                          <td className="p-2 capitalize font-sans">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              rec?.status === 'present' ? 'bg-emerald-100 text-emerald-800' :
                              rec?.status === 'late' ? 'bg-amber-100 text-amber-800' :
                              rec?.status === 'absent' ? 'bg-rose-100 text-rose-800' :
                              rec?.status === 'leave' ? 'bg-purple-100 text-purple-800' :
                              d.isFriday ? 'bg-slate-100 text-slate-600' : 'text-slate-400'
                            }`}>
                              {rec?.status || (d.isFriday ? 'Off-day' : 'Unmarked')}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Signature Blocks */}
              <div className="grid grid-cols-3 gap-6 pt-8 pb-2 text-center text-[11px] text-slate-600 dark:text-slate-400">
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5">
                  <div className="font-semibold text-slate-900 dark:text-white">Employee Signature</div>
                  <div className="text-[10px] text-slate-400">{printTimesheetEmployee.name}</div>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5">
                  <div className="font-semibold text-slate-900 dark:text-white">Floor Supervisor</div>
                  <div className="text-[10px] text-slate-400">Verified & Checked</div>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5">
                  <div className="font-semibold text-slate-900 dark:text-white">HR & Accounts</div>
                  <div className="text-[10px] text-slate-400">Approved for Payroll</div>
                </div>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ======================================================== */}
      {/* MODAL: MARK MANUAL ATTENDANCE                            */}
      {/* ======================================================== */}
      {isManualModalOpen && (
        <ModalDialog
          open={isManualModalOpen}
          onOpenChange={(open) => setIsManualModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Record Manual Attendance', 'ম্যানুয়াল হাজিরা সংরক্ষণ')}
          description={tBilingual('Mark or adjust check-in / check-out times and status for floor operators', 'কর্মীদের প্রবেশ ও প্রস্থান সময় এবং স্ট্যাটাস নির্ধারণ করুন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Select Employee *', 'কর্মী নির্বাচন *')}</Label>
              <select
                value={manualForm.employeeId}
                onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">{tBilingual('-- Select Employee --', '-- কর্মী নির্বাচন করুন --')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Attendance Date', 'হাজিরার তারিখ')}</Label>
                <Input
                  type="date"
                  value={manualForm.attendanceDate}
                  onChange={(e) => setManualForm({ ...manualForm, attendanceDate: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Status', 'স্ট্যাটাস')}</Label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                >
                  <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check In Time', 'প্রবেশ সময়')}</Label>
                <Input
                  type="time"
                  value={manualForm.checkInTime}
                  onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check Out Time', 'প্রস্থান সময়')}</Label>
                <Input
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Notes / Reason', 'মন্তব্য / কারণ')}</Label>
              <Input
                placeholder="e.g. Floor manual entry after late evening delivery"
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManualModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveManualAttendance}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Save Record', 'সংরক্ষণ')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ======================================================== */}
      {/* MODAL: SUBMIT OVERTIME                                   */}
      {/* ======================================================== */}
      {isOtModalOpen && (
        <ModalDialog
          open={isOtModalOpen}
          onOpenChange={(open) => setIsOtModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Submit Overtime Request', 'ওভারটাইম আবেদন জমা')}
          description={tBilingual('Record extra working hours performed by operators for rush jobs', 'জরুরি কাজের জন্য অতিরিক্ত সময়ের হিসাব জমা দিন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Select Employee *', 'কর্মী নির্বাচন *')}</Label>
              <select
                value={otForm.employeeId}
                onChange={(e) => setOtForm({ ...otForm, employeeId: e.target.value })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">{tBilingual('-- Select Employee --', '-- কর্মী নির্বাচন করুন --')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Overtime Date', 'তারিখ')}</Label>
                <Input
                  type="date"
                  value={otForm.otDate}
                  onChange={(e) => setOtForm({ ...otForm, otDate: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Duration (Minutes)', 'সময়কাল (মিনিট)')}</Label>
                <Input
                  type="number"
                  value={otForm.durationMinutes}
                  onChange={(e) => setOtForm({ ...otForm, durationMinutes: Number(e.target.value) })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Reason / Job Description', 'কাজের বিবরণ')}</Label>
              <Input
                placeholder="e.g. Urgent billboard print & finishing run"
                value={otForm.reason}
                onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOtModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOtRequest}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Submit Request', 'আবেদন করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE SHIFT                                      */}
      {/* ======================================================== */}
      {isNewShiftModalOpen && (
        <ModalDialog
          open={isNewShiftModalOpen}
          onOpenChange={(open) => setIsNewShiftModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Create Shift Schedule', 'নতুন শিফট তৈরি')}
          description={tBilingual('Define start, end time and grace periods for factory shifts', 'শিফটের সময় ও শিডিউল কনফিগার করুন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Shift Name *', 'শিফট নাম *')}</Label>
              <Input
                placeholder="e.g. Morning Production Shift"
                value={shiftForm.shift_name}
                onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Start Time', 'শুরু সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('End Time', 'শেষ সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Grace Period (Minutes)', 'বিলম্ব ছাড় (মিনিট)')}</Label>
              <Input
                type="number"
                value={shiftForm.grace_period_minutes}
                onChange={(e) => setShiftForm({ ...shiftForm, grace_period_minutes: Number(e.target.value) })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewShiftModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateShift}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Save Shift', 'সংরক্ষণ')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* QR Camera Punch Modal */}
      {isPunchModalOpen && (
        <AttendancePunchModal
          open={isPunchModalOpen}
          onClose={() => {
            setIsPunchModalOpen(false)
            loadData()
          }}
          defaultType="CHECK_IN"
        />
      )}

      {/* Printable QR Poster Modal */}
      {isQrPosterOpen && (
        <ModalDialog
          open={isQrPosterOpen}
          onOpenChange={(open) => setIsQrPosterOpen(open)}
          hideFooter={true}
          title={tBilingual('Print Attendance QR Poster', 'হাজিরা কিউআর কোড পোস্টার')}
          description={tBilingual('Print and display this poster at the shop floor entrance', 'কারখানার প্রবেশদ্বারে টানানোর জন্য প্রিন্ট করুন')}
          size="lg"
        >
          <PrintableQrPoster
            location={{
              id: 'loc-main',
              company_id: company?.id || '',
              name: company?.name || 'Main Factory Floor',
              latitude: 23.8103,
              longitude: 90.4125,
              radius_meters: 500,
              max_accuracy_meters: 100,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }}
            companyName={company?.name || 'InkFlow ERP'}
            companyNameBn={company?.name_bn || null}
            onClose={() => setIsQrPosterOpen(false)}
          />
        </ModalDialog>
      )}
    </div>
  )
}

export default function AttendancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <UserCheck className="h-6 w-6 text-indigo-500 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Attendance Hub...</p>
        </div>
      }
    >
      <AttendanceContent />
    </React.Suspense>
  )
}

