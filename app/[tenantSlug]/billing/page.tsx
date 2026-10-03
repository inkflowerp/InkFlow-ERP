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
 ChevronDown,
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
 MoreVertical,
 Eye,
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
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

export type BillingTab = 'invoices' | 'requests' | 'payments' | 'receivables'

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
 slug ? `${STORAGE_KEYS.INVOICES}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.INVOICES}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.INVOICES}__${companyId}` : null,
  ].filter(Boolean) as string[]

 const isMatchingTenant = (inv: any): boolean => {
 if (!inv || !inv.id) return false
 if (!companyId && !slug && !companySlug) return true
 const cId = inv.company_id ? String(inv.company_id).toLowerCase().trim() : null
 const targetId = companyId ? String(companyId).toLowerCase().trim() : null
 const targetSlug = slug ? String(slug).toLowerCase().trim() : null
 const targetCompanySlug = companySlug ? String(companySlug).toLowerCase().trim() : null

 if (cId) {
 return Boolean(
        (targetId && cId === targetId) ||
        (targetSlug && cId === targetSlug) ||
        (targetCompanySlug && cId === targetCompanySlug)
      )
    }
 return false
  }

 candidateKeys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((inv) => {
 if (isMatchingTenant(inv)) invoiceMap.set(inv.id, inv)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(slug ? (PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, companySlug) || []) : []),
    ...(companyId ? (PrintERPDataStore.getAll<InvoiceRecord>(STORAGE_KEYS.INVOICES, companyId) || []) : []),
  ]
 storeItems.forEach((inv) => {
 if (isMatchingTenant(inv)) invoiceMap.set(inv.id, inv)
  })

 return Array.from(invoiceMap.values())
}

