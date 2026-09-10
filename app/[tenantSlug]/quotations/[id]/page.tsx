'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
import {
  FileSpreadsheet,
  ArrowLeft,
  Printer,
  Download,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  Clock,
  Building,
  Phone,
  Mail,
  ShieldAlert,
  Percent,
  TrendingUp,
  FileCheck,
  History,
  Sliders,
  DollarSign,
  MapPin,
  ExternalLink,
  FileText,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { FeatureGate } from '@/components/shared/feature-gate'
import {
  DEFAULT_QUOTATION_TERMS,
  DEFAULT_QUOTATION_TERMS_BN,
} from '@/services/quotation.service'
import {
  QuotationRecord,
  QuotationStatus,
  LanguageMode,
  QuotationActivityRecord,
} from '@/types/quotation.types'
import { formatBDT, toBengaliNumerals } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

interface QuotationDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function QuotationDetailPage({ params }: QuotationDetailPageProps) {
  const resolvedParams = use(params)
  const quoteId = resolvedParams.id
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [quotations, setQuotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [])
  const [allActivities, setAllActivities] = useDataStore<QuotationActivityRecord[]>(STORAGE_KEYS.QUOTATION_ACTIVITIES, [])

  const quote = quotations.find((q) => q.id === quoteId || q.quotation_number === quoteId)
  const activities = allActivities.filter((a) => quote && (a.quotation_id === quote.id || a.quotation_id === quoteId))

  // Presentation & Workflow State
  const [languageMode, setLanguageMode] = useState<LanguageMode>(quote?.language_mode || 'bn')
  const [isNegotiationOpen, setIsNegotiationOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Negotiation State
  const [negotiatedDiscount, setNegotiatedDiscount] = useState<number>(quote?.discount_amount || 0)
  const [negotiatedNotes, setNegotiatedNotes] = useState<string>('')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  if (!quote) {
    return (
      <FeatureGate feature="quotation_pdf">
        <div className="space-y-6 max-w-6xl">
          <Link
            href={`/${slug}/quotations`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Quotations Directory
          </Link>
          <Card className="p-12 text-center border-dashed">
            <FileSpreadsheet className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Quotation Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              The quotation you are trying to view does not exist or has been removed.
            </p>
            <Button asChild className="mt-4" size="sm">
              <Link href={`/${slug}/quotations`}>Return to Directory</Link>
            </Button>
          </Card>
        </div>
      </FeatureGate>
    )
  }

  // Handle status change
  const handleStatusChange = (newStatus: QuotationStatus) => {
    PrintERPDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
      status: newStatus,
    })

    const newActivity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: newStatus as any,
      details: `Quotation status advanced to ${newStatus.toUpperCase()}`,
      actor_name: 'Current User',
      created_at: 'Just now',
    }
    PrintERPDataStore.addItem<QuotationActivityRecord>(STORAGE_KEYS.QUOTATION_ACTIVITIES, newActivity)
    showNotification(`Quotation status updated to ${newStatus.toUpperCase()}`)
  }

  // Convert to Order Action
  const handleConvertToOrder = () => {
    const order = PrintERPDataStore.convertQuotationToSalesOrder(quote.id)
    if (order) {
      showNotification(`Successfully converted to Job Order Ticket #${order.order_number}!`)
    }
  }

  // Duplicate Quote Action
  const handleDuplicate = () => {
    const dupNumber = `QUO-0000${Math.floor(Math.random() * 900) + 100}`
    const duplicated: QuotationRecord = {
      ...quote,
      id: `quo-${Date.now()}`,
      quotation_number: dupNumber,
      status: 'draft',
      converted_order_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, duplicated)
    showNotification(`Quotation cloned into new Draft ${dupNumber}.`)
  }

  // Send WhatsApp Action
  const handleSendWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello ${quote.customer_name},\nHere is your official quotation ${quote.quotation_number} from ${company?.name || 'InkFlow'}.\nGrand Total: ৳ ${quote.grand_total} (Valid until ${quote.valid_until}).\nPlease review and confirm.`
    )
    window.open(`https://wa.me/${quote.customer_phone.replace(/\D/g, '')}?text=${text}`, '_blank')
    handleStatusChange('sent')
  }

  // Apply Negotiation
  const handleApplyNegotiation = (e: React.FormEvent) => {
    e.preventDefault()
    const newSubtotal = quote.subtotal
    const newVat = Math.round(((newSubtotal - negotiatedDiscount) * quote.vat_rate) / 100)
    const newGrandTotal = Math.max(0, newSubtotal - negotiatedDiscount) + newVat
    const newMargin = Math.round(
      ((newSubtotal - negotiatedDiscount - quote.total_cost) / (newSubtotal - negotiatedDiscount || 1)) * 100
    )

    PrintERPDataStore.updateItem<QuotationRecord>(STORAGE_KEYS.QUOTATIONS, quote.id, {
      discount_amount: negotiatedDiscount,
      vat_amount: newVat,
      grand_total: newGrandTotal,
      margin_percent: newMargin,
      status: 'negotiation',
      updated_at: new Date().toISOString(),
    })

    const newActivity: QuotationActivityRecord = {
      id: `qa-${Date.now()}`,
      quotation_id: quote.id,
      action: 'negotiated',
      details: `Applied negotiated discount of ৳ ${negotiatedDiscount}. New Total: ৳ ${newGrandTotal}. Reason: ${negotiatedNotes || 'Customer concession'}`,
      actor_name: 'Current User (Sales)',
      created_at: 'Just now',
    }
    PrintERPDataStore.addItem<QuotationActivityRecord>(STORAGE_KEYS.QUOTATION_ACTIVITIES, newActivity)
    setIsNegotiationOpen(false)
    showNotification(`Negotiated price ৳ ${newGrandTotal} applied. Gross margin is now ${newMargin}%.`)
  }

  const num = (v: number | string) => (languageMode === 'bn' ? toBengaliNumerals(v) : v)

  return (
    <FeatureGate feature="quotation_pdf">
      <div className="space-y-6 max-w-6xl">
        {/* Non-print Top Controls Bar */}
      <div className="print:hidden space-y-4">
        <Link
          href={`/${slug}/quotations`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Quotations Directory
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900 text-white dark:bg-slate-950 shadow-lg">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-bold text-cyan-300 text-lg">
                {quote.quotation_number}
              </span>
              <span className="capitalize px-2 py-0.5 rounded text-xs font-bold bg-white/10 text-white border border-white/20">
                {quote.status.toUpperCase()}
              </span>
              {quote.converted_order_id && (
                <Badge variant="outline" className="bg-purple-900/60 text-purple-200 border-purple-400 text-xs">
                  Order #{quote.converted_order_id}
                </Badge>
              )}
            </div>
            <div className="text-xs text-slate-300">
              Customer: <strong>{quote.customer_name}</strong> • Sales: <strong>{quote.salesperson_name}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Selector */}
            <select
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value as QuotationStatus)}
              className="h-8 px-2 rounded-md bg-white/10 text-white text-xs border border-white/20 font-semibold"
            >
              <option value="draft" className="text-black">Draft</option>
              <option value="sent" className="text-black">Sent</option>
              <option value="viewed" className="text-black">Viewed</option>
              <option value="negotiation" className="text-black">Negotiation</option>
              <option value="approved" className="text-black">Approved</option>
              <option value="rejected" className="text-black">Rejected</option>
              <option value="expired" className="text-black">Expired</option>
              <option value="converted" className="text-black">Converted</option>
            </select>

            {/* Negotiation Drawer Trigger */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNegotiationOpen(true)}
              className="h-8 text-xs bg-amber-500/20 text-amber-200 border-amber-400/40 hover:bg-amber-500/30"
            >
              <Sliders className="h-3.5 w-3.5 mr-1" />
              Negotiate Margin
            </Button>

            {/* Send WhatsApp */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendWhatsApp}
              className="h-8 text-xs bg-emerald-500/20 text-emerald-200 border-emerald-400/40 hover:bg-emerald-500/30"
            >
              <Send className="h-3.5 w-3.5 mr-1" />
              Send WhatsApp
            </Button>

            {/* Duplicate */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDuplicate}
              className="h-8 text-xs bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              <Copy className="h-3.5 w-3.5 mr-1" />
              Duplicate
            </Button>

            {/* Print / Download PDF */}
            <Button
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="h-3.5 w-3.5 mr-1" />
              Print / Save PDF
            </Button>

            {/* Convert to Order */}
            {quote.status !== 'converted' && (
              <Button
                size="sm"
                onClick={handleConvertToOrder}
                className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                <FileCheck className="h-3.5 w-3.5 mr-1" />
                Convert to Order
              </Button>
            )}
          </div>
        </div>

        {/* Language Presentation Mode Switcher */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-100 dark:bg-slate-900 text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Document Presentation Language:
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={languageMode === 'en' ? 'default' : 'outline'}
              onClick={() => setLanguageMode('en')}
              className="h-7 text-xs px-2.5"
            >
              English
            </Button>
            <Button
              size="sm"
              variant={languageMode === 'bn' ? 'default' : 'outline'}
              onClick={() => setLanguageMode('bn')}
              className="h-7 text-xs px-2.5"
            >
              বাংলা
            </Button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className="print:hidden p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          PROFESSIONAL PRINT & PDF QUOTATION DOCUMENT
          Styled with standard A4 margins and print borders.
         ========================================================================= */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">
        {/* Document Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-blue-700 text-white font-black text-xl flex items-center justify-center">
                {(company?.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900">
                  {company?.name || 'Printing & Signage Solutions'}
                </h2>
                {company?.name_bn && (
                  <div className="text-xs text-slate-600 font-semibold">{company.name_bn}</div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-600 pt-1">
              Motijheel Printing Zone, 42 Fakirapool Main Road, Dhaka-1000
            </p>
            <div className="text-xs text-slate-600 flex flex-wrap gap-3 pt-0.5">
              <span>Phone: +880 1711-000000</span>
              <span>•</span>
              <span>BIN: 004819284-0101</span>
              <span>•</span>
              <span>TIN: 8492049182</span>
            </div>
          </div>

          <div className="text-right space-y-1">
            <div className="text-2xl font-black text-blue-800 uppercase tracking-wide">
              {languageMode === 'bn'
                ? 'উদ্ধৃতিপত্র / প্রাক্কলন'
                : 'OFFICIAL QUOTATION'}
            </div>
            <div className="text-sm font-mono font-bold text-slate-900">
              {quote.quotation_number}
            </div>
            <div className="text-xs text-slate-500">
              Date: <strong>{quote.quotation_date}</strong>
            </div>
            <div className="text-xs text-red-600 font-semibold">
              Valid Until: <strong>{quote.valid_until}</strong>
            </div>
          </div>
        </div>

        {/* Customer / Client Box */}
        <div className="grid grid-cols-2 gap-6 my-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {languageMode === 'bn' ? 'গ্রাহকের তথ্য (বিল প্রাপক)' : 'Bill To / Client Details'}
            </span>
            <div className="text-sm font-bold text-slate-900">
              {languageMode === 'bn' && quote.customer_name_bn ? quote.customer_name_bn : quote.customer_name}
            </div>
            <div className="text-slate-600">{quote.customer_address}</div>
            <div className="text-slate-600 font-mono">Mobile: {quote.customer_phone}</div>
            {quote.customer_email && <div className="text-slate-600">Email: {quote.customer_email}</div>}
          </div>

          <div className="space-y-1 text-right sm:text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {languageMode === 'bn' ? 'প্রকল্প বিবরণ' : 'Quotation Specifics'}
            </span>
            <div className="text-slate-700">
              Sales Representative: <strong>{quote.salesperson_name}</strong>
            </div>
            <div className="text-slate-700">
              Payment Terms: <strong>50% Advance, 50% Delivery</strong>
            </div>
            {quote.customer_bin && (
              <div className="text-slate-700 font-mono">
                Customer BIN: <strong>{quote.customer_bin}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="my-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="py-2.5 px-3 font-bold w-12 text-center">#</th>
                <th className="py-2.5 px-3 font-bold">
                  {languageMode === 'bn' ? 'পণ্যের বিবরণ ও স্পেসিফিকেশন' : 'Item Description & Specifications'}
                </th>
                <th className="py-2.5 px-3 font-bold text-center">
                  {languageMode === 'bn' ? 'পরিমাপ (W × H)' : 'Dimensions'}
                </th>
                <th className="py-2.5 px-3 font-bold text-center">
                  {languageMode === 'bn' ? 'ক্ষেত্রফল (SFT)' : 'Area / Qty'}
                </th>
                <th className="py-2.5 px-3 font-bold text-right">
                  {languageMode === 'bn' ? 'একক দর (৳)' : 'Unit Rate (৳)'}
                </th>
                <th className="py-2.5 px-3 font-bold text-right">
                  {languageMode === 'bn' ? 'মোট মূল্য (৳)' : 'Total (৳)'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 border-b border-slate-200">
              {quote.items.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">
                      {languageMode === 'bn' && item.description_bn ? item.description_bn : item.description}
                    </div>
                    {item.material_spec && (
                      <div className="text-[11px] text-slate-500">{item.material_spec}</div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-mono">
                    {item.width} × {item.height} {item.dimension_unit}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-semibold">
                    {item.area_sft} {item.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-medium">
                    ৳ {formatBDT(item.unit_rate)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    ৳ {formatBDT(item.item_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Words */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-6 items-start">
          {/* Terms and Notes */}
          <div className="space-y-3 text-xs">
            <div>
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                {languageMode === 'bn' ? 'বিল ও ডেলিভারির শর্তাবলী:' : 'Terms & Conditions:'}
              </span>
              <pre className="font-sans whitespace-pre-line text-slate-600 text-[11px] leading-relaxed mt-1">
                {languageMode === 'bn' ? DEFAULT_QUOTATION_TERMS_BN : quote.terms_and_conditions}
              </pre>
            </div>
            {quote.notes && (
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                <strong>Note:</strong> {quote.notes}
              </div>
            )}
          </div>

          {/* Subtotal, Discount, VAT & Grand Total */}
          <div className="space-y-2 text-xs border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex justify-between py-1 text-slate-600">
              <span>{languageMode === 'bn' ? 'উপমোট (Subtotal):' : 'Subtotal:'}</span>
              <span className="font-mono font-semibold">৳ {formatBDT(quote.subtotal)}</span>
            </div>

            {quote.discount_amount > 0 && (
              <div className="flex justify-between py-1 text-red-600 font-semibold">
                <span>{languageMode === 'bn' ? 'বিশেষ ছাড় (Special Discount):' : 'Negotiated Discount:'}</span>
                <span className="font-mono">- ৳ {formatBDT(quote.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between py-1 text-slate-600">
              <span>{languageMode === 'bn' ? `ভ্যাট / মূসক (${quote.vat_rate}%):` : `NBR VAT (${quote.vat_rate}%):`}</span>
              <span className="font-mono">+ ৳ {formatBDT(quote.vat_amount)}</span>
            </div>

            <div className="flex justify-between py-2 border-t-2 border-slate-900 font-black text-sm text-slate-900">
              <span>{languageMode === 'bn' ? 'সর্বমোট মূল্য (Grand Total):' : 'Grand Total (BDT):'}</span>
              <span className="font-mono text-base text-blue-700">৳ {formatBDT(quote.grand_total)}</span>
            </div>

            <div className="text-[11px] text-slate-500 pt-1 italic">
              {languageMode === 'bn'
                ? `কথায়: ${quote.grand_total} টাকা মাত্র।`
                : `In Words: Bangladeshi Taka ${formatBDT(quote.grand_total)} Only.`}
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="grid grid-cols-2 gap-12 mt-16 pt-6 border-t border-dashed border-slate-300 text-xs">
          <div className="text-center space-y-1">
            <div className="font-bold text-slate-900">{quote.salesperson_name}</div>
            <div className="text-[11px] text-slate-500">
              {languageMode === 'bn' ? 'প্রস্তুতকারক (বিক্রয় বিভাগ)' : 'Prepared By (Sales Dept)'}
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-bold text-slate-900">Authorized Signatory</div>
            <div className="text-[11px] text-slate-500">
              {languageMode === 'bn' ? 'অনুমোদনকারী কর্মকর্তা ও সিল' : `For ${company?.name || 'Authorized Signatory'}`}
            </div>
          </div>
        </div>
      </div>

      {/* Non-print Activity Timeline */}
      <div className="print:hidden">
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-purple-600" />
              Quotation Activity & Negotiation Timeline
            </CardTitle>
            <CardDescription className="text-xs">
              Audit log of creation, customer dispatches, viewed previews, and order conversions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3">
            {activities.map((act) => (
              <div key={act.id} className="flex items-start gap-3 text-xs">
                <div className="h-2 w-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold capitalize text-slate-900 dark:text-white">
                      {act.action}
                    </span>
                    <span className="text-slate-400 font-mono text-[11px]">{act.created_at}</span>
                  </div>
                  {act.details && <p className="text-slate-600 dark:text-slate-300 mt-0.5">{act.details}</p>}
                  <div className="text-[11px] text-slate-400 mt-0.5">By {act.actor_name}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* MODAL: NEGOTIATION MARGIN ANALYZER (Shielded from customer) */}
      <ModalDialog
        open={isNegotiationOpen}
        onOpenChange={setIsNegotiationOpen}
        title="Negotiation Margin Analyzer (Internal Only)"
        description="Simulate concession discounts and inspect impact on gross profit margin before committing."
      >
        <form onSubmit={handleApplyNegotiation} className="space-y-4 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">List Subtotal:</span>
              <strong className="font-mono">৳ {formatBDT(quote.subtotal)}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Internal Base Cost (Shielded):</span>
              <strong className="font-mono text-amber-400">৳ {formatBDT(quote.total_cost)}</strong>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-1.5">
              <span className="text-slate-400">Projected Gross Margin:</span>
              <strong
                className={`font-mono text-sm ${
                  Math.round(
                    ((quote.subtotal - negotiatedDiscount - quote.total_cost) /
                      (quote.subtotal - negotiatedDiscount || 1)) *
                      100
                  ) > 35
                    ? 'text-emerald-400'
                    : 'text-red-400'
                }`}
              >
                {Math.round(
                  ((quote.subtotal - negotiatedDiscount - quote.total_cost) /
                    (quote.subtotal - negotiatedDiscount || 1)) *
                    100
                )}
                %
              </strong>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="negDisc" required>Concession Discount Amount (৳ BDT)</Label>
            <Input
              id="negDisc"
              type="number"
              value={negotiatedDiscount}
              onChange={(e) => setNegotiatedDiscount(Math.max(0, Number(e.target.value)))}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="negReason">Customer Negotiation Remarks</Label>
            <Input
              id="negReason"
              placeholder="e.g. Client requested ৳ 2,500 concession for bulk order commitment."
              value={negotiatedNotes}
              onChange={(e) => setNegotiatedNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNegotiationOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
              Apply Concession & Update
            </Button>
          </div>
        </form>
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}
