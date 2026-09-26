'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Payroll & Salary Processing Studio
// Designed for Bangladeshi Print & Signage Owners, Accounts & HR Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Wallet,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  DollarSign,
  CreditCard,
  FileText,
  Lock,
  Check,
  Send,
  Printer,
  ChevronRight,
  Sparkles,
  Search,
  Filter,
  Eye,
  Building,
  ShieldCheck,
  Receipt,
  Download,
  AlertCircle,
  UserCheck,
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
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  EmployeeRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  SalaryAdvanceRecord,
  PaymentMethod,
} from '@/types/workforce.types'
import {
  getEmployeesAction,
  getPayrollPeriodsAction,
  getPayrollPeriodDetailAction,
  generatePayrollDraftAction,
  approvePayrollAction,
  lockPayrollAction,
  recordSalaryPaymentAction,
  getSalaryAdvancesAction,
  disburseSalaryAdvanceAction,
} from '@/actions/workforce.actions'

function PayrollContent() {
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
  const [activeTab, setActiveTab] = useState<'periods' | 'advances'>('periods')

  // Data States
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([])
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PARTIAL' | 'UNPAID'>('ALL')

  // Modals
  const [isGenPayrollModalOpen, setIsGenPayrollModalOpen] = useState(false)
  const [isSalaryPaymentModalOpen, setIsSalaryPaymentModalOpen] = useState(false)
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
  const [selectedPayrollItem, setSelectedPayrollItem] = useState<{ periodId: string; item: PayrollItemRecord } | null>(null)

  // Generate Payroll Form
  const [genForm, setGenForm] = useState<{
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

  // Disburse Salary Payment Form
  const [paymentForm, setPaymentForm] = useState<{
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber: string
    notes: string
  }>({
    amount: 0,
    paymentMethod: 'bkash',
    referenceNumber: '',
    notes: 'Monthly salary disbursement',
  })

  // Disburse Advance Form
  const [advForm, setAdvForm] = useState<{
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    reason: string
  }>({
    employeeId: '',
    amount: 5000,
    paymentMethod: 'cash',
    reason: 'Personal / Medical emergency',
  })

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [empRes, payRes, advRes] = await Promise.all([
        getEmployeesAction({ status: 'active' }),
        getPayrollPeriodsAction(),
        getSalaryAdvancesAction(),
      ])

      if (empRes.success && empRes.data) {
        const empList = empRes.data
        setEmployees(empList)
        if (empList.length > 0 && !advForm.employeeId) {
          setAdvForm((prev) => ({ ...prev, employeeId: empList[0].id }))
        }
      }
      if (payRes.success && payRes.data && payRes.data.length > 0) {
        const periodList = payRes.data
        setPayrollPeriods(periodList)
        setSelectedPeriod((prev) => {
          if (!prev) return periodList[0]
          const found = periodList.find((p) => p.id === prev.id)
          return found || periodList[0]
        })
      }
      if (advRes.success && advRes.data) setAdvances(advRes.data)
    } catch (err: any) {
      console.error('Failed to load payroll data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  // Realtime Broadcast & Synced Event Listeners
  useEffect(() => {
    const handleSync = () => {
      loadData()
    }

    window.addEventListener('printerp_table_synced:payroll_periods', handleSync)
    window.addEventListener('printerp_table_synced:salary_advances', handleSync)
    window.addEventListener('printerp_table_synced:employees', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:payroll_periods', handleSync)
      window.removeEventListener('printerp_table_synced:salary_advances', handleSync)
      window.removeEventListener('printerp_table_synced:employees', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
  }, [])

  const handleSelectPeriod = async (periodId: string) => {
    const p = payrollPeriods.find((x) => x.id === periodId)
    if (p) setSelectedPeriod(p)
  }

  const handleGeneratePayroll = async () => {
    if (!genForm.periodName.trim()) {
      notify('Please enter payroll period name.')
      return
    }

    startTransition(async () => {
      const res = await generatePayrollDraftAction({
        periodName: genForm.periodName,
        startDate: genForm.startDate,
        endDate: genForm.endDate,
        workingDaysCount: Number(genForm.workingDaysCount || 26),
      })

      if (res.success && res.data) {
        notify('Monthly payroll draft generated successfully!')
        setIsGenPayrollModalOpen(false)
        setSelectedPeriod(res.data)
        loadData()
      } else {
        notify(res.error || 'Failed to generate payroll sheet.')
      }
    })
  }

  const handleApprovePeriod = async (periodId: string) => {
    startTransition(async () => {
      const res = await approvePayrollAction(periodId)
      if (res.success && res.data) {
        notify('Payroll period approved successfully!')
        setSelectedPeriod(res.data)
        loadData()
      } else {
        notify(res.error || 'Failed to approve payroll.')
      }
    })
  }

  const handleLockPeriod = async (periodId: string) => {
    startTransition(async () => {
      const res = await lockPayrollAction(periodId)
      if (res.success && res.data) {
        notify('Payroll period locked against further edits.')
        setSelectedPeriod(res.data)
        loadData()
      } else {
        notify(res.error || 'Failed to lock payroll.')
      }
    })
  }

  const handleOpenPaymentModal = (item: PayrollItemRecord) => {
    if (!selectedPeriod) return
    const remainingDue = Number(item.due_amount || item.net_salary || 0)
    setSelectedPayrollItem({ periodId: selectedPeriod.id, item })
    setPaymentForm({
      amount: remainingDue > 0 ? remainingDue : Number(item.net_salary || 0),
      paymentMethod: 'bkash',
      referenceNumber: `TXN-${Date.now().toString().slice(-6)}`,
      notes: `Salary payment for ${item.employee_name}`,
    })
    setIsSalaryPaymentModalOpen(true)
  }

  const handleRecordSalaryPayment = async () => {
    if (!selectedPayrollItem || !selectedPeriod) return
    if (paymentForm.amount <= 0) {
      notify('Please enter a valid payment amount.')
      return
    }

    startTransition(async () => {
      const res = await recordSalaryPaymentAction({
        payrollPeriodId: selectedPayrollItem.periodId,
        payrollItemId: selectedPayrollItem.item.id,
        employeeId: selectedPayrollItem.item.employee_id,
        amount: Number(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        referenceNumber: paymentForm.referenceNumber,
        notes: paymentForm.notes,
      })

      if (res.success) {
        notify('Salary payment recorded and ledger updated!')
        setIsSalaryPaymentModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to record salary payment.')
      }
    })
  }

  const handleDisburseAdvance = async () => {
    if (!advForm.employeeId) {
      notify('Please select an employee.')
      return
    }
    if (advForm.amount <= 0) {
      notify('Please enter a valid advance amount.')
      return
    }

    startTransition(async () => {
      const res = await disburseSalaryAdvanceAction({
        employeeId: advForm.employeeId,
        amount: Number(advForm.amount),
        paymentMethod: advForm.paymentMethod,
        reason: advForm.reason,
      })

      if (res.success) {
        notify('Salary advance disbursed and balance updated!')
        setIsAdvanceModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to disburse advance.')
      }
    })
  }

  // Summary Metrics
  const currentPeriod = selectedPeriod || payrollPeriods[0]
  const totalGross = Number(currentPeriod?.total_gross_salary || 0)
  const totalNet = Number(currentPeriod?.total_net_salary || 0)
  const totalPaid = Number(currentPeriod?.total_paid_amount || 0)
  const totalDue = Number(currentPeriod?.total_due_amount || (totalNet - totalPaid))
  const totalAdvanceOutstanding = employees.reduce((sum, e) => sum + Number(e.current_advance_balance || 0), 0)

  // Filtered Payroll Items
  const filteredPayrollItems = React.useMemo(() => {
    if (!selectedPeriod?.items) return []
    return selectedPeriod.items.filter((item) => {
      const isFullyPaid = Number(item.due_amount || 0) <= 0 && Number(item.paid_amount || 0) > 0
      const isPartial = Number(item.paid_amount || 0) > 0 && Number(item.due_amount || 0) > 0
      const isUnpaid = Number(item.paid_amount || 0) === 0

      const matchesSearch =
        !searchTerm.trim() ||
        item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Boolean(item.employee_id_number && item.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase()))

      let matchesStatus = true
      if (statusFilter === 'PAID') matchesStatus = isFullyPaid
      else if (statusFilter === 'PARTIAL') matchesStatus = isPartial
      else if (statusFilter === 'UNPAID') matchesStatus = isUnpaid

      return matchesSearch && matchesStatus
    })
  }, [selectedPeriod, searchTerm, statusFilter])

  // Count tallies for status filters
  const paidCount = selectedPeriod?.items?.filter((i) => Number(i.due_amount || 0) <= 0 && Number(i.paid_amount || 0) > 0).length || 0
  const partialCount = selectedPeriod?.items?.filter((i) => Number(i.paid_amount || 0) > 0 && Number(i.due_amount || 0) > 0).length || 0
  const unpaidCount = selectedPeriod?.items?.filter((i) => Number(i.paid_amount || 0) === 0).length || 0

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
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Payroll & Salary Management"
        titleBn="পেরোল ও বেতন ব্যবস্থাপনা"
        descriptionEn="Automated monthly salary sheets, advance deductions & MFS disbursements"
        descriptionBn="স্বয়ংক্রিয় মাসিক বেতন শিট, অগ্রিম কর্তন ও ব্যাংক/বিকাশ বেতন প্রদান"
        icon={Wallet}
        iconColor="text-blue-600 dark:text-blue-400"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
            {currentPeriod?.period_name || tBilingual('Monthly Cycle', 'মাসিক বেতন')}
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
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                {tBilingual('Staff Directory', 'কর্মী তালিকা')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 hidden sm:inline-flex"
            >
              <Link href={getTenantNavHref('/hr/attendance', pathname, tenantSlug)}>
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {tBilingual('Attendance Hub', 'হাজিরা')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
            >
              <Link href={getTenantNavHref('/hr/salary-report', pathname, tenantSlug)}>
                <Printer className="w-3.5 h-3.5" />
                {tBilingual('Salary Report', 'বেতন রিপোর্ট')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAdvanceModalOpen(true)}
              className="gap-1.5 text-xs h-9 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <DollarSign className="w-3.5 h-3.5" />
              {tBilingual('Disburse Advance', 'অগ্রিম বেতন')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsGenPayrollModalOpen(true)}
              className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs bangla-text"
            >
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Generate Payroll Draft', 'নতুন বেতন শিট তৈরি')}
            </Button>
          </div>
        }
      />

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-slate-500 uppercase font-semibold">
              {tBilingual('Gross Payroll', 'মোট বেতন প্রাক্কলন')}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {formatBDT(totalGross)}
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
            Period: {currentPeriod?.period_name || 'No Active Sheet'}
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-slate-500 uppercase font-semibold">
              {tBilingual('Net Payable', 'প্রদেয় নিট বেতন')}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
            {formatBDT(totalNet)}
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
            After Overtime & Advance Deductions
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-slate-500 uppercase font-semibold">
              {tBilingual('Paid Disbursed', 'পরিশোধিত বেতন')}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatBDT(totalPaid)}
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
            Remaining Due: <strong className="text-rose-600 dark:text-rose-400">{formatBDT(totalDue)}</strong>
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-2xs text-slate-500 uppercase font-semibold">
              {tBilingual('Advances Outstanding', 'বকেয়া অগ্রিম স্থিতি')}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {formatBDT(totalAdvanceOutstanding)}
          </div>
          <p className="text-2xs text-slate-500 dark:text-slate-400 mt-1">
            Active staff advance balances
          </p>
        </Card>
      </div>

      {/* Navigation Tabs Bar */}
      <Card className="p-3 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'periods'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{tBilingual('Monthly Payroll Sheets', 'মাসিক বেতন শিট')}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advances')}
            className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'advances'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{tBilingual('Salary Advances Ledger', 'বেতন অগ্রিম লেজার')}</span>
            {advances.filter((a) => !a.is_settled).length > 0 && (
              <span className={`text-2xs px-1.5 py-0.2 rounded-full ${
                activeTab === 'advances'
                  ? 'bg-amber-400 text-slate-900 font-bold'
                  : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold'
              }`}>
                {advances.filter((a) => !a.is_settled).length}
              </span>
            )}
          </button>
        </div>
      </Card>

      {/* Tab 1: Monthly Payroll Sheets Studio */}
      {activeTab === 'periods' && (
        <div className="space-y-4">
          {/* Period Selector & Sheet Status Banner */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <select
                    aria-label="Select Payroll Period"
                    value={selectedPeriod?.id || ''}
                    onChange={(e) => handleSelectPeriod(e.target.value)}
                    className="font-bold text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white focus:outline-none"
                  >
                    {payrollPeriods.map((p) => (
                      <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                        {p.period_name} ({formatDate(p.start_date)} - {formatDate(p.end_date)}) [{p.status.toUpperCase()}]
                      </option>
                    ))}
                  </select>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedPeriod?.items?.length || 0} {tBilingual('Employees Enrolled', 'জন কর্মী')} • {selectedPeriod?.working_days_count || 26} Working Days
                  </div>
                </div>
              </div>

              {selectedPeriod && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs px-2.5 py-1 capitalize font-semibold ${
                      selectedPeriod.status === 'locked'
                        ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        : selectedPeriod.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {selectedPeriod.status}
                  </Badge>

                  {selectedPeriod.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprovePeriod(selectedPeriod.id)}
                      disabled={isPending}
                      className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                    >
                      <Check className="w-3 h-3" />
                      {tBilingual('Approve Sheet', 'শিট অনুমোদন')}
                    </Button>
                  )}

                  {selectedPeriod.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLockPeriod(selectedPeriod.id)}
                      disabled={isPending}
                      className="h-8 text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 gap-1 font-semibold"
                    >
                      <Lock className="w-3 h-3" />
                      {tBilingual('Lock Period', 'লক করুন')}
                    </Button>
                  )}

                  <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1 border-slate-200 dark:border-slate-800">
                    <Link href={getTenantNavHref('/hr/salary-report', pathname, tenantSlug)}>
                      <Printer className="w-3 h-3" />
                      {tBilingual('Print Sheet', 'প্রিন্ট শিট')}
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Search & Status Filter Bar */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setStatusFilter('ALL')}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tBilingual('All Staff', 'সকল কর্মী')}</span>
                  <span className="text-2xs opacity-75 font-mono">({selectedPeriod?.items?.length || 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('PAID')}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'PAID'
                      ? 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                  }`}
                >
                  <span>{tBilingual('Fully Paid', 'সম্পূর্ণ পরিশোধিত')}</span>
                  <span className="text-2xs opacity-75 font-mono">({paidCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('PARTIAL')}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'PARTIAL'
                      ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                  }`}
                >
                  <span>{tBilingual('Partially Paid', 'আংশিক পরিশোধিত')}</span>
                  <span className="text-2xs opacity-75 font-mono">({partialCount})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('UNPAID')}
                  className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    statusFilter === 'UNPAID'
                      ? 'bg-rose-600 text-white dark:bg-rose-500 dark:text-white'
                      : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50'
                  }`}
                >
                  <span>{tBilingual('Unpaid Due', 'বকেয়া')}</span>
                  <span className="text-2xs opacity-75 font-mono">({unpaidCount})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={tBilingual('Search employee in sheet...', 'বেতন শিটে খুঁজুন...')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs h-8 font-medium border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>
          </Card>

          {/* Line Items Table */}
          {!selectedPeriod || !selectedPeriod.items || selectedPeriod.items.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('No Payroll Items in this Period', 'এই মেয়াদে কোন বেতন তথ্য নেই')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {tBilingual('Generate a new payroll draft to calculate salary for all active employees.', 'সকল সক্রিয় কর্মীর বেতন হিসাব করতে নতুন ড্রাফট তৈরি করুন।')}
              </p>
              <Button size="sm" onClick={() => setIsGenPayrollModalOpen(true)} className="mt-4 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                <Plus className="w-3.5 h-3.5" />
                {tBilingual('Generate Payroll Draft', 'নতুন বেতন শিট তৈরি')}
              </Button>
            </Card>
          ) : (
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {tBilingual('Payroll Period Line Items', 'বেতন শিটের আইটেম তালিকা')}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    {filteredPayrollItems.length} records
                  </Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-2xs uppercase tracking-wider">
                      <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                      <th className="p-3.5">{tBilingual('Base / Rate', 'মূল বেতন')}</th>
                      <th className="p-3.5">{tBilingual('Attendance / Abs', 'উপস্থিতি / অনুপস্থিত')}</th>
                      <th className="p-3.5">{tBilingual('Overtime Paid', 'ওভারটাইম')}</th>
                      <th className="p-3.5">{tBilingual('Advance Ded.', 'অগ্রিম কর্তন')}</th>
                      <th className="p-3.5">{tBilingual('Net Salary', 'নিট বেতন')}</th>
                      <th className="p-3.5">{tBilingual('Paid / Due', 'পরিশোধ / বকেয়া')}</th>
                      <th className="p-3.5">{tBilingual('Payment Status', 'পেমেন্ট স্ট্যাটাস')}</th>
                      <th className="p-3.5 pr-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {filteredPayrollItems.map((item) => {
                      const isFullyPaid = Number(item.due_amount || 0) <= 0 && Number(item.paid_amount || 0) > 0
                      const isPartial = Number(item.paid_amount || 0) > 0 && Number(item.due_amount || 0) > 0
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="font-semibold text-slate-900 dark:text-white">{item.employee_name}</div>
                            <div className="text-2xs text-slate-500 dark:text-slate-400">
                              {item.employee_id_number} • <span className="capitalize">{item.department}</span>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                            {formatBDT(item.base_salary || 0)}
                          </td>

                          <td className="p-3.5 text-slate-600 dark:text-slate-400">
                            <div>{item.days_present} / {selectedPeriod.working_days_count || 26} d</div>
                            {Number(item.absence_deduction || 0) > 0 && (
                              <div className="text-rose-600 dark:text-rose-400 text-2xs font-medium">
                                -{formatBDT(item.absence_deduction || 0)}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 font-mono">
                            {Number(item.overtime_amount || 0) > 0 ? (
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                +{formatBDT(item.overtime_amount || 0)} ({item.overtime_hours}h)
                              </span>
                            ) : (
                              <span className="text-slate-400">৳ 0</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono text-amber-600 dark:text-amber-400 font-medium">
                            {Number(item.advance_salary_deducted || 0) > 0 ? (
                              <span>-{formatBDT(item.advance_salary_deducted || 0)}</span>
                            ) : (
                              <span className="text-slate-400">৳ 0</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono font-bold text-slate-900 dark:text-white">
                            {formatBDT(item.net_salary || 0)}
                          </td>

                          <td className="p-3.5 font-mono text-xs">
                            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Paid: {formatBDT(item.paid_amount || 0)}
                            </div>
                            <div className="text-rose-600 dark:text-rose-400 text-2xs">
                              Due: {formatBDT(item.due_amount || 0)}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <Badge
                              variant="outline"
                              className={`text-2xs px-2 py-0.5 capitalize ${
                                isFullyPaid
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : isPartial
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              }`}
                            >
                              {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Unpaid'}
                            </Badge>
                          </td>

                          <td className="p-3.5 pr-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isFullyPaid && (
                                <Button
                                  size="sm"
                                  onClick={() => handleOpenPaymentModal(item)}
                                  className="h-7 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 shadow-xs"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  {tBilingual('Disburse Pay', 'বেতন প্রদান')}
                                </Button>
                              )}
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2 border-slate-200 dark:border-slate-800">
                                <Link href={getTenantNavHref(`/hr/payroll/${selectedPeriod.id}`, pathname, tenantSlug)}>
                                  <FileText className="w-3 h-3" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Salary Advances Ledger */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Salary Advances & Emergency Loans', 'বেতন অগ্রিম ও জরুরি ঋণ হিসাব')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Track disbursed salary advances, repayments and automated monthly payroll deductions', 'অগ্রিম প্রদান, কর্তন ও চলমান বকেয়ার বিস্তারিত হিসাব')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsAdvanceModalOpen(true)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Disburse Advance', 'অগ্রিম প্রদান')}
            </Button>
          </div>

          {advances.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tBilingual('No salary advance records', 'কোন অগ্রিমের তথ্য নেই')}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tBilingual('Disburse salary advances when staff request emergency assistance.', 'জরুরি প্রয়োজনে কর্মীদের অগ্রিম বেতন প্রদান করুন।')}</p>
            </Card>
          ) : (
            <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
              <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {tBilingual('Advances & Emergency Disbursements', 'অগ্রিম প্রদান ও সমন্বয় তালিকা')}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs font-mono">
                    {advances.length} records
                  </Badge>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-2xs uppercase tracking-wider">
                      <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                      <th className="p-3.5">{tBilingual('Disbursement Date', 'প্রদানের তারিখ')}</th>
                      <th className="p-3.5">{tBilingual('Amount (BDT)', 'টাকার পরিমাণ')}</th>
                      <th className="p-3.5">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</th>
                      <th className="p-3.5">{tBilingual('Reason / Purpose', 'উদ্দেশ্য')}</th>
                      <th className="p-3.5 pr-4 text-right">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-slate-900 dark:text-white">
                          {adv.employee_name}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400">
                          {formatDate(adv.disbursed_date)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatBDT(adv.amount || 0)}
                        </td>
                        <td className="p-3.5 capitalize font-mono text-slate-600 dark:text-slate-300">
                          {adv.payment_method}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 italic">
                          &ldquo;{adv.reason || 'Personal advance'}&rdquo;
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <Badge
                            variant="outline"
                            className={`text-2xs px-2 py-0.5 capitalize ${
                              adv.is_settled
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                            }`}
                          >
                            {adv.is_settled ? 'Settled' : 'Active (Unsettled)'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Generate Payroll Draft Modal */}
      {isGenPayrollModalOpen && (
        <ModalDialog
          open={isGenPayrollModalOpen}
          onOpenChange={(open) => setIsGenPayrollModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Generate Monthly Payroll Draft', 'নতুন মাসিক বেতন শিট তৈরি')}
          description={tBilingual(
            'Automatically calculates salaries, attendance days, overtime hours & advance deductions',
            'সকল কর্মীর উপস্থিতি, ওভারটাইম ও অগ্রিম কর্তন স্বয়ংক্রিয়ভাবে হিসাব করে শিট তৈরি হবে'
          )}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Period Name *', 'বেতন মেয়াদের নাম *')}</Label>
              <Input
                placeholder="e.g. October 2026 Payroll"
                value={genForm.periodName}
                onChange={(e) => setGenForm({ ...genForm, periodName: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Start Date', 'শুরু তারিখ')}</Label>
                <Input
                  type="date"
                  value={genForm.startDate}
                  onChange={(e) => setGenForm({ ...genForm, startDate: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('End Date', 'শেষ তারিখ')}</Label>
                <Input
                  type="date"
                  value={genForm.endDate}
                  onChange={(e) => setGenForm({ ...genForm, endDate: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Standard Working Days', 'কাজের দিন সংখ্যা')}</Label>
              <Input
                type="number"
                value={genForm.workingDaysCount}
                onChange={(e) => setGenForm({ ...genForm, workingDaysCount: Number(e.target.value || 26) })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGenPayrollModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePayroll}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Generate Sheet', 'তৈরি করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Disburse Salary Payment Modal */}
      {isSalaryPaymentModalOpen && selectedPayrollItem && (
        <ModalDialog
          open={isSalaryPaymentModalOpen}
          onOpenChange={(open) => setIsSalaryPaymentModalOpen(open)}
          hideFooter={true}
          title={`Disburse Salary: ${selectedPayrollItem.item.employee_name}`}
          description={`Net Payable: ${formatBDT(selectedPayrollItem.item.net_salary || 0)} • Outstanding Due: ${formatBDT(selectedPayrollItem.item.due_amount || 0)}`}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Disbursement Amount (BDT) *', 'প্রদেয় অর্থ (৳) *')}</Label>
              <Input
                type="number"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                className="text-xs h-9 font-bold border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</Label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="bkash">bKash (বিকাশ)</option>
                <option value="nagad">Nagad (নগদ)</option>
                <option value="rocket">Rocket (রকেট)</option>
                <option value="bank">Bank Transfer (ব্যাংক ট্রান্সফার)</option>
                <option value="cash">Cash (নগদ)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Transaction / Voucher Reference', 'ভাউচার / ট্রানজেকশন নম্বর')}</Label>
              <Input
                placeholder="e.g. BKASH-8975421"
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Notes', 'মন্তব্য')}</Label>
              <Input
                placeholder="e.g. October monthly salary full disbursement"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSalaryPaymentModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleRecordSalaryPayment}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Confirm Payout', 'পেমেন্ট সম্পন্ন করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Disburse Advance Modal */}
      {isAdvanceModalOpen && (
        <ModalDialog
          open={isAdvanceModalOpen}
          onOpenChange={(open) => setIsAdvanceModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Disburse Salary Advance', 'অগ্রিম বেতন প্রদান')}
          description={tBilingual(
            'Records salary advance payment and links to automated month-end payroll recovery',
            'অগ্রিম প্রদান করুন যা স্বয়ংক্রিয়ভাবে পরবর্তী মাসের বেতন থেকে কর্তন হবে'
          )}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Select Employee *', 'কর্মী নির্বাচন *')}</Label>
              <select
                value={advForm.employeeId}
                onChange={(e) => setAdvForm({ ...advForm, employeeId: e.target.value })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="">{tBilingual('-- Select Employee --', '-- কর্মী নির্বাচন করুন --')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) - Current Bal: {formatBDT(emp.current_advance_balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Advance Amount (BDT) *', 'টাকার পরিমাণ (৳) *')}</Label>
              <Input
                type="number"
                value={advForm.amount}
                onChange={(e) => setAdvForm({ ...advForm, amount: Number(e.target.value) })}
                className="text-xs h-9 font-bold border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</Label>
              <select
                value={advForm.paymentMethod}
                onChange={(e) => setAdvForm({ ...advForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value="cash">Cash (নগদ)</option>
                <option value="bkash">bKash (বিকাশ)</option>
                <option value="nagad">Nagad (নগদ)</option>
                <option value="bank">Bank Transfer (ব্যাংক)</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Reason / Emergency Description', 'কারণ')}</Label>
              <Input
                placeholder="e.g. Medical emergency advance"
                value={advForm.reason}
                onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdvanceModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleDisburseAdvance}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Disburse Advance', 'অগ্রিম প্রদান')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}

export default function PayrollPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Wallet className="h-6 w-6 text-indigo-500 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Payroll Processing...</p>
        </div>
      }
    >
      <PayrollContent />
    </React.Suspense>
  )
}