function getLocalPayments(slug?: string, companySlug?: string, companyId?: string): PaymentRecord[] {
 if (typeof window === 'undefined') return []
 const paymentMap = new Map<string, PaymentRecord>()

 const candidateKeys = [
 slug ? `${STORAGE_KEYS.PAYMENTS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.PAYMENTS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.PAYMENTS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 const isMatchingTenant = (p: any): boolean => {
 if (!p || !p.id) return false
 if (!companyId && !slug && !companySlug) return true
 const cId = p.company_id ? String(p.company_id).toLowerCase().trim() : null
 const targetId = companyId ? String(companyId).toLowerCase().trim() : null
 const targetSlug = slug ? String(slug).toLowerCase().trim() : null
 const targetCompanySlug = companySlug ? String(companySlug).toLowerCase().trim() : null

 if (cId) {
 return Boolean(
        (targetId && cId === targetId) ||
        (targetSlug && cId === targetSlug) ||
        (targetCompanySlug && cId === targetCompanySlug)
      )
    }
 return false
  }

 candidateKeys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((p) => {
 if (isMatchingTenant(p)) paymentMap.set(p.id, p)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(slug ? (PrintERPDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintERPDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, companySlug) || []) : []),
    ...(companyId ? (PrintERPDataStore.getAll<PaymentRecord>(STORAGE_KEYS.PAYMENTS, companyId) || []) : []),
  ]
 storeItems.forEach((p) => {
 if (isMatchingTenant(p)) paymentMap.set(p.id, p)
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
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
 const [, setIsMounted] = useState(false)

  // View Mode: 'invoices' | 'requests' | 'payments' | 'receivables'
 const viewParam = searchParams?.get('view')
 const initialTab: BillingTab =
 viewParam === 'requests' ||
 viewParam === 'payments' ||
 viewParam === 'receivables'
      ? (viewParam as BillingTab)
      : 'invoices'

 const [activeTab, setActiveTab] = useState<BillingTab>(initialTab)

  // Period & Filters
 const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>('today')
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

  // 3-dot dropdown menu state for invoice row actions
 const [activeMenuInvoiceId, setActiveMenuInvoiceId] = useState<string | null>(null)

  // Close invoice actions menu on click outside or escape key
 useEffect(() => {
 const handleDocumentClick = (e: MouseEvent) => {
 const target = e.target as HTMLElement | null
 if (!target?.closest('[data-invoice-menu]')) {
 setActiveMenuInvoiceId(null)
      }
    }
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setActiveMenuInvoiceId(null)
      }
    }
 document.addEventListener('click', handleDocumentClick)
 document.addEventListener('keydown', handleKeyDown)
 return () => {
 document.removeEventListener('click', handleDocumentClick)
 document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Close menu when switching tabs, periods, or filters
 useEffect(() => {
 setActiveMenuInvoiceId(null)
  }, [activeTab, invoiceFilterTab, sectorFilter, search, selectedPeriod])

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
          <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-2xs py-0 px-1.5 font-medium">
            📑 Offset
          </Badge>
        )
 case 'signage_fabrication':
 return (
          <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20 text-2xs py-0 px-1.5 font-medium">
            💡 Signage
          </Badge>
        )
 case 'ready_merchandise':
 return (
          <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-2xs py-0 px-1.5 font-medium">
            🎁 Merch
          </Badge>
        )
 case 'digital_print':
 default:
 return (
          <Badge className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 text-2xs py-0 px-1.5 font-medium">
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

 if (invoiceFilterTab === 'today') {
 const todayStr = new Date().toISOString().split('T')[0]
 return (
 inv.invoice_date === todayStr ||
 inv.due_date === todayStr ||
          (Boolean(inv.created_at) && inv.created_at.startsWith(todayStr))
        )
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
  }, [invoices, search, invoiceFilterTab])

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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400"/> Paid
        </span>
      )
    }

 if (status === 'cancelled') {
 return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-muted0/10 text-foreground border border-border/20">
          <Ban className="h-3 w-3 text-muted-foreground"/> Cancelled
        </span>
      )
    }

 if (status === 'written_off') {
 return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20">
 Written Off
        </span>
      )
    }

 if (dueAmt > 0 && daysOverdue > 0) {
 return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-pulse">
          <AlertOctagon className="h-3 w-3 text-rose-600 dark:text-rose-400"/> {daysOverdue}d Overdue
        </span>
      )
    }

 if (status === 'partially_paid') {
 return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400"/> Partially Paid
        </span>
      )
    }

 return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-400 border border-amber-500/20">
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
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-surface-inset text-foreground backdrop-blur-md rounded-xl shadow-lg border border-white/10 dark:border-black/10 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-emerald-400 dark:text-emerald-600 shrink-0"/>
          <span>{notification}</span>
          <button
 onClick={() => setNotification(null)}
 className="p-1 text-muted-foreground hover:text-foreground dark:hover:text-black cursor-pointer ml-1">
            <X className="h-3.5 w-3.5"/>
          </button>
        </div>
      )}

      {/* =========================================================================
          1. HEADER & PRIMARY WORKSPACE ACTIONS
         ========================================================================= */}
      <PageHeader
 titleEn="Billing & Collections"titleBn="বিলিং ও কালেকশন"descriptionEn="Canonical commercial finance workspace • Invoices, collection priorities & receivables"descriptionBn="চালান, পেমেন্ট আদায়, গ্রাহক বকেয়া ও কালেকশন নিয়ন্ত্রণ কেন্দ্র"icon={Receipt}
 badge={
          <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-2xs font-bold py-0.5">
 Live BDT ৳
          </Badge>
        }
 actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
 variant="outline"size="sm"onClick={() => {
 setSelectedCustomerIdForPayment(undefined)
 setSelectedInvoiceIdForPayment(undefined)
 setIsReceivePaymentOpen(true)
              }}
 className="gap-1.5">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400"/>
              <span>{tBilingual('Collect Due', 'বকেয়া আদায়')}</span>
            </Button>

            <Button
 size="sm"onClick={() => setIsNewInvoiceOpen(true)}
 className="gap-1.5">
              <Plus className="h-4 w-4"/>
              <span>{tBilingual('New Invoice', 'নতুন চালান')}</span>
            </Button>
          </div>
        }
      />

      {/* =========================================================================
          2. KPI SUMMARY CARDS (TOTAL INVOICED, COLLECTED, DUE, OVERDUE)
         ========================================================================= */}
      <div className="space-y-3">
        {/* 6 Executive Metric Cards */}
        <KpiGrid columns={6}>
          {/* 1. Total Invoiced */}
          <KpiCard
 titleEn="Total Invoiced"titleBn="মোট চালানের মূল্য"value={effectiveMetrics?.salesAmount || 0}
 isCurrency
 icon={FileSpreadsheet}
 colorVariant="blue"subtitleEn={`${effectiveMetrics?.salesCount || 0} Bills Generated`}
 subtitleBn={`${effectiveMetrics?.salesCount || 0}টি বিল তৈরি`}
          />

          {/* 2. Collected */}
          <KpiCard
 titleEn="Collected"titleBn="মোট আদায়"value={effectiveMetrics?.collectionAmount || 0}
 isCurrency
 icon={ShieldCheck}
 colorVariant="emerald"subtitleEn={`${effectiveMetrics?.collectionCount || 0} Payments Received`}
 subtitleBn={`${effectiveMetrics?.collectionCount || 0}টি পেমেন্ট সম্পন্ন`}
          />

          {/* 3. Outstanding Due */}
          <KpiCard
 titleEn="Outstanding Due"titleBn="চলতি বকেয়া"value={effectiveMetrics?.outstandingDue ?? effectiveMetrics?.totalReceivables ?? 0}
 isCurrency
 icon={Clock}
 colorVariant="amber"subtitleEn={`${effectiveMetrics?.outstandingDueCount ?? effectiveMetrics?.dueTodayCount ?? 0} Bills Pending`}
 subtitleBn={`${effectiveMetrics?.outstandingDueCount ?? effectiveMetrics?.dueTodayCount ?? 0}টি বিল বকেয়া`}
          />

          {/* 4. Overdue */}
          <KpiCard
 titleEn="Overdue"titleBn="মেয়াদোত্তীর্ণ বকেয়া"value={effectiveMetrics?.overdueAmount || 0}
 isCurrency
 icon={AlertTriangle}
 colorVariant="danger"badge={(effectiveMetrics?.overdueAmount || 0) > 0 ? 'Urgent' : undefined}
 badgeColor="bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"subtitleEn={`${effectiveMetrics?.overdueCount || 0} Overdue Bills`}
 subtitleBn={`${effectiveMetrics?.overdueCount || 0}টি বকেয়া বিল`}
          />

          {/* 5. Total Receivable */}
          <KpiCard
 titleEn="Total Receivable"titleBn="মোট পাওনা"value={effectiveMetrics?.totalReceivables || 0}
 isCurrency
 icon={Building}
 colorVariant="purple"subtitleEn="All Open Accounts"subtitleBn="সকল চলমান হিসাব"/>

          {/* 6. Collection Efficiency Rate */}
          <KpiCard
 titleEn="Collection Rate"titleBn="আদায়ের হার"value={`${effectiveMetrics?.collectionRate || 0}%`}
 icon={Activity}
 colorVariant="cyan"subtitle={healthTier.label}
          >
            <div className="w-full bg-muted h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div
 className={cn('h-full rounded-full transition-all duration-500', healthTier.bar)}
 style={{ width: `${Math.min(100, Math.max(0, collectionRateNum))}%` }}
              />
            </div>
          </KpiCard>
        </KpiGrid>
      </div>

      {/* =========================================================================
          3. MAIN TABS (INVOICES / REQUESTS / PAYMENTS / RECEIVABLES) + PERIOD SELECTOR
         ========================================================================= */}
      <div className="space-y-4">
        {/* Unified Single Row Toolbar: Search | Status Filter (Dropdown) | [ Invoices, Requests, Payments, Receivables ] --- Selected Date | Date filter (dropdown) | Refresh */}
        <Card className="p-2.5 sm:p-3 shadow-xs border-border rounded-xl bg-card/80 backdrop-blur-md">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
            {/* Left: Search, Status Filter Dropdown & Main Module Tabs */}
            <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-0">
              {/* 1. Search */}
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none"/>
                <Input
 placeholder={tBilingual('Search invoice #, customer, phone, BIN...', 'ইনভয়েস নং, গ্রাহক, ফোন বা বিআইএন দিয়ে খুঁজুন...')} value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 pr-8 text-xs h-9 font-medium rounded-xl border-border bg-card shadow-2xs"/>
                {search && (
                  <button
 type="button"onClick={() => setSearch('')}
 className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-muted-foreground cursor-pointer">
                    <X className="h-4 w-4"/>
                  </button>
                )}
              </div>

              {/* 2. Status Filter (Dropdown) */}
              {activeTab === 'invoices' && (
                <div className="relative shrink-0">
                  <select
 value={invoiceFilterTab}
 onChange={(e) => setInvoiceFilterTab(e.target.value)}
 className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-semibold text-foreground shadow-2xs focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none">
                    <option value="all">{tBilingual('All Invoices', 'সকল ইনভয়েস')} ({invoices.length})</option>
                    <option value="unpaid">{tBilingual('Unpaid / Due', 'বকেয়া')} ({invoices.filter((i) => (i.due_amount || 0) > 0 && i.status !== 'cancelled').length})</option>
                    <option value="overdue">{tBilingual('Overdue', 'মেয়াদোত্তীর্ণ')} ({effectiveMetrics?.overdueCount || 0})</option>
                    <option value="paid">{tBilingual('Paid', 'পরিশোধিত')} ({invoices.filter((i) => i.status === 'paid' || ((i.due_amount || 0) <= 0 && i.status !== 'cancelled')).length})</option>
                    <option value="partially_paid">{tBilingual('Partially Paid', 'আংশিক পরিশোধিত')} ({invoices.filter((i) => (i.paid_amount || 0) > 0 && (i.due_amount || 0) > 0 && i.status !== 'cancelled').length})</option>
                    <option value="vat">{tBilingual('VAT 6.3 Tax Invoices', 'মূসক ৬.৩ কর চালান')} ({invoices.filter((i) => i.invoice_type === 'vat_invoice').length})</option>
                    <option value="cancelled">{tBilingual('Cancelled', 'বাতিল')} ({invoices.filter((i) => i.status === 'cancelled').length})</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                    <ChevronDown className="h-3.5 w-3.5"/>
                  </div>
                </div>
              )}

              {/* 3. Main Module Tabs [Invoices, Invoice Requests, Payments, Receivables] */}
              <div className="flex items-center gap-1 bg-muted p-0.5 rounded-xl border border-border /60 text-xs shrink-0 overflow-x-auto scrollbar-none">
                <button
 type="button"onClick={() => handleTabChange('invoices')}
 className={cn(
                    'h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
 activeTab === 'invoices'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  )}
                >
                  <Receipt className="h-3.5 w-3.5"/>
                  <span className="bangla-text">{tBilingual('Invoices', 'ইনভয়েস')}</span>
                  <Badge className={cn('text-2xs py-0 px-1 font-bold', activeTab === 'invoices' ? 'bg-blue-800 text-white' : 'bg-muted text-foreground ')}>
                    {invoices.length}
                  </Badge>
                </button>

                <button
 type="button"onClick={() => handleTabChange('requests')}
 className={cn(
                    'h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
 activeTab === 'requests'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  )}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5"/>
                  <span className="bangla-text">{tBilingual('Invoice Requests', 'ইনভয়েস রিকোয়েস্ট')}</span>
                  {pendingRequestsCount > 0 ? (
                    <Badge className={cn('text-2xs py-0 px-1 font-bold', activeTab === 'requests' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 animate-pulse')}>
                      {pendingRequestsCount} {tBilingual('Hold', 'অপেক্ষমাণ')}
                    </Badge>
                  ) : (
                    <Badge className={cn('text-2xs py-0 px-1 font-bold', activeTab === 'requests' ? 'bg-amber-800 text-white' : 'bg-muted text-foreground ')}>
                      {invoiceRequests.length}
                    </Badge>
                  )}
                </button>

                <button
 type="button"onClick={() => handleTabChange('payments')}
 className={cn(
                    'h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
 activeTab === 'payments'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  )}
                >
                  <DollarSign className="h-3.5 w-3.5"/>
                  <span className="bangla-text">{tBilingual('Payments', 'পেমেন্ট')}</span>
                  <Badge className={cn('text-2xs py-0 px-1 font-bold', activeTab === 'payments' ? 'bg-emerald-800 text-white' : 'bg-muted text-foreground ')}>
                    {payments.length}
                  </Badge>
                </button>

                <button
 type="button"onClick={() => handleTabChange('receivables')}
 className={cn(
                    'h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0',
 activeTab === 'receivables'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-muted-foreground hover:text-foreground dark:hover:text-foreground'
                  )}
                >
                  <Percent className="h-3.5 w-3.5"/>
                  <span className="bangla-text">{tBilingual('Customer Due', 'বকেয়া/পাওনা')}</span>
                  <Badge className={cn('text-2xs py-0 px-1 font-bold', activeTab === 'receivables' ? 'bg-purple-800 text-white' : 'bg-muted text-foreground ')}>
                    {customerReceivables.length}
                  </Badge>
                </button>
              </div>
            </div>

            {/* Right: Selected Date, Date Filter (Dropdown) & Refresh */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0 justify-end">
              {/* 4. Selected Date */}
              {selectedPeriod === 'custom' ? (
                <div className="flex items-center gap-1.5 bg-muted px-2 py-1 rounded-xl border border-border text-xs shadow-2xs">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0"/>
                  <input
 type="date"value={customStartDate}
 onChange={(e) => setCustomStartDate(e.target.value)}
 className="px-2 py-0.5 rounded-lg bg-card border border-input text-foreground tabular-nums text-xs focus:ring-1 focus:ring-ring outline-none h-7"title="From Date"/>
                  <span className="text-muted-foreground font-bold px-0.5 text-xs">to</span>
                  <input
 type="date"value={customEndDate}
 onChange={(e) => setCustomEndDate(e.target.value)}
 className="px-2 py-0.5 rounded-lg bg-card border border-input text-foreground tabular-nums text-xs focus:ring-1 focus:ring-ring outline-none h-7"title="To Date"/>
                  <Button
 size="sm"onClick={() => loadBillingData()}
 className="h-7 px-2 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer rounded-lg">
 Apply
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-xl border border-border /60 text-xs font-semibold text-muted-foreground tabular-nums whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0"/>
                  <span>
                    {effectiveMetrics?.startDate === effectiveMetrics?.endDate
                      ? effectiveMetrics?.startDate
                      : `${effectiveMetrics?.startDate} to ${effectiveMetrics?.endDate}`}
                  </span>
                </div>
              )}

              {/* 5. Date filter (dropdown) */}
              <div className="relative shrink-0">
                <select
 value={selectedPeriod}
 onChange={(e) => setSelectedPeriod(e.target.value as BillingPeriod)}
 className="h-9 pl-3 pr-8 rounded-xl border border-border bg-card text-xs font-semibold text-foreground shadow-2xs focus:ring-1 focus:ring-ring outline-none cursor-pointer appearance-none">
                  <option value="today">{tBilingual('Today', 'আজ')}</option>
                  <option value="this_week">{tBilingual('This Week', 'এই সপ্তাহ')}</option>
                  <option value="this_month">{tBilingual('This Month', 'এই মাস')}</option>
                  <option value="all_time">{tBilingual('All Time', 'সর্বমোট')}</option>
                  <option value="custom">{tBilingual('Custom Date', 'কাস্টম তারিখ')}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-muted-foreground">
                  <ChevronDown className="h-3.5 w-3.5"/>
                </div>
              </div>

              {/* 6. Refresh */}
              <button
 type="button"onClick={() => loadBillingData()}
 className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground bg-card border border-border hover:bg-muted transition-colors shadow-2xs cursor-pointer shrink-0"title="Refresh billing data">
                <RefreshCw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin text-blue-600')} />
              </button>
            </div>
          </div>
        </Card>

        {/* -------------------------------------------------------------------------
 TAB 2: INVOICES DIRECTORY & CONTROL
           ------------------------------------------------------------------------- */}
        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {/* Filter status indicator when filtered */}
            {invoiceFilterTab !== 'all' && (
              <div className="flex items-center justify-between px-1 text-xs">
                <span className="text-muted-foreground font-medium">
 {tBilingual('Filtered by:', 'ফিল্টার করা হয়েছে:')} <strong className="text-foreground">{invoiceFilterTab.replace('_', ' ')}</strong>
                </span>
                <button
 type="button"onClick={() => setInvoiceFilterTab('all')}
 className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer bangla-text">
 {tBilingual('Clear Filter', 'ফিল্টার মুছুন')}
                </button>
              </div>
            )}

            {/* Invoices List / Table */}
            <Card className="border-border /80 shadow-xs overflow-hidden rounded-xl bg-card/80 backdrop-blur-md">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto min-h-[340px] pb-12">
                <table className="w-full text-left text-xs min-w-[940px]">
                  <thead className="bg-muted border-b border-border /80 text-muted-foreground uppercase tracking-wider text-2xs font-bold">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap min-w-[125px] bangla-text">{tBilingual('Invoice #', 'ইনভয়েস নং')}</th>
                      <th className="p-3.5 min-w-[160px] bangla-text">{tBilingual('Customer & Phone', 'গ্রাহক ও ফোন')}</th>
                      <th className="p-3.5 text-center whitespace-nowrap w-[90px] min-w-[90px] bangla-text">{tBilingual('Date', 'তারিখ')}</th>
                      <th className="p-3.5 text-center whitespace-nowrap w-[90px] min-w-[90px] bangla-text">{tBilingual('Due Date', 'পরিশোধের তারিখ')}</th>
                      <th className="p-3.5 text-right whitespace-nowrap w-[95px] min-w-[95px] bangla-text">{tBilingual('Total', 'মোট')}</th>
                      <th className="p-3.5 text-right whitespace-nowrap w-[95px] min-w-[95px] bangla-text">{tBilingual('Paid', 'পরিশোধ')}</th>
                      <th className="p-3.5 text-right whitespace-nowrap w-[95px] min-w-[95px] bangla-text">{tBilingual('Due', 'বকেয়া')}</th>
                      <th className="p-3.5 text-center whitespace-nowrap w-[110px] min-w-[110px] bangla-text">{tBilingual('Status', 'অবস্থা')}</th>
                      <th className="p-3.5 whitespace-nowrap min-w-[120px] bangla-text">{tBilingual('Salesperson', 'বিক্রয়কর্মী')}</th>
                      <th className="p-3.5 text-center whitespace-nowrap w-[70px] min-w-[70px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-12 text-center text-muted-foreground text-xs">
 {tBilingual('No commercial invoices found matching current filters.', 'ফিল্টারের সাথে মেলে এমন কোনো ইনভয়েস পাওয়া যায়নি।')}
                        </td>
                      </tr>
                    ) : (
 filteredInvoices.map((inv, index) => (
                        <tr key={inv.id} className="hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                          <td className="p-3.5 whitespace-nowrap min-w-[125px]">
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              <Link
 href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
 className="tabular-nums font-bold text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap">
                                {inv.invoice_number}
                              </Link>
                              {inv.invoice_type === 'vat_invoice' && (
                                <Badge className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 text-2xs py-0 px-1 shrink-0 whitespace-nowrap">
 VAT 6.3
                                </Badge>
                              )}
                            </div>
                            {inv.order_number && (
                              <span className="text-2xs text-muted-foreground tabular-nums block mt-0.5 whitespace-nowrap">
 Order: {inv.order_number}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 min-w-[160px]">
                            <div className="font-bold text-foreground leading-tight">{inv.customer_name}</div>
                            {inv.customer_phone ? (
                              <a
 href={`tel:${inv.customer_phone}`}
 className="text-2xs text-muted-foreground tabular-nums hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5 whitespace-nowrap"title="Call Customer"onClick={(e) => e.stopPropagation()}
                              >
                                <Phone className="h-3 w-3 text-muted-foreground shrink-0"/>
                                <span>{inv.customer_phone}</span>
                              </a>
                            ) : (
                              <span className="text-2xs text-muted-foreground tabular-nums">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-center tabular-nums text-muted-foreground whitespace-nowrap">{inv.invoice_date}</td>
                          <td className="p-3.5 text-center tabular-nums text-muted-foreground whitespace-nowrap">{inv.due_date}</td>
                          <td className="p-3.5 text-right tabular-nums font-bold text-foreground whitespace-nowrap">
                            {formatBDT(inv.grand_total)}
                          </td>
                          <td className="p-3.5 text-right tabular-nums text-emerald-600 font-bold whitespace-nowrap">
                            {formatBDT(inv.paid_amount || 0)}
                          </td>
                          <td className="p-3.5 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            {formatBDT(inv.due_amount || 0)}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap">
                            {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                          </td>
                          <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                            {inv.salesperson_name || inv.created_by_name || 'Commercial'}
                          </td>
                          <td className="p-3.5 text-center whitespace-nowrap w-[70px] min-w-[70px]">
                            <div className="relative inline-block text-left"data-invoice-menu>
                              <Button
 size="sm"variant="ghost"onClick={(e) => {
 e.stopPropagation()
 setActiveMenuInvoiceId(activeMenuInvoiceId === inv.id ? null : inv.id)
                                }}
 className={cn(
                                  'h-8 w-8 p-0 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center',
 activeMenuInvoiceId === inv.id
                                    ? 'bg-muted text-foreground'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted dark:hover:bg-muted'
                                )}
 title="Invoice Actions"aria-label="Invoice Actions"aria-expanded={activeMenuInvoiceId === inv.id}
                              >
                                <MoreVertical className="h-4 w-4"/>
                              </Button>

                              {activeMenuInvoiceId === inv.id && (
                                <div
 className={cn(
                                    'absolute right-0 w-52 bg-card border border-border rounded-xl shadow-xs z-50 py-1 text-xs animate-in fade-in-0 zoom-in-95 duration-100',
 index >= filteredInvoices.length - 2 && filteredInvoices.length >= 3
                                      ? 'bottom-full mb-1'
                                      : 'top-full mt-1'
                                  )}
                                >
                                  {/* View Invoice */}
                                  <Link
 href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
 onClick={() => setActiveMenuInvoiceId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                                    <Eye className="h-3.5 w-3.5 text-blue-500 shrink-0"/>
                                    <span className="font-medium">View Invoice</span>
                                  </Link>

                                  {/* Collect Payment */}
                                  {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                                    <button
 type="button"onClick={() => {
 setActiveMenuInvoiceId(null)
 setSelectedCustomerIdForPayment(inv.customer_id || undefined)
 setSelectedInvoiceIdForPayment(inv.id)
 setIsReceivePaymentOpen(true)
                                      }}
 className="w-full text-left px-3 py-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 transition-colors cursor-pointer">
                                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0"/>
                                      <div className="flex flex-col text-left">
                                        <span className="font-semibold">Collect Payment</span>
                                        <span className="text-2xs text-emerald-600/80 dark:text-emerald-400/80 tabular-nums">
 Due: {formatBDT(inv.due_amount)}
                                        </span>
                                      </div>
                                    </button>
                                  )}

                                  {/* WhatsApp Reminder */}
                                  {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                                    <button
 type="button"onClick={() => {
 setActiveMenuInvoiceId(null)
 handleSendReminder(inv.id)
                                      }}
 className="w-full text-left px-3 py-2 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30 flex items-center gap-2.5 text-foreground hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer">
                                      <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>
                                      <span>Remind (WhatsApp)</span>
                                    </button>
                                  )}

                                  {/* Divider if delete/void actions present */}
                                  {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                                    <div className="my-1 border-t border-border"/>
                                  )}

                                  {/* Cancel / Void Invoice */}
                                  {can('delete', 'invoices') && inv.paid_amount === 0 && inv.status !== 'cancelled' && (
                                    <button
 type="button"onClick={() => {
 setActiveMenuInvoiceId(null)
 setSelectedInvoiceForCancel(inv)
                                      }}
 className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 text-amber-700 dark:text-amber-400 transition-colors cursor-pointer">
                                      <Ban className="h-3.5 w-3.5 text-amber-500 shrink-0"/>
                                      <span>Cancel / Void Invoice</span>
                                    </button>
                                  )}

                                  {/* Delete Invoice */}
                                  {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                                    <button
 type="button"onClick={() => {
 setActiveMenuInvoiceId(null)
 setSelectedInvoiceForDelete(inv)
                                      }}
 className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer">
                                      <Trash2 className="h-3.5 w-3.5 text-rose-500 shrink-0"/>
                                      <span>Delete Invoice</span>
                                    </button>
                                  )}
                                </div>
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
              <div className="md:hidden divide-y divide-border dark:divide-border">
                {filteredInvoices.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
 No invoices matching search filters.
                  </div>
                ) : (
 filteredInvoices.map((inv) => (
                    <div key={inv.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
 href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}
 className="tabular-nums font-bold text-sm text-blue-600 dark:text-blue-400">
                            #{inv.invoice_number}
                          </Link>
                          {getSectorBadge(getSectorForInvoice(inv))}
                        </div>
                        {getStatusBadge(inv.status, inv.due_date, inv.due_amount)}
                      </div>

                      <div>
                        <div className="font-bold text-sm text-foreground">{inv.customer_name}</div>
                        {inv.customer_phone ? (
                          <a
 href={`tel:${inv.customer_phone}`}
 className="text-xs text-blue-600 dark:text-blue-400 tabular-nums inline-flex items-center gap-1 hover:underline mt-0.5">
                            <Phone className="h-3 w-3"/>
                            <span>{inv.customer_phone}</span>
                          </a>
                        ) : (
                          <div className="text-xs text-muted-foreground tabular-nums">No phone</div>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center tabular-nums text-xs bg-muted p-2.5 rounded-xl border border-border /50">
                        <div>
                          <span className="text-2xs text-muted-foreground block">Total</span>
                          <span className="font-bold text-foreground">{formatBDT(inv.grand_total)}</span>
                        </div>
                        <div>
                          <span className="text-2xs text-emerald-600 block">Paid</span>
                          <span className="font-bold text-emerald-600">{formatBDT(inv.paid_amount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-2xs text-rose-600 block">Due</span>
                          <span className="font-black text-rose-600">{formatBDT(inv.due_amount || 0)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-2xs text-muted-foreground tabular-nums">Date: {inv.invoice_date}</span>
                        <div className="flex items-center gap-2">
                          {inv.due_amount > 0 && inv.status !== 'cancelled' && (
                            <>
                              <Button
 size="sm"variant="outline"onClick={() => handleSendReminder(inv.id)}
 className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 px-2 rounded-lg"title="Remind on WhatsApp">
                                <MessageSquare className="h-3.5 w-3.5"/>
                              </Button>
                              <Button
 size="sm"onClick={() => {
 setSelectedCustomerIdForPayment(inv.customer_id || undefined)
 setSelectedInvoiceIdForPayment(inv.id)
 setIsReceivePaymentOpen(true)
                                }}
 className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 rounded-lg">
 Collect Due
                              </Button>
                            </>
                          )}
                          <Link href={getTenantNavHref(`/billing/${inv.id}`, pathname, slug)}>
                            <Button size="sm"variant="outline"className="h-8 text-xs rounded-lg">
 View
                            </Button>
                          </Link>
                          {can('delete', 'invoices') && inv.status !== 'cancelled' && (
                            <Button
 size="sm"variant="ghost"onClick={() => setSelectedInvoiceForDelete(inv)}
 className="h-8 text-xs px-2 text-muted-foreground hover:text-rose-600 rounded-lg">
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
            {/* Payments Count Header */}
            <div className="flex items-center justify-between px-1 text-xs text-muted-foreground tabular-nums">
              <span>Showing {filteredPayments.length} recorded payments</span>
            </div>

            {/* Payments Table */}
            <Card className="border-border /80 shadow-xs overflow-hidden rounded-xl bg-card/80 backdrop-blur-md">
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[950px]">
                  <thead className="bg-muted border-b border-border /80 text-muted-foreground uppercase tracking-wider text-2xs font-bold">
                    <tr>
                      <th className="p-3.5 whitespace-nowrap min-w-[130px] bangla-text">{tBilingual('Receipt #', 'রশিদ নং')}</th>
                      <th className="p-3.5 text-center whitespace-nowrap w-[100px] min-w-[100px] bangla-text">{tBilingual('Date', 'তারিখ')}</th>
                      <th className="p-3.5 min-w-[170px] bangla-text">{tBilingual('Customer', 'গ্রাহক')}</th>
                      <th className="p-3.5 whitespace-nowrap w-[100px] min-w-[100px] bangla-text">{tBilingual('Method', 'পদ্ধতি')}</th>
                      <th className="p-3.5 whitespace-nowrap min-w-[140px] bangla-text">{tBilingual('Reference / TrxID', 'রেফারেন্স / ট্রানজেকশন')}</th>
                      <th className="p-3.5 text-right whitespace-nowrap w-[110px] min-w-[110px] bangla-text">{tBilingual('Amount', 'পরিমাণ')}</th>
                      <th className="p-3.5 whitespace-nowrap min-w-[120px] bangla-text">{tBilingual('Received By', 'গ্রহণকারী')}</th>
                      <th className="p-3.5 text-right whitespace-nowrap w-[100px] min-w-[100px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-muted-foreground text-xs">
 {tBilingual('No payment records found.', 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।')}
                        </td>
                      </tr>
                    ) : (
 filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                          <td className="p-3.5 tabular-nums font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {pay.receipt_number}
                          </td>
                          <td className="p-3.5 text-center tabular-nums text-muted-foreground whitespace-nowrap">{pay.payment_date}</td>
                          <td className="p-3.5 font-bold text-foreground leading-tight">
                            {pay.customer_name || 'Walk-in Customer'}
                          </td>
                          <td className="p-3.5 whitespace-nowrap">
                            <Badge className="bg-muted text-foreground uppercase text-2xs rounded-md font-semibold whitespace-nowrap">
                              {pay.payment_method}
                            </Badge>
                          </td>
                          <td className="p-3.5 tabular-nums text-muted-foreground text-2xs whitespace-nowrap">
                            {pay.mfs_transaction_id || pay.cheque_number || pay.bank_name || '—'}
                          </td>
                          <td className="p-3.5 text-right tabular-nums font-black text-emerald-600 text-sm whitespace-nowrap">
                            {formatBDT(pay.amount)}
                          </td>
                          <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                            {pay.received_by_name || 'Cashier'}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap w-[100px] min-w-[100px]">
                            <Button
 size="sm"variant="outline"onClick={() => {
 setSelectedPaymentForReceipt(pay)
 setIsReceiptModalOpen(true)
                              }}
 className="h-7 text-xs font-semibold gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer rounded-lg">
                              <Receipt className="h-3 w-3"/>
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
              <div className="md:hidden divide-y divide-border dark:divide-border">
                {filteredPayments.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
 {tBilingual('No payment records found.', 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।')}
                  </div>
                ) : (
 filteredPayments.map((pay) => (
                    <div key={pay.id} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="tabular-nums font-bold text-sm text-emerald-600 dark:text-emerald-400">
                          {pay.receipt_number}
                        </span>
                        <Badge className="bg-muted text-foreground uppercase text-2xs rounded-md">
                          {pay.payment_method}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-sm text-foreground">
                            {pay.customer_name || 'Walk-in Customer'}
                          </div>
                          <div className="text-2xs text-muted-foreground tabular-nums mt-0.5">
                            {pay.payment_date} • By: {pay.received_by_name || 'Cashier'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="tabular-nums font-black text-emerald-600 text-base">
                            {formatBDT(pay.amount)}
                          </div>
                          {(pay.mfs_transaction_id || pay.cheque_number || pay.bank_name) && (
                            <span className="text-2xs text-muted-foreground tabular-nums block">
 Ref: {pay.mfs_transaction_id || pay.cheque_number || pay.bank_name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
 size="sm"variant="outline"onClick={() => {
 setSelectedPaymentForReceipt(pay)
 setIsReceiptModalOpen(true)
                          }}
 className="h-8 text-xs font-semibold gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer rounded-lg">
                          <Receipt className="h-3.5 w-3.5"/>
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
            {/* Aging Summary Buckets */}
            {receivablesAging && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {receivablesAging.buckets.map((b) => (
                  <Card key={b.bucket} className="p-3.5 bg-card/80 backdrop-blur-md border-border /80 shadow-xs rounded-xl">
                    <span className="text-2xs font-bold text-muted-foreground uppercase tracking-wider block">
                      {b.label}
                    </span>
                    <div className="text-base font-black font-numeric tabular-nums text-foreground mt-1">
                      {formatBDT(b.amount || 0)}
                    </div>
                    <span className="text-xs text-muted-foreground font-numeric tabular-nums">
                      {b.invoiceCount || 0} Bills • {b.customerCount || 0} Cust
                    </span>
                  </Card>
                ))}
              </div>
            )}

            {/* Customer Due List with Actionable Receive Payment Button */}
            <Card className="border-border /80 shadow-xs overflow-hidden rounded-xl bg-card/80 backdrop-blur-md">
              <CardHeader className="p-4 bg-muted border-b border-border /80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-black text-foreground uppercase tracking-wider">
 Customer Receivables & Collection Ledger
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground mt-0.5">
 Select any customer to send payment reminder or collect payment
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[950px]">
                    <thead className="bg-muted border-b border-border /80 text-muted-foreground uppercase tracking-wider text-2xs font-bold">
                      <tr>
                        <th className="p-3.5 min-w-[180px] bangla-text">{tBilingual('Customer', 'গ্রাহক')}</th>
                        <th className="p-3.5 whitespace-nowrap min-w-[120px] bangla-text">{tBilingual('Phone', 'ফোন')}</th>
                        <th className="p-3.5 text-center whitespace-nowrap w-[110px] min-w-[110px] bangla-text">{tBilingual('Unpaid Bills', 'বকেয়া বিল')}</th>
                        <th className="p-3.5 text-center whitespace-nowrap w-[110px] min-w-[110px] bangla-text">{tBilingual('Oldest Due Date', 'প্রাচীনতম বকেয়ার তারিখ')}</th>
                        <th className="p-3.5 text-center whitespace-nowrap w-[120px] min-w-[120px] bangla-text">{tBilingual('Aging Status', 'মেয়াদ অবস্থা')}</th>
                        <th className="p-3.5 text-right whitespace-nowrap w-[120px] min-w-[120px] bangla-text">{tBilingual('Outstanding Due', 'মোট বকেয়া')}</th>
                        <th className="p-3.5 text-right whitespace-nowrap w-[180px] min-w-[180px] bangla-text">{tBilingual('Actions', 'অ্যাকশন')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border dark:divide-border">
                      {customerReceivables.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-12 text-center text-muted-foreground text-xs">
 {tBilingual('No customers with outstanding due balances matching filters.', 'ফিল্টারের সাথে মেলে এমন কোনো বকেয়া ব্যালেন্স পাওয়া যায়নি।')}
                          </td>
                        </tr>
                      ) : (
 customerReceivables.map((c) => (
                          <tr key={c.customerId || c.customerName} className="hover:bg-muted dark:hover:bg-muted/60 transition-colors">
                            <td className="p-3.5 min-w-[180px]">
                              <span className="font-bold text-foreground leading-tight">{c.customerName}</span>
                            </td>
                            <td className="p-3.5 tabular-nums text-muted-foreground whitespace-nowrap">
                              {c.customerPhone ? (
                                <a
 href={`tel:${c.customerPhone}`}
 className="text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 whitespace-nowrap"title="Call Customer">
                                  <Phone className="h-3 w-3 text-muted-foreground shrink-0"/>
                                  <span>{c.customerPhone}</span>
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="p-3.5 text-center tabular-nums font-bold text-blue-600 whitespace-nowrap">
                              {c.unpaidCount} Invoices
                            </td>
                            <td className="p-3.5 text-center tabular-nums text-muted-foreground whitespace-nowrap">{c.oldestDueDate}</td>
                            <td className="p-3.5 text-center whitespace-nowrap">
                              {c.maxDaysOverdue > 0 ? (
                                <Badge className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20 font-bold text-2xs rounded-md whitespace-nowrap">
                                  {c.maxDaysOverdue}d Overdue
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-2xs rounded-md whitespace-nowrap">
 Due Soon
                                </Badge>
                              )}
                            </td>
                            <td className="p-3.5 text-right tabular-nums font-black text-rose-600 dark:text-rose-400 text-sm whitespace-nowrap">
                              {formatBDT(c.totalDue)}
                            </td>
                            <td className="p-3.5 text-right whitespace-nowrap w-[180px] min-w-[180px]">
                              <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                                {c.invoices[0] && (
                                  <Button
 size="sm"variant="outline"onClick={() => handleSendReminder(c.invoices[0].id)}
 className="h-7 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 px-2 cursor-pointer rounded-lg shrink-0 gap-1"title="Send WhatsApp payment reminder">
                                    <MessageSquare className="h-3 w-3"/>
                                    <span>Remind</span>
                                  </Button>
                                )}
                                <Button
 size="sm"onClick={() => {
 setSelectedCustomerIdForPayment(c.customerId || undefined)
 setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
 setIsReceivePaymentOpen(true)
                                  }}
 className="h-7 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer rounded-lg shrink-0">
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
                <div className="md:hidden divide-y divide-border dark:divide-border">
                  {customerReceivables.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
 No customers with outstanding due balances matching filters.
                    </div>
                  ) : (
 customerReceivables.map((c) => (
                      <div key={c.customerId || c.customerName} className="p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-foreground">
                            {c.customerName}
                          </span>
                          {c.maxDaysOverdue > 0 ? (
                            <Badge className="bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20 font-bold text-2xs rounded-md">
                              {c.maxDaysOverdue}d Overdue
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border border-amber-500/20 text-2xs rounded-md">
 Due Soon
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-xs tabular-nums">
                          {c.customerPhone ? (
                            <a
 href={`tel:${c.customerPhone}`}
 className="text-blue-600 dark:text-blue-400 tabular-nums inline-flex items-center gap-1 hover:underline">
                              <Phone className="h-3 w-3"/>
                              <span>{c.customerPhone}</span>
                            </a>
                          ) : (
                            <span className="text-muted-foreground">Phone: —</span>
                          )}
                          <span className="text-blue-600 font-bold">{c.unpaidCount} Bills</span>
                        </div>

                        <div className="flex items-center justify-between bg-muted p-2.5 rounded-xl border border-border /50">
                          <div>
                            <span className="text-2xs text-muted-foreground block tabular-nums">Oldest Due Date</span>
                            <span className="text-xs tabular-nums text-foreground">{c.oldestDueDate}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-2xs text-muted-foreground block tabular-nums">Total Outstanding</span>
                            <span className="tabular-nums font-black text-rose-600 text-sm">{formatBDT(c.totalDue)}</span>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          {c.invoices[0] && (
                            <Button
 size="sm"variant="outline"onClick={() => handleSendReminder(c.invoices[0].id)}
 className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 px-2 rounded-lg"title="Remind on WhatsApp">
                              <MessageSquare className="h-3.5 w-3.5 mr-1"/>
                              <span>Remind</span>
                            </Button>
                          )}
                          <Button
 size="sm"onClick={() => {
 setSelectedCustomerIdForPayment(c.customerId || undefined)
 setSelectedInvoiceIdForPayment(c.invoices[0]?.id)
 setIsReceivePaymentOpen(true)
                            }}
 className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-3 cursor-pointer rounded-lg">
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
 size="md"hideFooter
        >
          {selectedInvoiceForDelete.status === 'paid' || (selectedInvoiceForDelete.paid_amount || 0) >= (selectedInvoiceForDelete.grand_total || 0) ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong>Paid invoices cannot be deleted</strong> because they are part of the permanent financial record.
              </div>
              <div className="text-xs text-muted-foreground">
 Invoice: <strong>#{selectedInvoiceForDelete.invoice_number}</strong><br />
 Customer: <strong>{selectedInvoiceForDelete.customer_name}</strong><br />
 Total Paid: <strong className="tabular-nums">{formatBDT(selectedInvoiceForDelete.paid_amount || 0)}</strong>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button"variant="outline"size="sm"onClick={() => setSelectedInvoiceForDelete(null)}>
 Close
                </Button>
              </div>
            </div>
          ) : (selectedInvoiceForDelete.paid_amount || 0) > 0 ? (
            <div className="space-y-4 pt-1">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-300 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <strong>Partially paid invoices cannot be deleted directly</strong> because financial payments are attached to this document. Please perform an authorized payment refund/reversal first.
              </div>
              <div className="text-xs text-muted-foreground">
 Invoice: <strong>#{selectedInvoiceForDelete.invoice_number}</strong><br />
 Customer: <strong>{selectedInvoiceForDelete.customer_name}</strong><br />
 Paid: <strong className="tabular-nums text-emerald-600">{formatBDT(selectedInvoiceForDelete.paid_amount || 0)}</strong><br />
 Remaining Due: <strong className="tabular-nums text-rose-600">{formatBDT(selectedInvoiceForDelete.due_amount || 0)}</strong>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="button"variant="outline"size="sm"onClick={() => setSelectedInvoiceForDelete(null)}>
 Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConfirmDelete} className="space-y-4 pt-1">
              <div className="p-3.5 bg-muted rounded-xl border border-border text-xs space-y-1.5 tabular-nums">
                <div>Invoice: <strong className="text-foreground">#{selectedInvoiceForDelete.invoice_number}</strong></div>
                <div>Customer: <strong className="text-foreground">{selectedInvoiceForDelete.customer_name}</strong></div>
                <div>Amount: <strong className="text-foreground font-bold">{formatBDT(selectedInvoiceForDelete.grand_total)}</strong></div>
              </div>

              <p className="text-xs text-muted-foreground">
 This invoice will be removed from normal billing views.
              </p>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Reason for Deletion</Label>
                <Input
 placeholder="e.g. Draft invoice discarded / Customer cancelled order"value={deleteReason}
 onChange={(e) => setDeleteReason(e.target.value)}
 className="h-9 text-xs"/>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button"variant="outline"size="sm"onClick={() => setSelectedInvoiceForDelete(null)}>
 Cancel
                </Button>
                <Button
 type="submit"size="sm"disabled={isSubmittingDelete}
 className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
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
 size="md"hideFooter
        >
          <form onSubmit={handleConfirmCancel} className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground">
 Are you sure you want to void this invoice? This will reverse any customer receivables.
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Cancellation Reason*</Label>
              <Input
 placeholder="e.g. Customer cancelled order before production"value={cancelReason}
 onChange={(e) => setCancelReason(e.target.value)}
 className="h-9 text-xs"required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button"variant="outline"size="sm"onClick={() => setSelectedInvoiceForCancel(null)}>
 Keep Invoice
              </Button>
              <Button
 type="submit"size="sm"disabled={isSubmittingCancel}
 className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs">
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
          <Receipt className="h-7 w-7 text-blue-600 animate-pulse"/>
          <p className="text-xs font-medium text-muted-foreground">Loading Billing Workspace...</p>
        </div>
      }
    >
      <PanelAccessGuard
 module="invoices"action="view"panelTitle="Billing & Collections"panelTitleBn="বিলিং ও কালেকশন">
        <BillingContent />
      </PanelAccessGuard>
    </React.Suspense>
  )
}
