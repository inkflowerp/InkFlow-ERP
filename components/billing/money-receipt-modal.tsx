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
import { LiveA4Preview } from '@/components/settings/document-template/print-a4-preview'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'

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
 const [companyProfile] = useDataStore<any>(STORAGE_KEYS.COMPANY_PROFILE, null, company?.slug)

 const effectiveCompanyName = companyProfile?.name || company?.name || (company?.slug ? company.slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'PrintFlow')
 const effectiveAddress = companyProfile?.address || company?.address || 'House 12, Road 5, Sector 7, Uttara, Dhaka-1230'
 const effectivePhone = companyProfile?.phone || company?.phone || '+880 1712 345678'
 const effectiveEmail = companyProfile?.email || company?.email || (company?.slug ? `billing@${company.slug}.com` : 'info@printflow.bd')
 const effectiveWebsite = companyProfile?.website || company?.website || (company?.slug ? `www.${company.slug}.printflow.bd` : 'www.printflow.bd')
 const effectiveLogoUrl = companyProfile?.logo_url || company?.logo_url || undefined

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

        {/* PRINTABLE OFFICIAL MONEY RECEIPT CANVAS (Synchronized Document Template) */}
        <div id="receipt-print-area" className="w-full flex justify-center">
          <LiveA4Preview
            settings={docTemplate}
            activeDocType="receipt"
            paymentData={payment}
            invoiceData={invoices[0] || null}
            showControls={false}
            companyName={effectiveCompanyName}
            companyAddress={effectiveAddress}
            companyPhone={effectivePhone}
            companyEmail={effectiveEmail}
            companyWebsite={effectiveWebsite}
            companyLogoUrl={effectiveLogoUrl}
            onPrintPdf={handlePrint}
          />
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
