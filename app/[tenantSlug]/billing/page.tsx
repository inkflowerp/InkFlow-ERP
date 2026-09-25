'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, useParams, usePathname } from 'next/navigation'
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
  Trash2,
  Phone,
  ArrowUpRight,
  Wallet,
  Activity,
  BarChart3,
  X,
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
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { InvoiceRequestsPanel } from '@/components/billing/invoice-requests-panel'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
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
import type { InvoiceRequestRecord } from '@/types/workflow.types'
import { formatBDT, calculateDaysOverdue } from '@/lib/formatters'
import { usePermissions } from '@/hooks/use-permissions'
import {
  getBillingOverviewAction,
  getInvoicesAction,
  getPaymentsAction,
  getReceivablesAgingAction,
  deleteInvoiceAction,
  cancelInvoiceAction,
  sendPaymentReminderAction,
} from '@/actions/billing.actions'
import {
  getInvoiceRequestsAction,
  cancelInvoiceRequestAction,
} from '@/actions/invoice-request.actions'
import { getSectorForInvoice } from '@/lib/billing-utils'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'

export type BillingTab = 'overview' | 'invoices' | 'requests' | 'payments' | 'receivables'

function getTodayDateStr(): string {
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
}

function getLocalInvoices(slug?: string, companySlug?: string, companyId?: string): InvoiceRecord[] {
  if (typeof window === 'undefined') return []
  const invoiceMap = new Map<string, InvoiceRecord>()

  const candidateKeys = [
    STORAGE_KEYS.INVOICES,
    slug ? `${STORAGE_KEYS.INVOICES}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.INVOICES}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.INVOICES}__${companyId}` : null,
    `${STORAGE_KEYS.INVOICES}__rangao`,
    `${STORAGE_KEYS.INVOICES}__billing`,
    `${STORAGE_KEYS.INVOICES}__default`,
  ].filter(Boolean) as string[]

  candidateKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((inv) => {
            if (inv && inv.id) invoiceMap.set(inv.id, inv)
          })
        }
      }
    } catch {}
  })

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_KEYS.INVOICES)) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              parsed.forEach((inv) => {
                if (inv && inv.id) invoiceMap.set(inv.id, inv)
              })
            }
          }
        } catch {}
      }
    }
  } catch {}

  const storeItems = [
    ...(PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, slug) || []),
    ...(PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, companySlug) || []),
    ...(PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []),
  ]
  storeItems.forEach((inv) => {
    if (inv && inv.id) invoiceMap.set(inv.id, inv)
  })

  return Array.from(invoiceMap.values())
}

function getLocalPayments(slug?: string, companySlug?: string, companyId?: string): PaymentRecord[] {
  if (typeof window === 'undefined') return []
  const paymentMap = new Map<string, PaymentRecord>()

  const candidateKeys = [
    STORAGE_KEYS.PAYMENTS,
    slug ? `${STORAGE_KEYS.PAYMENTS}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.PAYMENTS}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.PAYMENTS}__${companyId}` : null,
    `${STORAGE_KEYS.PAYMENTS}__rangao`,
    `${STORAGE_KEYS.PAYMENTS}__billing`,
    `${STORAGE_KEYS.PAYMENTS}__default`,
  ].filter(Boolean) as string[]

  candidateKeys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((p) => {
            if (p && p.id) paymentMap.set(p.id, p)
          })
        }
      }
    } catch {}
  })

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(STORAGE_KEYS.PAYMENTS)) {
        try {
          const raw = localStorage.getItem(k)
          if (raw) {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) {
              parsed.forEach((p) => {
                if (p && p.id) paymentMap.set(p.id, p)
              })
            }
          }
        } catch {}
      }
    }
  } catch {}

  const storeItems = [
    ...(PrintERPDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, slug) || []),
    ...(PrintERPDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, companySlug) || []),
    ...(PrintERPDataStore.get<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS) || []),
  ]
  storeItems.forEach((p) => {
    if (p && p.id) paymentMap.set(p.id, p)
  })

  return Array.from(paymentMap.values())
}

