'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Payroll & Salary Processing Studio
// Designed for Bangladeshi Print & Signage Owners, Accounts & HR Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
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

export default function PayrollPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

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

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (payRes.success && payRes.data) {
        setPayrollPeriods(payRes.data)
        if (payRes.data.length > 0 && !selectedPeriod) {
          setSelectedPeriod(payRes.data[0])
        }
      }
      if (advRes.success && advRes.data) setAdvances(advRes.data)
    } catch (err: any) {
      console.error('Failed to load payroll data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 rounded-xl text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/20">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {tBilingual('Payroll and Salery', 'পেরোল ও বেতন ব্যবস্থাপনা')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tBilingual(
                  'Automated monthly salary sheets, advance deductions & MFS disbursements',
                  'স্বয়ংক্রিয় মাসিক বেতন শিট, অগ্রিম কর্তন ও ব্যাংক/বিকাশ বেতন প্রদান'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdvanceModalOpen(true)}
            className="gap-1.5 text-xs h-9 bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20"
          >
            <DollarSign className="w-3.5 h-3.5" />
            {tBilingual('Disburse Advance', 'অগ্রিম বেতন')}
          </Button>

          <Button
            size="sm"
            onClick={() => setIsGenPayrollModalOpen(true)}
            className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Generate Payroll Draft', 'নতুন বেতন শিট তৈরি')}
          </Button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Gross Payroll', 'মোট বেতন প্রাক্কলন')}
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-foreground">{formatBDT(totalGross)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Period: {currentPeriod?.period_name || 'No Active Sheet'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Net Payable', 'প্রদেয় নিট বেতন')}
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{formatBDT(totalNet)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              After Overtime & Advance Deductions
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Paid Disbursed', 'পরিশোধিত বেতন')}
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatBDT(totalPaid)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Remaining Due: <strong className="text-rose-600 dark:text-rose-400">{formatBDT(totalDue)}</strong>
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Advances Outstanding', 'বকেয়া অগ্রিম স্থিতি')}
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatBDT(totalAdvanceOutstanding)}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Active staff advance balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border pb-3">
        <Button
          size="sm"
          variant={activeTab === 'periods' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('periods')}
          className="text-xs h-8 gap-1.5"
        >
          <Receipt className="w-3.5 h-3.5" />
          {tBilingual('Monthly Payroll Sheets', 'মাসিক বেতন শিট')}
        </Button>

        <Button
          size="sm"
          variant={activeTab === 'advances' ? 'secondary' : 'ghost'}
          onClick={() => setActiveTab('advances')}
          className="text-xs h-8 gap-1.5"
        >
          <DollarSign className="w-3.5 h-3.5" />
          {tBilingual('Salary Advances Ledger', 'বেতন অগ্রিম লেজার')}
        </Button>
      </div>

      {/* Tab 1: Monthly Payroll Sheets Studio */}
      {activeTab === 'periods' && (
        <div className="space-y-6">
          {/* Period Selector & Sheet Overview */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 border border-border/60 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <select
                  aria-label="Select Payroll Period"
                  value={selectedPeriod?.id || ''}
                  onChange={(e) => handleSelectPeriod(e.target.value)}
                  className="font-bold text-sm bg-transparent border-b border-border pb-0.5 focus:outline-none text-foreground"
                >
                  {payrollPeriods.map((p) => (
                    <option key={p.id} value={p.id} className="bg-background text-foreground">
                      {p.period_name} ({formatDate(p.start_date)} - {formatDate(p.end_date)}) [{p.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
                <div className="text-xs text-muted-foreground mt-0.5">
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
                      ? 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
                      : selectedPeriod.status === 'approved'
                      ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                  }`}
                >
                  {selectedPeriod.status}
                </Badge>

                {selectedPeriod.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => handleApprovePeriod(selectedPeriod.id)}
                    disabled={isPending}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
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
                    className="h-8 text-xs text-zinc-600 border-zinc-400 gap-1"
                  >
                    <Lock className="w-3 h-3" />
                    {tBilingual('Lock Period', 'লক করুন')}
                  </Button>
                )}

                <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1">
                  <Link href={`/${tenantSlug}/hr/salary-report`}>
                    <Printer className="w-3 h-3" />
                    {tBilingual('Print Sheet', 'প্রিন্ট শিট')}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {/* Line Items Table */}
          {!selectedPeriod || !selectedPeriod.items || selectedPeriod.items.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Receipt className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-base font-bold text-foreground">
                {tBilingual('No Payroll Items in this Period', 'এই মেয়াদে কোন বেতন তথ্য নেই')}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {tBilingual('Generate a new payroll draft to calculate salary for all active employees.', 'সকল সক্রিয় কর্মীর বেতন হিসাব করতে নতুন ড্রাফট তৈরি করুন।')}
              </p>
              <Button size="sm" onClick={() => setIsGenPayrollModalOpen(true)} className="mt-4 text-xs gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                {tBilingual('Generate Payroll Draft', 'নতুন বেতন শিট তৈরি')}
              </Button>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
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
                  <tbody className="divide-y divide-border/40">
                    {selectedPeriod.items.map((item) => {
                      const isFullyPaid = Number(item.due_amount || 0) <= 0 && Number(item.paid_amount || 0) > 0
                      const isPartial = Number(item.paid_amount || 0) > 0 && Number(item.due_amount || 0) > 0
                      return (
                        <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3.5 pl-4">
                            <div className="font-semibold text-foreground">{item.employee_name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {item.employee_id_number} • <span className="capitalize">{item.department}</span>
                            </div>
                          </td>

                          <td className="p-3.5 font-mono">
                            {formatBDT(item.base_salary || 0)}
                          </td>

                          <td className="p-3.5">
                            <div>{item.present_days_count} / {selectedPeriod.working_days_count || 26} d</div>
                            {Number(item.absent_deduction || 0) > 0 && (
                              <div className="text-rose-600 dark:text-rose-400 text-[10px]">
                                -{formatBDT(item.absent_deduction || 0)}
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 font-mono">
                            {Number(item.overtime_amount || 0) > 0 ? (
                              <span className="text-purple-600 dark:text-purple-400 font-medium">
                                +{formatBDT(item.overtime_amount || 0)} ({item.overtime_hours}h)
                              </span>
                            ) : (
                              <span className="text-muted-foreground">৳ 0</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono text-amber-600 dark:text-amber-400">
                            {Number(item.advance_deduction || 0) > 0 ? (
                              <span>-{formatBDT(item.advance_deduction || 0)}</span>
                            ) : (
                              <span className="text-muted-foreground">৳ 0</span>
                            )}
                          </td>

                          <td className="p-3.5 font-mono font-bold text-foreground">
                            {formatBDT(item.net_salary || 0)}
                          </td>

                          <td className="p-3.5 font-mono text-xs">
                            <div className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              Paid: {formatBDT(item.paid_amount || 0)}
                            </div>
                            <div className="text-rose-600 dark:text-rose-400 text-[11px]">
                              Due: {formatBDT(item.due_amount || 0)}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 capitalize ${
                                isFullyPaid
                                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                  : isPartial
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
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
                                  className="h-7 text-xs px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                                >
                                  <CreditCard className="w-3 h-3" />
                                  {tBilingual('Disburse Pay', 'বেতন প্রদান')}
                                </Button>
                              )}
                              <Button asChild size="sm" variant="outline" className="h-7 text-xs px-2">
                                <Link href={`/${tenantSlug}/hr/payroll/${selectedPeriod.id}`}>
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
              <h3 className="text-base font-bold text-foreground">
                {tBilingual('Salary Advances & Emergency Loans', 'বেতন অগ্রিম ও জরুরি ঋণ হিসাব')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Track disbursed salary advances, repayments and automated monthly payroll deductions', 'অগ্রিম প্রদান, কর্তন ও চলমান বকেয়ার বিস্তারিত হিসাব')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsAdvanceModalOpen(true)} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Disburse Advance', 'অগ্রিম প্রদান')}
            </Button>
          </div>

          {advances.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <DollarSign className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-base font-bold text-foreground">{tBilingual('No salary advance records', 'কোন অগ্রিমের তথ্য নেই')}</h4>
              <p className="text-xs text-muted-foreground mt-1">{tBilingual('Disburse salary advances when staff request emergency assistance.', 'জরুরি প্রয়োজনে কর্মীদের অগ্রিম বেতন প্রদান করুন।')}</p>
            </Card>
          ) : (
            <Card className="border-border/60 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                      <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                      <th className="p-3.5">{tBilingual('Disbursement Date', 'প্রদানের তারিখ')}</th>
                      <th className="p-3.5">{tBilingual('Amount (BDT)', 'টাকার পরিমাণ')}</th>
                      <th className="p-3.5">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</th>
                      <th className="p-3.5">{tBilingual('Reason / Purpose', 'উদ্দেশ্য')}</th>
                      <th className="p-3.5 pr-4 text-right">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {advances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3.5 pl-4 font-semibold text-foreground">
                          {adv.employee_name}
                        </td>
                        <td className="p-3.5 text-muted-foreground">
                          {formatDate(adv.disbursement_date)}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatBDT(adv.amount || 0)}
                        </td>
                        <td className="p-3.5 capitalize font-mono text-muted-foreground">
                          {adv.payment_method}
                        </td>
                        <td className="p-3.5 text-muted-foreground italic">
                          "{adv.reason || 'Personal advance'}"
                        </td>
                        <td className="p-3.5 pr-4 text-right">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 capitalize ${
                              adv.is_settled
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/30'
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
          isOpen={isGenPayrollModalOpen}
          onClose={() => setIsGenPayrollModalOpen(false)}
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
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Start Date', 'শুরু তারিখ')}</Label>
                <Input
                  type="date"
                  value={genForm.startDate}
                  onChange={(e) => setGenForm({ ...genForm, startDate: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('End Date', 'শেষ তারিখ')}</Label>
                <Input
                  type="date"
                  value={genForm.endDate}
                  onChange={(e) => setGenForm({ ...genForm, endDate: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Standard Working Days', 'কাজের দিন সংখ্যা')}</Label>
              <Input
                type="number"
                value={genForm.workingDaysCount}
                onChange={(e) => setGenForm({ ...genForm, workingDaysCount: Number(e.target.value || 26) })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGenPayrollModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleGeneratePayroll}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
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
          isOpen={isSalaryPaymentModalOpen}
          onClose={() => setIsSalaryPaymentModalOpen(false)}
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
                className="text-xs h-9 font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</Label>
              <select
                value={paymentForm.paymentMethod}
                onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
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
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Notes', 'মন্তব্য')}</Label>
              <Input
                placeholder="e.g. October monthly salary full disbursement"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSalaryPaymentModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleRecordSalaryPayment}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
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
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
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
                className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
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
                className="text-xs h-9 font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Payment Method', 'পেমেন্ট মাধ্যম')}</Label>
              <select
                value={advForm.paymentMethod}
                onChange={(e) => setAdvForm({ ...advForm, paymentMethod: e.target.value as PaymentMethod })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
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
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdvanceModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleDisburseAdvance}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
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
