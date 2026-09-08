'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
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
import { STORAGE_KEYS } from '@/lib/db/data-store'

interface BillingDetailPageProps {
  params: Promise<{ tenantSlug: string; id: string }>
}

export default function InvoiceCockpitPage({ params }: BillingDetailPageProps) {
  const resolvedParams = use(params)
  const invId = resolvedParams.id
  const { company } = useTenant()
  const { locale } = useI18n()
  const slug = company?.slug || 'my-company'

  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const invoice = invoices.find((i: InvoiceRecord) => i.id === invId || i.invoice_number === invId)
  const [docMode, setDocMode] = useState<InvoiceType>(invoice?.invoice_type || 'sales_invoice')

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
    <div className="space-y-6 max-w-5xl print:max-w-none print:m-0 print:p-0">
      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-3">
        <Link
          href={`/${slug}/billing`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Billing Hub
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

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => window.print()}
              className="bg-slate-900 hover:bg-slate-800 text-xs text-white"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          DOCUMENT PRESENTATION CONTAINER (Printable)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-950 p-6 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs print:border-none print:shadow-none print:p-0">
        {/* MODE 1: NBR MUSHAK 6.3 VAT INVOICE */}
        {docMode === 'vat_invoice' && (
          <div className="space-y-6 text-xs text-slate-900 dark:text-white">
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
                <div className="font-black text-sm">{company?.name || 'Padma Digital Printing & Signage'}</div>
                <div>ঠিকানা: 42/1 Motijheel C/A, Dhaka-1000</div>
                <div className="font-mono font-bold text-purple-800 dark:text-purple-300">
                  বিক্রেতার মূসক নিবন্ধন / BIN: <strong>1234567890123</strong>
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
                <h1 className="text-xl font-black tracking-tight">{company?.name || 'Padma Digital Printing & Signage'}</h1>
                <p className="text-slate-500 mt-1">42/1 Motijheel C/A, Dhaka-1000 • Phone: +8801712000000</p>
                <p className="text-slate-400">Email: billing@padmadigital.com.bd</p>
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
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT ({invoice.vat_percentage}%):</span>
                    <span>৳ {formatBDT(invoice.vat_amount)}</span>
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
              <h1 className="text-xl font-black">{company?.name || 'Padma Digital Printing & Signage'}</h1>
              <div className="text-slate-500">42/1 Motijheel C/A, Dhaka-1000 • Phone: +8801712000000</div>
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 font-black text-sm tracking-wider uppercase">
                Official Money Receipt (মানি রিসিট)
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="flex justify-between items-center font-mono">
              <div>Receipt No: <strong className="text-emerald-700 dark:text-emerald-400 text-sm">MR-2024-001</strong></div>
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
                <strong className="uppercase">Bank Transfer / Cheque / bKash</strong>
              </div>
            </div>

            {/* Cash Box */}
            <div className="flex justify-between items-center pt-4">
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 font-mono">
                <span className="text-[10px] text-slate-500 block">Total Amount Paid</span>
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
                    <span className="font-mono font-bold text-emerald-600">{p.payment_id}</span>
                    <div className="text-[10px] text-slate-400">{p.created_at}</div>
                  </div>
                  <div className="text-right font-mono font-bold text-sm">
                    ৳ {formatBDT(p.allocated_amount)}
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
    </div>
  )
}
