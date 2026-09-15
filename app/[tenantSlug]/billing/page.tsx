'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Receipt,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  CreditCard,
  Building,
  FileSpreadsheet,
  FileCheck2,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Printer,
  Send,
  MessageSquare,
  Mail,
  Smartphone,
  Filter,
  Layers,
  Users,
  Calendar,
  ChevronRight,
  Ban,
  FileText,
  Percent,
  RefreshCw,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { CustomerRecord } from '@/types/crm.types'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { MoneyReceiptModal } from '@/components/billing/money-receipt-modal'
import {
  InvoiceRecord,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentRecord,
  FinancialWriteOffRecord,
  BillingPeriod,
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
} from '@/types/billing.types'
import { formatBDT, calculateDaysOverdue } from '@/lib/formatters'
import { usePermissions } from '@/hooks/use-permissions'
import {
  getBillingOverviewAction,
  getInvoicesAction,
  getPaymentsAction,
  getReceivablesAgingAction,
  recordWriteOffAction,
  cancelInvoiceAction,
  sendInvoiceAction,
  sendPaymentReminderAction,
} from '@/actions/billing.actions'
import { cn } from '@/lib/utils'

export default function BillingPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { locale } = useI18n()
  const slug = company?.slug || 'my-company'

  // Period & Tabs
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('today')
  const [activeMainTab, setActiveMainTab] = useState<'invoices' | 'payments' | 'receivables'>('invoices')
  const [invoiceFilterTab, setInvoiceFilterTab] = useState<string>('all')
  const [priorityTab, setPriorityTab] = useState<'all' | 'due_today' | 'overdue' | 'high_value'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Data State
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [overviewMetrics, setOverviewMetrics] = useState<BillingOverviewMetrics | null>(null)
  const [priorityItems, setPriorityItems] = useState<CollectionPriorityItem[]>([])
  const [paymentMethodsSummary, setPaymentMethodsSummary] = useState<PaymentMethodSummaryItem[]>([])
  const [salespersonStats, setSalespersonStats] = useState<SalespersonCollectionStat[]>([])
  const [receivablesAging, setReceivablesAging] = useState<ReceivablesAgingSummary | null>(null)

  // Modals State
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false)
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false)
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState<string | undefined>(undefined)
  const [selectedInvoiceIdForPayment, setSelectedInvoiceIdForPayment] = useState<string | undefined>(undefined)
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  // Write-Off Modal State
  const [selectedInvoiceForWriteOff, setSelectedInvoiceForWriteOff] = useState<InvoiceRecord | null>(null)
  const [writeOffAmount, setWriteOffAmount] = useState<number>(0)
  const [writeOffReason, setWriteOffReason] = useState('')
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false)

  // Cancellation Modal State
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<InvoiceRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  // Feedback Notification
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Load authoritative data
  const loadBillingData = useCallback(async () => {
    if (!company?.id) return
    setIsLoading(true)

    try {
      const [overviewRes, invRes, payRes, agingRes] = await Promise.all([
        getBillingOverviewAction(selectedPeriod, undefined, company.id),
        getInvoicesAction(undefined, company.id),
        getPaymentsAction(undefined, company.id),
        getReceivablesAgingAction(company.id),
      ])

      if (overviewRes.success && overviewRes.data) {
        setOverviewMetrics(overviewRes.data.metrics)
        setPriorityItems(overviewRes.data.priorityItems)
        setPaymentMethodsSummary(overviewRes.data.paymentMethods)
        setSalespersonStats(overviewRes.data.salespersonStats)
      }

      if (invRes.success && invRes.data) {
        setInvoices(invRes.data)
      }

      if (payRes.success && payRes.data) {
        setPayments(payRes.data)
      }

      if (agingRes.success && agingRes.data) {
        setReceivablesAging(agingRes.data)
      }
    } catch (err) {
      console.error('Failed to load billing data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [company?.id, selectedPeriod])

  useEffect(() => {
    loadBillingData()
  }, [loadBillingData])

  // Filtered Invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = search.toLowerCase()
      const matchSearch =
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.customer_name.toLowerCase().includes(q) ||
        (inv.customer_phone && inv.customer_phone.includes(q)) ||
        (inv.customer_bin && inv.customer_bin.includes(q)) ||
        (inv.order_number && inv.order_number.toLowerCase().includes(q)) ||
        (inv.job_number && inv.job_number.toLowerCase().includes(q))

      if (!matchSearch) return false

      if (invoiceFilterTab === 'draft') return inv.status === 'unpaid' && inv.paid_amount === 0
      if (invoiceFilterTab === 'unpaid') return (inv.status === 'unpaid' || inv.status === 'partially_paid') && inv.due_amount > 0
      if (invoiceFilterTab === 'partially_paid') return inv.status === 'partially_paid'
      if (invoiceFilterTab === 'paid') return inv.status === 'paid' || inv.due_amount === 0
      if (invoiceFilterTab === 'due_today') return inv.due_date === new Date().toISOString().split('T')[0] && inv.due_amount > 0
      if (invoiceFilterTab === 'overdue') return inv.due_amount > 0 && calculateDaysOverdue(inv.due_date) > 0
      if (invoiceFilterTab === 'cancelled') return inv.status === 'cancelled'
      if (invoiceFilterTab === 'written_off') return inv.status === 'written_off' || (inv.write_off_amount && inv.write_off_amount > 0)
      if (invoiceFilterTab === 'vat') return inv.invoice_type === 'vat_invoice'
      return true
    })
  }, [invoices, search, invoiceFilterTab])

  // Filtered Priority Items
  const filteredPriorityItems = useMemo(() => {
    if (priorityTab === 'all') return priorityItems
    return priorityItems.filter((item) => item.priorityReason === priorityTab)
  }, [priorityItems, priorityTab])

  // Quick Action: Send Payment Reminder
  const handleSendReminder = async (invoiceId: string) => {
    showNotification('Generating WhatsApp payment reminder...')
    const res = await sendPaymentReminderAction(invoiceId, company?.id)
    if (res.success && res.data?.whatsappUrl) {
      window.open(res.data.whatsappUrl, '_blank')
      showNotification('WhatsApp reminder ready!')
    } else {
      showNotification(res.error || 'Failed to generate reminder.')
    }
  }

  // Quick Action: Record Write-Off Submit
  const handleConfirmWriteOff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceForWriteOff) return

    setIsSubmittingWriteOff(true)
    try {
      const res = await recordWriteOffAction(
        {
          invoice_id: selectedInvoiceForWriteOff.id,
          amount: writeOffAmount,
          reason: writeOffReason,
          authorized_by_name: 'Chief Financial Officer',
        },
        company?.id
      )

      if (res.success) {
        showNotification(`Write-off of ৳${formatBDT(writeOffAmount)} recorded with audit trail.`)
        setSelectedInvoiceForWriteOff(null)
        setWriteOffReason('')
        loadBillingData()
      } else {
        showNotification(res.error || 'Failed to record write-off.')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error recording write-off.')
    } finally {
      setIsSubmittingWriteOff(false)
    }
  }

  // Quick Action: Cancel Invoice Submit
  const handleConfirmCancel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceForCancel) return

    setIsSubmittingCancel(true)
    try {
      const res = await cancelInvoiceAction(selectedInvoiceForCancel.id, cancelReason, company?.id)
      if (res.success) {
        showNotification(`Invoice #${selectedInvoiceForCancel.invoice_number} voided successfully.`)
        setSelectedInvoiceForCancel(null)
        setCancelReason('')
        loadBillingData()
      } else {
        showNotification(res.error || 'Failed to cancel invoice.')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error cancelling invoice.')
    } finally {
      setIsSubmittingCancel(false)
    }
  }

  const getStatusBadge = (status: InvoiceStatus, dueDate: string, dueAmt: number) => {
    const daysOverdue = calculateDaysOverdue(dueDate)

    if (status === 'paid' || dueAmt <= 0.01) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Paid
        </span>
      )
    }

    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-400">
          <Ban className="h-3 w-3" /> Cancelled
        </span>
      )
    }

    if (status === 'written_off') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/50 dark:text-purple-300">
          Written Off
        </span>
      )
    }

    if (dueAmt > 0 && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 animate-pulse">
          <AlertOctagon className="h-3 w-3 text-rose-600" /> {daysOverdue}d Overdue
        </span>
      )
    }

    if (status === 'partially_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/50 dark:text-blue-300">
          <Clock className="h-3 w-3 text-blue-600" /> Partially Paid
        </span>
      )
    }

    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
        Unpaid
      </span>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-bold animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* =========================================================================
          1. HEADER & PRIMARY WORKSPACE ACTIONS
         ========================================================================= */}
      <PageHeader
        titleEn="Billing & Collections"
        titleBn="বিলিং ও কালেকশন কন্ট্রোল"
        descriptionEn="Invoices, payments, receivables and customer collections"
        descriptionBn="চালান, পেমেন্ট আদায়, গ্রাহক বকেয়া ও কালেকশন নিয়ন্ত্রণ কেন্দ্র"
        icon={Receipt}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedCustomerIdForPayment(undefined)
                setSelectedInvoiceIdForPayment(undefined)
                setIsRecordPaymentOpen(true)
              }}
              className="text-xs font-bold h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1.5"
            >
              <DollarSign className="h-4 w-4" />
              <span>+ Receive Payment</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-xs h-9 gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Invoice</span>
            </Button>
          </div>
        }
      />

      {/* =========================================================================
          2. OWNER FINANCIAL SUMMARY (PERIOD-AWARE KPI CARDS)
         ========================================================================= */}
      <div className="space-y-3">
        {/* Period Selector Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-bold">
            {(['today', 'this_week', 'this_month'] as BillingPeriod[]).map((p) => {
              const labels: Record<BillingPeriod, string> = {
                today: 'Today',
                this_week: 'This Week',
                this_month: 'This Month',
                custom: 'Custom',
              }
              const isSelected = selectedPeriod === p
              return (
                <button
                  key={p}
                  onClick={() => setSelectedPeriod(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-md transition-all cursor-pointer',
                    isSelected
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  )}
                >
                  {labels[p]}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {overviewMetrics?.startDate} to {overviewMetrics?.endDate}
            </span>
            <button
              onClick={() => loadBillingData()}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              title="Refresh financial data"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Primary 6 Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Period Sales */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {overviewMetrics?.periodLabel || "Today's"} Sales
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              ৳ {formatBDT(overviewMetrics?.salesAmount || 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {overviewMetrics?.salesCount || 0} Invoices Billed
            </div>
          </Card>

          {/* 2. Period Collection */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              {overviewMetrics?.periodLabel || "Today's"} Collection
            </div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              ৳ {formatBDT(overviewMetrics?.collectionAmount || 0)}
            </div>
            <div className="text-[10px] text-emerald-600/80 font-mono mt-0.5">
              {overviewMetrics?.collectionCount || 0} Payments Received
            </div>
          </Card>

          {/* 3. Due Today */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Due Today
            </div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              ৳ {formatBDT(overviewMetrics?.dueTodayAmount || 0)}
            </div>
            <div className="text-[10px] text-amber-600/80 font-mono mt-0.5">
              {overviewMetrics?.dueTodayCount || 0} Invoices Maturing
            </div>
          </Card>

          {/* 4. Overdue */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-900/80 shadow-xs bg-rose-50/20">
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Overdue</span>
              {(overviewMetrics?.overdueAmount || 0) > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              )}
            </div>
            <div className="text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
              ৳ {formatBDT(overviewMetrics?.overdueAmount || 0)}
            </div>
            <div className="text-[10px] text-rose-600/80 font-mono mt-0.5">
              {overviewMetrics?.overdueCount || 0} Overdue Bills
            </div>
          </Card>

          {/* 5. Total Receivable */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Receivable
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              ৳ {formatBDT(overviewMetrics?.totalReceivables || 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">All Outstanding Balance</div>
          </Card>

          {/* 6. Collection Rate */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Collection Rate
            </div>
            <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1 flex items-baseline gap-1">
              <span>{overviewMetrics?.collectionRate || 0}%</span>
            </div>
            <div className="text-[10px] text-blue-600/80 font-mono mt-0.5">Collected ÷ Billed</div>
          </Card>
        </div>
      </div>

      {/* =========================================================================
          3. COLLECTION PRIORITY SECTION ("COLLECTION TODAY")
         ========================================================================= */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                !
              </div>
              <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Collection Today — Action Hub
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500 mt-0.5">
              Customers and overdue invoices requiring immediate attention and payment follow-up
            </CardDescription>
          </div>

          {/* Priority Filter Pills */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
            {[
              { id: 'all', label: 'All Attention' },
              { id: 'overdue', label: 'Overdue' },
              { id: 'due_today', label: 'Due Today' },
              { id: 'high_value', label: 'High Value Due' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPriorityTab(tab.id as any)}
                className={cn(
                  'px-2.5 py-1 rounded-md transition-all cursor-pointer',
                  priorityTab === tab.id
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredPriorityItems.length === 0 ? (
            <div className="p-8 text-center space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                All collections are up to date!
              </p>
              <p className="text-[11px] text-slate-500">No overdue or urgent maturing invoices in this view.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
              {filteredPriorityItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 hover:bg-slate-50/70 dark:hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                >
                  {/* Left info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {item.customerName}
                      </span>
                      {item.customerCompany && (
                        <span className="text-slate-500 text-[11px]">({item.customerCompany})</span>
                      )}
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                        #{item.invoiceNumber}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                      <span>Phone: <strong className="text-slate-700 dark:text-slate-300">{item.customerPhone}</strong></span>
                      <span>Due Date: {item.dueDate}</span>
                      <span>Total: ৳{formatBDT(item.grandTotal)}</span>
                      <span>Salesperson: {item.salespersonName || 'Commercial'}</span>
                    </div>
                  </div>

                  {/* Right: Due Amount prominence & Action buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                        ৳ {formatBDT(item.dueAmount)} DUE
                      </div>
                      {item.daysOverdue > 0 ? (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                          {item.daysOverdue} DAYS OVERDUE
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                          DUE TODAY
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendReminder(item.invoiceId)}
                        className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1"
                        title="Send WhatsApp Payment Reminder"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Remind</span>
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedCustomerIdForPayment(item.customerId)
                          setSelectedInvoiceIdForPayment(item.invoiceId)
                          setIsRecordPaymentOpen(true)
                        }}
                        className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Collect</span>
                      </Button>

                      <Link href={`/${slug}/billing/${item.invoiceId}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white px-2"
                          title="View Invoice Cockpit"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* =========================================================================
          4. MAIN TABS (INVOICES / PAYMENTS / RECEIVABLES)
         ========================================================================= */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => setActiveMainTab('invoices')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeMainTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices & Billing</span>
            <Badge className={cn('text-[10px] py-0 px-1.5', activeMainTab === 'invoices' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700')}>
              {invoices.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveMainTab('payments')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeMainTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span>Payments & Money Receipts</span>
            <Badge className={cn('text-[10px] py-0 px-1.5', activeMainTab === 'payments' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700')}>
              {payments.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveMainTab('receivables')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeMainTab === 'receivables'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Percent className="h-4 w-4" />
            <span>Receivables Aging & Control</span>
          </button>
        </div>

        {/* -------------------------------------------------------------------------
            TAB 1: INVOICES DIRECTORY & CONTROL
           ------------------------------------------------------------------------- */}
        {activeMainTab === 'invoices' && (
          <div className="space-y-4">
            {/* Filter Pills & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'all', label: 'All Invoices' },
                  { id: 'unpaid', label: 'Unpaid / Due' },
                  { id: 'overdue', label: 'Overdue' },
                  { id: 'partially_paid', label: 'Partially Paid' },
                  { id: 'paid', label: 'Paid' },
                  { id: 'due_today', label: 'Due Today' },
                  { id: 'vat', label: 'VAT 6.3' },
                  { id: 'written_off', label: 'Written Off' },
                  { id: 'cancelled', label: 'Cancelled' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setInvoiceFilterTab(f.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer shrink-0',
                      invoiceFilterTab === f.id
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Fast Tenant-Safe Search */}
              <div className="relative w-full md:w-72">
                <Input
                  placeholder="Search invoice #, customer, phone, BIN, job #..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs pr-8"
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Desktop Table / Mobile Cards */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Invoice</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 text-right">Paid</th>
                      <th className="p-3 text-right">Due</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Salesperson</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500 text-xs">
                          No invoices found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="p-3">
                            <Link
                              href={`/${slug}/billing/${inv.id}`}
                              className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <span>{inv.invoice_number}</span>
                              {inv.invoice_type === 'vat_invoice' && (
                                <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 text-[9px] py-0">
                                  VAT 6.3
                                </Badge>
                              )}
                            </Link>
                            {inv.order_number && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Order: {inv.order_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{inv.customer_phone}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-500">{inv.invoice_date}</td>
                          <td className="p-3 font-mono text-slate-500">{inv.due_date}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            ৳ {formatBDT(inv.grand_total)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                            ৳ {formatBDT(inv.paid_amount || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                            ৳ {formatBDT(inv.due_amount || 0)}
                          </td>
                          <td className="p-3 text-center">
                            {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {inv.salesperson_name || inv.created_by_name || 'Commercial'}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                                    setSelectedInvoiceIdForPayment(inv.id)
                                    setIsRecordPaymentOpen(true)
                                  }}
                                  className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 px-2"
                                  title="Receive payment for this invoice"
                                >
                                  Collect
                                </Button>
                              )}

                              <Link href={`/${slug}/billing/${inv.id}`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2 text-slate-600 dark:text-slate-300"
                                >
                                  View
                                </Button>
                              </Link>

                              {can('edit', 'invoices') && inv.due_amount > 0 && inv.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedInvoiceForWriteOff(inv)
                                    setWriteOffAmount(inv.due_amount)
                                  }}
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-purple-600"
                                  title="Record financial write-off"
                                >
                                  Write-off
                                </Button>
                              )}

                              {can('cancel', 'invoices') && inv.status !== 'cancelled' && inv.paid_amount === 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedInvoiceForCancel(inv)}
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-rose-600"
                                  title="Void / cancel invoice"
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">No invoices found.</div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/${slug}/billing/${inv.id}`}
                          className="font-mono font-bold text-blue-600 text-sm hover:underline"
                        >
                          #{inv.invoice_number}
                        </Link>
                        {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                      </div>

                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {inv.customer_phone} • Due: {inv.due_date}
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl flex items-center justify-between font-mono">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Total Bill</span>
                          <span className="font-bold text-slate-900 dark:text-white">
                            ৳ {formatBDT(inv.grand_total)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-rose-500 block uppercase font-bold">Outstanding Due</span>
                          <span className="font-black text-rose-600 text-sm">
                            ৳ {formatBDT(inv.due_amount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                              setSelectedInvoiceIdForPayment(inv.id)
                              setIsRecordPaymentOpen(true)
                            }}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Collect Payment
                          </Button>
                        )}
                        <Link href={`/${slug}/billing/${inv.id}`}>
                          <Button size="sm" variant="outline" className="h-8 text-xs font-bold">
                            View Cockpit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 2: PAYMENTS & MONEY RECEIPTS
           ------------------------------------------------------------------------- */}
        {activeMainTab === 'payments' && (
          <div className="space-y-4">
            {/* Payment Methods Summary Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {paymentMethodsSummary.map((pm) => (
                <Card key={pm.method} className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{pm.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-slate-500 truncate">{pm.label}</div>
                      <div className="text-sm font-black font-mono text-slate-900 dark:text-white mt-0.5">
                        ৳ {formatBDT(pm.totalAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{pm.transactionCount} txns</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Payments Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Payment Channel</th>
                      <th className="p-3 text-right">Amount Received</th>
                      <th className="p-3">Received By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {p.receipt_number}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{p.payment_date}</td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{p.customer_name}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="uppercase text-[10px] font-bold">
                              {p.payment_method}
                            </Badge>
                            {p.mfs_transaction_id && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Trx: {p.mfs_transaction_id}
                              </span>
                            )}
                            {p.cheque_number && (
                              <span className="text-[10px] font-mono text-slate-400 block">
                                Cheque: {p.cheque_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                            ৳ {formatBDT(p.amount)}
                          </td>
                          <td className="p-3 text-slate-500">{p.received_by_name}</td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPaymentForReceipt(p)
                                setIsReceiptModalOpen(true)
                              }}
                              className="h-7 text-xs font-bold text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 gap-1"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>View MR</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 3: RECEIVABLES AGING & SALESPERSON REPORTS
           ------------------------------------------------------------------------- */}
        {activeMainTab === 'receivables' && (
          <div className="space-y-6">
            {/* 6 Receivables Aging Buckets */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-purple-600" />
                <span>Receivables Aging Buckets</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {receivablesAging?.buckets.map((b) => (
                  <Card
                    key={b.bucket}
                    className={cn(
                      'p-3.5 border shadow-xs',
                      b.bucket === 'current'
                        ? 'bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                        : b.bucket === '90_plus' || b.bucket === '61_90'
                        ? 'bg-rose-50/40 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    )}
                  >
                    <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase">
                      {b.label}
                    </div>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                      ৳ {formatBDT(b.amount)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {b.invoiceCount} invoices • {b.customerCount} customers
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Customer Receivables Breakdown Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Customer Outstanding Ledger & Aging Breakdown
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-950/40 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3 text-right">Current</th>
                      <th className="p-3 text-right">1–7 Days</th>
                      <th className="p-3 text-right">8–30 Days</th>
                      <th className="p-3 text-right">31–60 Days</th>
                      <th className="p-3 text-right">61–90 Days</th>
                      <th className="p-3 text-right">90+ Days</th>
                      <th className="p-3 text-right">Total Outstanding</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receivablesAging?.customerAging.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                          No outstanding customer balances.
                        </td>
                      </tr>
                    ) : (
                      receivablesAging?.customerAging.map((c) => (
                        <tr key={c.customerId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="p-3">
                            <div className="font-bold text-slate-900 dark:text-white">{c.customerName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{c.customerPhone}</div>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600">৳ {formatBDT(c.current)}</td>
                          <td className="p-3 text-right font-mono text-slate-600">৳ {formatBDT(c.days1_7)}</td>
                          <td className="p-3 text-right font-mono text-slate-600">৳ {formatBDT(c.days8_30)}</td>
                          <td className="p-3 text-right font-mono text-amber-600">৳ {formatBDT(c.days31_60)}</td>
                          <td className="p-3 text-right font-mono text-rose-600 font-bold">৳ {formatBDT(c.days61_90)}</td>
                          <td className="p-3 text-right font-mono text-rose-700 font-black">৳ {formatBDT(c.days90Plus)}</td>
                          <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                            ৳ {formatBDT(c.currentOutstanding)}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerIdForPayment(c.customerId)
                                setSelectedInvoiceIdForPayment(undefined)
                                setIsRecordPaymentOpen(true)
                              }}
                              className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              Collect
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Collection by Salesperson Report */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                <CardTitle className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span>Collection Responsibility by Salesperson</span>
                </CardTitle>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 dark:bg-slate-950/40 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">Salesperson</th>
                      <th className="p-3 text-right">Total Billed</th>
                      <th className="p-3 text-right">Total Collected</th>
                      <th className="p-3 text-right">Outstanding Due</th>
                      <th className="p-3 text-right">Overdue Amount</th>
                      <th className="p-3 text-center">Oldest Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {salespersonStats.map((sp) => (
                      <tr key={sp.salespersonName} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="p-3 font-bold text-slate-900 dark:text-white">{sp.salespersonName}</td>
                        <td className="p-3 text-right font-mono">৳ {formatBDT(sp.totalBilled)}</td>
                        <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                          ৳ {formatBDT(sp.totalCollected)}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-600">
                          ৳ {formatBDT(sp.outstandingDue)}
                        </td>
                        <td className="p-3 text-right font-mono text-rose-600 font-bold">
                          ৳ {formatBDT(sp.overdueAmount)}
                        </td>
                        <td className="p-3 text-center font-mono text-slate-500">
                          {sp.oldestDueDays > 0 ? `${sp.oldestDueDays} days` : 'Current'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALS & WORKFLOWS
         ========================================================================= */}
      {/* 1. NEW INVOICE MODAL */}
      <NewInvoiceModal
        open={isNewInvoiceOpen}
        onOpenChange={setIsNewInvoiceOpen}
        onInvoiceCreated={(newInv) => {
          setInvoices((prev) => [newInv, ...prev.filter((i) => i.id !== newInv.id)])
          showNotification(`Invoice #${newInv.invoice_number} created successfully!`)
          loadBillingData()
        }}
      />

      {/* 2. RECEIVE PAYMENT MODAL */}
      <RecordPaymentModal
        open={isRecordPaymentOpen}
        onOpenChange={setIsRecordPaymentOpen}
        preselectedCustomerId={selectedCustomerIdForPayment}
        preselectedInvoiceId={selectedInvoiceIdForPayment}
        onPaymentRecorded={(payment) => {
          setSelectedPaymentForReceipt(payment)
          loadBillingData()
        }}
      />

      {/* 3. MONEY RECEIPT MODAL */}
      <MoneyReceiptModal
        open={isReceiptModalOpen}
        onOpenChange={setIsReceiptModalOpen}
        payment={selectedPaymentForReceipt}
      />

      {/* 4. NON-DESTRUCTIVE WRITE-OFF MODAL */}
      {selectedInvoiceForWriteOff && (
        <ModalDialog
          open={Boolean(selectedInvoiceForWriteOff)}
          onOpenChange={(v) => !v && setSelectedInvoiceForWriteOff(null)}
          title={
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-purple-600" />
              <span className="font-bold text-sm">Authorizing Financial Write-Off</span>
            </div>
          }
          hideFooter
        >
          <form onSubmit={handleConfirmWriteOff} className="space-y-4 text-xs pt-1">
            <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl space-y-1">
              <div className="font-bold text-purple-900 dark:text-purple-200">
                Invoice #{selectedInvoiceForWriteOff.invoice_number} — {selectedInvoiceForWriteOff.customer_name}
              </div>
              <div className="text-[11px] text-purple-700 dark:text-purple-300">
                Outstanding Due: <strong>৳{formatBDT(selectedInvoiceForWriteOff.due_amount)}</strong>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Write-Off Amount (৳)</Label>
              <Input
                type="number"
                value={writeOffAmount || ''}
                onChange={(e) => setWriteOffAmount(Math.min(selectedInvoiceForWriteOff.due_amount, Number(e.target.value) || 0))}
                max={selectedInvoiceForWriteOff.due_amount}
                min={1}
                className="font-mono font-bold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Business Reason / Authorization Note</Label>
              <Input
                placeholder="e.g. Approved bad-debt write-off by Board / Settlement discount..."
                value={writeOffReason}
                onChange={(e) => setWriteOffReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setSelectedInvoiceForWriteOff(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingWriteOff || writeOffAmount <= 0 || !writeOffReason.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isSubmittingWriteOff ? 'Authorizing...' : 'Authorize Write-Off'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* 5. CANCEL INVOICE MODAL */}
      {selectedInvoiceForCancel && (
        <ModalDialog
          open={Boolean(selectedInvoiceForCancel)}
          onOpenChange={(v) => !v && setSelectedInvoiceForCancel(null)}
          title={
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-rose-600" />
              <span className="font-bold text-sm">Void / Cancel Invoice</span>
            </div>
          }
          hideFooter
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 text-xs pt-1">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl space-y-1">
              <div className="font-bold text-rose-900 dark:text-rose-200">
                Cancel Invoice #{selectedInvoiceForCancel.invoice_number}
              </div>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                This will void the invoice balance and update customer receivables without erasing audit history.
              </p>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">Cancellation Reason</Label>
              <Input
                placeholder="e.g. Order cancelled by customer before production..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setSelectedInvoiceForCancel(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingCancel || !cancelReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                {isSubmittingCancel ? 'Cancelling...' : 'Confirm Void Invoice'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}
