'use client'

import React, { useRef } from 'react'
import { BRAND } from '@/config/brand'
import {
 Printer,
 X,
 Share2,
 Copy,
 Check,
 MessageSquare,
 Receipt,
 Download,
 Building2,
 Phone,
 Mail,
 MapPin,
 CheckCircle2,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PaymentRecord, InvoiceRecord } from '@/types/billing.types'
import { CustomerRecord } from '@/types/crm.types'
import { formatBDT, numberToWordsBDT } from '@/lib/formatters'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PdfActionButtons } from '@/components/pdf/pdf-action-buttons'
import { MoneyReceiptPdfDocument } from '@/components/pdf/documents/money-receipt-pdf-document'
import { QRCodeSVG } from '@/components/attendance/qr-code-svg'
import { useDocumentTemplate } from '@/hooks/use-document-template'
import { PrintLetterheadArt } from '@/components/settings/document-template/print-letterhead-art'

export interface MoneyReceiptModalProps {
 open: boolean
 onOpenChange: (open: boolean) => void
 payment: PaymentRecord | null
 customer?: CustomerRecord | null
 invoices?: InvoiceRecord[]
}

export function MoneyReceiptModal({
 open,
 onOpenChange,
 payment,
 customer,
 invoices = [],
}: MoneyReceiptModalProps) {
 const { company } = useTenant()
 const { locale } = useI18n()
 const { template: docTemplate } = useDocumentTemplate(company?.slug, 'receipt')
 const [copied, setCopied] = React.useState(false)
 const printRef = useRef<HTMLDivElement>(null)

 if (!payment) return null

 const paymentMethodLabels: Record<string, { en: string; bn: string }> = {
 cash: { en: 'Cash Counter', bn: 'ক্যাশ কাউন্টার' },
 bkash: { en: 'bKash Merchant', bn: 'বিকাশ মার্চেন্ট' },
 nagad: { en: 'Nagad Wallet', bn: 'নগদ ওয়ালেট' },
 bank: { en: 'Bank Transfer (EFT / RTGS)', bn: 'ব্যাংক ট্রান্সফার' },
 bank_transfer: { en: 'Bank Transfer', bn: 'ব্যাংক ট্রান্সফার' },
 cheque: { en: 'Bank Cheque', bn: 'ব্যাংক চেক' },
 other_mfs: { en: 'Other MFS (Rocket / Upay)', bn: 'অন্যান্য এমএফএস' },
  }

 const methodInfo = paymentMethodLabels[payment.payment_method] || {
 en: payment.payment_method.toUpperCase(),
 bn: payment.payment_method,
  }

 const handlePrint = () => {
 window.print()
  }

 const generateWhatsAppText = () => {
 const custName = payment.customer_name || customer?.name || 'Valued Customer'
 const companyName = company?.name || 'CLASSIC PRINTER'
 const companyAddress = company?.address || ''
 const companyPhone = company?.phone || ''
 const receiptNo = payment.receipt_number
 const amount = formatBDT(payment.amount)
 const date = payment.payment_date || new Date().toISOString().split('T')[0]
 const method = methodInfo.en.toUpperCase()
 const inWords = numberToWordsBDT(payment.amount)

 let settlementLines = ''
 if (payment.allocations && payment.allocations.length > 0) {
 settlementLines = payment.allocations
        .map((a) => `${a.invoice_number || a.invoice_id} — ${formatBDT(a.allocated_amount)}`)
        .join('\n')
    } else if (invoices.length > 0 && invoices[0]) {
 settlementLines = `${invoices[0].invoice_number} — ${formatBDT(payment.amount)}`
    }

 let remainingDueStr = ''
 if (invoices.length > 0 && invoices[0]) {
 const remainingDue = Math.max(0, (invoices[0].due_amount || 0) - payment.amount)
 remainingDueStr = formatBDT(remainingDue)
    } else if (customer && typeof customer.total_due_balance === 'number') {
 remainingDueStr = formatBDT(customer.total_due_balance)
    }

 let msg = `*অফিসিয়াল মানি রিসিট (MR)*\n\n` +
      `*${companyName.toUpperCase()}*\n` +
      (companyAddress ? `${companyAddress}\n` : '') +
      (companyPhone ? `Phone: ${companyPhone}\n` : '') +
      `\n` +
      `*Receipt No:* ${receiptNo}\n` +
      `*Date:* ${date}\n\n` +
      `*Customer:*\n${custName}\n\n` +
      `*Received Amount:*\n${amount}\n\n` +
      `*In Words:*\n${inWords}\n\n` +
      `*Payment Method:*\n${method}\n`

 if (payment.mfs_transaction_id) {
 msg += `*TrxID:* ${payment.mfs_transaction_id}\n`
    }
 if (payment.cheque_number) {
 msg += `*Cheque No:* ${payment.cheque_number} (${payment.bank_name || 'Bank'})\n`
    }

 if (settlementLines) {
 msg += `\n*Invoice Settlement:*\n${settlementLines}\n`
    }

 if (remainingDueStr) {
 msg += `\n*Remaining Due:*\n${remainingDueStr}\n`
    }

 msg += `\nThank you for your business.`
 return msg
  }

 const handleCopyText = async () => {
 const text = generateWhatsAppText()
 await navigator.clipboard.writeText(text)
 setCopied(true)
 setTimeout(() => setCopied(false), 2500)
  }

 const handleShareWhatsApp = () => {
 const phone = customer?.mobile || customer?.whatsapp || ''
 const cleanPhone = phone.replace(/[^0-9]/g, '')
 const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`
 const text = encodeURIComponent(generateWhatsAppText())
 const url = cleanPhone ? `https://wa.me/${fullPhone}?text=${text}` : `https://wa.me/?text=${text}`
 window.open(url, '_blank')
  }

 return (
    <ModalDialog
 open={open}
 onOpenChange={onOpenChange}
 size="4xl"className="printable-receipt-modal"title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-success/10 text-success bg-success/20 text-success flex items-center justify-center">
            <Receipt className="h-5 w-5"/>
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">
              {locale === 'bn' ? 'অফিসিয়াল মানি রিসিট (MR)' : 'Official Money Receipt (MR)'}
            </h2>
            <p className="text-xs text-muted-foreground">
 Official acknowledgment of payment collection and multi-invoice settlement
            </p>
          </div>
        </div>
      }
 hideFooter
    >
      <div data-money-receipt="true"className="space-y-4 pt-1 pb-2">
        {/* ACTION BAR & PAYMENT HIGHLIGHT (NON-PRINT) */}
        <div className="print:hidden space-y-3">
          <div className="p-3 bg-success-surface bg-success-surface border border-success-border border-success-border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-numeric tabular-nums">
              <div>
                <span className="text-success text-success font-bold block text-xs uppercase">Payment Received</span>
                <strong className="text-success text-success text-sm font-bold">{formatBDT(payment.amount)}</strong>
              </div>
              {invoices.length > 0 && invoices[0] && (
                <>
                  <div className="border-l border-success-border border-success-border pl-3">
                    <span className="text-muted-foreground block text-xs uppercase">Invoice</span>
                    <strong className="text-primary text-primary font-bold">#{invoices[0].invoice_number}</strong>
                  </div>
                  <div className="border-l border-success-border border-success-border pl-3">
                    <span className="text-muted-foreground block text-xs uppercase">Customer</span>
                    <strong className="text-foreground font-bold">{payment.customer_name || invoices[0].customer_name}</strong>
                  </div>
                  <div className="border-l border-success-border border-success-border pl-3">
                    <span className="text-muted-foreground block text-xs uppercase">Remaining Due</span>
                    {Math.max(0, (invoices[0].due_amount || 0) - payment.amount) === 0 ? (
                      <strong className="text-success text-success font-black flex items-center gap-1">
                        {formatBDT(0)} <span className="text-xs px-1.5 py-0.5 rounded bg-success-surface text-success bg-success text-success">Paid</span>
                      </strong>
                    ) : (
                      <strong className="text-destructive text-destructive font-black flex items-center gap-1">
                        {formatBDT(Math.max(0, (invoices[0].due_amount || 0) - payment.amount))}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-warning-surface text-warning bg-warning text-warning font-bold">Partially Paid</span>
                      </strong>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
 type="button"variant="outline"size="sm"onClick={handleCopyText}
 className="h-8 text-xs gap-1 font-semibold cursor-pointer">
                {copied ? <Check className="h-3.5 w-3.5 text-success"/> : <Copy className="h-3.5 w-3.5"/>}
                {copied ? 'Copied' : 'Copy'}
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={handleShareWhatsApp}
 className="h-8 text-xs gap-1 font-semibold text-success border-success-border hover:bg-success-surface border-success-border text-success cursor-pointer">
                <MessageSquare className="h-3.5 w-3.5"/>
 WhatsApp
              </Button>

              <Button
 type="button"variant="outline"size="sm"onClick={() => {
 const subject = encodeURIComponent(`Money Receipt #${payment.receipt_number} from ${company?.name || 'Printing Solutions'}`)
 const body = encodeURIComponent(generateWhatsAppText())
 window.open(`mailto:${customer?.email || ''}?subject=${subject}&body=${body}`, '_blank')
                }}
 className="h-8 text-xs gap-1 font-semibold text-foreground cursor-pointer">
                <Mail className="h-3.5 w-3.5"/>
 Email
              </Button>

              <Button
 type="button"size="sm"onClick={handlePrint}
 className="h-8 text-xs gap-1.5 bg-success hover:bg-success text-white font-bold cursor-pointer shadow-xs">
                <Printer className="h-3.5 w-3.5"/>
 Print / PDF
              </Button>
            </div>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL MONEY RECEIPT CANVAS */}
        <div
          ref={printRef}
          data-money-receipt-canvas="true"
          data-print-isolate="true"
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
          className="relative p-6 bg-card border-2 border-input rounded-xl space-y-5 text-foreground shadow-xs font-sans print:border-none print:shadow-none print:p-0 print:m-0 overflow-hidden"
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
                documentTypeTitleEn="MONEY RECEIPT"
                documentTypeTitleBn="মানি রিসিট"
                companyName={company?.name || 'PrintFlow'}
                companyLogoUrl={company?.logo_url || undefined}
                phone={company?.phone || '+880 1712 345678'}
                email={company?.email || 'info@printflow.bd'}
                website={company?.website || (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd')}
                address={company?.address || 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230'}
                mode={docTemplate.letterhead_mode}
              />
            )
          )}
          <div className="relative z-10 space-y-5">
          {/* HEADER */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-success-border border-success-border">
            <h1 className="text-xl font-black tracking-tight uppercase text-foreground">
              {company?.name || 'Printing & Signage Solutions'}
            </h1>
            <p className="text-xs text-muted-foreground">
              {company?.address || '42/1 Motijheel C/A, Dhaka-1000'} • Phone: {company?.phone || '+880 1700-000000'}
              {(company as any)?.bin || (company as any)?.bin_no ? ` • BIN: ${(company as any)?.bin || (company as any)?.bin_no}` : ''}
            </p>
            <div className="inline-block mt-2 px-4 py-1 rounded-full bg-success-surface text-success bg-success-surface/80 text-success font-black text-xs tracking-wider uppercase border border-success-border border-success-border">
 OFFICIAL MONEY RECEIPT / অফিসিয়াল মানি রিসিট (MR)
            </div>
          </div>

          {/* RECEIPT META */}
          <div className="flex flex-wrap justify-between items-center text-xs tabular-nums py-1 px-1 border-b border-border">
            <div>
              <span className="text-muted-foreground">Receipt No: </span>
              <strong className="text-success text-success text-sm font-black">
                {payment.receipt_number}
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground">Date: </span>
              <strong>{payment.payment_date || new Date().toISOString().split('T')[0]}</strong>
            </div>
          </div>

          {/* MAIN PARTICULARS */}
          <div className="p-4 rounded-xl border border-border bg-muted space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-muted-foreground w-44 shrink-0 font-medium">Received with thanks from:</span>
              <div className="font-bold text-sm text-foreground">
                {payment.customer_name || customer?.name || 'Customer'}
                {customer?.company_name && (
                  <span className="font-normal text-muted-foreground text-xs ml-1.5">
                    ({customer.company_name})
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-muted-foreground w-44 shrink-0 font-medium">The sum of Taka (in words):</span>
              <span className="font-bold text-success text-success italic">
                {numberToWordsBDT(payment.amount)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-muted-foreground w-44 shrink-0 font-medium">Payment Channel / Mode:</span>
              <div className="font-bold uppercase flex items-center gap-2 flex-wrap">
                <span>{methodInfo.en}</span>
                {payment.mfs_transaction_id && (
                  <Badge variant="outline"className="tabular-nums text-xs normal-case bg-card">
 TrxID: {payment.mfs_transaction_id}
                  </Badge>
                )}
                {payment.cheque_number && (
                  <Badge variant="outline"className="tabular-nums text-xs normal-case bg-card">
 Cheque #{payment.cheque_number} {payment.bank_name ? `(${payment.bank_name})` : ''}
                  </Badge>
                )}
                {payment.bank_name && !payment.cheque_number && (
                  <Badge variant="outline"className="tabular-nums text-xs normal-case bg-card">
 Bank: {payment.bank_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-muted-foreground w-44 shrink-0 font-medium">On Account of / Purpose:</span>
              <span className="text-foreground">
                {payment.notes || 'Settlement of printing & fabrication invoices'}
              </span>
            </div>
          </div>

          {/* INVOICE ALLOCATION BREAKDOWN */}
          {payment.allocations && payment.allocations.length > 0 ? (
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Invoice Settlement Allocation
              </div>
              <div className="border border-border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold text-xs">
                    <tr>
                      <th className="p-2">Invoice</th>
                      <th className="p-2 text-right">Invoice Total</th>
                      <th className="p-2 text-right">Paid Now</th>
                      <th className="p-2 text-right">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-numeric tabular-nums">
                    {payment.allocations.map((alloc, i) => {
 const matchedInv = invoices.find((inv) => inv.id === alloc.invoice_id || inv.invoice_number === alloc.invoice_number)
 const grandTotal = matchedInv ? matchedInv.grand_total : alloc.allocated_amount
 const remainingDue = matchedInv ? Math.max(0, matchedInv.due_amount - alloc.allocated_amount) : 0
 return (
                        <tr key={i} className="hover:bg-muted dark:hover:bg-muted/30">
                          <td className="p-2 font-bold text-primary text-primary">
                            #{alloc.invoice_number || alloc.invoice_id}
                          </td>
                          <td className="p-2 text-right text-foreground">
                            {formatBDT(grandTotal)}
                          </td>
                          <td className="p-2 text-right font-bold text-success text-success">
                            {formatBDT(alloc.allocated_amount)}
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {formatBDT(remainingDue)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (invoices.length > 0 && invoices[0]) ? (
            <div className="space-y-1.5">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
 Invoice Settlement
              </div>
              <div className="border border-border rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold text-xs">
                    <tr>
                      <th className="p-2">Invoice</th>
                      <th className="p-2 text-right">Invoice Total</th>
                      <th className="p-2 text-right">Paid Now</th>
                      <th className="p-2 text-right">Remaining Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-numeric tabular-nums">
                    <tr className="hover:bg-muted dark:hover:bg-muted/30">
                      <td className="p-2 font-bold text-primary text-primary">
                        #{invoices[0].invoice_number}
                      </td>
                      <td className="p-2 text-right text-foreground">
                        {formatBDT(invoices[0].grand_total)}
                      </td>
                      <td className="p-2 text-right font-bold text-success text-success">
                        {formatBDT(payment.amount)}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">
                        {formatBDT(Math.max(0, (invoices[0].due_amount || 0) - payment.amount))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* TOTAL, QR CODE & SIGNATURES */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-border">
            <div className="p-3.5 rounded-xl text-white font-numeric tabular-nums shadow-sm min-w-[200px]">
              <span className="text-xs uppercase font-bold text-success block">Total Amount Received</span>
              <div className="text-2xl font-bold tracking-normal">
                {formatBDT(payment.amount)}
              </div>
            </div>

            {/* QR Code Verification for Direct Print */}
            <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-muted border border-border">
              <QRCodeSVG
                value={`${typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL || `https://${BRAND.rootDomain}`)}/api/pdf/receipt?id=${encodeURIComponent(payment.receipt_number || payment.id)}`}
                size={64}
                className="bg-card p-1 rounded"
              />
              <span className="text-xs text-muted-foreground font-semibold mt-1">
 Scan to Verify Voucher
              </span>
            </div>

            <div className="text-center pt-6 space-y-1">
              <div className="border-t border-input w-48 pt-1.5 font-bold text-xs">
                {payment.received_by_name || 'Cashier / Accountant'}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
 Authorized Signatory & Seal
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* STANDARDIZED MODAL FOOTER */}
        <div className="print:hidden flex items-center justify-between gap-3 pt-3 border-t border-border">
          <Button
 type="button"variant="outline"onClick={() => onOpenChange(false)}
 className="h-10 px-4 rounded-xl font-bold border-input text-foreground hover:bg-muted dark:hover:bg-muted">
 Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
 type="button"variant="outline"onClick={handleShareWhatsApp}
 className="h-10 px-4 rounded-xl font-bold border-success-border text-success hover:bg-success-surface border-success-border text-success gap-1.5 cursor-pointer">
              <MessageSquare className="h-4 w-4"/>
 WhatsApp Share
            </Button>
            {payment && (
              <PdfActionButtons
 document={
                  <MoneyReceiptPdfDocument
                    payment={payment}
                    template={docTemplate}
 company={{
 name: company?.name,
 tagline: company?.legal_name || 'Printing & Signage Specialists',
 address: company?.address,
 phone: company?.phone,
 email: company?.email,
                    }}
                  />
                }
 filename={`RCP-${payment.receipt_number}`}
 title={`Receipt #${payment.receipt_number}`}
              />
            )}
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
