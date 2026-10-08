'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
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
 Copy,
 Phone,
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
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { getInvoiceByIdAction, getInvoicesAction, sendInvoiceAction, sendPaymentReminderAction } from '@/actions/billing.actions'
import { generateInvoiceTextMessage } from '@/lib/billing-utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import { PdfActionButtons } from '@/components/pdf/pdf-action-buttons'
import { InvoicePdfDocument } from '@/components/pdf/documents/invoice-pdf-document'
import { useDocumentTemplate } from '@/hooks/use-document-template'
import { PrintLetterheadArt } from '@/components/settings/document-template/print-letterhead-art'

export default function InvoiceCockpitPage() {
 const params = useParams()
 const pathname = usePathname()
 const invId = (params?.id as string) || ''
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
 const companyId = company?.id || 'comp-default'
 const { template: docTemplate } = useDocumentTemplate(slug, 'invoice')

 const [isMounted, setIsMounted] = useState(false)
 const [invoice, setInvoice] = useState<InvoiceRecord | null>(null)
 const [isLoading, setIsLoading] = useState(true)
 const [docMode, setDocMode] = useState<InvoiceType>('sales_invoice')
 const [isRecordPayOpen, setIsRecordPayOpen] = useState(false)
 const [notification, setNotification] = useState<string | null>(null)

 useEffect(() => {
 setIsMounted(true)
  }, [])

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
 setInvoice(null)
    } catch {
 setInvoice(null)
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

 const handleCopyWhatsAppText = () => {
 if (!invoice) return
 const text = generateInvoiceTextMessage(invoice, company?.name, {
 bkash: company?.phone,
 nagad: company?.phone,
 bank: 'Dutch-Bangla Bank / City Bank',
    })
 navigator.clipboard.writeText(text)
 showNotification('Invoice summary copied for WhatsApp / SMS!')
  }

 if (!isMounted || isLoading) {
 return (
      <div className="space-y-6">
        <div className="p-12 text-center text-sm font-semibold text-muted-foreground">
 Loading invoice details...
        </div>
      </div>
    )
  }

 if (!invoice) {
 return (
      <div className="space-y-6">
        <Link
 href={getTenantNavHref('/billing', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5"/>
 Back to Invoices & Billing
        </Link>
        <Card className="p-12 text-center space-y-3">
          <div className="text-base font-bold text-foreground">Invoice Not Found</div>
          <p className="text-xs text-muted-foreground">
 The requested invoice could not be found or has been removed.
          </p>
          <div>
            <Link
 href={getTenantNavHref('/billing', pathname, slug)}
 className="inline-flex items-center text-xs font-bold text-primary hover:underline">
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
    <div className="space-y-6 print:max-w-none print:m-0 print:p-0 pb-12">
      {/* Notification */}
      {notification && (
        <div className="print:hidden p-3 bg-success-surface text-success rounded-xl text-xs font-semibold flex items-center gap-2 border border-success-border bg-success-surface text-success border-success-border animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Non-Print Action Bar */}
      <div className="print:hidden space-y-3">
        <Link
 href={getTenantNavHref('/billing', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5"/>
 Back to Billing & Collections Hub
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* Document Mode Toggle */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
              <button
 onClick={() => setDocMode('sales_invoice')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
 docMode === 'sales_invoice'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
 Sales Invoice
              </button>
              <button
 onClick={() => setDocMode('vat_invoice')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
 docMode === 'vat_invoice'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
 NBR মূসক ৬.৩ (VAT)
              </button>
              <button
 onClick={() => setDocMode('payment_receipt')}
 className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
 docMode === 'payment_receipt'
                    ? 'bg-success text-white shadow-xs'
                    : 'text-muted-foreground'
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
 size="sm"onClick={() => setIsRecordPayOpen(true)}
 className="bg-success hover:bg-success text-xs text-white font-bold gap-1 h-9">
                  <DollarSign className="h-3.5 w-3.5"/>
 Collect Due (MR)
                </Button>

                <Button
 size="sm"variant="outline"onClick={handleSendReminder}
 className="h-9 text-xs font-bold text-warning border-warning-border hover:bg-warning-surface dark:hover:bg-warning-surface">
                  <MessageSquare className="mr-1.5 h-3.5 w-3.5 text-warning"/>
 Remind on WhatsApp
                </Button>
              </>
            )}

            <Button
 size="sm"variant="outline"onClick={handleCopyWhatsAppText}
 className="h-9 text-xs font-semibold text-foreground border-input hover:bg-muted dark:hover:bg-muted"title="Copy formatted invoice message for WhatsApp/SMS">
              <Copy className="mr-1.5 h-3.5 w-3.5 text-muted-foreground"/>
 Copy Text
            </Button>

            <Button
 size="sm"variant="outline"onClick={() => handleQuickSend('whatsapp')}
 className="h-9 text-xs font-semibold text-success border-success-border hover:bg-success-surface">
              <Send className="mr-1.5 h-3.5 w-3.5 text-success"/>
 WhatsApp
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="h-9 text-xs font-semibold text-foreground border-input hover:bg-muted"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              Print
            </Button>

            <PdfActionButtons
              document={
                <InvoicePdfDocument
                  invoice={invoice}
                  template={docTemplate}
 company={{
 name: company?.name,
 tagline: (company as any)?.tagline || (company as any)?.legal_name || 'Printing & Packaging Solutions',
 address: company?.address,
 phone: company?.phone,
 email: company?.email,
 website: company?.website,
 binNumber: (company as any)?.bin_no || (company as any)?.bin_number,
                  }}
                />
              }
 filename={`INV-${invoice.invoice_number}`}
 title={`Invoice #${invoice.invoice_number}`}
            />
          </div>
        </div>
      </div>

      {/* Operational Traceability Flow (Quotation -> Sales Order -> Job Order -> Production -> Delivery -> Invoice -> Payment) */}
      <div className="print:hidden">
        <Card className="p-4 border-border bg-card">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
 Commercial & Operational Lifecycle Traceability
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
            <div className="p-2.5 rounded-lg border border-border bg-muted">
              <span className="text-xs text-muted-foreground block font-semibold">1. Quotation</span>
              <strong className="tabular-nums font-bold text-foreground">
                {invoice.notes?.includes('QUO-') ? 'Linked' : 'Direct'}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted">
              <span className="text-xs text-muted-foreground block font-semibold">2. Sales Order</span>
              <strong className="tabular-nums font-bold text-primary">
                {invoice.order_number || 'SO-Direct'}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted">
              <span className="text-xs text-muted-foreground block font-semibold">3. Job Order</span>
              <strong className="tabular-nums font-bold text-foreground">
 Job-{invoice.invoice_number.replace('INV-', '')}
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted">
              <span className="text-xs text-muted-foreground block font-semibold">4. Production</span>
              <strong className="font-bold text-success flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3"/> Ready / Done
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border border-border bg-muted">
              <span className="text-xs text-muted-foreground block font-semibold">5. Delivery</span>
              <strong className="font-bold text-foreground flex items-center gap-1">
                <Truck className="h-3 w-3"/> Dispatched
              </strong>
            </div>

            <div className="p-2.5 rounded-lg border-2 border-primary/20 bg-primary/10 bg-primary/10">
              <span className="text-xs text-primary text-primary block font-bold">6. Invoice</span>
              <strong className="tabular-nums font-black text-primary text-primary">
                {invoice.invoice_number}
              </strong>
            </div>

            <div className={`p-2.5 rounded-lg border ${invoice.due_amount === 0 ? 'border-success-border bg-success-surface bg-success-surface' : 'border-warning-border bg-warning-surface bg-warning-surface'}`}>
              <span className="text-xs text-muted-foreground block font-semibold">7. Payment</span>
              <strong className={`font-bold ${invoice.due_amount === 0 ? 'text-success text-success' : 'text-warning text-warning'}`}>
                {invoice.due_amount === 0 ? 'Fully Settled' : `Due ${formatBDT(invoice.due_amount)}`}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      {/* =========================================================================
 DOCUMENT PRESENTATION CONTAINER (Printable)
         ========================================================================= */}
      <div
        id="invoice-print-area"
        style={
          docTemplate?.use_letterhead
            ? {
                paddingTop: `${docTemplate.padding_top || 42}mm`,
                paddingRight: `${docTemplate.padding_right || 10}mm`,
                paddingBottom: `${docTemplate.padding_bottom || 25}mm`,
                paddingLeft: `${docTemplate.padding_left || 10}mm`,
              }
            : undefined
        }
        className="relative bg-card text-foreground print:bg-white print:text-foreground p-6 sm:p-10 rounded-xl border border-border shadow-xs print:border-none print:shadow-none print:p-0 print:w-full overflow-hidden"
      >
        {docTemplate?.use_letterhead && (
          docTemplate.letterhead_file?.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={docTemplate.letterhead_file.url}
              alt="Letterhead"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
            />
          ) : (
            <PrintLetterheadArt
              documentTypeTitleEn="INVOICE"
              documentTypeTitleBn="চালান ও বিল"
              companyName={company?.name || 'PrintFlow'}
              phone={company?.phone || undefined}
              email={company?.email || undefined}
              address={company?.address || undefined}
              mode={docTemplate.letterhead_mode}
            />
          )
        )}
        <div className="relative z-10 space-y-6">
        {/* MODE 1: NBR MUSHAK 6.3 VAT TAX INVOICE (মূসক-৬.৩ কর চালানপত্র) */}
        {docMode === 'vat_invoice' && (
          <div className="space-y-6 text-xs text-foreground print:text-foreground">
            {/* Header: Government of Bangladesh */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-border">
              <div className="font-bold text-sm">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার, জাতীয় রাজস্ব বোর্ড</div>
              <div className="text-lg font-black tracking-wide">কর চালানপত্র</div>
              <div className="text-xs text-muted-foreground">
                [বিধি ৪০ এর উপ-বিধি (১) এর দফা (গ) ও দফা (চ) দ্রষ্টব্য]
              </div>
              <div className="text-sm font-bold mt-1 text-primary text-primary">
                মূসক-৬.৩
              </div>
            </div>

            {/* Seller & Buyer Meta */}
            <div className="grid grid-cols-2 gap-6 p-4 rounded-xl bg-primary/10/40 bg-primary/10 border border-primary/20 border-border">
              <div className="space-y-1">
                <div className="font-bold text-foreground">নিবন্ধিত ব্যক্তির নাম (Seller):</div>
                <div className="font-black text-sm">{company?.name || 'PrintFlow Printing Enterprise'}</div>
                {company?.address ? <div>ঠিকানা: {company.address}</div> : null}
                <div className="tabular-nums font-bold text-primary text-primary">
                  বিক্রেতার মূসক নিবন্ধন / BIN: <strong>{company?.bin_no || '002938172-0101'}</strong>
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div>চালানপত্র নম্বর: <strong className="tabular-nums text-sm">{invoice.invoice_number}</strong></div>
                <div>ইস্যুর তারিখ: <strong className="tabular-nums">{invoice.invoice_date}</strong></div>
                <div>ক্রেতার নাম: <strong>{invoice.customer_name}</strong></div>
                <div className="tabular-nums font-bold text-primary text-primary">
                  ক্রেতার BIN/NID: <strong>{invoice.customer_bin || 'অনিবন্ধিত / Non-registered'}</strong>
                </div>
                {invoice.customer_address ? <div>গন্তব্যস্থল: {invoice.customer_address}</div> : null}
              </div>
            </div>

            {/* Mushak Table */}
            <table className="w-full text-left border-collapse border border-input">
              <thead className="bg-muted font-bold text-xs">
                <tr>
                  <th className="p-2 border border-input text-center">ক্রমিক</th>
                  <th className="p-2 border border-input">পণ্য বা সেবার বর্ণনা</th>
                  <th className="p-2 border border-input text-center">পরিমাপ / সাইজ</th>
                  <th className="p-2 border border-input text-center">পরিমাণ</th>
                  <th className="p-2 border border-input text-right">একক মূল্য (৳)</th>
                  <th className="p-2 border border-input text-right">মোট মূল্য (কর ব্যতীত ৳)</th>
                  <th className="p-2 border border-input text-right">মূসক হার (%)</th>
                  <th className="p-2 border border-input text-right">মূসকের পরিমাণ (৳)</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item: any, idx: number) => {
 const itemVat = invoice.vat_percentage > 0 ? Math.round((item.total_price * invoice.vat_percentage) / 100) : 0
 return (
                    <tr key={item.id || idx}>
                      <td className="p-2 border border-input text-center tabular-nums">{idx + 1}</td>
                      <td className="p-2 border border-input">
                        <div className="font-bold">{item.item_name || item.item_description}</div>
                        {item.description_bn && <div className="text-xs text-muted-foreground">{item.description_bn}</div>}
                        {item.material_spec && <div className="text-xs text-muted-foreground">ম্যাটেরিয়াল: {item.material_spec}</div>}
                      </td>
                      <td className="p-2 border border-input text-center tabular-nums">{item.dimensions_spec || '—'}</td>
                      <td className="p-2 border border-input text-center tabular-nums font-bold">{item.quantity} {item.unit}</td>
                      <td className="p-2 border border-input text-right tabular-nums">{formatBDT(item.unit_price)}</td>
                      <td className="p-2 border border-input text-right tabular-nums">{formatBDT(item.total_price)}</td>
                      <td className="p-2 border border-input text-right tabular-nums">{invoice.vat_percentage}%</td>
                      <td className="p-2 border border-input text-right tabular-nums font-bold">
                        {formatBDT(itemVat)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-bold">
                  <td colSpan={5} className="p-2 border border-input text-right">সর্বমোট (Total Pre-Tax):</td>
                  <td className="p-2 border border-input text-right tabular-nums">{formatBDT(invoice.subtotal - (invoice.discount_amount || 0))}</td>
                  <td className="p-2 border border-input text-right">{invoice.vat_percentage}%</td>
                  <td className="p-2 border border-input text-right tabular-nums">{formatBDT(invoice.vat_amount)}</td>
                </tr>
                <tr className="bg-primary/10 bg-primary/10 font-black text-sm">
                  <td colSpan={7} className="p-2 border border-input text-right">করসহ সর্বমোট প্রদেয় মূল্য (Grand Total Payable):</td>
                  <td className="p-2 border border-input text-right tabular-nums text-primary text-primary">
                    {formatBDT(invoice.grand_total)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* In Words */}
            <div className="p-3 bg-primary/10/60 bg-primary/10 rounded-lg border border-primary/20 text-xs font-semibold">
              <span>কথায় (In Words): </span>
              <span className="font-bold text-primary text-primary italic">
                {numberToWordsBDT(invoice.grand_total)}
              </span>
            </div>

            <div className="pt-8 flex justify-between items-end text-xs">
              <div className="text-center">
                <div className="border-t border-input w-44 pt-1">গ্রহীতার স্বাক্ষর</div>
              </div>
              <div className="text-center">
                <div className="border-t border-input w-44 pt-1 font-bold">দায়িত্বপ্রাপ্ত কর্মকর্তার স্বাক্ষর ও সিল</div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: COMMERCIAL SALES INVOICE (কমার্শিয়াল চালান ও বিল) */}
        {docMode === 'sales_invoice' && (
          <div className="space-y-6 text-xs text-foreground">
            {/* Header */}
            <div className="flex justify-between items-start pb-6 border-b border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center font-black text-base">
 P
                  </div>
                  <h1 className="text-xl font-black tracking-tight">{company?.name || 'PrintFlow Enterprise'}</h1>
                </div>
                {(company?.address || company?.phone) && (
                  <p className="text-muted-foreground">
                    {company?.address || ''}
                    {company?.address && company?.phone ? ' • ' : ''}
                    {company?.phone ? `Phone: ${company.phone}` : ''}
                  </p>
                )}
                {company?.email && <p className="text-muted-foreground">Email: {company.email}</p>}
                {company?.bin_no && <p className="text-muted-foreground tabular-nums text-xs">BIN: <strong>{company.bin_no}</strong></p>}
              </div>
              <div className="text-right space-y-1">
                <div className="text-2xl font-black tabular-nums text-primary text-primary">
                  {tBilingual('INVOICE', 'চালান')}
                </div>
                <div className="tabular-nums font-bold text-sm text-foreground">
                  {invoice.invoice_number}
                </div>
                <div className="text-muted-foreground">
                  {tBilingual('Date:', 'তারিখ:')} <strong className="text-foreground tabular-nums">{invoice.invoice_date}</strong>
                </div>
                <div className="text-destructive font-bold">
 Due Date: <span className="tabular-nums">{invoice.due_date}</span>
                </div>
                {invoice.reference_no && (
                  <div className="text-muted-foreground text-xs">
 Ref / PO No: <strong className="tabular-nums text-foreground">{invoice.reference_no}</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Bill To & Dispatch Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted border border-border">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-1">
 Billed To / গ্রাহকের বিবরণ:
                </span>
                <div className="font-bold text-sm text-foreground">{invoice.customer_name}</div>
                {invoice.customer_name_bn && <div className="text-xs text-muted-foreground">{invoice.customer_name_bn}</div>}
                {invoice.customer_company && <div className="text-xs text-muted-foreground font-semibold">{invoice.customer_company}</div>}
                <div className="text-muted-foreground tabular-nums mt-0.5">
                  {invoice.customer_phone ? (
                    <a
 href={`tel:${invoice.customer_phone}`}
 className="text-primary text-primary hover:underline inline-flex items-center gap-1 font-bold"title="Call Customer">
                      <span>📞</span>
                      <span>{invoice.customer_phone}</span>
                    </a>
                  ) : (
                    <span>📞 No phone</span>
                  )}
                </div>
                {invoice.customer_address && <div className="text-muted-foreground mt-0.5">📍 {invoice.customer_address}</div>}
                {invoice.customer_bin && <div className="text-muted-foreground tabular-nums text-xs mt-0.5">BIN: {invoice.customer_bin}</div>}
              </div>

              <div className="text-left sm:text-right space-y-1">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-1">
 Fulfillment & Delivery:
                </span>
                <div className="tabular-nums font-bold text-primary">
                  {invoice.order_number ? `Order #${invoice.order_number}` : 'Direct Contract'}
                </div>
                {invoice.delivery_date && (
                  <div className="text-muted-foreground text-xs">
 Delivery Date: <strong>{invoice.delivery_date}</strong>
                  </div>
                )}
                {invoice.delivery_method && (
                  <div className="text-muted-foreground text-xs">
 Method: <strong className="capitalize">{invoice.delivery_method.replace('_', ' ')}</strong>
                  </div>
                )}
                {isOverdue && (
                  <div className="text-xs font-bold text-destructive bg-danger-surface bg-danger-surface px-2 py-0.5 rounded inline-block">
                    ⚠️ {daysOverdue} Days Overdue
                  </div>
                )}
              </div>
            </div>

            {/* Items Table with Domain Specifications */}
            <table className="w-full text-left">
              <thead className="bg-muted font-bold text-xs text-muted-foreground border-b">
                <tr>
                  <th className="py-2.5 px-3">SL</th>
                  <th className="py-2.5 px-3">Item Description & Specifications</th>
                  <th className="py-2.5 px-3 text-center">Dimensions</th>
                  <th className="py-2.5 px-3 text-center">Qty</th>
                  <th className="py-2.5 px-3 text-right">Unit Rate</th>
                  <th className="py-2.5 px-3 text-right">Total (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {invoice.items.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-muted dark:hover:bg-muted/30">
                    <td className="py-3 px-3 text-muted-foreground tabular-nums text-center">{idx + 1}</td>
                    <td className="py-3 px-3 space-y-1">
                      <div className="font-bold text-foreground">
                        {item.item_name || item.item_description}
                      </div>
                      {docTemplate?.item_display_mode !== 'compact' && item.description_bn && (
                        <div className="text-xs text-muted-foreground">{item.description_bn}</div>
                      )}
                      {docTemplate?.item_display_mode !== 'compact' && item.material_spec && (
                        <div className="text-xs text-muted-foreground font-medium">
                          • Substrate: {item.material_spec}
                        </div>
                      )}

                      {/* Offset Specs */}
                      {docTemplate?.item_display_mode !== 'compact' && item.offset_specs && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                          {item.offset_specs.paper_gsm && <span className="bg-muted px-1.5 py-0.5 rounded">GSM: {item.offset_specs.paper_gsm}</span>}
                          {item.offset_specs.color_mode && <span className="bg-muted px-1.5 py-0.5 rounded">Color: {item.offset_specs.color_mode}</span>}
                          {item.offset_specs.binding_type && <span className="bg-muted px-1.5 py-0.5 rounded">Binding: {item.offset_specs.binding_type}</span>}
                          {item.offset_specs.numbering_range && <span className="bg-muted px-1.5 py-0.5 rounded">No: {item.offset_specs.numbering_range}</span>}
                        </div>
                      )}

                      {/* 3D Signage Specs */}
                      {docTemplate?.item_display_mode !== 'compact' && item.signage_specs && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
                          {item.signage_specs.letter_height_inch && <span className="bg-muted px-1.5 py-0.5 rounded">Height: {item.signage_specs.letter_height_inch}&quot;</span>}
                          {item.signage_specs.led_module_type && <span className="bg-muted px-1.5 py-0.5 rounded">LED: {item.signage_specs.led_module_type}</span>}
                          {item.signage_specs.frame_structure && <span className="bg-muted px-1.5 py-0.5 rounded">Frame: {item.signage_specs.frame_structure}</span>}
                        </div>
                      )}

                      {item.finishing && item.finishing !== 'None' && (
                        <div className="text-xs text-primary text-primary font-semibold">
                          ✨ Finishing: {item.finishing}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums text-muted-foreground">{item.dimensions_spec || '—'}</td>
                    <td className="py-3 px-3 text-center tabular-nums font-bold text-foreground">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatBDT(item.unit_price)}</td>
                    <td className="py-3 px-3 text-right tabular-nums font-bold text-foreground">
                      {formatBDT(item.total_price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* In Words & Financial Settlement HUD */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 pt-4 border-t border-border items-start">
              {/* Left Column: In Words & Remittance Accounts */}
              <div className="sm:col-span-7 space-y-3">
                <div className="p-3 bg-muted rounded-xl border border-border text-xs">
                  <span className="text-xs uppercase font-bold text-muted-foreground block mb-0.5">টাকায় ও কথায় (In Words):</span>
                  <div className="font-bold text-foreground italic">
                    {numberToWordsBDT(invoice.grand_total)}
                  </div>
                </div>

                {/* Company Payment Remittance Details */}
                <div className="p-3 bg-primary/10/50 bg-primary/10 rounded-xl border border-primary/20 border-border/50 space-y-1.5 text-xs">
                  <div className="font-bold text-primary text-primary flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-primary"/>
                    <span>{tBilingual('Official Payment:', 'মূল্য পরিশোধের তথ্য:')}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground tabular-nums">
                    <div>
                      <span>bKash Merchant:</span> <strong>{company?.phone || '01700-000000'}</strong> (Make Payment)
                    </div>
                    <div>
                      <span>Nagad Wallet:</span> <strong>{company?.phone || '01800-000000'}</strong> (Send Money/Merchant)
                    </div>
                    <div className="col-span-2">
                      <span>Bank Transfer:</span> <strong>Dutch-Bangla Bank / City Bank</strong> (A/C: {company?.name || 'PrintFlow Enterprise'})
                    </div>
                  </div>
                  {invoice.payment_method_note && (
                    <div className="text-xs text-primary text-primary pt-1 border-t border-primary/20/60 font-medium">
 Note: {invoice.payment_method_note}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Financial Totals */}
              <div className="sm:col-span-5 space-y-1.5 tabular-nums text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>{tBilingual('Subtotal:', 'মোট বিল:')}</span>
                  <span>{formatBDT(invoice.subtotal)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-warning font-medium">
                    <span>{tBilingual('Discount:', 'ছাড়:')}</span>
                    <span>- {formatBDT(invoice.discount_amount)}</span>
                  </div>
                )}
                {invoice.vat_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>{tBilingual(`NBR VAT (${invoice.vat_percentage}%):`, `এনবিআর ভ্যাট (${invoice.vat_percentage}%):`)}</span>
                    <span>+ {formatBDT(invoice.vat_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-foreground pt-1.5 border-t">
                  <span>{tBilingual('Grand Total:', 'সর্বমোট বিল:')}</span>
                  <span>{formatBDT(invoice.grand_total)}</span>
                </div>
                <div className="flex justify-between text-primary text-primary font-bold">
                  <span>{tBilingual('Advance / Paid:', 'অগ্রিম পরিশোধ:')}</span>
                  <span>{formatBDT(invoice.paid_amount)}</span>
                </div>
                {invoice.write_off_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground line-through">
                    <span>{tBilingual('Waiver / Adjustment:', 'ছাড় / সমন্বয়:')}</span>
                    <span>{formatBDT(invoice.write_off_amount)}</span>
                  </div>
                )}
                <div className={cn(
                  'flex justify-between font-black text-sm pt-1.5 border-t',
 invoice.due_amount > 0 ? 'text-destructive text-destructive' : 'text-success text-success'
                )}>
                  <span>{tBilingual('Due Balance:', 'বকেয়া বিল:')}</span>
                  <span>{formatBDT(invoice.due_amount)}</span>
                </div>
              </div>
            </div>

            {/* Terms & Signatures */}
            {(invoice.terms_and_conditions || docTemplate?.terms_and_conditions) && (
              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <strong>{tBilingual('Terms & Conditions: ', 'শর্তাবলী ও নির্দেশিকা: ')}</strong> {invoice.terms_and_conditions || docTemplate?.terms_and_conditions}
              </div>
            )}

            <div className="pt-10 flex justify-between items-end text-xs text-muted-foreground">
              <div className="text-center">
                <div className="border-t border-input w-44 pt-1 font-semibold">
                  {tBilingual('Customer Signature', 'গ্রাহকের স্বাক্ষর')}
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-input w-44 pt-1 font-bold text-foreground">
 Authorized Signatory & Seal
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: OFFICIAL PAYMENT MONEY RECEIPT (মানি রিসিট - MR) */}
        {docMode === 'payment_receipt' && (
          <div className="space-y-6 text-xs text-foreground">
            {/* Header */}
            <div className="text-center space-y-1 pb-4 border-b-2 border-success-border">
              <h1 className="text-xl font-black">{company?.name || 'Printing & Signage Solutions'}</h1>
              {(company?.address || company?.phone) && (
                <div className="text-muted-foreground">
                  {company?.address || ''}
                  {company?.address && company?.phone ? ' • ' : ''}
                  {company?.phone ? `Phone: ${company.phone}` : ''}
                </div>
              )}
              <div className="inline-block mt-2 px-4 py-1 rounded-full bg-success-surface text-success font-black text-sm tracking-wider uppercase">
                {tBilingual('Official Money Receipt', 'অফিসিয়াল মানি রিসিট')}
              </div>
            </div>

            {/* Receipt Meta */}
            <div className="flex justify-between items-center tabular-nums">
              <div>Receipt Ref: <strong className="text-success text-success text-sm">MR-{invoice.invoice_number.replace('INV-', '')}</strong></div>
              <div>Date: <strong>{invoice.invoice_date}</strong></div>
            </div>

            <div className="p-4 rounded-xl border border-border space-y-3">
              <div className="flex">
                <span className="text-muted-foreground w-44 shrink-0">Received with thanks from:</span>
                <strong className="text-sm font-bold">{invoice.customer_name}</strong>
              </div>

              <div className="flex">
                <span className="text-muted-foreground w-44 shrink-0">The sum of Taka (in words):</span>
                <span className="font-bold text-success text-success italic">
                  {numberToWordsBDT(invoice.paid_amount || invoice.grand_total)}
                </span>
              </div>

              <div className="flex">
                <span className="text-muted-foreground w-44 shrink-0">On account of:</span>
                <span>Settlement of Invoice <strong>{invoice.invoice_number}</strong> ({invoice.notes || 'Printing & Fabrication'})</span>
              </div>

              <div className="flex">
                <span className="text-muted-foreground w-44 shrink-0">Payment Mode:</span>
                <strong className="uppercase">Cash / Bank / MFS / Cheque</strong>
              </div>
            </div>

            {/* Cash Box */}
            <div className="flex justify-between items-center pt-4">
              <div className="p-3 rounded-lg bg-success-surface bg-success-surface border border-success-border tabular-nums">
                <span className="text-xs text-muted-foreground block">Total Amount Collected</span>
                <div className="text-xl font-black text-success text-success">
                  {formatBDT(invoice.paid_amount || invoice.grand_total)}
                </div>
              </div>

              <div className="text-center pt-8">
                <div className="border-t border-input w-48 pt-1 font-bold">Authorized Signatory & Seal</div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Non-Print: Payment Allocations & Non-Destructive Write-Off Logs */}
      <div className="print:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Payment Allocations */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-success"/>
 Allocated Payments on this Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {invoice.payments && invoice.payments.length > 0 ? (
 invoice.payments.map((p: any) => (
                <div key={p.id} className="p-3 rounded-lg border border-border bg-muted flex justify-between items-center">
                  <div>
                    <span className="tabular-nums font-bold text-success">{p.payment_id || p.id}</span>
                    <div className="text-xs text-muted-foreground">{p.created_at || p.payment_date}</div>
                  </div>
                  <div className="text-right tabular-nums font-bold text-sm">
                    {formatBDT(p.allocated_amount || p.amount)}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-muted-foreground">No payment records applied to this invoice.</div>
            )}
          </CardContent>
        </Card>

        {/* Financial Write-Off & Adjustment Audit History */}
        <Card>
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary"/>
 Write-Off & Adjustment Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2 text-xs">
            {invoice.write_offs && invoice.write_offs.length > 0 ? (
 invoice.write_offs.map((wo: any) => (
                <div key={wo.id} className="p-3 rounded-lg border border-danger-border border-danger-border bg-danger-surface/30 bg-danger-surface space-y-1">
                  <div className="flex justify-between font-bold">
                    <span className="text-destructive tabular-nums">Waiver: {formatBDT(wo.amount)}</span>
                    <span className="text-muted-foreground text-xs">{wo.created_at}</span>
                  </div>
                  <div className="text-foreground font-medium">
 Reason: {wo.reason}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
 Authorized By: {wo.authorized_by_name}
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-muted-foreground">No financial adjustments or write-offs logged.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
 open={isRecordPayOpen}
 onOpenChange={setIsRecordPayOpen}
 preselectedInvoiceId={invoice.id}
 preselectedCustomerId={invoice.customer_id || undefined}
 onPaymentRecorded={() => {
 showNotification('Payment recorded & invoice updated successfully!')
 loadInvoice()
        }}
      />
    </div>
  )
}
