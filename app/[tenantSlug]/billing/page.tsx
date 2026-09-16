'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, useParams } from 'next/navigation'
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
  SlidersHorizontal,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal, ReceivePaymentModal } from '@/components/billing/record-payment-modal'
import { MoneyReceiptModal } from '@/components/billing/money-receipt-modal'
import {
  InvoiceRecord,
  InvoiceStatus,
  InvoiceType,
  PaymentMethod,
  PaymentRecord,
  BillingPeriod,
  BillingOverviewMetrics,
  CollectionPriorityItem,
  ReceivablesAgingSummary,
  SalespersonCollectionStat,
  PaymentMethodSummaryItem,
} from '@/types/billing.types'
import { CustomerRecord } from '@/types/crm.types'
import { formatBDT, calculateDaysOverdue } from '@/lib/formatters'
import { usePermissions } from '@/hooks/use-permissions'
import {
  getBillingOverviewAction,
  getInvoicesAction,
  getPaymentsAction,
  getReceivablesAgingAction,
  deleteInvoiceAction,
  cancelInvoiceAction,
  sendInvoiceAction,
  sendPaymentReminderAction,
} from '@/actions/billing.actions'
import { cn } from '@/lib/utils'

export default function BillingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { can } = usePermissions()
  const { locale } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  // View Mode: 'overview' | 'invoices' | 'payments' | 'receivables'
  const viewParam = searchParams?.get('view')
  const initialTab = (viewParam === 'overview' || viewParam === 'invoices' || viewParam === 'payments' || viewParam === 'receivables')
    ? viewParam
    : 'overview'

  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'receivables'>(initialTab)

  // Period & Filters
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('today')
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
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false)
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState<string | undefined>(undefined)
  const [selectedInvoiceIdForPayment, setSelectedInvoiceIdForPayment] = useState<string | undefined>(undefined)
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)

  // Delete / Cancel Invoice Modal State
  const [selectedInvoiceForDelete, setSelectedInvoiceForDelete] = useState<InvoiceRecord | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false)

  // Cancellation Modal State
  const [selectedInvoiceForCancel, setSelectedInvoiceForCancel] = useState<InvoiceRecord | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false)

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Sync tab changes with URL search parameter
  const handleTabChange = (tab: 'overview' | 'invoices' | 'payments' | 'receivables') => {
    setActiveTab(tab)
    const currentQuery = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams()
    currentQuery.set('view', tab)
    router.replace(`/${slug}/billing?${currentQuery.toString()}`)
  }

  // Load authoritative data from PostgreSQL
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
      console.error('Failed to load authoritative billing data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [company?.id, selectedPeriod])

  useEffect(() => {
    loadBillingData()
  }, [loadBillingData])

  // Handle auto-open of modal from searchParams (e.g. ?create=true or ?receive=true)
  useEffect(() => {
    if (searchParams?.get('create') === 'true') {
      setIsNewInvoiceOpen(true)
    }
    if (searchParams?.get('receive') === 'true') {
      setIsReceivePaymentOpen(true)
    }
  }, [searchParams])

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
      if (invoiceFilterTab === 'vat') return inv.invoice_type === 'vat_invoice'
      return true
    })
  }, [invoices, search, invoiceFilterTab])

  // Filtered Priority Items
  const filteredPriorityItems = useMemo(() => {
    if (priorityTab === 'all') return priorityItems
    return priorityItems.filter((item) => item.priorityReason === priorityTab)
  }, [priorityItems, priorityTab])

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    const q = search.toLowerCase()
    return payments.filter((pay) => {
      if (!q) return true
      const matchReceipt = pay.receipt_number.toLowerCase().includes(q)
      const matchCust = pay.customer_name ? pay.customer_name.toLowerCase().includes(q) : false
      const matchTrx = pay.mfs_transaction_id ? pay.mfs_transaction_id.toLowerCase().includes(q) : false
      const matchRef = pay.cheque_number ? pay.cheque_number.toLowerCase().includes(q) : false
      const matchMethod = pay.payment_method.toLowerCase().includes(q)
      return matchReceipt || matchCust || matchTrx || matchRef || matchMethod
    })
  }, [payments, search])

  // Customer Receivables Summary (grouped by customer)
  const customerReceivables = useMemo(() => {
    const custMap = new Map<string, {
      customerId: string
      customerName: string
      customerPhone?: string
      totalDue: number
      totalInvoiced: number
      unpaidCount: number
      oldestDueDate: string
      maxDaysOverdue: number
      invoices: InvoiceRecord[]
    }>()

    invoices.forEach((inv) => {
      if (inv.due_amount > 0 && inv.status !== 'cancelled') {
        const key = inv.customer_id || inv.customer_name
        const existing = custMap.get(key)
        const daysOver = calculateDaysOverdue(inv.due_date)

        if (existing) {
          existing.totalDue += inv.due_amount
          existing.totalInvoiced += inv.grand_total
          existing.unpaidCount += 1
          existing.invoices.push(inv)
          if (daysOver > existing.maxDaysOverdue) {
            existing.maxDaysOverdue = daysOver
            existing.oldestDueDate = inv.due_date
          }
        } else {
          custMap.set(key, {
            customerId: inv.customer_id || '',
            customerName: inv.customer_name,
            customerPhone: inv.customer_phone,
            totalDue: inv.due_amount,
            totalInvoiced: inv.grand_total,
            unpaidCount: 1,
            oldestDueDate: inv.due_date,
            maxDaysOverdue: daysOver,
            invoices: [inv],
          })
        }
      }
    })

    const list = Array.from(custMap.values())
    const q = search.toLowerCase()
    if (!q) return list.sort((a, b) => b.totalDue - a.totalDue)

    return list
      .filter((c) => c.customerName.toLowerCase().includes(q) || (c.customerPhone && c.customerPhone.includes(q)))
      .sort((a, b) => b.totalDue - a.totalDue)
  }, [invoices, search])

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

  // Quick Action: Delete Invoice Submit
  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoiceForDelete) return

    setIsSubmittingDelete(true)
    try {
      const res = await deleteInvoiceAction(
        selectedInvoiceForDelete.id,
        deleteReason || 'Deleted by user',
        company?.id
      )

      if (res.success) {
        showNotification(`Invoice #${selectedInvoiceForDelete.invoice_number} deleted successfully.`)
        setSelectedInvoiceForDelete(null)
        setDeleteReason('')
        loadBillingData()
      } else {
        showNotification(res.error || 'Failed to delete invoice.')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error deleting invoice.')
    } finally {
      setIsSubmittingDelete(false)
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

  // Status Badge Helper
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
        titleBn="বিলিং ও কালেকশন"
        descriptionEn="Canonical financial workspace • Invoices, payments, and receivables"
        descriptionBn="চালান, পেমেন্ট আদায়, গ্রাহক বকেয়া ও কালেকশন নিয়ন্ত্রণ কেন্দ্র"
        icon={Receipt}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => {
                setSelectedCustomerIdForPayment(undefined)
                setSelectedInvoiceIdForPayment(undefined)
                setIsReceivePaymentOpen(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs h-9 gap-1.5 cursor-pointer"
            >
              <DollarSign className="h-4 w-4" />
              <span>Receive Payment</span>
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold shadow-xs h-9 gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          </div>
        }
      />

      {/* =========================================================================
          2. KPI SUMMARY CARDS (TOTAL INVOICED, COLLECTED, DUE, OVERDUE)
         ========================================================================= */}
      <div className="space-y-3">
        {/* Period Selector & Refresh Bar */}
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

        {/* 4 Core KPI Cards + 2 Context Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* 1. Total Invoiced */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Invoiced
            </div>
            <div className="text-lg font-black font-mono text-slate-900 dark:text-white mt-1">
              {formatBDT(overviewMetrics?.salesAmount || 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              {overviewMetrics?.salesCount || 0} Bills Generated
            </div>
          </Card>

          {/* 2. Collected */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Collected
            </div>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              {formatBDT(overviewMetrics?.collectionAmount || 0)}
            </div>
            <div className="text-[10px] text-emerald-600/80 font-mono mt-0.5">
              {overviewMetrics?.collectionCount || 0} Payments Received
            </div>
          </Card>

          {/* 3. Outstanding Due */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Outstanding Due
            </div>
            <div className="text-lg font-black font-mono text-amber-600 dark:text-amber-400 mt-1">
              {formatBDT(overviewMetrics?.outstandingDue ?? overviewMetrics?.totalReceivables ?? 0)}
            </div>
            <div className="text-[10px] text-amber-600/80 font-mono mt-0.5">
              {overviewMetrics?.outstandingDueCount ?? overviewMetrics?.dueTodayCount ?? 0} Bills Pending
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
              {formatBDT(overviewMetrics?.overdueAmount || 0)}
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
              {formatBDT(overviewMetrics?.totalReceivables || 0)}
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">All Ledger Balance</div>
          </Card>

          {/* 6. Collection Rate */}
          <Card className="p-3.5 bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Collection Rate
            </div>
            <div className="text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-1 flex items-baseline gap-1">
              <span>{overviewMetrics?.collectionRate || 0}%</span>
            </div>
            <div className="text-[10px] text-blue-600/80 font-mono mt-0.5">Collected ÷ Invoiced</div>
          </Card>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN TABS (OVERVIEW / INVOICES / PAYMENTS / RECEIVABLES)
         ========================================================================= */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            onClick={() => handleTabChange('overview')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('invoices')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices</span>
            <Badge className={cn('text-[10px] py-0 px-1.5', activeTab === 'invoices' ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-700')}>
              {invoices.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('payments')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span>Payments</span>
            <Badge className={cn('text-[10px] py-0 px-1.5', activeTab === 'payments' ? 'bg-emerald-800 text-white' : 'bg-slate-200 text-slate-700')}>
              {payments.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('receivables')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'receivables'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Percent className="h-4 w-4" />
            <span>Receivables</span>
            <Badge className={cn('text-[10px] py-0 px-1.5', activeTab === 'receivables' ? 'bg-purple-800 text-white' : 'bg-slate-200 text-slate-700')}>
              {customerReceivables.length}
            </Badge>
          </button>
        </div>

        {/* -------------------------------------------------------------------------
            TAB 1: OVERVIEW & COLLECTION PRIORITIES ACTION HUB
           ------------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Collection Today Action Hub */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                      !
                    </div>
                    <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Collection Priorities — Action Hub
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Customers and overdue bills requiring immediate collection
                  </CardDescription>
                </div>

                {/* Priority Filter Pills */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                  {[
                    { id: 'all', label: 'All Urgent' },
                    { id: 'overdue', label: 'Overdue' },
                    { id: 'due_today', label: 'Due Today' },
                    { id: 'high_value', label: 'High Value' },
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
                            <span>Total: {formatBDT(item.grandTotal)}</span>
                          </div>
                        </div>

                        {/* Right: Due Amount prominence & Action buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                          <div className="text-right">
                            <div className="font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                              {formatBDT(item.dueAmount)} DUE
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
                                setIsReceivePaymentOpen(true)
                              }}
                              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1 cursor-pointer"
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

            {/* Supplementary Overview Grids: Payment Methods & Salesperson Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payment Methods Breakdown */}
              <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
                <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Collection Channels ({overviewMetrics?.periodLabel || 'Selected Period'})
                </CardTitle>
                <div className="space-y-2">
                  {paymentMethodsSummary.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No payments received in this period.</p>
                  ) : (
                    paymentMethodsSummary.map((pm) => (
                      <div key={pm.method} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase">{pm.label || pm.method}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500 text-[11px]">{pm.transactionCount || 0} txns</span>
                          <strong className="text-emerald-600 font-black">{formatBDT(pm.totalAmount)}</strong>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Salesperson Collection Stats */}
              <Card className="p-4 border-slate-200 dark:border-slate-800 shadow-xs">
                <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                  Commercial Performance
                </CardTitle>
                <div className="space-y-2">
                  {salespersonStats.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No commercial collection records available.</p>
                  ) : (
                    salespersonStats.map((sp) => (
                      <div key={sp.salespersonId || sp.salespersonName} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{sp.salespersonName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{sp.customerCount || 0} Accounts</span>
                        </div>
                        <div className="text-right font-mono">
                          <div className="text-emerald-600 font-bold">{formatBDT(sp.totalCollected)}</div>
                          <div className="text-[10px] text-rose-500">Due: {formatBDT(sp.outstandingDue)}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 2: INVOICES DIRECTORY & CONTROL
           ------------------------------------------------------------------------- */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Filter Pills & Fast Search */}
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

              {/* Fast Search */}
              <div className="relative w-full md:w-72">
                <Input
                  placeholder="Search invoice #, customer, phone, BIN..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs pr-8 rounded-xl"
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Invoices List / Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Invoice #</th>
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
                            {formatBDT(inv.grand_total)}
                          </td>
                          <td className="p-3 text-right font-mono text-emerald-600 font-bold">
                            {formatBDT(inv.paid_amount || 0)}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                            {formatBDT(inv.due_amount || 0)}
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
                                  onClick={() => {
                                    setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                                    setSelectedInvoiceIdForPayment(inv.id)
                                    setIsReceivePaymentOpen(true)
                                  }}
                                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 shadow-xs cursor-pointer"
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

                              {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedInvoiceForDelete(inv)}
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-rose-600"
                                  title="Delete Invoice"
                                >
                                  Delete
                                </Button>
                              )}

                              {can('delete', 'invoices') && inv.paid_amount === 0 && inv.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedInvoiceForCancel(inv)}
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-rose-600"
                                  title="Cancel / Void Invoice"
                                >
                                  Void
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

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No invoices matching search filters.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div key={inv.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/${slug}/billing/${inv.id}`}
                          className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400"
                        >
                          #{inv.invoice_number}
                        </Link>
                        {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{inv.customer_name}</div>
                        <div className="text-xs text-slate-500 font-mono">{inv.customer_phone || 'No phone'}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Total</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{formatBDT(inv.grand_total)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-600 block">Paid</span>
                          <span className="font-bold text-emerald-600">{formatBDT(inv.paid_amount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-rose-600 block">Due</span>
                          <span className="font-black text-rose-600">{formatBDT(inv.due_amount || 0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400 font-mono">Date: {inv.invoice_date}</span>
                        <div className="flex items-center gap-2">
                          {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                                setSelectedInvoiceIdForPayment(inv.id)
                                setIsReceivePaymentOpen(true)
                              }}
                              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3"
                            >
                              Collect Due
                            </Button>
                          )}
                          <Link href={`/${slug}/billing/${inv.id}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs px-2.5">
                              View
                            </Button>
                          </Link>
                          {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoiceForDelete(inv)}
                              className="h-8 text-xs px-2 text-slate-400 hover:text-rose-600"
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 3: PAYMENTS HISTORY & MONEY RECEIPTS
           ------------------------------------------------------------------------- */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            {/* Search Payments */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-500 font-mono">
                Showing {filteredPayments.length} recorded payments
              </div>

              <div className="relative w-full md:w-72">
                <Input
                  placeholder="Search receipt #, customer, method, TrxID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs pr-8 rounded-xl"
                />
                <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400" />
              </div>
            </div>

            {/* Payments Table */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3">Receipt #</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Reference / TrxID</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Received By</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 text-xs">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                          <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {pay.receipt_number}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{pay.payment_date}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white">
                            {pay.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase text-[10px]">
                              {pay.payment_method}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-slate-500 text-[11px]">
                            {pay.mfs_transaction_id || pay.cheque_number || pay.bank_name || '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600 text-sm">
                            {formatBDT(pay.amount)}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {pay.received_by_name || 'Cashier'}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPaymentForReceipt(pay)
                                setIsReceiptModalOpen(true)
                              }}
                              className="h-7 text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                            >
                              <Receipt className="h-3 w-3" />
                              <span>Receipt</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View for Payments */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    No payment records found.
                  </div>
                ) : (
                  filteredPayments.map((pay) => (
                    <div key={pay.id} className="p-3.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {pay.receipt_number}
                        </span>
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase text-[10px]">
                          {pay.payment_method}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {pay.customer_name || 'Walk-in Customer'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {pay.payment_date} • By: {pay.received_by_name || 'Cashier'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-black text-emerald-600 text-base">
                            {formatBDT(pay.amount)}
                          </div>
                          {(pay.mfs_transaction_id || pay.cheque_number || pay.bank_name) && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              Ref: {pay.mfs_transaction_id || pay.cheque_number || pay.bank_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPaymentForReceipt(pay)
                            setIsReceiptModalOpen(true)
                          }}
                          className="h-8 text-xs font-semibold gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 cursor-pointer"
                        >
                          <Receipt className="h-3.5 w-3.5" />
                          <span>View Receipt</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {/* -------------------------------------------------------------------------
            TAB 4: RECEIVABLES AGING & CUSTOMER DUE CONTROL
           ------------------------------------------------------------------------- */}
        {activeTab === 'receivables' && (
          <div className="space-y-4">
            {/* Aging Summary Buckets */}
            {receivablesAging && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {receivablesAging.buckets.map((b) => (
                  <Card key={b.bucket} className="p-3 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {b.label}
                    </span>
                    <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                      {formatBDT(b.amount || 0)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {b.invoiceCount || 0} Bills • {b.customerCount || 0} Cust
                    </span>
                  </Card>
                ))}

                <Card className="p-3 bg-white dark:bg-slate-900 border-rose-300 dark:border-rose-900/80 shadow-xs bg-rose-50/20">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                    Total Overdue
                  </span>
                  <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                    {formatBDT(receivablesAging.totalOverdue || 0)}
                  </div>
                  <span className="text-[10px] text-rose-600/80 font-mono">Overdue Total</span>
                </Card>

                <Card className="p-3 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Total Receivables
                  </span>
                  <div className="text-base font-black font-mono text-slate-900 dark:text-white mt-1">
                    {formatBDT(receivablesAging.totalReceivables || 0)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">All Open Accounts</span>
                </Card>
              </div>
            )}

            {/* Customer Due List with Actionable Receive Payment Button */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <CardHeader className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Customer Receivables & Collection Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Select any customer to collect partial or full payment
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Filter customer name or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pr-8 rounded-lg"
                  />
                  <Search className="absolute right-2.5 top-2 h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3 text-center">Unpaid Bills</th>
                        <th className="p-3">Oldest Due Date</th>
                        <th className="p-3 text-center">Aging Status</th>
                        <th className="p-3 text-right">Outstanding Due</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customerReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-slate-500 text-xs">
                            No customers with outstanding due balances.
                          </td>
                        </tr>
                      ) : (
                        customerReceivables.map((c) => (
                          <tr key={c.customerId || c.customerName} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                            <td className="p-3">
                              <span className="font-bold text-slate-900 dark:text-white">{c.customerName}</span>
                            </td>
                            <td className="p-3 font-mono text-slate-500">{c.customerPhone || '—'}</td>
                            <td className="p-3 text-center font-mono font-bold text-blue-600">
                              {c.unpaidCount} Invoices
                            </td>
                            <td className="p-3 font-mono text-slate-500">{c.oldestDueDate}</td>
                            <td className="p-3 text-center">
                              {c.maxDaysOverdue > 0 ? (
                                <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                                  {c.maxDaysOverdue}d Overdue
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px]">
                                  Due Soon
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-sm">
                              {formatBDT(c.totalDue)}
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomerIdForPayment(c.customerId || undefined)
                                  setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
                                  setIsReceivePaymentOpen(true)
                                }}
                                className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer"
                              >
                                Receive Payment
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card List View for Receivables */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {customerReceivables.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No customers with outstanding due balances.
                    </div>
                  ) : (
                    customerReceivables.map((c) => (
                      <div key={c.customerId || c.customerName} className="p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {c.customerName}
                          </span>
                          {c.maxDaysOverdue > 0 ? (
                            <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold text-[10px]">
                              {c.maxDaysOverdue}d Overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 text-[10px]">
                              Due Soon
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">Phone: {c.customerPhone || '—'}</span>
                          <span className="text-blue-600 font-bold">{c.unpaidCount} Bills</span>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Oldest Due Date</span>
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{c.oldestDueDate}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">Total Outstanding</span>
                            <span className="font-mono font-black text-rose-600 text-sm">{formatBDT(c.totalDue)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end pt-1">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerIdForPayment(c.customerId || undefined)
                              setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
                              setIsReceivePaymentOpen(true)
                            }}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer"
                          >
                            Receive Payment
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. SHARED MODALS (RECEIVE PAYMENT, NEW INVOICE, WRITE-OFF, CANCEL)
         ========================================================================= */}
      {/* 1. SIMPLE DUE COLLECTION MODAL */}
      <RecordPaymentModal
        open={isReceivePaymentOpen}
        onOpenChange={setIsReceivePaymentOpen}
        preselectedCustomerId={selectedCustomerIdForPayment}
        preselectedInvoiceId={selectedInvoiceIdForPayment}
        onPaymentRecorded={(payment) => {
          showNotification(`Payment of ${formatBDT(payment.amount)} received successfully!`)
          loadBillingData()
        }}
      />

      {/* 2. MONEY RECEIPT MODAL */}
      {selectedPaymentForReceipt && (
        <MoneyReceiptModal
          open={isReceiptModalOpen}
          onOpenChange={setIsReceiptModalOpen}
          payment={selectedPaymentForReceipt}
        />
      )}

      {/* 3. NEW INVOICE MODAL */}
      <NewInvoiceModal
        open={isNewInvoiceOpen}
        onOpenChange={setIsNewInvoiceOpen}
        onInvoiceCreated={(inv) => {
          showNotification(`Invoice #${inv.invoice_number} created successfully.`)
          loadBillingData()
        }}
      />

      {/* 4. DELETE INVOICE MODAL */}
      {selectedInvoiceForDelete && (
        <ModalDialog
          open={!!selectedInvoiceForDelete}
          onOpenChange={(v) => !v && setSelectedInvoiceForDelete(null)}
          title={`Delete Invoice — #${selectedInvoiceForDelete.invoice_number}`}
          size="md"
          hideFooter
        >
          {selectedInvoiceForDelete.status === 'paid' || (selectedInvoiceForDelete.paid_amount || 0) >= (selectedInvoiceForDelete.grand_total || 0) ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong>Paid invoices cannot be deleted</strong> because they are part of the permanent financial record.
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Invoice: <strong>#{selectedInvoiceForDelete.invoice_number}</strong><br />
                Customer: <strong>{selectedInvoiceForDelete.customer_name}</strong><br />
                Total Paid: <strong className="font-mono">{formatBDT(selectedInvoiceForDelete.paid_amount || 0)}</strong>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInvoiceForDelete(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (selectedInvoiceForDelete.paid_amount || 0) > 0 ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong>Partially paid invoices cannot be deleted directly</strong> because financial payments are attached to this document. Please perform an authorized payment refund/reversal first.
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                Invoice: <strong>#{selectedInvoiceForDelete.invoice_number}</strong><br />
                Customer: <strong>{selectedInvoiceForDelete.customer_name}</strong><br />
                Paid: <strong className="font-mono text-emerald-600">{formatBDT(selectedInvoiceForDelete.paid_amount || 0)}</strong><br />
                Remaining Due: <strong className="font-mono text-rose-600">{formatBDT(selectedInvoiceForDelete.due_amount || 0)}</strong>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInvoiceForDelete(null)}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmDelete} className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1.5 font-mono">
                <div>Invoice: <strong className="text-slate-900 dark:text-white">#{selectedInvoiceForDelete.invoice_number}</strong></div>
                <div>Customer: <strong className="text-slate-900 dark:text-white">{selectedInvoiceForDelete.customer_name}</strong></div>
                <div>Amount: <strong className="text-slate-900 dark:text-white font-bold">{formatBDT(selectedInvoiceForDelete.grand_total)}</strong></div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                This invoice will be removed from normal billing views.
              </p>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Reason for Deletion</Label>
                <Input
                  placeholder="e.g. Draft invoice discarded / Customer cancelled order"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInvoiceForDelete(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingDelete}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  {isSubmittingDelete ? 'Deleting...' : 'Delete Invoice'}
                </Button>
              </div>
            </form>
          )}
        </ModalDialog>
      )}

      {/* 5. CANCEL / VOID INVOICE MODAL */}
      {selectedInvoiceForCancel && (
        <ModalDialog
          open={!!selectedInvoiceForCancel}
          onOpenChange={(v) => !v && setSelectedInvoiceForCancel(null)}
          title={`Void Invoice #${selectedInvoiceForCancel.invoice_number}`}
          size="md"
          hideFooter
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-1">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Are you sure you want to void this invoice? This will reverse any customer receivables.
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Cancellation Reason*</Label>
              <Input
                placeholder="e.g. Customer cancelled order before production"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedInvoiceForCancel(null)}>
                Keep Invoice
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCancel}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {isSubmittingCancel ? 'Voiding...' : 'Confirm Void Invoice'}
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}
    </div>
  )
}
