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
import { PageHeader } from '@/components/shared/page-header'
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

      {/* Page Header */}
      <PageHeader
        titleEn="Floor Attendance & Overtime"
        titleBn="কারখানার হাজিরা ও ওভারটাইম"
        descriptionEn="Daily check-ins, QR scan station, late monitoring & overtime approvals"
        descriptionBn="দৈনিক উপস্থিতি, কিউআর কোড স্ক্যান, বিলম্ব পর্যবেক্ষণ ও ওভারটাইম অনুমোদন"
        icon={UserCheck}
        iconColor="text-emerald-600 dark:text-emerald-400"
        badge={
          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 bangla-text">
            {tBilingual('Live Shift Tracker', 'লাইভ শিফট ট্র্যাকার')}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
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
              className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs bangla-text"
            >
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Mark Manual Attendance', 'ম্যানুয়াল হাজিরা')}
            </Button>
          </div>
        }
      />

      {/* Date Navigator Bar & Tabs */}
      <Card className="p-3 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'roster'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{tBilingual('Floor Roster', 'দৈনিক হাজিরা তালিকা')}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('overtime')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'overtime'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{tBilingual('Overtime Approvals', 'ওভারটাইম অনুমোদন')}</span>
              {overtimeRecords.filter((o) => o.status === 'pending_approval').length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === 'overtime'
                    ? 'bg-amber-400 text-slate-900 font-bold'
                    : 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold'
                }`}>
                  {overtimeRecords.filter((o) => o.status === 'pending_approval').length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('shifts')}
              className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === 'shifts'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{tBilingual('Shift Config', 'শিফট কনফিগ')}</span>
            </button>
          </div>

          {/* Date Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800" onClick={handlePrevDay} title="Previous Day">
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Button>

            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs h-8 w-36 font-medium border-slate-200 dark:border-slate-800"
            />

            <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 dark:border-slate-800" onClick={handleNextDay} title="Next Day">
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </Button>

            <Button size="sm" variant="secondary" className="text-xs h-8 px-2.5 font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200" onClick={handleToday}>
              {tBilingual('Today', 'আজ')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tab 1: Floor Attendance Daily Roster */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Top KPI Metrics Row for Selected Date */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Present', 'উপস্থিত')}
              </span>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {presentCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Late Check-ins', 'দেরিতে প্রবেশ')}
              </span>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                {lateCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Absent', 'অনুপস্থিত')}
              </span>
              <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
                {absentCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('On Leave', 'ছুটিতে')}
              </span>
              <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">
                {leaveCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Field Work', 'বাইরের কাজ')}
              </span>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">
                {fieldCount}
              </div>
            </Card>

            <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">
                {tBilingual('Potential OT', 'সম্ভাব্য ওভারটাইম')}
              </span>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                {Math.round(totalPotentialOtMins / 60 * 10) / 10}h
              </div>
            </Card>
          </div>

          {/* Search & Filter Bar */}
          <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={tBilingual('Search employee...', 'কর্মী খুঁজুন...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 text-xs h-8 font-medium"
                  />
                </div>

                {/* Status Filter */}
                <select
                  aria-label="Filter roster by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
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

                {/* Department Filter */}
                <select
                  aria-label="Filter roster by department"
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
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

              <div className="text-xs text-slate-500 font-mono">
                Date: <strong>{formatDate(selectedDate)}</strong>
              </div>
            </div>
          </Card>

          {/* Roster Table */}
          <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
            <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                  {tBilingual('Daily Floor Attendance Roster', 'দৈনিক ফ্লোর হাজিরা তালিকা')}
                </CardTitle>
                <Badge variant="outline" className="text-xs font-mono">
                  {combinedRoster.length} employees
                </Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {combinedRoster.map(({ emp, att }) => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {emp.employee_id_number} • <span className="capitalize">{emp.department}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-500 dark:text-slate-400">
                        {att?.shift_name || 'Regular Shift (09:00 - 18:00)'}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_in_time ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{att.check_in_time}</span>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono">
                        {att?.check_out_time ? (
                          <span className="font-semibold text-slate-900 dark:text-white">{att.check_out_time}</span>
                        ) : att?.check_in_time ? (
                          <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                            On Floor
                          </Badge>
                        ) : (
                          <span className="text-slate-400">--:--</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                        {att?.worked_minutes ? (
                          <span>{Math.round((att.worked_minutes / 60) * 10) / 10} hrs</span>
                        ) : (
                          <span className="text-slate-400">0 hrs</span>
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
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {att?.attendance_source || 'manual'}
                        </Badge>
                      </td>

                      <td className="p-3.5">
                        {att ? (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.5 capitalize ${
                              att.status === 'present'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                : att.status === 'late'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                                : att.status === 'absent'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                                : att.status === 'leave'
                                ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                            }`}
                          >
                            {att.status}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400 border-dashed border-slate-300 dark:border-slate-700">
                            Unmarked
                          </Badge>
                        )}
                      </td>

                      <td className="p-3.5 pr-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 px-2 font-medium"
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Overtime Requests & Approvals Queue', 'ওভারটাইম অনুমোদন ও নিয়ন্ত্রণ')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Review, adjust multiplier and approve floor overtime hours before payroll closing', 'পেরোল ক্লোজিংয়ের আগে ওভারটাইম ঘণ্টা ও গুণক অনুমোদন করুন')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsOtModalOpen(true)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Submit Overtime Request', 'ওভারটাইম আবেদন')}
            </Button>
          </div>

          {overtimeRecords.length === 0 ? (
            <Card className="p-12 text-center border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{tBilingual('No overtime records found', 'কোন ওভারটাইম তথ্য পাওয়া যায়নি')}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{tBilingual('Submit an overtime request for floor staff when completing rush orders.', 'জরুরি অর্ডারের ক্ষেত্রে কর্মীদের ওভারটাইম আবেদন জমা দিন।')}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {overtimeRecords.map((ot) => (
                <Card key={ot.id} className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{ot.employee_name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(ot.ot_date)}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 capitalize ${
                        ot.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                          : ot.status === 'pending_approval'
                          ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                      }`}
                    >
                      {ot.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Duration:', 'সময়কাল:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{Math.round((ot.duration_minutes / 60) * 10) / 10} hrs ({ot.duration_minutes}m)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{tBilingual('Multiplier:', 'গুণক:')}</span>
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{ot.multiplier}x</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{tBilingual('Calculated Payout:', 'প্রদেয় অর্থ:')}</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{formatBDT(ot.calculated_amount || 0)}</span>
                    </div>
                  </div>

                  {ot.reason && (
                    <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-900/60 p-2 rounded-md border border-slate-100 dark:border-slate-800">
                      &ldquo;{ot.reason}&rdquo;
                    </p>
                  )}

                  {ot.status === 'pending_approval' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        size="sm"
                        onClick={() => handleReviewOt(ot.id, 'approved', 1.5)}
                        disabled={isPending}
                        className="h-8 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {tBilingual('Approve 1.5x', 'অনুমোদন')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReviewOt(ot.id, 'rejected')}
                        disabled={isPending}
                        className="h-8 text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-800 gap-1 font-semibold"
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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Shop Floor Work Shifts', 'কারখানার কাজের শিফট')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('Define factory operating hours, grace period and overnight schedules', 'কারখানার কাজের সময়, শিফট শুরু-শেষ ও গ্রেস পিরিয়ড নির্ধারণ')}
              </p>
            </div>

            <Button size="sm" onClick={() => setIsNewShiftModalOpen(true)} className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold">
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Create New Shift', 'নতুন শিফট')}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts.map((shift) => (
              <Card key={shift.id} className="border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">{shift.shift_name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {shift.start_time} → {shift.end_time}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    Active
                  </Badge>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Grace Period:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{shift.grace_period_minutes || 15} mins</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Overnight Shift:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{shift.is_overnight ? 'Yes' : 'No'}</strong>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Mark Manual Attendance Modal */}
      {isManualModalOpen && (
        <ModalDialog
          open={isManualModalOpen}
          onOpenChange={(open) => setIsManualModalOpen(open)}
          hideFooter={true}
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
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Status', 'স্ট্যাটাস')}</Label>
                <select
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value as any })}
                  className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Check Out Time', 'প্রস্থান সময়')}</Label>
                <Input
                  type="time"
                  value={manualForm.checkOutTime}
                  onChange={(e) => setManualForm({ ...manualForm, checkOutTime: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Notes / Reason', 'মন্তব্য / কারণ')}</Label>
              <Input
                placeholder="e.g. Floor manual entry after late evening delivery"
                value={manualForm.notes}
                onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsManualModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveManualAttendance}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
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
          open={isOtModalOpen}
          onOpenChange={(open) => setIsOtModalOpen(open)}
          hideFooter={true}
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
                className="w-full h-9 text-xs px-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
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
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Duration (Minutes)', 'সময়কাল (মিনিট)')}</Label>
                <Input
                  type="number"
                  value={otForm.durationMinutes}
                  onChange={(e) => setOtForm({ ...otForm, durationMinutes: Number(e.target.value) })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Reason / Job Description', 'কাজের বিবরণ')}</Label>
              <Input
                placeholder="e.g. Urgent billboard print & finishing run"
                value={otForm.reason}
                onChange={(e) => setOtForm({ ...otForm, reason: e.target.value })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOtModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOtRequest}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
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
          open={isNewShiftModalOpen}
          onOpenChange={(open) => setIsNewShiftModalOpen(open)}
          hideFooter={true}
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
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Start Time', 'শুরু সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('End Time', 'শেষ সময়')}</Label>
                <Input
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                  className="text-xs h-9 border-slate-200 dark:border-slate-800"
                />
              </div>
            </div>

            {/* Auto-calculated Shift Duration */}
            <div className="p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-700 dark:text-blue-300 flex items-center justify-between">
              <span>{tBilingual('Planned Working Shift Duration:', 'নির্ধারিত শিফট কাজের সময়:')}</span>
              <span className="font-mono font-bold">
                {(() => {
                  const [sH, sM] = (shiftForm.start_time || '09:00').split(':').map(Number)
                  const [eH, eM] = (shiftForm.end_time || '18:00').split(':').map(Number)
                  let startMins = sH * 60 + (sM || 0)
                  let endMins = eH * 60 + (eM || 0)
                  if (endMins <= startMins) endMins += 24 * 60
                  const diff = endMins - startMins
                  const gross = Math.round((diff / 60) * 10) / 10
                  const net = diff >= 540 ? Math.round(((diff - 60) / 60) * 10) / 10 : gross
                  return `${net}h Net Duty (${gross}h Span)`
                })()}
              </span>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">{tBilingual('Grace Period (Minutes)', 'বিলম্ব ছাড় (মিনিট)')}</Label>
              <Input
                type="number"
                value={shiftForm.grace_period_minutes}
                onChange={(e) => setShiftForm({ ...shiftForm, grace_period_minutes: Number(e.target.value) })}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewShiftModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9 border-slate-200 dark:border-slate-800"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreateShift}
                disabled={isPending}
                className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 shadow-xs"
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
          open={isPunchModalOpen}
          onClose={() => {
            setIsPunchModalOpen(false)
            loadData()
          }}
          defaultType="CHECK_IN"
        />
      )}

      {/* Printable QR Poster Modal */}
      {isQrPosterOpen && (
        <ModalDialog
          open={isQrPosterOpen}
          onOpenChange={(open) => setIsQrPosterOpen(open)}
          hideFooter={true}
          title={tBilingual('Print Attendance QR Poster', 'হাজিরা কিউআর কোড পোস্টার')}
          description={tBilingual('Print and display this poster at the shop floor entrance', 'কারখানার প্রবেশদ্বারে টানানোর জন্য প্রিন্ট করুন')}
          size="lg"
        >
          <PrintableQrPoster
            location={{
              id: 'loc-main',
              company_id: company?.id || '',
              name: company?.name || 'Main Factory Floor',
              latitude: 23.8103,
              longitude: 90.4125,
              radius_meters: 500,
              max_accuracy_meters: 100,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }}
            companyName={company?.name || 'InkFlow ERP'}
            companyNameBn={company?.name_bn || null}
            onClose={() => setIsQrPosterOpen(false)}
          />
        </ModalDialog>
      )}
    </div>
  )
}
