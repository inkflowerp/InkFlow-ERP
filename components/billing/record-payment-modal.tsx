'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Receipt,
  Search,
  DollarSign,
  Calendar,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Loader2,
  X,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
  FileText,
  RotateCcw,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { InvoiceRecord, PaymentRecord, PaymentMethod } from '@/types/billing.types'
import { CustomerRecord } from '@/types/crm.types'
import { formatBDT, numberToWordsBDT, calculateDaysOverdue } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { MoneyReceiptModal } from './money-receipt-modal'
import {
  recordPaymentAction,
  getInvoicesAction,
  getInvoiceByIdAction,
} from '@/actions/billing.actions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCustomerId?: string
  preselectedInvoiceId?: string
  initialInvoices?: InvoiceRecord[]
  onPaymentRecorded?: (payment: PaymentRecord) => void
  onSuccess?: () => void
}

const PAYMENT_METHODS: { id: PaymentMethod; labelEn: string; labelBn: string; icon: string; badge: string }[] = [
  { id: 'cash', labelEn: 'Cash Counter', labelBn: 'ক্যাশ কাউন্টার', icon: '💵', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { id: 'bkash', labelEn: 'bKash Merchant', labelBn: 'বিকাশ মার্চেন্ট', icon: '📱', badge: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
  { id: 'nagad', labelEn: 'Nagad Wallet', labelBn: 'নগদ ওয়ালেট', icon: '📱', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  { id: 'bank', labelEn: 'Bank Transfer', labelBn: 'ব্যাংক ট্রান্সফার', icon: '🏦', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  { id: 'cheque', labelEn: 'Bank Cheque', labelBn: 'ব্যাংক চেক', icon: '📝', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'other_mfs', labelEn: 'Rocket / Other MFS', labelBn: 'অন্যান্য এমএফএস', icon: '💳', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
]

export function RecordPaymentModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  preselectedInvoiceId,
  initialInvoices,
  onPaymentRecorded,
  onSuccess,
}: RecordPaymentModalProps) {
  const { company } = useTenant()
  const { locale } = useI18n()

  // Invoices list for search with instant initial hydration
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(() => {
    return initialInvoices && initialInvoices.length > 0 ? initialInvoices : []
  })
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sync initialInvoices if passed and non-empty
  useEffect(() => {
    if (initialInvoices && initialInvoices.length > 0) {
      setInvoices((prev) => {
        const map = new Map<string, InvoiceRecord>()
        prev.forEach((i) => {
          if (i && i.id) map.set(i.id, i)
        })
        initialInvoices.forEach((i) => {
          if (i && i.id) map.set(i.id, i)
        })
        return Array.from(map.values())
      })
    }
  }, [initialInvoices])

  // Selected Invoice & Customer State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null)

  // Payment Form State
  const [amount, setAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date())
    } catch {
      return new Date().toISOString().split('T')[0]
    }
  })
  const [receivedByName, setReceivedByName] = useState('Cashier / Accountant')
  const [referenceNo, setReferenceNo] = useState('')
  const [bankName, setBankName] = useState('Islami Bank Bangladesh PLC')
  const [notes, setNotes] = useState('')

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Success & Receipt State
  const [savedPayment, setSavedPayment] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Load unpaid invoices on modal open with resilient multi-tier fallback
  const loadInvoices = React.useCallback(async () => {
    setIsLoadingInvoices(true)
    try {
      const mergedMap = new Map<string, InvoiceRecord>()

      // 1. Initial invoices from parent
      if (initialInvoices && initialInvoices.length > 0) {
        initialInvoices.forEach((i) => {
          if (i && i.id) mergedMap.set(i.id, i)
        })
      }

      // 2. Local storage invoices
      try {
        const cached = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
        cached.forEach((i) => {
          if (i && i.id) mergedMap.set(i.id, i)
        })
      } catch {}

      // 3. PostgreSQL server action
      if (company?.id) {
        const res = await getInvoicesAction({ status: 'unpaid' }, company.id).catch(() => ({ success: false, data: [] }))
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          res.data.forEach((i) => {
            if (i && i.id) mergedMap.set(i.id, i)
          })
        }
      }

      if (mergedMap.size > 0) {
        setInvoices(Array.from(mergedMap.values()))
      }
    } catch {
      // Keep existing state on error
    } finally {
      setIsLoadingInvoices(false)
    }
  }, [company?.id, initialInvoices])

  useEffect(() => {
    if (open) {
      setSubmitError(null)
      loadInvoices()
    }
  }, [open, loadInvoices])

  // If preselectedInvoiceId provided, load and set that invoice directly
  useEffect(() => {
    if (open && preselectedInvoiceId) {
      // Find in existing list or fetch directly
      const found = invoices.find((i) => i.id === preselectedInvoiceId || i.invoice_number === preselectedInvoiceId)
      if (found) {
        handleSelectInvoice(found)
      } else if (company?.id) {
        getInvoiceByIdAction(preselectedInvoiceId, company.id).then((res) => {
          if (res.success && res.data) {
            handleSelectInvoice(res.data)
          }
        })
      }
    } else if (open && preselectedCustomerId && !selectedInvoice) {
      setSearchQuery(preselectedCustomerId)
    }
  }, [open, preselectedInvoiceId, preselectedCustomerId, invoices, company?.id])

  // Filtered Invoices matching search query (only actionable unpaid invoices with due > 0)
  const matchingInvoices = useMemo(() => {
    const activeUnpaid = invoices.filter((inv) => (inv.due_amount || 0) > 0.01 && inv.status !== 'cancelled' && inv.status !== 'paid')
    if (!searchQuery.trim()) return activeUnpaid.slice(0, 15)

    const q = searchQuery.toLowerCase().trim()
    return activeUnpaid.filter((inv) => {
      const matchInvNo = inv.invoice_number.toLowerCase().includes(q)
      const matchCust = inv.customer_name.toLowerCase().includes(q)
      const matchPhone = inv.customer_phone ? inv.customer_phone.includes(q) : false
      const matchOrder = inv.order_number ? inv.order_number.toLowerCase().includes(q) : false
      const matchCustId = inv.customer_id ? inv.customer_id.toLowerCase().includes(q) : false
      const matchId = inv.id ? inv.id.toLowerCase().includes(q) : false
      return matchInvNo || matchCust || matchPhone || matchOrder || matchCustId || matchId
    })
  }, [invoices, searchQuery])

  // Handle invoice selection
  const handleSelectInvoice = (inv: InvoiceRecord) => {
    setSelectedInvoice(inv)
    setAmount(inv.due_amount) // Default to full outstanding due
    setSubmitError(null)
  }

  // Handle clearing invoice selection
  const handleClearInvoice = () => {
    setSelectedInvoice(null)
    setAmount('')
    setSubmitError(null)
  }

  // Quick Action: Set Full Due (Only shortcut allowed)
  const handleSetFullDue = () => {
    if (selectedInvoice && selectedInvoice.due_amount > 0) {
      setAmount(selectedInvoice.due_amount)
      setSubmitError(null)
    }
  }

  // Outstanding calculations
  const invoiceTotal = selectedInvoice ? Number(selectedInvoice.grand_total) || 0 : 0
  const invoicePaid = selectedInvoice ? Number(selectedInvoice.paid_amount) || 0 : 0
  const invoiceDue = selectedInvoice ? Number(selectedInvoice.due_amount) || 0 : 0

  const numericAmount = Number(amount) || 0
  const remainingDue = Math.max(0, Math.round((invoiceDue - numericAmount) * 100) / 100)
  const isOverpaid = numericAmount > (invoiceDue + 0.001)
  const isZeroOrNegative = numericAmount <= 0
  const isFullySettled = remainingDue === 0 && numericAmount > 0 && !isOverpaid

  // Handle form reset
  const handleResetForm = () => {
    setSelectedInvoice(null)
    setAmount('')
    setSearchQuery('')
    setReferenceNo('')
    setNotes('')
    setSubmitError(null)
    setSavedPayment(null)
  }

  // Handle submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSubmitError(null)

    if (!selectedInvoice) {
      setSubmitError('Please search and select an invoice to collect payment.')
      return
    }

    if (isZeroOrNegative) {
      setSubmitError('Payment amount must be greater than ৳0.')
      return
    }

    if (isOverpaid) {
      setSubmitError(`Payment amount (${formatBDT(numericAmount)}) cannot exceed outstanding due (${formatBDT(invoiceDue)}).`)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await recordPaymentAction(
        {
          invoiceId: selectedInvoice.id,
          customerId: selectedInvoice.customer_id || undefined,
          customerName: selectedInvoice.customer_name,
          amount: numericAmount,
          paymentMethod,
          bankName: paymentMethod === 'bank' || paymentMethod === 'cheque' ? bankName : null,
          chequeNumber: paymentMethod === 'cheque' ? referenceNo : null,
          mfsTransactionId:
            paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'other_mfs'
              ? referenceNo
              : null,
          notes: notes || `Payment for Invoice #${selectedInvoice.invoice_number} via ${paymentMethod.toUpperCase()}`,
          receivedByName,
          idempotencyKey: `pay-${selectedInvoice.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        },
        company?.id
      )

      if (!res.success || !res.data) {
        setSubmitError(res.error || 'Failed to record payment. Transaction rolled back.')
        return
      }

      const payment = res.data
      setSavedPayment(payment)

      // Synchronize client-side store
      try {
        const localInvs = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
        const updatedInvs = localInvs.map((inv) => {
          if (inv.id === selectedInvoice.id) {
            const newPaid = Number(inv.paid_amount || 0) + numericAmount
            const newDue = Math.max(0, Number(inv.grand_total || 0) - newPaid)
            return {
              ...inv,
              paid_amount: newPaid,
              due_amount: newDue,
              status: (newDue <= 0.01 ? 'paid' : 'partially_paid') as any,
            }
          }
          return inv
        })
        PrintERPDataStore.set(STORAGE_KEYS.INVOICES, updatedInvs)

        const localPays = PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []
        PrintERPDataStore.set(STORAGE_KEYS.PAYMENTS, [payment, ...localPays.filter((p) => p.id !== payment.id)])

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('printerp_table_synced:invoices'))
          window.dispatchEvent(new CustomEvent('printerp_table_synced:payments'))
          window.dispatchEvent(new CustomEvent('printerp_data_sync'))
        }
      } catch {}

      if (onPaymentRecorded) {
        onPaymentRecorded(payment)
      }
      if (onSuccess) {
        onSuccess()
      }

      // Automatically open Money Receipt modal
      setIsReceiptModalOpen(true)
    } catch (err: any) {
      setSubmitError(err.message || 'Error occurred while recording payment.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ModalDialog
        open={open}
        onOpenChange={(v) => {
          if (!v) handleResetForm()
          onOpenChange(v)
        }}
        size="3xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center font-bold">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'বকেয়া আদায় (Collect Due)' : 'Collect Due'}
              </h2>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Search invoice or customer • Partial or full collection • Instant receipt
              </p>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {selectedInvoice ? (
                <div className="text-xs truncate">
                  <span className="text-slate-500 font-medium">Collecting: </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {numericAmount > 0 ? formatBDT(numericAmount) : '৳0'}
                  </span>
                  {remainingDue !== null && numericAmount > 0 && (
                    <span className="text-slate-400 font-mono text-2xs ml-2">
                      (Rem Due: {formatBDT(remainingDue)})
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-slate-400">Select an unpaid invoice above</span>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-10 text-xs px-4 rounded-xl cursor-pointer"
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {selectedInvoice && (
                <Button
                  type="submit"
                  form="collect-due-form"
                  size="sm"
                  disabled={isSubmitting || isZeroOrNegative || isOverpaid}
                  className={cn(
                    'h-10 text-xs sm:text-sm font-black text-white px-5 sm:px-6 shadow-md gap-2 rounded-xl transition-all cursor-pointer',
                    isFullySettled
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Collecting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {numericAmount > 0
                          ? `Collect ${formatBDT(numericAmount)}`
                          : 'Enter Payment Amount'}
                      </span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4 pt-1 pb-2">
          {/* ERROR BANNER */}
          {submitError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/50 p-3 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200 animate-in fade-in-0">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <strong>Payment Error:</strong> {submitError}
              </div>
            </div>
          )}

          {/* STEP 1: SEARCH & SELECT INVOICE (if no invoice selected) */}
          {!selectedInvoice ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Search Invoice or Customer / চালান খুঁজুন</span>
                  <span className="text-2xs text-slate-400 font-normal">
                    Invoice #, Customer Name, Phone
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Type Invoice # (e.g. INV-1025), customer name, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 text-xs pl-9 pr-8 rounded-xl border-slate-300 dark:border-slate-700"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Matching Results List */}
              <div className="space-y-1.5">
                <div className="text-2xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                  <span>Unpaid Invoices Matching Search ({matchingInvoices.length})</span>
                  {isLoadingInvoices && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </div>

                {isLoadingInvoices ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-600" />
                    <p>Searching invoices...</p>
                  </div>
                ) : matchingInvoices.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      No matching unpaid invoices found.
                    </p>
                    <p className="text-2xs text-slate-500">
                      All matching accounts are paid, or invoice number does not exist.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                    {matchingInvoices.map((inv) => {
                      const daysOverdue = calculateDaysOverdue(inv.due_date)
                      return (
                        <div
                          key={inv.id}
                          onClick={() => handleSelectInvoice(inv)}
                          className="p-3 hover:bg-emerald-50/50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                #{inv.invoice_number}
                              </span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">
                                {inv.customer_name}
                              </span>
                              {inv.customer_phone && (
                                <span className="text-slate-500 text-2xs font-mono">
                                  ({inv.customer_phone})
                                </span>
                              )}
                            </div>
                            <div className="text-2xs text-slate-500 flex flex-wrap items-center gap-x-3 font-mono">
                              <span>Date: {inv.invoice_date}</span>
                              <span>Total: {formatBDT(inv.grand_total)}</span>
                              <span>Paid: {formatBDT(inv.paid_amount || 0)}</span>
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                              <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                                {formatBDT(inv.due_amount)} DUE
                              </div>
                              {daysOverdue > 0 ? (
                                <span className="text-2xs font-bold text-rose-600 uppercase tracking-wider block">
                                  {daysOverdue}d Overdue
                                </span>
                              ) : (
                                <span className="text-2xs font-bold text-amber-600 uppercase tracking-wider block">
                                  {inv.status === 'partially_paid' ? 'Partially Paid' : 'Unpaid'}
                                </span>
                              )}
                            </div>
                            <Button
                              size="sm"
                              className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1 px-3 shadow-xs"
                            >
                              <span>Select</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* STEP 2: INVOICE SUMMARY & PAYMENT COLLECTION FORM */
            <form id="collect-due-form" onSubmit={handleSubmit} className="space-y-4">
              {/* SELECTED INVOICE SUMMARY CARD */}
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">
                      Selected Invoice
                    </span>
                    <strong className="font-mono text-sm font-black text-slate-900 dark:text-white">
                      #{selectedInvoice.invoice_number}
                    </strong>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      • {selectedInvoice.customer_name}
                    </span>
                    {selectedInvoice.customer_phone && (
                      <span className="text-xs text-slate-500 font-mono">
                        ({selectedInvoice.customer_phone})
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearInvoice}
                    className="h-7 text-xs text-blue-700 hover:text-blue-900 dark:text-blue-400 gap-1 px-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Change Invoice</span>
                  </Button>
                </div>

                {/* 3 Prominent Stat Cards */}
                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center font-mono">
                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-2xs text-slate-500 uppercase tracking-wider block">
                      Invoice Total
                    </span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white">
                      {formatBDT(invoiceTotal)}
                    </strong>
                  </div>

                  <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                    <span className="text-2xs text-emerald-600 uppercase tracking-wider block">
                      Paid
                    </span>
                    <strong className="text-xs font-bold text-emerald-600">
                      {formatBDT(invoicePaid)}
                    </strong>
                  </div>

                  <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/60">
                    <span className="text-2xs text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider block">
                      Outstanding Due
                    </span>
                    <strong className="text-sm font-black text-rose-600 dark:text-rose-400">
                      {formatBDT(invoiceDue)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* PAYMENT INPUT & PRESET ACTIONS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Payment Amount (টাকার পরিমাণ)*</span>
                  </Label>

                  {/* Quick Preset: Only Collect Full Due */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSetFullDue}
                      className="h-7 text-xs px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                    >
                      Collect Full Due ({formatBDT(invoiceDue)})
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-base font-black text-slate-500 font-mono">
                    ৳
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoiceDue}
                    inputMode="decimal"
                    placeholder="Enter amount actually received"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value)
                      setAmount(val)
                      setSubmitError(null)
                    }}
                    onWheel={(e) => (e.target as HTMLElement).blur()}
                    className={cn(
                      'h-12 pl-8 text-lg font-black font-mono rounded-xl',
                      isOverpaid && 'border-rose-500 focus-visible:ring-rose-500',
                      !isOverpaid && numericAmount > 0 && 'border-emerald-500 focus-visible:ring-emerald-500'
                    )}
                    autoFocus
                  />
                </div>

                {numericAmount > 0 && (
                  <p className="text-2xs text-slate-500 italic">
                    In words: {numberToWordsBDT(numericAmount)}
                  </p>
                )}
              </div>

              {/* LIVE PAYMENT BREAKDOWN & PROJECTED INVOICE STATUS */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between font-mono">
                  <span className="text-slate-500 font-medium">Outstanding Due:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatBDT(invoiceDue)}</span>
                </div>
                <div className="flex items-center justify-between font-mono">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">Collecting Now:</span>
                  <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{formatBDT(numericAmount)}</span>
                </div>
                <div className="flex items-center justify-between font-mono pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-900 dark:text-white">Remaining Due:</span>
                  <span className={cn('font-black text-sm', remainingDue === 0 ? 'text-emerald-600' : 'text-rose-600')}>
                    {formatBDT(remainingDue)}
                  </span>
                </div>

                {/* Projected Status Indicator */}
                <div className="pt-1 flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 font-normal">Projected Status:</span>
                  {isOverpaid ? (
                    <span className="text-rose-600 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Amount exceeds outstanding due!
                    </span>
                  ) : isFullySettled ? (
                    <span className="text-emerald-600 flex items-center gap-1 font-bold">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Paid
                    </span>
                  ) : numericAmount > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                      <Clock className="h-3.5 w-3.5" /> Partially Paid
                    </span>
                  ) : (
                    <span className="text-slate-400">Enter amount received</span>
                  )}
                </div>
              </div>

              {/* PAYMENT METHOD SELECTION */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Payment Method (পদ্ধতি)*
                </Label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const isSelected = paymentMethod === m.id
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center',
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                        )}
                      >
                        <span className="text-base">{m.icon}</span>
                        <span className="text-2xs leading-tight font-medium">
                          {locale === 'bn' ? m.labelBn : m.labelEn}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* PAYMENT DATE & REFERENCE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Date (তারিখ)*
                  </Label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'other_mfs'
                      ? 'TrxID / Transaction No.'
                      : paymentMethod === 'cheque'
                      ? 'Cheque Number'
                      : paymentMethod === 'bank'
                      ? 'Bank Reference / Slip No.'
                      : 'Reference (Optional)'}
                  </Label>
                  <Input
                    placeholder={
                      paymentMethod === 'bkash' || paymentMethod === 'nagad'
                        ? 'e.g. 9J83KX92'
                        : paymentMethod === 'cheque'
                        ? 'e.g. CHQ-482019'
                        : 'Optional transaction note'
                    }
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              {/* OPTIONAL NOTES */}
              <div className="space-y-1 text-xs">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notes (মন্তব্য)
                </Label>
                <Input
                  placeholder="e.g. Collected by cashier at desk / Received advance payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs rounded-xl"
                />
              </div>
            </form>
          )}
        </div>
      </ModalDialog>

      {/* MONEY RECEIPT MODAL (AUTO TRIGGERED ON SUCCESS) */}
      {savedPayment && (
        <MoneyReceiptModal
          open={isReceiptModalOpen}
          onOpenChange={setIsReceiptModalOpen}
          payment={savedPayment}
          customer={null}
          invoices={selectedInvoice ? [selectedInvoice] : []}
        />
      )}
    </>
  )
}

// Export alias for seamless backwards-compatibility
export const ReceivePaymentModal = RecordPaymentModal