function calculateBillingOverview(
  invoices: InvoiceRecord[],
  payments: PaymentRecord[],
  period: BillingPeriod,
  customRange?: { start: string; end: string }
): {
  metrics: BillingOverviewMetrics
  priorityItems: CollectionPriorityItem[]
  paymentMethods: PaymentMethodSummaryItem[]
  salespersonStats: SalespersonCollectionStat[]
} {
  const todayStr = getTodayDateStr()
  let startDate = todayStr
  let endDate = todayStr
  let periodLabel = 'This Month'

  if (period === 'today') {
    startDate = todayStr
    endDate = todayStr
    periodLabel = 'Today'
  } else if (period === 'this_week') {
    const d = new Date()
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(new Date().setDate(diff))
    try {
      startDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(monday)
    } catch {
      startDate = monday.toISOString().split('T')[0]
    }
    endDate = todayStr
    periodLabel = 'This Week'
  } else if (period === 'this_month') {
    startDate = `${todayStr.slice(0, 7)}-01`
    endDate = todayStr
    periodLabel = 'This Month'
  } else if (period === 'all_time') {
    startDate = '2000-01-01'
    endDate = todayStr
    periodLabel = 'All Time'
  } else if (period === 'custom' && customRange) {
    startDate = customRange.start || `${todayStr.slice(0, 7)}-01`
    endDate = customRange.end || todayStr
    periodLabel = 'Custom Date'
  }

  // Filter invoices for the period
  const periodInvoices = invoices.filter((inv) => {
    if (inv.status === 'cancelled') return false
    if (period === 'all_time') return true
    const invDate = inv.invoice_date || inv.created_at?.slice(0, 10) || todayStr
    return invDate >= startDate && invDate <= endDate
  })

  const salesAmount = periodInvoices.reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0)
  const salesCount = periodInvoices.length

  // Filter payments for the period
  const periodPayments = payments.filter((p) => {
    if (period === 'all_time') return true
    const pDate = p.payment_date || p.created_at?.slice(0, 10) || todayStr
    return pDate >= startDate && pDate <= endDate
  })

  const collectionAmount = periodPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const collectionCount = periodPayments.length

  // Open invoices for receivables (current balance)
  const openInvoices = invoices.filter((inv) => Number(inv.due_amount || 0) > 0.01 && inv.status !== 'cancelled')
  const totalReceivables = openInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)

  const dueTodayInvoices = openInvoices.filter((inv) => (inv.due_date || '').slice(0, 10) === todayStr)
  const dueTodayAmount = dueTodayInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)
  const dueTodayCount = dueTodayInvoices.length

  const overdueInvoices = openInvoices.filter((inv) => calculateDaysOverdue(inv.due_date) > 0)
  const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.due_amount || 0), 0)
  const overdueCount = overdueInvoices.length

  const outstandingDue = totalReceivables
  const outstandingDueCount = openInvoices.length

  const collectionRate =
    salesAmount > 0
      ? Math.min(100, Math.round((collectionAmount / salesAmount) * 100))
      : collectionAmount > 0
      ? 100
      : 0

  const metrics: BillingOverviewMetrics = {
    period,
    periodLabel,
    startDate,
    endDate,
    salesAmount,
    salesCount,
    collectionAmount,
    collectionCount,
    dueTodayAmount,
    dueTodayCount,
    outstandingDue,
    outstandingDueCount,
    overdueAmount,
    overdueCount,
    totalReceivables,
    collectionRate,
  }

  // Priority items
  const priorityItems: CollectionPriorityItem[] = []
  const seenIds = new Set<string>()

  // 1. Overdue
  const sortedOverdue = [...overdueInvoices].sort((a, b) => Number(b.due_amount) - Number(a.due_amount))
  for (const inv of sortedOverdue.slice(0, 20)) {
    if (!seenIds.has(inv.id)) {
      seenIds.add(inv.id)
      priorityItems.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id || '',
        customerName: inv.customer_name,
        customerCompany: inv.customer_company,
        customerPhone: inv.customer_phone,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        grandTotal: Number(inv.grand_total || 0),
        paidAmount: Number(inv.paid_amount || 0),
        dueAmount: Number(inv.due_amount || 0),
        daysOverdue: calculateDaysOverdue(inv.due_date),
        salespersonName: inv.salesperson_name || inv.created_by_name,
        status: inv.status,
        priorityReason: 'overdue',
      })
    }
  }

  // 2. Due today
  for (const inv of dueTodayInvoices) {
    if (!seenIds.has(inv.id)) {
      seenIds.add(inv.id)
      priorityItems.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id || '',
        customerName: inv.customer_name,
        customerCompany: inv.customer_company,
        customerPhone: inv.customer_phone,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        grandTotal: Number(inv.grand_total || 0),
        paidAmount: Number(inv.paid_amount || 0),
        dueAmount: Number(inv.due_amount || 0),
        daysOverdue: 0,
        salespersonName: inv.salesperson_name || inv.created_by_name,
        status: inv.status,
        priorityReason: 'due_today',
      })
    }
  }

  // 3. High value due (>= 25,000)
  for (const inv of openInvoices.filter((i) => Number(i.due_amount || 0) >= 25000)) {
    if (!seenIds.has(inv.id)) {
      seenIds.add(inv.id)
      priorityItems.push({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        customerId: inv.customer_id || '',
        customerName: inv.customer_name,
        customerCompany: inv.customer_company,
        customerPhone: inv.customer_phone,
        invoiceDate: inv.invoice_date,
        dueDate: inv.due_date,
        grandTotal: Number(inv.grand_total || 0),
        paidAmount: Number(inv.paid_amount || 0),
        dueAmount: Number(inv.due_amount || 0),
        daysOverdue: calculateDaysOverdue(inv.due_date),
        salespersonName: inv.salesperson_name || inv.created_by_name,
        status: inv.status,
        priorityReason: 'high_value',
      })
    }
  }

  // Payment methods breakdown
  const paymentsForMethods = periodPayments.length > 0 ? periodPayments : payments
  const methodMap: Record<string, { label: string; labelBn: string; icon: string; total: number; count: number }> = {
    cash: { label: 'Cash Counter', labelBn: 'ক্যাশ কাউন্টার', icon: '💵', total: 0, count: 0 },
    bkash: { label: 'bKash Merchant', labelBn: 'বিকাশ মার্চেন্ট', icon: '📱', total: 0, count: 0 },
    nagad: { label: 'Nagad Wallet', labelBn: 'নগদ ওয়ালেট', icon: '📱', total: 0, count: 0 },
    bank: { label: 'Bank Transfer (EFT / RTGS)', labelBn: 'ব্যাংক ট্রান্সফার', icon: '🏦', total: 0, count: 0 },
    cheque: { label: 'Bank Cheque', labelBn: 'ব্যাংক চেক', icon: '📝', total: 0, count: 0 },
    other_mfs: { label: 'Rocket / Other MFS', labelBn: 'অন্যান্য এমএফএস', icon: '💳', total: 0, count: 0 },
  }

  for (const p of paymentsForMethods) {
    const m = p.payment_method || 'cash'
    if (methodMap[m]) {
      methodMap[m].total += Number(p.amount || 0)
      methodMap[m].count += 1
    }
  }

  const paymentMethods: PaymentMethodSummaryItem[] = Object.entries(methodMap)
    .filter(([_, v]) => v.count > 0 || periodPayments.length === 0)
    .map(([key, item]) => ({
      method: key as any,
      label: item.label,
      labelBn: item.labelBn,
      icon: item.icon,
      totalAmount: item.total,
      transactionCount: item.count,
    }))

  // Commercial performance by salesperson
  const salespersonMap = new Map<string, SalespersonCollectionStat>()
  for (const inv of invoices) {
    const spName = inv.salesperson_name || inv.created_by_name || 'Commercial Desk'
    const existing = salespersonMap.get(spName) || {
      salespersonId: inv.salesperson_id || null,
      salespersonName: spName,
      totalBilled: 0,
      totalCollected: 0,
      outstandingDue: 0,
      overdueAmount: 0,
      customerCount: 0,
      oldestDueDays: 0,
    }

    existing.totalBilled += Number(inv.grand_total || 0)
    existing.totalCollected += Number(inv.paid_amount || 0)
    if (Number(inv.due_amount || 0) > 0.01 && inv.status !== 'cancelled') {
      existing.outstandingDue += Number(inv.due_amount || 0)
      const days = calculateDaysOverdue(inv.due_date)
      if (days > 0) {
        existing.overdueAmount += Number(inv.due_amount || 0)
        existing.oldestDueDays = Math.max(existing.oldestDueDays, days)
      }
    }
    existing.customerCount += 1
    salespersonMap.set(spName, existing)
  }

  const salespersonStats = Array.from(salespersonMap.values()).sort((a, b) => b.outstandingDue - a.outstandingDue)

  return {
    metrics,
    priorityItems,
    paymentMethods,
    salespersonStats,
  }
}

