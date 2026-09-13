'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
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
  AlertTriangle,
  Clock,
  Printer,
  MessageSquare,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  Loader2,
  Send,
  X,
  Copy,
  Check,
  ExternalLink,
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

  // Customer Autocomplete / Selection
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const customerSearchRef = useRef<HTMLDivElement>(null)

  // Form State
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
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Success State
  const [savedPayment, setSavedPayment] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

  // Load Customers & Invoices on open
  useEffect(() => {
    if (open) {
      const custList = PrintERPDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS) || []
      const invList = PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES) || []
      setCustomers(custList)
      setInvoices(invList)
      setSubmitError(null)

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

  // Click outside to close customer dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Selected Customer Record
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null
  }, [customers, selectedCustomerId])

  // Customer Filter for Autocomplete
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers.slice(0, 8)
    const q = customerSearchQuery.toLowerCase()
    return customers.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q)) ||
        c.mobile.includes(q)
    ).slice(0, 10)
  }, [customers, customerSearchQuery])

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

  const handleSelectCustomer = (cust: CustomerRecord) => {
    setSelectedCustomerId(cust.id)
    setCustomerSearchQuery('')
    setShowCustomerDropdown(false)
  }

  const handleClearCustomer = () => {
    setSelectedCustomerId('')
    setCustomerSearchQuery('')
  }

  const handleResetForm = () => {
    setAmount('')
    setNotes('')
    setMfsTrxId('')
    setMfsSenderNumber('')
    setChequeNumber('')
    setSavedPayment(null)
    setSubmitError(null)
    const autoReceipt = PrintERPDataStore.getNextDocumentNumber(company?.id || 'default', 'receipt')
    setReceiptNumber(autoReceipt)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSubmitError(null)

    if (!selectedCustomerId) {
      setSubmitError('Please select a customer before recording payment.')
      return
    }

    const payAmount = Number(amount) || 0
    if (payAmount <= 0) {
      setSubmitError('Payment amount must be greater than ৳0.')
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

      setSavedPayment(payment)

      if (onPaymentRecorded) {
        onPaymentRecorded(payment)
      }

      // If auto open receipt is checked, show official Money Receipt modal
      if (autoOpenReceipt) {
        setIsReceiptModalOpen(true)
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to record payment collection.')
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
        size="5xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'কাস্টমার পেমেন্ট ও মানি রিসিট (MR)' : 'Record Customer Payment & Money Receipt (MR)'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Easier than Excel • Faster than paper • More organized than WhatsApp
              </p>
            </div>
          </div>
        }
        hideFooter
      >
        <div className="space-y-5 pt-1 pb-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* SUCCESS BANNER */}
          {savedPayment && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Money Receipt #{savedPayment.receipt_number} Created!</strong> Received: ৳{formatBDT(savedPayment.amount)} from {savedPayment.customer_name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="h-7 text-xs bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-slate-900 dark:text-emerald-300 dark:border-emerald-700 font-bold"
                >
                  <Printer className="h-3.5 w-3.5 mr-1" />
                  View & Print MR
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleResetForm}
                  className="h-7 text-xs text-slate-600 dark:text-slate-300"
                >
                  + Record Another
                </Button>
              </div>
            </div>
          )}

          {/* ERROR BANNER */}
          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-3.5 flex items-start gap-2.5 text-xs text-rose-900 dark:text-rose-200 animate-in fade-in-0">
              <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold">Validation Error</span>
                <p>{submitError}</p>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECTION 1: CUSTOMER INFORMATION & RECEIVABLES
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

              <div className="flex items-center gap-2">
                {selectedCustomer && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                      <UserCheck className="h-3.5 w-3.5" />
                      Existing Customer Linked
                    </span>
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                )}
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
            </div>

            {/* Unified Customer Search & Autocomplete */}
            {!selectedCustomer ? (
              <div className="relative" ref={customerSearchRef}>
                <Label htmlFor="custSearchInput" className="text-xs font-semibold mb-1 block">
                  Search & Select Customer <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="custSearchInput"
                    placeholder="Search by name, company name, or mobile number..."
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value)
                      setShowCustomerDropdown(true)
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="text-xs h-9 pr-8 font-medium border-slate-300 dark:border-slate-700 focus:border-emerald-500"
                  />
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
                </div>

                {/* Dropdown list */}
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => handleSelectCustomer(cust)}
                        className="p-3 hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            {cust.name} {cust.name_bn && <span className="font-normal text-slate-500">({cust.name_bn})</span>}
                          </div>
                          {cust.company_name && (
                            <div className="text-[11px] text-slate-500 font-medium">🏢 {cust.company_name}</div>
                          )}
                          <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            📞 {cust.mobile}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-semibold">Total Due</span>
                          <span className={cn(
                            "font-mono font-bold text-xs",
                            (cust.total_due_balance || 0) > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            ৳ {formatBDT(cust.total_due_balance || 0)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Customer Profile Summary */
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{selectedCustomer.name}</span>
                    {selectedCustomer.company_name && (
                      <span className="font-normal text-slate-500">({selectedCustomer.company_name})</span>
                    )}
                    {selectedCustomer.customer_type && (
                      <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 h-4">
                        {selectedCustomer.customer_type}
                      </Badge>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 text-[11px]">
                    Phone: <strong className="font-mono text-slate-700 dark:text-slate-300">{selectedCustomer.mobile}</strong>
                    {selectedCustomer.address ? ` • ${selectedCustomer.address}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-3">
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
                  Amount Received (৳ BDT) <span className="text-rose-500">*</span>
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
              <Label className="text-xs font-semibold block">
                Payment Channel <span className="text-rose-500">*</span>
              </Label>
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
                    MFS Transaction ID (TrxID) <span className="text-rose-500">*</span>
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
                    Bank Name <span className="text-rose-500">*</span>
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
                        Cheque Number <span className="text-rose-500">*</span>
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
                  Payment Collection Date <span className="text-rose-500">*</span>
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
                  Received / Collected By <span className="text-rose-500">*</span>
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
                Money Receipt (MR) & Remarks
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
        </div>

        {/* =========================================================================
            STANDARDIZED MODAL BOTTOM ACTION BAR (MATCHING INVOICE & QUOTATION MODALS)
           ========================================================================= */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleResetForm()
              onOpenChange(false)
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </Button>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            {/* Direct MR Preview Trigger if payment already recorded */}
            {savedPayment && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsReceiptModalOpen(true)}
                className="h-10 px-4 rounded-xl font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1.5"
              >
                <Printer className="h-4 w-4" />
                <span>View / Print MR</span>
              </Button>
            )}

            {/* Primary Save & Issue Money Receipt Button */}
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || !selectedCustomerId || !amount || Number(amount) <= 0}
              className="h-10 px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Recording Payment...</span>
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  <span>Save & Issue Money Receipt</span>
                </>
              )}
            </Button>
          </div>
        </div>
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

      {/* OFFICIAL MONEY RECEIPT VIEWER MODAL */}
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
