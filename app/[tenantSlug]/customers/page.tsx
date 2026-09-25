'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageSquare,
  Building,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Filter,
  ArrowRight,
  TrendingUp,
  FileText,
  CreditCard,
  RotateCcw,
  Loader2,
  MoreVertical,
  Download,
  Edit2,
  Receipt,
  Trash2,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { PaginationControls } from '@/components/shared/pagination-controls'
import { PageHeader } from '@/components/shared/page-header'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import {
  getPaginatedCustomersAction,
  getCustomersSummaryAction,
} from '@/actions/customer.actions'
import { moveToTrashAction } from '@/actions/trash.actions'
import {
  CustomerRecord,
  CustomerSummaryStatistics,
  CustomerCategory,
} from '@/types/crm.types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

export function formatCustomerIdNo(c: Partial<CustomerRecord>, index?: number): string {
  if (c.customer_id_no && c.customer_id_no.trim()) return c.customer_id_no.trim()
  if (c.customer_code && c.customer_code.trim()) return c.customer_code.trim()
  if (c.id) {
    const raw = c.id.replace(/-/g, '')
    if (/^\d+$/.test(raw)) {
      return `CUST-${raw.padStart(3, '0')}`
    }
    const suffix = raw.slice(-4).toUpperCase()
    return `CUST-${suffix}`
  }
  return `CUST-${String((index !== undefined ? index + 1 : 1)).padStart(3, '0')}`
}

function getLocalInvoices(slug?: string, companySlug?: string, companyId?: string): any[] {
  if (typeof window === 'undefined') return []
  const invMap = new Map<string, any>()
  const keys = [
    STORAGE_KEYS.INVOICES,
    slug ? `${STORAGE_KEYS.INVOICES}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.INVOICES}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.INVOICES}__${companyId}` : null,
  ].filter(Boolean) as string[]

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((inv) => {
            if (inv && inv.id) invMap.set(inv.id, inv)
          })
        }
      }
    } catch {}
  })

  const storeItems = [
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, slug) || []),
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, companySlug) || []),
    ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []),
  ]
  storeItems.forEach((inv) => {
    if (inv && inv.id) invMap.set(inv.id, inv)
  })

  return Array.from(invMap.values())
}

function getLocalPayments(slug?: string, companySlug?: string, companyId?: string): any[] {
  if (typeof window === 'undefined') return []
  const payMap = new Map<string, any>()
  const keys = [
    STORAGE_KEYS.PAYMENTS,
    slug ? `${STORAGE_KEYS.PAYMENTS}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.PAYMENTS}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.PAYMENTS}__${companyId}` : null,
  ].filter(Boolean) as string[]

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((pay) => {
            if (pay && pay.id) payMap.set(pay.id, pay)
          })
        }
      }
    } catch {}
  })

  const storeItems = [
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, slug) || []),
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, companySlug) || []),
    ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.PAYMENTS) || []),
  ]
  storeItems.forEach((pay) => {
    if (pay && pay.id) payMap.set(pay.id, pay)
  })

  return Array.from(payMap.values())
}

function getLocalOrders(slug?: string, companySlug?: string, companyId?: string): any[] {
  if (typeof window === 'undefined') return []
  const ordMap = new Map<string, any>()
  const keys = [
    STORAGE_KEYS.ORDERS,
    slug ? `${STORAGE_KEYS.ORDERS}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.ORDERS}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.ORDERS}__${companyId}` : null,
  ].filter(Boolean) as string[]

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((ord) => {
            if (ord && ord.id) ordMap.set(ord.id, ord)
          })
        }
      }
    } catch {}
  })

  const storeItems = [
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, slug) || []),
    ...(PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, companySlug) || []),
    ...(PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []),
  ]
  storeItems.forEach((ord) => {
    if (ord && ord.id) ordMap.set(ord.id, ord)
  })

  return Array.from(ordMap.values())
}

function getLocalCustomers(slug?: string, companySlug?: string, companyId?: string): CustomerRecord[] {
  if (typeof window === 'undefined') return []
  const custMap = new Map<string, CustomerRecord>()
  const keys = [
    STORAGE_KEYS.CUSTOMERS,
    slug ? `${STORAGE_KEYS.CUSTOMERS}__${slug}` : null,
    companySlug ? `${STORAGE_KEYS.CUSTOMERS}__${companySlug}` : null,
    companyId ? `${STORAGE_KEYS.CUSTOMERS}__${companyId}` : null,
  ].filter(Boolean) as string[]

  keys.forEach((key) => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          parsed.forEach((c) => {
            if (c && c.id) custMap.set(c.id, c)
          })
        }
      }
    } catch {}
  })

  const storeItems = [
    ...(PrintERPDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, slug) || []),
    ...(PrintERPDataStore.getAll<CustomerRecord>(STORAGE_KEYS.CUSTOMERS, companySlug) || []),
    ...(PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []),
  ]
  storeItems.forEach((c) => {
    if (c && c.id) custMap.set(c.id, c)
  })

  return Array.from(custMap.values())
}

