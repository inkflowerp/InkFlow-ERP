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
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-surface-inset border border-border rounded-xl print:hidden">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <QrCode className="h-4 w-4 text-primary"/>
          <span>{tBilingual('Printable QR Poster for Location Entrance', 'লোকেশন প্রবেশদ্বারের জন্য প্রিন্ট উপযোগী পোস্টার')}</span>
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button type="button"variant="outline"size="sm"onClick={onClose} className="h-8 text-xs border-border">
 Close
            </Button>
          )}
          <Button
 type="button"variant="outline"onClick={handleDownloadSvg}
 className="h-8 text-xs border-primary/40 bg-card-elevated hover:bg-card-elevated text-primary font-bold flex items-center gap-1.5 cursor-pointer">
            <Download className="h-3.5 w-3.5"/>
            <span>Download SVG</span>
          </Button>
          <Button
 type="button"onClick={handlePrint}
 className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5 cursor-pointer shadow-xs">
            <Printer className="h-3.5 w-3.5"/>
            <span>Print Poster (প্রিন্ট করুন)</span>
          </Button>
        </div>
      </div>

      {/* Printable Poster Sheet (A4 format) */}
      <div
 ref={posterRef}
 className="bg-card text-foreground print:bg-background print:text-foreground p-8 sm:p-12 rounded-xl border border-input shadow-lg max-w-lg mx-auto print:max-w-none print:w-full print:p-8 print:shadow-none print:border-none print:rounded-none">
        {/* Poster Header */}
        <div className="text-center space-y-2 border-b-2 border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold tracking-wider uppercase">
            <ShieldCheck className="h-4 w-4"/>
            <span>InkFlow ERP • Smart Attendance</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight uppercase">
            {companyNameBn || companyName}
          </h1>
          {companyNameBn && companyName && (
            <p className="text-xs text-muted-foreground font-semibold tracking-wide uppercase">{companyName}</p>
          )}
        </div>

        {/* Location Badge */}
        <div className="my-6 text-center space-y-1">
          <span className="text-xs font-bold text-primary uppercase tracking-widest block">
 Official Attendance Terminal (হাজিরা পয়েন্ট)
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            {location.name}
          </h2>
          {location.address && (
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1 max-w-xs mx-auto">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0"/>
              <span>{location.address}</span>
            </p>
          )}
        </div>

        {/* QR Code Container */}
        <div className="my-8 flex flex-col items-center justify-center">
          <div className="p-4 bg-card border-4 border-border rounded-3xl shadow-xs relative">
            <QRCodeSVG
 value={qrValue}
 size={220}
 bgColor="#FFFFFF"fgColor="#0F172A"includeMargin={false}
 className="rounded-xl"/>
            {/* Corner Target Markers */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-4 border-l-4 border-primary"/>
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-4 border-r-4 border-primary"/>
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-4 border-l-4 border-primary"/>
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-4 border-r-4 border-primary"/>
          </div>

          <div className="mt-4 text-center space-y-1">
            <div className="inline-block px-3 py-1 bg-muted rounded-lg text-xs tabular-nums font-bold text-foreground">
 Terminal Code: {activeToken?.token_prefix || `LOC-${location.id.slice(0, 8)}`}
            </div>
            <p className="text-xs text-muted-foreground font-medium">
 Geofence Radius: <strong className="text-foreground">{location.radius_meters}m</strong>
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-muted border border-border text-center space-y-2">
          <h3 className="text-sm font-bold text-foreground">
            কিভাবে হাজিরা দিবেন? / How to Punch?
          </h3>
          <ol className="text-xs text-muted-foreground space-y-1 text-left list-decimal list-inside font-medium max-w-xs mx-auto">
            <li>InkFlow অ্যাপ বা ব্রাউজারে লগইন করুন।</li>
            <li><strong className="text-foreground">Attendance</strong> অপশন সিলেক্ট করুন।</li>
            <li>ক্যামেরা দিয়ে এই কিউআর কোড স্ক্যান করুন।</li>
            <li>ডিভাইস লোকেশন সক্রিয় করে হাজিরা নিশ্চিত করুন।</li>
          </ol>
        </div>

        {/* Footer Meta */}
        <div className="mt-8 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground tabular-nums">
          <div>
            <span>Generated: {generatedDate}</span>
          </div>
          <div className="flex items-center gap-1 text-success font-bold">
            <ShieldCheck className="h-3.5 w-3.5"/>
            <span>Server Verified • Geofenced</span>
          </div>
        </div>
      </div>
    </div>
  )
}