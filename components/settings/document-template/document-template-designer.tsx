'use client'

import React, { useState, useEffect } from 'react'
import {
  Eye,
  Download,
  CheckCircle2,
  Printer,
  Loader2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import {
  DocumentTypeKey,
  DOCUMENT_TYPE_TABS,
  DocumentTemplateSettings,
  DEFAULT_TEMPLATE_SETTINGS,
} from '@/types/document-template.types'
import {
  getAllDocumentTemplates,
  saveAllDocumentTemplates,
} from '@/lib/services/document-template.service'
import { PdfViewerModal } from '@/components/pdf/pdf-viewer-modal'
import { downloadPdf } from '@/lib/pdf/pdf-generator'
import { QuotationPdfDocument } from '@/components/pdf/documents/quotation-pdf-document'
import { InvoicePdfDocument } from '@/components/pdf/documents/invoice-pdf-document'
import { ChallanPdfDocument } from '@/components/pdf/documents/challan-pdf-document'
import { MoneyReceiptPdfDocument } from '@/components/pdf/documents/money-receipt-pdf-document'
import type { QuotationRecord } from '@/types/quotation.types'
import type { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import type { DeliveryChallanRecord } from '@/types/logistics.types'
import { TemplateSettingsForm } from './template-settings-form'
import { LiveA4Preview } from './print-a4-preview'

export function DocumentTemplateDesigner() {
  const { company } = useTenant()
  const { tBilingual } = useI18n()

  const [activeDocType, setActiveDocType] = useState<DocumentTypeKey>('quotation')
  const [allTemplates, setAllTemplates] = useState<
    Record<DocumentTypeKey, DocumentTemplateSettings>
  >(DEFAULT_TEMPLATE_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null)
  const [isPreviewPdfOpen, setIsPreviewPdfOpen] = useState(false)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false)

  // Load persisted template settings on mount if available in localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const loaded = getAllDocumentTemplates(company?.slug)
    setAllTemplates(loaded)
  }, [company?.slug])

  // Current active settings
  const currentSettings = allTemplates[activeDocType] || DEFAULT_TEMPLATE_SETTINGS[activeDocType]

  // Handler for form field updates
  const handleUpdateCurrentSettings = (
    updatedFields: Partial<DocumentTemplateSettings>
  ) => {
    setAllTemplates((prev) => ({
      ...prev,
      [activeDocType]: {
        ...prev[activeDocType],
        ...updatedFields,
        updated_at: new Date().toISOString(),
      },
    }))
  }

  // Save template action
  const handleSaveTemplate = () => {
    setIsSaving(true)
    try {
      saveAllDocumentTemplates(company?.slug, allTemplates)
      setTimeout(() => {
        setIsSaving(false)
        const docName =
          DOCUMENT_TYPE_TABS.find((t) => t.key === activeDocType)?.labelEn ||
          activeDocType
        setSaveSuccessMessage(`${docName} template saved successfully!`)
        setTimeout(() => setSaveSuccessMessage(null), 3500)
      }, 300)
    } catch {
      setIsSaving(false)
    }
  }

  const effectiveCompanyName =
    company?.name ||
    (company?.slug
      ? company.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Vision Sign')

  const effectiveAddress =
    company?.address || 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230'

  const effectivePhone = company?.phone || '+880 1712 345678'

  const effectiveEmail = company?.email || 'info@printflow.bd'

  const effectiveWebsite =
    company?.website ||
    (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd')

  const effectiveCompanyMeta = {
    name: effectiveCompanyName,
    tagline: (company as any)?.tagline || company?.legal_name || 'Printing & Signage Specialists',
    address: effectiveAddress,
    phone: effectivePhone,
    email: effectiveEmail,
    website: effectiveWebsite,
    binNumber: (company as any)?.bin_no || undefined,
  }

  // Sample Quotation Record
  const sampleQuotation: QuotationRecord = {
    id: 'quo-sample-01',
    company_id: company?.id || 'cmp-01',
    quotation_number: 'QT-2026-1001',
    status: 'approved',
    customer_id: 'cus-001',
    customer_name: 'ABC Enterprises Ltd.',
    customer_company: 'ABC Group of Industries',
    customer_phone: '+880 1711 222333',
    customer_email: 'rahim@abc.com',
    customer_address: '123 Business Avenue, Gulshan, Dhaka-1212',
    salesperson_id: 'user-001',
    salesperson_name: 'Mohammad Farhan',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: '2026-11-15',
    delivery_method: 'company_delivery',
    language_mode: 'en',
    subtotal: 28250,
    vat_rate: 7.5,
    vat_amount: 2118,
    discount_amount: 0,
    grand_total: 30368,
    advance_percentage: 50,
    advance_amount: 15184,
    due_on_delivery: 15184,
    total_cost: 16500,
    margin_percent: 41,
    items: [
      {
        id: 'item-1',
        description: 'ACP Signboard with LED (Front lit Acrylic Letter)',
        material_spec: '3mm Alstrong ACP + Cast Acrylic 3D Letters',
        dimensions_spec: '12 ft x 3 ft (36.00 sft)',
        width: 12,
        height: 3,
        dimension_unit: 'ft',
        area_sft: 36,
        quantity: 1,
        unit: 'pcs',
        unit_rate: 18000,
        unit_price: 18000,
        item_total: 18000,
      },
      {
        id: 'item-2',
        description: 'Vinyl Print with Matt Lamination (Outdoor Grade)',
        material_spec: 'Star Vinyl + Korean Cold Matt Film',
        dimensions_spec: '4 ft x 6 ft (24.00 sft)',
        width: 4,
        height: 6,
        dimension_unit: 'ft',
        area_sft: 24,
        quantity: 5,
        unit: 'pcs',
        unit_rate: 950,
        unit_price: 950,
        item_total: 4750,
      },
      {
        id: 'item-3',
        description: 'High-Res PVC Foam Board Print 3mm',
        material_spec: '3mm Rigid PVC Sheet + High-Density UV Print',
        dimensions_spec: '2 ft x 3 ft (6.00 sft)',
        width: 2,
        height: 3,
        dimension_unit: 'ft',
        area_sft: 6,
        quantity: 10,
        unit: 'pcs',
        unit_rate: 350,
        unit_price: 350,
        item_total: 3500,
      },
      {
        id: 'item-4',
        description: 'Roll-up Standee Display Banner',
        material_spec: 'Heavy Aluminium Base + Synthetic Banner',
        dimensions_spec: '2.5 ft x 6 ft',
        width: 2.5,
        height: 6,
        dimension_unit: 'ft',
        area_sft: 15,
        quantity: 2,
        unit: 'pcs',
        unit_rate: 1250,
        unit_price: 1250,
        item_total: 2500,
      },
      {
        id: 'item-5',
        description: 'Commercial Site Installation & Logistics',
        material_spec: 'Skilled technician team with mounting hardware',
        dimensions_spec: 'Full Job',
        width: 1,
        height: 1,
        dimension_unit: 'ft',
        area_sft: 1,
        quantity: 1,
        unit: 'job',
        unit_rate: 1500,
        unit_price: 1500,
        item_total: 1500,
      },
    ],
    notes: 'Standard 1-year replacement warranty on LED modules and power supply.',
    terms_and_conditions: currentSettings.terms_and_conditions || undefined,
  }

  // Sample Invoice Record
  const sampleInvoice: InvoiceRecord = {
    id: 'inv-sample-01',
    company_id: company?.id || 'cmp-01',
    invoice_number: 'INV-2026-1001',
    invoice_type: 'vat_invoice',
    customer_id: 'cus-001',
    customer_name: 'ABC Enterprises Ltd.',
    customer_company: 'ABC Group of Industries',
    customer_address: '123 Business Avenue, Gulshan, Dhaka-1212',
    customer_phone: '+880 1711 222333',
    customer_bin: '18291004821',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'partially_paid',
    subtotal: 28250,
    vat_percentage: 7.5,
    vat_amount: 2118,
    discount_amount: 0,
    grand_total: 30368,
    paid_amount: 15184,
    due_amount: 15184,
    write_off_amount: 0,
    created_by_name: 'Mohammad Farhan',
    items: [
      {
        id: 'inv-item-1',
        item_name: 'ACP Signboard with Samsung LED (Front lit Acrylic Letter)',
        quantity: 1,
        unit: 'pcs',
        unit_price: 18000,
        total_price: 18000,
      },
      {
        id: 'inv-item-2',
        item_name: 'Vinyl Print with Matt Lamination (Outdoor Grade)',
        quantity: 5,
        unit: 'pcs',
        unit_price: 950,
        total_price: 4750,
      },
      {
        id: 'inv-item-3',
        item_name: 'PVC Foam Board Print 3mm (Rigid UV Print)',
        quantity: 10,
        unit: 'pcs',
        unit_price: 350,
        total_price: 3500,
      },
      {
        id: 'inv-item-4',
        item_name: 'Roll-up Standee Display Banner (Aluminium Base)',
        quantity: 2,
        unit: 'pcs',
        unit_price: 1250,
        total_price: 2500,
      },
      {
        id: 'inv-item-5',
        item_name: 'Site Installation & Logistics Services',
        quantity: 1,
        unit: 'job',
        unit_price: 1500,
        total_price: 1500,
      },
    ],
    notes: 'Thank you for your business. Please deposit remaining balance upon delivery.',
  }

  // Sample Challan Record
  const sampleChallan: DeliveryChallanRecord = {
    id: 'chl-sample-01',
    company_id: company?.id || 'cmp-01',
    challan_number: 'DC-2026-1001',
    customer_id: 'cus-001',
    customer_name: 'ABC Enterprises Ltd.',
    customer_phone: '+880 1711 222333',
    delivery_address: '123 Business Avenue, Gulshan, Dhaka-1212',
    delivery_method: 'company_vehicle',
    transport_cost: 0,
    scheduled_date: new Date().toISOString().split('T')[0],
    status: 'out_for_delivery',
    delivery_person_name: 'Abul Kashem',
    delivery_person_phone: '+880 1819 888999',
    vehicle_info: 'Dhaka Metro Cha-54-1234 (Covered Van)',
    created_by_name: 'Mohammad Farhan',
    items: [
      {
        id: 'chl-item-1',
        product_description: 'ACP Signboard Assembly (Packed in protective wrap)',
        quantity: 1,
        unit: 'unit',
        remarks: 'Tested on-site before dispatch',
      },
      {
        id: 'chl-item-2',
        product_description: 'Vinyl Print Graphics (Rolled in shipping tube)',
        quantity: 5,
        unit: 'rolls',
        remarks: 'Moisture-proof sealed',
      },
      {
        id: 'chl-item-3',
        product_description: 'PVC Board Cutouts (Corner protected)',
        quantity: 10,
        unit: 'pcs',
        remarks: 'Edge guarded',
      },
      {
        id: 'chl-item-4',
        product_description: 'Roll-up Standee Display Sets (Padded carry bags)',
        quantity: 2,
        unit: 'sets',
        remarks: 'Complete hardware included',
      },
    ],
    notes: 'Received above materials in complete and undamaged good condition.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Sample Payment Record
  const samplePayment: PaymentRecord = {
    id: 'rec-sample-01',
    receipt_number: 'REC-2026-1001',
    company_id: company?.id || 'cmp-01',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 15184,
    payment_type: 'advance_payment',
    payment_method: 'bank',
    bank_name: 'Eastern Bank Ltd.',
    customer_id: 'cus-001',
    customer_name: 'ABC Enterprises Ltd.',
    received_by_name: 'Mohammad Farhan',
    notes: '50% advance booking deposit for Quotation QT-2026-1001.',
    allocations: [
      {
        id: 'alloc-sample-01',
        payment_id: 'rec-sample-01',
        invoice_id: 'inv-sample-01',
        invoice_number: 'INV-2026-1001',
        allocated_amount: 15184,
        created_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
  }

  // Sample Purchase Order adapted as Quotation shape
  const samplePurchaseOrder: QuotationRecord = {
    ...sampleQuotation,
    id: 'po-sample-01',
    quotation_number: 'PO-2026-1001',
    customer_name: 'Alstrong Composites BD',
    customer_company: 'Supplier ID: SUP-0042',
    notes: 'Purchase order issued against agreed contract terms. Standard delivery inspection required.',
  }

  // Get active Vector PDF document element
  const getSamplePdfDocument = (
    type: DocumentTypeKey,
    settings: DocumentTemplateSettings,
    companyMeta: typeof effectiveCompanyMeta
  ): React.ReactElement => {
    switch (type) {
      case 'invoice':
        return (
          <InvoicePdfDocument
            invoice={sampleInvoice}
            template={settings}
            company={companyMeta}
          />
        )
      case 'challan':
        return (
          <ChallanPdfDocument
            challan={sampleChallan}
            template={settings}
            company={companyMeta}
          />
        )
      case 'receipt':
        return (
          <MoneyReceiptPdfDocument
            payment={samplePayment}
            template={settings}
            company={companyMeta}
          />
        )
      case 'purchase_order':
        return (
          <QuotationPdfDocument
            quotation={samplePurchaseOrder}
            template={settings}
            company={companyMeta}
          />
        )
      case 'quotation':
      default:
        return (
          <QuotationPdfDocument
            quotation={sampleQuotation}
            template={settings}
            company={companyMeta}
          />
        )
    }
  }

  // 1. Clean Native Browser Print (with [data-print-isolate="true"] and A4 page fit)
  const handlePrintPdf = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  // 2. Open High-Fidelity Vector PDF Preview Modal
  const handlePreviewPdf = () => {
    setIsPreviewPdfOpen(true)
  }

  // 3. Directly Download PDF File
  const handleDownloadPdf = async () => {
    setIsDownloadingPdf(true)
    const docElement = getSamplePdfDocument(activeDocType, currentSettings, effectiveCompanyMeta)
    const slugName = (company?.slug || 'vision-sign').toLowerCase()
    const fileName = `${slugName}-${activeDocType}-template.pdf`

    try {
      await downloadPdf(docElement, fileName)
    } catch (err) {
      console.warn('[TemplateDesigner] Vector PDF client download fallback:', err)
      // Fallback: trigger print dialog for Save as PDF
      if (typeof window !== 'undefined') {
        window.print()
      }
    } finally {
      setIsDownloadingPdf(false)
    }
  }

  // Sample document options for top header selector
  const sampleDocOptions: { key: DocumentTypeKey; label: string }[] = [
    { key: 'quotation', label: 'Sample Quotation' },
    { key: 'invoice', label: 'Sample Invoice' },
    { key: 'challan', label: 'Sample Delivery Challan' },
    { key: 'receipt', label: 'Sample Payment Receipt' },
    { key: 'purchase_order', label: 'Sample Purchase Order' },
  ]

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION (Hidden during print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 print:hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            {tBilingual('Document Template', 'ডকুমেন্ট টেমপ্লেট')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            {tBilingual(
              'Customize your quotation, invoice and other document templates.',
              'প্রিন্ট, ডাউনলোড বা কাস্টমারকে পাঠানোর জন্য আপনার কোটেশন ও ইনভয়েস টেমপ্লেট সাজান।'
            )}
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {saveSuccessMessage && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-success-surface border border-success-border text-success text-xs font-bold animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4" />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* Sample Switcher Dropdown */}
          <select
            value={activeDocType}
            onChange={(e) => setActiveDocType(e.target.value as DocumentTypeKey)}
            className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            aria-label="Select document template type"
          >
            {sampleDocOptions.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Print PDF Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3 bg-card border-input hover:bg-muted"
            title="Print isolated document template or Save as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Print PDF</span>
          </Button>

          {/* Preview PDF Modal Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePreviewPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3 bg-card border-input hover:bg-muted"
            title="Open Vector PDF preview modal"
          >
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Preview PDF</span>
          </Button>

          {/* Download PDF Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isDownloadingPdf}
            onClick={handleDownloadPdf}
            className="text-xs font-semibold gap-1.5 cursor-pointer h-9 px-3 bg-card border-input hover:bg-muted"
            title="Download high-resolution vector PDF"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span>{isDownloadingPdf ? 'Downloading...' : 'Download PDF'}</span>
          </Button>
        </div>
      </div>

      {/* 2. DOCUMENT TYPE TABS (Hidden during print) */}
      <div className="border-b border-border print:hidden">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-none pb-px">
          {DOCUMENT_TYPE_TABS.map((tab) => {
            const isActive = activeDocType === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveDocType(tab.key)}
                className={`flex items-center gap-2 pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. SPLIT 2-COLUMN WORKSPACE: LEFT = CONFIGURATION, RIGHT = LIVE A4 PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start print:block print:w-full print:gap-0">
        {/* Left Column: Configuration Settings (Hidden during print) */}
        <div className="lg:col-span-5 space-y-4 print:hidden">
          <TemplateSettingsForm
            settings={currentSettings}
            onChange={handleUpdateCurrentSettings}
            onSave={handleSaveTemplate}
            isSaving={isSaving}
          />
        </div>

        {/* Right Column: Live A4 Preview (Fills full width during print) */}
        <div className="lg:col-span-7 sticky top-4 print:w-full print:max-w-none print:static print:p-0 print:m-0">
          <LiveA4Preview
            settings={currentSettings}
            activeDocType={activeDocType}
            onDocTypeChange={(newType) => setActiveDocType(newType)}
            companyName={effectiveCompanyName}
            companyAddress={effectiveAddress}
            companyPhone={effectivePhone}
            companyEmail={effectiveEmail}
            companyWebsite={effectiveWebsite}
            companyLogoUrl={company?.logo_url || undefined}
            onPreviewPdf={handlePreviewPdf}
            onPrintPdf={handlePrintPdf}
            onDownloadPdf={handleDownloadPdf}
          />
        </div>
      </div>

      {/* 4. VECTOR PDF PREVIEW MODAL */}
      <PdfViewerModal
        isOpen={isPreviewPdfOpen}
        onClose={() => setIsPreviewPdfOpen(false)}
        title={`${DOCUMENT_TYPE_TABS.find((t) => t.key === activeDocType)?.labelEn || activeDocType} Template Preview`}
        document={getSamplePdfDocument(activeDocType, currentSettings, effectiveCompanyMeta)}
        filename={`${(company?.slug || 'vision-sign').toLowerCase()}-${activeDocType}-template.pdf`}
      />
    </div>
  )
}

