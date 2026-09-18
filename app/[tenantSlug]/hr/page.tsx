'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Workforce, Attendance, Overtime & Payroll Control Center
// Designed for Bangladeshi Print & Signage SaaS Owners, HR & Shop-Floor Managers
// ==============================================================================

import React, { useState, useEffect, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Users2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  DollarSign,
  Briefcase,
  FileText,
  Building,
  ShieldCheck,
  Phone,
  Sparkles,
  QrCode,
  MapPin,
  Filter,
  Check,
  X,
  Printer,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Send,
  AlertCircle,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  Wallet,
  Receipt,
  UserPlus,
} from 'lucide-react'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'
import { UsersManagementView } from '@/components/users/users-management-view'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  WorkforceSummaryKPIs,
  EmploymentType,
  SalaryBasis,
  PaymentMethod,
} from '@/types/workforce.types'
import {
  getWorkforceSummaryAction,
  getEmployeesAction,
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
  getShiftsAction,
  createShiftAction,
  getDailyAttendanceAction,
  recordAttendanceSummaryAction,
  getOvertimeRecordsAction,
  createOvertimeRequestAction,
  reviewOvertimeAction,
  getSalaryAdvancesAction,
  disburseSalaryAdvanceAction,
  getPayrollPeriodsAction,
  generatePayrollDraftAction,
  approvePayrollAction,
  lockPayrollAction,
  recordSalaryPaymentAction,
} from '@/actions/workforce.actions'