function BillingContent() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { company } = useTenant()
  const { can } = usePermissions()
  const { locale } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const [, setIsMounted] = useState(false)

  // View Mode: 'overview' | 'invoices' | 'requests' | 'payments' | 'receivables'
  const viewParam = searchParams?.get('view')
  const initialTab: BillingTab =
    viewParam === 'overview' ||
    viewParam === 'invoices' ||
    viewParam === 'requests' ||
    viewParam === 'payments' ||
    viewParam === 'receivables'
      ? (viewParam as BillingTab)
      : 'overview'

  const [activeTab, setActiveTab] = useState<BillingTab>(initialTab)

  // Period & Filters
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('this_month')
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  const [invoiceFilterTab, setInvoiceFilterTab] = useState<string>('all')
  const [sectorFilter, setSectorFilter] = useState<'all' | 'digital_print' | 'offset_print' | 'signage_fabrication' | 'ready_merchandise'>('all')
  const [priorityTab, setPriorityTab] = useState<'all' | 'due_today' | 'overdue' | 'high_value'>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // Data State with Stale-While-Revalidate Instant Hydration
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequestRecord[]>([])
  const [overviewMetrics, setOverviewMetrics] = useState<BillingOverviewMetrics | null>(null)
  const [priorityItems, setPriorityItems] = useState<CollectionPriorityItem[]>([])
  const [paymentMethodsSummary, setPaymentMethodsSummary] = useState<PaymentMethodSummaryItem[]>([])
  const [salespersonStats, setSalespersonStats] = useState<SalespersonCollectionStat[]>([])
  const [receivablesAging, setReceivablesAging] = useState<ReceivablesAgingSummary | null>(null)

  // Reactive client-side metrics calculation from live invoices and payments
  const clientOverview = useMemo(() => {
    return calculateBillingOverview(
      invoices,
      payments,
      selectedPeriod,
      selectedPeriod === 'custom' && customStartDate && customEndDate
        ? { start: customStartDate, end: customEndDate }
        : undefined
    )
  }, [invoices, payments, selectedPeriod, customStartDate, customEndDate])

  const effectiveMetrics = useMemo(() => {
    if (invoices.length > 0 || payments.length > 0) {
      return clientOverview.metrics
    }
    return overviewMetrics || clientOverview.metrics
  }, [invoices.length, payments.length, clientOverview.metrics, overviewMetrics])

  const effectivePriorities = useMemo(() => {
    if (invoices.length > 0) {
      return clientOverview.priorityItems
    }
    return priorityItems.length > 0 ? priorityItems : clientOverview.priorityItems
  }, [invoices.length, clientOverview.priorityItems, priorityItems])

  const effectivePaymentMethods = useMemo(() => {
    if (payments.length > 0) {
      return clientOverview.paymentMethods
    }
    return paymentMethodsSummary.length > 0 ? paymentMethodsSummary : clientOverview.paymentMethods
  }, [payments.length, clientOverview.paymentMethods, paymentMethodsSummary])

  const effectiveSalespersonStats = useMemo(() => {
    if (invoices.length > 0) {
      return clientOverview.salespersonStats
    }
    return salespersonStats.length > 0 ? salespersonStats : clientOverview.salespersonStats
  }, [invoices.length, clientOverview.salespersonStats, salespersonStats])

  // Modals State
  const actionParam = searchParams?.get('action')
  const orderIdParam = searchParams?.get('order_id') || undefined
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(actionParam === 'create_invoice')
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<string | undefined>(undefined)
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<string | undefined>(undefined)
  const [selectedCustomerNameForInvoice, setSelectedCustomerNameForInvoice] = useState<string | undefined>(undefined)
  const [selectedCustomerPhoneForInvoice, setSelectedCustomerPhoneForInvoice] = useState<string | undefined>(undefined)
  const [selectedCustomerEmailForInvoice, setSelectedCustomerEmailForInvoice] = useState<string | undefined>(undefined)
  const [selectedCustomerAddressForInvoice, setSelectedCustomerAddressForInvoice] = useState<string | undefined>(undefined)
  const [selectedCompanyNameForInvoice, setSelectedCompanyNameForInvoice] = useState<string | undefined>(undefined)
  const [selectedItemsForInvoice, setSelectedItemsForInvoice] = useState<any[] | undefined>(undefined)
  const [selectedRequestIdForInvoice, setSelectedRequestIdForInvoice] = useState<string | undefined>(undefined)
  const [selectedDesignJobIdForInvoice, setSelectedDesignJobIdForInvoice] = useState<string | undefined>(undefined)
  const [selectedItemsSummaryForInvoice, setSelectedItemsSummaryForInvoice] = useState<string | undefined>(undefined)
  const [selectedEstimatedAmountForInvoice, setSelectedEstimatedAmountForInvoice] = useState<number | undefined>(undefined)
  const [selectedNotesForInvoice, setSelectedNotesForInvoice] = useState<string | undefined>(undefined)
  const [selectedDiscountForInvoice, setSelectedDiscountForInvoice] = useState<number | undefined>(undefined)
  const [selectedVatForInvoice, setSelectedVatForInvoice] = useState<number | undefined>(undefined)
  const [selectedAdvanceForInvoice, setSelectedAdvanceForInvoice] = useState<number | undefined>(undefined)
  const [isReceivePaymentOpen, setIsReceivePaymentOpen] = useState(false)
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState<string | undefined>(undefined)
  const [selectedInvoiceIdForPayment, setSelectedInvoiceIdForPayment] = useState<string | undefined>(undefined)
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<PaymentRecord | null>(null)
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false)

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

  // Hydrate from localStorage on client mount safely to prevent SSR mismatch
  useEffect(() => {
    setIsMounted(true)
    try {
      const localInvs = getLocalInvoices(slug, company?.slug, company?.id)
      const localPays = getLocalPayments(slug, company?.slug, company?.id)
      const cachedRequests = PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []
      if (localInvs.length > 0) setInvoices(localInvs)
      if (localPays.length > 0) setPayments(localPays)
      if (cachedRequests.length > 0) setInvoiceRequests(cachedRequests)
      if (localInvs.length > 0 || localPays.length > 0) {
        setIsLoading(false)
      }
    } catch {
      // ignore
    }
  }, [slug, company?.slug, company?.id])

  // Sync tab changes with URL search parameter
  const handleTabChange = (tab: BillingTab) => {
    setActiveTab(tab)
    const currentQuery = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams()
    currentQuery.set('view', tab)
    router.replace(getTenantNavHref(`/billing?${currentQuery.toString()}`, pathname, slug))
  }

  // Pending Invoice Requests count
  const pendingRequestsCount = useMemo(() => {
    return invoiceRequests.filter((r) => r.status === 'pending').length
  }, [invoiceRequests])

  // Load authoritative data from PostgreSQL
  const loadBillingData = useCallback(async () => {
    if (!company?.id) return
    if (invoices.length === 0 && payments.length === 0) {
      setIsLoading(true)
    }

    try {
      const customRange =
        selectedPeriod === 'custom' && customStartDate && customEndDate
          ? { start: customStartDate, end: customEndDate }
          : undefined

      const [overviewRes, invRes, payRes, agingRes, reqRes] = await Promise.all([
        getBillingOverviewAction(selectedPeriod, customRange, company.id).catch(() => ({ success: false, data: null })),
        getInvoicesAction(undefined, company.id).catch(() => ({ success: false, data: [] })),
        getPaymentsAction(undefined, company.id).catch(() => ({ success: false, data: [] })),
        getReceivablesAgingAction(company.id).catch(() => ({ success: false, data: null })),
        getInvoiceRequestsAction(undefined, company.id).catch(() => ({ success: false, data: [] })),
      ])

      if (overviewRes && overviewRes.success && overviewRes.data) {
        setOverviewMetrics(overviewRes.data.metrics)
        setPriorityItems(overviewRes.data.priorityItems)
        setPaymentMethodsSummary(overviewRes.data.paymentMethods)
        setSalespersonStats(overviewRes.data.salespersonStats)
      }

      // Merge Invoices safely: Server updates matching IDs, but server NEVER wipes local invoices!
      const localInvs = getLocalInvoices(slug, company?.slug, company?.id)
      const invMap = new Map<string, InvoiceRecord>()
      invoices.forEach((inv) => {
        if (inv && inv.id) invMap.set(inv.id, inv)
      })
      localInvs.forEach((inv) => {
        if (inv && inv.id) invMap.set(inv.id, inv)
      })
      if (invRes && invRes.success && Array.isArray(invRes.data) && invRes.data.length > 0) {
        invRes.data.forEach((inv) => {
          if (inv && inv.id) invMap.set(inv.id, inv)
        })
      }
      const finalInvoices = Array.from(invMap.values())
      if (finalInvoices.length > 0) {
        setInvoices(finalInvoices)
      }

      // Merge Payments safely: Server updates matching IDs, but server NEVER wipes local payments!
      const localPays = getLocalPayments(slug, company?.slug, company?.id)
      const payMap = new Map<string, PaymentRecord>()
      payments.forEach((p) => {
        if (p && p.id) payMap.set(p.id, p)
      })
      localPays.forEach((p) => {
        if (p && p.id) payMap.set(p.id, p)
      })
      if (payRes && payRes.success && Array.isArray(payRes.data) && payRes.data.length > 0) {
        payRes.data.forEach((p) => {
          if (p && p.id) payMap.set(p.id, p)
        })
      }
      const finalPayments = Array.from(payMap.values())
      if (finalPayments.length > 0) {
        setPayments(finalPayments)
      }

      if (agingRes && agingRes.success && agingRes.data) {
        setReceivablesAging(agingRes.data)
      }

      let fetchedRequests: InvoiceRequestRecord[] = []
      if (reqRes && reqRes.success && Array.isArray(reqRes.data)) {
        fetchedRequests = reqRes.data
      }

      // Merge with local client-side data store for seamless resilience across tenant partitions
      const localRequests: InvoiceRequestRecord[] = [
        ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, slug) || []),
        ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, company.slug) || []),
        ...(PrintERPDataStore.getAll<InvoiceRequestRecord>(STORAGE_KEYS.INVOICE_REQUESTS, company.id) || []),
        ...(PrintERPDataStore.get<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS) || []),
      ]

      const isTenantMatch = (itemCompanyId?: string | null) => {
        if (!itemCompanyId) return false
        if (itemCompanyId === company.id || itemCompanyId === company.slug || itemCompanyId === slug) return true
        if (typeof company.id === 'string' && typeof itemCompanyId === 'string') {
          if (company.id.toLowerCase() === itemCompanyId.toLowerCase()) return true
        }
        if (typeof company.slug === 'string' && typeof itemCompanyId === 'string') {
          if (company.slug.toLowerCase() === itemCompanyId.toLowerCase()) return true
        }
        return false
      }

      const reqMap = new Map<string, InvoiceRequestRecord>()
      localRequests.forEach((r) => {
        if (r && r.id && isTenantMatch(r.company_id)) {
          reqMap.set(r.id, r)
        }
      })
      fetchedRequests.forEach((r) => {
        if (r && r.id) {
          reqMap.set(r.id, r)
        }
      })

      // Also check orders marked commercial_status: invoice_requested to guarantee visibility
      try {
        const orders = [
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, slug) || []),
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, company.slug) || []),
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, company.id) || []),
          ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []),
        ]
        orders.forEach((ord) => {
          if (
            ord &&
            ord.commercial_status === 'invoice_requested' &&
            isTenantMatch(ord.company_id)
          ) {
            const hasExisting = Array.from(reqMap.values()).some(
              (r) =>
                (ord.id && r.sales_order_id === ord.id) ||
                (ord.order_number && r.order_number === ord.order_number)
            )
            if (!hasExisting) {
              const reqId = `inv-req-order-${ord.id}`
              reqMap.set(reqId, {
                id: reqId,
                company_id: company.id,
                request_number: `INVR-${ord.order_number ? ord.order_number.replace('ORD-', '').replace('ORDER-', '') : Math.floor(1000 + Math.random() * 9000)}`,
                customer_id: ord.customer_id || null,
                customer_name: ord.customer_name || 'Customer',
                customer_phone: ord.customer_phone || null,
                customer_email: ord.customer_email || null,
                customer_address: ord.customer_address || null,
                company_name: ord.customer_company || ord.company_name || null,
                items: ord.items || [],
                sales_order_id: ord.id,
                order_number: ord.order_number || null,
                job_order_id: null,
                job_number: null,
                design_job_id: null,
                design_number: null,
                requested_by_id: null,
                requested_by_name: ord.created_by_name || 'Floor Staff',
                status: 'pending',
                items_summary:
                  ord.order_title ||
                  ord.items_summary ||
                  (Array.isArray(ord.items) && ord.items.length > 0
                    ? `${ord.items.length} items`
                    : 'Work Order Item'),
                estimated_amount: Number(ord.total_amount || ord.grand_total || ord.estimated_amount) || 0,
                notes: ord.notes || 'Work order marked Design Ready pending invoice generation',
                created_at: ord.invoice_requested_at || ord.created_at || new Date().toISOString(),
                updated_at: ord.updated_at || new Date().toISOString(),
              })
            }
          }
        })
      } catch {}

      // Also check design jobs marked commercial_status: invoice_requested to guarantee visibility
      try {
        const designJobs = [
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.DESIGN_JOBS, slug) || []),
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.DESIGN_JOBS, company.slug) || []),
          ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.DESIGN_JOBS, company.id) || []),
          ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.DESIGN_JOBS) || []),
        ]
        designJobs.forEach((dj) => {
          if (
            dj &&
            dj.commercial_status === 'invoice_requested' &&
            isTenantMatch(dj.company_id)
          ) {
            const hasExisting = Array.from(reqMap.values()).some(
              (r) =>
                (dj.id && r.design_job_id === dj.id) ||
                (dj.design_number && r.design_number === dj.design_number) ||
                (dj.sales_order_id && r.sales_order_id === dj.sales_order_id)
            )
            if (!hasExisting) {
              const reqId = dj.invoice_request_id || `inv-req-design-${dj.id}`
              reqMap.set(reqId, {
                id: reqId,
                company_id: company.id,
                request_number: `INVR-DSN-${dj.design_number ? dj.design_number.replace('DSN-', '').replace('DES-', '') : Math.floor(1000 + Math.random() * 9000)}`,
                customer_id: dj.customer_id || null,
                customer_name: dj.customer_name || 'Direct Customer',
                customer_phone: dj.customer_phone || null,
                customer_email: dj.customer_email || null,
                customer_address: dj.customer_address || null,
                company_name: dj.company_name || null,
                items: dj.items || [],
                sales_order_id: dj.sales_order_id || null,
                order_number: dj.order_number || null,
                job_order_id: null,
                job_number: null,
                design_job_id: dj.id,
                design_number: dj.design_number || null,
                requested_by_id: dj.assigned_designer_id || null,
                requested_by_name: dj.assigned_designer_name || 'Prepress Designer',
                status: 'pending',
                items_summary:
                  dj.title ||
                  dj.items_summary ||
                  (dj.dimensions_spec
                    ? `${dj.product_name || 'Design'} (${dj.dimensions_spec})`
                    : 'Design Artwork'),
                estimated_amount: Number(dj.estimated_amount) || 0,
                notes: dj.notes || 'Design completed by prepress designer pending official invoice generation',
                created_at: dj.updated_at || dj.created_at || new Date().toISOString(),
                updated_at: dj.updated_at || new Date().toISOString(),
              })
            }
          }
        })
      } catch {}

      const mergedList = Array.from(reqMap.values()).sort(
        (a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime()
      )
      setInvoiceRequests(mergedList)
    } catch (err) {
      console.error('Failed to load authoritative billing data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [company?.id, company?.slug, slug, selectedPeriod, customStartDate, customEndDate])

  useEffect(() => {
    loadBillingData()
  }, [loadBillingData])

  // Realtime multi-user and cross-tab auto-sync
  useEffect(() => {
    const handleRealtimeBillingSync = () => {
      loadBillingData()
    }
    window.addEventListener('printerp_table_synced:invoices', handleRealtimeBillingSync)
    window.addEventListener('printerp_table_synced:payments', handleRealtimeBillingSync)
    window.addEventListener('printerp_table_synced:invoice_requests', handleRealtimeBillingSync)
    window.addEventListener('printerp_data_sync', handleRealtimeBillingSync)

    return () => {
      window.removeEventListener('printerp_table_synced:invoices', handleRealtimeBillingSync)
      window.removeEventListener('printerp_table_synced:payments', handleRealtimeBillingSync)
      window.removeEventListener('printerp_table_synced:invoice_requests', handleRealtimeBillingSync)
      window.removeEventListener('printerp_data_sync', handleRealtimeBillingSync)
    }
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

  // Sector Counts for Invoices
  const sectorCounts = useMemo(() => {
    const counts = {
      all: invoices.length,
      digital_print: 0,
      offset_print: 0,
      signage_fabrication: 0,
      ready_merchandise: 0,
    }
    invoices.forEach((inv) => {
      const sec = getSectorForInvoice(inv)
      if (sec === 'digital_print') counts.digital_print++
      else if (sec === 'offset_print') counts.offset_print++
      else if (sec === 'signage_fabrication') counts.signage_fabrication++
      else if (sec === 'ready_merchandise') counts.ready_merchandise++
      else counts.digital_print++
    })
    return counts
  }, [invoices])

  // Sector Badge Helper
  const getSectorBadge = (sec: string) => {
    switch (sec) {
      case 'offset_print':
        return (
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] py-0 px-1.5 font-medium">
            📑 Offset
          </Badge>
        )
      case 'signage_fabrication':
        return (
          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-[10px] py-0 px-1.5 font-medium">
            💡 Signage
          </Badge>
        )
      case 'ready_merchandise':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] py-0 px-1.5 font-medium">
            🎁 Merch
          </Badge>
        )
      case 'digital_print':
      default:
        return (
          <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-[10px] py-0 px-1.5 font-medium">
            🎨 Digital
          </Badge>
        )
    }
  }

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

      if (sectorFilter !== 'all') {
        const sec = getSectorForInvoice(inv)
        if (sec !== sectorFilter) return false
      }

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
  }, [invoices, search, invoiceFilterTab, sectorFilter])

  // Filtered Priority Items
  const filteredPriorityItems = useMemo(() => {
    if (priorityTab === 'all') return effectivePriorities
    return effectivePriorities.filter((item) => item.priorityReason === priorityTab)
  }, [effectivePriorities, priorityTab])

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
    const filteredBySector = sectorFilter === 'all'
      ? list
      : list.filter((c) => c.invoices.some((inv) => getSectorForInvoice(inv) === sectorFilter))

    const q = search.toLowerCase()
    if (!q) return filteredBySector.sort((a, b) => b.totalDue - a.totalDue)

    return filteredBySector
      .filter((c) => c.customerName.toLowerCase().includes(q) || (c.customerPhone && c.customerPhone.includes(q)))
      .sort((a, b) => b.totalDue - a.totalDue)
  }, [invoices, search, sectorFilter])

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Paid
        </span>
      )
    }

    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/10 text-slate-700 dark:text-slate-400 border border-slate-500/20">
          <Ban className="h-3 w-3 text-slate-500" /> Cancelled
        </span>
      )
    }

    if (status === 'written_off') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
          Written Off
        </span>
      )
    }

    if (dueAmt > 0 && daysOverdue > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertOctagon className="h-3 w-3 text-rose-600 dark:text-rose-400" /> {daysOverdue}d Overdue
        </span>
      )
    }

    if (status === 'partially_paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" /> Partially Paid
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20">
        Unpaid
      </span>
    )
  }

  // Calculate health tier from collection rate
  const collectionRateNum = Number(effectiveMetrics?.collectionRate || 0)
  const healthTier =
    collectionRateNum >= 80
      ? { label: 'Optimal Flow', color: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500' }
      : collectionRateNum >= 60
      ? { label: 'Steady Pace', color: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500' }
      : { label: 'Needs Follow-up', color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900/95 text-white dark:bg-slate-100 dark:text-slate-900 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{notification}</span>
          <button
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-black cursor-pointer ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          1. HEADER & PRIMARY WORKSPACE ACTIONS
         ========================================================================= */}
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-sm shadow-blue-500/20">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>{locale === 'bn' ? 'বিলিং ও কালেকশন' : 'Billing & Collections'}</span>
                  <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 text-[10px] font-bold py-0.5">
                    Live BDT ৳
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn'
                    ? 'চালান, পেমেন্ট আদায়, গ্রাহক বকেয়া ও কালেকশন নিয়ন্ত্রণ কেন্দ্র'
                    : 'Canonical commercial finance workspace • Invoices, collection priorities & receivables'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={getTenantNavHref('/trash?tab=invoices', pathname, slug)}>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Trash Bin</span>
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={() => {
                setSelectedCustomerIdForPayment(undefined)
                setSelectedInvoiceIdForPayment(undefined)
                setIsReceivePaymentOpen(true)
              }}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-sm shadow-emerald-500/20 h-9 px-3.5 gap-1.5 cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
            >
              <DollarSign className="h-4 w-4" />
              <span>Collect Due</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewInvoiceOpen(true)}
              className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold shadow-sm shadow-blue-500/20 h-9 px-4 gap-1.5 cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>New Invoice</span>
            </Button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. KPI SUMMARY CARDS (TOTAL INVOICED, COLLECTED, DUE, OVERDUE)
         ========================================================================= */}
      <div className="space-y-3">
        {/* Period Selector & Custom Date-to-Date Range Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl text-xs font-bold">
              {(['today', 'this_week', 'this_month', 'all_time', 'custom'] as BillingPeriod[]).map((p) => {
                const labels: Record<BillingPeriod, string> = {
                  today: 'Today',
                  this_week: 'This Week',
                  this_month: 'This Month',
                  all_time: 'All Time',
                  custom: 'Custom Date',
                }
                const isSelected = selectedPeriod === p
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPeriod(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold',
                      isSelected
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    )}
                  >
                    {labels[p]}
                  </button>
                )
              })}
            </div>

            {/* Date-to-Date Range Inputs */}
            {selectedPeriod === 'custom' && (
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in fade-in slide-in-from-left-2">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  title="From Date"
                />
                <span className="text-slate-400 font-bold px-0.5 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                  title="To Date"
                />
                <Button
                  size="sm"
                  onClick={() => loadBillingData()}
                  className="h-7 px-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer rounded-lg"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-500 font-mono">
            <div className="flex items-center gap-1.5 bg-slate-100/60 dark:bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
              <span>
                {effectiveMetrics?.startDate} to {effectiveMetrics?.endDate}
              </span>
            </div>
            <button
              onClick={() => loadBillingData()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh financial metrics"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin text-blue-600')} />
            </button>
          </div>
        </div>

        {/* 6 Executive Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Total Invoiced */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Total Invoiced</span>
              <FileSpreadsheet className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1.5">
              {formatBDT(effectiveMetrics?.salesAmount || 0)}
            </div>
            <div className="text-[11px] text-slate-500 font-numeric tabular-nums mt-1 flex items-center gap-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{effectiveMetrics?.salesCount || 0}</span>
              <span>Bills Generated</span>
            </div>
          </Card>

          {/* 2. Collected */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              <span>Collected</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
              {formatBDT(effectiveMetrics?.collectionAmount || 0)}
            </div>
            <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-numeric tabular-nums mt-1 flex items-center gap-1">
              <span className="font-semibold">{effectiveMetrics?.collectionCount || 0}</span>
              <span>Payments Received</span>
            </div>
          </Card>

          {/* 3. Outstanding Due */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-amber-200/80 dark:border-amber-900/40 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              <span>Outstanding Due</span>
              <Clock className="h-3.5 w-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-amber-600 dark:text-amber-400 mt-1.5">
              {formatBDT(effectiveMetrics?.outstandingDue ?? effectiveMetrics?.totalReceivables ?? 0)}
            </div>
            <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-numeric tabular-nums mt-1 flex items-center gap-1">
              <span className="font-semibold">{effectiveMetrics?.outstandingDueCount ?? effectiveMetrics?.dueTodayCount ?? 0}</span>
              <span>Bills Pending</span>
            </div>
          </Card>

          {/* 4. Overdue */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-rose-300/80 dark:border-rose-900/50 shadow-xs hover:border-rose-400 dark:hover:border-rose-800 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
            <div className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>Overdue</span>
              {(effectiveMetrics?.overdueAmount || 0) > 0 ? (
                <span className="h-2 w-2 rounded-full bg-rose-600 animate-ping" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
              )}
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-rose-600 dark:text-rose-400 mt-1.5">
              {formatBDT(effectiveMetrics?.overdueAmount || 0)}
            </div>
            <div className="text-[11px] text-rose-600/90 font-numeric tabular-nums mt-1 flex items-center gap-1">
              <span className="font-semibold">{effectiveMetrics?.overdueCount || 0}</span>
              <span>Overdue Bills</span>
            </div>
          </Card>

          {/* 5. Total Receivable */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-violet-500" />
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Total Receivable</span>
              <Building className="h-3.5 w-3.5 text-purple-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1.5">
              {formatBDT(effectiveMetrics?.totalReceivables || 0)}
            </div>
            <div className="text-[11px] text-slate-500 font-numeric tabular-nums mt-1">All Open Accounts</div>
          </Card>

          {/* 6. Collection Efficiency Rate */}
          <Card className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-blue-200/80 dark:border-blue-900/40 shadow-xs hover:border-blue-300 dark:hover:border-blue-800 transition-all rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-500 to-blue-600" />
            <div className="flex items-center justify-between text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              <span>Collection Rate</span>
              <Activity className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-lg sm:text-xl font-black font-numeric tabular-nums text-blue-600 dark:text-blue-400 mt-1.5 flex items-baseline gap-1">
              <span>{effectiveMetrics?.collectionRate || 0}%</span>
              <span className={cn('text-[10px] font-bold', healthTier.color)}>({healthTier.label})</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', healthTier.bar)}
                style={{ width: `${Math.min(100, Math.max(0, collectionRateNum))}%` }}
              />
            </div>
          </Card>
        </div>
      </div>

      {/* =========================================================================
          3. MAIN TABS (OVERVIEW / INVOICES / REQUESTS / PAYMENTS / RECEIVABLES)
         ========================================================================= */}
      <div className="space-y-4">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => handleTabChange('overview')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'overview'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
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
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Invoices</span>
            <Badge className={cn('text-[10px] py-0 px-1.5 font-bold', activeTab === 'invoices' ? 'bg-blue-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')}>
              {invoices.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('requests')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'requests'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Invoice Requests</span>
            {pendingRequestsCount > 0 ? (
              <Badge className={cn('text-[10px] py-0 px-1.5 font-bold', activeTab === 'requests' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse')}>
                {pendingRequestsCount} Hold
              </Badge>
            ) : (
              <Badge className={cn('text-[10px] py-0 px-1.5 font-bold', activeTab === 'requests' ? 'bg-amber-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')}>
                {invoiceRequests.length}
              </Badge>
            )}
          </button>

          <button
            onClick={() => handleTabChange('payments')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'payments'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <DollarSign className="h-4 w-4" />
            <span>Payments</span>
            <Badge className={cn('text-[10px] py-0 px-1.5 font-bold', activeTab === 'payments' ? 'bg-emerald-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')}>
              {payments.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('receivables')}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer',
              activeTab === 'receivables'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
          >
            <Percent className="h-4 w-4" />
            <span>Receivables</span>
            <Badge className={cn('text-[10px] py-0 px-1.5 font-bold', activeTab === 'receivables' ? 'bg-purple-800 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300')}>
              {customerReceivables.length}
            </Badge>
          </button>
        </div>

        {/* -------------------------------------------------------------------------
            TAB 1: OVERVIEW & COLLECTION PRIORITIES ACTION HUB
           ------------------------------------------------------------------------- */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Commercial Hold Alert Banner */}
            {pendingRequestsCount > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                    ⚠️
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      <span>Commercial Hold Alert</span>
                      <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/30 text-[10px] py-0 font-bold">
                        {pendingRequestsCount} Pending Billing
                      </Badge>
                    </div>
                    <div className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                      Artwork is marked Design Ready by Prepress, but production floor is locked until official invoices are generated.
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleTabChange('requests')}
                  className="h-8 px-3.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs shrink-0 cursor-pointer gap-1.5 rounded-xl"
                >
                  <span>Review Requests</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Collection Today Action Hub */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                      !
                    </div>
                    <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Collection Priorities — Action Hub
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Customers and overdue bills requiring immediate commercial collection
                  </CardDescription>
                </div>

                {/* Priority Filter Pills */}
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold">
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
                        'px-2.5 py-1 rounded-lg transition-all cursor-pointer',
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
                  <div className="p-10 text-center space-y-2">
                    <CheckCircle2 className="h-9 w-9 text-emerald-500 mx-auto" />
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      All collections are up to date!
                    </p>
                    <p className="text-xs text-slate-500">No overdue or urgent maturing invoices in this view.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
                    {filteredPriorityItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors"
                      >
                        {/* Left info */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-slate-900 dark:text-white text-sm">
                              {item.customerName}
                            </span>
                            {item.customerCompany && (
                              <span className="text-slate-500 text-[11px] font-medium">({item.customerCompany})</span>
                            )}
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded-md">
                              #{item.invoiceNumber}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                            <span>Phone: {item.customerPhone ? (
                              <a
                                href={`tel:${item.customerPhone}`}
                                className="text-slate-700 dark:text-slate-300 font-bold hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                                title="Call Customer"
                              >
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{item.customerPhone}</span>
                              </a>
                            ) : (
                              <strong className="text-slate-400">—</strong>
                            )}</span>
                            <span>Due Date: {item.dueDate}</span>
                            <span>Total: {formatBDT(item.grandTotal)}</span>
                          </div>
                        </div>

                        {/* Right: Due Amount prominence & Action buttons */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                          <div className="text-right">
                            <div className="font-numeric tabular-nums font-black text-rose-600 dark:text-rose-400 text-base">
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
                              className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700/60 dark:text-emerald-300 gap-1 rounded-xl"
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
                              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs gap-1 cursor-pointer rounded-xl"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                              <span>Collect</span>
                            </Button>

                            <Link href={getTenantNavHref(`/billing/${item.invoiceId}`, pathname, slug)}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white px-2 rounded-xl"
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
              <Card className="p-4 border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-emerald-500" />
                    <span>Collection Channels ({effectiveMetrics?.periodLabel || 'Selected Period'})</span>
                  </CardTitle>
                </div>
                <div className="space-y-2.5">
                  {effectivePaymentMethods.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">No payments received in this period.</p>
                  ) : (
                    effectivePaymentMethods.map((pm) => {
                      const totalCollected = Number(effectiveMetrics?.collectionAmount) || 1
                      const pct = Math.min(100, Math.round((pm.totalAmount / totalCollected) * 100))
                      return (
                        <div key={pm.method} className="space-y-1">
                          <div className="flex items-center justify-between text-xs py-0.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 uppercase">{pm.label || pm.method}</span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-500 text-[11px]">{pm.transactionCount || 0} txns</span>
                              <strong className="text-emerald-600 font-bold">{formatBDT(pm.totalAmount)}</strong>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>

              {/* Salesperson Collection Stats */}
              <Card className="p-4 border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center justify-between mb-3">
                  <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <span>Commercial Performance</span>
                  </CardTitle>
                </div>
                <div className="space-y-2">
                  {effectiveSalespersonStats.length === 0 ? (
                    <p className="text-xs text-slate-500 italic py-4 text-center">No commercial collection records available.</p>
                  ) : (
                    effectiveSalespersonStats.map((sp) => (
                      <div key={sp.salespersonId || sp.salespersonName} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{sp.salespersonName}</span>
                          <span className="text-[10px] text-slate-400 block font-mono">{sp.customerCount || 0} Accounts Managed</span>
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
            {/* Sector Category Filters HUD */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', labelEn: 'All Sectors', labelBn: 'সকল সেক্টর', count: sectorCounts.all, icon: '🖨️' },
                { id: 'digital_print', labelEn: 'Digital Flex/Vinyl', labelBn: 'ডিজিটাল ব্যানার', count: sectorCounts.digital_print, icon: '🎨' },
                { id: 'offset_print', labelEn: 'Offset Press', labelBn: 'অফসেট প্রেস', count: sectorCounts.offset_print, icon: '📑' },
                { id: 'signage_fabrication', labelEn: '3D Signage', labelBn: '৩ডি সাইনেজ', count: sectorCounts.signage_fabrication, icon: '💡' },
                { id: 'ready_merchandise', labelEn: 'Merchandise', labelBn: 'মার্চেন্ডাইজ', count: sectorCounts.ready_merchandise, icon: '🎁' },
              ].map((sec) => {
                const isSelected = sectorFilter === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSectorFilter(sec.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <span>{sec.icon}</span>
                    <span>{locale === 'bn' ? sec.labelBn : sec.labelEn}</span>
                    <Badge
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-mono font-bold',
                        isSelected
                          ? 'bg-blue-800 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {sec.count}
                    </Badge>
                  </button>
                )
              })}
            </div>

            {/* Filter Pills & Fast Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Status Filter Pills */}
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
                      'px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0',
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
                  className="h-9 text-xs pr-8 rounded-xl bg-white dark:bg-slate-900"
                />
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Invoices List / Table */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5">Invoice # & Sector</th>
                      <th className="p-3.5">Customer & Phone</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Due Date</th>
                      <th className="p-3.5 text-right">Total</th>
                      <th className="p-3.5 text-right">Paid</th>
                      <th className="p-3.5 text-right">Due</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5">Salesperson</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-slate-500 text-xs">
                          No commercial invoices found matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
                                className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {inv.invoice_number}
                              </Link>
                              {getSectorBadge(getSectorForInvoice(inv))}
                              {inv.invoice_type === 'vat_invoice' && (
                                <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-[9px] py-0 px-1">
                                  VAT 6.3
                                </Badge>
                              )}
                            </div>
                            {inv.order_number && (
                              <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                                Order: {inv.order_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">{inv.customer_name}</div>
                            {inv.customer_phone ? (
                              <a
                                href={`tel:${inv.customer_phone}`}
                                className="text-[11px] text-slate-500 font-mono hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5"
                                title="Call Customer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3 text-slate-400" />
                                <span>{inv.customer_phone}</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">—</span>
                            )}
                          </td>
                          <td className="p-3.5 font-numeric tabular-nums text-slate-500">{inv.invoice_date}</td>
                          <td className="p-3.5 font-numeric tabular-nums text-slate-500">{inv.due_date}</td>
                          <td className="p-3.5 text-right font-numeric tabular-nums font-bold text-slate-900 dark:text-white">
                            {formatBDT(inv.grand_total)}
                          </td>
                          <td className="p-3.5 text-right font-numeric tabular-nums text-emerald-600 font-bold">
                            {formatBDT(inv.paid_amount || 0)}
                          </td>
                          <td className="p-3.5 text-right font-numeric tabular-nums font-bold text-rose-600 dark:text-rose-400">
                            {formatBDT(inv.due_amount || 0)}
                          </td>
                          <td className="p-3.5 text-center">
                            {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {inv.salesperson_name || inv.created_by_name || 'Commercial'}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendReminder(inv.id)}
                                    className="h-7 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 px-2 shadow-xs cursor-pointer rounded-lg"
                                    title="Send WhatsApp payment reminder"
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    <span>Remind</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                                      setSelectedInvoiceIdForPayment(inv.id)
                                      setIsReceivePaymentOpen(true)
                                    }}
                                    className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 shadow-xs cursor-pointer rounded-lg"
                                    title="Receive payment for this invoice"
                                  >
                                    Collect
                                  </Button>
                                </>
                              )}

                              <Link href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-xs px-2 text-slate-600 dark:text-slate-300 rounded-lg"
                                >
                                  View
                                </Button>
                              </Link>

                              {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedInvoiceForDelete(inv)}
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
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
                                  className="h-7 text-[11px] px-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
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
                  <div className="p-8 text-center text-xs text-slate-500">
                    No invoices matching search filters.
                  </div>
                ) : (
                  filteredInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
                            className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400"
                          >
                            #{inv.invoice_number}
                          </Link>
                          {getSectorBadge(getSectorForInvoice(inv))}
                        </div>
                        {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                      </div>

                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{inv.customer_name}</div>
                        {inv.customer_phone ? (
                          <a
                            href={`tel:${inv.customer_phone}`}
                            className="text-xs text-blue-600 dark:text-blue-400 font-mono inline-flex items-center gap-1 hover:underline mt-0.5"
                          >
                            <Phone className="h-3 w-3" />
                            <span>{inv.customer_phone}</span>
                          </a>
                        ) : (
                          <div className="text-xs text-slate-400 font-mono">No phone</div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs bg-slate-50/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
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
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSendReminder(inv.id)}
                                className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 px-2 rounded-lg"
                                title="Remind on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomerIdForPayment(inv.customer_id || undefined)
                                  setSelectedInvoiceIdForPayment(inv.id)
                                  setIsReceivePaymentOpen(true)
                                }}
                                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg"
                              >
                                Collect Due
                              </Button>
                            </>
                          )}
                          <Link href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}>
                            <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg">
                              View
                            </Button>
                          </Link>
                          {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedInvoiceForDelete(inv)}
                              className="h-8 text-xs px-2 text-slate-400 hover:text-rose-600 rounded-lg"
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
            TAB 3: INVOICE REQUESTS QUEUE (COMMERCIAL HOLD & PREPRESS BILLING)
           ------------------------------------------------------------------------- */}
        {activeTab === 'requests' && (
          <InvoiceRequestsPanel
            requests={invoiceRequests}
            isLoading={isLoading}
            tenantSlug={slug}
            onCreateInvoice={(req) => {
              let itemsToUse = req.items
              let phoneToUse = req.customer_phone
              let emailToUse = req.customer_email
              let addressToUse = req.customer_address
              let companyToUse = req.company_name
              let estAmountToUse = Number(req.estimated_amount) || undefined
              let notesToUse = req.notes || undefined
              let discountToUse: number | undefined = undefined
              let vatToUse: number | undefined = undefined
              let advanceToUse: number | undefined = undefined

              if (req.sales_order_id) {
                const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
                const linkedOrder = orders.find((o) => o.id === req.sales_order_id)
                if (linkedOrder) {
                  if (!phoneToUse) phoneToUse = linkedOrder.customer_phone
                  if (!addressToUse) addressToUse = linkedOrder.customer_address
                  if (!companyToUse) companyToUse = linkedOrder.company_name
                  if (!emailToUse && (linkedOrder.customer_email || linkedOrder.email)) {
                    emailToUse = linkedOrder.customer_email || linkedOrder.email
                  }
                  if (!estAmountToUse) estAmountToUse = Number(linkedOrder.final_price || linkedOrder.subtotal || 0)
                  if (!notesToUse && linkedOrder.notes) notesToUse = linkedOrder.notes
                  if (linkedOrder.discount_amount) discountToUse = Number(linkedOrder.discount_amount)
                  if (linkedOrder.advance_amount) advanceToUse = Number(linkedOrder.advance_amount)

                  if ((!itemsToUse || itemsToUse.length === 0) && Array.isArray(linkedOrder.items) && linkedOrder.items.length > 0) {
                    itemsToUse = linkedOrder.items.map((it: any) => ({
                      productId: it.product_id || it.productId || undefined,
                      product_id: it.product_id || it.productId || undefined,
                      item_kind: it.item_kind || 'service',
                      product_type: it.product_type || undefined,
                      itemName: it.item_name || it.itemName || 'Work Order Item',
                      item_name: it.item_name || it.itemName || 'Work Order Item',
                      material_spec: it.material_spec || undefined,
                      dimensions_spec: it.dimensions_spec || (it.width && it.height ? `${it.width}×${it.height} ${it.dimension_unit || 'ft'}` : undefined),
                      width: String(it.width ?? '0'),
                      height: String(it.height ?? '0'),
                      dimension_unit: it.dimension_unit || 'ft',
                      quantity: Number(it.quantity) || 1,
                      unit: it.unit || 'sft',
                      rate: Number(it.unit_price ?? it.rate ?? 0),
                      unit_price: Number(it.unit_price ?? it.rate ?? 0),
                      total_price: Number(it.total_price ?? 0),
                      finishing: it.finishing || 'None',
                      design_required: Boolean(it.design_required),
                    }))
                  }
                }
              }

              setSelectedCustomerForInvoice(req.customer_id || undefined)
              setSelectedOrderForInvoice(req.sales_order_id || undefined)
              setSelectedCustomerNameForInvoice(req.customer_name || undefined)
              setSelectedCustomerPhoneForInvoice(phoneToUse || undefined)
              setSelectedCustomerEmailForInvoice(emailToUse || undefined)
              setSelectedCustomerAddressForInvoice(addressToUse || undefined)
              setSelectedCompanyNameForInvoice(companyToUse || undefined)
              setSelectedItemsForInvoice(itemsToUse || undefined)
              setSelectedRequestIdForInvoice(req.id || undefined)
              setSelectedDesignJobIdForInvoice(req.design_job_id || undefined)
              setSelectedItemsSummaryForInvoice(req.items_summary || undefined)
              setSelectedEstimatedAmountForInvoice(estAmountToUse)
              setSelectedNotesForInvoice(notesToUse)
              setSelectedDiscountForInvoice(discountToUse)
              setSelectedVatForInvoice(vatToUse)
              setSelectedAdvanceForInvoice(advanceToUse)
              setIsNewInvoiceOpen(true)
            }}
            onCancelRequest={async (requestId, reason) => {
              const res = await cancelInvoiceRequestAction(requestId, reason, company?.id)
              if (res.success) {
                showNotification('Invoice request cancelled successfully.')
                loadBillingData()
              } else {
                showNotification(res.error || 'Failed to cancel invoice request.')
              }
            }}
            onRefresh={loadBillingData}
          />
        )}

        {/* -------------------------------------------------------------------------
            TAB 4: PAYMENTS HISTORY & MONEY RECEIPTS
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
                  className="h-9 text-xs pr-8 rounded-xl bg-white dark:bg-slate-900"
                />
                {search ? (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : (
                  <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-slate-400 pointer-events-none" />
                )}
              </div>
            </div>

            {/* Payments Table */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                    <tr>
                      <th className="p-3.5">Receipt #</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Method</th>
                      <th className="p-3.5">Reference / TrxID</th>
                      <th className="p-3.5 text-right">Amount</th>
                      <th className="p-3.5">Received By</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-500 text-xs">
                          No payment records found.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {pay.receipt_number}
                          </td>
                          <td className="p-3.5 font-mono text-slate-500">{pay.payment_date}</td>
                          <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                            {pay.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="p-3.5">
                            <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase text-[10px] rounded-md font-semibold">
                              {pay.payment_method}
                            </Badge>
                          </td>
                          <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                            {pay.mfs_transaction_id || pay.cheque_number || pay.bank_name || '—'}
                          </td>
                          <td className="p-3.5 text-right font-numeric tabular-nums font-black text-emerald-600 text-sm">
                            {formatBDT(pay.amount)}
                          </td>
                          <td className="p-3.5 text-slate-600 dark:text-slate-300">
                            {pay.received_by_name || 'Cashier'}
                          </td>
                          <td className="p-3.5 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPaymentForReceipt(pay)
                                setIsReceiptModalOpen(true)
                              }}
                              className="h-7 text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer rounded-lg"
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
                  <div className="p-8 text-center text-xs text-slate-500">
                    No payment records found.
                  </div>
                ) : (
                  filteredPayments.map((pay) => (
                    <div key={pay.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {pay.receipt_number}
                        </span>
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 uppercase text-[10px] rounded-md">
                          {pay.payment_method}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {pay.customer_name || 'Walk-in Customer'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
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
                          className="h-8 text-xs font-semibold gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer rounded-lg"
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
            TAB 5: RECEIVABLES AGING & CUSTOMER DUE CONTROL
           ------------------------------------------------------------------------- */}
        {activeTab === 'receivables' && (
          <div className="space-y-4">
            {/* Sector Category Filters HUD */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', labelEn: 'All Sectors', labelBn: 'সকল সেক্টর', count: sectorCounts.all, icon: '🖨️' },
                { id: 'digital_print', labelEn: 'Digital Flex/Vinyl', labelBn: 'ডিজিটাল ব্যানার', count: sectorCounts.digital_print, icon: '🎨' },
                { id: 'offset_print', labelEn: 'Offset Press', labelBn: 'অফসেট প্রেস', count: sectorCounts.offset_print, icon: '📑' },
                { id: 'signage_fabrication', labelEn: '3D Signage', labelBn: '৩ডি সাইনেজ', count: sectorCounts.signage_fabrication, icon: '💡' },
                { id: 'ready_merchandise', labelEn: 'Merchandise', labelBn: 'মার্চেন্ডাইজ', count: sectorCounts.ready_merchandise, icon: '🎁' },
              ].map((sec) => {
                const isSelected = sectorFilter === sec.id
                return (
                  <button
                    key={sec.id}
                    onClick={() => setSectorFilter(sec.id as any)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <span>{sec.icon}</span>
                    <span>{locale === 'bn' ? sec.labelBn : sec.labelEn}</span>
                    <Badge
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-mono font-bold',
                        isSelected
                          ? 'bg-blue-800 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {sec.count}
                    </Badge>
                  </button>
                )
              })}
            </div>

            {/* Aging Summary Buckets */}
            {receivablesAging && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {receivablesAging.buckets.map((b) => (
                  <Card key={b.bucket} className="p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      {b.label}
                    </span>
                    <div className="text-base font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1">
                      {formatBDT(b.amount || 0)}
                    </div>
                    <span className="text-xs text-slate-400 font-numeric tabular-nums">
                      {b.invoiceCount || 0} Bills • {b.customerCount || 0} Cust
                    </span>
                  </Card>
                ))}

                <Card className="p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-rose-300/80 dark:border-rose-900/50 shadow-xs bg-rose-50/20 rounded-2xl">
                  <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">
                    Total Overdue
                  </span>
                  <div className="text-base font-black font-numeric tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                    {formatBDT(receivablesAging.totalOverdue || 0)}
                  </div>
                  <span className="text-xs text-rose-600/80 font-numeric tabular-nums">Overdue Debt</span>
                </Card>

                <Card className="p-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-300/80 dark:border-slate-700/80 shadow-xs rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Total Receivables
                  </span>
                  <div className="text-base font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1">
                    {formatBDT(receivablesAging.totalReceivables || 0)}
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">All Open Accounts</span>
                </Card>
              </div>
            )}

            {/* Customer Due List with Actionable Receive Payment Button */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
              <CardHeader className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Customer Receivables & Collection Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Select any customer to send payment reminder or collect payment
                  </CardDescription>
                </div>

                <div className="relative w-full sm:w-64">
                  <Input
                    placeholder="Filter customer name or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs pr-8 rounded-xl bg-white dark:bg-slate-900"
                  />
                  <Search className="absolute right-2.5 top-2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="p-3.5">Customer</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5 text-center">Unpaid Bills</th>
                        <th className="p-3.5">Oldest Due Date</th>
                        <th className="p-3.5 text-center">Aging Status</th>
                        <th className="p-3.5 text-right">Outstanding Due</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {customerReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-slate-500 text-xs">
                            No customers with outstanding due balances matching filters.
                          </td>
                        </tr>
                      ) : (
                        customerReceivables.map((c) => (
                          <tr key={c.customerId || c.customerName} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="p-3.5">
                              <span className="font-bold text-slate-900 dark:text-white">{c.customerName}</span>
                            </td>
                            <td className="p-3.5 font-mono text-slate-500">
                              {c.customerPhone ? (
                                <a
                                  href={`tel:${c.customerPhone}`}
                                  className="text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1"
                                  title="Call Customer"
                                >
                                  <Phone className="h-3 w-3 text-slate-400" />
                                  <span>{c.customerPhone}</span>
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3.5 text-center font-mono font-bold text-blue-600">
                              {c.unpaidCount} Invoices
                            </td>
                            <td className="p-3.5 font-mono text-slate-500">{c.oldestDueDate}</td>
                            <td className="p-3.5 text-center">
                              {c.maxDaysOverdue > 0 ? (
                                <Badge className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20 font-bold text-[10px] rounded-md">
                                  {c.maxDaysOverdue}d Overdue
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-[10px] rounded-md">
                                  Due Soon
                                </Badge>
                              )}
                            </td>
                            <td className="p-3.5 text-right font-numeric tabular-nums font-black text-rose-600 dark:text-rose-400 text-sm">
                              {formatBDT(c.totalDue)}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {c.invoices[0] && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleSendReminder(c.invoices[0].id)}
                                    className="h-7 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 px-2 cursor-pointer rounded-lg"
                                    title="Send WhatsApp payment reminder"
                                  >
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    <span>Remind</span>
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCustomerIdForPayment(c.customerId || undefined)
                                    setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
                                    setIsReceivePaymentOpen(true)
                                  }}
                                  className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer rounded-lg"
                                >
                                  Collect Due
                                </Button>
                              </div>
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
                    <div className="p-8 text-center text-xs text-slate-500">
                      No customers with outstanding due balances matching filters.
                    </div>
                  ) : (
                    customerReceivables.map((c) => (
                      <div key={c.customerId || c.customerName} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {c.customerName}
                          </span>
                          {c.maxDaysOverdue > 0 ? (
                            <Badge className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20 font-bold text-[10px] rounded-md">
                              {c.maxDaysOverdue}d Overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-[10px] rounded-md">
                              Due Soon
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                          {c.customerPhone ? (
                            <a
                              href={`tel:${c.customerPhone}`}
                              className="text-blue-600 dark:text-blue-400 font-mono inline-flex items-center gap-1 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              <span>{c.customerPhone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-500">Phone: —</span>
                          )}
                          <span className="text-blue-600 font-bold">{c.unpaidCount} Bills</span>
                        </div>

                        <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono">Oldest Due Date</span>
                            <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{c.oldestDueDate}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-mono">Total Outstanding</span>
                            <span className="font-mono font-black text-rose-600 text-sm">{formatBDT(c.totalDue)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          {c.invoices[0] && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(c.invoices[0].id)}
                              className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 px-2 rounded-lg"
                              title="Remind on WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5 mr-1" />
                              <span>Remind</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedCustomerIdForPayment(c.customerId || undefined)
                              setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
                              setIsReceivePaymentOpen(true)
                            }}
                            className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer rounded-lg"
                          >
                            Collect Due
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
        initialInvoices={invoices}
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

      {/* 3. NEW INVOICE MODAL (UNTOUCHED COMPONENT) */}
      <NewInvoiceModal
        open={isNewInvoiceOpen}
        onOpenChange={(v) => {
          setIsNewInvoiceOpen(v)
          if (!v) {
            setSelectedOrderForInvoice(undefined)
            setSelectedCustomerForInvoice(undefined)
            setSelectedCustomerNameForInvoice(undefined)
            setSelectedCustomerPhoneForInvoice(undefined)
            setSelectedCustomerEmailForInvoice(undefined)
            setSelectedCustomerAddressForInvoice(undefined)
            setSelectedCompanyNameForInvoice(undefined)
            setSelectedItemsForInvoice(undefined)
            setSelectedRequestIdForInvoice(undefined)
            setSelectedDesignJobIdForInvoice(undefined)
            setSelectedItemsSummaryForInvoice(undefined)
            setSelectedEstimatedAmountForInvoice(undefined)
            setSelectedNotesForInvoice(undefined)
            setSelectedDiscountForInvoice(undefined)
            setSelectedVatForInvoice(undefined)
            setSelectedAdvanceForInvoice(undefined)
          }
        }}
        preselectedSalesOrderId={selectedOrderForInvoice || orderIdParam}
        preselectedCustomerId={selectedCustomerForInvoice}
        preselectedCustomerName={selectedCustomerNameForInvoice}
        preselectedCustomerPhone={selectedCustomerPhoneForInvoice}
        preselectedCustomerEmail={selectedCustomerEmailForInvoice}
        preselectedCustomerAddress={selectedCustomerAddressForInvoice}
        preselectedCompanyName={selectedCompanyNameForInvoice}
        preselectedItems={selectedItemsForInvoice}
        preselectedRequestId={selectedRequestIdForInvoice}
        preselectedDesignJobId={selectedDesignJobIdForInvoice}
        preselectedItemsSummary={selectedItemsSummaryForInvoice}
        preselectedEstimatedAmount={selectedEstimatedAmountForInvoice}
        preselectedNotes={selectedNotesForInvoice}
        preselectedDiscountAmount={selectedDiscountForInvoice}
        preselectedVatPercentage={selectedVatForInvoice}
        preselectedAdvanceAmount={selectedAdvanceForInvoice}
        onInvoiceCreated={async (inv) => {
          if (selectedRequestIdForInvoice) {
            try {
              const { InvoiceRequestRepository } = await import('@/lib/repositories/invoice-request.repository')
              await InvoiceRequestRepository.resolveRequestWithInvoice(
                { requestId: selectedRequestIdForInvoice },
                inv.id,
                inv.invoice_number,
                company?.id || slug
              )
            } catch {}
          }
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

export default function BillingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Receipt className="h-7 w-7 text-blue-600 animate-pulse" />
          <p className="text-xs font-medium text-slate-500">Loading Billing Workspace...</p>
        </div>
      }
    >
      <BillingContent />
    </React.Suspense>
  )
}
