'use client'

import React, { useState, useEffect } from 'react'
import {
  QrCode,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Compass,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { CameraQrScanner } from '@/components/attendance/camera-qr-scanner'
import { recordAttendanceAction } from '@/actions/attendance.actions'
import { AttendanceRecord, AttendanceType } from '@/types/attendance.types'

interface AttendancePunchModalProps {
  open: boolean
  onClose: () => void
  onAttendanceRecorded?: (record: AttendanceRecord) => void
  defaultType?: 'CHECK_IN' | 'CHECK_OUT'
  tenantSlug?: string
}

export function AttendancePunchModal({
  open,
  onClose,
  onAttendanceRecorded,
  defaultType = 'CHECK_IN',
  tenantSlug = 'app',
}: AttendancePunchModalProps) {
  const { company } = useTenant()
  const { tBilingual } = useI18n()

  const [punchType, setPunchType] = useState<AttendanceType>(defaultType)
  const [stage, setStage] = useState<'scan' | 'verifying' | 'success' | 'failure'>('scan')

  // Scanned QR code
  const [scannedCode, setScannedCode] = useState<string | null>(null)

  // Geolocation state
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Result state
  const [successRecord, setSuccessRecord] = useState<AttendanceRecord | null>(null)
  const [verificationDetails, setVerificationDetails] = useState<any>(null)
  const [failureReason, setFailureReason] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStage('scan')
      setScannedCode(null)
      setGpsLocation(null)
      setGpsError(null)
      setSuccessRecord(null)
      setFailureReason(null)
      setPunchType(defaultType)
    }
  }, [open, defaultType])

  // When QR code is scanned, immediately acquire GPS and submit to server
  const handleQrScanned = async (scannedValue: string) => {
    setScannedCode(scannedValue)
    setStage('verifying')

    // Acquire GPS location
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStage('failure')
      setFailureReason('Geolocation is not supported by your browser.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy

        setGpsLocation({ lat, lng, accuracy })

        // Send to Server Action
        try {
          const targetCompany = company?.id || tenantSlug
          const res = await recordAttendanceAction({
            company_id: targetCompany,
            qr_token: scannedValue,
            latitude: lat,
            longitude: lng,
            accuracy,
            attendance_type: punchType,
            device_metadata: {
              userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
              platform: typeof navigator !== 'undefined' ? navigator.platform : '',
              screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
            },
          })

          if (res.success && res.data) {
            setSuccessRecord(res.data)
            setVerificationDetails(res.details)
            setStage('success')
            if (onAttendanceRecorded) {
              onAttendanceRecorded(res.data)
            }
          } else {
            setStage('failure')
            setFailureReason(res.error || 'Attendance verification failed.')
            setVerificationDetails(res.details)
          }
        } catch (serverErr: any) {
          setStage('failure')
          setFailureReason(serverErr.message || 'Server error occurred during verification.')
        }
      },
      (geoErr) => {
        setStage('failure')
        if (geoErr.code === geoErr.PERMISSION_DENIED) {
          setFailureReason('Location permission denied. InkFlow requires device GPS to verify workplace attendance.')
        } else if (geoErr.code === geoErr.POSITION_UNAVAILABLE) {
          setFailureReason('GPS position unavailable. Please ensure location services are enabled on your device.')
        } else if (geoErr.code === geoErr.TIMEOUT) {
          setFailureReason('GPS location request timed out. Please try again.')
        } else {
          setFailureReason('Unable to acquire GPS coordinates.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md p-5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-3xl shadow-2xl">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-slate-900 dark:text-white text-base font-bold">
                {tBilingual('Smart Attendance Punch', 'ডিজিটাল উপস্থিতি হাজিরা')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs">
                {tBilingual('Authoritative QR & GPS Geofence Verification', 'কিউআর কোড ও জিপিএস জিওফেন্স যাচাইকরণ')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 1. SCANNING STAGE */}
        {stage === 'scan' && (
          <div className="space-y-4">
            {/* Punch Type Selector */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPunchType('CHECK_IN')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  punchType === 'CHECK_IN'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{tBilingual('Check-In (প্রবেশ)', 'প্রবেশ (Check-In)')}</span>
              </button>

              <button
                type="button"
                onClick={() => setPunchType('CHECK_OUT')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  punchType === 'CHECK_OUT'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <LogOut className="h-4 w-4" />
                <span>{tBilingual('Check-Out (প্রস্থান)', 'প্রস্থান (Check-Out)')}</span>
              </button>
            </div>

            {/* Camera Viewfinder */}
            <CameraQrScanner onScanSuccess={handleQrScanned} />

            {/* Geofence Notice */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>
                {tBilingual(
                  'Point camera at the printed InkFlow QR poster at your workplace. Your GPS location will be verified securely.',
                  'কর্মস্থলের দেওয়ালে বা ডেস্কে প্রিন্ট করা কিউআর কোড স্ক্যান করুন। জিপিএস স্বয়ংক্রিয়ভাবে যাচাই হবে।'
                )}
              </span>
            </div>
          </div>
        )}

        {/* 2. VERIFYING STAGE */}
        {stage === 'verifying' && (
          <div className="py-12 space-y-6 text-center animate-in fade-in duration-300">
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <RefreshCw className="h-12 w-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
              <MapPin className="h-6 w-6 text-emerald-600 dark:text-emerald-400 absolute" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {tBilingual('Verifying Attendance...', 'হাজিরা যাচাই হচ্ছে...')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                {tBilingual(
                  'Validating cryptographic QR token and calculating server-side geofence distance.',
                  'ক্রিপ্টোগ্রাফিক কিউআর টোকেন ও জিপিএস দূরত্ব হিসাব করা হচ্ছে।'
                )}
              </p>
            </div>

            {/* Multi-step pipeline pills */}
            <div className="space-y-2 max-w-xs mx-auto text-left text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-950 p-2.5 rounded-xl border border-emerald-200 dark:border-slate-800">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>QR Token Captured</span>
              </div>
              <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-slate-950 p-2.5 rounded-xl border border-indigo-200 dark:border-slate-800">
                <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
                <span>Acquiring GPS & Calculating Geofence</span>
              </div>
            </div>
          </div>
        )}

        {/* 3. SUCCESS STAGE */}
        {stage === 'success' && successRecord && (
          <div className="py-6 space-y-5 text-center animate-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-300 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs px-2.5 py-0.5 font-bold">
                {punchType === 'CHECK_IN' ? 'Check-In Accepted' : 'Check-Out Accepted'}
              </Badge>
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                {punchType === 'CHECK_IN' ? 'হাজিরা সফল হয়েছে!' : 'প্রস্থান সফল হয়েছে!'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Timestamp:{' '}
                <strong className="text-slate-900 dark:text-white font-mono">
                  {new Date(successRecord.checked_at).toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Dhaka',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  })}
                </strong>
              </p>
            </div>

            {/* Verification Detail Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-left text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Location:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {successRecord.location_name || 'Verified Workplace'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Distance from Center:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {Math.round(successRecord.distance_from_location_meters)}m
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 dark:text-slate-400">GPS Accuracy:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  ±{Math.round(successRecord.gps_accuracy_meters)}m
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-2xl shadow-sm cursor-pointer"
            >
              Done (সম্পন্ন)
            </Button>
          </div>
        )}

        {/* 4. FAILURE STAGE */}
        {stage === 'failure' && (
          <div className="py-6 space-y-5 text-center animate-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-full bg-rose-50 dark:bg-rose-500/20 border-2 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {tBilingual('Attendance Could Not Be Recorded', 'হাজিরা রেকর্ড করা সম্ভব হয়নি')}
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-300 font-medium max-w-xs mx-auto">
                {failureReason || 'Verification check failed.'}
              </p>
            </div>

            {verificationDetails && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-left">
                {verificationDetails.distanceMeters !== undefined && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>Calculated Distance:</span>
                    <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">
                      {verificationDetails.distanceMeters}m (Allowed: {verificationDetails.allowedRadiusMeters}m)
                    </span>
                  </div>
                )}
                {verificationDetails.accuracyMeters !== undefined && (
                  <div className="flex justify-between text-slate-500 dark:text-slate-400">
                    <span>GPS Accuracy:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">±{verificationDetails.accuracyMeters}m</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs h-11 rounded-2xl"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                type="button"
                onClick={() => setStage('scan')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-11 rounded-2xl shadow-sm cursor-pointer"
              >
                {tBilingual('Try Again', 'আবার চেষ্টা করুন')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
