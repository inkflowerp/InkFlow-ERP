'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Clock,
  QrCode,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  LogOut,
  History,
  FileEdit,
  Sparkles,
  RefreshCw,
  Building,
  Info,
  Camera,
  Navigation,
  Check,
  Search,
  Filter,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { AttendancePunchModal } from '@/components/mobile/attendance-punch-modal'
import {
  getEmployeeTodayStatusAction,
  getEmployeeHistoryAction,
  requestAttendanceCorrectionAction,
} from '@/actions/attendance.actions'
import { AttendanceRecord } from '@/types/attendance.types'

export default function EmployeeAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [isPending, startTransition] = useTransition()
  const [currentTime, setCurrentTime] = useState<string>('')
  const [currentDate, setCurrentDate] = useState<string>('')

  // Device Readiness Checks
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking')
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'prompt' | 'denied' | 'checking'>('checking')
  const [liveGpsAccuracy, setLiveGpsAccuracy] = useState<number | null>(null)

  // State
  const [todayStatus, setTodayStatus] = useState<{
    hasCheckedIn: boolean
    hasCheckedOut: boolean
    checkInTime?: string
    checkOutTime?: string
    todayRecords: AttendanceRecord[]
    employeeName: string
  }>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    todayRecords: [],
    employeeName: '',
  })

  const [history, setHistory] = useState<AttendanceRecord[]>([])
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'CHECK_IN' | 'CHECK_OUT'>('ALL')
  const [historySearch, setHistorySearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Modals
  const [isPunchModalOpen, setIsPunchModalOpen] = useState(false)
  const [punchModalType, setPunchModalType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN')
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false)
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRecord | null>(null)

  // Correction Form
  const [corrDate, setCorrDate] = useState(new Date().toISOString().split('T')[0])
  const [corrType, setCorrType] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN')
  const [corrTime, setCorrTime] = useState('09:00')
  const [corrReason, setCorrReason] = useState('')
  const [corrSubmitting, setCorrSubmitting] = useState(false)
  const [corrSuccessMsg, setCorrSuccessMsg] = useState<string | null>(null)
  const [corrErrorMsg, setCorrErrorMsg] = useState<string | null>(null)

  // Live Digital Clock
  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      )
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      )
    }

    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  // Check Camera & Geolocation Permission Status in Browser
  useEffect(() => {
    if (typeof navigator !== 'undefined' && (navigator as any).permissions) {
      try {
        ;(navigator as any).permissions
          .query({ name: 'camera' })
          .then((res: any) => {
            setCameraPermission(res.state)
            res.onchange = () => setCameraPermission(res.state)
          })
          .catch(() => setCameraPermission('prompt'))

        ;(navigator as any).permissions
          .query({ name: 'geolocation' })
          .then((res: any) => {
            setGpsPermission(res.state)
            res.onchange = () => setGpsPermission(res.state)
          })
          .catch(() => setGpsPermission('prompt'))
      } catch {
        setCameraPermission('prompt')
        setGpsPermission('prompt')
      }
    } else {
      setCameraPermission('prompt')
      setGpsPermission('prompt')
    }

    // Optional passive GPS accuracy check
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLiveGpsAccuracy(Math.round(pos.coords.accuracy))
          setGpsPermission('granted')
        },
        () => {},
        { timeout: 4000, maximumAge: 60000 }
      )
    }
  }, [])

  // Load Status & History
  const loadAttendanceData = async () => {
    setIsLoading(true)
    setLoadError(null)
    try {
      const statusRes = await getEmployeeTodayStatusAction(company?.id)
      if (statusRes.success && statusRes.data) {
        setTodayStatus(statusRes.data)
      } else if (statusRes.error) {
        setLoadError(statusRes.error)
      }

      const histRes = await getEmployeeHistoryAction(company?.id)
      if (histRes.success && histRes.data) {
        setHistory(histRes.data)
      }
    } catch (e: any) {
      console.error('Error loading attendance:', e)
      setLoadError(e.message || 'Failed to connect to attendance service.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAttendanceData()
  }, [company?.id])

  const openPunchModal = (type: 'CHECK_IN' | 'CHECK_OUT') => {
    setPunchModalType(type)
    setIsPunchModalOpen(true)
  }

  const handleCorrectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!corrReason.trim()) return

    setCorrSubmitting(true)
    setCorrErrorMsg(null)
    try {
      const res = await requestAttendanceCorrectionAction({
        companyId: company?.id,
        attendanceDate: corrDate,
        requestedType: corrType,
        requestedTime: corrTime,
        reason: corrReason,
        attendanceRecordId: correctionRecord?.id || null,
      })

      if (res.success) {
        setCorrSuccessMsg('Correction request submitted to manager for review.')
        setTimeout(() => {
          setIsCorrectionOpen(false)
          setCorrSuccessMsg(null)
          setCorrReason('')
          loadAttendanceData()
        }, 2000)
      } else {
        setCorrErrorMsg(res.error || 'Failed to submit correction request.')
      }
    } catch (err: any) {
      setCorrErrorMsg(err.message || 'Unexpected server error.')
    } finally {
      setCorrSubmitting(false)
    }
  }

  // Filtered History
  const filteredHistory = history.filter((rec) => {
    const matchesType = historyFilter === 'ALL' || rec.attendance_type === historyFilter
    const matchesSearch =
      !historySearch ||
      rec.attendance_date.includes(historySearch) ||
      (rec.location_name && rec.location_name.toLowerCase().includes(historySearch.toLowerCase()))
    return matchesType && matchesSearch
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
            <UserCheck className="h-3.5 w-3.5" />
            <span>{tBilingual('Employee Attendance', 'কর্মচারী উপস্থিতি ও হাজিরা')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {todayStatus.employeeName || 'Staff Member'}
          </h1>
          <p className="text-xs text-slate-400">
            {currentDate} • <span className="font-mono text-indigo-300 font-bold">{currentTime}</span>
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadAttendanceData}
          isLoading={isLoading}
          className="self-start sm:self-auto border-slate-700 bg-slate-800 text-slate-300 hover:text-white text-xs h-9 rounded-xl cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          <span>Refresh Status</span>
        </Button>
      </div>

      {/* Network / Load Error Alert */}
      {loadError && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={loadAttendanceData}
            className="text-xs text-rose-200 hover:bg-rose-900/50"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Main Today Punch Status Card */}
      <Card className="border-slate-800 bg-slate-950/80 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-sky-500" />
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Status State Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl flex items-center justify-center ${
                  todayStatus.hasCheckedOut
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    : todayStatus.hasCheckedIn
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {todayStatus.hasCheckedOut ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : todayStatus.hasCheckedIn ? (
                  <Clock className="h-6 w-6 animate-pulse" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Today&apos;s Shift Status
                </span>
                <h3 className="text-lg font-bold text-white">
                  {todayStatus.hasCheckedOut
                    ? 'Completed for Today (প্রস্থান সম্পন্ন)'
                    : todayStatus.hasCheckedIn
                    ? 'Checked In • Shift Active (কর্মস্থলে উপস্থিত)'
                    : 'Not Checked In Yet (হাজিরা দেওয়া হয়নি)'}
                </h3>
              </div>
            </div>

            <Badge
              className={`text-xs px-3 py-1 font-bold ${
                todayStatus.hasCheckedOut
                  ? 'bg-sky-950 text-sky-300 border-sky-800'
                  : todayStatus.hasCheckedIn
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-rose-950 text-rose-300 border-rose-800'
              }`}
            >
              {todayStatus.hasCheckedOut
                ? 'OUT'
                : todayStatus.hasCheckedIn
                ? 'IN'
                : 'PENDING'}
            </Badge>
          </div>

          {/* Today Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Check-In Time</span>
              <p className="text-base sm:text-lg font-mono font-bold text-white">
                {todayStatus.checkInTime || '— — : — —'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1">
              <span className="text-xs text-slate-400 font-medium">Check-Out Time</span>
              <p className="text-base sm:text-lg font-mono font-bold text-white">
                {todayStatus.checkOutTime || '— — : — —'}
              </p>
            </div>
          </div>

          {/* Big Action Touch Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button
              type="button"
              disabled={todayStatus.hasCheckedIn && !todayStatus.hasCheckedOut}
              onClick={() => openPunchModal('CHECK_IN')}
              className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
            >
              <QrCode className="h-5 w-5" />
              <span>{tBilingual('Scan QR to Check In', 'কিউআর স্ক্যান করে প্রবেশ')}</span>
            </Button>

            <Button
              type="button"
              disabled={!todayStatus.hasCheckedIn || todayStatus.hasCheckedOut}
              onClick={() => openPunchModal('CHECK_OUT')}
              variant="outline"
              className="h-14 rounded-2xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-black text-sm shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              <span>{tBilingual('Scan QR & Check Out', 'কিউআর স্ক্যান করে প্রস্থান')}</span>
            </Button>
          </div>

          {/* Device Hardware Readiness Status Pills */}
          <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              {/* Camera Status */}
              <div className="flex items-center gap-1.5">
                <Camera className={`h-3.5 w-3.5 ${cameraPermission === 'denied' ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="text-slate-400">Camera:</span>
                <span className={`font-semibold ${
                  cameraPermission === 'granted'
                    ? 'text-emerald-400'
                    : cameraPermission === 'denied'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}>
                  {cameraPermission === 'granted' ? 'Ready' : cameraPermission === 'denied' ? 'Blocked' : 'Prompt'}
                </span>
              </div>

              {/* GPS Status */}
              <div className="flex items-center gap-1.5">
                <Navigation className={`h-3.5 w-3.5 ${gpsPermission === 'denied' ? 'text-rose-400' : 'text-slate-400'}`} />
                <span className="text-slate-400">GPS:</span>
                <span className={`font-semibold ${
                  gpsPermission === 'granted'
                    ? 'text-emerald-400'
                    : gpsPermission === 'denied'
                    ? 'text-rose-400'
                    : 'text-amber-300'
                }`}>
                  {gpsPermission === 'granted' ? (liveGpsAccuracy ? `±${liveGpsAccuracy}m` : 'Ready') : gpsPermission === 'denied' ? 'Disabled' : 'Prompt'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              <span>Authoritative Geofence & QR Verified</span>
            </div>
          </div>

          {/* Footer Correction Link */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800/60">
            <span className="text-slate-400">
              Need to correct a missed or late punch?
            </span>

            <button
              type="button"
              onClick={() => {
                setCorrectionRecord(null)
                setIsCorrectionOpen(true)
              }}
              className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1"
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>Request Correction (ভুল সংশোধন)</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="border-slate-800 bg-slate-950 shadow-md">
        <CardHeader className="pb-3 border-b border-slate-800/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <CardTitle className="text-white text-base">
                {tBilingual('Your Attendance History', 'আপনার হাজিরা বিবরণ')}
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['ALL', 'CHECK_IN', 'CHECK_OUT'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    historyFilter === filter
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'CHECK_IN' ? 'Check-In' : 'Check-Out'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800/60">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Clock className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No attendance records found matching filter.</p>
            </div>
          ) : (
            filteredHistory.map((rec) => (
              <div
                key={rec.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-900/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-mono font-bold ${
                        rec.attendance_type === 'CHECK_IN'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {rec.attendance_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-bold text-white">{rec.attendance_date}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(rec.checked_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-500" />
                      <span>{rec.location_name || 'Workplace Terminal'}</span>
                    </span>
                    <span>•</span>
                    <span>Distance: <strong className="text-slate-300">{Math.round(rec.distance_from_location_meters)}m</strong></span>
                    <span>•</span>
                    <span>GPS Acc: <strong className="text-slate-300">±{Math.round(rec.gps_accuracy_meters)}m</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Badge variant="outline" className="text-[10px] bg-slate-900 border-slate-700 text-slate-300">
                    {rec.verification_status}
                  </Badge>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCorrectionRecord(rec)
                      setCorrDate(rec.attendance_date)
                      setCorrType(rec.attendance_type === 'CHECK_IN' ? 'CHECK_IN' : 'CHECK_OUT')
                      setIsCorrectionOpen(true)
                    }}
                    className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-slate-900"
                  >
                    Correction
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Attendance Punch Modal */}
      <AttendancePunchModal
        open={isPunchModalOpen}
        onClose={() => {
          setIsPunchModalOpen(false)
          loadAttendanceData()
        }}
        onAttendanceRecorded={() => {
          loadAttendanceData()
        }}
        defaultType={punchModalType}
        tenantSlug={tenantSlug}
      />

      {/* Request Correction Modal */}
      <ModalDialog
        open={isCorrectionOpen}
        onOpenChange={(v) => !v && setIsCorrectionOpen(false)}
        title="Request Attendance Correction"
        description="Submit a request to your HR manager to correct a missing or inaccurate punch."
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4 pt-2">
          {corrSuccessMsg ? (
            <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{corrSuccessMsg}</span>
            </div>
          ) : (
            <>
              {corrErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{corrErrorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="corrDate" className="text-xs">Date</Label>
                <Input
                  id="corrDate"
                  type="date"
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-white text-xs h-10"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="corrType" className="text-xs">Punch Type</Label>
                  <select
                    id="corrType"
                    value={corrType}
                    onChange={(e) => setCorrType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs font-semibold"
                  >
                    <option value="CHECK_IN">Check-In</option>
                    <option value="CHECK_OUT">Check-Out</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="corrTime" className="text-xs">Corrected Time</Label>
                  <Input
                    id="corrTime"
                    type="time"
                    value={corrTime}
                    onChange={(e) => setCorrTime(e.target.value)}
                    className="bg-slate-900 border-slate-700 text-white text-xs h-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="corrReason" className="text-xs">Reason for Correction (কারণ)</Label>
                <textarea
                  id="corrReason"
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder="e.g. Phone battery died, Device GPS failed, On-site installation job"
                  className="w-full p-3 rounded-lg border border-slate-700 bg-slate-900 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCorrectionOpen(false)}
                  className="border-slate-700 text-slate-300 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={corrSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  Submit Request
                </Button>
              </div>
            </>
          )}
        </form>
      </ModalDialog>
    </div>
  )
}
