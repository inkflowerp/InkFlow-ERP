'use client'

import React, { useRef, useState } from 'react'
import {
  Printer,
  Download,
  ShieldCheck,
  MapPin,
  QrCode,
  Copy,
  Check,
  AlertTriangle,
  Building2,
  FileImage,
} from 'lucide-react'
import QRCode from 'qrcode'
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
  const [copied, setCopied] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const activeToken = location.active_qr_token
  const isTokenActive = Boolean(activeToken && activeToken.is_active)

  const qrValue =
    activeToken?.qr_payload_url ||
    (activeToken?.raw_token ? `PRINTFLOW:ATT:v1:${activeToken.raw_token}` : null) ||
    `PRINTFLOW:ATT:LOC:${location.id}`

  const terminalCode =
    activeToken?.token_prefix || `LOC-${location.id.slice(0, 8).toUpperCase()}`

  const generatedDate = formatDate(
    activeToken?.created_at || new Date(),
    'en',
    { day: '2-digit', month: 'short', year: 'numeric' }
  )

  const handlePrint = () => {
    window.print()
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(terminalCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Copy failed', err)
    }
  }

  const handleDownloadSvg = async () => {
    try {
      setIsDownloading(true)
      // Generate clean standalone SVG with proper XML declarations and error correction
      const svgString = await QRCode.toString(qrValue, {
        type: 'svg',
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })

      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${location.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr.svg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to export vector SVG:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDownloadPng = async () => {
    try {
      setIsDownloading(true)
      // Generate high-resolution 1024x1024 PNG for print production
      const dataUrl = await QRCode.toDataURL(qrValue, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${location.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr-1024px.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to export PNG:', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar (hidden when printing) */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted border border-border rounded-xl print:hidden">
        <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
          <QrCode className="h-4 w-4 text-primary shrink-0" />
          <span>
            {tBilingual(
              'Printable QR Poster for Location Entrance',
              'লোকেশন প্রবেশদ্বারের জন্য প্রিন্ট উপযোগী পোস্টার'
            )}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs border-border cursor-pointer"
            >
              {tBilingual('Close', 'বন্ধ করুন')}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyCode}
            className="h-8 text-xs border-border bg-card hover:bg-muted text-foreground flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{copied ? 'Copied' : terminalCode}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadSvg}
            disabled={isDownloading}
            className="h-8 text-xs border-primary/40 bg-card hover:bg-muted text-primary font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>SVG (ভেক্টর)</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPng}
            disabled={isDownloading}
            className="h-8 text-xs border-border bg-card hover:bg-muted text-foreground font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <FileImage className="h-3.5 w-3.5 text-muted-foreground" />
            <span>PNG (হাই-রেজ)</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Poster (প্রিন্ট করুন)</span>
          </Button>
        </div>
      </div>

      {!isTokenActive && (
        <div className="p-3 bg-warning-surface border border-warning-border rounded-xl flex items-center gap-2 text-xs text-warning print:hidden">
          <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
          <span>
            {tBilingual(
              'Notice: No active rotating token detected for this location. Scan verification will fall back to location binding.',
              'সতর্কতা: এই লোকেশনে সক্রিয় রোটেটিং টোকেন নেই। উপস্থিতি লোকেশন বাইন্ডিং দ্বারা যাচাই হবে।'
            )}
          </span>
        </div>
      )}

      {/* Printable Poster Sheet (A4 format with isolation attribute) */}
      <div
        ref={posterRef}
        data-print-isolate="true"
        data-qr-poster-canvas="true"
        className="bg-card text-foreground print:bg-white print:text-black p-6 sm:p-10 rounded-2xl border border-border shadow-xs max-w-xl mx-auto print:max-w-none print:w-full print:h-[275mm] print:max-h-[275mm] print:p-7 print:border-2 print:border-border print:rounded-2xl print:shadow-none print:flex print:flex-col print:justify-between print:space-y-0 space-y-5"
      >
        {/* Poster Header: Logo/Icon in Left, Company Name in Right */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-border pb-5 print:pb-4">
          {/* Left: Organization Logo / Icon */}
          <div className="shrink-0 flex items-center">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={companyName}
                className="h-14 sm:h-16 print:h-16 w-auto object-contain max-w-[180px] sm:max-w-[220px]"
              />
            ) : (
              <div className="inline-flex items-center justify-center h-14 w-14 sm:h-16 sm:w-16 print:h-16 print:w-16 rounded-2xl bg-primary/10 text-primary border border-primary/20">
                <Building2 className="h-7 w-7 sm:h-8 sm:w-8 print:h-8 print:w-8" />
              </div>
            )}
          </div>

          {/* Right: Company Name & Smart Attendance Terminal Badge */}
          <div className="flex flex-col items-end text-right space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl print:text-3xl font-black text-foreground print:text-black tracking-tight uppercase leading-tight">
              {companyNameBn || companyName}
            </h1>
            {companyNameBn && companyName && (
              <p className="text-xs sm:text-sm print:text-sm text-muted-foreground print:text-black/80 font-bold tracking-wider uppercase">
                {companyName}
              </p>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs print:text-sm font-bold tracking-wider uppercase mt-0.5">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>PrintFlow • Smart Attendance Terminal</span>
            </div>
          </div>
        </div>

        {/* Location Badge */}
        <div className="text-center space-y-1.5 print:space-y-1 py-1 print:py-2">
          <span className="text-xs print:text-sm font-bold text-primary uppercase tracking-widest block">
            Official Attendance Terminal (অফিসিয়াল হাজিরা পয়েন্ট)
          </span>
          <h2 className="text-xl sm:text-2xl print:text-3xl font-black text-foreground print:text-black tracking-tight">
            {location.name}
          </h2>
          {location.branch_name && (
            <p className="text-xs sm:text-sm print:text-sm font-semibold text-foreground print:text-black">
              Branch: {location.branch_name}
            </p>
          )}
          {location.address && (
            <p className="text-xs sm:text-sm print:text-sm text-muted-foreground print:text-black/70 flex items-center justify-center gap-1.5 max-w-md mx-auto">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span>{location.address}</span>
            </p>
          )}
        </div>

        {/* High-Resolution QR Code Container */}
        <div className="flex flex-col items-center justify-center my-3 print:my-2">
          <div className="p-4 sm:p-5 print:p-5 bg-card border-4 border-border rounded-3xl shadow-xs relative">
            <QRCodeSVG
              value={qrValue}
              size={280}
              bgColor="#FFFFFF"
              fgColor="#0F172A"
              level="H"
              includeMargin={false}
              className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] print:w-[310px] print:h-[310px] rounded-xl"
            />
            {/* Corner Target Markers */}
            <div className="absolute -top-2.5 -left-2.5 w-7 h-7 border-t-4 border-l-4 border-primary" />
            <div className="absolute -top-2.5 -right-2.5 w-7 h-7 border-t-4 border-r-4 border-primary" />
            <div className="absolute -bottom-2.5 -left-2.5 w-7 h-7 border-b-4 border-l-4 border-primary" />
            <div className="absolute -bottom-2.5 -right-2.5 w-7 h-7 border-b-4 border-r-4 border-primary" />
          </div>

          <div className="mt-3.5 print:mt-3 text-center space-y-1">
            <div className="inline-block px-3.5 py-1 bg-muted rounded-lg text-xs print:text-sm tabular-nums font-bold text-foreground print:text-black border border-border">
              Terminal Code: {terminalCode}
            </div>
            <p className="text-xs print:text-sm text-muted-foreground print:text-black/70 font-medium">
              Geofence Radius: <strong className="text-foreground print:text-black">{location.radius_meters}m</strong>
              {location.latitude !== 0 && location.longitude !== 0 && (
                <span> • GPS: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Step-by-Step Instructions */}
        <div className="p-4 print:p-4 rounded-xl bg-muted/60 border border-border text-center space-y-2.5 print:space-y-2">
          <h3 className="text-sm print:text-base font-bold text-foreground print:text-black">
            কিভাবে হাজিরা দিবেন? / How to Punch Attendance?
          </h3>
          <ol className="text-xs sm:text-sm print:text-sm text-muted-foreground print:text-black/80 space-y-1.5 print:space-y-1 text-left list-decimal list-inside font-medium max-w-md mx-auto">
            <li>স্মার্টফোনে <strong>PrintFlow</strong> অ্যাপ বা ব্রাউজারে লগইন করুন।</li>
            <li>মেনু থেকে <strong>&ldquo;Attendance&rdquo;</strong> অপশন সিলেক্ট করুন।</li>
            <li><strong>&ldquo;Scan QR&rdquo;</strong> বাটনে ট্যাপ করে ক্যামেরা দিয়ে এই কিউআর কোড স্ক্যান করুন।</li>
            <li>ডিভাইস লোকেশন (GPS) সক্রিয় রেখে উপস্থিতি নিশ্চিত করুন।</li>
          </ol>
        </div>

        {/* Security & Anti-Fraud Disclaimer */}
        <div className="p-2.5 print:p-2.5 rounded-lg border border-border/80 bg-background text-center text-xs sm:text-sm print:text-sm text-muted-foreground print:text-black/70">
          <p className="font-medium">
            নোটিশ: শুধুমাত্র অনুমোদিত কর্মস্থলের নির্ধারিত সীমানার মধ্যে এই কিউআর কার্যকর। অননুমোদিত ছবি তোলা বা প্রক্সি হাজিরা সম্পূর্ণ নিষিদ্ধ।
          </p>
        </div>

        {/* Footer Meta */}
        <div className="pt-3 print:pt-3 border-t border-border flex items-center justify-between text-xs sm:text-sm print:text-sm text-muted-foreground print:text-black/70 tabular-nums">
          <div>
            <span>Generated: {generatedDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-success font-bold">
            <ShieldCheck className="h-4 w-4" />
            <span>Server Verified • Geofenced</span>
          </div>
        </div>
      </div>
    </div>
  )
}