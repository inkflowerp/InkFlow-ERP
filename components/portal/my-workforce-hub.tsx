'use client'

import React, { useState } from 'react'
import {
 Clock,
 Calendar,
 CheckCircle2,
 AlertCircle,
 Clock3,
 CalendarRange,
 DollarSign,
 Wallet,
 Coins,
 FileText,
 UserCheck,
 Plus,
 Printer,
 ChevronRight,
 TrendingUp,
 ShieldCheck,
 AlertTriangle,
 Send,
 Download,
 Info,
 Building,
 Sparkles,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatBDT, formatDate } from '@/lib/formatters'
import { useMyWorkforce, LeaveRequestItem } from '@/hooks/use-my-workforce'

export function MyWorkforceHub() {
 const { tBilingual } = useI18n()
 const {
 employee,
 isLoading,
 isClockedIn,
 isClockedOut,
 todayAttendance,
 myAttendances,
 myMonthAttendances,
 presentDaysCount,
 lateDaysCount,
 totalLateMinutes,
 totalWorkedMinutes,
 approvedMonthOtHours,
 otHourlyRate,
 totalOtEarnings,
 myOvertimes,
 myLeaves,
 allowedLeaves,
 consumedMonthLeaves,
 remainingLeaves,
 myAdvances,
 currentAdvanceBalance,
 salaryStructure,
 clockIn,
 clockOut,
 submitLeaveRequest,
 submitAdvanceRequest,
  } = useMyWorkforce()

 const [activeTab, setActiveTab] = useState<'attendance' | 'overtime' | 'leaves' | 'salary' | 'advances'>('attendance')
 const [isPunching, setIsPunching] = useState(false)
 const [punchFeedback, setPunchFeedback] = useState<string | null>(null)

  // Modals
 const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false)
 const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false)
 const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false)

  // Leave Form
 const [leaveForm, setLeaveForm] = useState({
 leave_type: 'casual_leave' as LeaveRequestItem['leave_type'],
 start_date: new Date().toISOString().slice(0, 10),
 end_date: new Date().toISOString().slice(0, 10),
 reason: '',
  })
 const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

  // Advance Form
 const [advanceForm, setAdvanceForm] = useState({
 amount: 5000,
 reason: '',
  })
 const [isSubmittingAdvance, setIsSubmittingAdvance] = useState(false)

  // Handle 1-Tap Clock In
 const handleClockIn = async () => {
 setIsPunching(true)
 setPunchFeedback(null)
 const res = await clockIn()
 setIsPunching(false)
 if (res.success) {
 setPunchFeedback(tBilingual('Punch In recorded successfully!', 'হাজিরা সফলভাবে রেকর্ড করা হয়েছে!'))
    } else {
 setPunchFeedback(res.error || 'Failed to punch in')
    }
  }

  // Handle 1-Tap Clock Out
 const handleClockOut = async () => {
 setIsPunching(true)
 setPunchFeedback(null)
 const res = await clockOut()
 setIsPunching(false)
 if (res.success) {
 setPunchFeedback(tBilingual('Punch Out recorded successfully!', 'প্রস্থান সফলভাবে রেকর্ড করা হয়েছে!'))
    } else {
 setPunchFeedback(res.error || 'Failed to punch out')
    }
  }

  // Handle Submit Leave Request
 const handleLeaveSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!leaveForm.reason.trim()) return
 setIsSubmittingLeave(true)
 const res = await submitLeaveRequest(leaveForm)
 setIsSubmittingLeave(false)
 if (res.success) {
 setIsLeaveModalOpen(false)
 setLeaveForm({
 leave_type: 'casual_leave',
 start_date: new Date().toISOString().slice(0, 10),
 end_date: new Date().toISOString().slice(0, 10),
 reason: '',
      })
 setPunchFeedback(tBilingual('Leave application submitted for approval!', 'ছুটির আবেদন অনুমোদনের জন্য জমা দেওয়া হয়েছে!'))
    }
  }

  // Handle Submit Advance Request
 const handleAdvanceSubmit = async (e: React.FormEvent) => {
 e.preventDefault()
 if (!advanceForm.amount || advanceForm.amount <= 0) return
 setIsSubmittingAdvance(true)
 const res = await submitAdvanceRequest(advanceForm)
 setIsSubmittingAdvance(false)
 if (res.success) {
 setIsAdvanceModalOpen(false)
 setAdvanceForm({ amount: 5000, reason: '' })
 setPunchFeedback(tBilingual('Salary advance request submitted!', 'অগ্রিম বেতনের আবেদন জমা দেওয়া হয়েছে!'))
    }
  }

 return (
    <div className="space-y-6">
      {/* 1. TOP IDENTITY & LIVE PUNCH BANNER */}
      <div className="relative overflow-hidden rounded-xl p-5 sm:p-6 bg-card border border-border shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <Avatar
              src={employee?.profile_picture_url || (employee as any)?.avatar_url || null}
              fallback={employee?.name || 'User'}
              className="w-16 h-16 rounded-full border border-border shrink-0 text-base font-bold bg-muted"
            />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-primary/20 text-primary border-border/30 text-xs">
                  {tBilingual('Employee Self-Service Portal', 'কর্মচারী পোর্টাল ও সেলফ সার্ভিস')}
                </Badge>
                {employee?.employee_id_number && (
                  <Badge variant="outline" className="border-border text-xs">
                    {employee.employee_id_number}
                  </Badge>
                )}
                {employee?.branch_name && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Building className="h-3 w-3"/>
                    {employee.branch_name}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-foreground bangla-text">
                {employee ? tBilingual(employee.name, employee.name_bn || employee.name) : 'Team Member'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{employee?.role || 'Staff Member'}</span>
                {employee?.department && (
                  <> • <span className="capitalize">{employee.department} Department</span></>
                )}
                {employee?.employee_type && (
                  <> • <span className="capitalize">{employee.employee_type}</span></>
                )}
              </p>
            </div>
          </div>

          {/* Today's Punch Station */}
          <div className="bg-card/10 backdrop-blur-md border border-white/15 rounded-xl p-4 sm:p-4.5 min-w-[260px] text-center md:text-right space-y-2.5">
            <div className="text-xs text-primary flex items-center justify-center md:justify-end gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-primary"/>
              <span>{tBilingual('Today’s Shift Status', 'আজকের শিফট স্ট্যাটাস')}</span>
            </div>

            <div className="flex items-center justify-center md:justify-end gap-2">
              {todayAttendance?.check_in_time ? (
                <Badge className="bg-success text-white tabular-nums text-xs px-2.5 py-1">
 IN: {todayAttendance.check_in_time}
                </Badge>
              ) : (
                <Badge variant="outline"className="text-warning border-warning-border/40 text-xs">
                  {tBilingual('Not Clocked In', 'হাজিরা দেওয়া হয়নি')}
                </Badge>
              )}

              {todayAttendance?.check_out_time && (
                <Badge className="bg-primary text-white tabular-nums text-xs px-2.5 py-1">
 OUT: {todayAttendance.check_out_time}
                </Badge>
              )}
            </div>

            {/* Quick Action Button */}
            <div className="flex items-center justify-center md:justify-end gap-2 pt-1">
              {!isClockedIn ? (
                <Button
 size="sm"onClick={handleClockIn}
 disabled={isPunching}
 className="bg-success hover:bg-success text-white font-bold text-xs h-9 px-4 rounded-lg shadow-xs cursor-pointer transition-all">
                  <UserCheck className="h-4 w-4 mr-1.5"/>
                  {isPunching ? tBilingual('Recording...', 'রেকর্ড হচ্ছে...') : tBilingual('1-Tap Punch In', 'হাজিরা দিন (ইন)')}
                </Button>
              ) : !isClockedOut ? (
                <Button
 size="sm"onClick={handleClockOut}
 disabled={isPunching}
 className="bg-primary hover:bg-primary text-white font-bold text-xs h-9 px-4 rounded-lg shadow-xs cursor-pointer transition-all">
                  <Clock3 className="h-4 w-4 mr-1.5"/>
                  {isPunching ? tBilingual('Recording...', 'রেকর্ড হচ্ছে...') : tBilingual('1-Tap Punch Out', 'প্রস্থান (আউট)')}
                </Button>
              ) : (
                <div className="text-xs text-success flex items-center justify-center md:justify-end gap-1 font-semibold">
                  <CheckCircle2 className="h-4 w-4"/>
                  {tBilingual('Shift Completed Today', 'আজকের শিফট সম্পন্ন')}
                </div>
              )}
            </div>

            {punchFeedback && (
              <p className="text-xs text-primary animate-fade-in font-medium">{punchFeedback}</p>
            )}
          </div>
        </div>
      </div>

      {/* 2. 4 CORE METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance & Late */}
        <Card className="border-border shadow-xs hover:border-border transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{tBilingual('This Month Attendance', 'চলতি মাসের হাজিরা')}</span>
              <Calendar className="h-4 w-4 text-primary"/>
            </div>
            <div className="text-2xl font-black tabular-nums text-foreground">
              {presentDaysCount} <span className="text-xs font-normal text-muted-foreground">/ {myMonthAttendances.length || 26} {tBilingual('Days', 'দিন')}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className={lateDaysCount > 0 ? 'text-warning text-warning font-bold' : 'text-muted-foreground'}>
                {lateDaysCount} {tBilingual('Late Arrivals', 'দিন লেট')}
              </span>
              {totalLateMinutes > 0 && (
                <span className="text-destructive text-destructive tabular-nums text-xs font-semibold">
                  {totalLateMinutes}m {tBilingual('total', 'মোট')}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Overtime (OT) */}
        <Card className="border-border shadow-xs hover:border-success-border transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{tBilingual('Approved Overtime (OT)', 'অনুমোদিত ওভারটাইম')}</span>
              <Clock3 className="h-4 w-4 text-success"/>
            </div>
            <div className="text-2xl font-black tabular-nums text-success text-success">
              {approvedMonthOtHours} <span className="text-xs font-normal text-muted-foreground">Hours</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">Rate: ৳{otHourlyRate}/hr</span>
              <span className="font-bold text-success text-success tabular-nums">
                +{formatBDT(totalOtEarnings)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Leave Balance */}
        <Card className="border-border shadow-xs hover:border-border transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{tBilingual('Leave Balance', 'ছুটির ব্যালেন্স')}</span>
              <CalendarRange className="h-4 w-4 text-primary"/>
            </div>
            <div className="text-2xl font-black tabular-nums text-primary text-primary">
              {remainingLeaves} <span className="text-xs font-normal text-muted-foreground">/ {allowedLeaves} {tBilingual('Left', 'বাকি')}</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className="text-muted-foreground">{consumedMonthLeaves} {tBilingual('used this month', 'দিন কাটা হয়েছে')}</span>
              <button
 type="button"onClick={() => setIsLeaveModalOpen(true)}
 className="text-primary text-primary font-bold hover:underline cursor-pointer">
                + {tBilingual('Apply', 'আবেদন')}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Salary & Advance */}
        <Card className="border-border shadow-xs hover:border-border transition-colors">
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-semibold">{tBilingual('Estimated Net Salary', 'আনুমানিক নিট বেতন')}</span>
              <Wallet className="h-4 w-4 text-primary"/>
            </div>
            <div className="text-2xl font-black tabular-nums text-primary text-primary">
              {formatBDT(salaryStructure.netPayable)}
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <span className={currentAdvanceBalance > 0 ? 'text-warning font-semibold' : 'text-muted-foreground'}>
                {tBilingual('Advance:', 'অগ্রিম:')} {formatBDT(currentAdvanceBalance)}
              </span>
              <button
 type="button"onClick={() => setIsAdvanceModalOpen(true)}
 className="text-primary font-bold hover:underline cursor-pointer">
                + {tBilingual('Request', 'অনুরোধ')}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-1.5 border-b border-border overflow-x-auto pb-1">
        <button
 type="button"onClick={() => setActiveTab('attendance')}
 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'attendance'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
          }`}
        >
          {tBilingual('Daily Attendance & Lates', 'দৈনিক হাজিরা ও লেট লগ')}
        </button>

        <button
 type="button"onClick={() => setActiveTab('overtime')}
 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'overtime'
              ? 'bg-success text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
          }`}
        >
          {tBilingual('Overtime Breakdown', 'ওভারটাইম হিসাব')}
        </button>

        <button
 type="button"onClick={() => setActiveTab('leaves')}
 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'leaves'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
          }`}
        >
          {tBilingual('Leaves & Applications', 'ছুটি ও আবেদন')}
        </button>

        <button
 type="button"onClick={() => setActiveTab('salary')}
 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'salary'
              ? 'bg-primary text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
          }`}
        >
          {tBilingual('Salary & Payslip', 'বেতন ও পে-স্লিপ')}
        </button>

        <button
 type="button"onClick={() => setActiveTab('advances')}
 className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
 activeTab === 'advances'
              ? 'bg-warning text-white shadow-xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
          }`}
        >
          {tBilingual('Advance Salary History', 'অগ্রিম বেতন খতিয়ান')}
        </button>
      </div>

      {/* 4. TAB CONTENTS */}

      {/* TAB 1: ATTENDANCE & LATE LOG */}
      {activeTab === 'attendance' && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('My Attendance & Punch History', 'আমার হাজিরা ও পাঞ্চিং ইতিহাস')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual('Showing records for the current calendar month', 'চলতি মাসের প্রতিদিনের উপস্থিতি ও লেট বিবরণ')}
              </p>
            </div>
            <Badge variant="outline"className="text-xs tabular-nums">
              {myAttendances.length} {tBilingual('Logs', 'টি লগ')}
            </Badge>
          </CardHeader>
          <CardContent className="p-0">
            {myAttendances.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {tBilingual('No attendance records logged yet this month.', 'এই মাসে এখনো কোনো হাজিরা রেকর্ড পাওয়া যায়নি।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">{tBilingual('Date', 'তারিখ')}</th>
                      <th className="px-4 py-3">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="px-4 py-3">{tBilingual('In Time', 'প্রবেশ')}</th>
                      <th className="px-4 py-3">{tBilingual('Out Time', 'প্রস্থান')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Worked', 'কাজের সময়')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Late Mins', 'লেট (মিনিট)')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Overtime', 'ওভারটাইম')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {myAttendances.map((att) => {
 const isLate = att.status === 'late' || (att.late_minutes && att.late_minutes > 0)
 return (
                        <tr key={att.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                          <td className="px-4 py-3 tabular-nums font-bold text-foreground whitespace-nowrap">
                            {formatDate(att.attendance_date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge
 className={`text-xs uppercase font-bold ${
 att.status === 'present'
                                  ? 'bg-success-surface text-success bg-success-surface text-success'
                                  : isLate
                                  ? 'bg-warning-surface text-warning bg-warning-surface text-warning'
                                  : att.status === 'absent'
                                  ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                                  : 'bg-muted text-foreground '
                              }`}
                            >
                              {att.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {att.check_in_time || '—'}
                          </td>
                          <td className="px-4 py-3 tabular-nums text-foreground">
                            {att.check_out_time || '—'}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-foreground">
                            {att.worked_duration_formatted || (att.worked_minutes ? `${Math.floor(att.worked_minutes / 60)}h ${att.worked_minutes % 60}m` : '—')}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {isLate ? (
                              <span className="font-bold text-destructive text-destructive">+{att.late_minutes}m</span>
                            ) : (
                              <span className="text-muted-foreground">0m</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {(att.approved_ot_minutes || att.potential_ot_minutes || 0) > 0 ? (
                              <span className="font-bold text-success text-success">
                                {Math.round(((att.approved_ot_minutes || att.potential_ot_minutes || 0) / 60) * 10) / 10}h
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: OVERTIME BREAKDOWN */}
      {activeTab === 'overtime' && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('My Overtime (OT) Sessions', 'আমার ওভারটাইম সেশনসমূহ')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(`Calculated at base hourly rate ৳${otHourlyRate}/hour`, `ঘণ্টাপ্রতি ওভারটাইম রেট ৳${otHourlyRate} অনুযায়ী গণনাকৃত`)}
              </p>
            </div>
            <div className="tabular-nums text-xs font-bold text-success text-success">
              {tBilingual('Total OT Earned:', 'মোট ওটি অর্জন:')} {formatBDT(totalOtEarnings)}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myOvertimes.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {tBilingual('No extra overtime sessions recorded yet.', 'এখনো কোনো অতিরিক্ত ওভারটাইম সেশন জমা হয়নি।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">{tBilingual('Date', 'তারিখ')}</th>
                      <th className="px-4 py-3">{tBilingual('Duration', 'সময়কাল')}</th>
                      <th className="px-4 py-3">{tBilingual('Shift / Reason', 'কারণ')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Rate', 'রেট')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Amount', 'টাকা')}</th>
                      <th className="px-4 py-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {myOvertimes.map((ot) => (
                      <tr key={ot.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 tabular-nums font-bold text-foreground whitespace-nowrap">
                          {formatDate(ot.ot_date)}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {ot.duration_hours || Math.round((ot.duration_minutes / 60) * 10) / 10} Hours
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                          {ot.reason || 'Late Production Run'}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          ৳{ot.effective_ot_rate || otHourlyRate}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-success text-success">
                          {formatBDT(ot.calculated_amount || ((ot.duration_hours || 1) * otHourlyRate))}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge
 className={`text-xs uppercase font-bold ${
 ot.status === 'approved' || ot.status === 'paid'
                                ? 'bg-success-surface text-success bg-success-surface text-success'
                                : ot.status === 'rejected'
                                ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                                : 'bg-warning-surface text-warning bg-warning-surface text-warning'
                            }`}
                          >
                            {ot.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 3: LEAVES & APPLICATIONS */}
      {activeTab === 'leaves' && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('My Leaves & Applications', 'আমার ছুটি ও ছুটির আবেদন')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(`${allowedLeaves} monthly casual/sick leaves allocated`, `মাসে সর্বোচ্চ ${allowedLeaves} দিন বেতনসহ ছুটি অনুমোদিত`)}
              </p>
            </div>
            <Button
 size="sm"onClick={() => setIsLeaveModalOpen(true)}
 className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] h-12 font-bold text-xs h-8 px-3 rounded-lg cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-1"/>
              {tBilingual('Apply for Leave', 'ছুটির আবেদন')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {myLeaves.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {tBilingual('No leave applications submitted yet.', 'এখনো কোনো ছুটির আবেদন করা হয়নি।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">{tBilingual('Type', 'ছুটির ধরন')}</th>
                      <th className="px-4 py-3">{tBilingual('Date Range', 'তারিখ')}</th>
                      <th className="px-4 py-3 text-center">{tBilingual('Days', 'দিন')}</th>
                      <th className="px-4 py-3">{tBilingual('Reason', 'কারণ')}</th>
                      <th className="px-4 py-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {myLeaves.map((lv) => (
                      <tr key={lv.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground capitalize">
                          {lv.leave_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-foreground">
                          {formatDate(lv.start_date)} {lv.start_date !== lv.end_date ? `to ${formatDate(lv.end_date)}` : ''}
                        </td>
                        <td className="px-4 py-3 text-center tabular-nums font-bold">
                          {lv.days_count} {tBilingual('Days', 'দিন')}
                        </td>
                        <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                          {lv.reason}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge
 className={`text-xs uppercase font-bold ${
 lv.status === 'approved'
                                ? 'bg-success-surface text-success bg-success-surface text-success'
                                : lv.status === 'rejected'
                                ? 'bg-danger-surface text-destructive bg-danger-surface text-destructive'
                                : 'bg-warning-surface text-warning bg-warning-surface text-warning'
                            }`}
                          >
                            {lv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 4: SALARY & PAYSLIP */}
      {activeTab === 'salary' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Earnings Breakdown */}
          <Card className="md:col-span-2 border-border shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {tBilingual('Monthly Salary Breakdown', 'মাসিক বেতন ও ভাতার বিবরণ')}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tBilingual('Standard monthly payout structure and allowances', 'বেতন কাঠামো ও অতিরিক্ত ভাতা')}
                </p>
              </div>
              <Button
 size="sm"variant="outline"onClick={() => setIsPayslipModalOpen(true)}
 className="text-xs font-bold h-8 cursor-pointer">
                <Printer className="h-3.5 w-3.5 mr-1"/>
                {tBilingual('View Payslip', 'পে-স্লিপ দেখুন')}
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-border font-semibold">
                  <span>{tBilingual('Basic Salary', 'মূল বেতন (Basic)')}</span>
                  <span className="tabular-nums text-foreground">{formatBDT(salaryStructure.basic)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border text-muted-foreground">
                  <span>{tBilingual('House Rent Allowance', 'বাড়ি ভাড়া ভাতা')}</span>
                  <span className="tabular-nums">{formatBDT(salaryStructure.house)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border text-muted-foreground">
                  <span>{tBilingual('Medical Allowance', 'চিকিৎসা ভাতা')}</span>
                  <span className="tabular-nums">{formatBDT(salaryStructure.medical)}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-border text-muted-foreground">
                  <span>{tBilingual('Transport Allowance', 'যাতায়াত ভাতা')}</span>
                  <span className="tabular-nums">{formatBDT(salaryStructure.transport)}</span>
                </div>
                {salaryStructure.food > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border text-muted-foreground">
                    <span>{tBilingual('Food Allowance', 'খাবার ভাতা')}</span>
                    <span className="tabular-nums">{formatBDT(salaryStructure.food)}</span>
                  </div>
                )}
                {salaryStructure.totalOtEarnings > 0 && (
                  <div className="flex items-center justify-between py-1.5 border-b border-border text-success text-success font-semibold">
                    <span>{tBilingual('Overtime (OT) Bonus', 'ওভারটাইম অর্জন')}</span>
                    <span className="tabular-nums">+{formatBDT(salaryStructure.totalOtEarnings)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b-2 border-input font-bold text-foreground">
                  <span>{tBilingual('Gross Earnings', 'মোট অর্জন (Gross)')}</span>
                  <span className="tabular-nums text-success text-success">{formatBDT(salaryStructure.grossEarnings)}</span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-1.5 text-xs pt-2">
                <span className="font-bold text-foreground">{tBilingual('Deductions', 'কর্তনসমূহ')}:</span>
                <div className="flex items-center justify-between py-1 text-destructive text-destructive font-medium">
                  <span>{tBilingual('Advance Salary Deduction', 'অগ্রিম বেতন কর্তন')}</span>
                  <span className="tabular-nums">-{formatBDT(salaryStructure.advanceDeduction)}</span>
                </div>
                {salaryStructure.lateFine > 0 && (
                  <div className="flex items-center justify-between py-1 text-destructive text-destructive font-medium">
                    <span>{tBilingual('Late Arrival Fine', 'লেট হাজিরার জরিমানা')}</span>
                    <span className="tabular-nums">-{formatBDT(salaryStructure.lateFine)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Net Payable Summary Card */}
          <Card className="border-primary/20 border-border bg-primary/10/40 bg-primary/10 shadow-xs flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs uppercase text-primary text-primary font-bold tracking-wider">
                {tBilingual('Net Disbursable Salary', 'চলতি মাসের নিট প্রদেয়')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="text-3xl font-black tabular-nums text-primary text-primary">
                {formatBDT(salaryStructure.netPayable)}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tBilingual(
                  'Salaries are disbursed between the 1st and 7th of every calendar month into your registered MFS or Bank Account.',
                  'প্রতি মাসের ১ থেকে ৭ তারিখের মধ্যে ব্যাংক বা বিকাশ/নগদে বেতন পরিশোধ করা হয়।'
                )}
              </p>
              <div className="pt-2 border-t border-primary/20 border-border text-xs text-muted-foreground">
                <span>Payment Mode: </span>
                <span className="font-bold text-foreground capitalize">
                  {employee?.payment_method || 'cash'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 5: ADVANCES */}
      {activeTab === 'advances' && (
        <Card className="border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {tBilingual('My Salary Advance Vouchers', 'আমার অগ্রিম বেতন খতিয়ান')}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(`Current active advance balance: ৳${currentAdvanceBalance.toLocaleString()}`, `বর্তমান অবশিষ্ট অগ্রিম বকেয়া: ৳${currentAdvanceBalance.toLocaleString()}`)}
              </p>
            </div>
            <Button
 size="sm"onClick={() => setIsAdvanceModalOpen(true)}
 className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] h-12 font-bold text-xs h-8 px-3 rounded-lg cursor-pointer">
              <Plus className="h-3.5 w-3.5 mr-1"/>
              {tBilingual('Request Advance', 'অগ্রিম আবেদন')}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {myAdvances.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-xs">
                {tBilingual('No salary advance records on file.', 'এখনো কোনো অগ্রিম বেতনের রেকর্ড নেই।')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-muted-foreground border-b border-border uppercase text-xs font-bold">
                    <tr>
                      <th className="px-4 py-3">{tBilingual('Voucher #', 'ভাউচার')}</th>
                      <th className="px-4 py-3">{tBilingual('Date', 'তারিখ')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Disbursed Amount', 'মোট অগ্রিম')}</th>
                      <th className="px-4 py-3 text-right">{tBilingual('Remaining Balance', 'অবশিষ্ট')}</th>
                      <th className="px-4 py-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {myAdvances.map((adv) => (
                      <tr key={adv.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                        <td className="px-4 py-3 tabular-nums font-bold text-warning text-warning">
                          {adv.advance_voucher_number}
                        </td>
                        <td className="px-4 py-3 tabular-nums">
                          {formatDate(adv.disbursed_date)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold">
                          {formatBDT(adv.amount)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-destructive text-destructive font-bold">
                          {formatBDT(adv.remaining_amount !== undefined ? adv.remaining_amount : adv.amount)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <Badge
 className={`text-xs uppercase font-bold ${
 adv.is_settled
                                ? 'bg-muted text-foreground '
                                : adv.status === 'disbursed'
                                ? 'bg-success-surface text-success bg-success-surface text-success'
                                : 'bg-warning-surface text-warning bg-warning-surface text-warning'
                            }`}
                          >
                            {adv.is_settled ? 'Settled' : adv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: APPLY FOR LEAVE */}
      <Dialog open={isLeaveModalOpen} onOpenChange={setIsLeaveModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold bangla-text">
              {tBilingual('Apply for Employee Leave', 'ছুটির জন্য আবেদন করুন')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {tBilingual('Your application will be sent to the department supervisor for review.', 'আবেদনটি অনুমোদনের জন্য সুপারিভাইজারের কাছে পাঠানো হবে।')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleLeaveSubmit} className="space-y-4 mt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">{tBilingual('Leave Type', 'ছুটির ধরন')}</label>
              <select
 value={leaveForm.leave_type}
 onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value as any })}
 className="w-full h-9 px-3 rounded-lg border border-input bg-background">
                <option value="casual_leave">Casual Leave (নৈমিত্তিক ছুটি)</option>
                <option value="sick_leave">Sick Leave (অসুস্থতাজনিত ছুটি)</option>
                <option value="paid_leave">Paid Annual Leave (বাৎসরিক ছুটি)</option>
                <option value="unpaid_leave">Unpaid Leave (বেতনবিহীন ছুটি)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">{tBilingual('Start Date', 'শুরুর তারিখ')}</label>
                <Input
 type="date"value={leaveForm.start_date}
 onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
 className="h-9 text-xs"required
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">{tBilingual('End Date', 'শেষের তারিখ')}</label>
                <Input
 type="date"value={leaveForm.end_date}
 onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
 className="h-9 text-xs"required
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">{tBilingual('Reason for Leave', 'ছুটির সুনির্দিষ্ট কারণ')}</label>
              <textarea
 value={leaveForm.reason}
 onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
 rows={3}
 placeholder="Family emergency / Sick / Vacation..."className="w-full p-2.5 rounded-lg border border-input bg-background text-xs"required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button"variant="outline"size="sm"onClick={() => setIsLeaveModalOpen(false)}>
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button type="submit"size="sm"disabled={isSubmittingLeave} className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] h-12 font-bold">
                {isSubmittingLeave ? tBilingual('Submitting...', 'জমা হচ্ছে...') : tBilingual('Submit Application', 'আবেদন জমা দিন')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: REQUEST SALARY ADVANCE */}
      <Dialog open={isAdvanceModalOpen} onOpenChange={setIsAdvanceModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold bangla-text">
              {tBilingual('Request Salary Advance', 'অগ্রিম বেতনের আবেদন')}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {tBilingual('Advance amounts are deducted in subsequent monthly payroll cycles.', 'অগ্রিম বেতনের টাকা পরবর্তী মাসিক বেতন থেকে কর্তন করা হবে।')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAdvanceSubmit} className="space-y-4 mt-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">{tBilingual('Requested Amount (৳ BDT)', 'অগ্রিম টাকার পরিমাণ (৳)')}</label>
              <Input
 type="number"min={500}
 step={500}
 value={advanceForm.amount}
 onChange={(e) => setAdvanceForm({ ...advanceForm, amount: Number(e.target.value) })}
 className="h-9 text-xs tabular-nums font-bold"required
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">{tBilingual('Reason for Advance', 'অগ্রিম নেওয়ার কারণ')}</label>
              <textarea
 value={advanceForm.reason}
 onChange={(e) => setAdvanceForm({ ...advanceForm, reason: e.target.value })}
 rows={3}
 placeholder="Emergency medical expenses / House rent / Personal..."className="w-full p-2.5 rounded-lg border border-input bg-background text-xs"required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button"variant="outline"size="sm"onClick={() => setIsAdvanceModalOpen(false)}>
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button type="submit"size="sm"disabled={isSubmittingAdvance} className="bg-primary hover:bg-primary/90 text-primary-foreground min-h-[48px] h-12 font-bold">
                {isSubmittingAdvance ? tBilingual('Submitting...', 'জমা হচ্ছে...') : tBilingual('Submit Request', 'অনুরোধ জমা দিন')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: VIEW PAYSLIP VOUCHER */}
      <Dialog open={isPayslipModalOpen} onOpenChange={setIsPayslipModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold bangla-text flex items-center justify-between">
              <span>{tBilingual('Employee Payslip Voucher', 'কর্মচারী বেতন ভাউচার')}</span>
              <Badge variant="outline"className="tabular-nums text-xs">
                {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="border border-border rounded-xl p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="font-black text-sm text-foreground">{employee?.name}</div>
                <div className="text-muted-foreground">{employee?.role} • {employee?.employee_id_number}</div>
              </div>
              <div className="text-right text-muted-foreground tabular-nums">
                <div>{employee?.branch_name || 'Main Press Hub'}</div>
                <div>Status: Active</div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span>Basic Salary:</span>
                <span className="tabular-nums font-bold">{formatBDT(salaryStructure.basic)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>House Rent Allowance:</span>
                <span className="tabular-nums">{formatBDT(salaryStructure.house)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Medical Allowance:</span>
                <span className="tabular-nums">{formatBDT(salaryStructure.medical)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Transport Allowance:</span>
                <span className="tabular-nums">{formatBDT(salaryStructure.transport)}</span>
              </div>
              {salaryStructure.totalOtEarnings > 0 && (
                <div className="flex justify-between text-success font-bold">
                  <span>Overtime Earnings ({approvedMonthOtHours}h):</span>
                  <span className="tabular-nums">+{formatBDT(salaryStructure.totalOtEarnings)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-1 font-bold">
                <span>Gross Total:</span>
                <span className="tabular-nums text-success">{formatBDT(salaryStructure.grossEarnings)}</span>
              </div>
            </div>

            <div className="border-t pt-2 space-y-1.5 text-destructive">
              <div className="flex justify-between">
                <span>Advance Deductions:</span>
                <span className="tabular-nums">-{formatBDT(salaryStructure.advanceDeduction)}</span>
              </div>
              {salaryStructure.lateFine > 0 && (
                <div className="flex justify-between">
                  <span>Late Deductions:</span>
                  <span className="tabular-nums">-{formatBDT(salaryStructure.lateFine)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-border pt-2 flex justify-between font-black text-sm text-foreground">
              <span>NET PAYABLE:</span>
              <span className="tabular-nums text-base text-primary">
                {formatBDT(salaryStructure.netPayable)}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button size="sm"variant="outline"onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5 mr-1"/>
              {tBilingual('Print', 'প্রিন্ট')}
            </Button>
            <Button size="sm"onClick={() => setIsPayslipModalOpen(false)}>
              {tBilingual('Close', 'বন্ধ করুন')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
