'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Attendance, Time Tracking & Overtime Hub
// Designed for Bangladeshi Print & Signage Owners, Floor In-charges & HR
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  UserCheck,
  Clock,
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  QrCode,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Check,
  X,
  Printer,
  ShieldCheck,
  Building,
  Radio,
  FileText,
  SlidersHorizontal,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'
import { PrintableQrPoster } from '@/components/attendance/printable-qr-poster'
import { formatBDT, formatDate } from '@/lib/formatters'
import type {
  EmployeeRecord,
  ShiftRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
} from '@/types/workforce.types'
import {
  getEmployeesAction,
  getShiftsAction,
  createShiftAction,
  getDailyAttendanceAction,
  recordAttendanceSummaryAction,
  getOvertimeRecordsAction,
  createOvertimeRequestAction,
  reviewOvertimeAction,
} from '@/actions/workforce.actions'

export default function AttendancePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'roster' | 'overtime' | 'shifts'>('roster')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Data States
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [shifts, setShifts] = useState<ShiftRecord[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [deptFilter, setDeptFilter] = useState('ALL')

  // Modals
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [isOtModalOpen, setIsOtModalOpen] = useState(false)
  const [isNewShiftModalOpen, setIsNewShiftModalOpen] = useState(false)
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false)
  const [isQrPosterOpen, setIsQrPosterOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<AttendanceDailySummaryRecord | null>(null)

  // Manual Attendance Form
  const [manualForm, setManualForm] = useState<{
    employeeId: string
    attendanceDate: string
    status: AttendanceDailySummaryRecord['status']
    checkInTime: string
    checkOutTime: string
    shiftId: string
    notes: string
  }>({
    employeeId: '',
    attendanceDate: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '09:00',
    checkOutTime: '18:00',
    shiftId: '',
    notes: 'Floor manual attendance entry',
  })

  // Overtime Form
  const [otForm, setOtForm] = useState<{
    employeeId: string
    otDate: string
    durationMinutes: number
    otType: OvertimeRecord['ot_type']
    reason: string
  }>({
    employeeId: '',
    otDate: new Date().toISOString().split('T')[0],
    durationMinutes: 120,
    otType: 'regular_day',
    reason: 'Urgent production delivery overtime',
  })

  // Shift Form
  const [shiftForm, setShiftForm] = useState<{
    shift_name: string
    start_time: string
    end_time: string
    grace_period_minutes: number
    is_overnight: boolean
  }>({
    shift_name: 'Regular Day Shift',
    start_time: '09:00',
    end_time: '18:00',
    grace_period_minutes: 15,
    is_overnight: false,
  })

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [empRes, attRes, otRes, shiftRes] = await Promise.all([
        getEmployeesAction({ status: 'active' }),
        getDailyAttendanceAction({ date: selectedDate }),
        getOvertimeRecordsAction(),
        getShiftsAction(),
      ])

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (attRes.success && attRes.data) setAttendanceRecords(attRes.data)
      if (otRes.success && otRes.data) setOvertimeRecords(otRes.data)
      if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data)
    } catch (err: any) {
      console.error('Failed to load attendance data', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [selectedDate])

  // Date Navigator Helpers
  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0])
  }

  const handleOpenManualModal = (emp?: EmployeeRecord, existing?: AttendanceDailySummaryRecord) => {
    if (existing) {
      setSelectedAttendance(existing)
      setManualForm({
        employeeId: existing.employee_id,
        attendanceDate: existing.attendance_date,
        status: existing.status,
        checkInTime: existing.check_in_time || '09:00',
        checkOutTime: existing.check_out_time || '18:00',
        shiftId: existing.shift_id || '',
        notes: existing.notes || '',
      })
    } else {
      setSelectedAttendance(null)
      setManualForm({
        employeeId: emp?.id || employees[0]?.id || '',
        attendanceDate: selectedDate,
        status: 'present',
        checkInTime: '09:00',
        checkOutTime: '18:00',
        shiftId: shifts[0]?.id || '',
        notes: 'Floor manual attendance',
      })
    }
    setIsManualModalOpen(true)
  }

  const handleSaveManualAttendance = async () => {
    if (!manualForm.employeeId) {
      notify('Please select an employee.')
      return
    }

    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: manualForm.employeeId,
        attendanceDate: manualForm.attendanceDate,
        status: manualForm.status,
        checkInTime: manualForm.checkInTime,
        checkOutTime: manualForm.checkOutTime,
        shiftId: manualForm.shiftId || undefined,
        attendanceSource: 'manual',
        notes: manualForm.notes,
      })

      if (res.success) {
        notify('Attendance record saved successfully.')
        setIsManualModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to record attendance.')
      }
    })
  }

  const handleSaveOtRequest = async () => {
    if (!otForm.employeeId) {
      notify('Please select an employee.')
      return
    }

    startTransition(async () => {
      const res = await createOvertimeRequestAction({
        employeeId: otForm.employeeId,
        otDate: otForm.otDate,
        durationMinutes: Number(otForm.durationMinutes),
        otType: otForm.otType,
        reason: otForm.reason,
      })

      if (res.success) {
        notify('Overtime request submitted for approval.')
        setIsOtModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to submit overtime request.')
      }
    })
  }

  const handleReviewOt = async (id: string, status: 'approved' | 'rejected', multiplier = 1.5) => {
    startTransition(async () => {
      const res = await reviewOvertimeAction({ id, status, multiplier })
      if (res.success) {
        notify(`Overtime request ${status === 'approved' ? 'Approved' : 'Rejected'}.`)
        loadData()
      } else {
        notify(res.error || 'Failed to review overtime.')
      }
    })
  }

  const handleCreateShift = async () => {
    if (!shiftForm.shift_name.trim()) {
      notify('Please enter shift name.')
      return
    }

    startTransition(async () => {
      const res = await createShiftAction({
        shift_name: shiftForm.shift_name,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
        grace_period_minutes: Number(shiftForm.grace_period_minutes),
        is_overnight: shiftForm.is_overnight,
      })

      if (res.success) {
        notify('New work shift created successfully.')
        setIsNewShiftModalOpen(false)
        loadData()
      } else {
        notify(res.error || 'Failed to create shift.')
      }
    })
  }

  // Attendance Calculations for Selected Date
  const presentCount = attendanceRecords.filter((a) => a.status === 'present' || a.status === 'half_day').length
  const lateCount = attendanceRecords.filter((a) => a.status === 'late' || (a.late_minutes && a.late_minutes > 0)).length
  const absentCount = attendanceRecords.filter((a) => a.status === 'absent').length
  const leaveCount = attendanceRecords.filter((a) => a.status === 'leave').length
  const fieldCount = attendanceRecords.filter((a) => a.status === 'field_work' || a.job_order_id).length
  const totalPotentialOtMins = attendanceRecords.reduce((sum, a) => sum + (a.potential_ot_minutes || 0), 0)

  // Map employee rows with their attendance record for the date
  const combinedRoster = React.useMemo(() => {
    return employees.map((emp) => {
      const att = attendanceRecords.find((a) => a.employee_id === emp.id)
      return {
        emp,
        att: att || null,
      }
    }).filter(({ emp, att }) => {
      const matchSearch =
        !searchTerm.trim() ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase())
      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter
      const matchStatus = statusFilter === 'ALL' || (att ? att.status === statusFilter : statusFilter === 'unmarked')
      return matchSearch && matchDept && matchStatus
    })
  }, [employees, attendanceRecords, searchTerm, deptFilter, statusFilter])

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
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {tBilingual('Floor Attendance & Overtime', 'কারখানার হাজিরা ও ওভারটাইম')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tBilingual(
                  'Daily check-ins, QR scan station, late monitoring & overtime approvals',
                  'দৈনিক উপস্থিতি, কিউআর কোড স্ক্যান, বিলম্ব পর্যবেক্ষণ ও ওভারটাইম অনুমোদন'
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
            onClick={() => setIsQrPosterOpen(true)}
            className="gap-1.5 text-xs h-9"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
            {tBilingual('Print QR Poster', 'পোস্টার প্রিন্ট')}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPunchModalOpen(true)}
            className="gap-1.5 text-xs h-9 bg-emerald-500/10 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20"
          >
            <QrCode className="w-3.5 h-3.5" />
            {tBilingual('Live QR Scanner', 'কিউআর স্ক্যানার')}
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenManualModal()}
            className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Mark Manual Attendance', 'ম্যানুয়াল হাজিরা')}
          </Button>
        </div>
      </div>

      {/* Date Navigator Bar & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 border border-border/60 rounded-xl p-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'roster' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('roster')}
            className="text-xs h-8 gap-1.5"
          >
            <UserCheck className="w-3.5 h-3.5" />
            {tBilingual('Floor Roster', 'দৈনিক হাজিরা তালিকা')}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'overtime' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('overtime')}
            className="text-xs h-8 gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            {tBilingual('Overtime Approvals', 'ওভারটাইম অনুমোদন')}
            {overtimeRecords.filter((o) => o.status === 'pending_approval').length > 0 && (
              <Badge variant="outline" className="text-[10px] px-1 bg-amber-500/20 text-amber-600 border-amber-500/40">
                {overtimeRecords.filter((o) => o.status === 'pending_approval').length}
              </Badge>
            )}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'shifts' ? 'secondary' : 'ghost'}
            onClick={() => setActiveTab('shifts')}
            className="text-xs h-8 gap-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {tBilingual('Shift Config', 'শিফট কনফিগ')}
          </Button>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handlePrevDay} title="Previous Day">
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs h-8 w-36"
          />

          <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={handleNextDay} title="Next Day">
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button size="sm" variant="secondary" className="text-xs h-8 px-2.5" onClick={handleToday}>
            {tBilingual('Today', 'আজ')}
          </Button>
        </div>
      </div>

      {/* Tab 1: Floor Attendance Daily Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Top KPI Metrics Row for Selected Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('Present', 'উপস্থিত')}
              </span>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {presentCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('Late Check-ins', 'দেরিতে প্রবেশ')}
              </span>
              <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {lateCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('Absent', 'অনুপস্থিত')}
              </span>
              <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                {absentCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('On Leave', 'ছুটিতে')}
              </span>
              <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                {leaveCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('Field Work', 'বাইরের কাজ')}
              </span>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {fieldCount}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm">
              <span className="text-[11px] text-muted-foreground uppercase font-medium">
                {tBilingual('Potential OT', 'সম্ভাব্য ওভারটাইম')}
              </span>
              <div className="text-xl font-bold text-foreground mt-0.5">
                {Math.round(totalPotentialOtMins / 60 * 10) / 10}h
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={tBilingual('Search employee...', 'কর্মী খুঁজুন...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-8"
                  />
                </div>

                <select
                  aria-label="Filter roster by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="ALL">{tBilingual('All Statuses', 'সব স্ট্যাটাস')}</option>
                  <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                  <option value="unmarked">{tBilingual('Unmarked', 'হাজিরা দেওয়া হয়নি')}</option>
                </select>

                <select
                  aria-label="Filter roster by department"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
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

              <div className="text-xs text-muted-foreground font-mono">
                Date: {formatDate(selectedDate)}
              </div>
            </CardContent>
          </Card>

          {/* Roster Table */}
          <Card className="border-border/60 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
                    <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                    <th className="p-3.5">{tBilingual('Shift', 'শিফট')}</th>
                    <th className="p-3.5">{tBilingual('Check In', 'প্রবেশ')}</th>
                    <th className="p-3.5">{tBilingual('Check Out', 'প্রস্থান')}</th>
                    <th className="p-3.5">{tBilingual('Worked Hours', 'কাজের সময়')}</th>
                    <th className="p-3.5">{tBilingual('Late / OT', 'দেরি / ওভারটাইম')}</th>
                    <th className="p-3.5">{tBilingual('Source', 'উৎস')}</th>
                    <th className="p-3.5">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                    <th className="p-3.5 pr-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {combinedRoster.map(({ emp, att }) => (
                    <tr key={emp.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-semibold text-foreground">{emp.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {emp.employee_id_number} • <span className="capitalize">{emp.department}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-muted-foreground">
                        {att?.shift_name || 'Regular Shift (09:00 - 18:00)'}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_in_time ? (
                          <span className="font-semibold text-foreground">{att.check_in_time}</span>
                        ) : (
                          <span className="text-muted-foreground">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_out_time ? (
                          <span className="font-semibold text-foreground">{att.check_out_time}</span>
                        ) : att?.check_in_time ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            On Floor
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.working_minutes ? (
                          <span>{Math.round((att.working_minutes / 60) * 10) / 10} hrs</span>
                        ) : (
                          <span className="text-muted-foreground">0 hrs</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          {att?.late_minutes && att.late_minutes > 0 ? (
                            <div className="text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                              +{att.late_minutes}m Late
                            </div>
                          ) : null}
                          {att?.potential_ot_minutes && att.potential_ot_minutes > 0 ? (
                            <div className="text-purple-600 dark:text-purple-400 font-medium text-[11px]">
                              +{Math.round((att.potential_ot_minutes / 60) * 10) / 10}h OT
                            </div>
                          ) : null}
                          {!att?.late_minutes && !att?.potential_ot_minutes && (
                            <span className="text-muted-foreground text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0">
                          {att?.attendance_source || 'manual'}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        {att ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 capitalize ${
                              att.status === 'present'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                : att.status === 'late'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                : att.status === 'absent'
                                ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                : 'bg-blue-500/10 text-blue-600 border-blue-500/30'
                            }`}
                          >
                            {att.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground border-dashed">
                            Unmarked
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-primary hover:underline px-2"
                          onClick={() => handleOpenManualModal(emp, att || undefined)}
                        >
                          {att ? tBilingual('Edit', 'সম্পাদন') : tBilingual('Mark', 'হাজিরা দিন')}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Overtime Approvals Hub */}
      {activeTab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {tBilingual('Overtime Requests & Approvals Queue', 'ওভারটাইম অনুমোদন ও নিয়ন্ত্রণ')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Review, adjust multiplier and approve floor overtime hours before payroll closing', 'পেরোল ক্লোজিংয়ের আগে ওভারটাইম ঘণ্টা ও গুণক অনুমোদন করুন')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsOtModalOpen(true)} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Submit Overtime Request', 'ওভারটাইম আবেদন')}
            </Button>
          </div>

          {overtimeRecords.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h4 className="text-base font-bold text-foreground">{tBilingual('No overtime records found', 'কোন ওভারটাইম তথ্য পাওয়া যায়নি')}</h4>
              <p className="text-xs text-muted-foreground mt-1">{tBilingual('Submit an overtime request for floor staff when completing rush orders.', 'জরুরি অর্ডারের ক্ষেত্রে কর্মীদের ওভারটাইম আবেদন জমা দিন।')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overtimeRecords.map((ot) => (
                <Card key={ot.id} className="border-border/60 shadow-sm space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{ot.employee_name}</h4>
                      <p className="text-xs text-muted-foreground">{formatDate(ot.ot_date)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 capitalize ${
                        ot.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                          : ot.status === 'pending_approval'
                          ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                      }`}
                    >
                      {ot.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tBilingual('Duration:', 'সময়কাল:')}</span>
                      <span className="font-semibold text-foreground">{Math.round((ot.duration_minutes / 60) * 10) / 10} hrs ({ot.duration_minutes}m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{tBilingual('Multiplier:', 'গুণক:')}</span>
                      <span className="font-mono font-medium">{ot.rate_multiplier}x</span>
                    </div>
                    <div className="flex justify-between border-t border-border/40 pt-1">
                      <span className="text-muted-foreground font-medium">{tBilingual('Calculated Payout:', 'প্রদেয় অর্থ:')}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{formatBDT(ot.calculated_amount || 0)}</span>
                    </div>
                  </div>

                  {ot.reason && (
                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                      "{ot.reason}"
                    </p>
                  )}

                  {ot.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                      <Button
                        size="sm"
                        onClick={() => handleReviewOt(ot.id, 'approved', 1.5)}
                        disabled={isPending}
                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {tBilingual('Approve 1.5x', 'অনুমোদন')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewOt(ot.id, 'rejected')}
                        disabled={isPending}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-500/10 border-rose-500/30 gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        {tBilingual('Reject', 'বাতিল')}
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shift Management */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {tBilingual('Shop Floor Work Shifts', 'কারখানার কাজের শিফট')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Define factory operating hours, grace period and overnight schedules', 'কারখানার কাজের সময়, শিফট শুরু-শেষ ও গ্রেস পিরিয়ড নির্ধারণ')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsNewShiftModalOpen(true)} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Create New Shift', 'নতুন শিফট')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <Card key={shift.id} className="border-border/60 shadow-sm p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{shift.shift_name}</h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      {shift.start_time} → {shift.end_time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    Active
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1 bg-muted/20 p-2.5 rounded border border-border/40">
                  <div>Grace Period: <strong>{shift.grace_period_minutes || 15} mins</strong></div>
                  <div>Overnight Shift: <strong>{shift.is_overnight ? 'Yes' : 'No'}</strong></div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mark Manual Attendance Modal */}
      {isManualModalOpen && (
        <ModalDialog
          isOpen={isManualModalOpen}
          onClose={() => setIsManualModalOpen(false)}
          title={tBilingual('Record Manual Attendance', 'ম্যানুয়াল হাজিরা সংরক্ষণ')}
          description={tBilingual('Mark or adjust check-in / check-out times and status for floor operators', 'কর্মীদের প্রবেশ ও প্রস্থান সময় এবং স্ট্যাটাস নির্ধারণ করুন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Select Employee *', 'কর্মী নির্বাচন *')}</Label>
              <select
                value={manualForm.employeeId}
                onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
              >
                <option value="">{tBilingual('-- Select Employee --', '-- কর্মী নির্বাচন করুন --')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number}) - {emp.department}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Attendance Date', 'হাজিরার তারিখ')}</Label>
                <Input
                  type="date"
                  value={manualForm.attendanceDate}
                  onChange={(e) => setManualForm({ ...manualForm, attendanceDate: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Status', 'স্ট্যাটাস')}</Label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
                >
                  <option value="present">{tBilingual('Present', 'উপস্থিত')}</option>
                  <option value="late">{tBilingual('Late', 'দেরি')}</option>
                  <option value="absent">{tBilingual('Absent', 'অনুপস্থিত')}</option>
                  <option value="half_day">{tBilingual('Half Day', 'অর্ধ দিবস')}</option>
                  <option value="leave">{tBilingual('Leave', 'ছুটি')}</option>
                  <option value="field_work">{tBilingual('Field Work', 'বাইরের কাজ')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check In Time', 'প্রবেশ সময়')}</Label>
                <Input
                  type="time"
                  value={manualForm.checkInTime}
                  onChange={(e) => setManualForm({ ...manualForm, checkInTime: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check Out Time', 'প্রস্থান সময়')}</Label>
                <Input
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Notes / Reason', 'মন্তব্য / কারণ')}</Label>
              <Input
                placeholder="e.g. Floor manual entry after late evening delivery"
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManualModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveManualAttendance}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Save Record', 'সংরক্ষণ')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Submit Overtime Modal */}
      {isOtModalOpen && (
        <ModalDialog
          isOpen={isOtModalOpen}
          onClose={() => setIsOtModalOpen(false)}
          title={tBilingual('Submit Overtime Request', 'ওভারটাইম আবেদন জমা')}
          description={tBilingual('Record extra working hours performed by operators for rush jobs', 'জরুরি কাজের জন্য অতিরিক্ত সময়ের হিসাব জমা দিন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Select Employee *', 'কর্মী নির্বাচন *')}</Label>
              <select
                value={otForm.employeeId}
                onChange={(e) => setOtForm({ ...otForm, employeeId: e.target.value })}
                className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
              >
                <option value="">{tBilingual('-- Select Employee --', '-- কর্মী নির্বাচন করুন --')}</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employee_id_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Overtime Date', 'তারিখ')}</Label>
                <Input
                  type="date"
                  value={otForm.otDate}
                  onChange={(e) => setOtForm({ ...otForm, otDate: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Duration (Minutes)', 'সময়কাল (মিনিট)')}</Label>
                <Input
                  type="number"
                  value={otForm.durationMinutes}
                  onChange={(e) => setOtForm({ ...otForm, durationMinutes: Number(e.target.value) })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Reason / Job Description', 'কাজের বিবরণ')}</Label>
              <Input
                placeholder="e.g. Urgent billboard print & finishing run"
                value={otForm.reason}
                onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOtModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOtRequest}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Submit Request', 'আবেদন করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Create Shift Modal */}
      {isNewShiftModalOpen && (
        <ModalDialog
          isOpen={isNewShiftModalOpen}
          onClose={() => setIsNewShiftModalOpen(false)}
          title={tBilingual('Create Shift Schedule', 'নতুন শিফট তৈরি')}
          description={tBilingual('Define start, end time and grace periods for factory shifts', 'শিফটের সময় ও শিডিউল কনফিগার করুন')}
          size="md"
        >
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Shift Name *', 'শিফট নাম *')}</Label>
              <Input
                placeholder="e.g. Morning Production Shift"
                value={shiftForm.shift_name}
                onChange={(e) => setShiftForm({ ...shiftForm, shift_name: e.target.value })}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Start Time', 'শুরু সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('End Time', 'শেষ সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Grace Period (Minutes)', 'বিলম্ব ছাড় (মিনিট)')}</Label>
              <Input
                type="number"
                value={shiftForm.grace_period_minutes}
                onChange={(e) => setShiftForm({ ...shiftForm, grace_period_minutes: Number(e.target.value) })}
                className="text-xs h-9"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewShiftModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateShift}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Save Shift', 'সংরক্ষণ')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* QR Camera Punch Modal */}
      {isPunchModalOpen && (
        <AttendancePunchModal
          isOpen={isPunchModalOpen}
          onClose={() => {
            setIsPunchModalOpen(false)
            loadData()
          }}
          punchType="CHECK_IN"
        />
      )}

      {/* Printable QR Poster Modal */}
      {isQrPosterOpen && (
        <ModalDialog
          isOpen={isQrPosterOpen}
          onClose={() => setIsQrPosterOpen(false)}
          title={tBilingual('Print Attendance QR Poster', 'হাজিরা কিউআর কোড পোস্টার')}
          description={tBilingual('Print and display this poster at the shop floor entrance', 'কারখানার প্রবেশদ্বারে টানানোর জন্য প্রিন্ট করুন')}
          size="lg"
        >
          <PrintableQrPoster />
        </ModalDialog>
      )}
    </div>
  )
}
