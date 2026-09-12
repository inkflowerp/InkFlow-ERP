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
  ArrowRight,
  Radio,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
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
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

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

    // Passive GPS accuracy check
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
      const targetCompany = company?.id || tenantSlug
      const statusRes = await getEmployeeTodayStatusAction(targetCompany)
      if (statusRes.success && statusRes.data) {
        setTodayStatus(statusRes.data)
      } else if (statusRes.error) {
        setLoadError(statusRes.error)
      }

      const histRes = await getEmployeeHistoryAction(targetCompany)
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
  }, [company?.id, tenantSlug])

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
      const targetCompany = company?.id || tenantSlug
      const res = await requestAttendanceCorrectionAction({
        companyId: targetCompany,
        attendanceDate: corrDate,
        requestedType: corrType,
        requestedTime: corrTime,
        reason: corrReason,
        attendanceRecordId: correctionRecord?.id || null,
      })

      if (res.success) {
        setCorrSuccessMsg(tBilingual('Correction request submitted for manager review.', 'সংশোধনের আবেদন ম্যানেজারের নিকট জমা হয়েছে।'))
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 sm:px-0">
      {/* Page Header */}
      <PageHeader
        titleEn="Employee Attendance & Shift Punch"
        titleBn="কর্মচারী উপস্থিতি ও শিফট পাঞ্চ"
        descriptionEn="Scan workplace QR code terminal within authorized GPS geofence boundary to record attendance."
        descriptionBn="অনুমোদিত জিপিএস সীমানার ভেতর কিউআর কোড স্ক্যান করে উপস্থিতি ও প্রস্থান নিশ্চিত করুন।"
        icon={UserCheck}
        iconColor="text-indigo-600 dark:text-indigo-400"
        actions={
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{currentTime || '00:00:00'}</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAttendanceData}
              disabled={isLoading}
              className="border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs h-9 rounded-xl font-semibold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-500' : ''}`} />
              <span>{tBilingual('Refresh', 'রিফ্রেশ')}</span>
            </Button>
          </div>
        }
      />

      {/* Network / Load Error Alert */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={loadAttendanceData}
            className="text-xs text-rose-700 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg h-7"
          >
            {tBilingual('Retry', 'পুনরায় চেষ্টা')}
          </Button>
        </div>
      )}

      {/* Main Today Punch Status Card */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-sky-500" />
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Status State Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5">
              <div
                className={`p-3.5 rounded-2xl flex items-center justify-center shrink-0 ${
                  todayStatus.hasCheckedOut
                    ? 'bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30'
                    : todayStatus.hasCheckedIn
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'
                    : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30'
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
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                  {tBilingual('Today\'s Shift Status', 'আজকের শিফট অবস্থা')}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {todayStatus.hasCheckedOut
                    ? tBilingual('Completed for Today', 'আজকের শিফট সম্পন্ন (প্রস্থান সম্পন্ন)')
                    : todayStatus.hasCheckedIn
                    ? tBilingual('Checked In • Shift Active', 'কর্মস্থলে উপস্থিত (শিফট সক্রিয়)')
                    : tBilingual('Not Checked In Yet', 'এখনো হাজিরা দেওয়া হয়নি')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentDate} • <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{currentTime}</span>
                </p>
              </div>
            </div>

            <Badge
              className={`text-xs px-3 py-1 font-bold shrink-0 ${
                todayStatus.hasCheckedOut
                  ? 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800'
                  : todayStatus.hasCheckedIn
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
              }`}
            >
              {todayStatus.hasCheckedOut
                ? 'OUT (সম্পন্ন)'
                : todayStatus.hasCheckedIn
                ? 'IN (উপস্থিত)'
                : 'PENDING (বাকি)'}
            </Badge>
          </div>

          {/* Today Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tBilingual('Check-In Time', 'প্রবেশ সময়')}</span>
              <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
                {todayStatus.checkInTime || '— — : — —'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{tBilingual('Check-Out Time', 'প্রস্থান সময়')}</span>
              <p className="text-base sm:text-lg font-mono font-bold text-slate-900 dark:text-white">
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
              className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
            >
              <QrCode className="h-5 w-5" />
              <span>{tBilingual('Scan QR to Check In', 'কিউআর স্ক্যান করে প্রবেশ')}</span>
            </Button>

            <Button
              type="button"
              disabled={!todayStatus.hasCheckedIn || todayStatus.hasCheckedOut}
              onClick={() => openPunchModal('CHECK_OUT')}
              variant="outline"
              className="h-14 rounded-2xl border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-black text-sm shadow-md shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-98 disabled:opacity-50"
            >
              <LogOut className="h-5 w-5" />
              <span>{tBilingual('Scan QR & Check Out', 'কিউআর স্ক্যান করে প্রস্থান')}</span>
            </Button>
          </div>

          {/* Device Hardware Readiness Status Pills */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-4">
              {/* Camera Status */}
              <div className="flex items-center gap-1.5">
                <Camera className={`h-3.5 w-3.5 ${cameraPermission === 'denied' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className="text-slate-500 dark:text-slate-400">Camera:</span>
                <span className={`font-semibold ${
                  cameraPermission === 'granted'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : cameraPermission === 'denied'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-300'
                }`}>
                  {cameraPermission === 'granted' ? 'Ready' : cameraPermission === 'denied' ? 'Blocked' : 'Prompt'}
                </span>
              </div>

              {/* GPS Status */}
              <div className="flex items-center gap-1.5">
                <Navigation className={`h-3.5 w-3.5 ${gpsPermission === 'denied' ? 'text-rose-500' : 'text-slate-400'}`} />
                <span className="text-slate-500 dark:text-slate-400">GPS:</span>
                <span className={`font-semibold ${
                  gpsPermission === 'granted'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : gpsPermission === 'denied'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-amber-600 dark:text-amber-300'
                }`}>
                  {gpsPermission === 'granted' ? (liveGpsAccuracy ? `±${liveGpsAccuracy}m` : 'Ready') : gpsPermission === 'denied' ? 'Disabled' : 'Prompt'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{tBilingual('Authoritative Geofence & QR Verified', 'কিউআর ও জিপিএস ভেরিফাইড')}</span>
            </div>
          </div>

          {/* Footer Correction Link */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              {tBilingual('Need to correct a missed or late punch?', 'ভুলে যাওয়া বা দেরিতে হওয়া পাঞ্চ সংশোধন করতে চান?')}
            </span>

            <button
              type="button"
              onClick={() => {
                setCorrectionRecord(null)
                setIsCorrectionOpen(true)
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold cursor-pointer flex items-center gap-1 self-start sm:self-auto"
            >
              <FileEdit className="h-3.5 w-3.5" />
              <span>{tBilingual('Request Correction (ভুল সংশোধন)', 'সংশোধনের আবেদন করুন')}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="p-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <CardTitle className="text-slate-900 dark:text-white text-base">
                {tBilingual('Your Attendance History', 'আপনার হাজিরা বিবরণ')}
              </CardTitle>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              {(['ALL', 'CHECK_IN', 'CHECK_OUT'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setHistoryFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    historyFilter === filter
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {filter === 'ALL'
                    ? tBilingual('All', 'সকল')
                    : filter === 'CHECK_IN'
                    ? tBilingual('Check-In', 'প্রবেশ')
                    : tBilingual('Check-Out', 'প্রস্থান')}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredHistory.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Clock className="h-8 w-8 text-slate-400 dark:text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual('No attendance records found matching filter.', 'কোনো হাজিরা রেকর্ড পাওয়া যায়নি।')}
              </p>
            </div>
          ) : (
            filteredHistory.map((rec) => (
              <div
                key={rec.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      className={`text-[10px] font-mono font-bold ${
                        rec.attendance_type === 'CHECK_IN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {rec.attendance_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{rec.attendance_date}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(rec.checked_at).toLocaleTimeString('en-US', {
                        timeZone: 'Asia/Dhaka',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{rec.location_name || 'Workplace Terminal'}</span>
                    </span>
                    <span>•</span>
                    <span>Distance: <strong className="text-slate-700 dark:text-slate-300">{Math.round(rec.distance_from_location_meters)}m</strong></span>
                    <span>•</span>
                    <span>GPS Acc: <strong className="text-slate-700 dark:text-slate-300">±{Math.round(rec.gps_accuracy_meters)}m</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
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
                    className="h-8 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    {tBilingual('Correction', 'সংশোধন')}
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
        title={tBilingual('Request Attendance Correction', 'হাজিরা সংশোধনের আবেদন')}
        description={tBilingual(
          'Submit a request to your HR manager to correct a missing or inaccurate punch.',
          'ভুলে যাওয়া বা দেরিতে হওয়া পাঞ্চ সংশোধনের জন্য ম্যানেজারের নিকট আবেদন জমা দিন।'
        )}
      >
        <form onSubmit={handleCorrectionSubmit} className="space-y-4 pt-2">
          {corrSuccessMsg ? (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{corrSuccessMsg}</span>
            </div>
          ) : (
            <>
              {corrErrorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{corrErrorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="corrDate" className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tBilingual('Date', 'তারিখ')}</Label>
                <Input
                  id="corrDate"
                  type="date"
                  value={corrDate}
                  onChange={(e) => setCorrDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs h-10 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="corrType" className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tBilingual('Punch Type', 'পাঞ্চ টাইপ')}</Label>
                  <select
                    id="corrType"
                    value={corrType}
                    onChange={(e) => setCorrType(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="CHECK_IN">{tBilingual('Check-In (প্রবেশ)', 'প্রবেশ (Check-In)')}</option>
                    <option value="CHECK_OUT">{tBilingual('Check-Out (প্রস্থান)', 'প্রস্থান (Check-Out)')}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="corrTime" className="text-xs font-semibold text-slate-700 dark:text-slate-300">{tBilingual('Corrected Time', 'সংশোধিত সময়')}</Label>
                  <Input
                    id="corrTime"
                    type="time"
                    value={corrTime}
                    onChange={(e) => setCorrTime(e.target.value)}
                    className="bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs h-10 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="corrReason" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tBilingual('Reason for Correction', 'সংশোধনের কারণ')} *
                </Label>
                <textarea
                  id="corrReason"
                  rows={3}
                  value={corrReason}
                  onChange={(e) => setCorrReason(e.target.value)}
                  placeholder={tBilingual('e.g. Phone battery died, Device GPS failed, On-site client job', 'যেমন: ফোনের চার্জ শেষ ছিল, সাইটে কাজের ব্যস্ততা ছিল')}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCorrectionOpen(false)}
                  className="w-full sm:w-auto h-10 sm:h-9 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-xl"
                >
                  {tBilingual('Cancel', 'বাতিল')}
                </Button>
                <Button
                  type="submit"
                  disabled={corrSubmitting}
                  className="w-full sm:w-auto h-10 sm:h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm"
                >
                  {corrSubmitting ? tBilingual('Submitting...', 'জমা হচ্ছে...') : tBilingual('Submit Request', 'আবেদন জমা দিন')}
                </Button>
              </div>
            </>
          )}
        </form>
      </ModalDialog>
    </div>
  )
}