function enrichCustomerWithFinancials(
  cust: CustomerRecord,
  invoices: any[],
  payments: any[],
  orders: any[],
  index?: number
): CustomerRecord {
  const custInvs = invoices.filter((i) => {
    return (
      (i.customer_id && i.customer_id === cust.id) ||
      (i.customer_name && cust.name && i.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase()) ||
      (i.customer_phone && cust.mobile && i.customer_phone.replace(/\D/g, '') === cust.mobile.replace(/\D/g, ''))
    ) && i.status !== 'cancelled'
  })

  let totalInvoiced = 0
  let totalPaid = 0
  let totalDue = 0
  let lastOrderDate: string | null = null
  let lastOrderNumber: string | null = null

  custInvs.forEach((inv) => {
    totalInvoiced += Number(inv.grand_total) || 0
    totalPaid += Number(inv.paid_amount) || 0
    totalDue += Number(inv.due_amount) || 0
  })

  const custPays = payments.filter((p) => {
    return (
      (p.customer_id && p.customer_id === cust.id) ||
      (p.customer_name && cust.name && p.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
    )
  })
  const totalDirectPaid = custPays.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
  if (totalDirectPaid > totalPaid) {
    totalPaid = totalDirectPaid
  }

  const custOrders = orders
    .filter((o) => {
      return (
        (o.customer_id && o.customer_id === cust.id) ||
        (o.customer_name && cust.name && o.customer_name.trim().toLowerCase() === cust.name.trim().toLowerCase())
      ) && o.status !== 'cancelled'
    })
    .sort((a, b) => (b.order_date || b.created_at || '').localeCompare(a.order_date || a.created_at || ''))

  if (custOrders.length > 0) {
    lastOrderDate = custOrders[0].order_date || custOrders[0].created_at?.split('T')[0] || null
    lastOrderNumber = custOrders[0].order_number || null
  } else if (custInvs.length > 0) {
    const sortedInvs = [...custInvs].sort((a, b) => (b.invoice_date || b.created_at || '').localeCompare(a.invoice_date || a.created_at || ''))
    lastOrderDate = sortedInvs[0].invoice_date || sortedInvs[0].created_at?.split('T')[0] || null
    lastOrderNumber = sortedInvs[0].invoice_number || null
  }

  const custIdNo = formatCustomerIdNo(cust, index)

  return {
    ...cust,
    customer_id_no: cust.customer_id_no || custIdNo,
    total_invoiced_amount: totalInvoiced > 0 ? totalInvoiced : (Number(cust.total_invoiced_amount) || 0),
    total_paid_amount: totalPaid > 0 ? totalPaid : (Number(cust.total_paid_amount) || 0),
    total_due_balance: totalDue > 0 ? totalDue : (Number(cust.total_due_balance) || 0),
    last_order_date: lastOrderDate || cust.last_order_date || null,
    last_order_number: lastOrderNumber || cust.last_order_number || null,
  }
}

export default function CustomersPage() {
  const params = useParams()
  const pathname = usePathname()
  const { company } = useTenant()
  const { can } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { tBilingual } = useI18n()

  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id
  const [isMounted, setIsMounted] = useState(false)

  // State with Zero-Latency SWR Cache Hydration
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [summary, setSummary] = useState<CustomerSummaryStatistics>({
    totalCustomers: 0,
    activeCustomers: 0,
    customersWithDue: 0,
    totalOutstandingDue: 0,
  })
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDueFilter, setSelectedDueFilter] = useState<'all' | 'has_due' | 'no_due'>('all')
  const [sortPreset, setSortPreset] = useState<'newest' | 'highest_billed' | 'highest_due' | 'latest_order' | 'alphabetical'>('newest')

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorText, setErrorText] = useState('')

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<CustomerRecord | null>(null)
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Trash confirm state
  const [customerToTrash, setCustomerToTrash] = useState<CustomerRecord | null>(null)
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification(msg)
    dispatchToast({
      type,
      title: type === 'error' ? 'Error' : type === 'info' ? 'Notice' : 'Success',
      titleBn: type === 'error' ? 'ত্রুটি' : type === 'info' ? 'বিজ্ঞপ্তি' : 'সফল হয়েছে',
      message: msg,
    })
    setTimeout(() => setNotification(null), 3800)
  }

  // Hydrate from localStorage on client mount safely to prevent SSR mismatch
  useEffect(() => {
    setIsMounted(true)
    try {
      const localCusts = getLocalCustomers(slug, company?.slug, companyId)
      if (localCusts && localCusts.length > 0) {
        const localInvs = getLocalInvoices(slug, company?.slug, companyId)
        const localPays = getLocalPayments(slug, company?.slug, companyId)
        const localOrds = getLocalOrders(slug, company?.slug, companyId)
        const enriched = localCusts.map((c, i) => enrichCustomerWithFinancials(c, localInvs, localPays, localOrds, i))
        setCustomers(enriched)
        setTotalRecords(enriched.length)
        setSummary({
          totalCustomers: enriched.length,
          activeCustomers: enriched.filter((c) => c.is_active !== false).length,
          customersWithDue: enriched.filter((c) => (c.total_due_balance || 0) > 0).length,
          totalOutstandingDue: enriched.reduce((sum, c) => sum + (c.total_due_balance || 0), 0),
        })
        setIsLoading(false)
      }
    } catch {
      // ignore
    }
  }, [company?.slug, companyId, slug])

  // Derive sortBy & sortOrder from preset
  const getSortParams = () => {
    switch (sortPreset) {
      case 'highest_billed':
        return { sortBy: 'billed' as const, sortOrder: 'desc' as const }
      case 'highest_due':
        return { sortBy: 'due' as const, sortOrder: 'desc' as const }
      case 'latest_order':
        return { sortBy: 'latest_order' as const, sortOrder: 'desc' as const }
      case 'alphabetical':
        return { sortBy: 'name' as const, sortOrder: 'asc' as const }
      case 'newest':
      default:
        return { sortBy: 'newest' as const, sortOrder: 'desc' as const }
    }
  }

  // Fetch summary and customers list
  const loadData = useCallback(async (isBackground = false) => {
    if (!companyId) return
    if (!isBackground && customers.length === 0) {
      setIsLoading(true)
    }
    setIsError(false)
    try {
      const { sortBy, sortOrder } = getSortParams()
      const [sumRes, listRes] = await Promise.all([
        getCustomersSummaryAction(companyId),
        getPaginatedCustomersAction(
          {
            page,
            pageSize,
            search,
            customerType: selectedType !== 'all' ? selectedType : undefined,
            dueFilter: selectedDueFilter,
            sortBy,
            sortOrder,
          },
          companyId
        ),
      ])

      const localInvoices = getLocalInvoices(slug, company?.slug, companyId)
      const localPayments = getLocalPayments(slug, company?.slug, companyId)
      const localOrders = getLocalOrders(slug, company?.slug, companyId)
      const localCustomers = getLocalCustomers(slug, company?.slug, companyId)

      const mergedCustMap = new Map<string, CustomerRecord>()
      // Put server customers
      if (listRes.success && listRes.data) {
        listRes.data.data.forEach((c) => {
          if (c && c.id) mergedCustMap.set(c.id, c)
        })
      }
      // Merge local customers if missing
      localCustomers.forEach((c) => {
        if (c && c.id && !mergedCustMap.has(c.id)) {
          mergedCustMap.set(c.id, c)
        }
      })

      // Enrich every customer with calculated financials
      let allEnriched = Array.from(mergedCustMap.values()).map((cust, idx) => {
        return enrichCustomerWithFinancials(cust, localInvoices, localPayments, localOrders, idx)
      })

      // Client filter & sort if search or filters active
      let filtered = allEnriched
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        filtered = filtered.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.name_bn && c.name_bn.includes(q)) ||
            (c.company_name && c.company_name.toLowerCase().includes(q)) ||
            (c.mobile && c.mobile.includes(q)) ||
            (c.whatsapp && c.whatsapp.includes(q)) ||
            (c.area && c.area.toLowerCase().includes(q)) ||
            (c.customer_id_no && c.customer_id_no.toLowerCase().includes(q))
        )
      }

      if (selectedType !== 'all') {
        filtered = filtered.filter(
          (c) => (c.customer_category || c.customer_type || 'retail') === selectedType
        )
      }

      if (selectedDueFilter === 'has_due') {
        filtered = filtered.filter((c) => (c.total_due_balance || 0) > 0)
      } else if (selectedDueFilter === 'no_due') {
        filtered = filtered.filter((c) => (c.total_due_balance || 0) <= 0)
      }

      // Sort
      if (sortPreset === 'highest_billed') {
        filtered.sort((a, b) => (b.total_invoiced_amount || 0) - (a.total_invoiced_amount || 0))
      } else if (sortPreset === 'highest_due') {
        filtered.sort((a, b) => (b.total_due_balance || 0) - (a.total_due_balance || 0))
      } else if (sortPreset === 'latest_order') {
        filtered.sort((a, b) => (b.last_order_date || '').localeCompare(a.last_order_date || ''))
      } else if (sortPreset === 'alphabetical') {
        filtered.sort((a, b) => a.name.localeCompare(b.name))
      } else {
        filtered.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
      }

      setCustomers(filtered)
      setTotalRecords(filtered.length)

      // Recalculate authoritative KPI aggregates
      const computedTotal = allEnriched.length
      const computedActive = allEnriched.filter((c) => c.is_active !== false).length
      const computedWithDue = allEnriched.filter((c) => (c.total_due_balance || 0) > 0).length
      const computedTotalDue = allEnriched.reduce((sum, c) => sum + (c.total_due_balance || 0), 0)

      setSummary({
        totalCustomers: sumRes.success && sumRes.data?.totalCustomers && sumRes.data.totalCustomers > computedTotal
          ? sumRes.data.totalCustomers
          : computedTotal,
        activeCustomers: sumRes.success && sumRes.data?.activeCustomers && sumRes.data.activeCustomers > computedActive
          ? sumRes.data.activeCustomers
          : computedActive,
        customersWithDue: computedWithDue > 0
          ? computedWithDue
          : (sumRes.success ? sumRes.data?.customersWithDue || 0 : 0),
        totalOutstandingDue: computedTotalDue > 0
          ? computedTotalDue
          : (sumRes.success ? sumRes.data?.totalOutstandingDue || 0 : 0),
      })
    } catch {
      if (!isBackground && customers.length === 0) {
        setIsError(true)
        setErrorText('Network error while connecting to customer database.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [company?.slug, companyId, customers.length, page, pageSize, search, selectedDueFilter, selectedType, slug, sortPreset])

  useEffect(() => {
    loadData(false)

    const handleRealtimeSync = () => {
      loadData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:customers', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:payments', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:invoices', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:customers', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:payments', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:invoices', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [loadData])

  const handleOpenAddCustomer = () => {
    const check = checkCanCreate('max_customers')
    if (!check.allowed) {
      openLimitExceededModal('max_customers')
      return
    }
    setIsAddOpen(true)
  }

  const handleCustomerCreated = (created: CustomerRecord) => {
    showNotification(`Customer '${created.name}' registered successfully.`)
    refreshUsage()
    loadData()
  }

  const handleTrashCustomer = (cust: CustomerRecord) => {
    setCustomerToTrash(cust)
    setIsTrashConfirmOpen(true)
  }

  const confirmTrashCustomer = async () => {
    if (!customerToTrash) return
    setIsTrashing(true)
    try {
      const res = await moveToTrashAction('customers', customerToTrash, companyId)
      if (res.success) {
        showNotification(`Customer "${customerToTrash.name}" moved to Trash.`, 'success')
        setIsTrashConfirmOpen(false)
        setCustomerToTrash(null)
        loadData()
      } else {
        showNotification(res.error || 'Failed to move customer to trash.', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error moving customer to trash.', 'error')
    } finally {
      setIsTrashing(false)
    }
  }

  // UTF-8 CSV Export for Excel
  const handleExportCSV = () => {
    const headers = [
      'Customer ID',
      'Customer Name',
      'Bangla Name',
      'Type',
      'Company Name',
      'Contact Person',
      'Mobile Phone',
      'WhatsApp',
      'Email',
      'Area',
      'Address',
      'Total Invoiced (BDT)',
      'Total Paid (BDT)',
      'Due Balance (BDT)',
      'Credit Limit (BDT)',
      'Last Order No',
      'Last Order Date',
      'Status',
    ]
    const rows = customers.map((c, idx) => [
      `"${c.customer_id_no || formatCustomerIdNo(c, idx)}"`,
      `"${(c.name || '').replace(/"/g, '""')}"`,
      `"${(c.name_bn || '').replace(/"/g, '""')}"`,
      c.customer_category || c.customer_type || 'retail',
      `"${(c.company_name || '').replace(/"/g, '""')}"`,
      `"${(c.contact_person || '').replace(/"/g, '""')}"`,
      `"${c.mobile || (c as any).phone || ''}"`,
      `"${c.whatsapp || ''}"`,
      `"${c.email || ''}"`,
      `"${(c.area || '').replace(/"/g, '""')}"`,
      `"${(c.address || '').replace(/"/g, '""')}"`,
      Number(c.total_invoiced_amount) || 0,
      Number(c.total_paid_amount) || 0,
      Number(c.total_due_balance) || 0,
      Number(c.credit_limit) || 0,
      `"${c.last_order_number || ''}"`,
      `"${c.last_order_date || ''}"`,
      c.is_active === false ? 'Inactive' : 'Active',
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers-directory-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showNotification(tBilingual('Customer directory exported to CSV.', 'গ্রাহক তালিকা এক্সেলে এক্সপোর্ট করা হয়েছে।'))
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Page Header */}
      <PageHeader
        titleEn="Customers & Accounts Directory"
        titleBn="গ্রাহক ও ক্লায়েন্ট খতিয়ান"
        descriptionEn="Complete client directory with individualized price tiers, credit management, and 360° analytics."
        descriptionBn="গ্রাহক ডিরেক্টরি, কাস্টম দর তালিকা, বকেয়া বাকি ট্র্যাকিং ও ৩৬০ ডিগ্রি ব্যবসায়িক বিশ্লেষণ।"
        icon={Users}
        iconColor="text-blue-600 dark:text-blue-400"
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <Link href={getTenantNavHref('/trash?tab=customers', pathname, slug)}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-semibold h-9 text-slate-600 dark:text-slate-300"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">{tBilingual('Trash Bin', 'ট্র্যাশ বিন')}</span>
              </Button>
            </Link>

            {can('export', 'customers') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs font-semibold h-9"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span>{tBilingual('Export', 'এক্সপোর্ট')}</span>
              </Button>
            )}

            {can('create', 'customers') && (
              <Button
                size="sm"
                onClick={handleOpenAddCustomer}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                <span>{tBilingual('New Customer', 'নতুন গ্রাহক')}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Summary KPI Cards - Executive Style with Top Gradient Accent Bars */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Total Customers */}
        <Card className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <span>{tBilingual('Total Customers', 'মোট গ্রাহক')}</span>
            <Users className="h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric tabular-nums text-slate-900 dark:text-white mt-1.5">
            {summary.totalCustomers}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
            {tBilingual('Registered business profiles', 'নিবন্ধিত অ্যাকাউন্ট')}
          </p>
        </Card>

        {/* 2. Active Customers */}
        <Card className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-emerald-200/80 dark:border-emerald-900/40 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-800 transition-all rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            <span>{tBilingual('Active Customers', 'সক্রিয় গ্রাহক')}</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric tabular-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
            {summary.activeCustomers}
          </div>
          <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 truncate mt-1">
            {tBilingual('Operational accounts', 'চলমান হিসাব')}
          </p>
        </Card>

        {/* 3. Customers With Due */}
        <Card className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-amber-200/80 dark:border-amber-900/40 shadow-xs hover:border-amber-300 dark:hover:border-amber-800 transition-all rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            <span>{tBilingual('Customers With Due', 'বকেয়া বিশিষ্ট গ্রাহক')}</span>
            <AlertCircle className="h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric tabular-nums text-amber-600 dark:text-amber-400 mt-1.5">
            {summary.customersWithDue}
          </div>
          <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 truncate mt-1">
            {tBilingual('Outstanding receivables', 'পাওনা বাকি যুক্ত ক্লায়েন্ট')}
          </p>
        </Card>

        {/* 4. Total Outstanding Due */}
        <Card className="p-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-rose-300/80 dark:border-rose-900/50 shadow-xs hover:border-rose-400 dark:hover:border-rose-800 transition-all rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-red-600" />
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
            <span>{tBilingual('Total Due Balance', 'মোট বকেয়া স্থিতি')}</span>
            <TrendingUp className="h-4 w-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-numeric tabular-nums text-rose-600 dark:text-rose-400 mt-1.5 truncate">
            ৳{summary.totalOutstandingDue.toLocaleString('en-IN')}
          </div>
          <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 truncate mt-1">
            {tBilingual('Receivable across all accounts', 'সর্বমোট আদায়যোগ্য বকেয়া')}
          </p>
        </Card>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tBilingual(
              'Search by ID, name, company, phone, WhatsApp or area...',
              'আইডি, নাম, কোম্পানি, মোবাইল, হোয়াটসঅ্যাপ বা এলাকা দিয়ে খুঁজুন...'
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Customer Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="all">{tBilingual('All Types', 'সকল ধরণ')}</option>
            <option value="retail">{tBilingual('Retail', 'খুচরা')}</option>
            <option value="reseller">{tBilingual('Reseller', 'রিসেলার')}</option>
            <option value="corporate">{tBilingual('Corporate', 'কর্পোরেট')}</option>
            <option value="agency">{tBilingual('Agency', 'এজেন্সি')}</option>
            <option value="government">{tBilingual('Government', 'সরকারি')}</option>
          </select>

          {/* Due Status Filter */}
          <select
            value={selectedDueFilter}
            onChange={(e) => {
              setSelectedDueFilter(e.target.value as any)
              setPage(1)
            }}
            className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="all">{tBilingual('All Balances', 'সকল ব্যালেন্স')}</option>
            <option value="has_due">{tBilingual('Has Outstanding Due', 'বকেয়া আছে')}</option>
            <option value="no_due">{tBilingual('No Due (Settled)', 'বকেয়া নেই')}</option>
          </select>

          {/* Sort Preset */}
          <select
            value={sortPreset}
            onChange={(e) => {
              setSortPreset(e.target.value as any)
              setPage(1)
            }}
            className="h-9 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="newest">{tBilingual('Sort: Newest First', 'ক্রম: নতুন প্রথমে')}</option>
            <option value="highest_billed">{tBilingual('Sort: Highest Billed', 'ক্রম: সর্বোচ্চ বিল')}</option>
            <option value="highest_due">{tBilingual('Sort: Highest Due', 'ক্রম: সর্বোচ্চ বকেয়া')}</option>
            <option value="latest_order">{tBilingual('Sort: Latest Order', 'ক্রম: সর্বশেষ অর্ডার')}</option>
            <option value="alphabetical">{tBilingual('Sort: Alphabetical (A-Z)', 'ক্রম: বর্ণানুক্রমিক (A-Z)')}</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={isLoading}
            className="h-9 px-2.5 text-xs text-slate-500 rounded-xl"
            title="Refresh List"
          >
            <RotateCcw className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-20 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        /* Error State with Retry */
        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-rose-500 mx-auto" />
          <div className="text-sm font-bold text-rose-900 dark:text-rose-300">
            {errorText}
          </div>
          <div>
            <Button size="sm" onClick={() => loadData()} className="text-xs bg-rose-600 hover:bg-rose-700">
              {tBilingual('Retry Data Load', 'পুনরায় লোড করুন')}
            </Button>
          </div>
        </Card>
      ) : customers.length === 0 ? (
        /* Empty State */
        <Card className="border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 bg-white dark:bg-slate-950">
          <div className="p-3 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 w-fit mx-auto">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {tBilingual('No Customers Found', 'কোনো গ্রাহক পাওয়া যায়নি')}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || selectedType !== 'all' || selectedDueFilter !== 'all'
                ? tBilingual('No customer records matched your query. Try resetting your search filters.', 'আপনার সার্চের সাথে কোনো গ্রাহক মেলেনি। ফিল্টার রিসেট করে দেখুন।')
                : tBilingual('Get started by creating your first customer profile to manage rates and invoices.', 'কাস্টমার প্রোফাইল তৈরি করে রেট ও ইনভয়েস ব্যবস্থাপনা শুরু করুন।')}
            </p>
          </div>
          {can('create', 'customers') && (
            <Button
              size="sm"
              onClick={handleOpenAddCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              <span>{tBilingual('Create First Customer', 'প্রথম কাস্টমার তৈরি করুন')}</span>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-3">{tBilingual('Customer ID', 'কাস্টমার আইডি')}</th>
                    <th className="py-3 px-4">{tBilingual('Customer Name', 'গ্রাহকের নাম')}</th>
                    <th className="py-3 px-3">{tBilingual('Company', 'কোম্পানি')}</th>
                    <th className="py-3 px-3">{tBilingual('Contact', 'যোগাযোগ')}</th>
                    <th className="py-3 px-3">{tBilingual('Type', 'ধরণ')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Total Invoiced', 'মোট ইনভয়েস')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Due Balance', 'বকেয়া স্থিতি')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Last Order', 'সর্বশেষ অর্ডার')}</th>
                    <th className="py-3 px-4 text-center">{tBilingual('Quick Actions', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
                  {customers.map((c, idx) => {
                    const hasDue = (c.total_due_balance || 0) > 0
                    const custType = c.customer_category || c.customer_type || 'retail'
                    const custIdNo = c.customer_id_no || formatCustomerIdNo(c, idx)

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        {/* Customer ID */}
                        <td className="py-3.5 px-3">
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {custIdNo}
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
                            className="font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1.5"
                          >
                            <span>{c.name}</span>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          {c.name_bn && (
                            <div className="text-[11px] text-slate-500">{c.name_bn}</div>
                          )}
                          {c.area && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{c.area}</div>
                          )}
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-3">
                          {c.company_name ? (
                            <div className="font-semibold text-slate-700 dark:text-slate-300">
                              {c.company_name}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <a
                              href={`tel:${c.mobile}`}
                              className="font-mono text-slate-900 dark:text-white hover:text-blue-600 flex items-center gap-1"
                              title="Call"
                            >
                              <Phone className="h-3 w-3 text-slate-400" />
                              <span>{c.mobile}</span>
                            </a>
                            {c.whatsapp && (
                              <a
                                href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700"
                                title="Chat on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Customer Type Badge */}
                        <td className="py-3.5 px-3">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold capitalize',
                              custType === 'corporate' && 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
                              custType === 'agency' && 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
                              custType === 'reseller' && 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300',
                              custType === 'government' && 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
                              custType === 'retail' && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300'
                            )}
                          >
                            {custType === 'corporate'
                              ? tBilingual('Corporate', 'কর্পোরেট')
                              : custType === 'agency'
                              ? tBilingual('Agency', 'এজেন্সি')
                              : custType === 'reseller'
                              ? tBilingual('Reseller', 'রিসেলার')
                              : custType === 'government'
                              ? tBilingual('Government', 'সরকারি')
                              : tBilingual('Retail', 'খুচরা')}
                          </Badge>
                        </td>

                        {/* Total Invoiced */}
                        <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300 font-numeric tabular-nums">
                          ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Due Balance */}
                        <td className="py-3.5 px-3 text-right">
                          <span
                            className={cn(
                              'font-bold px-2 py-0.5 rounded-md text-xs font-numeric tabular-nums',
                              hasDue
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                                : 'text-slate-400'
                            )}
                          >
                            ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Last Order */}
                        <td className="py-3.5 px-3 text-right text-slate-500">
                          {c.last_order_date || c.last_order_number ? (
                            <div>
                              <div className="font-medium text-slate-700 dark:text-slate-300">
                                {c.last_order_number || 'Order'}
                              </div>
                              <div className="text-[10px] text-slate-400 font-numeric">{c.last_order_date}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* New Quotation Shortcut */}
                            <Link
                              href={getTenantNavHref(`/quotations/new?customerId=${c.id}`, pathname, slug)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Create Quotation"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>

                            {/* Create Invoice Shortcut (Modal) */}
                            <button
                              onClick={() => setSelectedCustomerForInvoice(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
                              title="Create Invoice"
                            >
                              <Receipt className="h-4 w-4" />
                            </button>

                            {/* Record Payment (Modal) */}
                            {hasDue && (
                              <button
                                onClick={() => setSelectedCustomerForPayment(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                                title="Record Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </button>
                            )}

                            {/* 360 View */}
                            <Link
                              href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 font-bold text-xs transition-colors ml-1"
                            >
                              <span>360</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* Trash / Move to Recycle Bin */}
                            {can('delete', 'customers') && (
                              <button
                                onClick={() => handleTrashCustomer(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Move to Trash"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-3">
            {customers.map((c, idx) => {
              const hasDue = (c.total_due_balance || 0) > 0
              const custType = c.customer_category || c.customer_type || 'retail'
              const custIdNo = c.customer_id_no || formatCustomerIdNo(c, idx)

              return (
                <Card
                  key={c.id}
                  className={cn(
                    'border shadow-sm p-4 space-y-3 bg-white dark:bg-slate-950 transition-colors rounded-2xl relative overflow-hidden',
                    hasDue
                      ? 'border-rose-200/80 dark:border-rose-950/80'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  {/* Top: Name, Type, ID, Due Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
                          className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600"
                        >
                          {c.name}
                        </Link>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {custIdNo}
                        </span>
                      </div>
                      {c.name_bn && (
                        <div className="text-xs text-slate-500">{c.name_bn}</div>
                      )}
                      {c.company_name && (
                        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 text-slate-400" />
                          <span>{c.company_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {custType}
                      </Badge>
                      {hasDue && (
                        <span className="text-[11px] font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                          Due: ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Actions (Call & WhatsApp) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-900">
                    <a
                      href={`tel:${c.mobile}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      <span>{c.mobile}</span>
                    </a>

                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900"
                        title="WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Financial Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">{tBilingual('Total Billed', 'মোট বিল')}</div>
                      <div className="font-bold text-slate-900 dark:text-white font-numeric">
                        ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">{tBilingual('Due Balance', 'বকেয়া স্থিতি')}</div>
                      <div
                        className={cn(
                          'font-bold font-numeric',
                          hasDue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                        )}
                      >
                        ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Quick Action Buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      href={getTenantNavHref(`/quotations/new?customerId=${c.id}`, pathname, slug)}
                      className="flex-1 text-center py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      {tBilingual('Quote', 'কোটেশন')}
                    </Link>
                    <button
                      onClick={() => setSelectedCustomerForInvoice(c)}
                      className="flex-1 text-center py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                    >
                      {tBilingual('Invoice', 'ইনভয়েস')}
                    </button>
                    {hasDue && (
                      <button
                        onClick={() => setSelectedCustomerForPayment(c)}
                        className="flex-1 text-center py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
                      >
                        {tBilingual('Pay', 'পরিশোধ')}
                      </button>
                    )}
                    {can('delete', 'customers') && (
                      <button
                        onClick={() => handleTrashCustomer(c)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50"
                        title="Move to Trash"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Bottom: View 360 Workspace Button */}
                  <Link
                    href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    <span>{tBilingual('Open Customer 360 Workspace', 'কাস্টমার ৩৬০ ওয়ার্কস্পেস খুলুন')}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Card>
              )
            })}
          </div>

          {/* Pagination Controls */}
          <PaginationControls
            pageIndex={page - 1}
            pageSize={pageSize}
            totalCount={totalRecords}
            onPageChange={(idx) => setPage(idx + 1)}
            onPageSizeChange={(size) => {
              setPageSize(size)
              setPage(1)
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      {/* New Customer Modal */}
      <NewCustomerModal
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        onCustomerCreated={handleCustomerCreated}
        companyId={companyId}
      />

      {/* Quick Invoice Creation Modal */}
      {selectedCustomerForInvoice && (
        <NewInvoiceModal
          open={Boolean(selectedCustomerForInvoice)}
          onOpenChange={(open) => !open && setSelectedCustomerForInvoice(null)}
          preselectedCustomerId={selectedCustomerForInvoice.id}
          onInvoiceCreated={(newInv) => {
            setSelectedCustomerForInvoice(null)
            showNotification(`Invoice ${newInv.invoice_number} created for ${selectedCustomerForInvoice.name}!`)
            loadData()
          }}
        />
      )}

      {/* Quick Payment Collection Modal */}
      {selectedCustomerForPayment && (
        <RecordPaymentModal
          open={Boolean(selectedCustomerForPayment)}
          onOpenChange={(open) => !open && setSelectedCustomerForPayment(null)}
          preselectedCustomerId={selectedCustomerForPayment.id}
          onPaymentRecorded={() => {
            setSelectedCustomerForPayment(null)
            showNotification(`Payment recorded for ${selectedCustomerForPayment.name}!`)
            loadData()
          }}
        />
      )}

      {/* Customer Trash Confirm Dialog */}
      <ConfirmDialog
        open={isTrashConfirmOpen}
        onOpenChange={setIsTrashConfirmOpen}
        title={`Move "${customerToTrash?.name || 'Customer'}" to Trash?`}
        titleBn={`"${customerToTrash?.name || 'কাস্টমার'}" ট্র্যাশে স্থানান্তর করবেন?`}
        message="Are you sure you want to move this customer to Trash / Recycle Bin? Outstanding invoices and history will be preserved."
        messageBn="আপনি কি এই কাস্টমারকে রিসাইকেল বিনে সরাতে চান? পূর্বের ইনভয়েস ও লেনদেন রেকর্ড সংরক্ষিত থাকবে।"
        confirmText="Move to Trash"
        confirmTextBn="ট্র্যাশে সরান"
        cancelText="Cancel"
        cancelTextBn="বাতিল"
        isDestructive={true}
        isLoading={isTrashing}
        onConfirm={confirmTrashCustomer}
      />
    </div>
  )
}