export default function WorkforcePage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

  const searchParams = useSearchParams()

  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'employees' | 'users' | 'attendance' | 'overtime' | 'advances' | 'payroll'>('employees')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Handle URL tab & punch query parameters
  useEffect(() => {
    const tabParam = searchParams?.get('tab')
    if (tabParam && ['employees', 'users', 'attendance', 'overtime', 'advances', 'payroll'].includes(tabParam)) {
      setActiveTab(tabParam as any)
    }
    if (searchParams?.get('punch') === 'true') {
      setIsMobilePunchOpen(true)
    }
  }, [searchParams])

  // Data States
  const [summary, setSummary] = useState<WorkforceSummaryKPIs | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceDailySummaryRecord[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([])

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [attDateFilter, setAttDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [otStatusFilter, setOtStatusFilter] = useState<'ALL' | 'pending_approval' | 'approved' | 'rejected'>('pending_approval')

  // Modals
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false)
  const [isEditEmpModalOpen, setIsEditEmpModalOpen] = useState(false)
  const [isEmp360DrawerOpen, setIsEmp360DrawerOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<EmployeeRecord | null>(null)
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false)
  const [isOtRequestModalOpen, setIsOtRequestModalOpen] = useState(false)
  const [isGenPayrollModalOpen, setIsGenPayrollModalOpen] = useState(false)
  const [isSalaryPaymentModalOpen, setIsSalaryPaymentModalOpen] = useState(false)
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<{ periodId: string; item: PayrollItemRecord } | null>(null)
  const [isMobilePunchOpen, setIsMobilePunchOpen] = useState(false)

  // Employee Form State
  const [empForm, setEmpForm] = useState<{
    id?: string
    name: string
    name_bn: string
    mobile: string
    email: string
    address: string
    role: string
    department: string
    employee_type: EmploymentType
    salary_basis: SalaryBasis
    base_salary: number
    daily_rate: number
    hourly_rate: number
    overtime_hourly_rate: number
    emergency_contact_name: string
    emergency_contact_phone: string
    emergency_contact_relation: string
    notes: string
  }>({
    name: '',
    name_bn: '',
    mobile: '',
    email: '',
    address: '',
    role: 'Machine Operator',
    department: 'printing',
    employee_type: 'permanent',
    salary_basis: 'monthly',
    base_salary: 25000,
    daily_rate: 800,
    hourly_rate: 120,
    overtime_hourly_rate: 180,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',
    notes: '',
  })

  // Salary Advance Form State
  const [advForm, setAdvForm] = useState<{
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    reason: string
  }>({
    employeeId: '',
    amount: 5000,
    paymentMethod: 'cash',
    reason: 'Personal / Family emergency',
  })

  // Attendance Punch Form State
  const [attForm, setAttForm] = useState<{
    employeeId: string
    status: AttendanceDailySummaryRecord['status']
    checkInTime: string
    checkOutTime: string
    notes: string
  }>({
    employeeId: '',
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    notes: 'Floor manual attendance',
  })

  // Overtime Form State
  const [otForm, setOtForm] = useState<{
    employeeId: string
    durationMinutes: number
    otType: OvertimeRecord['ot_type']
    reason: string
  }>({
    employeeId: '',
    durationMinutes: 120,
    otType: 'regular_day',
    reason: 'Urgent billboard printing & finishing deadline',
  })

  // Payroll Generator Form State
  const [payrollGenForm, setPayrollGenForm] = useState<{
    periodName: string
    startDate: string
    endDate: string
    workingDaysCount: number
  }>({
    periodName: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + ' Payroll',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
    workingDaysCount: 26,
  })

  // Salary Payment Form State
  const [salaryPayForm, setSalaryPayForm] = useState<{
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber: string
    notes: string
  }>({
    amount: 0,
    paymentMethod: 'bkash',
    referenceNumber: '',
    notes: '',
  })

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Load All Workforce Data
  const loadAllData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const [sumRes, empRes, shfRes, attRes, otRes, advRes, payRes] = await Promise.all([
        getWorkforceSummaryAction(),
        getEmployeesAction(),
        getShiftsAction(),
        getDailyAttendanceAction({ date: attDateFilter }),
        getOvertimeRecordsAction(),
        getSalaryAdvancesAction(),
        getPayrollPeriodsAction(),
      ])

      if (sumRes.success && sumRes.data) setSummary(sumRes.data)
      if (empRes.success && empRes.data) {
        const empList = empRes.data
        setEmployees(empList)
        if (empList.length > 0 && !advForm.employeeId) {
          const firstEmpId = empList[0].id
          setAdvForm((prev) => ({ ...prev, employeeId: firstEmpId }))
          setAttForm((prev) => ({ ...prev, employeeId: firstEmpId }))
          setOtForm((prev) => ({ ...prev, employeeId: firstEmpId }))
        }
      }
      if (shfRes.success && shfRes.data) setShifts(shfRes.data)
      if (attRes.success && attRes.data) setDailyAttendance(attRes.data)
      if (otRes.success && otRes.data) setOvertimeRecords(otRes.data)
      if (advRes.success && advRes.data) setAdvances(advRes.data)
      if (payRes.success && payRes.data) setPayrollPeriods(payRes.data)
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load workforce module data.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [attDateFilter])

  // ==========================================
  // HANDLERS
  // ==========================================

  // 1. Employee Create / Update
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empForm.name.trim()) return

    startTransition(async () => {
      if (isEditEmpModalOpen && empForm.id) {
        const res = await updateEmployeeAction(empForm.id, empForm)
        if (res.success) {
          notify(`Employee profile for ${empForm.name} updated successfully!`)
          setIsEditEmpModalOpen(false)
          loadAllData()
        } else {
          setErrorMessage(res.error || 'Failed to update employee.')
        }
      } else {
        const res = await createEmployeeAction(empForm)
        if (res.success) {
          notify(`New employee ${empForm.name} added to roster!`)
          setIsNewEmpModalOpen(false)
          loadAllData()
        } else {
          setErrorMessage(res.error || 'Failed to create employee.')
        }
      }
    })
  }

  // 2. Disburse Salary Advance
  const handleDisburseAdvance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!advForm.employeeId || advForm.amount <= 0) return

    startTransition(async () => {
      const res = await disburseSalaryAdvanceAction(advForm)
      if (res.success && res.data) {
        notify(`Salary advance of ৳ ${formatBDT(res.data.amount)} disbursed via ${res.data.payment_method.toUpperCase()}!`)
        setIsAdvanceModalOpen(false)
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to disburse advance.')
      }
    })
  }

  // 3. Mark Attendance
  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attForm.employeeId) return

    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: attForm.employeeId,
        attendanceDate: attDateFilter,
        status: attForm.status,
        checkInTime: attForm.checkInTime,
        checkOutTime: attForm.checkOutTime,
        notes: attForm.notes,
      })

      if (res.success && res.data) {
        notify(`Attendance recorded: ${res.data.status.toUpperCase()} (Late: ${res.data.late_minutes}m, OT: ${res.data.potential_ot_minutes}m)`)
        setIsAttendanceModalOpen(false)
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to record attendance.')
      }
    })
  }

  // 4. Submit Overtime Request
  const handleCreateOtRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otForm.employeeId || otForm.durationMinutes <= 0) return

    startTransition(async () => {
      const res = await createOvertimeRequestAction({
        employeeId: otForm.employeeId,
        otDate: attDateFilter,
        durationMinutes: otForm.durationMinutes,
        otType: otForm.otType,
        reason: otForm.reason,
      })

      if (res.success && res.data) {
        notify(`Overtime request submitted for ${res.data.duration_hours} hrs (৳ ${res.data.calculated_amount})`)
        setIsOtRequestModalOpen(false)
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to submit overtime request.')
      }
    })
  }

  // 5. Review Overtime (Approve / Reject)
  const handleReviewOt = async (id: string, status: 'approved' | 'rejected', multiplier?: number) => {
    startTransition(async () => {
      const res = await reviewOvertimeAction({ id, status, multiplier })
      if (res.success && res.data) {
        notify(`Overtime ${status === 'approved' ? 'APPROVED' : 'REJECTED'} (৳ ${res.data.calculated_amount})`)
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to review overtime.')
      }
    })
  }

  // 6. Generate Payroll Period
  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await generatePayrollDraftAction(payrollGenForm)
      if (res.success && res.data) {
        notify(`Payroll "${res.data.period_name}" generated with ${res.data.items?.length || 0} employees!`)
        setIsGenPayrollModalOpen(false)
        setActiveTab('payroll')
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to generate payroll.')
      }
    })
  }

  // 7. Approve Payroll Period
  const handleApprovePayroll = async (periodId: string) => {
    startTransition(async () => {
      const res = await approvePayrollAction(periodId)
      if (res.success) {
        notify('Payroll period APPROVED! Ready for disbursement.')
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to approve payroll.')
      }
    })
  }

  // 8. Lock Payroll Period
  const handleLockPayroll = async (periodId: string) => {
    startTransition(async () => {
      const res = await lockPayrollAction(periodId)
      if (res.success) {
        notify('Payroll period PERMANENTLY LOCKED and archived!')
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to lock payroll.')
      }
    })
  }

  // 9. Record Salary Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayrollItem || salaryPayForm.amount <= 0) return

    startTransition(async () => {
      const res = await recordSalaryPaymentAction({
        payrollPeriodId: selectedPayrollItem.periodId,
        payrollItemId: selectedPayrollItem.item.id,
        employeeId: selectedPayrollItem.item.employee_id,
        amount: salaryPayForm.amount,
        paymentMethod: salaryPayForm.paymentMethod,
        referenceNumber: salaryPayForm.referenceNumber,
        notes: salaryPayForm.notes,
      })

      if (res.success && res.data) {
        notify(`Salary payment of ৳ ${formatBDT(res.data.amount)} recorded via ${res.data.payment_method.toUpperCase()}!`)
        setIsSalaryPaymentModalOpen(false)
        loadAllData()
      } else {
        setErrorMessage(res.error || 'Failed to record salary payment.')
      }
    })
  }

  // Filtered Lists
  const filteredEmployees = employees.filter((emp) => {
    const matchSearch =
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (emp.name_bn && emp.name_bn.includes(searchTerm)) ||
      emp.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.mobile.includes(searchTerm)
    const matchDept = deptFilter === 'ALL' || emp.department === deptFilter
    const matchType = typeFilter === 'ALL' || emp.employee_type === typeFilter
    return matchSearch && matchDept && matchType
  })

  const filteredAttendance = dailyAttendance.filter((att) => {
    const matchSearch =
      (att.employee_name && att.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (att.notes && att.notes.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchDept = deptFilter === 'ALL' || att.employee_department === deptFilter
    return matchSearch && matchDept
  })

  const filteredOt = overtimeRecords.filter((ot) => {
    if (otStatusFilter === 'ALL') return true
    return ot.status === otStatusFilter
  })

  const activePeriod = payrollPeriods[0]

  return (
    <FeatureGate feature="hr">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <PageHeader
          titleEn="Workforce, Users & Payroll"
          titleBn="কর্মী, ইউজার ও পেরোল ব্যবস্থাপনা"
          descriptionEn="Permanent technical operators, daily labor, system users & roles, attendance punch, and payroll runs."
          descriptionBn="প্রিন্ট শপ কর্মী, সিস্টেম ইউজার, হাজিরা, ওভারটাইম অনুমোদন এবং বেতন হিসাব পরিচালনা করুন।"
          icon={Users2}
          iconColor="text-blue-600"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMobilePunchOpen(true)}
                className="text-xs border-indigo-300 text-indigo-800 bg-indigo-50/50 hover:bg-indigo-100/80 dark:border-indigo-800 dark:text-indigo-300 dark:bg-indigo-950/40 font-bold bangla-text shadow-xs"
              >
                <UserCheck className="mr-1.5 h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                {tBilingual('Employee Shift Punch', 'কর্মচারী শিফট পাঞ্চ')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAttendanceModalOpen(true)}
                className="text-xs border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 bangla-text"
              >
                <Clock className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Mark Attendance', 'হাজিরা এন্ট্রি')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAdvanceModalOpen(true)}
                className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 bangla-text"
              >
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Salary Advance', 'বেতন অগ্রিম')}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setEmpForm({
                    name: '',
                    name_bn: '',
                    mobile: '+88017',
                    email: '',
                    address: 'Dhaka',
                    role: 'Machine Operator',
                    department: 'printing',
                    employee_type: 'permanent',
                    salary_basis: 'monthly',
                    base_salary: 25000,
                    daily_rate: 800,
                    hourly_rate: 120,
                    overtime_hourly_rate: 180,
                    emergency_contact_name: '',
                    emergency_contact_phone: '',
                    emergency_contact_relation: 'Spouse',
                    notes: '',
                  })
                  setIsNewEmpModalOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text shadow-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Add Employee', 'নতুন কর্মী')}
              </Button>
            </div>
          }
        />

        {/* Alerts & Notifications */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setNotification(null)} className="h-5 w-5 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-semibold flex items-center justify-between border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 animate-in fade-in-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setErrorMessage(null)} className="h-5 w-5 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Live Owner KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-blue-600 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Today Floor Presence</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {summary?.todayAttendance.present || 0} / {summary?.todayAttendance.totalEmployees || employees.length}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px]">
              <span className="text-emerald-600 font-bold">{summary?.todayAttendance.late || 0} Late</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-600 font-bold">{summary?.todayAttendance.fieldWork || 0} Field</span>
              <span className="text-slate-400">•</span>
              <span className="text-rose-600 font-bold">{summary?.todayAttendance.absent || 0} Absent</span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overtime Today / Pending</span>
            <div className="text-2xl font-black text-amber-600 mt-1">
              {summary?.todayAttendance.potentialOtHours || 0} hrs
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Pending Approval:</span>
              <span className="font-bold text-amber-700 dark:text-amber-400">
                <CurrencyDisplay amount={summary?.monthFinancials.pendingOtAmount || 0} />
              </span>
            </div>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-600 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advances Outstanding (অগ্রিম)</span>
            <div className="text-2xl font-black text-purple-600 mt-1">
              <CurrencyDisplay amount={summary?.monthFinancials.advancesOutstanding || 0} />
            </div>
            <span className="text-[11px] text-slate-400">Auto-deducted on month-end payroll</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Month Payroll / Due</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              <CurrencyDisplay amount={summary?.monthFinancials.grossPayroll || 0} />
            </div>
            <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
              <span>Unpaid Salary Due:</span>
              <span className="font-bold text-rose-600">
                <CurrencyDisplay amount={summary?.monthFinancials.unpaidSalaryDue || 0} />
              </span>
            </div>
          </Card>
        </div>

        {/* View Switcher Navigation Tabs */}
        <div className="flex items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
            <Button
              size="sm"
              variant={activeTab === 'employees' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('employees')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold ${
                activeTab === 'employees' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Users2 className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('Employees', 'কর্মী তালিকা')} ({employees.length})
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('users')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold ${
                activeTab === 'users' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('System Users & Access', 'ইউজার ও অনুমতি')}
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'attendance' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('attendance')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold ${
                activeTab === 'attendance' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('Daily Attendance', 'দৈনিক হাজিরা')}
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'overtime' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('overtime')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold relative ${
                activeTab === 'overtime' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('Overtime Approval', 'ওভারটাইম অনুমোদন')}
              {overtimeRecords.filter((r) => r.status === 'pending_approval').length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                  {overtimeRecords.filter((r) => r.status === 'pending_approval').length}
                </span>
              )}
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'advances' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('advances')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold ${
                activeTab === 'advances' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('Salary Advances', 'বেতন অগ্রিম')}
            </Button>

            <Button
              size="sm"
              variant={activeTab === 'payroll' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('payroll')}
              className={`text-xs h-8 px-3 rounded-xl font-semibold ${
                activeTab === 'payroll' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 mr-1.5" />
              {tBilingual('Payroll & Payouts', 'মাসিক পে-রোল')}
            </Button>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={loadAllData}
            disabled={isLoading}
            className="h-8 px-2.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* =========================================================================
            TAB 1: EMPLOYEES DIRECTORY
           ========================================================================= */}
        {activeTab === 'employees' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={tBilingual('Search employee by name, Bangla, mobile, ID...', 'নাম বা মোবাইল দিয়ে খুঁজুন...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-9 bg-white dark:bg-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  aria-label="Filter by department"
                  className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Departments (সব বিভাগ)</option>
                  <option value="printing">Printing (প্রিন্টিং)</option>
                  <option value="finishing">Finishing (ফিনিশিং)</option>
                  <option value="fabrication">Fabrication (ফেব্রিকেশন)</option>
                  <option value="design">Design Studio (ডিজাইন)</option>
                  <option value="installation">Installation & Site (ফিটিং)</option>
                  <option value="accounts">Accounts (হিসাব)</option>
                  <option value="sales">Sales & Marketing (বিক্রয়)</option>
                  <option value="management">Management (ম্যানেজমেন্ট)</option>
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by employment type"
                  className="h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Staff Types (সব ধরন)</option>
                  <option value="permanent">Monthly Permanent (স্থায়ী)</option>
                  <option value="daily_labor">Daily Worker (দৈনিক শ্রমিক)</option>
                  <option value="hourly_worker">Hourly Worker (ঘণ্টা ভিত্তিক)</option>
                  <option value="contract">Contract (চুক্তিভিত্তিক)</option>
                </select>
              </div>
            </div>

            {/* Employees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployees.map((emp) => (
                <Card
                  key={emp.id}
                  className="p-5 hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 relative group cursor-pointer"
                  onClick={() => {
                    setSelectedEmp(emp)
                    setIsEmp360DrawerOpen(true)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {emp.name}
                          {emp.name_bn && <span className="text-xs text-slate-500 font-normal">({emp.name_bn})</span>}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span className="font-mono font-semibold">{emp.employee_id_number}</span>
                          <span>•</span>
                          <span className="capitalize">{emp.role}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] capitalize ${
                        emp.employee_type === 'permanent'
                          ? 'border-blue-200 text-blue-700 bg-blue-50'
                          : emp.employee_type === 'daily_labor'
                          ? 'border-amber-200 text-amber-700 bg-amber-50'
                          : 'border-purple-200 text-purple-700 bg-purple-50'
                      }`}
                    >
                      {emp.employee_type.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Salary Basis</span>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {emp.salary_basis === 'daily_rate' ? (
                          <>৳ {formatBDT(emp.daily_rate)} / day</>
                        ) : emp.salary_basis === 'hourly_rate' ? (
                          <>৳ {formatBDT(emp.hourly_rate)} / hr</>
                        ) : (
                          <>৳ {formatBDT(emp.base_salary)} / mo</>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase">Advance Balance</span>
                      <div className="font-bold text-amber-600">
                        <CurrencyDisplay amount={emp.current_advance_balance || 0} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {emp.mobile}
                    </span>
                    <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      View Profile <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </Card>
              ))}

              {filteredEmployees.length === 0 && (
                <div className="col-span-full text-center p-12 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                  <Users2 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No employees found</h4>
                  <p className="text-xs text-slate-500 mt-1">Try changing your search keywords or department filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB: SYSTEM USERS & ACCESS (User Management)
           ========================================================================= */}
        {activeTab === 'users' && (
          <div className="space-y-4">
            <UsersManagementView hideHeader={true} />
          </div>
        )}

        {/* =========================================================================
            TAB 2: DAILY ATTENDANCE
           ========================================================================= */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Live Shift Punch Banner & Quick Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-emerald-50/40 dark:from-indigo-950/40 dark:via-blue-950/20 dark:to-emerald-950/20 border border-indigo-100 dark:border-indigo-900/60 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {tBilingual('Employee Shift Punch & QR Attendance', 'কর্মচারী শিফট পাঞ্চ ও কিউআর হাজিরা')}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tBilingual('Live camera QR code scan, geofenced GPS verification, and shift punch-in / punch-out.', 'লাইভ কিউআর স্ক্যান এবং জিপিএস সীমানার ভেতর স্বয়ংক্রিয় শিফট হাজিরা ও প্রস্থান।')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  onClick={() => setIsMobilePunchOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8.5 rounded-xl font-bold gap-1.5 shadow-xs"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  <span>{tBilingual('Open Shift Punch Terminal', 'শিফট পাঞ্চ টার্মিনাল')}</span>
                </Button>
                <Link
                  href={`/${tenantSlug}/attendance`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 underline underline-offset-2 px-2 py-1"
                >
                  {tBilingual('Dedicated Terminal View →', 'ডেডিকেটেড ভিউ →')}
                </Link>
              </div>
            </div>

            {/* Attendance Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    value={attDateFilter}
                    onChange={(e) => setAttDateFilter(e.target.value)}
                    className="h-8 text-xs w-36 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setAttDateFilter(new Date().toISOString().split('T')[0])}
                  className="h-8 text-xs"
                >
                  Today
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Clock className="mr-1.5 h-3.5 w-3.5" />
                  Mark Floor Attendance
                </Button>
              </div>
            </div>

            {/* Daily Attendance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Employee (কর্মী)</th>
                    <th className="p-3.5">Shift & Status</th>
                    <th className="p-3.5">Check-In (প্রবেশ)</th>
                    <th className="p-3.5">Check-Out (প্রস্থান)</th>
                    <th className="p-3.5">Worked Duration</th>
                    <th className="p-3.5">Late / Early Leave</th>
                    <th className="p-3.5">Potential OT</th>
                    <th className="p-3.5 text-right">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredAttendance.map((att) => (
                    <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">{att.employee_name}</div>
                        <div className="text-[11px] text-slate-500 capitalize">{att.employee_department}</div>
                      </td>

                      <td className="p-3.5">
                        <Badge
                          className={`text-[10px] capitalize ${
                            att.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : att.status === 'late'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : att.status === 'field_work'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : att.status === 'absent'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {att.status.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="p-3.5 font-mono">
                        {att.check_in_time || <span className="text-slate-400">—</span>}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att.check_out_time || <span className="text-slate-400 font-sans text-[11px]">Working Now</span>}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att.worked_minutes > 0 ? (
                          `${Math.floor(att.worked_minutes / 60)}h ${att.worked_minutes % 60}m`
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {att.late_minutes > 0 && (
                          <span className="text-rose-600 font-bold block">Late: {att.late_minutes}m</span>
                        )}
                        {att.early_leave_minutes > 0 && (
                          <span className="text-amber-600 font-bold block">Early Leave: {att.early_leave_minutes}m</span>
                        )}
                        {att.late_minutes === 0 && att.early_leave_minutes === 0 && (
                          <span className="text-emerald-600">On Time</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {att.potential_ot_minutes > 0 ? (
                          <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-800 bg-amber-50">
                            +{Math.floor(att.potential_ot_minutes / 60)}h {att.potential_ot_minutes % 60}m OT
                          </Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                          {att.attendance_source}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {filteredAttendance.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No attendance records recorded for {attDateFilter}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: OVERTIME APPROVAL QUEUE
           ========================================================================= */}
        {activeTab === 'overtime' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={otStatusFilter === 'pending_approval' ? 'default' : 'outline'}
                  onClick={() => setOtStatusFilter('pending_approval')}
                  className="text-xs h-8"
                >
                  Pending Approval ({overtimeRecords.filter((r) => r.status === 'pending_approval').length})
                </Button>

                <Button
                  size="sm"
                  variant={otStatusFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setOtStatusFilter('approved')}
                  className="text-xs h-8"
                >
                  Approved Ledger ({overtimeRecords.filter((r) => r.status === 'approved').length})
                </Button>

                <Button
                  size="sm"
                  variant={otStatusFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setOtStatusFilter('ALL')}
                  className="text-xs h-8"
                >
                  All Records
                </Button>
              </div>

              <Button
                size="sm"
                onClick={() => setIsOtRequestModalOpen(true)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Record Overtime
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOt.map((ot) => (
                <Card key={ot.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{ot.employee_name}</h4>
                      <div className="text-xs text-slate-500 font-mono">Date: {ot.ot_date}</div>
                    </div>

                    <Badge
                      className={`text-[10px] capitalize ${
                        ot.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : ot.status === 'pending_approval'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {ot.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Duration</span>
                      <div className="font-bold text-slate-900 dark:text-white">{ot.duration_hours} Hours</div>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase">Rate Multiplier</span>
                      <div className="font-bold text-blue-600">{ot.multiplier}x (৳ {ot.effective_ot_rate}/hr)</div>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase">Payable Amount</span>
                      <div className="font-bold text-emerald-600">৳ {formatBDT(ot.calculated_amount)}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300 italic">
                    &ldquo;{ot.reason}&rdquo;
                  </div>

                  {ot.status === 'pending_approval' && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewOt(ot.id, 'rejected')}
                        className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        <X className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleReviewOt(ot.id, 'approved', 1.5)}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Check className="h-3.5 w-3.5 mr-1" /> Approve (1.5x)
                      </Button>
                    </div>
                  )}
                </Card>
              ))}

              {filteredOt.length === 0 && (
                <div className="col-span-full text-center p-12 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                  <TrendingUp className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No overtime records in this queue</h4>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: SALARY ADVANCES
           ========================================================================= */}
        {activeTab === 'advances' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Salary Advances (বেতন অগ্রিম লেজার)</h3>
                <p className="text-xs text-slate-500">Auto-deducted from employee month-end payroll sheets.</p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsAdvanceModalOpen(true)}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Disburse Advance
              </Button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3.5">Voucher #</th>
                    <th className="p-3.5">Employee (কর্মী)</th>
                    <th className="p-3.5">Disbursed Date</th>
                    <th className="p-3.5">Amount (পরিমাণ)</th>
                    <th className="p-3.5">Deducted in Payroll</th>
                    <th className="p-3.5">Remaining Balance</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {advances.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="p-3.5 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {adv.advance_voucher_number}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        {adv.employee_name}
                      </td>

                      <td className="p-3.5 font-mono text-slate-500">
                        {adv.disbursed_date}
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={adv.amount} />
                      </td>

                      <td className="p-3.5 text-emerald-600 font-bold">
                        <CurrencyDisplay amount={adv.deducted_amount || 0} />
                      </td>

                      <td className="p-3.5 text-amber-600 font-bold">
                        <CurrencyDisplay amount={adv.remaining_amount !== undefined ? adv.remaining_amount : adv.amount} />
                      </td>

                      <td className="p-3.5 capitalize text-slate-600">
                        {adv.payment_method}
                      </td>

                      <td className="p-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            adv.is_settled
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : 'border-amber-200 text-amber-700 bg-amber-50'
                          }`}
                        >
                          {adv.is_settled ? 'Settled' : 'Active Balance'}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {advances.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        No salary advances on record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: PAYROLL & PAYOUTS
           ========================================================================= */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monthly Payroll Control Center</h3>
                <p className="text-xs text-slate-500">Authoritative salary calculation, immutable approval lock & payment tracking.</p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsGenPayrollModalOpen(true)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Generate New Payroll Sheet
              </Button>
            </div>

            {/* Active Payroll Period View */}
            {activePeriod ? (
              <Card className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                {/* Period Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-slate-900 dark:text-white">{activePeriod.period_name}</h2>
                      <Badge
                        className={`text-xs uppercase font-bold ${
                          activePeriod.status === 'locked' || activePeriod.status === 'paid'
                            ? 'bg-emerald-600 text-white'
                            : activePeriod.status === 'approved'
                            ? 'bg-blue-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {activePeriod.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      {activePeriod.start_date} to {activePeriod.end_date} • {activePeriod.working_days_count} Working Days
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activePeriod.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleApprovePayroll(activePeriod.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-xs text-white"
                      >
                        <Check className="mr-1.5 h-3.5 w-3.5" /> Approve Payroll
                      </Button>
                    )}

                    {activePeriod.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleLockPayroll(activePeriod.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-xs text-white"
                      >
                        <Lock className="mr-1.5 h-3.5 w-3.5" /> Lock & Freeze Payroll
                      </Button>
                    )}

                    <Button size="sm" variant="outline" asChild className="text-xs">
                      <Link href={`/${tenantSlug}/hr/payroll/${activePeriod.id}`}>
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Print Pay Slips
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Payroll Financial Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Gross Salary</span>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      <CurrencyDisplay amount={activePeriod.total_gross_salary} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Overtime Total</span>
                    <div className="font-bold text-sm text-amber-600">
                      <CurrencyDisplay amount={activePeriod.total_ot_amount} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Advances Deducted</span>
                    <div className="font-bold text-sm text-purple-600">
                      <CurrencyDisplay amount={activePeriod.total_advances_deducted} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Net Payable</span>
                    <div className="font-bold text-sm text-emerald-600">
                      <CurrencyDisplay amount={activePeriod.total_net_salary} />
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 uppercase">Paid / Due</span>
                    <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      <span className="text-emerald-600">৳ {formatBDT(activePeriod.total_paid_amount || 0)}</span> /{' '}
                      <span className="text-rose-600">৳ {formatBDT(activePeriod.total_due_amount || activePeriod.total_net_salary)}</span>
                    </div>
                  </div>
                </div>

                {/* Items Breakdown Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3">Employee</th>
                        <th className="p-3">Role / Dept</th>
                        <th className="p-3">Base Rate</th>
                        <th className="p-3">Overtime</th>
                        <th className="p-3">Gross Salary</th>
                        <th className="p-3">Advance Deduct</th>
                        <th className="p-3">Net Payable</th>
                        <th className="p-3">Payment Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                      {(activePeriod.items || []).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{item.employee_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{item.employee_id_number}</div>
                          </td>

                          <td className="p-3">
                            <div className="capitalize">{item.role}</div>
                            <div className="text-[10px] text-slate-400 capitalize">{item.department}</div>
                          </td>

                          <td className="p-3 font-mono">
                            ৳ {formatBDT(item.base_salary || item.daily_rate * 26)}
                          </td>

                          <td className="p-3 font-mono text-amber-600">
                            ৳ {formatBDT(item.overtime_amount)}
                            <span className="text-[10px] text-slate-400 block">({item.overtime_hours}h)</span>
                          </td>

                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {formatBDT(item.gross_salary)}
                          </td>

                          <td className="p-3 font-mono text-purple-600">
                            ৳ {formatBDT(item.advance_salary_deducted)}
                          </td>

                          <td className="p-3 font-mono font-bold text-emerald-600 text-sm">
                            ৳ {formatBDT(item.net_salary)}
                          </td>

                          <td className="p-3">
                            <Badge
                              className={`text-[10px] uppercase font-bold ${
                                item.payment_status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border-rose-300'
                              }`}
                            >
                              {item.payment_status}
                            </Badge>
                          </td>

                          <td className="p-3 text-right">
                            {item.payment_status !== 'paid' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedPayrollItem({ periodId: activePeriod.id, item })
                                  setSalaryPayForm({
                                    amount: item.due_amount || item.net_salary,
                                    paymentMethod: 'bkash',
                                    referenceNumber: '',
                                    notes: `Salary payout for ${item.employee_name}`,
                                  })
                                  setIsSalaryPaymentModalOpen(true)
                                }}
                                className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                Pay Salary
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              <div className="text-center p-12 border-2 border-dashed rounded-2xl border-slate-200 dark:border-slate-800">
                <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No payroll periods created yet</h4>
                <p className="text-xs text-slate-500 mt-1">Click &ldquo;Generate New Payroll Sheet&rdquo; to start this month&apos;s run.</p>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            MODAL: ADD / EDIT EMPLOYEE
           ========================================================================= */}
        <ModalDialog
          open={isNewEmpModalOpen || isEditEmpModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsNewEmpModalOpen(false)
              setIsEditEmpModalOpen(false)
            }
          }}
          title={isEditEmpModalOpen ? 'Edit Employee Profile' : 'Add New Employee to Factory Roster'}
        >
          <form onSubmit={handleSaveEmployee} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Employee Full Name (English) *</Label>
                <Input
                  required
                  placeholder="e.g. Rahim Uddin"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">নাম (বাংলা)</Label>
                <Input
                  placeholder="যেমন: রহিম উদ্দিন"
                  value={empForm.name_bn}
                  onChange={(e) => setEmpForm({ ...empForm, name_bn: e.target.value })}
                  className="text-xs h-9 mt-1 bangla-text"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Mobile Number *</Label>
                <Input
                  required
                  placeholder="+88017XXXXXXXX"
                  value={empForm.mobile}
                  onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })}
                  className="text-xs h-9 mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="staff@inkflow.com"
                  value={empForm.email}
                  onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Department *</Label>
                <select
                  value={empForm.department}
                  onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1"
                >
                  <option value="printing">Printing (প্রিন্টিং)</option>
                  <option value="finishing">Finishing (ফিনিশিং)</option>
                  <option value="fabrication">Fabrication (ফেব্রিকেশন)</option>
                  <option value="design">Design Studio (ডিজাইন)</option>
                  <option value="installation">Installation (ফিটিং)</option>
                  <option value="accounts">Accounts (হিসাব)</option>
                  <option value="sales">Sales (বিক্রয়)</option>
                  <option value="management">Management</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Role / Designation *</Label>
                <Input
                  required
                  placeholder="e.g. Master Printer"
                  value={empForm.role}
                  onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Employment Type *</Label>
                <select
                  value={empForm.employee_type}
                  onChange={(e) => {
                    const val = e.target.value as EmploymentType
                    setEmpForm({
                      ...empForm,
                      employee_type: val,
                      salary_basis: val === 'daily_labor' ? 'daily_rate' : val === 'hourly_worker' ? 'hourly_rate' : 'monthly',
                    })
                  }}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1"
                >
                  <option value="permanent">Monthly Permanent (স্থায়ী)</option>
                  <option value="daily_labor">Daily Worker (দৈনিক শ্রমিক)</option>
                  <option value="hourly_worker">Hourly Worker (ঘণ্টা ভিত্তিক)</option>
                  <option value="contract">Contract (চুক্তিভিত্তিক)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
              <div>
                <Label className="text-xs font-semibold">
                  {empForm.salary_basis === 'daily_rate' ? 'Daily Wage (৳)' : empForm.salary_basis === 'hourly_rate' ? 'Hourly Wage (৳)' : 'Monthly Basic (৳)'}
                </Label>
                <Input
                  type="number"
                  value={empForm.salary_basis === 'daily_rate' ? empForm.daily_rate : empForm.salary_basis === 'hourly_rate' ? empForm.hourly_rate : empForm.base_salary}
                  onChange={(e) => {
                    const val = Number(e.target.value)
                    if (empForm.salary_basis === 'daily_rate') setEmpForm({ ...empForm, daily_rate: val })
                    else if (empForm.salary_basis === 'hourly_rate') setEmpForm({ ...empForm, hourly_rate: val })
                    else setEmpForm({ ...empForm, base_salary: val })
                  }}
                  className="text-xs h-9 mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Overtime Hourly Rate (৳)</Label>
                <Input
                  type="number"
                  value={empForm.overtime_hourly_rate}
                  onChange={(e) => setEmpForm({ ...empForm, overtime_hourly_rate: Number(e.target.value) })}
                  className="text-xs h-9 mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Emergency Contact</Label>
                <Input
                  placeholder="Name / Phone"
                  value={empForm.emergency_contact_phone}
                  onChange={(e) => setEmpForm({ ...empForm, emergency_contact_phone: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsNewEmpModalOpen(false)
                  setIsEditEmpModalOpen(false)
                }}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isPending ? 'Saving...' : isEditEmpModalOpen ? 'Update Profile' : 'Save Employee'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            MODAL: DISBURSE SALARY ADVANCE
           ========================================================================= */}
        <ModalDialog
          open={isAdvanceModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsAdvanceModalOpen(false)
          }}
          title="Disburse Salary Advance (বেতন অগ্রিম প্রদান)"
        >
          <form onSubmit={handleDisburseAdvance} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">Select Employee *</Label>
              <select
                required
                value={advForm.employeeId}
                onChange={(e) => setAdvForm({ ...advForm, employeeId: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) — Current Bal: ৳ {formatBDT(emp.current_advance_balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Advance Amount (৳) *</Label>
                <Input
                  required
                  type="number"
                  min="500"
                  step="500"
                  value={advForm.amount}
                  onChange={(e) => setAdvForm({ ...advForm, amount: Number(e.target.value) })}
                  className="text-xs h-9 mt-1 font-mono font-bold text-amber-600"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <select
                  value={advForm.paymentMethod}
                  onChange={(e) => setAdvForm({ ...advForm, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
                >
                  <option value="cash">Cash (নগদ)</option>
                  <option value="bkash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ এমএফএস)</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reason / Note</Label>
              <Input
                placeholder="e.g. Medical emergency or festival advance"
                value={advForm.reason}
                onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
                className="text-xs h-9 mt-1"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] border border-amber-200 dark:border-amber-800">
              <span className="font-bold">Financial Rule:</span> This advance will be posted to the Double-Entry Cash/Bank ledger and automatically deducted from the employee&apos;s month-end payroll sheet.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsAdvanceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                {isPending ? 'Disbursing...' : 'Confirm & Disburse Advance'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            MODAL: MARK DAILY ATTENDANCE
           ========================================================================= */}
        <ModalDialog
          open={isAttendanceModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsAttendanceModalOpen(false)
          }}
          title="Mark Daily Floor Attendance (হাজিরা এন্ট্রি)"
        >
          <form onSubmit={handleSaveAttendance} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">Employee *</Label>
              <select
                required
                value={attForm.employeeId}
                onChange={(e) => setAttForm({ ...attForm, employeeId: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) • {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Status *</Label>
                <select
                  value={attForm.status}
                  onChange={(e) => setAttForm({ ...attForm, status: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
                >
                  <option value="present">Present (উপস্থিত)</option>
                  <option value="late">Late (দেরি)</option>
                  <option value="absent">Absent (অনুপস্থিত)</option>
                  <option value="half_day">Half Day (অর্ধ দিবস)</option>
                  <option value="field_work">Field Work (মাঠের কাজ)</option>
                  <option value="leave">Leave (ছুটি)</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Check-In Time</Label>
                <Input
                  type="time"
                  value={attForm.checkInTime}
                  onChange={(e) => setAttForm({ ...attForm, checkInTime: e.target.value })}
                  className="text-xs h-9 mt-1 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Check-Out Time</Label>
                <Input
                  type="time"
                  value={attForm.checkOutTime}
                  onChange={(e) => setAttForm({ ...attForm, checkOutTime: e.target.value })}
                  className="text-xs h-9 mt-1 font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Notes / Reason</Label>
              <Input
                placeholder="e.g. Machine setup overtime or approved late entry"
                value={attForm.notes}
                onChange={(e) => setAttForm({ ...attForm, notes: e.target.value })}
                className="text-xs h-9 mt-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsAttendanceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? 'Saving...' : 'Save Attendance'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            MODAL: RECORD OVERTIME REQUEST
           ========================================================================= */}
        <ModalDialog
          open={isOtRequestModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsOtRequestModalOpen(false)
          }}
          title="Record Overtime Request (ওভারটাইম এন্ট্রি)"
        >
          <form onSubmit={handleCreateOtRequest} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">Employee *</Label>
              <select
                required
                value={otForm.employeeId}
                onChange={(e) => setOtForm({ ...otForm, employeeId: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) • OT Rate: ৳ {emp.overtime_hourly_rate}/hr
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Overtime Duration (Minutes) *</Label>
                <Input
                  required
                  type="number"
                  min="30"
                  step="30"
                  value={otForm.durationMinutes}
                  onChange={(e) => setOtForm({ ...otForm, durationMinutes: Number(e.target.value) })}
                  className="text-xs h-9 mt-1 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400">
                  = {Math.round((otForm.durationMinutes / 60) * 10) / 10} Hours
                </span>
              </div>

              <div>
                <Label className="text-xs font-semibold">Overtime Type *</Label>
                <select
                  value={otForm.otType}
                  onChange={(e) => setOtForm({ ...otForm, otType: e.target.value as any })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
                >
                  <option value="regular_day">Regular Day OT (1.5x)</option>
                  <option value="weekly_off">Weekly Off Day OT (1.5x)</option>
                  <option value="holiday">Govt / Festival Holiday OT (2.0x)</option>
                  <option value="night_shift">Night Shift After Hours</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Reason for Overtime *</Label>
              <Input
                required
                placeholder="e.g. Urgent acrylic letter fabrication for client launch"
                value={otForm.reason}
                onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                className="text-xs h-9 mt-1"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsOtRequestModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
                {isPending ? 'Submitting...' : 'Submit Overtime Request'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            MODAL: GENERATE MONTHLY PAYROLL
           ========================================================================= */}
        <ModalDialog
          open={isGenPayrollModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsGenPayrollModalOpen(false)
          }}
          title="Generate Monthly Payroll Sheet (মাসিক পে-রোল প্রস্তুত করুন)"
        >
          <form onSubmit={handleGeneratePayroll} className="space-y-4 text-xs">
            <div>
              <Label className="text-xs font-semibold">Payroll Period Name *</Label>
              <Input
                required
                placeholder="e.g. September 2026 Payroll"
                value={payrollGenForm.periodName}
                onChange={(e) => setPayrollGenForm({ ...payrollGenForm, periodName: e.target.value })}
                className="text-xs h-9 mt-1 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Start Date *</Label>
                <Input
                  required
                  type="date"
                  value={payrollGenForm.startDate}
                  onChange={(e) => setPayrollGenForm({ ...payrollGenForm, startDate: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">End Date *</Label>
                <Input
                  required
                  type="date"
                  value={payrollGenForm.endDate}
                  onChange={(e) => setPayrollGenForm({ ...payrollGenForm, endDate: e.target.value })}
                  className="text-xs h-9 mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Working Days in Month *</Label>
              <Input
                required
                type="number"
                min="20"
                max="31"
                value={payrollGenForm.workingDaysCount}
                onChange={(e) => setPayrollGenForm({ ...payrollGenForm, workingDaysCount: Number(e.target.value) })}
                className="text-xs h-9 mt-1 font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-300 text-[11px] border border-blue-200 dark:border-blue-800">
              <span className="font-bold">Automated Aggregation:</span> The engine will automatically compile approved attendance, verified approved overtime, and deduct active salary advances for all {employees.length} active staff.
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsGenPayrollModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                {isPending ? 'Generating Sheet...' : 'Generate Payroll Sheet'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            MODAL: RECORD SALARY PAYMENT
           ========================================================================= */}
        <ModalDialog
          open={isSalaryPaymentModalOpen}
          onOpenChange={(open) => {
            if (!open) setIsSalaryPaymentModalOpen(false)
          }}
          title={`Pay Salary: ${selectedPayrollItem?.item.employee_name || 'Staff'}`}
        >
          <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-400 uppercase">Net Salary Due</span>
                <div className="font-bold text-sm text-emerald-600">
                  ৳ {formatBDT(selectedPayrollItem?.item.due_amount || selectedPayrollItem?.item.net_salary || 0)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase">Role / Dept</span>
                <div className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                  {selectedPayrollItem?.item.role} ({selectedPayrollItem?.item.department})
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Amount (৳) *</Label>
                <Input
                  required
                  type="number"
                  value={salaryPayForm.amount}
                  onChange={(e) => setSalaryPayForm({ ...salaryPayForm, amount: Number(e.target.value) })}
                  className="text-xs h-9 mt-1 font-mono font-bold text-emerald-600"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <select
                  value={salaryPayForm.paymentMethod}
                  onChange={(e) => setSalaryPayForm({ ...salaryPayForm, paymentMethod: e.target.value as PaymentMethod })}
                  className="w-full h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mt-1 font-medium"
                >
                  <option value="bkash">bKash (বিকাশ)</option>
                  <option value="nagad">Nagad (নগদ)</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash (নগদ টাকা)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Transaction / Voucher Reference</Label>
              <Input
                placeholder="e.g. bKash TrxID: 9X87A21 or Bank Cheque #4492"
                value={salaryPayForm.referenceNumber}
                onChange={(e) => setSalaryPayForm({ ...salaryPayForm, referenceNumber: e.target.value })}
                className="text-xs h-9 mt-1 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsSalaryPaymentModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {isPending ? 'Processing...' : 'Confirm & Record Payment'}
              </Button>
            </div>
          </form>
        </ModalDialog>

        {/* =========================================================================
            DRAWER / MODAL: 360-DEGREE EMPLOYEE PROFILE
           ========================================================================= */}
        {selectedEmp && (
          <ModalDialog
            open={isEmp360DrawerOpen}
            onOpenChange={(open) => {
              if (!open) setIsEmp360DrawerOpen(false)
            }}
            title={`360° Employee Profile: ${selectedEmp.name}`}
          >
            <div className="space-y-4 text-xs">
              {/* Header Info */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base">
                  {selectedEmp.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedEmp.name} {selectedEmp.name_bn && `(${selectedEmp.name_bn})`}
                  </h3>
                  <div className="text-slate-500 flex items-center gap-1.5 font-mono text-[11px]">
                    <span>{selectedEmp.employee_id_number}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedEmp.role}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedEmp.department}</span>
                  </div>
                </div>
              </div>

              {/* Salary & Advance Details */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Salary Basis</span>
                  <div className="font-bold text-slate-900 dark:text-white text-sm">
                    {selectedEmp.salary_basis === 'daily_rate' ? (
                      <>৳ {formatBDT(selectedEmp.daily_rate)} / day</>
                    ) : (
                      <>৳ {formatBDT(selectedEmp.base_salary)} / month</>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500">OT Rate: ৳ {selectedEmp.overtime_hourly_rate}/hr</div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Active Advance Balance</span>
                  <div className="font-bold text-amber-600 text-sm">
                    <CurrencyDisplay amount={selectedEmp.current_advance_balance || 0} />
                  </div>
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => {
                      setIsEmp360DrawerOpen(false)
                      setAdvForm((prev) => ({ ...prev, employeeId: selectedEmp.id }))
                      setIsAdvanceModalOpen(true)
                    }}
                    className="p-0 h-auto text-[11px] text-blue-600"
                  >
                    + Disburse Advance
                  </Button>
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Mobile:</span>
                  <span className="font-mono">{selectedEmp.mobile}</span>
                </div>

                <div>
                  <span className="font-bold block text-slate-700 dark:text-slate-300">Joining Date:</span>
                  <span className="font-mono">{selectedEmp.joining_date}</span>
                </div>

                {selectedEmp.emergency_contact_phone && (
                  <div className="col-span-2">
                    <span className="font-bold block text-slate-700 dark:text-slate-300">Emergency Contact:</span>
                    <span>{selectedEmp.emergency_contact_phone} ({selectedEmp.emergency_contact_relation || 'Contact'})</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEmp360DrawerOpen(false)
                    setEmpForm({
                      id: selectedEmp.id,
                      name: selectedEmp.name,
                      name_bn: selectedEmp.name_bn || '',
                      mobile: selectedEmp.mobile,
                      email: selectedEmp.email || '',
                      address: selectedEmp.address || '',
                      role: selectedEmp.role,
                      department: selectedEmp.department,
                      employee_type: selectedEmp.employee_type,
                      salary_basis: selectedEmp.salary_basis,
                      base_salary: selectedEmp.base_salary,
                      daily_rate: selectedEmp.daily_rate,
                      hourly_rate: selectedEmp.hourly_rate,
                      overtime_hourly_rate: selectedEmp.overtime_hourly_rate,
                      emergency_contact_name: selectedEmp.emergency_contact_name || '',
                      emergency_contact_phone: selectedEmp.emergency_contact_phone || '',
                      emergency_contact_relation: selectedEmp.emergency_contact_relation || 'Spouse',
                      notes: selectedEmp.notes || '',
                    })
                    setIsEditEmpModalOpen(true)
                  }}
                  className="text-xs"
                >
                  Edit Profile
                </Button>

                <Button size="sm" onClick={() => setIsEmp360DrawerOpen(false)} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          </ModalDialog>
        )}

        {/* =========================================================================
            MODAL: LIVE ATTENDANCE SHIFT PUNCH TERMINAL
           ========================================================================= */}
        <AttendancePunchModal
          open={isMobilePunchOpen}
          onClose={() => {
            setIsMobilePunchOpen(false)
            loadAllData()
          }}
          tenantSlug={tenantSlug}
        />
      </div>
    </FeatureGate>
  )
}
