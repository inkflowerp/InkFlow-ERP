'use client'

// ==============================================================================
// InkFlow ERP - Authoritative HRM Dashboard & Executive Workforce Center
// Designed for Bangladeshi Print & Signage Owners, HR & Shop-Floor Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Wallet,
  FileSpreadsheet,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Building,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  QrCode,
  Calendar,
  AlertCircle,
  Briefcase,
  Layers,
  ChevronRight,
  UserPlus,
  Phone,
  Check,
  X,
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
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

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

  const totalEmployeesCount = employees.length || summary?.todayAttendance.totalEmployees || 0
  const presentTodayCount = summary?.todayAttendance.present || todayAttendance.filter((a) => a.status === 'present' || a.status === 'half_day').length || 0
  const lateTodayCount = summary?.todayAttendance.late || todayAttendance.filter((a) => a.status === 'late' || (a.late_minutes && a.late_minutes > 0)).length || 0
  const absentTodayCount = summary?.todayAttendance.absent || (totalEmployeesCount > 0 ? Math.max(0, totalEmployeesCount - presentTodayCount) : 0)
  const attendanceRate = totalEmployeesCount > 0 ? Math.round((presentTodayCount / totalEmployeesCount) * 100) : 0

  return (
    <div className="space-y-5 max-w-7xl pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="HRM Dashboard"
        titleBn="এইচআরএম ড্যাশবোর্ড"
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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="text-xs h-9 px-3 gap-1.5"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{tBilingual('Refresh', 'রিফ্রেশ')}</span>
            </Button>
            <Link href={`/${tenantSlug}/hr/attendance`}>
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-medium bangla-text">
                <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                {tBilingual('Floor Attendance', 'হাজিরা')}
              </Button>
            </Link>
            <Link href={`/${tenantSlug}/hr/payroll`}>
              <Button variant="outline" size="sm" className="text-xs h-9 gap-1.5 font-medium bangla-text">
                <Wallet className="h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Payroll & Salary', 'পেরোল ও বেতন')}
              </Button>
            </Link>
            <Link href={`/${tenantSlug}/hr/employees?action=new`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-9 font-bold px-4 gap-1.5 shadow-sm hover:shadow">
                <UserPlus className="h-4 w-4" />
                {tBilingual('Add Employee', 'নতুন কর্মী')}
              </Button>
            </Link>
          </div>
        }
      />

      {/* 4 Top Executive KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Workforce */}
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Total Workforce', 'মোট কর্মী')}
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">{totalEmployeesCount}</span>
            <span className="text-xs text-slate-500">{tBilingual('active staff', 'সক্রিয় কর্মী')}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{employees.filter((e) => e.employee_type === 'permanent').length} {tBilingual('Permanent', 'স্থায়ী')}</span>
            <span>•</span>
            <Link href={`/${tenantSlug}/hr/employees`} className="text-blue-600 hover:underline flex items-center gap-0.5 font-medium">
              {tBilingual('Directory', 'তালিকা')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 2: Today Attendance */}
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Today Attendance', 'আজকের উপস্থিতি')}
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{attendanceRate}%</span>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              ({presentTodayCount}/{totalEmployeesCount})
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span className="text-amber-600 font-medium">{lateTodayCount} {tBilingual('Late', 'দেরি')}</span>
            <span>•</span>
            <span className="text-rose-600 font-medium">{absentTodayCount} {tBilingual('Absent', 'অনুপস্থিত')}</span>
            <span>•</span>
            <Link href={`/${tenantSlug}/hr/attendance`} className="text-emerald-600 hover:underline flex items-center gap-0.5 font-medium">
              {tBilingual('Floor', 'ফ্লোর')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>

        {/* Card 3: Overtime Radar */}
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Overtime Approvals', 'ওভারটাইম অনুমোদন')}
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">{pendingOvertime.length}</span>
            <span className="text-xs text-amber-600 font-medium">{tBilingual('pending review', 'অনুমোদন বাকি')}</span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>
              {tBilingual('This Mo:', 'চলতি মাস:')}{' '}
              <strong className="text-slate-900 dark:text-slate-100">{formatBDT(summary?.monthFinancials.approvedOtAmount || 0)}</strong>
            </span>
          </div>
        </Card>

        {/* Card 4: Monthly Gross Payroll & Dues */}
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Monthly Payroll Est.', 'চলতি মাসের বেতন প্রাক্কলন')}
            </span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {formatBDT(summary?.monthFinancials.grossPayroll || 0)}
            </span>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800/80 pt-2">
            <span>{tBilingual('Advances:', 'অগ্রিম:')} {formatBDT(summary?.monthFinancials.advancesOutstanding || 0)}</span>
            <span>•</span>
            <Link href={`/${tenantSlug}/hr/salary-report`} className="text-purple-600 hover:underline flex items-center gap-0.5 font-medium">
              {tBilingual('Report', 'রিপোর্ট')} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </Card>
      </div>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column (2 spans): Today's Floor Attendance Live Stream + Departmental Distribution */}
        <div className="lg:col-span-2 space-y-5">
          {/* Widget 1: Today Floor Attendance Radar */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
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
              <Button asChild variant="ghost" size="sm" className="text-xs text-blue-600 dark:text-blue-400 gap-1 font-semibold">
                <Link href={`/${tenantSlug}/hr/attendance`}>
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
                  <Button asChild size="sm" variant="outline" className="mt-3 text-xs">
                    <Link href={`/${tenantSlug}/hr/attendance`}>
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
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
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
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
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
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
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
                          <div className="text-[11px] text-slate-500">
                            {formatDate(ot.ot_date)} • {Math.round(ot.duration_minutes / 60 * 10) / 10}h ({ot.duration_minutes}m)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {formatBDT(ot.calculated_amount || 0)}
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
                          className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                        >
                          <Check className="w-3 h-3" />
                          {tBilingual('Approve 1.5x', 'অনুমোদন')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickReviewOt(ot.id, 'rejected')}
                          disabled={isPending}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:border-rose-900 gap-1 font-semibold"
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
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                {tBilingual('HRM Operations Launchpad', 'এইচআরএম দ্রুত লিংক')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 space-y-2">
              <Link
                href={`/${tenantSlug}/hr/employees`}
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
                href={`/${tenantSlug}/hr/attendance`}
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
                href={`/${tenantSlug}/hr/payroll`}
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
                href={`/${tenantSlug}/hr/salary-report`}
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
