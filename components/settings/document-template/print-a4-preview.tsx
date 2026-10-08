'use client'

import React, { useState, useRef } from 'react'
import {
  Eye,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DocumentTemplateSettings,
} from '@/types/document-template.types'
import { PrintLetterheadArt } from './print-letterhead-art'

interface LiveA4PreviewProps {
  settings: DocumentTemplateSettings
  companyName?: string
  companyLogoUrl?: string
  onPreviewPdf?: () => void
  onDownloadPdf?: () => void
}

export function LiveA4Preview({
  settings,
  companyName = 'PrintFlow',
  companyLogoUrl,
  onPreviewPdf,
  onDownloadPdf,
}: LiveA4PreviewProps) {
  const [sampleMode, setSampleMode] = useState<'sample' | 'blank' | 'real'>('sample')
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const totalPages = 1
  const canvasRef = useRef<HTMLDivElement>(null)

  // Mathematically convert mm padding to percentage of A4 (210mm x 297mm)
  const paddingTopPct = Math.min(Math.max((settings.padding_top / 297) * 100, 0), 40)
  const paddingBottomPct = Math.min(Math.max((settings.padding_bottom / 297) * 100, 0), 40)
  const paddingLeftPct = Math.min(Math.max((settings.padding_left / 210) * 100, 0), 25)
  const paddingRightPct = Math.min(Math.max((settings.padding_right / 210) * 100, 0), 25)

  // Document labels based on document_type
  const getDocTypeHeader = () => {
    switch (settings.document_type) {
      case 'invoice':
        return { en: 'TAX INVOICE', bn: 'চালান বিল', code: 'INV-2026-001' }
      case 'challan':
        return { en: 'DELIVERY CHALLAN', bn: 'ডেলিভারি চালান', code: 'DC-2026-001' }
      case 'receipt':
        return { en: 'MONEY RECEIPT', bn: 'মানি রিসিট', code: 'REC-2026-001' }
      case 'purchase_order':
        return { en: 'PURCHASE ORDER', bn: 'ক্রয়াদেশ', code: 'PO-2026-001' }
      case 'quotation':
      default:
        return { en: 'QUOTATION', bn: 'কোটেশন', code: 'QT-2026-001' }
    }
  }

  const docHeader = getDocTypeHeader()

  // Sample items
  const sampleItems = [
    {
      id: 1,
      title: 'ACP Signboard with LED',
      specs: 'Size: 12 ft x 3 ft • Front lit, Acrylic Letter, Complete Installation',
      qty: '1 pcs',
      unitPrice: '18,000',
      total: '18,000',
    },
    {
      id: 2,
      title: 'Vinyl Print with Lamination',
      specs: 'Size: 4 ft x 6 ft • Outdoor Grade, Matt Lamination',
      qty: '5 pcs',
      unitPrice: '950',
      total: '4,750',
    },
    {
      id: 3,
      title: 'PVC Board Print',
      specs: 'Size: 2 ft x 3 ft • 3mm PVC, High Resolution Print',
      qty: '10 pcs',
      unitPrice: '350',
      total: '3,500',
    },
    {
      id: 4,
      title: 'Standee Banner',
      specs: 'Size: 2 ft x 6 ft • Roll-up Standee with Print',
      qty: '2 pcs',
      unitPrice: '1,250',
      total: '2,500',
    },
    {
      id: 5,
      title: 'Installation & Transportation',
      specs: 'Site installation, electrical wiring & dispatch logistics',
      qty: '1 job',
      unitPrice: '1,500',
      total: '1,500',
    },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* 1. TOP PREVIEW TOOLBAR */}
      <div className="p-3.5 sm:px-5 border-b border-border flex items-center justify-between gap-3 bg-muted/40 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Eye className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold text-foreground truncate">
            Live Preview
          </span>
          <Badge variant="outline" className="text-xs font-semibold hidden sm:inline-flex border-border">
            A4 Portrait
          </Badge>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sample Data Switcher */}
          <select
            value={sampleMode}
            onChange={(e) => setSampleMode(e.target.value as 'sample' | 'blank' | 'real')}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Sample data preview mode"
          >
            <option value="sample">Sample Data</option>
            <option value="blank">Blank Template</option>
            <option value="real">Real Document</option>
          </select>

          {/* Zoom controls */}
          <div className="hidden sm:flex items-center border border-input rounded-lg bg-background p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(z - 15, 60))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-xs font-bold px-1.5 text-muted-foreground min-w-[42px] text-center tabular-nums">
              {zoomLevel}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 15, 140))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. LIVE A4 DOCUMENT CANVAS WRAPPER */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-muted/20">
        <div
          ref={canvasRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="w-full max-w-[620px] shadow-lg rounded-sm transition-transform"
        >
          {/* Actual A4 Sheet (210mm x 297mm Ratio) */}
          <div
            data-print-sheet="true"
            className="relative w-full aspect-[210/297] bg-card text-foreground overflow-hidden rounded-xs border border-border shadow-xs select-none"
          >
            {/* Background Letterhead Artwork (When enabled) */}
            {settings.use_letterhead && (
              settings.letterhead_file?.url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={settings.letterhead_file.url}
                  alt="Company Letterhead"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
                />
              ) : (
                <PrintLetterheadArt
                  documentTypeTitleEn={docHeader.en}
                  documentTypeTitleBn={docHeader.bn}
                  companyName={companyName}
                  mode={settings.letterhead_mode}
                />
              )
            )}

            {/* DYNAMIC SAFE AREA & CONTENT CONTAINER */}
            <div
              style={{
                position: 'absolute',
                top: `${paddingTopPct}%`,
                right: `${paddingRightPct}%`,
                bottom: `${paddingBottomPct}%`,
                left: `${paddingLeftPct}%`,
              }}
              className="z-10 flex flex-col justify-between overflow-hidden"
            >
              {/* Visual Safe Area Guideline (Dashed outline so user sees safe margins) */}
              <div
                className="absolute inset-0 border border-dashed border-primary/50 pointer-events-none rounded-xs"
                title="Safe Area / Content Padding Boundary"
              />

              {/* DOCUMENT CONTENT */}
              {sampleMode === 'blank' ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-border rounded-lg m-2">
                  <div className="p-3 rounded-full bg-muted text-muted-foreground mb-2">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h3 className="text-xs font-bold text-foreground uppercase">
                    Blank Document Template
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-xs mt-1">
                    Content safe area active ({settings.padding_top}mm Top, {settings.padding_right}mm Right, {settings.padding_bottom}mm Bottom, {settings.padding_left}mm Left)
                  </p>
                </div>
              ) : (
                <div
                  style={{ fontSize: '9px', lineHeight: '12px' }}
                  className="flex-1 flex flex-col justify-between text-foreground p-1.5 sm:p-2 overflow-hidden"
                >
                  {/* Top Section: Meta & Customer Header */}
                  <div className="space-y-2">
                    {/* Bill To & Quotation Meta Grid */}
                    <div className="flex items-start justify-between gap-4 border-b border-border pb-2">
                      {/* Customer / Bill To */}
                      <div className="space-y-0.5 max-w-[55%]">
                        <span
                          style={{ fontSize: '7.5px' }}
                          className="uppercase font-bold text-muted-foreground tracking-wider block"
                        >
                          Bill To / গ্রাহক:
                        </span>
                        <h4 className="text-xs sm:text-sm font-black text-foreground leading-tight">
                          ABC Enterprises Ltd.
                        </h4>
                        <p style={{ fontSize: '8.5px' }} className="font-semibold text-foreground">
                          Attn: Mr. Rahim Uddin (Head of Marketing)
                        </p>
                        <p style={{ fontSize: '8px' }} className="text-muted-foreground">
                          Customer ID: CUS-0001 • 123 Business Avenue, Gulshan, Dhaka
                        </p>
                        <p style={{ fontSize: '8px' }} className="text-muted-foreground">
                          Phone: +880 1711 222333 • Email: rahim@abc.com
                        </p>
                      </div>

                      {/* Document Meta Numbers */}
                      <div className="text-right space-y-0.5 min-w-[38%]">
                        <div style={{ fontSize: '8.5px' }} className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Document No :</span>
                          <span className="font-bold text-foreground tabular-nums">{docHeader.code}</span>
                        </div>
                        <div style={{ fontSize: '8.5px' }} className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Issue Date :</span>
                          <span className="font-semibold text-foreground">08 Oct 2026</span>
                        </div>
                        <div style={{ fontSize: '8.5px' }} className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Valid Until :</span>
                          <span className="font-semibold text-foreground">15 Oct 2026 (7 Days)</span>
                        </div>
                        <div style={{ fontSize: '8.5px' }} className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Sales Person :</span>
                          <span className="font-semibold text-foreground">Shahid Hossain</span>
                        </div>
                        <div style={{ fontSize: '8.5px' }} className="flex justify-between items-center">
                          <span className="text-muted-foreground font-medium">Reference :</span>
                          <span className="font-semibold text-foreground">Signage for Office</span>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-border rounded-xs overflow-hidden">
                      <table style={{ fontSize: '8px' }} className="w-full border-collapse">
                        <thead>
                          <tr className="bg-foreground text-background font-bold text-left">
                            <th className="py-1 px-1.5 w-6 text-center">SL</th>
                            <th className="py-1 px-1.5">Item Description</th>
                            {settings.item_display_mode === 'detailed' && (
                              <th className="py-1 px-1.5">Size / Specification</th>
                            )}
                            <th className="py-1 px-1.5 text-center w-12">Qty</th>
                            <th className="py-1 px-1.5 text-right w-16">Unit (BDT)</th>
                            <th className="py-1 px-1.5 text-right w-16">Total (BDT)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {sampleItems.map((item) => (
                            <tr key={item.id} className="hover:bg-muted/40">
                              <td className="py-1 px-1.5 text-center font-bold text-muted-foreground">
                                {item.id}
                              </td>
                              <td className="py-1 px-1.5 font-bold text-foreground">
                                {item.title}
                                {settings.item_display_mode === 'compact' && (
                                  <span style={{ fontSize: '7px' }} className="block text-muted-foreground font-normal">
                                    {item.specs}
                                  </span>
                                )}
                              </td>
                              {settings.item_display_mode === 'detailed' && (
                                <td style={{ fontSize: '7.5px' }} className="py-1 px-1.5 text-muted-foreground">
                                  {item.specs}
                                </td>
                              )}
                              <td className="py-1 px-1.5 text-center font-medium tabular-nums">
                                {item.qty}
                              </td>
                              <td className="py-1 px-1.5 text-right tabular-nums">
                                {item.unitPrice}
                              </td>
                              <td className="py-1 px-1.5 text-right font-bold text-foreground tabular-nums">
                                {item.total}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Middle Section: Production Specs & Financial Summary */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border">
                    {/* Left: Production & Delivery Milestones */}
                    <div
                      style={{ fontSize: '7.5px' }}
                      className="space-y-1 bg-muted/50 p-1.5 rounded-xs border border-border"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">Production Time:</span>
                        <span className="text-muted-foreground">3 - 5 Working Days</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">Delivery:</span>
                        <span className="text-muted-foreground">Within Dhaka & Nationwide</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">Payment Terms:</span>
                        <span className="text-muted-foreground">50% Advance, 50% Before Delivery</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">Warranty:</span>
                        <span className="text-muted-foreground">6 Months (Material & Installation)</span>
                      </div>
                    </div>

                    {/* Right: Financial Totals */}
                    <div style={{ fontSize: '8px' }} className="space-y-0.5 text-right">
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground font-medium">Sub Total:</span>
                        <span className="font-bold text-foreground tabular-nums">৳ 30,250</span>
                      </div>
                      <div className="flex justify-between py-0.5 text-destructive">
                        <span className="font-medium">Discount:</span>
                        <span className="font-bold tabular-nums">- ৳ 1,250</span>
                      </div>
                      <div className="flex justify-between py-0.5">
                        <span className="text-muted-foreground font-medium">VAT (15%):</span>
                        <span className="font-bold text-foreground tabular-nums">৳ 4,350</span>
                      </div>
                      <div
                        style={{ fontSize: '9px' }}
                        className="flex justify-between py-1 bg-foreground text-background px-2 rounded-xs font-bold"
                      >
                        <span>Grand Total (BDT):</span>
                        <span className="tabular-nums">৳ 33,350</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Section: Terms & Signatures */}
                  <div className="space-y-1.5 pt-1 border-t border-border">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      {/* Terms */}
                      <div style={{ fontSize: '7px' }} className="col-span-7 space-y-0.5 text-muted-foreground">
                        <span className="font-bold text-foreground uppercase block">
                          Terms & Conditions:
                        </span>
                        <p className="whitespace-pre-line leading-tight">
                          {settings.terms_and_conditions}
                        </p>
                      </div>

                      {/* Signatures */}
                      <div style={{ fontSize: '7.5px' }} className="col-span-5 grid grid-cols-2 gap-2 text-center">
                        {/* Prepared By */}
                        <div className="space-y-1">
                          <div className="h-6 flex items-end justify-center">
                            <span style={{ fontSize: '11px' }} className="font-serif italic font-bold text-foreground">
                              Shahid
                            </span>
                          </div>
                          <div className="border-t border-border pt-0.5">
                            <p className="font-bold text-foreground leading-none">Shahid Hossain</p>
                            <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">Sales Executive</p>
                          </div>
                        </div>

                        {/* Approved By */}
                        <div className="space-y-1">
                          <div className="h-6 flex items-end justify-center">
                            <span style={{ fontSize: '8px' }} className="text-muted-foreground">Official Seal</span>
                          </div>
                          <div className="border-t border-border pt-0.5">
                            <p className="font-bold text-foreground leading-none">Authorized Signatory</p>
                            <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">Managing Director</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM PREVIEW FOOTER & PAGINATION */}
      <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/40 shrink-0">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="h-7 w-7 p-0 cursor-pointer"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="font-bold text-foreground tabular-nums px-2">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="h-7 w-7 p-0 cursor-pointer"
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onPreviewPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPreviewPdf}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Preview PDF</span>
            </Button>
          )}

          {onDownloadPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
