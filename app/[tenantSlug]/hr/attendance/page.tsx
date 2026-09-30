'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  UserCheck,
  QrCode,
  Clock,
  Clock4,
  Layers,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AttendanceRoster } from '@/components/workforce/attendance-roster'
import { AttendanceCorrectionTable } from '@/components/workforce/attendance-correction-table'
import { OvertimeTable } from '@/components/workforce/overtime-table'
import { ShiftManager } from '@/components/workforce/shift-manager'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'
import {
  getEmployeesAction,
  getDailyAttendanceAction,
  getOvertimeRecordsAction,
  getShiftsAction,
  createShiftAction,
  recordAttendanceSummaryAction,
  reviewOvertimeAction,
} from '@/actions/workforce.actions'
import {
  getAttendanceCorrectionsAction,
  reviewAttendanceCorrectionAction,
} from '@/actions/attendance.actions'
import type {
  EmployeeRecord,
  AttendanceDailySummaryRecord,
  OvertimeRecord,
  ShiftRecord,
  AttendanceDailyStatus,
} from '@/types/workforce.types'
import type { AttendanceCorrectionRecord } from '@/types/attendance.types'

export default function AttendancePage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const initialTab = searchParams?.get('tab') || 'roster'
  const [activeTab, setActiveTab] = useState<'roster' | 'corrections' | 'overtime' | 'shifts'>(
    initialTab as any
  )

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Datasets
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDailySummaryRecord[]>([])
  const [corrections, setCorrections] = useState<AttendanceCorrectionRecord[]>([])
  const [overtimeRecords, setOvertimeRecords] = useState<OvertimeRecord[]>([])
  const [shifts, setShifts] = useState<ShiftRecord[]>([])

  // Modals
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [manualModalOpen, setManualModalOpen] = useState(false)
  const [manualEmployee, setManualEmployee] = useState<EmployeeRecord | null>(null)
  const [manualStatus, setManualStatus] = useState<AttendanceDailyStatus>('present')
  const [manualCheckIn, setManualCheckIn] = useState('09:00')
  const [manualCheckOut, setManualCheckOut] = useState('18:00')

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [empRes, attRes, corrRes, otRes, shiftRes] = await Promise.all([
        getEmployeesAction({ status: 'active' }),
        getDailyAttendanceAction({ date: selectedDate }),
        getAttendanceCorrectionsAction(company?.id || ''),
        getOvertimeRecordsAction(),
        getShiftsAction(),
      ])

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (attRes.success && attRes.data) setAttendanceRecords(attRes.data)
      if (corrRes.success && corrRes.data) setCorrections(corrRes.data)
      if (otRes.success && otRes.data) setOvertimeRecords(otRes.data)
      if (shiftRes.success && shiftRes.data) setShifts(shiftRes.data)
    } finally {
      setIsLoading(false)
    }
  }, [selectedDate, company?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab && ['roster', 'corrections', 'overtime', 'shifts'].includes(tab)) {
      setActiveTab(tab as any)
    }
    if (searchParams?.get('mode') === 'qr') {
      setQrModalOpen(true)
    }
  }, [searchParams])

  // Handlers
  const handleMarkAttendance = async (employee: EmployeeRecord, status: AttendanceDailyStatus) => {
    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: employee.id,
        attendanceDate: selectedDate,
        status,
        checkInTime: status === 'present' ? '09:00' : undefined,
        attendanceSource: 'manual',
      })
      if (res.success && res.data) {
        setAttendanceRecords((prev) => {
          const idx = prev.findIndex((r) => r.employee_id === employee.id && r.attendance_date === selectedDate)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = res.data!
            return next
          }
          return [res.data!, ...prev]
        })
      }
    })
  }

  const handleAdjustTime = (record: AttendanceDailySummaryRecord) => {
    const emp = employees.find((e) => e.id === record.employee_id) || null
    setManualEmployee(emp)
    setManualStatus(record.status)
    setManualCheckIn(record.check_in_time || '09:00')
    setManualCheckOut(record.check_out_time || '18:00')
    setManualModalOpen(true)
  }

  const handleSaveManualAttendance = async () => {
    if (!manualEmployee) return
    startTransition(async () => {
      const res = await recordAttendanceSummaryAction({
        employeeId: manualEmployee.id,
        attendanceDate: selectedDate,
        status: manualStatus,
        checkInTime: manualCheckIn,
        checkOutTime: manualCheckOut,
        attendanceSource: 'manual',
      })
      if (res.success && res.data) {
        setAttendanceRecords((prev) => {
          const idx = prev.findIndex((r) => r.employee_id === manualEmployee.id && r.attendance_date === selectedDate)
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = res.data!
            return next
          }
          return [res.data!, ...prev]
        })
        setManualModalOpen(false)
      }
    })
  }

  const handleReviewCorrection = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    const res = await reviewAttendanceCorrectionAction({
      id,
      status,
      reviewNotes: notes,
      companyId: company?.id || '',
    })
    if (res.success && res.data) {
      setCorrections((prev) => prev.map((c) => (c.id === id ? res.data! : c)))
      loadData()
    }
  }

  const handleReviewOvertime = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    const res = await reviewOvertimeAction({ id, status, rejectionReason: notes })
    if (res.success && res.data) {
      setOvertimeRecords((prev) => prev.map((o) => (o.id === id ? res.data! : o)))
      loadData()
    }
  }

  const handleCreateShift = async (shiftData: Partial<ShiftRecord>) => {
    const res = await createShiftAction(shiftData as any)
    if (res.success && res.data) {
      setShifts((prev) => [...prev, res.data!])
    } else {
      throw new Error(res.error || 'Failed to create shift')
    }
  }

  const pendingCorrectionsCount = corrections.filter((c) => c.status === 'pending').length
  const pendingOtCount = overtimeRecords.filter((o) => o.status === 'pending_approval').length

  return (
    <PanelAccessGuard module="attendance" action="view" panelTitle="Attendance" panelTitleBn="হাজিরা">
      <div className="min-h-screen bg-slate-50/60 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Attendance
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-500">হাজিরা ও ফ্লোর কার্যক্রম</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">Daily shop-floor roster, punch tracking & overtime</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading || isPending}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50 self-start sm:self-auto min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Secondary Navigation Toolbar */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'roster'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Today Roster</span>
            </button>

            <button
              onClick={() => setQrModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shrink-0"
            >
              <QrCode className="w-4 h-4 text-blue-600" />
              <span>QR Punch</span>
            </button>

            <button
              onClick={() => {
                setManualEmployee(employees[0] || null)
                setManualStatus('present')
                setManualModalOpen(true)
              }}
              className="px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>

            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'corrections'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Corrections</span>
              {pendingCorrectionsCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'corrections' ? 'bg-white text-blue-600' : 'bg-amber-100 text-amber-800'
                }`}>
                  {pendingCorrectionsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('overtime')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'overtime'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock4 className="w-4 h-4" />
              <span>Overtime</span>
              {pendingOtCount > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'overtime' ? 'bg-white text-blue-600' : 'bg-indigo-100 text-indigo-800'
                }`}>
                  {pendingOtCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('shifts')}
              className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0 ${
                activeTab === 'shifts'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Shifts</span>
            </button>
          </div>

          {/* Active Tab View */}
          {activeTab === 'roster' && (
            <AttendanceRoster
              employees={employees}
              attendanceRecords={attendanceRecords}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              isLoading={isLoading}
              tenantSlug={slug}
              onMarkAttendance={handleMarkAttendance}
              onAdjustTime={handleAdjustTime}
              onOpenManualEntry={() => {
                setManualEmployee(employees[0] || null)
                setManualStatus('present')
                setManualModalOpen(true)
              }}
              onOpenQrPunch={() => setQrModalOpen(true)}
            />
          )}

          {activeTab === 'corrections' && (
            <AttendanceCorrectionTable
              corrections={corrections}
              isLoading={isLoading}
              tenantSlug={slug}
              onReview={handleReviewCorrection}
            />
          )}

          {activeTab === 'overtime' && (
            <OvertimeTable
              records={overtimeRecords}
              isLoading={isLoading}
              tenantSlug={slug}
              onReview={handleReviewOvertime}
            />
          )}

          {activeTab === 'shifts' && (
            <ShiftManager
              shifts={shifts}
              employees={employees}
              isLoading={isLoading}
              tenantSlug={slug}
              onCreateShift={handleCreateShift}
            />
          )}

          {/* QR Punch Modal */}
          {qrModalOpen && (
            <AttendancePunchModal
              open={qrModalOpen}
              onClose={() => {
                setQrModalOpen(false)
                loadData()
              }}
              tenantSlug={slug}
            />
          )}

          {/* Manual Entry / Time Adjustment Dialog */}
          <Dialog open={manualModalOpen} onOpenChange={setManualModalOpen}>
            <DialogContent className="max-w-md p-6 bg-white border-slate-200 shadow-xl rounded-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Manual Attendance Adjustment
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 text-xs">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Select Employee</Label>
                  <select
                    value={manualEmployee?.id || ''}
                    onChange={(e) => {
                      const emp = employees.find((em) => em.id === e.target.value) || null
                      setManualEmployee(emp)
                    }}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1"
                  >
                    {employees.map((em) => (
                      <option key={em.id} value={em.id}>
                        {em.name} ({em.employee_id_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Attendance Status</Label>
                  <select
                    value={manualStatus}
                    onChange={(e) => setManualStatus(e.target.value as AttendanceDailyStatus)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1 capitalize"
                  >
                    <option value="present">Present (উপস্থিত)</option>
                    <option value="late">Late (দেরিতে আগমন)</option>
                    <option value="half_day">Half Day (অর্ধ দিবস)</option>
                    <option value="leave">On Leave (ছুটিতে)</option>
                    <option value="field_work">Field Work (মাঠে কাজ)</option>
                    <option value="absent">Absent (অনুপস্থিত)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Check In Time</Label>
                    <Input
                      type="time"
                      value={manualCheckIn}
                      onChange={(e) => setManualCheckIn(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Check Out Time</Label>
                    <Input
                      type="time"
                      value={manualCheckOut}
                      onChange={(e) => setManualCheckOut(e.target.value)}
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManualModalOpen(false)}
                  className="h-8 text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveManualAttendance}
                  className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white min-h-[32px]"
                >
                  Save Attendance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PanelAccessGuard>
  )
}
