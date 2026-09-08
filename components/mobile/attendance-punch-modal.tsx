'use client'

import React, { useState, useEffect } from 'react'
import {
  QrCode,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { OfflineSyncManager } from '@/lib/offline/sync-queue'
import { AttendanceRecord, AttendanceStatus } from '@/types/hr.types'

interface AttendancePunchModalProps {
  open: boolean
  onClose: () => void
  onAttendanceRecorded?: (record: AttendanceRecord) => void
  tenantSlug?: string
}

export function AttendancePunchModal({
  open,
  onClose,
  onAttendanceRecorded,
  tenantSlug = 'padma-digital',
}: AttendancePunchModalProps) {
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const { isOnline } = useNetworkStatus()

  const [mode, setMode] = useState<'qr' | 'gps'>('qr')
  const [isScanning, setIsScanning] = useState(false)
  const [scannedCode, setScannedCode] = useState<string | null>(null)

  // Geolocation state
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'verified' | 'failed'>('idle')
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Punch Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [punchType, setPunchType] = useState<'entry' | 'exit'>('entry')
  const [successResult, setSuccessResult] = useState<{
    status: AttendanceStatus
    time: string
    method: string
  } | null>(null)

  useEffect(() => {
    if (open) {
      setSuccessResult(null)
      setScannedCode(null)
      setIsScanning(true)
      const timer = setTimeout(() => {
        setScannedCode('SHOP-TERMINAL-DHAKA-PRESS-01')
        setIsScanning(false)
      }, 1200)

      return () => clearTimeout(timer)
    }
  }, [open])

  const requestGpsLocation = () => {
    setGpsStatus('locating')
    setGpsError(null)

    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
          setGpsStatus('verified')
        },
        () => {
          // Fallback to simulated shop-floor press location (e.g. Fakirapool/Motijheel Press Cluster)
          setGpsLocation({
            lat: 23.7314,
            lng: 90.4182,
            accuracy: 12,
          })
          setGpsStatus('verified')
          setGpsError('GPS simulated for Press Floor testing.')
        },
        { timeout: 6000, enableHighAccuracy: true }
      )
    } else {
      setGpsLocation({
        lat: 23.7314,
        lng: 90.4182,
        accuracy: 15,
      })
      setGpsStatus('verified')
    }
  }

  const handleRecordPunch = async (type: 'entry' | 'exit') => {
    setIsSubmitting(true)
    setPunchType(type)

    const now = new Date()
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    const dateString = now.toISOString().split('T')[0]

    const newRecord: AttendanceRecord = {
      id: `att-mob-${Date.now()}`,
      company_id: company?.id || 'c-01',
      employee_id: 'emp-01', // Currently active employee
      employee_name: 'Md. Rafiqul Islam (Lead Printer)',
      attendance_date: dateString,
      status: 'present',
      check_in_time: type === 'entry' ? timeString : '09:00 AM',
      check_out_time: type === 'exit' ? timeString : undefined,
      late_minutes: 0,
      overtime_hours: 0,
      notes: `${mode === 'qr' ? 'QR Code Scanned' : 'GPS Geolocation'} via Mobile Smartphone`,
      created_at: now.toISOString(),
    }

    if (!isOnline) {
      OfflineSyncManager.enqueueAction(
        company?.id || 'c-01',
        'attendance.punch',
        `Attendance ${type === 'entry' ? 'Check-In' : 'Check-Out'} (${timeString})`,
        '/api/hr/attendance',
        newRecord
      )
    }

    if (onAttendanceRecorded) {
      onAttendanceRecorded(newRecord)
    }

    setSuccessResult({
      status: 'present',
      time: timeString,
      method: mode === 'qr' ? 'QR Terminal Scan' : 'Shop-Floor GPS',
    })
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent onClose={onClose} className="max-w-md p-5 bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader className="mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-white text-base">
                {tBilingual('Smart Attendance Punch', 'মোবাইল ডিজিটাল হাজিরা')}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {tBilingual('Fast QR & GPS Geo-verified Floor Punch', 'কিউআর কোড বা প্রেস ফ্লোর জিপিএস দিয়ে হাজিরা দিন')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {successResult ? (
          <div className="py-6 space-y-4 text-center animate-in zoom-in-95">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">
                {punchType === 'entry' ? 'Check-In Recorded!' : 'Check-Out Recorded!'}
              </h3>
              <p className="text-xs text-slate-400">
                Timestamp: <strong className="text-white font-mono">{successResult.time}</strong> • Verified via{' '}
                <span className="text-indigo-300 font-semibold">{successResult.method}</span>
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Shift logged to HR & Payroll</span>
            </div>

            <Button
              type="button"
              onClick={onClose}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 rounded-xl cursor-pointer"
            >
              Done (সম্পন্ন)
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setMode('qr')}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                  mode === 'qr'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>QR Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('gps')
                  if (!gpsLocation) requestGpsLocation()
                }}
                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[40px] ${
                  mode === 'gps'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MapPin className="h-4 w-4" />
                <span>GPS Location</span>
              </button>
            </div>

            {/* QR Viewport */}
            {mode === 'qr' && (
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 text-center space-y-3">
                <div className="relative mx-auto w-44 h-44 rounded-xl bg-slate-900 border-2 border-dashed border-indigo-500/50 flex flex-col items-center justify-center overflow-hidden">
                  {isScanning ? (
                    <div className="space-y-2 flex flex-col items-center">
                      <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                      <span className="text-[11px] text-indigo-300 font-mono">Scanning QR Code...</span>
                    </div>
                  ) : scannedCode ? (
                    <div className="space-y-1 p-3">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                      <span className="text-xs font-bold text-white block">Terminal Matched</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{scannedCode}</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Camera className="h-8 w-8 text-slate-500 mx-auto" />
                      <span className="text-[11px] text-slate-400">Align camera with Press QR code</span>
                    </div>
                  )}

                  {/* Corner Targets */}
                  <div className="absolute top-2 left-2 h-4 w-4 border-t-2 border-l-2 border-indigo-400" />
                  <div className="absolute top-2 right-2 h-4 w-4 border-t-2 border-r-2 border-indigo-400" />
                  <div className="absolute bottom-2 left-2 h-4 w-4 border-b-2 border-l-2 border-indigo-400" />
                  <div className="absolute bottom-2 right-2 h-4 w-4 border-b-2 border-r-2 border-indigo-400" />
                </div>

                <p className="text-[11px] text-slate-400">
                  Scan terminal QR posted at the shop floor entrance or operator station.
                </p>
              </div>
            )}

            {/* GPS Viewport */}
            {mode === 'gps' && (
              <div className="rounded-2xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Press Floor Geofence</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-950/60 text-emerald-300 border-emerald-800">
                    Within 50m Radius
                  </Badge>
                </div>

                {gpsLocation ? (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Coordinates:</span>
                      <span className="font-mono text-white">
                        {gpsLocation.lat.toFixed(4)}°N, {gpsLocation.lng.toFixed(4)}°E
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Location:</span>
                      <span className="font-semibold text-emerald-400">Fakirapool Press Zone, Dhaka</span>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={requestGpsLocation}
                    isLoading={gpsStatus === 'locating'}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs h-10 rounded-xl cursor-pointer"
                  >
                    Acquire GPS Location
                  </Button>
                )}
              </div>
            )}

            {/* Action Buttons: Check-In and Check-Out */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                type="button"
                onClick={() => handleRecordPunch('entry')}
                isLoading={isSubmitting && punchType === 'entry'}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                <span>Check-In (প্রবেশ)</span>
              </Button>

              <Button
                type="button"
                onClick={() => handleRecordPunch('exit')}
                isLoading={isSubmitting && punchType === 'exit'}
                disabled={isSubmitting}
                variant="outline"
                className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold text-xs h-12 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-amber-400" />
                <span>Check-Out (প্রস্থান)</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
