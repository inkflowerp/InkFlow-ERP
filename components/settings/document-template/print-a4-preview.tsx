'use client'

import React, { useState, useRef } from 'react'
import {
  Eye,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Calendar,
  CalendarDays,
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
  Printer,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DocumentTemplateSettings,
  DocumentTypeKey,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
import { PrintLetterheadArt } from './print-letterhead-art'
import { QuotationRecord } from '@/types/quotation.types'
import { InvoiceRecord } from '@/types/billing.types'
import type { DeliveryChallanRecord } from '@/types/logistics.types'
import { formatBDT } from '@/lib/formatters'

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
  onPrintPdf?: () => void
  onDownloadPdf?: () => void
  quotationData?: QuotationRecord | null
  invoiceData?: InvoiceRecord | null
  challanData?: DeliveryChallanRecord | null
  paymentData?: any | null
  showControls?: boolean
}

export function LiveA4Preview({
  settings,
  activeDocType,
  onDocTypeChange,
  companyName = 'Vision Sign',
  companyAddress = 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230',
  companyPhone = '+880 1712 345678',
  companyEmail = 'info@printflow.bd',
  companyWebsite = 'www.printflow.bd',
  companyLogoUrl,
  onPreviewPdf,
  onPrintPdf,
  onDownloadPdf,
  quotationData,
  invoiceData,
  challanData,
  paymentData,
  showControls = true,
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
  const effectiveDocType: DocumentTypeKey = activeDocType
    ? activeDocType
    : quotationData
    ? 'quotation'
    : invoiceData
    ? 'invoice'
    : challanData
    ? 'challan'
    : paymentData
    ? 'receipt'
    : settings.document_type || 'quotation'

  // Dynamic document headers based on effectiveDocType
  const getDocTypeHeader = () => {
    if (effectiveDocType === 'receipt') {
      return {
        en: 'MONEY RECEIPT',
        bn: 'মানি রিসিট',
        code: paymentData?.receipt_number || (invoiceData ? `MR-${invoiceData.invoice_number.replace(/^INV-/, '')}` : 'REC-2025-1001'),
        title: 'Money Receipt',
        recipientLabel: 'Received From',
      }
    }
    if (effectiveDocType === 'challan') {
      return {
        en: 'DELIVERY CHALLAN',
        bn: 'ডেলিভারি চালান',
        code: challanData?.challan_number || (invoiceData ? `DC-${invoiceData.invoice_number.replace(/^INV-/, '')}` : 'DC-2025-1001'),
        title: 'Delivery Challan',
        recipientLabel: 'Deliver To',
      }
    }
    if (effectiveDocType === 'purchase_order') {
      return {
        en: 'PURCHASE ORDER',
        bn: 'ক্রয়াদেশ',
        code: 'PO-2025-1001',
        title: 'Purchase Order',
        recipientLabel: 'Vendor / Supplier',
      }
    }
    if (quotationData || effectiveDocType === 'quotation') {
      return {
        en: 'QUOTATION',
        bn: 'কোটেশন',
        code: quotationData?.quotation_number || 'QT-2025-1001',
        title: 'Quotation',
        recipientLabel: 'Bill To',
      }
    }
    return {
      en: 'TAX INVOICE',
      bn: 'চালান বিল',
      code: invoiceData?.invoice_number || 'INV-2025-1001',
      title: 'Invoice',
      recipientLabel: 'Bill To',
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

  // Resolve items from real records or fallback sample
  const itemsToRender = quotationData?.items?.length
    ? quotationData.items.map((item, idx) => ({
        id: idx + 1,
        title: item.description || 'Printing Item',
        subtext: item.material_spec || item.finishing || '',
        specs:
          item.dimensions_spec ||
          (item.width && item.height
            ? `${item.width} x ${item.height} ${item.dimension_unit || 'ft'}`
            : '-'),
        qty: `${item.quantity} ${item.unit || 'pcs'}`,
        unitPrice: formatBDT(item.unit_rate || item.unit_price || 0).replace('৳', '').trim(),
        total: formatBDT(item.item_total || item.quantity * (item.unit_rate || item.unit_price || 0)).replace('৳', '').trim(),
      }))
    : effectiveDocType === 'receipt' && paymentData
    ? (paymentData.allocations?.length
        ? paymentData.allocations.map((a: any, idx: number) => ({
            id: idx + 1,
            title: `Settlement for Invoice ${a.invoice_number || a.invoice_id || 'Ref'}`,
            subtext: `Settlement via ${(paymentData.payment_method || 'Online / Cash').toUpperCase()}`,
            specs: 'Settlement Allocation',
            qty: '1 txn',
            unitPrice: formatBDT(a.allocated_amount || 0).replace('৳', '').trim(),
            total: formatBDT(a.allocated_amount || 0).replace('৳', '').trim(),
          }))
        : [
            {
              id: 1,
              title: paymentData.reference_notes || `Payment Settlement (${(paymentData.payment_method || 'Cash / Online').toUpperCase()})`,
              subtext: `Receipt Reference: ${paymentData.receipt_number || 'Official Receipt'}`,
              specs: 'Cash / Bank MFS',
              qty: '1 txn',
              unitPrice: formatBDT(paymentData.amount || 0).replace('৳', '').trim(),
              total: formatBDT(paymentData.amount || 0).replace('৳', '').trim(),
            },
          ])
    : effectiveDocType === 'receipt' && invoiceData
    ? [
        {
          id: 1,
          title: `Settlement of Invoice ${invoiceData.invoice_number}`,
          subtext: invoiceData.notes || 'Full / Partial Payment against invoiced services & fabrication',
          specs: `${invoiceData.items?.length || 1} Work Items`,
          qty: '1 txn',
          unitPrice: formatBDT(invoiceData.paid_amount || invoiceData.grand_total).replace('৳', '').trim(),
          total: formatBDT(invoiceData.paid_amount || invoiceData.grand_total).replace('৳', '').trim(),
        },
      ]
    : invoiceData?.items?.length
    ? invoiceData.items.map((item: any, idx) => ({
        id: idx + 1,
        title: item.item_name || item.item_description || 'Invoiced Work',
        subtext: item.material_spec || item.description_bn || '',
        specs:
          item.dimensions_spec ||
          (item.width && item.height
            ? `${item.width} x ${item.height} ${item.dimension_unit || 'ft'}`
            : '-'),
        qty: `${item.quantity} ${item.unit || 'pcs'}`,
        unitPrice: formatBDT(item.unit_price || item.unit_rate || 0).replace('৳', '').trim(),
        total: formatBDT(item.total_price || item.item_total || item.quantity * (item.unit_price || 0)).replace('৳', '').trim(),
      }))
    : sampleItems

  // Resolve customer card details (matching Reference Image 2)
  const recipientName = quotationData
    ? (quotationData.customer_company || quotationData.customer_name)
    : invoiceData
    ? (invoiceData.customer_company || invoiceData.customer_name)
    : challanData
    ? ((challanData as any).customer_company || challanData.customer_name)
    : paymentData
    ? (paymentData.customer_company || paymentData.customer_name)
    : effectiveDocType === 'purchase_order'
    ? 'Alstrong Composites BD'
    : 'ABC Enterprises Ltd.'

  const recipientAttn = quotationData
    ? (quotationData.customer_company ? `Attn: ${quotationData.customer_name}` : 'Attn: Mr. Rahim Uddin')
    : invoiceData
    ? (invoiceData.customer_company ? `Attn: ${invoiceData.customer_name}` : 'Attn: Mr. Rahim Uddin')
    : challanData
    ? ((challanData as any).customer_company ? `Attn: ${challanData.customer_name}` : 'Attn: Receiving Dept')
    : paymentData
    ? (paymentData.customer_company ? `Attn: ${paymentData.customer_name}` : 'Attn: Accounts Dept')
    : effectiveDocType === 'purchase_order'
    ? 'Attn: Mr. Mominul Islam (Sales Dept)'
    : 'Attn: Mr. Rahim Uddin'

  const recipientId = quotationData
    ? (quotationData.customer_id ? `Customer ID: ${quotationData.customer_id}` : 'Customer ID: CUS-0001')
    : invoiceData
    ? (invoiceData.customer_id ? `Customer ID: ${invoiceData.customer_id}` : 'Customer ID: CUS-0001')
    : challanData
    ? (challanData.customer_id ? `Customer ID: ${challanData.customer_id}` : 'Customer ID: CUS-0001')
    : paymentData
    ? (paymentData.customer_id ? `Customer ID: ${paymentData.customer_id}` : 'Customer ID: CUS-0001')
    : effectiveDocType === 'purchase_order'
    ? 'Supplier ID: SUP-0042'
    : 'Customer ID: CUS-0001'

  const recipientAddress = quotationData
    ? (quotationData.customer_address || '123 Business Avenue, Gulshan, Dhaka-1212')
    : invoiceData
    ? (invoiceData.customer_address || '123 Business Avenue, Gulshan, Dhaka-1212')
    : challanData
    ? (challanData.delivery_address || '123 Business Avenue, Gulshan, Dhaka-1212')
    : paymentData
    ? (paymentData.customer_address || '123 Business Avenue, Gulshan, Dhaka-1212')
    : '123 Business Avenue, Gulshan, Dhaka-1212'

  const recipientPhone = quotationData
    ? (quotationData.customer_phone ? `Phone: ${quotationData.customer_phone}` : 'Phone: +880 1711 222333')
    : invoiceData
    ? (invoiceData.customer_phone ? `Phone: ${invoiceData.customer_phone}` : 'Phone: +880 1711 222333')
    : challanData
    ? (challanData.customer_phone ? `Phone: ${challanData.customer_phone}` : 'Phone: +880 1711 222333')
    : paymentData
    ? (paymentData.customer_phone ? `Phone: ${paymentData.customer_phone}` : 'Phone: +880 1711 222333')
    : 'Phone: +880 1711 222333'

  const recipientEmail = quotationData
    ? (quotationData.customer_email ? `Email: ${quotationData.customer_email}` : 'Email: rahim@abc.com')
    : invoiceData
    ? (invoiceData.customer_email ? `Email: ${invoiceData.customer_email}` : 'Email: rahim@abc.com')
    : challanData
    ? ((challanData as any).customer_email ? `Email: ${(challanData as any).customer_email}` : 'Email: rahim@abc.com')
    : paymentData
    ? (paymentData.customer_email ? `Email: ${paymentData.customer_email}` : 'Email: rahim@abc.com')
    : 'Email: rahim@abc.com'

  // Resolve document metadata
  const metaDate = quotationData
    ? quotationData.quotation_date
    : invoiceData
    ? invoiceData.invoice_date
    : challanData
    ? (challanData as any).challan_date
    : paymentData
    ? paymentData.payment_date
    : '08 Oct 2025'

  const metaDueDate = quotationData
    ? quotationData.valid_until
    : invoiceData
    ? invoiceData.due_date
    : paymentData
    ? 'Settled'
    : '15 Oct 2025'

  const calculateValidityDays = () => {
    if (effectiveDocType === 'receipt') return 'Settled'
    if (effectiveDocType === 'challan') return 'Immediate'
    if (!metaDate || !metaDueDate) return '7 Days'
    try {
      const d1 = new Date(metaDate).getTime()
      const d2 = new Date(metaDueDate).getTime()
      if (!isNaN(d1) && !isNaN(d2)) {
        const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
        if (diff > 0) return `${diff} Days`
      }
    } catch {}
    return '7 Days'
  }
  const validityDays = calculateValidityDays()

  const metaStaff = quotationData
    ? (quotationData.salesperson_name || 'Shahid Hossain')
    : invoiceData
    ? (invoiceData.created_by_name || 'Accounts Dept')
    : paymentData
    ? (paymentData.created_by_name || 'Cashier')
    : 'Shahid Hossain'

  const metaRef = quotationData
    ? (quotationData.reference_no || 'Signage for Office')
    : invoiceData
    ? (invoiceData.reference_no || (invoiceData.order_number ? `Order #${invoiceData.order_number}` : 'Commercial Invoice'))
    : paymentData
    ? (paymentData.receipt_number || paymentData.trx_id || 'Official Receipt')
    : effectiveDocType === 'purchase_order'
    ? 'Factory Media Restock'
    : 'Signage for Office'

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

  const activeTerms = quotationData?.terms_and_conditions?.trim()
    ? quotationData.terms_and_conditions.split('\n').filter(Boolean)
    : invoiceData?.terms_and_conditions?.trim()
    ? invoiceData.terms_and_conditions.split('\n').filter(Boolean)
    : settings.terms_and_conditions?.trim()
    ? settings.terms_and_conditions.split('\n').filter(Boolean)
    : getDynamicDefaultTerms()

  return (
    <div className={showControls ? "bg-card border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col h-full print:border-none print:shadow-none print:bg-transparent print:p-0 print:m-0 print:w-full print:rounded-none" : "w-full flex justify-center bg-transparent border-none shadow-none p-0 m-0 print:p-0 print:m-0 print:w-full"}>
      {/* 1. TOP PREVIEW TOOLBAR */}
      {showControls && (
        <div className="p-3.5 sm:px-5 border-b border-border flex items-center justify-between gap-3 bg-muted/20 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Eye className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">
              Live Preview
            </span>
          </div>

        <div className="flex items-center gap-2 shrink-0">
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

          {/* Quick Print Action */}
          {onPrintPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onPrintPdf}
              className="h-8 text-xs font-semibold gap-1 px-2.5 bg-card cursor-pointer border-input hover:bg-muted"
              title="Print A4 document"
            >
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          )}

          {/* Quick Download PDF Action */}
          {onDownloadPdf && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownloadPdf}
              className="h-8 text-xs font-semibold gap-1 px-2.5 bg-card cursor-pointer border-input hover:bg-muted"
              title="Download PDF"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
        </div>
      </div>
      )}

      {/* 2. LIVE A4 DOCUMENT CANVAS WRAPPER */}
      <div className={`flex-1 overflow-auto p-4 sm:p-6 flex items-start justify-center ${showControls ? 'bg-muted/30' : 'bg-transparent p-0 sm:p-0'} print:p-0 print:m-0 print:bg-white print:overflow-visible`}>
        <div
          ref={canvasRef}
          style={{
            transform: showControls ? `scale(${zoomLevel / 100})` : 'none',
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
          }}
          className={`w-full ${showControls ? 'max-w-[620px] shadow-md' : 'max-w-[760px] shadow-lg'} rounded-xs transition-transform print:transform-none print:w-full print:max-w-none print:shadow-none print:border-none print:m-0 print:p-0`}
        >
          {/* Actual A4 Sheet (210mm x 297mm Ratio) */}
          <div
            data-print-sheet="true"
            data-print-isolate="true"
            className="relative w-full aspect-[210/297] bg-white text-foreground overflow-hidden rounded-xs border border-border shadow-xs select-none print:border-none print:shadow-none print:rounded-none print:w-full print:m-0"
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
                className="absolute inset-0 border border-dashed border-[#38BDF8] pointer-events-none rounded-xs print:hidden"
                title="Safe Area / Content Padding Boundary"
              />

              {/* DOCUMENT CONTENT (Proportional layout: all fonts 8px-12px) */}
              <div className="flex-1 flex flex-col justify-between p-1 sm:p-1.5 text-foreground overflow-hidden">
                {/* Block 1: Customer Card & Document Metadata */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    {/* Customer Card (matching Reference Image 2) */}
                    <div className="bg-[#F8FAFC] rounded-lg p-2.5 border border-[#E2E8F0]/70 w-[52%] space-y-0.5">
                      <span
                        style={{ fontSize: '11px', lineHeight: '13px' }}
                        className="font-bold text-[#065F46] block uppercase tracking-wide"
                      >
                        {docHeader.recipientLabel}
                      </span>
                      {/* Customer Name: Exactly 12px */}
                      <h4
                        style={{ fontSize: '12px', lineHeight: '15px' }}
                        className="font-black text-[#111827] leading-tight"
                      >
                        {recipientName}
                      </h4>
                      {recipientAttn && (
                        <p
                          style={{ fontSize: '10px', lineHeight: '13px' }}
                          className="font-medium text-[#374151]"
                        >
                          {recipientAttn}
                        </p>
                      )}
                      {recipientId && (
                        <p
                          style={{ fontSize: '10px', lineHeight: '13px' }}
                          className="text-[#4B5563]"
                        >
                          {recipientId}
                        </p>
                      )}
                      {recipientAddress && (
                        <p
                          style={{ fontSize: '10px', lineHeight: '13px' }}
                          className="text-[#4B5563]"
                        >
                          {recipientAddress}
                        </p>
                      )}
                      {recipientPhone && (
                        <p
                          style={{ fontSize: '10px', lineHeight: '13px' }}
                          className="text-[#4B5563]"
                        >
                          {recipientPhone}
                        </p>
                      )}
                      {recipientEmail && (
                        <p
                          style={{ fontSize: '10px', lineHeight: '13px' }}
                          className="text-[#4B5563]"
                        >
                          {recipientEmail}
                        </p>
                      )}
                    </div>

                    {/* Document Meta Numbers (matching Reference Image 2) */}
                    <div className="space-y-1 w-[46%] text-left pt-0.5 border-l border-[#E5E7EB] pl-3">
                      {/* 1. Document Code */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '11px' }} className="text-[#374151] font-medium">
                            {docHeader.title} No
                          </span>
                        </div>
                        <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums text-right">
                          {docHeader.code}
                        </span>
                      </div>

                      {/* 2. Date */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '11px' }} className="text-[#374151] font-medium">
                            Date
                          </span>
                        </div>
                        <span style={{ fontSize: '11px' }} className="font-bold text-[#111827] text-right">
                          {metaDate}
                        </span>
                      </div>

                      {/* 3. Valid Until / Dispatch Date */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '11px' }} className="text-[#374151] font-medium">
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
                        <div className="text-right leading-tight">
                          <span style={{ fontSize: '11px' }} className="font-bold text-[#111827] block">
                            {metaDueDate}
                          </span>
                          <span style={{ fontSize: '9.5px' }} className="text-[#6B7280] block">
                            ({validityDays})
                          </span>
                        </div>
                      </div>

                      {/* 4. Sales Person / Authority */}
                      <div className="flex items-center justify-between gap-2 border-b border-[#F1F5F9] pb-0.5">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '11px' }} className="text-[#374151] font-medium">
                            {effectiveDocType === 'receipt'
                              ? 'Cashier'
                              : effectiveDocType === 'challan'
                              ? 'Dispatcher'
                              : effectiveDocType === 'purchase_order'
                              ? 'Procurement'
                              : 'Sales Person'}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px' }} className="font-bold text-[#111827] text-right">
                          {metaStaff}
                        </span>
                      </div>

                      {/* 5. Reference */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Tag className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '11px' }} className="text-[#374151] font-medium">
                            Reference
                          </span>
                        </div>
                        <span style={{ fontSize: '11px' }} className="font-bold text-[#111827] text-right">
                          {metaRef}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Items Table: matching Reference Image 3 */}
                  <div className="rounded-t-md overflow-hidden border border-[#E5E7EB] mt-1.5">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#064E3B] text-white font-bold">
                          <th className="py-1 px-1.5 w-[5%] text-center" style={{ fontSize: '12px' }}>
                            SL
                          </th>
                          <th className={`py-1 px-1.5 ${settings.item_display_mode === 'detailed' ? 'w-[37%]' : 'w-[59%]'} text-left`} style={{ fontSize: '12px' }}>
                            Item Description
                          </th>
                          {settings.item_display_mode === 'detailed' && (
                            <th className="py-1 px-1.5 w-[22%] text-center" style={{ fontSize: '12px' }}>
                              Size / Specification
                            </th>
                          )}
                          <th className="py-1 px-1.5 w-[8%] text-center" style={{ fontSize: '12px' }}>
                            Qty
                          </th>
                          <th className="py-1 px-1.5 w-[14%] text-right leading-tight" style={{ fontSize: '12px' }}>
                            {effectiveDocType === 'challan' ? 'Packing (Units)' : 'Unit Price (BDT)'}
                          </th>
                          <th className="py-1 px-1.5 w-[14%] text-right leading-tight" style={{ fontSize: '12px' }}>
                            {effectiveDocType === 'challan' ? 'Status' : 'Total (BDT)'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] bg-white">
                        {itemsToRender.map((item: any) => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC]/60">
                            <td className="py-1 px-1.5 text-center text-[#6B7280]" style={{ fontSize: '12px' }}>
                              {item.id}
                            </td>
                            <td className="py-1 px-1.5 text-left">
                              <span style={{ fontSize: '12px', lineHeight: '14px' }} className="font-bold text-[#111827] block">
                                {item.title}
                              </span>
                              {settings.item_display_mode === 'detailed' && item.subtext && (
                                <span style={{ fontSize: '10px', lineHeight: '12px' }} className="text-[#6B7280] block mt-0.5 leading-tight">
                                  {item.subtext}
                                </span>
                              )}
                            </td>
                            {settings.item_display_mode === 'detailed' && (
                              <td style={{ fontSize: '12px' }} className="py-1 px-1.5 text-center text-[#374151]">
                                {item.specs}
                              </td>
                            )}
                            <td style={{ fontSize: '12px' }} className="py-1 px-1.5 text-center text-[#374151] tabular-nums">
                              {item.qty}
                            </td>
                            <td style={{ fontSize: '12px' }} className="py-1 px-1.5 text-right text-[#374151] tabular-nums">
                              {item.unitPrice}
                            </td>
                            <td style={{ fontSize: '12px' }} className="py-1 px-1.5 text-right font-bold text-[#111827] tabular-nums">
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
                          <Cog className="h-3 w-3 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '10px' }} className="font-bold text-[#111827] min-w-[95px]">Production Time</span>
                          <span style={{ fontSize: '10px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '10px' }} className="text-[#374151] font-medium">3 - 5 Working Days</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Truck className="h-3 w-3 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '10px' }} className="font-bold text-[#111827] min-w-[95px]">Delivery</span>
                          <span style={{ fontSize: '10px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '10px' }} className="text-[#374151] font-medium">Within Dhaka & Nationwide</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="h-3 w-3 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '10px' }} className="font-bold text-[#111827] min-w-[95px]">Payment Terms</span>
                          <span style={{ fontSize: '10px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '10px' }} className="text-[#374151] font-medium">
                            {quotationData?.advance_percentage
                              ? `${quotationData.advance_percentage}% Advance, ${100 - quotationData.advance_percentage}% Before Delivery`
                              : '50% Advance, 50% Before Delivery'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 text-[#064E3B] shrink-0" />
                          <span style={{ fontSize: '10px' }} className="font-bold text-[#111827] min-w-[95px]">Warranty</span>
                          <span style={{ fontSize: '10px' }} className="text-[#6B7280] font-bold">:</span>
                          <span style={{ fontSize: '10px' }} className="text-[#374151] font-medium">6 Months (Material & Installation)</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Right: Dynamic Financial Totals & Grand Total Pill (matching Reference Image 3) */}
                  <div className="space-y-0.5 text-right flex flex-col justify-between">
                    <div className="space-y-0.5">
                      {effectiveDocType === 'challan' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Line Items</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">5 Items</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Total Quantity</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">19 Units / Sets</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Package Count</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">4 Secure Bundles</span>
                          </div>
                        </>
                      ) : effectiveDocType === 'receipt' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Total Bill</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                              {invoiceData ? formatBDT(invoiceData.grand_total).replace('৳', '').trim() : paymentData ? formatBDT(paymentData.amount).replace('৳', '').trim() : '33,350'}
                            </span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Collected / Paid</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-success tabular-nums">
                              {invoiceData ? formatBDT(invoiceData.paid_amount || invoiceData.grand_total).replace('৳', '').trim() : paymentData ? formatBDT(paymentData.amount).replace('৳', '').trim() : '18,000'}
                            </span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Balance Due</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                              {invoiceData ? formatBDT(invoiceData.due_amount || 0).replace('৳', '').trim() : '0'}
                            </span>
                          </div>
                        </>
                      ) : effectiveDocType === 'purchase_order' ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">42,500</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Discount</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">- 2,000</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">VAT (15%)</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827]">6,075</span>
                          </div>
                        </>
                      ) : quotationData ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                              {formatBDT(quotationData.subtotal).replace('৳', '').trim()}
                            </span>
                          </div>
                          {quotationData.discount_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Discount</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-destructive tabular-nums">
                                - {formatBDT(quotationData.discount_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {quotationData.vat_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">VAT ({quotationData.vat_rate || 7.5}%)</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                                + {formatBDT(quotationData.vat_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {typeof quotationData.advance_amount === 'number' && quotationData.advance_amount > 0 && (
                            <div className="flex justify-between py-0.5 border-t border-[#E5E7EB] mt-0.5 pt-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Advance ({quotationData.advance_percentage || 50}%)</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-[#064E3B] tabular-nums">
                                {formatBDT(quotationData.advance_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {typeof quotationData.due_on_delivery === 'number' && quotationData.due_on_delivery > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Due on Delivery</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                                {formatBDT(quotationData.due_on_delivery).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                        </>
                      ) : invoiceData ? (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                              {formatBDT(invoiceData.subtotal).replace('৳', '').trim()}
                            </span>
                          </div>
                          {invoiceData.discount_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Discount</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-destructive tabular-nums">
                                - {formatBDT(invoiceData.discount_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {invoiceData.vat_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">VAT</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">
                                + {formatBDT(invoiceData.vat_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {invoiceData.paid_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Paid Amount</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-success tabular-nums">
                                {formatBDT(invoiceData.paid_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                          {invoiceData.due_amount > 0 && (
                            <div className="flex justify-between py-0.5">
                              <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium text-warning">Balance Due</span>
                              <span style={{ fontSize: '12px' }} className="font-bold text-warning tabular-nums">
                                {formatBDT(invoiceData.due_amount).replace('৳', '').trim()}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Sub Total</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">30,250</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">Discount</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">- 1,250</span>
                          </div>
                          <div className="flex justify-between py-0.5">
                            <span style={{ fontSize: '12px' }} className="text-[#374151] font-medium">VAT (15%)</span>
                            <span style={{ fontSize: '12px' }} className="font-bold text-[#111827] tabular-nums">4,350</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Grand Total Pill: Amount exactly 16px (matching Reference Image 3) */}
                    <div className="flex items-center justify-between py-1.5 px-3 bg-[#064E3B] text-white rounded-md font-bold shadow-xs mt-0.5">
                      <span style={{ fontSize: '12px' }}>
                        {effectiveDocType === 'challan'
                          ? 'Delivery Status'
                          : effectiveDocType === 'receipt'
                          ? 'Total Received (BDT)'
                          : effectiveDocType === 'purchase_order'
                          ? 'PO Total (BDT)'
                          : 'Grand Total (BDT)'}
                      </span>
                      <span style={{ fontSize: '16px' }} className="font-black tabular-nums tracking-tight">
                        {quotationData
                          ? formatBDT(quotationData.grand_total).replace('৳', '').trim()
                          : effectiveDocType === 'receipt'
                          ? formatBDT(paymentData?.amount || invoiceData?.paid_amount || (invoiceData ? invoiceData.grand_total : 18000)).replace('৳', '').trim()
                          : invoiceData
                          ? formatBDT(invoiceData.grand_total).replace('৳', '').trim()
                          : effectiveDocType === 'challan'
                          ? 'Good Condition'
                          : effectiveDocType === 'purchase_order'
                          ? '46,575'
                          : '33,350'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Block 3: Dynamic Terms & Signatures (matching Reference Image 4) */}
                <div className="mt-1.5 pt-1.5 border-t border-[#E5E7EB]">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    {/* Terms & Conditions (Left - 7 cols) */}
                    <div className="col-span-7 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-[#064E3B] shrink-0" />
                        <span style={{ fontSize: '12px' }} className="font-bold text-[#064E3B]">
                          Terms & Conditions
                        </span>
                        <div className="h-[1px] bg-[#E2E8F0] flex-1 ml-1" />
                      </div>
                      {/* Terms text: Exactly 10px */}
                      <div
                        style={{ fontSize: '10px', lineHeight: '14px' }}
                        className="space-y-0.5 text-[#374151]"
                      >
                        {activeTerms.map((term, index) => (
                          <p key={index}>{term}</p>
                        ))}
                      </div>
                    </div>

                    {/* Signatures (Right - 5 cols) */}
                    <div className="col-span-5 grid grid-cols-2 gap-3 text-center border-l border-[#E5E7EB] pl-3">
                      {/* Prepared By */}
                      <div className="space-y-0.5 text-left">
                        <p style={{ fontSize: '10px' }} className="text-[#111827] font-bold leading-none">
                          {effectiveDocType === 'challan'
                            ? 'Dispatched By'
                            : effectiveDocType === 'receipt'
                            ? 'Received By'
                            : effectiveDocType === 'purchase_order'
                            ? 'Issued By'
                            : 'Prepared By'}
                        </p>
                        <div className="h-6 flex items-end justify-start">
                          <svg viewBox="0 0 100 28" fill="none" className="h-5 w-16">
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
                        <div className="border-t border-[#9CA3AF] pt-1">
                          <p style={{ fontSize: '10px' }} className="font-bold text-[#111827] leading-tight">
                            {quotationData
                              ? (quotationData.salesperson_name || 'Shahid Hossain')
                              : invoiceData
                              ? (invoiceData.created_by_name || 'Accounts Dept')
                              : effectiveDocType === 'challan'
                              ? 'Abul Kalam'
                              : effectiveDocType === 'receipt'
                              ? 'Nazmul Huda'
                              : effectiveDocType === 'purchase_order'
                              ? 'Kamrul Hasan'
                              : 'Shahid Hossain'}
                          </p>
                          <p style={{ fontSize: '10px' }} className="text-[#4B5563] leading-tight mt-0.5">
                            {effectiveDocType === 'receipt'
                              ? 'Cashier'
                              : effectiveDocType === 'challan'
                              ? 'Store In-charge'
                              : effectiveDocType === 'purchase_order'
                              ? 'Procurement'
                              : 'Sales Executive'}
                          </p>
                          <p style={{ fontSize: '10px' }} className="text-[#4B5563] leading-tight mt-0.5 truncate max-w-[85px]">
                            {companyName}
                          </p>
                        </div>
                      </div>

                      {/* Approved By */}
                      <div className="space-y-0.5 text-left">
                        <p style={{ fontSize: '10px' }} className="text-[#111827] font-bold leading-none">
                          {effectiveDocType === 'challan'
                            ? 'Received By (Client)'
                            : effectiveDocType === 'receipt'
                            ? 'Verified By'
                            : effectiveDocType === 'purchase_order'
                            ? 'Authorized By'
                            : 'Approved By'}
                        </p>
                        <div className="h-6" />
                        <div className="border-t border-[#9CA3AF] pt-1 space-y-0.5">
                          <p style={{ fontSize: '10px' }} className="text-[#4B5563] leading-tight">
                            Name:
                          </p>
                          <p style={{ fontSize: '10px' }} className="text-[#4B5563] leading-tight">
                            Designation:
                          </p>
                          <p style={{ fontSize: '10px' }} className="text-[#4B5563] leading-tight">
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
      {showControls && (
        <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20 shrink-0 print:hidden">
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
      )}
    </div>
  )
}
