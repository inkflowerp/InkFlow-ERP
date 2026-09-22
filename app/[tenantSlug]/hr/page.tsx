'use client'

// ==============================================================================
// InkFlow ERP - Authoritative HRM Dashboard & Executive Workforce Center
// Designed for Bangladeshi Print & Signage Owners, HR & Shop-Floor Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  Wallet,
  FileSpreadsheet,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  QrCode,
  Calendar,
  Briefcase,
  Layers,
  ChevronRight,
  UserPlus,
  Phone,
  Check,
  X,
  Receipt,
  Coins,
  Award,
  PieChart,
  HardHat,
  Printer,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  WorkforceSummaryKPIs,
  EmployeeRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  SalaryAdvanceRecord,
  PayrollPeriodRecord,
} from '@/types/workforce.types'
import {
  getWorkforceSummaryAction,
  getEmployeesAction,
  getDailyAttendanceAction,
  getOvertimeRecordsAction,
  getSalaryAdvancesAction,
  getPayrollPeriodsAction,
  reviewOvertimeAction,
} from '@/actions/workforce.actions'

export default function HrmDashboardPage() {
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

  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [summary, setSummary] = useState<WorkforceSummaryKPIs | null>(null)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [todayAttendance, setTodayAttendance] = useState<AttendanceDailySummaryRecord[]>([])
  const [pendingOvertime, setPendingOvertime] = useState<OvertimeRecord[]>([])
  const [recentAdvances, setRecentAdvances] = useState<SalaryAdvanceRecord[]>([])
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriodRecord[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const [sumRes, empRes, attRes, otRes, advRes, payRes] = await Promise.all([
        getWorkforceSummaryAction(),
        getEmployeesAction({ status: 'active' }),
        getDailyAttendanceAction({ date: todayStr }),
        getOvertimeRecordsAction({ status: 'pending_approval' }),
        getSalaryAdvancesAction({ isSettled: false }),
        getPayrollPeriodsAction(),
      ])

      if (sumRes.success && sumRes.data) setSummary(sumRes.data)
      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (attRes.success && attRes.data) setTodayAttendance(attRes.data)
      if (otRes.success && otRes.data) setPendingOvertime(otRes.data)
      if (advRes.success && advRes.data) setRecentAdvances(advRes.data)
      if (payRes.success && payRes.data) setPayrollPeriods(payRes.data)
    } catch (err: any) {
      console.error('Failed to load HRM Dashboard data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()

    const handleRealtimeSync = () => {
      loadData()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:employees', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:attendance', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:salary_advances', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:payroll_periods', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_table_synced:employees', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:attendance', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:salary_advances', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:payroll_periods', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [])

  const handleQuickReviewOt = async (id: string, status: 'approved' | 'rejected') => {
    startTransition(async () => {
      const res = await reviewOvertimeAction({ id, status, multiplier: 1.5 })
      if (res.success) {
        notify(`Overtime request ${status === 'approved' ? 'Approved' : 'Rejected'}.`)
        setPendingOvertime((prev) => prev.filter((o) => o.id !== id))
        loadData()
      } else {
        notify(res.error || 'Failed to review overtime.')
      }
    })
  }

  // Department counts
  const departmentCounts = React.useMemo(() => {
    const counts: Record<string, number> = {}
    employees.forEach((emp) => {
      const dept = emp.department || 'General'
      counts[dept] = (counts[dept] || 0) + 1
    })
    return counts
  }, [employees])

  // Computed metrics for KPIs & Overview Widgets
  const totalEmployeesCount = employees.length || summary?.todayAttendance.totalEmployees || 0
  const presentTodayCount = summary?.todayAttendance.present || todayAttendance.filter((a) => a.status === 'present' || a.status === 'half_day').length || 0
  const lateTodayCount = summary?.todayAttendance.late || todayAttendance.filter((a) => a.status === 'late' || (a.late_minutes && a.late_minutes > 0)).length || 0
  const approvedLeavesCount = summary?.todayAttendance.onLeave || todayAttendance.filter((a) => a.status === 'leave').length || 0
  const absentTodayCount = summary?.todayAttendance.absent || (totalEmployeesCount > 0 ? Math.max(0, totalEmployeesCount - presentTodayCount - approvedLeavesCount) : 0)

  // Attendance Overview Rates
  const presentRate = totalEmployeesCount > 0 ? Math.round((presentTodayCount / totalEmployeesCount) * 100) : 0
  const leaveRate = totalEmployeesCount > 0 ? Math.round((approvedLeavesCount / totalEmployeesCount) * 100) : 0
  const absentRate = totalEmployeesCount > 0 ? Math.max(0, 100 - presentRate - leaveRate) : 0

  // Financial & Payroll calculations
  const latestPayroll = payrollPeriods[0] || null
  const monthPayroll = summary?.monthFinancials.grossPayroll || latestPayroll?.total_gross_salary || employees.reduce((sum, e) => sum + Number(e.base_salary || 0), 0)
  const arrearsDue = summary?.monthFinancials.unpaidSalaryDue || latestPayroll?.total_due_amount || 0
  const totalCommission = employees.reduce((sum, e) => {
    const comm = (e.salary_structure as any)?.commission || 0
    return sum + Number(comm)
  }, 0)
  const advanceGiven = summary?.monthFinancials.advancesDisbursedThisMonth || recentAdvances.reduce((sum, a) => sum + Number(a.amount || 0), 0) || summary?.monthFinancials.advancesOutstanding || 0

  // Payroll Disbursal Status calculations
  const totalNetSalary = latestPayroll?.total_net_salary || monthPayroll || 0
  const totalPaidSalary = latestPayroll?.total_paid_amount || 0
  const salaryDisbursedPct = totalNetSalary > 0 ? Math.min(100, Math.round((totalPaidSalary / totalNetSalary) * 100)) : 0
  const salaryPendingPct = 100 - salaryDisbursedPct

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-20 animate-pulse">
        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-56 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
          <div className="h-56 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-7xl pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header with Multi-Tenant Navigation */}
      <PageHeader
        titleEn="HRM & Workforce Command"
        titleBn="এইচআরএম ও কর্মী ব্যবস্থাপনা"
        descriptionEn="Workforce command center, realtime attendance radar & payroll intelligence"
        descriptionBn="কর্মী ব্যবস্থাপনা, লাইভ হাজিরা পর্যবেক্ষণ ও বেতন নিয়ন্ত্রণ কেন্দ্র"
        icon={LayoutDashboard}
        iconColor="text-blue-600"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
            {tBilingual('Live Floor Sync', 'লাইভ ফ্লোর সিঙ্ক')}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs h-9 px-3 gap-1.5 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{tBilingual('Refresh', 'রিফ্রেশ')}</span>
            </Button>

            <Link href={getTenantNavHref('/operator', pathname, slug)}>
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-semibold text-slate-700 dark:text-slate-300 rounded-xl">
                <HardHat className="h-3.5 w-3.5 text-amber-600" />
                <span>{tBilingual('Operator Roster', 'অপারেটর রোস্টার')}</span>
              </Button>
            </Link>

            <Link href={getTenantNavHref('/hr/attendance', pathname, slug)}>
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-semibold text-slate-700 dark:text-slate-300 rounded-xl">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>{tBilingual('Floor Attendance', 'হাজিরা')}</span>
              </Button>
            </Link>

            <Link href={getTenantNavHref('/hr/payroll', pathname, slug)}>
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-semibold text-slate-700 dark:text-slate-300 rounded-xl">
                <Wallet className="h-3.5 w-3.5 text-blue-600" />
                <span>{tBilingual('Payroll & Salary', 'পেরোল ও বেতন')}</span>
              </Button>
            </Link>

            <Link href={getTenantNavHref('/hr/employees?action=new', pathname, slug)}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-bold px-4 gap-1.5 rounded-xl shadow-xs">
                <UserPlus className="h-4 w-4" />
                <span>{tBilingual('Add Employee', 'নতুন কর্মী')}</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* 8 Top Executive KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        {/* KPI 1: Total Employees */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {tBilingual('Total Staff', 'মোট কর্মী')}
            </span>
            <div className="p-1 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-md">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono">{totalEmployeesCount}</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span className="truncate">{employees.filter((e) => e.employee_type === 'permanent').length} {tBilingual('Perm', 'স্থায়ী')}</span>
            <Link href={getTenantNavHref('/hr/employees', pathname, slug)} className="text-blue-600 hover:underline font-semibold shrink-0">
              {tBilingual('List', 'তালিকা')}
            </Link>
          </div>
        </Card>

        {/* KPI 2: Present Today */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {tBilingual('Present Today', 'আজ উপস্থিত')}
            </span>
            <div className="p-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-md">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 font-mono">{presentTodayCount}</span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">({presentRate}%)</span>
          </div>
          <div className="mt-2 text-[10px] text-emerald-600/90 dark:text-emerald-400/90 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{tBilingual('On Floor', 'ফ্লোরে আছেন')}</span>
            <Link href={getTenantNavHref('/hr/attendance', pathname, slug)} className="text-emerald-600 hover:underline font-semibold shrink-0">
              {tBilingual('Live', 'লাইভ')}
            </Link>
          </div>
        </Card>

        {/* KPI 3: Absent Today */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-rose-300 dark:hover:border-rose-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              {tBilingual('Absent Today', 'আজ অনুপস্থিত')}
            </span>
            <div className="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-md">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black tracking-tight text-rose-600 dark:text-rose-400 font-mono">{absentTodayCount}</span>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono">({absentRate}%)</span>
          </div>
          <div className="mt-2 text-[10px] text-rose-600/90 dark:text-rose-400/90 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{approvedLeavesCount} {tBilingual('Leave', 'ছুটি')}</span>
            <span className="text-slate-400">•</span>
            <span className="truncate">{absentTodayCount} {tBilingual('Unauth', 'অনুপস্থিত')}</span>
          </div>
        </Card>

        {/* KPI 4: Late Arrivals */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-amber-300 dark:hover:border-amber-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {tBilingual('Late Arrivals', 'দেরিতে আগমন')}
            </span>
            <div className="p-1 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-md">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black tracking-tight text-amber-600 dark:text-amber-400 font-mono">{lateTodayCount}</span>
          </div>
          <div className="mt-2 text-[10px] text-amber-600/90 dark:text-amber-400/90 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{tBilingual('Check Grace', 'গ্রেস টাইম')}</span>
            <Link href={getTenantNavHref('/hr/attendance', pathname, slug)} className="text-amber-600 hover:underline font-semibold shrink-0">
              {tBilingual('Logs', 'লগ')}
            </Link>
          </div>
        </Card>

        {/* KPI 5: Arrears Due */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-rose-300 dark:hover:border-rose-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {tBilingual('Arrears Due', 'বকেয়া পাওনা')}
            </span>
            <div className="p-1 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-md">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black tracking-tight text-rose-600 dark:text-rose-400 font-mono">
              ৳ {formatBDT(arrearsDue)}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{tBilingual('Unpaid Due', 'বকেয়া বেতন')}</span>
            <Link href={getTenantNavHref('/hr/payroll', pathname, slug)} className="text-rose-600 hover:underline font-semibold shrink-0">
              {tBilingual('Clear', 'পরিশোধ')}
            </Link>
          </div>
        </Card>

        {/* KPI 6: Month Payroll */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {tBilingual('Month Payroll', 'চলতি মাসের বেতন')}
            </span>
            <div className="p-1 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-md">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white font-mono">
              ৳ {formatBDT(monthPayroll)}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{tBilingual('Gross Est.', 'মোট হিসাব')}</span>
            <Link href={getTenantNavHref('/hr/payroll', pathname, slug)} className="text-purple-600 hover:underline font-semibold shrink-0">
              {tBilingual('Sheet', 'শিট')}
            </Link>
          </div>
        </Card>

        {/* KPI 7: Total Commission */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {tBilingual('Commission', 'মোট কমিশন')}
            </span>
            <div className="p-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 rounded-md">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black tracking-tight text-indigo-600 dark:text-indigo-400 font-mono">
              ৳ {formatBDT(totalCommission)}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{tBilingual('Incentives', 'ইনসেন্টিভ')}</span>
            <Link href={getTenantNavHref('/hr/salary-report', pathname, slug)} className="text-indigo-600 hover:underline font-semibold shrink-0">
              {tBilingual('Audit', 'অডিট')}
            </Link>
          </div>
        </Card>

        {/* KPI 8: Advance Given */}
        <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col justify-between rounded-2xl">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {tBilingual('Advance Given', 'প্রদত্ত অগ্রিম')}
            </span>
            <div className="p-1 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-md">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-black tracking-tight text-teal-600 dark:text-teal-400 font-mono">
              ৳ {formatBDT(advanceGiven)}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 flex items-center justify-between">
            <span>{recentAdvances.length} {tBilingual('Pending', 'অনিষ্পন্ন')}</span>
            <Link href={getTenantNavHref('/hr/payroll', pathname, slug)} className="text-teal-600 hover:underline font-semibold shrink-0">
              {tBilingual('Deduct', 'কাটতি')}
            </Link>
          </div>
        </Card>
      </div>

      {/* Overview Row: Payroll Disbursal Status & Attendance Overview (Today) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Widget 1: Payroll Disbursal Status */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden rounded-2xl">
          <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Payroll Disbursal Status', 'বেতন পরিশোধের অবস্থা')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {tBilingual('Monthly salary disbursement & outstanding clearance progress', 'চলতি মাসের বেতন পরিশোধ ও অবশিষ্ট বকেয়ার হার')}
                </CardDescription>
              </div>
            </div>
            <Link href={getTenantNavHref('/hr/payroll', pathname, slug)}>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 font-semibold gap-1 h-8 rounded-lg">
                {tBilingual('Payroll Sheet', 'পেরোল শিট')}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Status Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  {tBilingual('Salary Disbursed (পরিশোধিত)', 'Salary Disbursed (পরিশোধিত)')}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {salaryDisbursedPct}%
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    ৳ {formatBDT(totalPaidSalary)}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-rose-100 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                  {tBilingual('Salary Pending (বাকি আছে)', 'Salary Pending (বাকি আছে)')}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                    {salaryPendingPct}%
                  </span>
                  <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                    ৳ {formatBDT(Math.max(0, totalNetSalary - totalPaidSalary))}
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{tBilingual('Disbursal Progress', 'পরিশোধের অগ্রগতি')}</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  ৳ {formatBDT(totalPaidSalary)} / ৳ {formatBDT(totalNetSalary)}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${salaryDisbursedPct}%` }}
                  title={`Disbursed: ${salaryDisbursedPct}%`}
                />
                <div
                  className="bg-rose-400 h-full transition-all duration-500"
                  style={{ width: `${salaryPendingPct}%` }}
                  title={`Pending: ${salaryPendingPct}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget 2: Attendance Overview (Today) */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden rounded-2xl">
          <CardHeader className="py-3.5 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Attendance Overview (Today)', 'হাজিরার সার্বিক চিত্র (আজ)')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {tBilingual('Floor presence, approved leaves and punctuality metrics', 'উপস্থিতির হার, অনুমোদিত ছুটি ও দেরিতে আগমনের তথ্য')}
                </CardDescription>
              </div>
            </div>
            <Link href={getTenantNavHref('/hr/attendance', pathname, slug)}>
              <Button variant="ghost" size="sm" className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold gap-1 h-8 rounded-lg">
                {tBilingual('Floor Radar', 'ফ্লোর হাজিরা')}
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Status Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  {tBilingual('Present Rate (উপস্থিতি)', 'Present Rate (উপস্থিতি)')}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {presentRate}%
                  </span>
                  <span className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                    ({presentTodayCount}/{totalEmployeesCount})
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-950 bg-blue-50/40 dark:bg-blue-950/20">
                <div className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
                  {tBilingual('Approved Leaves (ছুটি)', 'Approved Leaves (ছুটি)')}
                </div>
                <div className="mt-1.5 flex items-baseline gap-2 font-mono">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {leaveRate}%
                  </span>
                  <span className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                    ({approvedLeavesCount}/{totalEmployeesCount})
                  </span>
                </div>
              </div>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {presentTodayCount} {tBilingual('Present', 'উপস্থিত')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {lateTodayCount} {tBilingual('Late', 'দেরি')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    {approvedLeavesCount} {tBilingual('Leave', 'ছুটি')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    {absentTodayCount} {tBilingual('Absent', 'অনুপস্থিত')}
                  </span>
                </div>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                  {totalEmployeesCount} {tBilingual('Staff', 'কর্মী')}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${presentRate}%` }}
                  title={`Present: ${presentRate}%`}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${leaveRate}%` }}
                  title={`Leave: ${leaveRate}%`}
                />
                <div
                  className="bg-rose-500 h-full transition-all duration-500"
                  style={{ width: `${absentRate}%` }}
                  title={`Absent: ${absentRate}%`}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Today's Floor Attendance Live Stream + Departmental Distribution */}
        <div className="lg:col-span-2 space-y-5">
          {/* Widget 1: Today Floor Attendance Radar */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  {tBilingual("Today's Floor Attendance Radar", 'আজকের কারখানার লাইভ উপস্থিতি')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {tBilingual('Realtime clock-in/out logs for shop-floor operators and staff', 'কারখানার অপারেটর ও কর্মীদের লাইভ প্রবেশ ও প্রস্থান')}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 gap-1 font-semibold rounded-lg">
                <Link href={getTenantNavHref('/hr/attendance', pathname, slug)}>
                  {tBilingual('Manage', 'পরিচালনা')}
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {todayAttendance.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  <Calendar className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                  <p>{tBilingual('No punch records logged yet today.', 'আজকের দিনে এখনও কোন হাজিরার তথ্য রেকর্ড হয়নি।')}</p>
                  <Button asChild size="sm" variant="outline" className="mt-3 text-xs rounded-xl">
                    <Link href={getTenantNavHref('/hr/attendance', pathname, slug)}>
                      {tBilingual('Mark Manual Attendance', 'ম্যানুয়াল হাজিরা দিন')}
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border/40 max-h-96 overflow-y-auto">
                  {todayAttendance.slice(0, 8).map((record) => {
                    const emp = employees.find((e) => e.id === record.employee_id)
                    const isLate = record.status === 'late' || (record.late_minutes && record.late_minutes > 0)
                    return (
                      <div key={record.id || record.employee_id} className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {(record.employee_name || emp?.name || 'E').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                              <span>{record.employee_name || emp?.name}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 capitalize ${
                                  record.status === 'present'
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                    : record.status === 'late'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                                }`}
                              >
                                {record.status}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {emp?.department || record.shift_name || 'General Shift'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <div className="font-mono text-muted-foreground">
                            <span className="text-foreground font-medium">{record.check_in_time || '--:--'}</span>
                            {' → '}
                            <span>{record.check_out_time || 'Working'}</span>
                          </div>
                          {isLate && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              +{record.late_minutes || 0}m {tBilingual('late', 'দেরি')}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget 2: Departmental Staff Distribution */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                {tBilingual('Departmental Workforce Distribution', 'বিভাগভিত্তিক কর্মী বণ্টন')}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {tBilingual('Headcount allocated per production and management unit', 'প্রোডাকশন ও ম্যানেজমেন্ট অনুযায়ী মোট জনবল')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {Object.keys(departmentCounts).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  {tBilingual('No active departments found.', 'কোন বিভাগ পাওয়া যায়নি।')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(departmentCounts).map(([dept, count]) => {
                    const pct = totalEmployeesCount > 0 ? Math.round((count / totalEmployeesCount) * 100) : 0
                    return (
                      <div key={dept} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold capitalize text-slate-900 dark:text-white">{dept}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono font-bold">
                            {count}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1 font-mono">
                            <span>{pct}% of team</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 span): Pending Approvals & Quick Navigation Links */}
        <div className="space-y-5">
          {/* Widget 3: Pending Overtime Approvals Queue */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {tBilingual('Pending Overtime', 'অনুমোদনযোগ্য ওভারটাইম')}
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {tBilingual('Requests awaiting floor manager verification', 'ম্যানেজারের অনুমোদনের অপেক্ষায় থাকা আবেদন')}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-mono font-bold">
                {pendingOvertime.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {pendingOvertime.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/60 mb-2" />
                  <p>{tBilingual('No pending overtime requests.', 'সব ওভারটাইম অনুমোদন সম্পন্ন হয়েছে।')}</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
                  {pendingOvertime.map((ot) => (
                    <div key={ot.id} className="p-3.5 space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white">{ot.employee_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {formatDate(ot.ot_date)} • {Math.round(ot.duration_minutes / 60 * 10) / 10}h ({ot.duration_minutes}m)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                            ৳ {formatBDT(ot.calculated_amount || 0)}
                          </div>
                          <span className="text-[10px] text-slate-400 capitalize">{ot.ot_type.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {ot.reason && (
                        <p className="text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          &ldquo;{ot.reason}&rdquo;
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleQuickReviewOt(ot.id, 'approved')}
                          disabled={isPending}
                          className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold rounded-lg"
                        >
                          <Check className="w-3 h-3" />
                          {tBilingual('Approve 1.5x', 'অনুমোদন')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickReviewOt(ot.id, 'rejected')}
                          disabled={isPending}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 gap-1 font-semibold rounded-lg"
                        >
                          <X className="w-3 h-3" />
                          {tBilingual('Reject', 'বাতিল')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Widget 4: Quick Launchpad */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 rounded-2xl">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                {tBilingual('HRM Operations Launchpad', 'এইচআরএম দ্রুত লিংক')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2">
              <Link
                href={getTenantNavHref('/hr/employees', pathname, slug)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tBilingual('Employee Directory', 'কর্মীদের তালিকা')}</div>
                    <div className="text-[11px] text-slate-500">{tBilingual('Profiles, salaries & contracts', 'প্রোফাইল ও বেতন বিবরণ')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </Link>

              <Link
                href={getTenantNavHref('/hr/attendance', pathname, slug)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tBilingual('Floor Attendance & Punch', 'হাজিরা ও পাঞ্চিং')}</div>
                    <div className="text-[11px] text-slate-500">{tBilingual('Daily logs, QR scan & shifts', 'দৈনিক হাজিরা ও শিফট')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </Link>

              <Link
                href={getTenantNavHref('/hr/payroll', pathname, slug)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-purple-300 dark:hover:border-purple-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tBilingual('Payroll & Salary Sheets', 'পেরোল ও বেতন শিট')}</div>
                    <div className="text-[11px] text-slate-500">{tBilingual('Generate drafts & disburse pay', 'বেতন শিট তৈরি ও প্রদান')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </Link>

              <Link
                href={getTenantNavHref('/hr/salary-report', pathname, slug)}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{tBilingual('Salary & Payout Reports', 'বেতন ও ব্যাংক রিপোর্ট')}</div>
                    <div className="text-[11px] text-slate-500">{tBilingual('Bank advice sheets & CSV export', 'ব্যাংক অ্যাডভাইস শিট ও এক্সপোর্ট')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
