'use client'

import React, { useState, useRef } from 'react'
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Calendar,
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
  Layers,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DocumentTemplateSettings,
  DocumentTypeKey,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
import { PrintLetterheadArt } from './print-letterhead-art'

interface LiveA4PreviewProps {
  settings: DocumentTemplateSettings
  activeDocType?: DocumentTypeKey
  onDocTypeChange?: (docType: DocumentTypeKey) => void
  companyName?: string
  companyAddress?: string
  companyPhone?: string
  companyEmail?: string
  companyWebsite?: string
  companyLogoUrl?: string
  onPreviewPdf?: () => void
  onDownloadPdf?: () => void
}

export function LiveA4Preview({
  settings,
  activeDocType = 'quotation',
  onDocTypeChange,
  companyName = 'Vision Sign',
  companyAddress = 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230',
  companyPhone = '+880 1712 345678',
  companyEmail = 'info@printflow.bd',
  companyWebsite = 'www.printflow.bd',
  companyLogoUrl,
}: LiveA4PreviewProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(100)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const totalPages = 1
  const canvasRef = useRef<HTMLDivElement>(null)

  // Mathematically convert mm padding to percentage of A4 (210mm x 297mm)
  // Ensure safe area starts safely below the compact header (~13.5%) and above compact footer (~8%)
  const paddingTopPct = Math.min(Math.max((settings.padding_top / 297) * 100, 14), 35)
  const paddingBottomPct = Math.min(Math.max((settings.padding_bottom / 297) * 100, 8.5), 30)
  const paddingLeftPct = Math.min(Math.max((settings.padding_left / 210) * 100, 4), 20)
  const paddingRightPct = Math.min(Math.max((settings.padding_right / 210) * 100, 4), 20)

  // Determine current active document key
  const effectiveDocType = settings.document_type || activeDocType || 'quotation'

  // Dynamic document headers based on effectiveDocType
  const getDocTypeHeader = () => {
    switch (effectiveDocType) {
      case 'invoice':
        return { en: 'TAX INVOICE', bn: 'চালান বিল', code: 'INV-2025-1001', title: 'Invoice', recipientLabel: 'Bill To' }
      case 'challan':
        return { en: 'DELIVERY CHALLAN', bn: 'ডেলিভারি চালান', code: 'DC-2025-1001', title: 'Challan', recipientLabel: 'Deliver To' }
      case 'receipt':
        return { en: 'MONEY RECEIPT', bn: 'মানি রিসিট', code: 'REC-2025-1001', title: 'Receipt', recipientLabel: 'Received From' }
      case 'purchase_order':
        return { en: 'PURCHASE ORDER', bn: 'ক্রয়াদেশ', code: 'PO-2025-1001', title: 'Purchase Order', recipientLabel: 'Vendor / Supplier' }
      case 'quotation':
      default:
        return { en: 'QUOTATION', bn: 'কোটেশন', code: 'QT-2025-1001', title: 'Quotation', recipientLabel: 'Bill To' }
    }
  }

  const docHeader = getDocTypeHeader()

  // Dynamic sample items for each document type
  const getDynamicSampleItems = () => {
    switch (effectiveDocType) {
      case 'invoice':
        return [
          { id: 1, title: 'ACP Signboard with LED', subtext: 'Front lit, Acrylic Letter (Job #1001)', specs: '12 ft x 3 ft', qty: '1 pcs', unitPrice: '18,000', total: '18,000' },
          { id: 2, title: 'Vinyl Print with Matt Lam', subtext: 'Outdoor grade self-adhesive', specs: '4 ft x 6 ft', qty: '5 pcs', unitPrice: '950', total: '4,750' },
          { id: 3, title: 'PVC Board Print High-Res', subtext: '3mm rigid PVC sheet print', specs: '2 ft x 3 ft', qty: '10 pcs', unitPrice: '350', total: '3,500' },
          { id: 4, title: 'Roll-up Standee Display', subtext: 'Aluminium base stand with print', specs: '2 ft x 6 ft', qty: '2 pcs', unitPrice: '1,250', total: '2,500' },
          { id: 5, title: 'Site Installation & Delivery', subtext: 'Commercial premises installation', specs: '-', qty: '1 job', unitPrice: '1,500', total: '1,500' },
        ]
      case 'challan':
        return [
          { id: 1, title: 'ACP Signboard Assembly', subtext: 'Packed in protective bubble wrap', specs: '12 ft x 3 ft', qty: '1 unit', unitPrice: '1 unit', total: 'Dispatched' },
          { id: 2, title: 'Vinyl Print Graphics', subtext: 'Rolled in cardboard shipping tubes', specs: '4 ft x 6 ft', qty: '5 rolls', unitPrice: '5 rolls', total: 'Dispatched' },
          { id: 3, title: 'PVC Board Cutouts', subtext: 'Strapped bundle with corner guards', specs: '2 ft x 3 ft', qty: '10 pcs', unitPrice: '10 pcs', total: 'Dispatched' },
          { id: 4, title: 'Roll-up Standee Displays', subtext: 'Complete with padded canvas carry bag', specs: '2 ft x 6 ft', qty: '2 sets', unitPrice: '2 sets', total: 'Dispatched' },
          { id: 5, title: 'Mounting Screws & Hardware', subtext: 'Standoff bolts, rawl plugs, brackets box', specs: 'Standard', qty: '1 box', unitPrice: '1 box', total: 'Dispatched' },
        ]
      case 'receipt':
        return [
          { id: 1, title: 'Quotation Advance Deposit', subtext: 'QT-2025-1001 Project Booking 50%', specs: 'Cash / Bank', qty: '1 txn', unitPrice: '18,000', total: '18,000' },
          { id: 2, title: 'Signage Structural Proofing', subtext: 'Engineering drawings approval charge', specs: 'Consulting', qty: '1 job', unitPrice: '0', total: 'Included' },
          { id: 3, title: 'Site Survey & Dimensional QA', subtext: 'On-site measurement inspection', specs: 'Field QA', qty: '1 visit', unitPrice: '0', total: 'Included' },
        ]
      case 'purchase_order':
        return [
          { id: 1, title: 'Cast Acrylic Sheet 3mm Clear', subtext: 'Grade A optical clarity (8ft x 4ft)', specs: '8 ft x 4 ft', qty: '10 sheets', unitPrice: '2,800', total: '28,000' },
          { id: 2, title: 'Samsung LED Injection Modules', subtext: '1.2W Cool White 6500K IP68', specs: '200 pcs string', qty: '5 strings', unitPrice: '1,200', total: '6,000' },
          { id: 3, title: 'Alstrong ACP Sheet 4mm Gloss', subtext: '0.25mm coil skin exterior grade', specs: '8 ft x 4 ft', qty: '4 sheets', unitPrice: '2,125', total: '8,500' },
        ]
      case 'quotation':
      default:
        return [
          { id: 1, title: 'ACP Signboard with LED', subtext: 'Front lit, Acrylic Letter, Installation', specs: '12 ft x 3 ft', qty: '1 pcs', unitPrice: '18,000', total: '18,000' },
          { id: 2, title: 'Vinyl Print with Lamination', subtext: 'Outdoor Grade, Matt Lamination', specs: '4 ft x 6 ft', qty: '5 pcs', unitPrice: '950', total: '4,750' },
          { id: 3, title: 'PVC Board Print', subtext: '3mm PVC, High Resolution Print', specs: '2 ft x 3 ft', qty: '10 pcs', unitPrice: '350', total: '3,500' },
          { id: 4, title: 'Standee Banner', subtext: 'Roll-up Standee with Print', specs: '2 ft x 6 ft', qty: '2 pcs', unitPrice: '1,250', total: '2,500' },
          { id: 5, title: 'Installation & Transportation', subtext: 'Site installation and delivery', specs: '-', qty: '1 job', unitPrice: '1,500', total: '1,500' },
        ]
    }
  }

  const sampleItems = getDynamicSampleItems()

  const sampleDocOptions: { key: DocumentTypeKey; label: string }[] = [
    { key: 'quotation', label: 'Sample Quotation' },
    { key: 'invoice', label: 'Sample Invoice' },
    { key: 'challan', label: 'Sample Delivery Challan' },
    { key: 'receipt', label: 'Sample Payment Receipt' },
    { key: 'purchase_order', label: 'Sample Purchase Order' },
  ]

  // Dynamic fallback terms matching document type
  const getDynamicDefaultTerms = () => {
    const fromConfig = DEFAULT_TEMPLATE_SETTINGS[effectiveDocType]?.terms_and_conditions
    if (fromConfig) {
      return fromConfig.split('\n').filter(Boolean)
    }
    return [
      '1. This quotation is valid for 7 days from the date of issue.',
      '2. Price may vary based on final design, material and site condition.',
      '3. 50% advance payment is required to confirm the order.',
      '4. Delivery timeline may vary based on design approval and material availability.',
      '5. Any additional work outside the scope will be charged separately.',
      '6. This is a computer generated quotation, no signature is required.',
    ]
  }

  const activeTerms = settings.terms_and_conditions?.trim()
    ? settings.terms_and_conditions.split('\n').filter(Boolean)
    : getDynamicDefaultTerms()

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
            className="relative w-full aspect-[210/297] bg-white text-foreground overflow-hidden rounded-xs border border-border shadow-xs select-none"
          >
            {/* Background Letterhead Artwork (Dynamic with business info) */}
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
                  companyLogoUrl={companyLogoUrl}
                  address={companyAddress}
                  phone={companyPhone}
                  email={companyEmail}
                  website={companyWebsite}
                  mode={settings.letterhead_mode}
                />
              )
            )}

            {/* DYNAMIC SAFE AREA & CONTENT CONTAINER (Guaranteed 0 overflow) */}
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
              {/* Visual Safe Area Guideline */}
              <div
                className="absolute inset-0 border border-dashed border-[#38BDF8] pointer-events-none rounded-xs"
                title="Safe Area / Content Padding Boundary"
              />

              {/* DOCUMENT CONTENT (Proportional layout: all fonts 8px-12px) */}
              <div className="flex-1 flex flex-col justify-between p-1 sm:p-1.5 text-foreground overflow-hidden">
                {/* Block 1: Customer Card & Document Metadata */}
                <div>
                  <div className="flex items-start justify-between gap-2.5">
                    {/* Customer Card (Font sizes: 8px to 12px) */}
                    <div className="bg-[#F8FAFC] rounded-lg p-2 border border-[#E2E8F0]/70 w-[52%] space-y-0.5">
                      <span
                        style={{ fontSize: '10px', lineHeight: '12px' }}
                        className="font-bold text-[#065F46] block uppercase tracking-wide leading-none"
                      >
                        {docHeader.recipientLabel}
                      </span>
                      {/* Customer Name: Exactly 12px */}
                      <h4
                        style={{ fontSize: '12px', lineHeight: '14px' }}
                        className="font-black text-[#111827] leading-tight"
                      >
                        {effectiveDocType === 'purchase_order' ? 'Alstrong Composites BD' : 'ABC Enterprises Ltd.'}
                      </h4>
                      <p
                        style={{ fontSize: '9px', lineHeight: '11px' }}
                        className="font-semibold text-[#374151]"
                      >
                        {effectiveDocType === 'purchase_order' ? 'Attn: Mr. Mominul Islam (Sales Dept)' : 'Attn: Mr. Rahim Uddin'}
                      </p>
                      <p
                        style={{ fontSize: '8.5px', lineHeight: '10px' }}
                        className="text-[#6B7280]"
                      >
                        {effectiveDocType === 'purchase_order' ? 'Supplier ID: SUP-0042' : 'Customer ID: CUS-0001'}
                      </p>
                      <p
                        style={{ fontSize: '8px', lineHeight: '10px' }}
                        className="text-[#6B7280]"
                      >
                        123 Business Avenue, Gulshan, Dhaka-1212
                      </p>
                      <p
                        style={{ fontSize: '8px', lineHeight: '10px' }}
                        className="text-[#6B7280]"
                      >
                        Phone: +880 1711 222333 • Email: rahim@abc.com
                      </p>
                    </div>

                    {/* Document Meta Numbers (No Colons, Clean 2-Column: 8px to 9.5px) */}
                    <div className="space-y-0.5 w-[45%] text-left pt-0.5">
                      {/* 1. Document Code */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <FileText className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">
                            {docHeader.title} No
                          </span>
                        </div>
                        <span style={{ fontSize: '9.5px' }} className="font-bold text-[#111827] tabular-nums text-right">
                          {docHeader.code}
                        </span>
                      </div>

                      {/* 2. Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">
                            Date
                          </span>
                        </div>
                        <span style={{ fontSize: '9px' }} className="font-medium text-[#111827] text-right">
                          08 Oct 2025
                        </span>
                      </div>

                      {/* 3. Valid Until / Dispatch Date */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">
                            {effectiveDocType === 'invoice'
                              ? 'Due Date'
                              : effectiveDocType === 'challan'
                              ? 'Dispatch Date'
                              : effectiveDocType === 'receipt'
                              ? 'Settlement'
                              : effectiveDocType === 'purchase_order'
                              ? 'Delivery Due'
                              : 'Valid Until'}
                          </span>
                        </div>
                        <div className="text-right leading-none">
                          <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">
                            15 Oct 2025
                          </span>
                          <span
                            style={{ fontSize: '8px' }}
                            className="inline-block text-[#6B7280] font-normal ml-1"
                          >
                            (7 Days)
                          </span>
                        </div>
                      </div>

                      {/* 4. Sales Person / Authority */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <User className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">
                            {effectiveDocType === 'receipt'
                              ? 'Cashier'
                              : effectiveDocType === 'challan'
                              ? 'Dispatcher'
                              : effectiveDocType === 'purchase_order'
                              ? 'Procurement'
                              : 'Sales Person'}
                          </span>
                        </div>
                        <span style={{ fontSize: '9px' }} className="font-medium text-[#111827] text-right">
                          Shahid Hossain
                        </span>
                      </div>

                      {/* 5. Reference */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <Tag className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">
                            Reference
                          </span>
                        </div>
                        <span style={{ fontSize: '9px' }} className="font-medium text-[#111827] text-right">
                          {effectiveDocType === 'purchase_order' ? 'Factory Media Restock' : 'Signage for Office'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table: Dynamic columns based on document type */}
                  <div className="rounded-t-md overflow-hidden border border-[#E5E7EB] mt-1">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#064E3B] text-white font-bold">
                          <th className="py-1 px-1.5 w-[5%] text-center" style={{ fontSize: '9px' }}>
                            SL
                          </th>
                          <th className="py-1 px-1.5 w-[37%] text-left" style={{ fontSize: '9px' }}>
                            Item Description
                          </th>
                          {settings.item_display_mode === 'detailed' && (
                            <th className="py-1 px-1.5 w-[22%] text-center" style={{ fontSize: '9px' }}>
                              Size / Specification
                            </th>
                          )}
                          <th className="py-1 px-1.5 w-[8%] text-center" style={{ fontSize: '9px' }}>
                            Qty
                          </th>
                          <th className="py-1 px-1.5 w-[14%] text-right leading-tight">
                            <div style={{ fontSize: '8.5px' }}>
                              {effectiveDocType === 'challan' ? 'Packing' : 'Unit Price'}
                            </div>
                            <div style={{ fontSize: '8px' }} className="font-normal text-white/90">
                              {effectiveDocType === 'challan' ? '(Units)' : '(BDT)'}
                            </div>
                          </th>
                          <th className="py-1 px-1.5 w-[14%] text-right leading-tight">
                            <div style={{ fontSize: '8.5px' }}>
                              {effectiveDocType === 'challan' ? 'Status' : 'Total'}
                            </div>
                            <div style={{ fontSize: '8px' }} className="font-normal text-white/90">
                              {effectiveDocType === 'challan' ? '(Condition)' : '(BDT)'}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] bg-white">
                        {sampleItems.map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC]/60">
                            <td className="py-1 px-1.5 text-center text-[#6B7280]" style={{ fontSize: '8.5px' }}>
                              {item.id}
                            </td>
                            <td className="py-1 px-1.5 text-left">
                              <span style={{ fontSize: '9px', lineHeight: '11px' }} className="font-bold text-[#111827] block">
                                {item.title}
                              </span>
                              {settings.item_display_mode === 'detailed' && (
                                <span style={{ fontSize: '8px', lineHeight: '10px' }} className="text-[#6B7280] block leading-tight">
                                  {item.subtext}
                                </span>
                              )}
                            </td>
                            {settings.item_display_mode === 'detailed' && (
                              <td style={{ fontSize: '8px' }} className="py-1 px-1.5 text-center text-[#374151]">
                                {item.specs}
                              </td>
                            )}
                            <td style={{ fontSize: '8.5px' }} className="py-1 px-1.5 text-center text-[#374151] tabular-nums">
                              {item.qty}
                            </td>
                            <td style={{ fontSize: '8.5px' }} className="py-1 px-1.5 text-right text-[#374151] tabular-nums">
                              {item.unitPrice}
                            </td>
                            <td style={{ fontSize: '9px' }} className="py-1 px-1.5 text-right font-bold text-[#111827] tabular-nums">
                              {item.total}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Block 2: Specifications Box & Financial Summary */}
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* Left: Dynamic Specifications Box */}
                  <div className="space-y-0.5 bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0]/70">
                    {effectiveDocType === 'invoice' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Landmark className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Bank Account</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">City Bank Ltd • Gulshan</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">A/C Number</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium font-mono">1102938472001</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">bKash / Nagad</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium font-mono">{companyPhone}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Mushak Status</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">NBR 15% VAT Compliant</span>
                        </div>
                      </>
                    ) : effectiveDocType === 'challan' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Vehicle No</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Dhaka Metro Ka-1234</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <User className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Driver Contact</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">+880 1819 998877</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Dispatch Store</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">{companyName} Central Hub</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[75px]">Quality Check</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">100% Passed Final QA</span>
                        </div>
                      </>
                    ) : effectiveDocType === 'receipt' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Payment Method</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Online Bank Transfer</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Hash className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Transaction ID</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium font-mono">TRX-2025-998811</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Received Against</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">QT-2025-1001 (50% Adv)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Realization</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Realized & Account Credited</span>
                        </div>
                      </>
                    ) : effectiveDocType === 'purchase_order' ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Delivery Point</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Plant Factory Warehouse</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Delivery Due</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Within 5 Working Days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Credit Terms</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Net 30 Days After Delivery</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Vendor BIN</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">002938471-0101 Compliant</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Cog className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Production Time</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">3 - 5 Working Days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Delivery</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Within Dhaka & Nationwide</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Payment Terms</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">50% Adv, 50% Before Delivery</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                          <span style={{ fontSize: '8.5px' }} className="font-bold text-[#111827] min-w-[80px]">Warranty</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">6 Months (Mat & Install)</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Dynamic Financial Totals & Grand Total Pill */}
                  <div className="space-y-0.5 text-right flex flex-col justify-between">
                    <div className="space-y-0.5">
                      {effectiveDocType === 'challan' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Line Items</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">5 Items</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Total Quantity</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">19 Units / Sets</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Package Count</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">4 Secure Bundles</span>
                          </div>
                        </>
                      ) : effectiveDocType === 'receipt' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Total Bill</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">33,350</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Prior Payments</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">0</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Balance Due</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">15,350</span>
                          </div>
                        </>
                      ) : effectiveDocType === 'purchase_order' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">42,500</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Discount</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">- 2,000</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">VAT (15%)</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827]">6,075</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827] tabular-nums">30,250</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">Discount</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827] tabular-nums">- 1,250</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium">VAT (15%)</span>
                            <span style={{ fontSize: '9px' }} className="font-bold text-[#111827] tabular-nums">4,350</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Grand Total Pill: Amount exactly 12px */}
                    <div className="flex items-center justify-between py-1.5 px-3 bg-[#064E3B] text-white rounded-md font-bold shadow-xs mt-0.5">
                      <span style={{ fontSize: '10px' }}>
                        {effectiveDocType === 'challan'
                          ? 'Delivery Status'
                          : effectiveDocType === 'receipt'
                          ? 'Total Received (BDT)'
                          : effectiveDocType === 'purchase_order'
                          ? 'PO Total (BDT)'
                          : 'Grand Total (BDT)'}
                      </span>
                      <span style={{ fontSize: '12px' }} className="font-black tabular-nums tracking-tight">
                        {effectiveDocType === 'challan'
                          ? 'Good Condition'
                          : effectiveDocType === 'receipt'
                          ? '18,000'
                          : effectiveDocType === 'purchase_order'
                          ? '46,575'
                          : '33,350'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Block 3: Dynamic Terms & Signatures (Guaranteed fit without overflow) */}
                <div className="mt-1 pt-1 border-t border-[#E5E7EB]">
                  <div className="grid grid-cols-12 gap-2.5 items-end">
                    {/* Terms & Conditions (Left - 7 cols) */}
                    <div className="col-span-7 space-y-0.5">
                      <div className="flex items-center gap-1">
                        <FileText className="h-2.5 w-2.5 text-[#111827] shrink-0" />
                        <span style={{ fontSize: '9.5px' }} className="font-bold text-[#111827]">
                          Terms & Conditions
                        </span>
                        <div className="h-[1px] bg-[#E2E8F0] flex-1 ml-1" />
                      </div>
                      {/* Terms text: Exactly 8px */}
                      <div
                        style={{ fontSize: '8px', lineHeight: '10.5px' }}
                        className="space-y-0.25 text-[#4B5563]"
                      >
                        {activeTerms.map((term, index) => (
                          <p key={index}>{term}</p>
                        ))}
                      </div>
                    </div>

                    {/* Signatures (Right - 5 cols) */}
                    <div className="col-span-5 grid grid-cols-2 gap-2 text-center">
                      {/* Prepared By / Dispatched By */}
                      <div className="space-y-0.5 text-left">
                        <p style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium leading-none">
                          {effectiveDocType === 'challan'
                            ? 'Dispatched By'
                            : effectiveDocType === 'receipt'
                            ? 'Received By'
                            : effectiveDocType === 'purchase_order'
                            ? 'Issued By'
                            : 'Prepared By'}
                        </p>
                        <div className="h-5 flex items-end justify-start">
                          <svg viewBox="0 0 100 28" fill="none" className="h-4 w-16">
                            <path
                              d="M8 22 C 10 14, 13 4, 17 5 C 20 6, 15 20, 20 21 C 24 22, 27 12, 31 19 C 34 21, 38 16, 41 19 C 45 21, 48 14, 52 20 C 55 21, 60 10, 64 19 C 67 21, 73 20, 81 18"
                              stroke="#111827"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M15 11 C 23 9, 38 8, 48 9"
                              stroke="#111827"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </div>
                        <div className="border-t border-[#9CA3AF] pt-0.5">
                          <p style={{ fontSize: '9px' }} className="font-bold text-[#111827] leading-tight">
                            {effectiveDocType === 'challan'
                              ? 'Abul Kalam'
                              : effectiveDocType === 'receipt'
                              ? 'Nazmul Huda'
                              : effectiveDocType === 'purchase_order'
                              ? 'Kamrul Hasan'
                              : 'Shahid Hossain'}
                          </p>
                          <p style={{ fontSize: '8px' }} className="text-[#6B7280] leading-none mt-0.25">
                            {effectiveDocType === 'receipt'
                              ? 'Cashier'
                              : effectiveDocType === 'challan'
                              ? 'Store In-charge'
                              : effectiveDocType === 'purchase_order'
                              ? 'Procurement'
                              : 'Sales Executive'}
                          </p>
                          <p style={{ fontSize: '8px' }} className="text-[#6B7280] leading-none mt-0.25 truncate max-w-[70px]">
                            {companyName}
                          </p>
                        </div>
                      </div>

                      {/* Approved By / Received By */}
                      <div className="space-y-0.5 text-left">
                        <p style={{ fontSize: '8.5px' }} className="text-[#374151] font-medium leading-none">
                          {effectiveDocType === 'challan'
                            ? 'Received By (Client)'
                            : effectiveDocType === 'receipt'
                            ? 'Verified By'
                            : effectiveDocType === 'purchase_order'
                            ? 'Authorized By'
                            : 'Approved By'}
                        </p>
                        <div className="h-5" />
                        <div className="border-t border-[#9CA3AF] pt-0.5 space-y-0.25">
                          <p style={{ fontSize: '8px' }} className="text-[#6B7280] leading-tight">
                            Name:
                          </p>
                          <p style={{ fontSize: '8px' }} className="text-[#6B7280] leading-tight">
                            Designation:
                          </p>
                          <p style={{ fontSize: '8px' }} className="text-[#6B7280] leading-tight">
                            Date:
                          </p>
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
