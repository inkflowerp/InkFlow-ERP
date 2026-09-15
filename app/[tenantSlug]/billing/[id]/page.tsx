'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Receipt,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Building,
  CreditCard,
  FileCheck2,
  TrendingDown,
  ShieldCheck,
  AlertOctagon,
  FileText,
  BadgePercent,
  Sparkles,
  Send,
  MessageSquare,
  Mail,
  Truck,
  Layers,
  FileSpreadsheet,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  calculateDaysOverdue,
  numberToWordsBDT,
  formatBDT,
} from '@/lib/formatters'
import { InvoiceRecord, InvoiceType } from '@/types/billing.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { getInvoiceByIdAction, getInvoicesAction, sendInvoiceAction, sendPaymentReminderAction } from '@/actions/billing.actions'

export default function InvoiceCockpitPage() {
  const params = useParams()
  const invId = (params?.id as string) || ''
  const { company } = useTenant()
  const { locale } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id || 'comp-default'

  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [docMode, setDocMode] = useState<InvoiceType>('sales_invoice')
  const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const loadInvoice = useCallback(async () => {
    if (!invId) return
    setIsLoading(true)
    try {
      const directRes = await getInvoiceByIdAction(invId, companyId)
      if (directRes.success && directRes.data) {
        setInvoice(directRes.data)
        setDocMode(directRes.data.invoice_type || 'sales_invoice')
        return
      }

      const res = await getInvoicesAction(undefined, companyId)
      if (res.success && res.data) {
        const found = res.data.find((i: InvoiceRecord) => i.id === invId || i.invoice_number === invId)
        if (found) {
          setInvoice(found)
          setDocMode(found.invoice_type || 'sales_invoice')
          return
        }
      }
      // Local fallback
      const local = PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES) || []
      const foundLocal = local.find((i: InvoiceRecord) => i.id === invId || i.invoice_number === invId)
      if (foundLocal) {
        setInvoice(foundLocal)
        setDocMode(foundLocal.invoice_type || 'sales_invoice')
      }
    } catch {
      const local = PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES) || []
      const foundLocal = local.find((i: InvoiceRecord) => i.id === invId || i.invoice_number === invId)
      if (foundLocal) {
        setInvoice(foundLocal)
        setDocMode(foundLocal.invoice_type || 'sales_invoice')
      }
    } finally {
      setIsLoading(false)
    }
  }, [invId, companyId])

  useEffect(() => {
    loadInvoice()
  }, [loadInvoice])

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const handleQuickSend = async (channel: 'whatsapp' | 'email') => {
    if (!invoice) return
    showNotification(`Dispatching ${channel.toUpperCase()} message...`)
    const res = await sendInvoiceAction({ invoiceId: invoice.id, channel, format: 'pdf' }, companyId)
    if (res.success) {
      showNotification(`Invoice dispatched via ${channel.toUpperCase()} successfully!`)
      if (channel === 'whatsapp' && res.data?.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank')
      }
    } else {
      showNotification(`Failed to send via ${channel.toUpperCase()}: ${res.error}`)
    }
  }

  const handleSendReminder = async () => {
    if (!invoice) return
    showNotification('Dispatching WhatsApp payment reminder...')
    const res = await sendPaymentReminderAction(invoice.id, 'whatsapp', companyId)
    if (res.success) {
      showNotification('Payment reminder dispatched to customer via WhatsApp!')
      if (res.data?.whatsappUrl) {
        window.open(res.data.whatsappUrl, '_blank')
      }
    } else {
      showNotification(`Reminder error: ${res.error}`)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div className="p-12 text-center text-sm font-semibold text-slate-500">
          Loading invoice details...
        </div>
      </div>
    )
  }

  if (!invoice) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Link
          href={`/${slug}/billing`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Invoices & Billing
        </Link>
        <Card className="p-12 text-center space-y-3">
          <div className="text-base font-bold text-slate-900 dark:text-white">Invoice Not Found</div>
          <p className="text-xs text-slate-500">
            The requested invoice could not be found or has been removed.
          </p>
          <div>
            <Link
              href={`/${slug}/billing`}
              className="inline-flex items-center text-xs font-bold text-blue-600 hover:underline"
            >
              Return to Invoices &rarr;
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const daysOverdue = calculateDaysOverdue(invoice.due_date)
  const isOverdue = invoice.due_amount > 0 && daysOverdue > 0

  return (
    <div className="space-y-6 max-w-5xl print:max-w-none print:m-0 print:p-0 pb-12">
      {/* Notification */}
      {notification && (
        <div className="print:hidden p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-3">
        <Link
          href={`/${slug}/billing`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Billing & Collections Hub
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Document Mode Toggle */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setDocMode('sales_invoice')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docMode === 'sales_invoice'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Sales Invoice
              </button>
              <button
                onClick={() => setDocMode('vat_invoice')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docMode === 'vat_invoice'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                NBR মূসক ৬.৩ (VAT)
              </button>
              <button
                onClick={() => setDocMode('payment_receipt')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  docMode === 'payment_receipt'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                মানি রিসিট (Receipt)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {invoice.due_amount > 0 && (
              <>
                <Button
                  size="sm"
                  onClick={() => setIsRecordPayOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-bold gap-1 h-9"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Receive Payment (MR)
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSendReminder}
                  className="h-9 text-xs font-bold text-amber-700 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                  Remind on WhatsApp
                </Button>
              </>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSend('whatsapp')}
              className="h-9 text-xs font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            >
              <Send className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
              WhatsApp
            </Button>

            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-xs text-white h-9 font-bold"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Operational Traceability Flow (Quotation -> Sales Order -> Job Order -> Production -> Delivery -> Invoice -> Payment) */}
      <div className="print:hidden">
        <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            Commercial & Operational Lifecycle Traceability
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400 block font-semibold">1. Quotation</span>
              <strong className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {invoice.notes?.includes('QUO-') ? 'Linked' : 'Direct'}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400 block font-semibold">2. Sales Order</span>
              <strong className="font-mono font-bold text-blue-600">
                {invoice.order_number || 'SO-Direct'}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400 block font-semibold">3. Job Order</span>
              <strong className="font-mono font-bold text-slate-700 dark:text-slate-300">
                Job-{invoice.invoice_number.replace('INV-', '')}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400 block font-semibold">4. Production</span>
              <strong className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready / Done
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40">
              <span className="text-[10px] text-slate-400 block font-semibold">5. Delivery</span>
              <strong className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Truck className="h-3 w-3" /> Dispatched
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
              <span className="text-[10px] text-blue-600 dark:text-blue-400 block font-bold">6. Invoice</span>
              <strong className="font-mono font-black text-blue-700 dark:text-blue-300">
                {invoice.invoice_number}
              </strong>
            </div>

            <div className={`p-2.5 rounded-lg border ${invoice.due_amount === 0 ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'}`}>
              <span className="text-[10px] text-slate-500 block font-semibold">7. Payment</span>
              <strong className={`font-bold ${invoice.due_amount === 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {invoice.due_amount === 0 ? 'Fully Settled' : `Due ৳${formatBDT(invoice.due_amount)}`}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
          DOCUMENT PRESENTATION CONTAINER (Printable)
         ========================================================================= */}
      <div className="bg-white text-slate-900 dark:bg-slate-950 dark:text-white print:bg-white print:text-slate-900 print:dark:bg-white print:dark:text-slate-900 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0 print:w-full">
        {/* MODE 1: NBR MUSHAK 6.3 VAT INVOICE */}
        {docMode === 'vat_invoice' && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white print:text-slate-900">
            {/* Header: Government of Bangladesh */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-slate-900 dark:border-slate-100">
              <div className="font-bold text-sm">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড</div>
              <div className="text-lg font-black tracking-wide">কর চালানপত্র</div>
              <div className="text-[11px] text-slate-500">
                [বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) ও দফা (চ) দ্রষ্টব্য]
              </div>
              <div className="text-sm font-bold mt-1 text-purple-700 dark:text-purple-400">
                মূসক-৬.৩
              </div>
            </div>

            {/* Seller & Buyer Meta */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
              <div className="space-y-1">
                <div className="font-bold text-slate-700 dark:text-slate-300">নিবন্ধিত ব্যক্তির নাম (Seller):</div>
                <div className="font-black text-sm">{company?.name || 'InkFlow Printing Enterprise'}</div>
                <div>ঠিকানা: {company?.address || 'Bangladesh'}</div>
                <div className="font-mono font-bold text-purple-800 dark:text-purple-300">
                  বিক্রেতার মূসক নিবন্ধন / BIN: <strong>{company?.bin_no || 'N/A'}</strong>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div>চালানপত্র নম্বর: <strong className="font-mono text-sm">{invoice.invoice_number}</strong></div>
                <div>ইস্যুর তারিখ ও সময়: <strong className="font-mono">{invoice.invoice_date}</strong></div>
                <div>ক্রেতার নাম: <strong>{invoice.customer_name}</strong></div>
                <div className="font-mono font-bold text-purple-800 dark:text-purple-300">
                  ক্রেতার BIN: <strong>{invoice.customer_bin || 'Non-registered'}</strong>
                </div>
                <div>গন্তব্যস্থল: {invoice.customer_address || 'Dhaka, Bangladesh'}</div>
              </div>
            </div>

            {/* Mushak Table */}
            <table className="w-full text-left border-collapse border border-slate-300 dark:border-slate-700">
              <thead className="bg-slate-100 dark:bg-slate-900 font-bold text-[11px]">
                <tr>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-center">ক্রমিক</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700">পণ্য বা সেবার বর্ণনা</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-center">পরিমাপ</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-center">পরিমাণ</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-right">একক মূল্য (৳)</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-right">মোট মূল্য (৳)</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-right">মূসক হার (%)</th>
                  <th className="p-2 border border-slate-300 dark:border-slate-700 text-right">মূসকের পরিমাণ (৳)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, idx: number) => (
                  <tr key={item.id}>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 font-bold">{item.item_description}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono">{item.dimensions_spec || 'N/A'}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-center font-mono">{item.quantity} {item.unit}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono">৳ {formatBDT(item.unit_price)}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono">৳ {formatBDT(item.total_price)}</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono">{item.vat_percentage}%</td>
                    <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono font-bold">
                      ৳ {formatBDT(Math.round((item.total_price * item.vat_percentage) / 100))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900 font-bold">
                  <td colSpan={5} className="p-2 border border-slate-300 dark:border-slate-700 text-right">সর্বমোট (Total):</td>
                  <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono">৳ {formatBDT(invoice.subtotal)}</td>
                  <td className="p-2 border border-slate-300 dark:border-slate-700 text-right">{invoice.vat_percentage}%</td>
                  <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono">৳ {formatBDT(invoice.vat_amount)}</td>
                </tr>
                <tr className="bg-purple-100 dark:bg-purple-950/40 font-black text-sm">
                  <td colSpan={7} className="p-2 border border-slate-300 dark:border-slate-700 text-right">করসহ সর্বমোট প্রদেয় মূল্য (Grand Total Payable):</td>
                  <td className="p-2 border border-slate-300 dark:border-slate-700 text-right font-mono text-purple-900 dark:text-purple-300">
                    ৳ {formatBDT(invoice.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            <div className="pt-8 flex justify-between items-end text-xs">
              <div className="text-center">
                <div className="border-t border-slate-400 w-44 pt-1">গ্রহীতার স্বাক্ষর</div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 w-44 pt-1 font-bold">দায়িত্বপ্রাপ্ত কর্মকর্তার স্বাক্ষর ও সিল</div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: COMMERCIAL SALES INVOICE */}
        {docMode === 'sales_invoice' && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h1 className="text-xl font-black tracking-tight">{company?.name || 'InkFlow Enterprise'}</h1>
                <p className="text-slate-500 mt-1">{company?.address || 'Dhaka, Bangladesh'}{company?.phone ? ` • Phone: ${company.phone}` : ''}</p>
                {company?.email && <p className="text-slate-400">Email: {company.email}</p>}
              </div>
              <div className="text-right space-y-1">
                <div className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">INVOICE</div>
                <div className="font-mono font-bold text-sm">{invoice.invoice_number}</div>
                <div className="text-slate-500">Date: <strong className="text-slate-900 dark:text-white font-mono">{invoice.invoice_date}</strong></div>
                <div className="text-red-600 font-bold">Due Date: <span className="font-mono">{invoice.due_date}</span></div>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Billed To:</span>
                <div className="font-bold text-sm text-slate-900 dark:text-white mt-1">{invoice.customer_name}</div>
                <div className="text-slate-600 dark:text-slate-300 font-mono mt-0.5">{invoice.customer_phone}</div>
                <div className="text-slate-500 mt-0.5">{invoice.customer_address}</div>
              </div>
              <div className="text-right space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Order Reference:</span>
                <div className="font-mono font-bold text-blue-600 mt-1">{invoice.order_number || 'Direct Contract'}</div>
                {isOverdue && (
                  <div className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded inline-block">
                    ⚠️ {daysOverdue} Days Overdue
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left">
              <thead className="bg-slate-100 dark:bg-slate-900 font-bold text-[11px] text-slate-600 dark:text-slate-400 border-b">
                <tr>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-center">Dimensions</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Amount (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoice.items.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">{item.item_description}</td>
                    <td className="py-3 px-3 text-center font-mono text-slate-500">{item.dimensions_spec || '—'}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold">{item.quantity} {item.unit}</td>
                    <td className="py-3 px-3 text-right font-mono">৳ {formatBDT(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ৳ {formatBDT(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <div className="w-64 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>৳ {formatBDT(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-amber-600 font-medium">
                    <span>Discount:</span>
                    <span>- ৳ {formatBDT(invoice.discount_amount)}</span>
                  </div>
                )}
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT ({invoice.vat_percentage}%):</span>
                    <span>+ ৳ {formatBDT(invoice.vat_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-900 dark:text-white pt-1 border-t">
                  <span>Grand Total:</span>
                  <span>৳ {formatBDT(invoice.grand_total)}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Paid Amount:</span>
                  <span>৳ {formatBDT(invoice.paid_amount)}</span>
                </div>
                {invoice.write_off_amount > 0 && (
                  <div className="flex justify-between text-slate-400 line-through">
                    <span>Adjustment/Waiver:</span>
                    <span>৳ {formatBDT(invoice.write_off_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-red-600 pt-1 border-t">
                  <span>Due Balance:</span>
                  <span>৳ {formatBDT(invoice.due_amount)}</span>
                </div>
              </div>
            </div>

            {/* Terms */}
            {invoice.terms_and_conditions && (
              <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-[11px] text-slate-500">
                <strong>Terms & Payment Instructions: </strong> {invoice.terms_and_conditions}
              </div>
            )}
          </div>
        )}

        {/* MODE 3: OFFICIAL PAYMENT MONEY RECEIPT (MR) */}
        {docMode === 'payment_receipt' && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white">
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-emerald-600">
              <h1 className="text-xl font-black">{company?.name || 'Printing & Signage Solutions'}</h1>
              <div className="text-slate-500">{company?.address || 'Dhaka, Bangladesh'}{company?.phone ? ` • Phone: ${company.phone}` : ''}</div>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-sm tracking-wider uppercase">
                Official Money Receipt (মানি রিসিট)
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="flex justify-between items-center font-mono">
              <div>Receipt Ref: <strong className="text-emerald-700 dark:text-emerald-400 text-sm">MR-{invoice.invoice_number.replace('INV-', '')}</strong></div>
              <div>Date: <strong>{invoice.invoice_date}</strong></div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex">
                <span className="text-slate-500 w-44 shrink-0">Received with thanks from:</span>
                <strong className="text-sm font-bold">{invoice.customer_name}</strong>
              </div>

              <div className="flex">
                <span className="text-slate-500 w-44 shrink-0">The sum of Taka (in words):</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-300 italic">
                  {numberToWordsBDT(invoice.paid_amount || invoice.grand_total)}
                </span>
              </div>

              <div className="flex">
                <span className="text-slate-500 w-44 shrink-0">On account of:</span>
                <span>Settlement of Invoice <strong>{invoice.invoice_number}</strong> ({invoice.notes || 'Printing & Fabrication'})</span>
              </div>

              <div className="flex">
                <span className="text-slate-500 w-44 shrink-0">Payment Mode:</span>
                <strong className="uppercase">Cash / Bank / MFS / Cheque</strong>
              </div>
            </div>

            {/* Cash Box */}
            <div className="flex justify-between items-center pt-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 font-mono">
                <span className="text-[10px] text-slate-500 block">Total Amount Collected</span>
                <div className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  ৳ {formatBDT(invoice.paid_amount || invoice.grand_total)}
                </div>
              </div>

              <div className="text-center pt-8">
                <div className="border-t border-slate-400 w-48 pt-1 font-bold">Authorized Signatory & Seal</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Non-Print: Payment Allocations & Non-Destructive Write-Off Logs */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Allocations */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              Allocated Payments on this Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {invoice.payments && invoice.payments.length > 0 ? (
              invoice.payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-emerald-600">{p.payment_id || p.id}</span>
                    <div className="text-[10px] text-slate-400">{p.created_at || p.payment_date}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-sm">
                    ৳ {formatBDT(p.allocated_amount || p.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400">No payment records applied to this invoice.</div>
            )}
          </CardContent>
        </Card>

        {/* Financial Write-Off & Adjustment Audit History */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Write-Off & Adjustment Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {invoice.write_offs && invoice.write_offs.length > 0 ? (
              invoice.write_offs.map((wo: any) => (
                <div key={wo.id} className="p-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20 space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-red-600 font-mono">Waiver: ৳ {formatBDT(wo.amount)}</span>
                    <span className="text-slate-400 text-[10px]">{wo.created_at}</span>
                  </div>
                  <div className="text-slate-700 dark:text-slate-300 font-medium">
                    Reason: {wo.reason}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Authorized By: {wo.authorized_by_name}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400">No financial adjustments or write-offs logged.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        open={isRecordPayOpen}
        onOpenChange={setIsRecordPayOpen}
        preselectedInvoiceId={invoice.id}
        preselectedCustomerId={invoice.customer_id}
        onPaymentRecorded={() => {
          showNotification('Payment recorded & invoice updated successfully!')
          loadInvoice()
        }}
      />
    </div>
  )
}
