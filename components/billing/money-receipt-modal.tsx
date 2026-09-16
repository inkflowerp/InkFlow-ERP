'use client'

import React, { useRef } from 'react'
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
    const companyName = company?.name || 'Printing Solutions'
    const receiptNo = payment.receipt_number
    const amount = formatBDT(payment.amount)
    const date = payment.payment_date || new Date().toISOString().split('T')[0]
    const method = methodInfo.en

    return `*MONEY RECEIPT - ${companyName}*\n\n` +
      `Dear ${custName},\n` +
      `We have received your payment with thanks.\n\n` +
      `📄 *Receipt No:* ${receiptNo}\n` +
      `📅 *Date:* ${date}\n` +
      `💳 *Payment Mode:* ${method}\n` +
      `💵 *Amount Received:* ${amount} (${numberToWordsBDT(payment.amount)})\n` +
      (payment.mfs_transaction_id ? `🔢 *TrxID:* ${payment.mfs_transaction_id}\n` : '') +
      (payment.cheque_number ? `📝 *Cheque No:* ${payment.cheque_number} (${payment.bank_name || 'Bank'})\n` : '') +
      `\nThank you for doing business with us!\n` +
      `_${companyName}_`
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
      size="4xl"
      title={
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {locale === 'bn' ? 'অফিসিয়াল মানি রিসিট (MR)' : 'Official Money Receipt (MR)'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Official acknowledgment of payment collection and multi-invoice settlement
            </p>
          </div>
        </div>
      }
      hideFooter
    >
      <div className="space-y-4 pt-1 pb-2">
        {/* ACTION BAR & PAYMENT HIGHLIGHT (NON-PRINT) */}
        <div className="print:hidden space-y-3">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-3 font-mono">
              <div>
                <span className="text-emerald-700 dark:text-emerald-400 font-bold block text-[10px] uppercase">Payment Received</span>
                <strong className="text-emerald-800 dark:text-emerald-200 text-sm font-black">{formatBDT(payment.amount)}</strong>
              </div>
              {invoices.length > 0 && invoices[0] && (
                <>
                  <div className="border-l border-emerald-200 dark:border-emerald-800 pl-3">
                    <span className="text-slate-500 block text-[10px] uppercase">Invoice</span>
                    <strong className="text-blue-600 dark:text-blue-400 font-bold">#{invoices[0].invoice_number}</strong>
                  </div>
                  <div className="border-l border-emerald-200 dark:border-emerald-800 pl-3">
                    <span className="text-slate-500 block text-[10px] uppercase">Customer</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-bold">{payment.customer_name || invoices[0].customer_name}</strong>
                  </div>
                  <div className="border-l border-emerald-200 dark:border-emerald-800 pl-3">
                    <span className="text-slate-500 block text-[10px] uppercase">Remaining Due</span>
                    {Math.max(0, (invoices[0].due_amount || 0) - payment.amount) === 0 ? (
                      <strong className="text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1">
                        {formatBDT(0)} <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">Paid</span>
                      </strong>
                    ) : (
                      <strong className="text-rose-600 dark:text-rose-400 font-black flex items-center gap-1">
                        {formatBDT(Math.max(0, (invoices[0].due_amount || 0) - payment.amount))}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 font-bold">Partially Paid</span>
                      </strong>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyText}
                className="h-8 text-xs gap-1 font-semibold cursor-pointer"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-8 text-xs gap-1 font-semibold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 cursor-pointer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                WhatsApp
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const subject = encodeURIComponent(`Money Receipt #${payment.receipt_number} from ${company?.name || 'Printing Solutions'}`)
                  const body = encodeURIComponent(generateWhatsAppText())
                  window.open(`mailto:${customer?.email || ''}?subject=${subject}&body=${body}`, '_blank')
                }}
                className="h-8 text-xs gap-1 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer shadow-xs"
              >
                <Printer className="h-3.5 w-3.5" />
                Print / PDF
              </Button>
            </div>
          </div>
        </div>

        {/* PRINTABLE OFFICIAL MONEY RECEIPT CANVAS */}
        <div
          ref={printRef}
          className="p-6 bg-white dark:bg-slate-950 border-2 border-slate-300 dark:border-slate-700 rounded-2xl space-y-5 text-slate-900 dark:text-white shadow-xs font-sans print:border-none print:shadow-none print:p-0"
        >
          {/* HEADER */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-emerald-600 dark:border-emerald-500">
            <h1 className="text-xl font-black tracking-tight uppercase text-slate-900 dark:text-white">
              {company?.name || 'Printing & Signage Solutions'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {company?.address || '42/1 Motijheel C/A, Dhaka-1000'} • Phone: {company?.phone || '+880 1700-000000'}
              {(company as any)?.bin || (company as any)?.bin_no ? ` • BIN: ${(company as any)?.bin || (company as any)?.bin_no}` : ''}
            </p>
            <div className="inline-block mt-2 px-4 py-1 rounded-full bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-300 font-black text-xs tracking-wider uppercase border border-emerald-300 dark:border-emerald-700">
              OFFICIAL MONEY RECEIPT / অর্থ প্রাপ্তি মানি রিসিট
            </div>
          </div>

          {/* RECEIPT META */}
          <div className="flex flex-wrap justify-between items-center text-xs font-mono py-1 px-1 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-500">Receipt No: </span>
              <strong className="text-emerald-700 dark:text-emerald-400 text-sm font-black">
                {payment.receipt_number}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Date: </span>
              <strong>{payment.payment_date || new Date().toISOString().split('T')[0]}</strong>
            </div>
          </div>

          {/* MAIN PARTICULARS */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-slate-500 w-44 shrink-0 font-medium">Received with thanks from:</span>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {payment.customer_name || customer?.name || 'Customer'}
                {customer?.company_name && (
                  <span className="font-normal text-slate-600 dark:text-slate-400 text-xs ml-1.5">
                    ({customer.company_name})
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-slate-500 w-44 shrink-0 font-medium">The sum of Taka (in words):</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-300 italic">
                {numberToWordsBDT(payment.amount)}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-slate-500 w-44 shrink-0 font-medium">Payment Channel / Mode:</span>
              <div className="font-bold uppercase flex items-center gap-2">
                <span>{methodInfo.en}</span>
                {payment.mfs_transaction_id && (
                  <Badge variant="outline" className="font-mono text-[10px] normal-case bg-white dark:bg-slate-900">
                    TrxID: {payment.mfs_transaction_id}
                  </Badge>
                )}
                {payment.cheque_number && (
                  <Badge variant="outline" className="font-mono text-[10px] normal-case bg-white dark:bg-slate-900">
                    Cheque #{payment.cheque_number} {payment.bank_name ? `(${payment.bank_name})` : ''}
                  </Badge>
                )}
                {payment.bank_name && !payment.cheque_number && (
                  <Badge variant="outline" className="font-mono text-[10px] normal-case bg-white dark:bg-slate-900">
                    Bank: {payment.bank_name}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-baseline">
              <span className="text-slate-500 w-44 shrink-0 font-medium">On Account of / Purpose:</span>
              <span className="text-slate-800 dark:text-slate-200">
                {payment.notes || 'Settlement of printing & fabrication invoices'}
              </span>
            </div>
          </div>

          {/* INVOICE ALLOCATION BREAKDOWN IF AVAILABLE */}
          {payment.allocations && payment.allocations.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Settled Invoice Allocations
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                    <tr>
                      <th className="p-2">Invoice #</th>
                      <th className="p-2 text-right">Allocated Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payment.allocations.map((alloc, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {alloc.invoice_number || alloc.invoice_id}
                        </td>
                        <td className="p-2 font-mono font-bold text-right text-emerald-700 dark:text-emerald-400">
                          {formatBDT(alloc.allocated_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TOTAL & SIGNATURES */}
          <div className="flex flex-col sm:flex-row justify-between items-end gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-mono shadow-sm min-w-[200px]">
              <span className="text-[10px] uppercase font-bold text-emerald-100 block">Total Amount Received</span>
              <div className="text-2xl font-black tracking-tight">
                {formatBDT(payment.amount)}
              </div>
            </div>

            <div className="text-center pt-6 space-y-1">
              <div className="border-t border-slate-400 dark:border-slate-600 w-48 pt-1.5 font-bold text-xs">
                {payment.received_by_name || 'Cashier / Accountant'}
              </div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                Authorized Signatory & Seal
              </div>
            </div>
          </div>
        </div>

        {/* STANDARDIZED MODAL FOOTER */}
        <div className="print:hidden flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleShareWhatsApp}
              className="h-10 px-4 rounded-xl font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 gap-1.5 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              WhatsApp Share
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 gap-1.5 cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </div>
        </div>
      </div>
    </ModalDialog>
  )
}
