'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Salary, Compensation & Bank Advice Report Center
// Designed for Bangladeshi Print & Signage Owners, Chief Accountants & Auditors
// ==============================================================================

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
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
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

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

  // Filter channel counts
  const bankCount = selectedPeriod?.items?.filter((item) => {
    const emp = employees.find((e) => e.id === item.employee_id || (item.employee_id_number && e.employee_id_number === item.employee_id_number) || e.name === item.employee_name)
    return Boolean(emp?.bank_payment_info?.account_number)
  }).length || 0

  const mfsCount = selectedPeriod?.items?.filter((item) => {
    const emp = employees.find((e) => e.id === item.employee_id || (item.employee_id_number && e.employee_id_number === item.employee_id_number) || e.name === item.employee_name)
    return Boolean(emp?.mfs_payment_info?.wallet_number)
  }).length || 0

  const cashCount = Math.max(0, (selectedPeriod?.items?.length || 0) - bankCount - mfsCount)

  // Export CSV Handler
  const handleExportCsv = () => {
    if (!filteredItems.length) return
    const headers = [
      'Employee ID',
      'Name',
      'Department',
      'Role',
      'Base Salary (BDT)',
      'Worked Days',
      'Overtime Amount (BDT)',
      'Absent Deduction (BDT)',
      'Advance Deduction (BDT)',
      'Net Salary (BDT)',
      'Paid (BDT)',
      'Due (BDT)',
      'Bank Name',
      'Bank Account',
      'MFS Provider',
      'MFS Number',
    ]

    const rows = filteredItems.map((item) => {
      const emp = employees.find((e) => e.id === item.employee_id || (item.employee_id_number && e.employee_id_number === item.employee_id_number) || e.name === item.employee_name)
      return [
        `"${item.employee_id_number || ''}"`,
        `"${item.employee_name}"`,
        `"${item.department}"`,
        `"${emp?.role || 'Staff'}"`,
        item.base_salary,
        item.days_present,
        item.overtime_amount,
        item.absence_deduction,
        item.advance_salary_deducted,
        item.net_salary,
        item.paid_amount,
        item.due_amount,
        `"${emp?.bank_payment_info?.bank_name || ''}"`,
        `"${emp?.bank_payment_info?.account_number || ''}"`,
        `"${emp?.mfs_payment_info?.provider || ''}"`,
        `"${emp?.mfs_payment_info?.wallet_number || ''}"`,
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Salary_Report_${selectedPeriod?.period_name.replace(/\s+/g, '_') || 'Current'}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16 print:p-0 print:max-w-none print:w-full print:bg-white print:text-black">
      {/* Non-Print Header */}
      <div className="print:hidden">
        <PageHeader
          titleEn="Salery Report"
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
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                {tBilingual('Print Report', 'প্রিন্ট রিপোর্ট')}
              </Button>

              <Button
                size="sm"
                onClick={handleExportCsv}
                disabled={filteredItems.length === 0}
                className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs bangla-text"
              >
                <Download className="w-3.5 h-3.5" />
                {tBilingual('Export CSV / Excel', 'এক্সেল এক্সপোর্ট')}
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
      <Card className="print:hidden p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{tBilingual('Select Payroll Period', 'বেতন মেয়াদ নির্বাচন')}</Label>
              <select
                aria-label="Select Payroll Period for Report"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="block font-bold text-sm bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-slate-900 dark:text-white focus:outline-none mt-0.5"
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
            Total Employees: <strong className="text-slate-900 dark:text-white">{selectedPeriod?.items?.length || 0}</strong> • Status: <strong className="uppercase text-slate-900 dark:text-white">{selectedPeriod?.status || 'N/A'}</strong>
          </div>
        </div>
      </Card>

      {/* Top 4 Executive Financial KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              {tBilingual('Gross Payroll Cost', 'মোট গ্রস বেতন')}
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatBDT(totalGross)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Base + Overtime + Allowances</p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              {tBilingual('Net Disbursable', 'প্রদেয় নিট অর্থ')}
            </span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{formatBDT(totalNet)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">After deductions & advances</p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              {tBilingual('Total Disbursed (Paid)', 'পরিশোধিত')}
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatBDT(totalPaid)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Due: <strong className="text-rose-600 dark:text-rose-400">{formatBDT(totalDue)}</strong></p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              {tBilingual('Overtime Paid', 'পরিশোধিত ওভারটাইম')}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{formatBDT(totalOtPaid)}</div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Advances Ded: {formatBDT(totalAdvancesDeducted)}</p>
        </Card>
      </div>

      {/* Departmental Labor Cost Breakdown */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 print:shadow-none print:border-black">
        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
          <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600" />
            {tBilingual('Departmental Salary Distribution', 'বিভাগভিত্তিক মোট বেতন খরচ')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(departmentAggregates).map(([dept, data]) => {
              const pct = totalGross > 0 ? Math.round((data.totalCost / totalGross) * 100) : 0
              return (
                <div key={dept} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs capitalize text-slate-900 dark:text-white">{dept}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-slate-200/70 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {data.count} staff
                    </Badge>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                    {formatBDT(data.netPay)}
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">{pct}% of total payroll</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Toolbar */}
      <Card className="print:hidden p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
            {/* Channel Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <button
                type="button"
                onClick={() => setChannelFilter('ALL')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  channelFilter === 'ALL'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tBilingual('All Channels', 'সব চ্যানেল')}</span>
                <span className="text-[10px] opacity-75 font-mono">({selectedPeriod?.items?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelFilter('bank')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  channelFilter === 'bank'
                    ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/50'
                }`}
              >
                <span>{tBilingual('Bank Advice', 'ব্যাংক ট্রান্সফার')}</span>
                <span className="text-[10px] opacity-75 font-mono">({bankCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelFilter('mfs')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  channelFilter === 'mfs'
                    ? 'bg-pink-600 text-white dark:bg-pink-500 dark:text-white'
                    : 'bg-pink-50 text-pink-700 hover:bg-pink-100 dark:bg-pink-950/40 dark:text-pink-300 dark:hover:bg-pink-900/50'
                }`}
              >
                <span>{tBilingual('Mobile Wallet', 'মোবাইল ওয়ালেট')}</span>
                <span className="text-[10px] opacity-75 font-mono">({mfsCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setChannelFilter('cash')}
                className={`h-7 px-2.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  channelFilter === 'cash'
                    ? 'bg-amber-600 text-white dark:bg-amber-500 dark:text-white'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50'
                }`}
              >
                <span>{tBilingual('Cash Pay', 'নগদ')}</span>
                <span className="text-[10px] opacity-75 font-mono">({cashCount})</span>
              </button>
            </div>

            {/* Department Dropdown */}
            <select
              aria-label="Filter by department in report"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-7 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
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

          <div className="relative w-full sm:w-60 shrink-0">
            <Search className="absolute left-3 top-2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={tBilingual('Search employee name, ID...', 'কর্মী খুঁজুন...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-7 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      </Card>

      {/* Main Salary & Bank Advice Sheet Table */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 print:shadow-none print:border-black">
        <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30 print:hidden">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {tBilingual('Master Salary Disbursement Statement', 'মাস্টার বেতন ও ভাতা বিবরণী')}
            </CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {filteredItems.length} staff
            </Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider print:bg-slate-100 print:text-black">
                <th className="p-3 pl-4">SL</th>
                <th className="p-3">{tBilingual('Employee Name', 'কর্মীর নাম')}</th>
                <th className="p-3">{tBilingual('ID / Dept', 'আইডি / বিভাগ')}</th>
                <th className="p-3">{tBilingual('Payment Channel & Account', 'পেমেন্ট মাধ্যম ও অ্যাকাউন্ট')}</th>
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
                      {formatBDT(item.base_salary || 0)}
                    </td>

                    <td className="p-3 text-purple-600 dark:text-purple-400 font-medium">
                      {Number(item.overtime_amount || 0) > 0 ? `+${formatBDT(item.overtime_amount || 0)}` : '৳ 0'}
                    </td>

                    <td className="p-3 text-rose-600 dark:text-rose-400">
                      {totalDeduction > 0 ? `-${formatBDT(totalDeduction)}` : '৳ 0'}
                    </td>

                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {formatBDT(item.net_salary || 0)}
                    </td>

                    <td className="p-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatBDT(item.paid_amount || 0)}
                    </td>

                    <td className="p-3 pr-4 text-right text-rose-600 dark:text-rose-400">
                      {formatBDT(item.due_amount || 0)}
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
                <td className="p-3 text-slate-900 dark:text-white">{formatBDT(totalGross)}</td>
                <td className="p-3 text-purple-600 dark:text-purple-400">+{formatBDT(totalOtPaid)}</td>
                <td className="p-3 text-rose-600 dark:text-rose-400">-{formatBDT(totalAdvancesDeducted)}</td>
                <td className="p-3 text-slate-900 dark:text-white">{formatBDT(totalNet)}</td>
                <td className="p-3 text-emerald-600 dark:text-emerald-400">{formatBDT(totalPaid)}</td>
                <td className="p-3 pr-4 text-right text-rose-600 dark:text-rose-400">{formatBDT(totalDue)}</td>
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
