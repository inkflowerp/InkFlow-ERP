'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Receipt,
  Search,
  Plus,
  DollarSign,
  Building2,
  Calendar,
  CreditCard,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord } from '@/types/crm.types'
import { InvoiceRecord, PaymentRecord, PaymentMethod } from '@/types/billing.types'
import { formatBDT, numberToWordsBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { notify } from '@/lib/notifications/notification-bus'
import { MoneyReceiptModal } from './money-receipt-modal'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'

export interface RecordPaymentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preselectedCustomerId?: string
  preselectedInvoiceId?: string
  onPaymentRecorded?: (payment: PaymentRecord) => void
}

const PAYMENT_METHODS: { id: PaymentMethod; labelEn: string; labelBn: string; icon: string; badge: string }[] = [
  { id: 'cash', labelEn: 'Cash Counter', labelBn: 'ক্যাশ কাউন্টার', icon: '💵', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
  { id: 'bkash', labelEn: 'bKash Merchant', labelBn: 'বিকাশ মার্চেন্ট', icon: '📱', badge: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
  { id: 'nagad', labelEn: 'Nagad Wallet', labelBn: 'নগদ ওয়ালেট', icon: '📱', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
  { id: 'bank', labelEn: 'Bank Transfer (EFT / RTGS)', labelBn: 'ব্যাংক ট্রান্সফার', icon: '🏦', badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
  { id: 'cheque', labelEn: 'Bank Cheque', labelBn: 'ব্যাংক চেক', icon: '📝', badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
  { id: 'other_mfs', labelEn: 'Rocket / Other MFS', labelBn: 'অন্যান্য এমএফএস', icon: '💳', badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
]

export function RecordPaymentModal({
  open,
  onOpenChange,
  preselectedCustomerId,
  preselectedInvoiceId,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const { company } = useTenant()
  const { locale } = useI18n()

  // Data lists from store
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [amount, setAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [receiptNumber, setReceiptNumber] = useState<string>('')
  const [receivedByName, setReceivedByName] = useState('Cashier / Accountant')
  const [notes, setNotes] = useState('')

  // Channel specific details
  const [mfsTrxId, setMfsTrxId] = useState('')
  const [mfsSenderNumber, setMfsSenderNumber] = useState('')
  const [bankName, setBankName] = useState('Islami Bank Bangladesh PLC')
  const [bankBranch, setBankBranch] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState(new Date().toISOString().split('T')[0])

  // Multi-Invoice Allocation Mode: 'fifo' | 'custom'
  const [allocationMode, setAllocationMode] = useState<'fifo' | 'custom'>('fifo')
  const [customAllocations, setCustomAllocations] = useState<Record<string, number>>({})

  // Options & Post-Actions
  const [sendNotification, setSendNotification] = useState(true)
  const [autoOpenReceipt, setAutoOpenReceipt] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Success Receipt Modal State
  const [savedPayment, setSavedPayment] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Load Customers & Invoices on open
  useEffect(() => {
    if (open) {
      const custList = PrintERPDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS) || []
      const invList = PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES) || []
      setCustomers(custList)
      setInvoices(invList)

      const targetCustId = preselectedCustomerId || (preselectedInvoiceId ? invList.find((i: InvoiceRecord) => i.id === preselectedInvoiceId)?.customer_id : '') || custList[0]?.id || ''
      setSelectedCustomerId(targetCustId)

      // Auto generate receipt number
      const autoReceipt = PrintERPDataStore.getNextDocumentNumber(company?.id || 'default', 'receipt')
      setReceiptNumber(autoReceipt)

      // If preselected invoice, preset amount to its due
      if (preselectedInvoiceId) {
        const targetInv = invList.find((i: InvoiceRecord) => i.id === preselectedInvoiceId)
        if (targetInv && targetInv.due_amount > 0) {
          setAmount(targetInv.due_amount)
          setCustomAllocations({ [targetInv.id]: targetInv.due_amount })
          setAllocationMode('custom')
        }
      }
    }
  }, [open, preselectedCustomerId, preselectedInvoiceId, company?.id])

  // Selected Customer Record
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null
  }, [customers, selectedCustomerId])

  // Unpaid Invoices for this customer
  const customerUnpaidInvoices = useMemo(() => {
    if (!selectedCustomerId) return []
    return invoices
      .filter(i => i.customer_id === selectedCustomerId && (Number(i.due_amount) || 0) > 0)
      .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime())
  }, [invoices, selectedCustomerId])

  // Total Customer Outstanding Due
  const totalCustomerDue = useMemo(() => {
    return customerUnpaidInvoices.reduce((sum, inv) => sum + (Number(inv.due_amount) || 0), 0)
  }, [customerUnpaidInvoices])

  // Auto-calculated allocation breakdown preview
  const allocationBreakdown = useMemo(() => {
    const payAmt = Number(amount) || 0
    if (payAmt <= 0) return []

    if (allocationMode === 'custom') {
      return customerUnpaidInvoices.map(inv => {
        const alloc = customAllocations[inv.id] || 0
        const invDue = Number(inv.due_amount) || 0
        const remaining = Math.max(0, invDue - alloc)
        return {
          invoice: inv,
          allocated: alloc,
          remaining,
          isFullySettled: remaining === 0 && alloc > 0,
        }
      })
    }

    // FIFO Mode
    let remainingPay = payAmt
    return customerUnpaidInvoices.map(inv => {
      const invDue = Number(inv.due_amount) || 0
      const alloc = Math.min(remainingPay, invDue)
      const remaining = Math.max(0, invDue - alloc)
      remainingPay = Math.max(0, remainingPay - alloc)
      return {
        invoice: inv,
        allocated: alloc,
        remaining,
        isFullySettled: remaining === 0 && alloc > 0,
      }
    })
  }, [amount, allocationMode, customAllocations, customerUnpaidInvoices])

  // Unallocated surplus (Customer Advance)
  const unallocatedSurplus = useMemo(() => {
    const payAmt = Number(amount) || 0
    const totalAlloc = allocationBreakdown.reduce((sum, item) => sum + item.allocated, 0)
    return Math.max(0, payAmt - totalAlloc)
  }, [amount, allocationBreakdown])

  // Quick Preset Handlers
  const handleSetFullDue = () => {
    if (totalCustomerDue > 0) {
      setAmount(totalCustomerDue)
    }
  }

  const handleSetHalfDue = () => {
    if (totalCustomerDue > 0) {
      setAmount(Math.round(totalCustomerDue / 2))
    }
  }

  const handleCustomAllocChange = (invId: string, value: number) => {
    setCustomAllocations(prev => ({
      ...prev,
      [invId]: Math.max(0, value),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomerId) {
      notify({
        title: 'Customer Required',
        message: 'Please select a customer to record payment.',
        type: 'warning',
      })
      return
    }

    const payAmount = Number(amount) || 0
    if (payAmount <= 0) {
      notify({
        title: 'Invalid Amount',
        message: 'Payment amount must be greater than 0.',
        type: 'warning',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Build allocation payload
      const explicitAllocations = allocationMode === 'custom'
        ? Object.entries(customAllocations)
            .filter(([_, amt]) => amt > 0)
            .map(([invId, amt]) => ({ invoiceId: invId, amount: amt }))
        : allocationBreakdown
            .filter(a => a.allocated > 0)
            .map(a => ({ invoiceId: a.invoice.id, amount: a.allocated }))

      // 1. Record payment collection in persistent store
      const payment = PrintERPDataStore.recordPaymentCollection({
        customerId: selectedCustomerId,
        companyId: company?.id || 'default',
        amount: payAmount,
        paymentMethod,
        receiptNumber: receiptNumber || undefined,
        paymentDate,
        bankName: paymentMethod === 'bank' || paymentMethod === 'cheque' ? bankName : null,
        chequeNumber: paymentMethod === 'cheque' ? chequeNumber : null,
        chequeDate: paymentMethod === 'cheque' ? chequeDate : null,
        mfsTrxId: paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'other_mfs' ? mfsTrxId : null,
        notes: notes || `Payment received from ${selectedCustomer?.name || 'Customer'} via ${paymentMethod.toUpperCase()}`,
        receivedByName,
        allocations: explicitAllocations,
      })

      notify({
        title: 'Payment Recorded (টাকা জমা সম্পন্ন)',
        message: `৳ ${formatBDT(payAmount)} received from ${selectedCustomer?.name || 'Customer'} (MR: ${payment.receipt_number})`,
        type: 'payment',
      })

      if (onPaymentRecorded) {
        onPaymentRecorded(payment)
      }

      onOpenChange(false)

      // If auto open receipt is checked, show official Money Receipt modal
      if (autoOpenReceipt) {
        setSavedPayment(payment)
        setIsReceiptModalOpen(true)
      }
    } catch (err: any) {
      notify({
        title: 'Payment Failed',
        message: err.message || 'Failed to record payment collection.',
        type: 'error',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <ModalDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Record Customer Payment & Money Receipt (MR)"
        description="Easier than Excel • Faster than paper • More organized than WhatsApp"
        className="max-w-3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[82vh] overflow-y-auto px-1">
          {/* =========================================================================
              SECTION 1: CUSTOMER SELECTION & RECEIVABLES SUMMARY
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Customer & Receivables Overview
                </h3>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                className="h-7 text-xs font-bold gap-1 text-emerald-600 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 dark:bg-emerald-950/30"
              >
                <Plus className="h-3.5 w-3.5" />
                + New Customer
              </Button>
            </div>

            {/* Customer Picker */}
            <div className="space-y-1.5">
              <Label htmlFor="custSelect" className="text-xs font-semibold">
                Select Customer *
              </Label>
              <select
                id="custSelect"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company_name ? `(${c.company_name})` : ''} — 📞 {c.mobile} — Due: ৳ {formatBDT(c.total_due_balance || 0)}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Customer Summary Card */}
            {selectedCustomer && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.customer_type && (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                        {selectedCustomer.customer_type}
                      </Badge>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Phone: <strong>{selectedCustomer.mobile}</strong>
                    {selectedCustomer.address ? ` • ${selectedCustomer.address}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Due Balance</span>
                    <span className={cn(
                      "text-sm font-black font-mono",
                      totalCustomerDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    )}>
                      ৳ {formatBDT(totalCustomerDue)}
                    </span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 font-bold border-blue-200">
                    {customerUnpaidInvoices.length} Open Invoices
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION 2: PAYMENT COLLECTION DETAILS
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-4 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Payment Collection Details
              </h3>
            </div>

            {/* Amount Received with Quick Presets */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payAmount" className="text-xs font-semibold">
                  Amount Received (৳ BDT) *
                </Label>
                {totalCustomerDue > 0 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleSetFullDue}
                      className="px-2 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-md border border-emerald-200 dark:border-emerald-800 cursor-pointer"
                    >
                      Full Due (৳ {formatBDT(totalCustomerDue)})
                    </button>
                    <button
                      type="button"
                      onClick={handleSetHalfDue}
                      className="px-2 py-0.5 text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 rounded-md cursor-pointer"
                    >
                      50% (৳ {formatBDT(Math.round(totalCustomerDue / 2))})
                    </button>
                  </div>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">৳</span>
                <Input
                  id="payAmount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="pl-8 text-base font-mono font-bold h-11 border-slate-300 dark:border-slate-700 focus:border-emerald-500"
                  required
                  min={1}
                />
              </div>

              {Number(amount) > 0 && (
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium italic">
                  In Words: <strong>{numberToWordsBDT(Number(amount))}</strong>
                </div>
              )}
            </div>

            {/* Payment Channel / Method Selector */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold block">Payment Channel *</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {PAYMENT_METHODS.map((pm) => {
                  const isSelected = paymentMethod === pm.id
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={cn(
                        'p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer',
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs ring-1 ring-emerald-500'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <span className="text-lg">{pm.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold truncate">{pm.labelEn}</div>
                        <div className="text-[10px] text-slate-400 truncate">{pm.labelBn}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Channel Dynamic Fields */}
            {(paymentMethod === 'bkash' || paymentMethod === 'nagad' || paymentMethod === 'other_mfs') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="trxId" className="text-xs font-semibold">
                    MFS Transaction ID (TrxID) *
                  </Label>
                  <Input
                    id="trxId"
                    placeholder="e.g. 9J48KL21"
                    value={mfsTrxId}
                    onChange={(e) => setMfsTrxId(e.target.value)}
                    className="h-9 text-xs font-mono font-bold uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mfsPhone" className="text-xs font-semibold">
                    Sender Mobile Number (Optional)
                  </Label>
                  <Input
                    id="mfsPhone"
                    placeholder="01XXXXXXXXX"
                    value={mfsSenderNumber}
                    onChange={(e) => setMfsSenderNumber(e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {(paymentMethod === 'bank' || paymentMethod === 'cheque') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <Label htmlFor="bankName" className="text-xs font-semibold">
                    Bank Name *
                  </Label>
                  <Input
                    id="bankName"
                    placeholder="e.g. Islami Bank, DBBL, BRAC Bank"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="h-9 text-xs font-semibold"
                    required
                  />
                </div>

                {paymentMethod === 'bank' && (
                  <div className="space-y-1">
                    <Label htmlFor="bankBranch" className="text-xs font-semibold">
                      Branch / Deposit Slip Reference
                    </Label>
                    <Input
                      id="bankBranch"
                      placeholder="e.g. Motijheel Branch / Slip #889"
                      value={bankBranch}
                      onChange={(e) => setBankBranch(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {paymentMethod === 'cheque' && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="chequeNo" className="text-xs font-semibold">
                        Cheque Number *
                      </Label>
                      <Input
                        id="chequeNo"
                        placeholder="e.g. CQ-9948210"
                        value={chequeNumber}
                        onChange={(e) => setChequeNumber(e.target.value)}
                        className="h-9 text-xs font-mono font-bold"
                        required
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label htmlFor="chequeDate" className="text-xs font-semibold">
                        Cheque Date
                      </Label>
                      <Input
                        id="chequeDate"
                        type="date"
                        value={chequeDate}
                        onChange={(e) => setChequeDate(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Date & Received By */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="payDate" className="text-xs font-semibold">
                  Payment Collection Date *
                </Label>
                <Input
                  id="payDate"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recBy" className="text-xs font-semibold">
                  Received / Collected By *
                </Label>
                <Input
                  id="recBy"
                  value={receivedByName}
                  onChange={(e) => setReceivedByName(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* =========================================================================
              SECTION 3: MULTI-INVOICE ALLOCATION & SETTLEMENT
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Invoice Allocation & Settlement
                </h3>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setAllocationMode('fifo')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    allocationMode === 'fifo'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  Auto FIFO
                </button>
                <button
                  type="button"
                  onClick={() => setAllocationMode('custom')}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                    allocationMode === 'custom'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {customerUnpaidInvoices.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  No open invoices for this customer
                </p>
                <p className="text-[11px] text-slate-500">
                  This payment will be recorded as an advance customer credit for future job orders.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/80 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-semibold text-[11px]">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Invoice Due</th>
                        <th className="p-2.5 text-right">Allocating</th>
                        <th className="p-2.5 text-right">Remaining Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {allocationBreakdown.map(({ invoice, allocated, remaining, isFullySettled }) => (
                        <tr key={invoice.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {invoice.invoice_number}
                          </td>
                          <td className="p-2.5 text-slate-500 text-[11px]">
                            {invoice.invoice_date}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {formatBDT(invoice.due_amount)}
                          </td>
                          <td className="p-2.5 text-right">
                            {allocationMode === 'custom' ? (
                              <Input
                                type="number"
                                value={customAllocations[invoice.id] ?? ''}
                                onChange={(e) => handleCustomAllocChange(invoice.id, Number(e.target.value) || 0)}
                                className="h-7 w-24 text-right text-xs font-mono font-bold ml-auto"
                                max={invoice.due_amount}
                              />
                            ) : (
                              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                ৳ {formatBDT(allocated)}
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {isFullySettled ? (
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] py-0">
                                Settle Full (৳0)
                              </Badge>
                            ) : (
                              <span className="text-slate-700 dark:text-slate-300">
                                ৳ {formatBDT(remaining)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Surplus Advance Notice */}
                {unallocatedSurplus > 0 && (
                  <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      Surplus payment of <strong>৳ {formatBDT(unallocatedSurplus)}</strong> will be credited as Customer Advance.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =========================================================================
              SECTION 4: MONEY RECEIPT (MR) OPTIONS & REMARKS
             ========================================================================= */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Money Receipt (MR) & Notification Options
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="mrNo" className="text-xs font-semibold">
                  Money Receipt Number (MR #)
                </Label>
                <Input
                  id="mrNo"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                  placeholder="e.g. MR-2026-0042"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="payNotes" className="text-xs font-semibold">
                  Purpose / Remarks (On Account of)
                </Label>
                <Input
                  id="payNotes"
                  placeholder="e.g. Full settlement of banner print orders"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Notification Checkboxes */}
            <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoOpenReceipt}
                  onChange={(e) => setAutoOpenReceipt(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Open official printable Money Receipt (MR) upon saving
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Send WhatsApp / SMS payment confirmation to customer ({selectedCustomer?.mobile || 'Customer'})
                </span>
              </label>
            </div>
          </div>

          {/* =========================================================================
              MODAL FOOTER ACTIONS
             ========================================================================= */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto h-10 text-xs font-bold"
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting || !amount || Number(amount) <= 0}
              className="w-full sm:w-auto h-10 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <Receipt className="h-4 w-4" />
              {isSubmitting ? 'Recording Payment...' : 'Save & Issue Money Receipt'}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* QUICK NEW CUSTOMER MODAL */}
      <NewCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onCustomerCreated={(newCust) => {
          setCustomers(prev => [newCust, ...prev])
          setSelectedCustomerId(newCust.id)
        }}
      />

      {/* MONEY RECEIPT VIEWER MODAL */}
      <MoneyReceiptModal
        open={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
        payment={savedPayment}
        customer={selectedCustomer}
        invoices={customerUnpaidInvoices}
      />
    </>
  )
}
