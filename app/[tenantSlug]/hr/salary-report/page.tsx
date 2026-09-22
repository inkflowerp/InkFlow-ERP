'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Salary, Compensation & Bank Advice Report Center
// Designed for Bangladeshi Print & Signage Owners, Chief Accountants & Auditors
// ==============================================================================

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  FileSpreadsheet,
  Calendar,
  Building,
  Printer,
  Download,
  Search,
  Filter,
  CreditCard,
  Briefcase,
  Users,
  Wallet,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  ArrowLeft,
  HardHat,
  UserCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  EmployeeRecord,
  PayrollPeriodRecord,
  PayrollItemRecord,
  SalaryAdvanceRecord,
} from '@/types/workforce.types'
import {
  getEmployeesAction,
  getPayrollPeriodsAction,
  getSalaryAdvancesAction,
} from '@/actions/workforce.actions'

export default function SalaryReportPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [isLoading, setIsLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([])
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [channelFilter, setChannelFilter] = useState('ALL')

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [empRes, payRes, advRes] = await Promise.all([
        getEmployeesAction(),
        getPayrollPeriodsAction(),
        getSalaryAdvancesAction(),
      ])

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (payRes.success && payRes.data && payRes.data.length > 0) {
        const periodList = payRes.data
        setPayrollPeriods(periodList)
        setSelectedPeriodId((prev) => {
          if (!prev) return periodList[0].id
          const found = periodList.find((p) => p.id === prev)
          return found ? found.id : periodList[0].id
        })
      }
      if (advRes.success && advRes.data) setAdvances(advRes.data)
    } catch (err: any) {
      console.error('Failed to load salary report data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const selectedPeriod = payrollPeriods.find((p) => p.id === selectedPeriodId) || payrollPeriods[0]

  // Filter line items
  const filteredItems = React.useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.items) return []
    return selectedPeriod.items.filter((item) => {
      const emp = employees.find((e) => e.id === item.employee_id || (item.employee_id_number && e.employee_id_number === item.employee_id_number) || e.name === item.employee_name)
      const matchSearch =
        !searchTerm.trim() ||
        item.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.employee_id_number && item.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDept = deptFilter === 'ALL' || item.department === deptFilter

      const hasBank = Boolean(emp?.bank_payment_info?.account_number)
      const hasMfs = Boolean(emp?.mfs_payment_info?.wallet_number)
      const matchChannel =
        channelFilter === 'ALL' ||
        (channelFilter === 'bank' && hasBank) ||
        (channelFilter === 'mfs' && hasMfs) ||
        (channelFilter === 'cash' && !hasBank && !hasMfs)

      return matchSearch && matchDept && matchChannel
    })
  }, [selectedPeriod, employees, searchTerm, deptFilter, channelFilter])

  // Financial Metrics
  const totalGross = Number(selectedPeriod?.total_gross_salary || 0)
  const totalNet = Number(selectedPeriod?.total_net_salary || 0)
  const totalPaid = Number(selectedPeriod?.total_paid_amount || 0)
  const totalDue = Number(selectedPeriod?.total_due_amount || (totalNet - totalPaid))
  const totalOtPaid = selectedPeriod?.items?.reduce((sum, item) => sum + Number(item.overtime_amount || 0), 0) || 0
  const totalAdvancesDeducted = selectedPeriod?.items?.reduce((sum, item) => sum + Number(item.advance_salary_deducted || 0), 0) || 0

  // Department Distribution Aggregates
  const departmentAggregates = React.useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.items) return {}
    const map: Record<string, { count: number; totalCost: number; netPay: number }> = {}
    selectedPeriod.items.forEach((item) => {
      const dept = item.department || 'General'
      if (!map[dept]) {
        map[dept] = { count: 0, totalCost: 0, netPay: 0 }
      }
      map[dept].count += 1
      map[dept].totalCost += Number(item.base_salary || 0) + Number(item.overtime_amount || 0)
      map[dept].netPay += Number(item.net_salary || 0)
    })
    return map
  }, [selectedPeriod])

  // Channel Distribution Aggregates
  const channelCounts = React.useMemo(() => {
    if (!selectedPeriod || !selectedPeriod.items) return { bank: 0, mfs: 0, cash: 0 }
    let bank = 0
    let mfs = 0
    let cash = 0
    selectedPeriod.items.forEach((item) => {
      const emp = employees.find((e) => e.id === item.employee_id)
      if (emp?.bank_payment_info?.account_number) bank += 1
      else if (emp?.mfs_payment_info?.wallet_number) mfs += 1
      else cash += 1
    })
    return { bank, mfs, cash }
  }, [selectedPeriod, employees])

  const handleExportCsv = () => {
    if (!selectedPeriod || !filteredItems.length) return

    const headers = [
      'SL',
      'Employee Name',
      'Employee ID',
      'Department',
      'Designation',
      'Base Salary (BDT)',
      'Overtime Pay (BDT)',
      'Bonus / Incentives (BDT)',
      'Salary Advance Deducted (BDT)',
      'Absent Deductions (BDT)',
      'Net Salary (BDT)',
      'Paid Amount (BDT)',
      'Due Amount (BDT)',
      'Payment Status',
      'Bank Name',
      'Bank Account Number',
      'MFS Provider',
      'MFS Wallet Number',
    ]

    const rows = filteredItems.map((item, idx) => {
      const emp = employees.find((e) => e.id === item.employee_id)
      return [
        idx + 1,
        `"${item.employee_name.replace(/"/g, '""')}"`,
        `"${item.employee_id_number || ''}"`,
        `"${item.department || ''}"`,
        `"${emp?.designation || ''}"`,
        item.base_salary || 0,
        item.overtime_amount || 0,
        item.bonuses || 0,
        item.advance_salary_deducted || 0,
        item.absence_deduction || 0,
        item.net_salary || 0,
        item.paid_amount || 0,
        item.due_amount || 0,
        `"${item.payment_status.toUpperCase()}"`,
        `"${emp?.bank_payment_info?.bank_name || ''}"`,
        `"${emp?.bank_payment_info?.account_number || ''}"`,
        `"${emp?.mfs_payment_info?.provider || ''}"`,
        `"${emp?.mfs_payment_info?.wallet_number || ''}"`,
      ].join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `PrintERP_Salary_Report_${selectedPeriod?.period_name.replace(/\s+/g, '_') || 'Current'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    window.print()
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-20 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 print:p-0 print:max-w-none print:w-full print:bg-white print:text-black">
      {/* Non-Print Header */}
      <div className="print:hidden space-y-4">
        <div className="flex items-center justify-between">
          <Link
            href={getTenantNavHref('/hr', pathname, slug)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{tBilingual('Back to HRM Dashboard', 'এইচআরএম ড্যাশবোর্ডে ফিরুন')}</span>
          </Link>
        </div>

        <PageHeader
          titleEn="Salary & Compensation Report"
          titleBn="বেতন ও ব্যাংক ট্রান্সফার রিপোর্ট"
          descriptionEn="Monthly salary breakdown, bank disbursement advice & department labor costing"
          descriptionBn="মাসিক বেতন শিট, ব্যাংক ট্রান্সফার শিডিউল ও বিভাগভিত্তিক মজুরি ব্যয় বিশ্লেষণ"
          icon={FileSpreadsheet}
          iconColor="text-blue-600 dark:text-blue-400"
          badge={
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
              {selectedPeriod?.period_name || tBilingual('Monthly Audit', 'মাসিক অডিট')}
            </Badge>
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link href={getTenantNavHref('/hr/payroll', pathname, slug)}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 rounded-xl font-semibold text-slate-700 dark:text-slate-300">
                  <Wallet className="w-3.5 h-3.5 text-blue-600" />
                  <span>{tBilingual('Payroll Studio', 'পেরোল স্টুডিও')}</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/hr/employees', pathname, slug)}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9 rounded-xl font-semibold text-slate-700 dark:text-slate-300">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{tBilingual('Staff Roster', 'কর্মী তালিকা')}</span>
                </Button>
              </Link>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-9 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>{tBilingual('Print Report', 'প্রিন্ট রিপোর্ট')}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredItems.length === 0}
                className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 rounded-xl shadow-xs bangla-text"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{tBilingual('Export CSV / Excel', 'এক্সেল এক্সপোর্ট')}</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Print-Only Header Banner */}
      <div className="hidden print:block text-center border-b-2 border-black pb-4 mb-6">
        <h2 className="text-xl font-bold uppercase tracking-wider">{company?.name || 'InkFlow ERP Organization'}</h2>
        <h3 className="text-sm font-semibold mt-1">MONTHLY SALARY DISBURSEMENT STATEMENT (বেতন বিবরণী)</h3>
        <p className="text-xs text-slate-600 mt-0.5">
          Period: <strong>{selectedPeriod?.period_name}</strong> ({formatDate(selectedPeriod?.start_date)} - {formatDate(selectedPeriod?.end_date)})
        </p>
      </div>

      {/* Period Selector Bar */}
      <Card className="print:hidden p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-xl">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{tBilingual('Select Payroll Period', 'বেতন মেয়াদ নির্বাচন')}</Label>
              <select
                aria-label="Select Payroll Period for Report"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="block font-bold text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-1 text-slate-900 dark:text-white focus:outline-none mt-0.5"
              >
                {payrollPeriods.map((p) => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {p.period_name} ({formatDate(p.start_date)} - {formatDate(p.end_date)}) [{p.status.toUpperCase()}]
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Total Staff: <strong className="text-slate-900 dark:text-white">{selectedPeriod?.items?.length || 0}</strong> • Status: <strong className="uppercase text-slate-900 dark:text-white">{selectedPeriod?.status || 'N/A'}</strong>
          </div>
        </div>
      </Card>

      {/* Financial Executive Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-l-4 border-l-blue-500 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
          <div className="text-[11px] font-semibold uppercase text-slate-500">{tBilingual('Gross Pay Budget', 'মোট বেতন বাজেট')}</div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1 font-mono">
            ৳ {formatBDT(totalGross)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            Includes ৳ {formatBDT(totalOtPaid)} overtime
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
          <div className="text-[11px] font-semibold uppercase text-purple-700 dark:text-purple-300">{tBilingual('Net Payable', 'নিট প্রদেয় বেতন')}</div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 font-mono">
            ৳ {formatBDT(totalNet)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">
            After ৳ {formatBDT(totalAdvancesDeducted)} advances deducted
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-500 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
          <div className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-300">{tBilingual('Total Disbursed', 'পরিশোধিত টাকা')}</div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
            ৳ {formatBDT(totalPaid)}
          </div>
          <div className="text-[10px] text-emerald-600/90 dark:text-emerald-400/90 mt-1 font-mono">
            {totalNet > 0 ? Math.round((totalPaid / totalNet) * 100) : 0}% cleared
          </div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
          <div className="text-[11px] font-semibold uppercase text-rose-700 dark:text-rose-300">{tBilingual('Pending Dues', 'বকেয়া পাওনা')}</div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1 font-mono">
            ৳ {formatBDT(totalDue)}
          </div>
          <div className="text-[10px] text-rose-600/90 dark:text-rose-400/90 mt-1 font-mono">
            {filteredItems.filter((i) => (i.due_amount || 0) > 0).length} employees pending
          </div>
        </Card>
      </div>

      {/* Filter and Search Bar (Non-Print) */}
      <Card className="print:hidden p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <Input
              placeholder={tBilingual('Search employee name or ID...', 'নাম বা আইডি দিয়ে খুঁজুন...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          <div>
            <select
              aria-label="Filter by Department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">All Departments (সব বিভাগ)</option>
              {Object.keys(departmentAggregates).map((dept) => (
                <option key={dept} value={dept}>
                  {dept} ({departmentAggregates[dept].count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              aria-label="Filter by Payout Channel"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full h-9 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">All Payment Channels (সব মাধ্যম)</option>
              <option value="bank">Bank Transfer ({channelCounts.bank})</option>
              <option value="mfs">bKash / Nagad MFS ({channelCounts.mfs})</option>
              <option value="cash">Cash In Hand ({channelCounts.cash})</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Statement Table */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 print:border-none print:shadow-none rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-400 print:bg-slate-100 print:text-black">
              <tr>
                <th className="p-3 pl-4">#</th>
                <th className="p-3">{tBilingual('Employee', 'কর্মীর নাম')}</th>
                <th className="p-3">{tBilingual('ID & Dept', 'আইডি ও বিভাগ')}</th>
                <th className="p-3">{tBilingual('Payout Channel', 'পেমেন্ট চ্যানেল')}</th>
                <th className="p-3">{tBilingual('Base Salary', 'মূল বেতন')}</th>
                <th className="p-3">{tBilingual('OT Paid', 'ওভারটাইম')}</th>
                <th className="p-3">{tBilingual('Deductions', 'কর্তন')}</th>
                <th className="p-3">{tBilingual('Net Payable (BDT)', 'প্রদেয় নিট টাকা')}</th>
                <th className="p-3">{tBilingual('Paid', 'পরিশোধ')}</th>
                <th className="p-3 pr-4 text-right">{tBilingual('Due', 'বকেয়া')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 print:divide-slate-300 font-mono">
              {filteredItems.map((item, idx) => {
                const emp = employees.find((e) => e.id === item.employee_id)
                const hasBank = Boolean(emp?.bank_payment_info?.account_number)
                const hasMfs = Boolean(emp?.mfs_payment_info?.wallet_number)
                const totalDeduction = Number(item.absence_deduction || 0) + Number(item.advance_salary_deducted || 0)

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-3 pl-4 text-slate-400">{idx + 1}</td>

                    <td className="p-3 font-sans font-semibold text-slate-900 dark:text-white">
                      {item.employee_name}
                    </td>

                    <td className="p-3 font-sans text-[11px] text-slate-500 dark:text-slate-400">
                      <div>{item.employee_id_number}</div>
                      <div className="capitalize">{item.department}</div>
                    </td>

                    <td className="p-3 font-sans text-[11px]">
                      {hasBank ? (
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                            <Building className="w-3 h-3 text-blue-500" />
                            {emp?.bank_payment_info?.bank_name}
                          </div>
                          <div className="font-mono text-slate-500 dark:text-slate-400">{emp?.bank_payment_info?.account_number}</div>
                        </div>
                      ) : hasMfs ? (
                        <div>
                          <div className="font-semibold text-pink-600 dark:text-pink-400 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" />
                            {emp?.mfs_payment_info?.provider?.toUpperCase() || 'bKash'}
                          </div>
                          <div className="font-mono text-slate-500 dark:text-slate-400">{emp?.mfs_payment_info?.wallet_number}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-medium">Cash On Hand</span>
                      )}
                    </td>

                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      ৳ {formatBDT(item.base_salary || 0)}
                    </td>

                    <td className="p-3 text-purple-600 dark:text-purple-400 font-medium">
                      {Number(item.overtime_amount || 0) > 0 ? `+৳ ${formatBDT(item.overtime_amount || 0)}` : '৳ 0'}
                    </td>

                    <td className="p-3 text-rose-600 dark:text-rose-400">
                      {totalDeduction > 0 ? `-৳ ${formatBDT(totalDeduction)}` : '৳ 0'}
                    </td>

                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      ৳ {formatBDT(item.net_salary || 0)}
                    </td>

                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      ৳ {formatBDT(item.paid_amount || 0)}
                    </td>

                    <td className="p-3 pr-4 text-right text-rose-600 dark:text-rose-400">
                      ৳ {formatBDT(item.due_amount || 0)}
                    </td>
                  </tr>
                )
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 dark:text-slate-400 font-sans text-xs">
                    {tBilingual('No employee salary records found matching current filters.', 'ফিল্টারের সাথে মিল রেখে কোন কর্মীর বেতন তথ্য পাওয়া যায়নি।')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 dark:border-slate-800 print:border-black bg-slate-50/80 dark:bg-slate-900/50 font-bold font-mono">
                <td colSpan={4} className="p-3 pl-4 font-sans text-right uppercase text-slate-700 dark:text-slate-300">
                  {tBilingual('Total Summary', 'মোট সর্বমোট')}:
                </td>
                <td className="p-3 text-slate-900 dark:text-white">৳ {formatBDT(totalGross)}</td>
                <td className="p-3 text-purple-600 dark:text-purple-400">+৳ {formatBDT(totalOtPaid)}</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">-৳ {formatBDT(totalAdvancesDeducted)}</td>
                <td className="p-3 text-slate-900 dark:text-white">৳ {formatBDT(totalNet)}</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">৳ {formatBDT(totalPaid)}</td>
                <td className="p-3 pr-4 text-right text-rose-600 dark:text-rose-400">৳ {formatBDT(totalDue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Print Signature Box */}
      <div className="hidden print:grid grid-cols-3 gap-8 pt-16 text-center text-xs font-semibold">
        <div>
          <div className="border-t border-black pt-2">Prepared By (HR Officer)</div>
        </div>
        <div>
          <div className="border-t border-black pt-2">Verified By (Chief Accountant)</div>
        </div>
        <div>
          <div className="border-t border-black pt-2">Approved By (Managing Director)</div>
        </div>
      </div>
    </div>
  )
}
