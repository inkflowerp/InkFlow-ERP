'use client'

import React, { useRef } from 'react'
import { Printer, Download, ShieldCheck, MapPin, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QRCodeSVG } from './qr-code-svg'
import { AttendanceLocationRecord } from '@/types/attendance.types'
import { useI18n } from '@/i18n/context'
import { formatDate } from '@/lib/formatters'

interface PrintableQrPosterProps {
  location: AttendanceLocationRecord
  companyName: string
  companyNameBn?: string | null
  logoUrl?: string | null
  onClose?: () => void
}

export function PrintableQrPoster({
  location,
  companyName,
  companyNameBn,
  logoUrl,
  onClose,
}: PrintableQrPosterProps) {
  const { tBilingual } = useI18n()
  const posterRef = useRef<HTMLDivElement>(null)

  const activeToken = location.active_qr_token
  const qrValue = activeToken?.raw_token
    ? `INKFLOW:ATT:v1:${activeToken.raw_token}`
    : `INKFLOW:ATT:LOC:${location.id}`

  const generatedDate = formatDate(
    activeToken?.created_at || new Date(),
    'en',
    { day: '2-digit', month: 'short', year: 'numeric' }
  )

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadSvg = () => {
    const svgElement = posterRef.current?.querySelector('svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${location.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr.svg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Top Action Bar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border border-slate-800 rounded-xl print:hidden">
        <div className="flex items-center gap-2 text-slate-300 text-xs">
          <QrCode className="h-4 w-4 text-indigo-400" />
          <span>{tBilingual('Printable QR Poster for Location Entrance', 'লোকেশন প্রবেশদ্বারের জন্য প্রিন্ট উপযোগী পোস্টার')}</span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8 text-xs border-slate-700">
              Close
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadSvg}
            className="h-8 text-xs border-indigo-500/40 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download SVG</span>
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Poster (প্রিন্ট করুন)</span>
          </Button>
        </div>
      </div>

      {/* Printable Poster Sheet (A4 format) */}
      <div
        ref={posterRef}
        className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl border border-slate-300 shadow-2xl max-w-lg mx-auto print:max-w-none print:w-full print:p-8 print:shadow-none print:border-none print:rounded-none"
      >
        {/* Poster Header */}
        <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold tracking-wider uppercase">
            <ShieldCheck className="h-4 w-4" />
            <span>InkFlow ERP • Smart Attendance</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase">
            {companyNameBn || companyName}
          </h1>
          {companyNameBn && companyName && (
            <p className="text-xs text-slate-500 font-semibold tracking-wide uppercase">{companyName}</p>
          )}
        </div>

        {/* Location Badge */}
        <div className="my-6 text-center space-y-1">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest block">
            Official Attendance Terminal (হাজিরা পয়েন্ট)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {location.name}
          </h2>
          {location.address && (
            <p className="text-xs text-slate-600 flex items-center justify-center gap-1 max-w-xs mx-auto">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{location.address}</span>
            </p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="p-4 bg-white border-4 border-slate-900 rounded-3xl shadow-lg relative">
            <QRCodeSVG
              value={qrValue}
              size={220}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              includeMargin={false}
              className="rounded-xl"
            />
            {/* Corner Target Markers */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-indigo-600" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-indigo-600" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-indigo-600" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-indigo-600" />
          </div>

          <div className="mt-4 text-center space-y-1">
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700">
              Terminal Code: {activeToken?.token_prefix || `LOC-${location.id.slice(0, 8)}`}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Geofence Radius: <strong className="text-slate-800">{location.radius_meters}m</strong>
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
          <h3 className="text-sm font-bold text-slate-900">
            কিভাবে হাজিরা দিবেন? / How to Punch?
          </h3>
          <ol className="text-xs text-slate-600 space-y-1 text-left list-decimal list-inside font-medium max-w-xs mx-auto">
            <li>InkFlow অ্যাপ বা ব্রাউজারে লগইন করুন।</li>
            <li><strong className="text-slate-800">Attendance</strong> অপশন সিলেক্ট করুন।</li>
            <li>ক্যামেরা দিয়ে এই কিউআর কোড স্ক্যান করুন।</li>
            <li>ডিভাইস লোকেশন সক্রিয় করে হাজিরা নিশ্চিত করুন।</li>
          </ol>
        </div>

        {/* Footer Meta */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div>
            <span>Generated: {generatedDate}</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 font-bold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Server Verified • Geofenced</span>
          </div>
        </div>
      </div>
    </div>
  )
}
