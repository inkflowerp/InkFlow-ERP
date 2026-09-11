'use client'

import React, { useState } from 'react'
import Link from 'next/link'
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
  BadgePercent,
  Check,
  Building,
  ShieldCheck,
  Phone,
  Sparkles,
  QrCode,
  MapPin,
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
import {
  EmployeeRecord,
  AttendanceRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  DailyLaborLogRecord,
  EmployeeType,
  AttendanceStatus,
} from '@/types/hr.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function HumanResourcesPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [employees, setEmployees] = useDataStore<EmployeeRecord[]>(STORAGE_KEYS.EMPLOYEES, [])
  const [attendances, setAttendances] = useDataStore<AttendanceRecord[]>(STORAGE_KEYS.ATTENDANCE, [])
  const [advances, setAdvances] = useDataStore<SalaryAdvanceRecord[]>(STORAGE_KEYS.SALARY_ADVANCES, [])
  const [payrollPeriods, setPayrollPeriods] = useDataStore<PayrollPeriodRecord[]>(STORAGE_KEYS.PAYROLL_PERIODS, [])
  const [dailyLaborLogs, setDailyLaborLogs] = useDataStore<DailyLaborLogRecord[]>(STORAGE_KEYS.DAILY_LABOR_LOGS, [])

  const [activeTab, setActiveTab] = useState<'employees' | 'attendance' | 'payroll' | 'daily_labor'>('employees')
  const [search, setSearch] = useState('')

  // Modals
  const [isNewEmpOpen, setIsNewEmpOpen] = useState(false)
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false)
  const [isDailyShiftOpen, setIsDailyShiftOpen] = useState(false)
  const [isMobilePunchOpen, setIsMobilePunchOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Advance Form State
  const [advEmpId, setAdvEmpId] = useState('emp-01')
  const [advAmount, setAdvAmount] = useState<number>(10000)
  const [advReason, setAdvReason] = useState('Medical expense emergency')

  // New Employee Form State
  const [empName, setEmpName] = useState('')
  const [empNameBn, setEmpNameBn] = useState('')
  const [empMobile, setEmpMobile] = useState('')
  const [empRole, setEmpRole] = useState('Machine Operator')
  const [empDept, setEmpDept] = useState<'printing' | 'finishing' | 'fabrication' | 'design' | 'installation' | 'accounts' | 'sales' | 'management'>('printing')
  const [empType, setEmpType] = useState<EmployeeType>('permanent')
  const [empSalary, setEmpSalary] = useState<number>(30000)
  const [empDailyRate, setEmpDailyRate] = useState<number>(0)
  const [empOtRate, setEmpOtRate] = useState<number>(180)

  // Daily Shift Form State
  const [shiftEmpId, setShiftEmpId] = useState('emp-05')
  const [shiftJobNo, setShiftJobNo] = useState('PRD-2024-003')
  const [shiftOtHours, setShiftOtHours] = useState<number>(1)
  const [shiftContribution, setShiftContribution] = useState('Cut and taped 300 vinyl stickers')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Quick Action: Punch Attendance
  const handleQuickAttendance = (empId: string, status: AttendanceStatus) => {
    const emp = employees.find((e) => e.id === empId)
    if (!emp) return

    const existing = attendances.find((a) => a.employee_id === empId)
    if (existing) {
      PrintERPDataStore.updateItem<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, existing.id, {
        status,
        check_in_time: status === 'present' ? '08:55 AM' : status === 'late' ? '09:30 AM' : undefined,
        late_minutes: status === 'late' ? 30 : 0,
      })
    } else {
      const newAtt: AttendanceRecord = {
        id: `att-${Date.now()}`,
        company_id: 'c-01',
        employee_id: emp.id,
        employee_name: emp.name,
        attendance_date: new Date().toISOString().split('T')[0],
        status,
        check_in_time: status === 'present' ? '08:55 AM' : status === 'late' ? '09:30 AM' : undefined,
        late_minutes: status === 'late' ? 30 : 0,
        overtime_hours: 0,
        created_at: new Date().toISOString(),
      }
      PrintERPDataStore.addItem<AttendanceRecord>(STORAGE_KEYS.ATTENDANCE, newAtt)
    }

    showNotification(`Attendance marked: ${emp.name} is ${status.toUpperCase()}.`)
  }

  // Quick Action: Disburse Salary Advance (User Example: ৳ 30,000 salary, ৳ 10,000 advance)
  const handleDisburseAdvance = (e: React.FormEvent) => {
    e.preventDefault()
    const emp = employees.find((e) => e.id === advEmpId)
    if (!emp) return

    const voucherNum = `ADV-2024-00${advances.length + 1}`
    const newAdv: SalaryAdvanceRecord = {
      id: `adv-${Date.now()}`,
      company_id: 'c-01',
      advance_voucher_number: voucherNum,
      employee_id: emp.id,
      employee_name: emp.name,
      amount: advAmount,
      disbursed_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      reason: advReason,
      is_settled: false,
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<SalaryAdvanceRecord>(STORAGE_KEYS.SALARY_ADVANCES, newAdv)
    PrintERPDataStore.updateItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, emp.id, {
      current_advance_balance: (emp.current_advance_balance || 0) + advAmount,
      updated_at: new Date().toISOString(),
    })

    setIsAdvanceOpen(false)
    showNotification(
      `Salary advance of ৳ ${formatBDT(advAmount)} disbursed to ${emp.name}. Will be auto-deducted from month-end payroll.`
    )
  }

  // Quick Action: Create Employee
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    const empIdNum = `EMP-00${employees.length + 1}`

    const newEmp: EmployeeRecord = {
      id: `emp-${Date.now()}`,
      company_id: 'c-01',
      employee_id_number: empIdNum,
      name: empName,
      name_bn: empNameBn,
      mobile: empMobile,
      role: empRole,
      department: empDept,
      employee_type: empType,
      joining_date: new Date().toISOString().split('T')[0],
      salary_type: empType === 'daily_labor' ? 'daily_rate' : 'monthly',
      base_salary: empType === 'daily_labor' ? 0 : empSalary,
      daily_rate: empType === 'daily_labor' ? empDailyRate : 0,
      overtime_hourly_rate: empOtRate,
      current_advance_balance: 0,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<EmployeeRecord>(STORAGE_KEYS.EMPLOYEES, newEmp)
    setIsNewEmpOpen(false)
    setEmpName('')
    setEmpNameBn('')
    setEmpMobile('')
    showNotification(`New employee ${newEmp.name} (${empIdNum}) added to factory roster!`)
  }

  // Quick Action: Log Daily Worker Shift
  const handleLogDailyShift = (e: React.FormEvent) => {
    e.preventDefault()
    const emp = employees.find((e) => e.id === shiftEmpId)
    if (!emp) return

    const rate = emp.daily_rate || 800
    const otAmount = shiftOtHours * emp.overtime_hourly_rate
    const totalPayout = rate + otAmount

    const newShift: DailyLaborLogRecord = {
      id: `dll-${Date.now()}`,
      company_id: 'c-01',
      employee_id: emp.id,
      employee_name: emp.name,
      work_date: new Date().toISOString().split('T')[0],
      assigned_job_number: shiftJobNo,
      daily_rate: rate,
      overtime_hours: shiftOtHours,
      total_payout: totalPayout,
      production_contribution: shiftContribution,
      payment_status: 'paid',
      created_at: 'Just now',
    }

    PrintERPDataStore.addItem<DailyLaborLogRecord>(STORAGE_KEYS.DAILY_LABOR_LOGS, newShift)
    setIsDailyShiftOpen(false)
    showNotification(`Daily wage payout of ৳ ${formatBDT(totalPayout)} recorded for ${emp.name}.`)
  }

  // Quick Action: Lock Payroll Period
  const handleLockPayroll = (periodId: string) => {
    PrintERPDataStore.updateItem<PayrollPeriodRecord>(STORAGE_KEYS.PAYROLL_PERIODS, periodId, {
      status: 'locked',
      approved_by_name: 'Managing Director',
      approved_at: new Date().toISOString(),
    })
    showNotification('Payroll period has been APPROVED & PERMANENTLY LOCKED! Records archived.')
  }

  // Executive Workforce KPIs
  const totalHeadcount = employees.filter((e: EmployeeRecord) => e.status === 'active').length
  const activeAdvances = employees.reduce((acc: number, e: EmployeeRecord) => acc + e.current_advance_balance, 0)
  const todayAttendances = attendances.filter(
    (a: AttendanceRecord) => a.attendance_date === new Date().toISOString().split('T')[0]
  )
  const presentCount = todayAttendances.filter((a: AttendanceRecord) => a.status === 'present' || a.status === 'half_day').length
  const lateCount = todayAttendances.filter((a: AttendanceRecord) => a.status === 'late').length

  return (
    <FeatureGate feature="hr">
      <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Workforce, Attendance & Payroll"
        titleBn="এইচআর ও বেতন ব্যবস্থাপনা"
        descriptionEn="Permanent technical operators, daily shop-floor labor, partial salary advance tracking, and immutable payroll sheets."
        descriptionBn="প্রিন্টিং অপারেটর, দৈনিক শ্রমিক, বেতন অগ্রিম ট্র্যাকিং এবং মাসিক পে-রোল হিসাব পরিচালনা করুন।"
        icon={Users2}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdvanceOpen(true)}
              className="text-xs border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 bangla-text"
            >
              <DollarSign className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Salary Advance', 'বেতন অগ্রিম')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewEmpOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Add Employee', 'নতুন কর্মী')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Workforce KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold text-slate-500">Active Workforce Headcount</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalHeadcount} Staff</div>
          <span className="text-[11px] text-slate-400">Permanent, contract & daily labor</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Today&apos;s Floor Attendance</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {presentCount} / {employees.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {lateCount > 0 ? `${lateCount} Late Check-in(s)` : 'All on time'}
          </span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500 bg-amber-50/20 dark:bg-amber-950/10">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
            Active Salary Advances (অগ্রিম বেতন)
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            <CurrencyDisplay amount={activeAdvances} />
          </div>
          <span className="text-[11px] text-amber-700 dark:text-amber-400">Auto-deducted on month-end payroll</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">Last Payroll Run</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            <CurrencyDisplay amount={payrollPeriods[0]?.total_net_salary || 0} />
          </div>
          <span className="text-[11px] text-purple-600 font-medium flex items-center gap-1">
            {payrollPeriods[0]?.status === 'locked' || payrollPeriods[0]?.status === 'disbursed' ? (
              <><Lock className="h-3 w-3" /> Approved & Locked</>
            ) : (
              'No finalized payroll'
            )}
          </span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <Button
            size="sm"
            variant={activeTab === 'employees' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('employees')}
            className={`text-xs h-8 px-3.5 ${
              activeTab === 'employees' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Users2 className="h-3.5 w-3.5 mr-1.5" />
            Employees Directory (কর্মচারী তালিকা)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'attendance' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('attendance')}
            className={`text-xs h-8 px-3.5 ${
              activeTab === 'attendance' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            Daily Attendance (হাজিরা)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'payroll' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('payroll')}
            className={`text-xs h-8 px-3.5 ${
              activeTab === 'payroll' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Monthly Payroll Runs (বেতন শীট)
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'daily_labor' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('daily_labor')}
            className={`text-xs h-8 px-3.5 ${
              activeTab === 'daily_labor' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5 mr-1.5" />
            Daily Labor & Wages (দৈনিক মজুরি)
          </Button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: EMPLOYEES DIRECTORY
         ========================================================================= */}
      {activeTab === 'employees' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <Card key={emp.id} className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono text-[10px] text-blue-600 font-bold block">{emp.employee_id_number}</span>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                    {emp.name} {emp.name_bn && <span className="text-slate-400 font-normal">({emp.name_bn})</span>}
                  </h4>
                  <div className="text-[11px] text-slate-500 font-medium">{emp.role}</div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {emp.employee_type.replace('_', ' ')}
                </Badge>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Department:</span>
                  <span className="capitalize font-bold text-slate-800 dark:text-slate-200">{emp.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Wage Structure:</span>
                  <span className="text-slate-900 dark:text-white font-bold">
                    {emp.salary_type === 'monthly' ? `৳ ${formatBDT(emp.base_salary)} / mo` : `৳ ${formatBDT(emp.daily_rate)} / day`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Overtime Rate:</span>
                  <span>৳ {emp.overtime_hourly_rate} / hr</span>
                </div>
              </div>

              {/* Salary Advance Notice (The User's Core Scenario) */}
              {emp.current_advance_balance > 0 && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 text-[11px] font-mono flex justify-between border border-amber-200">
                  <span>Advance Disbursed:</span>
                  <strong>৳ {formatBDT(emp.current_advance_balance)}</strong>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {emp.mobile}
                </div>
                <span>Joined: {emp.joining_date}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DAILY ATTENDANCE PUNCH BOARD
         ========================================================================= */}
      {activeTab === 'attendance' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Shop Floor Daily Attendance Punch</CardTitle>
                <CardDescription className="text-xs">
                  Real-time factory floor presence, late check-in minutes, and overtime tracking.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/${slug}/settings/attendance`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-indigo-400 hover:border-indigo-500/40 transition-colors"
                >
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Locations & Posters</span>
                </Link>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsMobilePunchOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Mobile Punch (QR / GPS)</span>
                </Button>
                <span className="hidden sm:inline font-mono text-xs font-bold text-slate-500">
                  Today: {new Date().toISOString().split('T')[0]}
                </span>
              </div>
            </div>
          </CardHeader>

          {/* Desktop Table View */}
          <CardContent className="hidden md:block p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Department & Role</th>
                  <th className="py-3 px-4">In / Out Time</th>
                  <th className="py-3 px-4 text-center">Late / OT</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4 text-right">Instant Punch Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => {
                  const att = attendances.find((a) => a.employee_id === emp.id)

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{emp.employee_id_number}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="capitalize font-semibold text-slate-700 dark:text-slate-300">{emp.department}</div>
                        <div className="text-[10px] text-slate-400">{emp.role}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        {att?.check_in_time ? (
                          <div>
                            {att.check_in_time} {att.check_out_time && `— ${att.check_out_time}`}
                          </div>
                        ) : (
                          <span className="text-slate-400">Not checked in</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono">
                        {att?.late_minutes && att.late_minutes > 0 ? (
                          <span className="text-red-600 font-bold block">+{att.late_minutes}m Late</span>
                        ) : null}
                        {att?.overtime_hours && att.overtime_hours > 0 ? (
                          <span className="text-blue-600 font-bold block">+{att.overtime_hours}h OT</span>
                        ) : null}
                        {!att?.late_minutes && !att?.overtime_hours && <span className="text-slate-400">—</span>}
                      </td>

                      <td className="py-3.5 px-4">
                        {att?.status === 'present' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Present</span>
                        )}
                        {att?.status === 'late' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Late Punch</span>
                        )}
                        {att?.status === 'half_day' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">Half Day</span>
                        )}
                        {(!att || att.status === 'absent') && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500">Unpunched</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAttendance(emp.id, 'present')}
                            className="h-7 text-xs px-2.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                          >
                            Present
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAttendance(emp.id, 'late')}
                            className="h-7 text-xs px-2.5 text-amber-700 border-amber-300 hover:bg-amber-50 cursor-pointer"
                          >
                            Late
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickAttendance(emp.id, 'absent')}
                            className="h-7 text-xs px-2.5 text-red-700 border-red-300 hover:bg-red-50 cursor-pointer"
                          >
                            Absent
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>

          {/* Mobile Touch Cards View */}
          <CardContent className="md:hidden p-3 space-y-3">
            {employees.map((emp) => {
              const att = attendances.find((a) => a.employee_id === emp.id)

              return (
                <div
                  key={emp.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        {emp.department} • {emp.role}
                      </div>
                    </div>
                    {att?.status === 'present' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Present
                      </span>
                    )}
                    {att?.status === 'late' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Late
                      </span>
                    )}
                    {att?.status === 'half_day' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                        Half Day
                      </span>
                    )}
                    {(!att || att.status === 'absent') && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400">
                        Unpunched
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800/60">
                    <span>In/Out:</span>
                    <span>
                      {att?.check_in_time ? `${att.check_in_time}${att.check_out_time ? ` — ${att.check_out_time}` : ''}` : 'Not Checked In'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleQuickAttendance(emp.id, 'present')}
                      className="py-2 px-1 text-center rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAttendance(emp.id, 'late')}
                      className="py-2 px-1 text-center rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Late
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickAttendance(emp.id, 'absent')}
                      className="py-2 px-1 text-center rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800 cursor-pointer min-h-[44px] flex items-center justify-center"
                    >
                      Absent
                    </button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Mobile QR / GPS Attendance Punch Modal */}
      <AttendancePunchModal
        open={isMobilePunchOpen}
        onClose={() => setIsMobilePunchOpen(false)}
        tenantSlug={slug}
        onAttendanceRecorded={(rec: any) => {
          showNotification('Mobile attendance punch successfully recorded!')
        }}
      />

      {/* =========================================================================
          VIEW 3: MONTHLY PAYROLL RUNS (Locked After Approval)
         ========================================================================= */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          {payrollPeriods.map((period: PayrollPeriodRecord) => (
            <Card key={period.id}>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{period.period_name} Payroll Sheet</CardTitle>
                      {period.status === 'locked' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-300">
                          <Lock className="h-3 w-3" /> Approved & Locked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          Draft Run
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Approved By: {period.approved_by_name || 'Pending approval'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {period.status !== 'locked' && (
                      <Button
                        size="sm"
                        onClick={() => handleLockPayroll(period.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                      >
                        <Lock className="h-3 w-3 mr-1" />
                        Approve & Lock Payroll
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4">Employee</th>
                        <th className="py-3 px-4">Base Salary</th>
                        <th className="py-3 px-4">Overtime (OT)</th>
                        <th className="py-3 px-4">Allowances</th>
                        <th className="py-3 px-4">Gross Salary</th>
                        <th className="py-3 px-4 text-red-600">Advance Deducted</th>
                        <th className="py-3 px-4 font-black text-emerald-700">Net Payable</th>
                        <th className="py-3 px-4 text-right">Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {period.items.map((item: PayrollItemRecord) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {item.employee_name}
                            <div className="text-[10px] text-slate-400 font-normal">{item.role}</div>
                          </td>

                          <td className="py-3.5 px-4 font-mono">৳ {formatBDT(item.base_salary)}</td>

                          <td className="py-3.5 px-4 font-mono">
                            +{item.overtime_hours}h (৳ {formatBDT(item.overtime_amount)})
                          </td>

                          <td className="py-3.5 px-4 font-mono">৳ {formatBDT(item.allowances)}</td>

                          <td className="py-3.5 px-4 font-mono font-bold">৳ {formatBDT(item.gross_salary)}</td>

                          {/* Partial Salary Advance Deduction (User's Exact Example: -৳ 10,000) */}
                          <td className="py-3.5 px-4 font-mono font-bold text-red-600 bg-red-50/30 dark:bg-red-950/20">
                            -৳ {formatBDT(item.advance_salary_deducted)}
                          </td>

                          {/* Net Remaining Salary (User's Exact Example: ৳ 23,440) */}
                          <td className="py-3.5 px-4 font-mono font-black text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20">
                            ৳ {formatBDT(item.net_salary)}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link
                              href={`/${slug}/hr/payroll/${period.id}`}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100"
                            >
                              Pay Slip
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 dark:bg-slate-900 font-mono font-bold text-xs">
                        <td className="py-3 px-4">Period Totals:</td>
                        <td colSpan={3} />
                        <td className="py-3 px-4 font-black text-slate-900 dark:text-white">
                          ৳ {formatBDT(period.total_gross_salary)}
                        </td>
                        <td className="py-3 px-4 text-red-600 font-black">
                          -৳ {formatBDT(period.total_advances_deducted)}
                        </td>
                        <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                          ৳ {formatBDT(period.total_net_salary)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Payroll Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
                  {period.items.map((item: PayrollItemRecord) => (
                    <div key={item.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <strong className="text-slate-900 dark:text-white font-bold text-sm">{item.employee_name}</strong>
                          <div className="text-[11px] text-slate-400">{item.role}</div>
                        </div>
                        <Link
                          href={`/${slug}/hr/payroll/${period.id}`}
                          className="inline-flex items-center px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                        >
                          Pay Slip
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2 bg-white dark:bg-slate-950 rounded border border-slate-200/60 dark:border-slate-800">
                        <div>Base: ৳ {formatBDT(item.base_salary)}</div>
                        <div>OT ({item.overtime_hours}h): +৳ {formatBDT(item.overtime_amount)}</div>
                        <div>Gross: ৳ {formatBDT(item.gross_salary)}</div>
                        <div className="text-red-600 font-bold">Advance: -৳ {formatBDT(item.advance_salary_deducted)}</div>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-500 font-semibold">Net Payable:</span>
                        <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                          ৳ {formatBDT(item.net_salary)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Mobile Period Summary */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 font-mono text-xs space-y-1">
                    <div className="font-bold text-purple-900 dark:text-purple-200">Period Total Net Payout:</div>
                    <div className="text-xl font-black text-purple-700 dark:text-purple-300">
                      ৳ {formatBDT(period.total_net_salary)}
                    </div>
                    <div className="text-[10px] text-purple-600">
                      (Gross: ৳ {formatBDT(period.total_gross_salary)} | Advances: -৳ {formatBDT(period.total_advances_deducted)})
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW 4: DAILY LABOR & WAGES (Attributed to Machine Jobs)
         ========================================================================= */}
      {activeTab === 'daily_labor' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-xs text-slate-500">
              Shift-based laborers assigned to specific wide-format printing and fabrication jobs.
            </span>
            <Button size="sm" onClick={() => setIsDailyShiftOpen(true)} className="text-xs w-full sm:w-auto">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Log Daily Worker Shift
            </Button>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base">Daily Labor Shift & Job Attribution ({dailyLaborLogs.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                    <tr>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Worker Name</th>
                      <th className="py-3 px-4">Assigned Job #</th>
                      <th className="py-3 px-4">Shift Contribution</th>
                      <th className="py-3 px-4 font-mono">Daily Rate</th>
                      <th className="py-3 px-4 text-right font-mono">Total Payout (৳)</th>
                      <th className="py-3 px-4">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {dailyLaborLogs.map((log: DailyLaborLogRecord) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3.5 px-4 font-mono text-slate-500">{log.work_date}</td>

                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                          {log.employee_name}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-blue-600 font-bold">
                          {log.assigned_job_number || 'General Floor'}
                        </td>

                        <td className="py-3.5 px-4 max-w-[240px] text-slate-700 dark:text-slate-300">
                          {log.production_contribution}
                        </td>

                        <td className="py-3.5 px-4 font-mono">৳ {formatBDT(log.daily_rate)}</td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-sm text-emerald-600">
                          ৳ {formatBDT(log.total_payout)}
                        </td>

                        <td className="py-3.5 px-4">
                          {log.payment_status === 'paid' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Cash Paid
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Unpaid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Daily Labor Cards */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-3 space-y-3">
                {dailyLaborLogs.map((log: DailyLaborLogRecord) => (
                  <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg space-y-2 text-xs">
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-slate-900 dark:text-white font-bold text-sm">{log.employee_name}</strong>
                        <div className="text-[11px] font-mono text-blue-600 font-bold">
                          {log.assigned_job_number || 'General Floor'}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{log.work_date}</span>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                      {log.production_contribution}
                    </p>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/60 dark:border-slate-800 font-mono">
                      <span className="text-[11px] text-slate-400">Rate: ৳ {formatBDT(log.daily_rate)}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-600 text-sm">৳ {formatBDT(log.total_payout)}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Cash Paid
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: DISBURSE SALARY ADVANCE */}
      <ModalDialog
        open={isAdvanceOpen}
        onOpenChange={setIsAdvanceOpen}
        title="Disburse Early Salary Advance (অগ্রিম বেতন)"
        description="Records early partial salary payment. The amount is automatically deducted on the month-end payroll run."
      >
        <form onSubmit={handleDisburseAdvance} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="advEmp" required>Select Employee</Label>
            <select
              id="advEmp"
              value={advEmpId}
              onChange={(e) => setAdvEmpId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              {employees.map((e: EmployeeRecord) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.role}) - Base: ৳ {formatBDT(e.base_salary)}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="advAmt" required>Advance Amount (৳ BDT)</Label>
              <Input
                id="advAmt"
                type="number"
                min="500"
                step="500"
                value={advAmount}
                onChange={(e) => setAdvAmount(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Disbursal Mode</Label>
              <div className="h-10 px-3 rounded-md border border-slate-200 bg-slate-100 dark:bg-slate-800 flex items-center text-xs font-mono font-bold">
                Cash Drawer Counter
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="advRsn" required>Advance Reason / Notes</Label>
            <Input
              id="advRsn"
              placeholder="e.g. Family medical emergency / festival shopping."
              value={advReason}
              onChange={(e) => setAdvReason(e.target.value)}
              required
            />
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-0.5">
            <span className="font-bold text-amber-900 dark:text-amber-200">Reconciliation Note:</span>
            <p className="text-slate-600 dark:text-slate-400">
              When the monthly payroll runs, this advance will offset the gross salary, and the employee will receive only the remaining net balance.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAdvanceOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Disburse Advance Voucher
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: ADD EMPLOYEE */}
      <ModalDialog
        open={isNewEmpOpen}
        onOpenChange={setIsNewEmpOpen}
        title="Add Staff or Daily Laborer to Roster"
        description="Configure employee classification, salary structure, and overtime rates."
      >
        <form onSubmit={handleCreateEmployee} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="enName" required>Full Name (English)</Label>
              <Input
                id="enName"
                placeholder="e.g. Nurul Amin"
                value={empName}
                onChange={(e) => setEmpName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bnName">বাংলা নাম (Bengali Name)</Label>
              <Input
                id="bnName"
                placeholder="e.g. নুরুল আমিন"
                value={empNameBn}
                onChange={(e) => setEmpNameBn(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emMob" required>Mobile Number</Label>
              <Input
                id="emMob"
                placeholder="e.g. +8801711223344"
                value={empMobile}
                onChange={(e) => setEmpMobile(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emTyp" required>Classification</Label>
              <select
                id="emTyp"
                value={empType}
                onChange={(e) => setEmpType(e.target.value as EmployeeType)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="permanent">Permanent Salaried Staff</option>
                <option value="contract">Contract Worker</option>
                <option value="daily_labor">Daily Labor (Shift-based)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emDept" required>Department</Label>
              <select
                id="emDept"
                value={empDept}
                onChange={(e) => setEmpDept(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
              >
                <option value="printing">Wide-Format Printing</option>
                <option value="finishing">Post-Print Finishing</option>
                <option value="fabrication">Workshop Fabrication</option>
                <option value="design">Pre-Press & Design</option>
                <option value="installation">Site Installation</option>
                <option value="accounts">Accounts & Admin</option>
                <option value="sales">Sales & Commercial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emRole" required>Job Role / Designation</Label>
              <Input
                id="emRole"
                value={empRole}
                onChange={(e) => setEmpRole(e.target.value)}
                required
              />
            </div>
          </div>

          {empType !== 'daily_labor' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emSal" required>Monthly Base Salary (৳ BDT)</Label>
                <Input
                  id="emSal"
                  type="number"
                  value={empSalary}
                  onChange={(e) => setEmpSalary(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emOt" required>Overtime Rate (৳ / Hour)</Label>
                <Input
                  id="emOt"
                  type="number"
                  value={empOtRate}
                  onChange={(e) => setEmpOtRate(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="emDr" required>Daily Shift Rate (৳ / Day)</Label>
                <Input
                  id="emDr"
                  type="number"
                  value={empDailyRate}
                  onChange={(e) => setEmpDailyRate(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emOt" required>Overtime Rate (৳ / Hour)</Label>
                <Input
                  id="emOt"
                  type="number"
                  value={empOtRate}
                  onChange={(e) => setEmpOtRate(Number(e.target.value))}
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewEmpOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Save Employee
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: LOG DAILY WORKER SHIFT */}
      <ModalDialog
        open={isDailyShiftOpen}
        onOpenChange={setIsDailyShiftOpen}
        title="Log Daily Laborer Shift & Job Attribution"
        description="Attribute daily wage payouts to specific machine production job orders."
      >
        <form onSubmit={handleLogDailyShift} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="shfEmp" required>Daily Worker</Label>
            <select
              id="shfEmp"
              value={shiftEmpId}
              onChange={(e) => setShiftEmpId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              {employees
                .filter((e: EmployeeRecord) => e.employee_type === 'daily_labor')
                .map((e: EmployeeRecord) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.role}) - Rate: ৳ {formatBDT(e.daily_rate)}/day
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="shfJob">Assigned Job #</Label>
              <Input
                id="shfJob"
                placeholder="e.g. PRD-2024-001"
                value={shiftJobNo}
                onChange={(e) => setShiftJobNo(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="shfOt">Overtime Hours</Label>
              <Input
                id="shfOt"
                type="number"
                value={shiftOtHours}
                onChange={(e) => setShiftOtHours(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shfCont" required>Production Contribution</Label>
            <textarea
              id="shfCont"
              rows={2}
              placeholder="e.g. Assisted Flora press operator; eyelet punching on 500 banner prints."
              value={shiftContribution}
              onChange={(e) => setShiftContribution(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsDailyShiftOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Record Shift & Cash Payout
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  </FeatureGate>
  )
}
