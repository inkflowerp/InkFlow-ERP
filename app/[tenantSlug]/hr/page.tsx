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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-xl text-primary ring-1 ring-primary/20">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {tBilingual('HRM Dashboard', 'এইচআরএম ড্যাশবোর্ড')}
                <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs">
                  Live
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                {tBilingual(
                  'Workforce command center, realtime attendance radar & payroll intelligence',
                  'কর্মী ব্যবস্থাপনা, লাইভ হাজিরা পর্যবেক্ষণ ও বেতন নিয়ন্ত্রণ কেন্দ্র'
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
            onClick={loadData}
            disabled={isLoading}
            className="gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            {tBilingual('Refresh', 'রিফ্রেশ')}
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9">
            <Link href={`/${tenantSlug}/hr/attendance`}>
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {tBilingual('Floor Attendance', 'হাজিরা')}
            </Link>
          </Button>

          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs h-9">
            <Link href={`/${tenantSlug}/hr/payroll`}>
              <Wallet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              {tBilingual('Payroll & Salary', 'পেরোল ও বেতন')}
            </Link>
          </Button>

          <Button asChild size="sm" className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground">
            <Link href={`/${tenantSlug}/hr/employees?action=new`}>
              <UserPlus className="w-3.5 h-3.5" />
              {tBilingual('Add Employee', 'নতুন কর্মী')}
            </Link>
          </Button>
        </div>
      </div>

      {/* 4 Top Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Workforce */}
        <Card className="border-border/60 bg-card hover:border-primary/40 transition-colors shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Total Workforce', 'মোট কর্মী')}
              </span>
              <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{totalEmployeesCount}</span>
              <span className="text-xs text-muted-foreground">{tBilingual('active staff', 'সক্রিয় কর্মী')}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
              <span>{employees.filter((e) => e.employee_type === 'permanent').length} {tBilingual('Permanent', 'স্থায়ী')}</span>
              <span>•</span>
              <span>{employees.filter((e) => e.is_daily_worker || e.employee_type === 'daily_worker').length} {tBilingual('Daily', 'দৈনিক')}</span>
              <span>•</span>
              <Link href={`/${tenantSlug}/hr/employees`} className="text-primary hover:underline flex items-center gap-0.5">
                {tBilingual('View list', 'তালিকা')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Today Attendance */}
        <Card className="border-border/60 bg-card hover:border-emerald-500/40 transition-colors shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Today Attendance', 'আজকের উপস্থিতি')}
              </span>
              <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{attendanceRate}%</span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                ({presentTodayCount}/{totalEmployeesCount} {tBilingual('present', 'উপস্থিত')})
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
              <span className="text-amber-600 dark:text-amber-400 font-medium">{lateTodayCount} {tBilingual('Late', 'দেরি')}</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium">{absentTodayCount} {tBilingual('Absent', 'অনুপস্থিত')}</span>
              <span>•</span>
              <Link href={`/${tenantSlug}/hr/attendance`} className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5">
                {tBilingual('Details', 'বিস্তারিত')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Overtime Radar */}
        <Card className="border-border/60 bg-card hover:border-amber-500/40 transition-colors shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Overtime Approvals', 'ওভারটাইম অনুমোদন')}
              </span>
              <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground">{pendingOvertime.length}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{tBilingual('pending review', 'অনুমোদন বাকি')}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
              <span>
                {tBilingual('Approved this mo:', 'চলতি মাস:')}{' '}
                <strong className="text-foreground">{formatBDT(summary?.monthFinancials.approvedOtAmount || 0)}</strong>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Monthly Gross Payroll & Dues */}
        <Card className="border-border/60 bg-card hover:border-purple-500/40 transition-colors shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {tBilingual('Monthly Payroll Est.', 'চলতি মাসের বেতন প্রাক্কলন')}
              </span>
              <div className="p-2 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-lg">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {formatBDT(summary?.monthFinancials.grossPayroll || 0)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2.5">
              <span>{tBilingual('Advances:', 'অগ্রিম:')} {formatBDT(summary?.monthFinancials.advancesOutstanding || 0)}</span>
              <span>•</span>
              <Link href={`/${tenantSlug}/hr/salary-report`} className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5">
                {tBilingual('Report', 'রিপোর্ট')} <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Two-Column Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Today's Floor Attendance Live Stream + Departmental Distribution */}
        <div className="lg:col-span-2 space-y-6">
          {/* Widget 1: Today Floor Attendance Radar */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  {tBilingual("Today's Floor Attendance Radar", 'আজকের কারখানার লাইভ উপস্থিতি')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual('Realtime clock-in/out logs for shop-floor operators and staff', 'কারখানার অপারেটর ও কর্মীদের লাইভ প্রবেশ ও প্রস্থান')}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs text-primary gap-1">
                <Link href={`/${tenantSlug}/hr/attendance`}>
                  {tBilingual('Manage Attendance', 'হাজিরা পরিচালনা')}
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
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-500" />
                {tBilingual('Departmental Workforce Distribution', 'বিভাগভিত্তিক কর্মী বণ্টন')}
              </CardTitle>
              <CardDescription className="text-xs">
                {tBilingual('Headcount allocated per production and management unit', 'প্রোডাকশন ও ম্যানেজমেন্ট অনুযায়ী মোট জনবল')}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              {Object.keys(departmentCounts).length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {tBilingual('No active departments found.', 'কোন বিভাগ পাওয়া যায়নি।')}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {Object.entries(departmentCounts).map(([dept, count]) => {
                    const pct = totalEmployeesCount > 0 ? Math.round((count / totalEmployeesCount) * 100) : 0
                    return (
                      <div key={dept} className="p-3.5 rounded-xl border border-border/60 bg-muted/20 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold capitalize text-foreground">{dept}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-bold">
                            {count}
                          </Badge>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{pct}% of team</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${pct}%` }} />
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
        <div className="space-y-6">
          {/* Widget 3: Pending Overtime Approvals Queue */}
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  {tBilingual('Pending Overtime', 'অনুমোদনযোগ্য ওভারটাইম')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {tBilingual('Requests awaiting floor manager verification', 'ম্যানেজারের অনুমোদনের অপেক্ষায় থাকা আবেদন')}
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                {pendingOvertime.length}
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {pendingOvertime.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-500/60 mb-2" />
                  <p>{tBilingual('No pending overtime requests.', 'সব ওভারটাইম অনুমোদন সম্পন্ন হয়েছে।')}</p>
                </div>
              ) : (
                <div className="divide-y divide-border/40 max-h-80 overflow-y-auto">
                  {pendingOvertime.map((ot) => (
                    <div key={ot.id} className="p-4 space-y-2 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-semibold text-foreground">{ot.employee_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(ot.ot_date)} • {Math.round(ot.duration_minutes / 60 * 10) / 10}h ({ot.duration_minutes}m)
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-amber-600 dark:text-amber-400">
                            {formatBDT(ot.calculated_amount || 0)}
                          </div>
                          <span className="text-[10px] text-muted-foreground capitalize">{ot.ot_type.replace('_', ' ')}</span>
                        </div>
                      </div>

                      {ot.reason && (
                        <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-1.5 rounded">
                          "{ot.reason}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => handleQuickReviewOt(ot.id, 'approved')}
                          disabled={isPending}
                          className="h-7 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <Check className="w-3 h-3" />
                          {tBilingual('Approve 1.5x', 'অনুমোদন')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuickReviewOt(ot.id, 'rejected')}
                          disabled={isPending}
                          className="h-7 text-xs text-rose-600 hover:bg-rose-500/10 border-rose-500/30 gap-1"
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
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="p-5 pb-3 border-b border-border/50">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {tBilingual('HRM Operations Launchpad', 'এইচআরএম দ্রুত লিংক')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              <Link
                href={`/${tenantSlug}/hr/employees`}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-primary/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{tBilingual('Employee Directory', 'কর্মীদের তালিকা')}</div>
                    <div className="text-[11px] text-muted-foreground">{tBilingual('View profiles, salaries & contracts', 'প্রোফাইল ও বেতন বিবরণ')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link
                href={`/${tenantSlug}/hr/attendance`}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-emerald-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg group-hover:scale-105 transition-transform">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{tBilingual('Floor Attendance & Punch', 'হাজিরা ও পাঞ্চিং')}</div>
                    <div className="text-[11px] text-muted-foreground">{tBilingual('Daily logs, QR scan & shifts', 'দৈনিক হাজিরা ও শিফট')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 transition-colors" />
              </Link>

              <Link
                href={`/${tenantSlug}/hr/payroll`}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-purple-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-600 rounded-lg group-hover:scale-105 transition-transform">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{tBilingual('Payroll & Salary Sheets', 'পেরোল ও বেতন শিট')}</div>
                    <div className="text-[11px] text-muted-foreground">{tBilingual('Generate drafts & disburse pay', 'বেতন শিট তৈরি ও প্রদান')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-500 transition-colors" />
              </Link>

              <Link
                href={`/${tenantSlug}/hr/salary-report`}
                className="p-3 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-amber-500/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{tBilingual('Salary & Payout Reports', 'বেতন ও ব্যাংক রিপোর্ট')}</div>
                    <div className="text-[11px] text-muted-foreground">{tBilingual('Bank advice sheets & CSV export', 'ব্যাংক অ্যাডভাইস শিট ও এক্সপোর্ট')}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
