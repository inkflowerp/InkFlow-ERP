'use client'

import React, { useState, useRef } from 'react'
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Calendar,
  Clock,
  User,
  Tag,
  ShieldCheck,
  CreditCard,
  Truck,
  Settings as Cog,
  CheckCircle2,
  Building2,
  Hash,
  Landmark,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DocumentTemplateSettings,
  DocumentTypeKey,
} from '@/types/document-template.types'
import { PrintLetterheadArt } from './print-letterhead-art'

interface LiveA4PreviewProps {
  settings: DocumentTemplateSettings
  activeDocType?: DocumentTypeKey
  onDocTypeChange?: (docType: DocumentTypeKey) => void
  companyName?: string
  companyLogoUrl?: string
  onPreviewPdf?: () => void
  onDownloadPdf?: () => void
}

export function LiveA4Preview({
  settings,
  activeDocType = 'quotation',
  onDocTypeChange,
  companyName = 'PrintFlow',
  companyLogoUrl,
}: LiveA4PreviewProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const totalPages = 1
  const canvasRef = useRef<HTMLDivElement>(null)

  // Mathematically convert mm padding to percentage of A4 (210mm x 297mm)
  const paddingTopPct = Math.min(Math.max((settings.padding_top / 297) * 100, 0), 40)
  const paddingBottomPct = Math.min(Math.max((settings.padding_bottom / 297) * 100, 0), 40)
  const paddingLeftPct = Math.min(Math.max((settings.padding_left / 210) * 100, 0), 25)
  const paddingRightPct = Math.min(Math.max((settings.padding_right / 210) * 100, 0), 25)

  // Determine current active document key
  const effectiveDocType = settings.document_type || activeDocType || 'quotation'

  // Document labels based on document_type
  const getDocTypeHeader = () => {
    switch (effectiveDocType) {
      case 'invoice':
        return { en: 'TAX INVOICE', bn: 'চালান বিল', code: 'INV-2025-1001', title: 'Invoice' }
      case 'challan':
        return { en: 'DELIVERY CHALLAN', bn: 'ডেলিভারি চালান', code: 'DC-2025-1001', title: 'Challan' }
      case 'receipt':
        return { en: 'MONEY RECEIPT', bn: 'মানি রিসিট', code: 'REC-2025-1001', title: 'Receipt' }
      case 'purchase_order':
        return { en: 'PURCHASE ORDER', bn: 'ক্রয়াদেশ', code: 'PO-2025-1001', title: 'Purchase Order' }
      case 'quotation':
      default:
        return { en: 'QUOTATION', bn: 'কোটেশন', code: 'QT-2025-1001', title: 'Quotation' }
    }
  }

  const docHeader = getDocTypeHeader()

  // 5 Sample items strictly matching the reference design
  const sampleItems = [
    {
      id: 1,
      title: 'ACP Signboard with LED',
      subtext: 'Front lit, Acrylic Letter, Complete Installation',
      specs: '12 ft x 3 ft',
      qty: '1 pcs',
      unitPrice: '18,000',
      total: '18,000',
    },
    {
      id: 2,
      title: 'Vinyl Print with Lamination',
      subtext: 'Outdoor Grade, Matt Lamination',
      specs: '4 ft x 6 ft',
      qty: '5 pcs',
      unitPrice: '950',
      total: '4,750',
    },
    {
      id: 3,
      title: 'PVC Board Print',
      subtext: '3mm PVC, High Resolution Print',
      specs: '2 ft x 3 ft',
      qty: '10 pcs',
      unitPrice: '350',
      total: '3,500',
    },
    {
      id: 4,
      title: 'Standee Banner',
      subtext: 'Roll-up Standee with Print',
      specs: '2 ft x 6 ft',
      qty: '2 pcs',
      unitPrice: '1,250',
      total: '2,500',
    },
    {
      id: 5,
      title: 'Installation & Transportation',
      subtext: 'Site installation and delivery',
      specs: '-',
      qty: '1 job',
      unitPrice: '1,500',
      total: '1,500',
    },
  ]

  const sampleDocOptions: { key: DocumentTypeKey; label: string }[] = [
    { key: 'quotation', label: 'Sample Quotation' },
    { key: 'invoice', label: 'Sample Invoice' },
    { key: 'challan', label: 'Sample Delivery Challan' },
    { key: 'receipt', label: 'Sample Payment Receipt' },
    { key: 'purchase_order', label: 'Sample Purchase Order' },
  ]

  return (
    <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* 1. TOP PREVIEW TOOLBAR */}
      <div className="p-3.5 sm:px-5 border-b border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-bold text-foreground">
            Live Preview
          </span>
        </div>

        {/* Sample Document Switcher Dropdown */}
        <select
          value={effectiveDocType}
          onChange={(e) => {
            const nextType = e.target.value as DocumentTypeKey
            if (onDocTypeChange) {
              onDocTypeChange(nextType)
            }
          }}
          className="h-8 rounded-lg border border-input bg-card px-2.5 text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
          aria-label="Sample Document Type Preview"
        >
          {sampleDocOptions.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 2. LIVE A4 DOCUMENT CANVAS WRAPPER */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center bg-muted/30">
        <div
          ref={canvasRef}
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className="w-full max-w-[620px] shadow-md rounded-xs transition-transform"
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
              {/* Visual Safe Area Guideline (Cyan/Blue dashed outline matching reference) */}
              <div
                className="absolute inset-0 border border-dashed border-sky-400 pointer-events-none rounded-xs"
                title="Safe Area / Content Padding Boundary"
              />

              {/* DOCUMENT CONTENT */}
              <div
                style={{ fontSize: '9px', lineHeight: '12px' }}
                className="flex-1 flex flex-col justify-between text-foreground p-1 sm:p-2 overflow-hidden"
              >
                {/* Top Section: Meta & Customer Header */}
                <div className="space-y-1.5">
                  {/* Bill To & Quotation Meta Grid */}
                  <div className="flex items-start justify-between gap-4 pb-1.5">
                    {/* Customer / Bill To */}
                    <div className="space-y-0.5 max-w-[55%]">
                      <span
                        style={{ fontSize: '9px' }}
                        className="font-bold text-foreground block"
                      >
                        {effectiveDocType === 'challan'
                          ? 'Deliver To / প্রাপক:'
                          : effectiveDocType === 'receipt'
                          ? 'Received From / পরিশোধকারী:'
                          : 'Bill To / গ্রাহক:'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-black text-foreground leading-tight">
                        ABC Enterprises Ltd.
                      </h4>
                      <p style={{ fontSize: '8.5px' }} className="font-semibold text-foreground">
                        Attn: Mr. Rahim Uddin
                      </p>
                      <p style={{ fontSize: '8px' }} className="text-muted-foreground">
                        Customer ID: CUS-0001
                      </p>
                      <p style={{ fontSize: '8px' }} className="text-muted-foreground">
                        123 Business Avenue, Gulshan, Dhaka-1212
                      </p>
                      <p style={{ fontSize: '8px' }} className="text-muted-foreground">
                        Phone: +880 1711 222333 • Email: rahim@abc.com
                      </p>
                    </div>

                    {/* Document Meta Numbers with Icons */}
                    <div className="space-y-0.5 min-w-[42%] text-left">
                      <div style={{ fontSize: '8px' }} className="flex items-center gap-1.5">
                        <FileText className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          {effectiveDocType === 'invoice'
                            ? 'Invoice No'
                            : effectiveDocType === 'challan'
                            ? 'Challan No'
                            : effectiveDocType === 'receipt'
                            ? 'Receipt No'
                            : effectiveDocType === 'purchase_order'
                            ? 'PO Number'
                            : 'Quotation No'}
                        </span>
                        <span className="text-muted-foreground">:</span>
                        <span className="font-bold text-foreground tabular-nums">{docHeader.code}</span>
                      </div>
                      <div style={{ fontSize: '8px' }} className="flex items-center gap-1.5">
                        <Calendar className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium">Issue Date</span>
                        <span className="text-muted-foreground ml-4">:</span>
                        <span className="font-semibold text-foreground">08 Oct 2025</span>
                      </div>
                      <div style={{ fontSize: '8px' }} className="flex items-center gap-1.5">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          {effectiveDocType === 'invoice'
                            ? 'Due Date'
                            : effectiveDocType === 'challan'
                            ? 'Dispatch Date'
                            : effectiveDocType === 'receipt'
                            ? 'Settlement'
                            : 'Valid Until'}
                        </span>
                        <span className="text-muted-foreground ml-4">:</span>
                        <span className="font-semibold text-foreground">15 Oct 2025</span>
                      </div>
                      <div style={{ fontSize: '8px' }} className="flex items-center gap-1.5">
                        <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium">
                          {effectiveDocType === 'receipt' ? 'Cashier' : 'Sales Person'}
                        </span>
                        <span className="text-muted-foreground ml-1">:</span>
                        <span className="font-semibold text-foreground">Shahid Hossain</span>
                      </div>
                      <div style={{ fontSize: '8px' }} className="flex items-center gap-1.5">
                        <Tag className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground font-medium">Reference</span>
                        <span className="text-muted-foreground ml-3">:</span>
                        <span className="font-semibold text-foreground">Signage for Office</span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table with Dark Green Header */}
                  <div className="border border-border rounded-xs overflow-hidden">
                    <table style={{ fontSize: '8px' }} className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#064E3B] text-white font-bold text-left">
                          <th className="py-1 px-1.5 w-6 text-center">SL</th>
                          <th className="py-1 px-1.5">Item Description</th>
                          {settings.item_display_mode === 'detailed' && (
                            <th className="py-1 px-1.5">Size / Specification</th>
                          )}
                          <th className="py-1 px-1.5 text-center w-10">Qty</th>
                          <th className="py-1 px-1.5 text-right w-16">Unit (BDT)</th>
                          <th className="py-1 px-1.5 text-right w-16">Total (BDT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sampleItems.map((item) => (
                          <tr key={item.id} className="hover:bg-muted/30">
                            <td className="py-1 px-1.5 text-center font-bold text-muted-foreground">
                              {item.id}
                            </td>
                            <td className="py-1 px-1.5">
                              <span className="font-bold text-foreground block">
                                {item.title}
                              </span>
                              {settings.item_display_mode === 'detailed' && (
                                <span style={{ fontSize: '7px' }} className="text-muted-foreground block leading-tight">
                                  {item.subtext}
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

                {/* Middle Section: Specifications & Financial Summary */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {/* Left: Milestones or Banking Specs */}
                  <div
                    style={{ fontSize: '7.5px' }}
                    className="space-y-1 bg-muted/30 p-1.5 rounded-xs border border-border"
                  >
                    {effectiveDocType === 'invoice' || effectiveDocType === 'receipt' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Landmark className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Bank Account:</span>
                          <span className="text-muted-foreground">City Bank Ltd • Gulshan</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">A/C Number:</span>
                          <span className="text-muted-foreground font-mono">1102938472001</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">bKash / Nagad:</span>
                          <span className="text-muted-foreground font-mono">+880 1712 345678 (Merchant)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Mushak Status:</span>
                          <span className="text-muted-foreground">NBR 15% VAT Compliant</span>
                        </div>
                      </>
                    ) : effectiveDocType === 'challan' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Vehicle No:</span>
                          <span className="text-muted-foreground">Dhaka Metro Ka-1234</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Driver Contact:</span>
                          <span className="text-muted-foreground">+880 1819 998877</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Dispatch Store:</span>
                          <span className="text-muted-foreground">Central Factory Warehouse</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Quality Check:</span>
                          <span className="text-muted-foreground">100% Passed Final QA</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Cog className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Production Time:</span>
                          <span className="text-muted-foreground">3 - 5 Working Days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Delivery:</span>
                          <span className="text-muted-foreground">Within Dhaka & Nationwide</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Payment Terms:</span>
                          <span className="text-muted-foreground">50% Advance, 50% Before Delivery</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          <span className="font-bold text-foreground">Warranty:</span>
                          <span className="text-muted-foreground">6 Months (Material & Installation)</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Financial Totals */}
                  <div style={{ fontSize: '8px' }} className="space-y-0.5 text-right">
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground font-medium">Sub Total:</span>
                      <span className="font-bold text-foreground tabular-nums">30,250</span>
                    </div>
                    <div className="flex justify-between py-0.5 text-destructive">
                      <span className="font-medium">Discount:</span>
                      <span className="font-bold tabular-nums">- 1,250</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-muted-foreground font-medium">VAT (15%):</span>
                      <span className="font-bold text-foreground tabular-nums">4,350</span>
                    </div>
                    <div
                      style={{ fontSize: '9px' }}
                      className="flex justify-between py-1 bg-[#064E3B] text-white px-2 rounded-xs font-bold"
                    >
                      <span>
                        {effectiveDocType === 'receipt'
                          ? 'Total Received (BDT):'
                          : 'Grand Total (BDT):'}
                      </span>
                      <span className="tabular-nums">33,350</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Terms & Signatures */}
                <div className="space-y-1 pt-1 border-t border-border">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    {/* Terms */}
                    <div style={{ fontSize: '6.5px' }} className="col-span-7 space-y-0.5 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5 text-foreground shrink-0" />
                        <span className="font-bold text-foreground uppercase block">
                          Terms & Conditions
                        </span>
                      </div>
                      <p className="whitespace-pre-line leading-tight">
                        {settings.terms_and_conditions}
                      </p>
                    </div>

                    {/* Signatures */}
                    <div style={{ fontSize: '7.5px' }} className="col-span-5 grid grid-cols-2 gap-2 text-center">
                      {/* Prepared By */}
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium text-left">
                          {effectiveDocType === 'challan'
                            ? 'Dispatched By'
                            : effectiveDocType === 'receipt'
                            ? 'Received By'
                            : 'Prepared By'}
                        </p>
                        <div className="h-5 flex items-end justify-center">
                          <span style={{ fontSize: '11px' }} className="font-serif italic font-bold text-foreground">
                            Shahid
                          </span>
                        </div>
                        <div className="border-t border-border pt-0.5">
                          <p className="font-bold text-foreground leading-none">Shahid Hossain</p>
                          <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">
                            {effectiveDocType === 'receipt' ? 'Cashier / Accounts' : 'Sales Executive'}
                          </p>
                          <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">PrintFlow</p>
                        </div>
                      </div>

                      {/* Approved By */}
                      <div className="space-y-0.5">
                        <p className="text-muted-foreground font-medium text-left">
                          {effectiveDocType === 'challan'
                            ? 'Received By (Client)'
                            : 'Approved By'}
                        </p>
                        <div className="h-5" />
                        <div className="border-t border-border pt-0.5 text-left">
                          <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none">Name:</p>
                          <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">Designation:</p>
                          <p style={{ fontSize: '6.5px' }} className="text-muted-foreground leading-none mt-0.5">Date:</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM PREVIEW FOOTER & PAGINATION */}
      <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20 shrink-0">
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
          {/* Zoom Selector Dropdown */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(Number(e.target.value))}
            className="h-7 rounded-md border border-input bg-card px-2 text-xs font-semibold tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            aria-label="Zoom Level"
          >
            <option value={75}>75%</option>
            <option value={100}>100%</option>
            <option value={125}>125%</option>
            <option value={150}>150%</option>
          </select>

          {/* Fullscreen / Expand Trigger */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel((z) => (z === 100 ? 125 : 100))}
            className="h-7 w-7 p-0 cursor-pointer"
            title="Toggle zoom preview"
            aria-label="Toggle zoom preview"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
