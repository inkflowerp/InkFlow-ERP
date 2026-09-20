'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
import { cn } from '@/lib/utils'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

export default function CustomersPage() {
  const params = useParams()
  const { company } = useTenant()
  const { can } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, refreshUsage } = useSubscription()
  const { tBilingual } = useI18n()

  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id

  // State with Zero-Latency SWR Cache Hydration
  const [customers, setCustomers] = useState<CustomerRecord[]>(() => {
    try {
      return PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS) || []
    } catch {
      return []
    }
  })
  const [summary, setSummary] = useState<CustomerSummaryStatistics>({
    totalCustomers: 0,
    activeCustomers: 0,
    customersWithDue: 0,
    totalOutstandingDue: 0,
  })
  const [totalRecords, setTotalRecords] = useState(() => {
    try {
      const cached = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS)
      return cached ? cached.length : 0
    } catch {
      return 0
    }
  })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedDueFilter, setSelectedDueFilter] = useState<'all' | 'has_due' | 'no_due'>('all')
  const [sortPreset, setSortPreset] = useState<'newest' | 'highest_billed' | 'highest_due' | 'latest_order' | 'alphabetical'>('newest')

  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = PrintERPDataStore.get<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS)
      return !cached || cached.length === 0
    } catch {
      return true
    }
  })
  const [isError, setIsError] = useState(false)
  const [errorText, setErrorText] = useState('')

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [selectedCustomerForInvoice, setSelectedCustomerForInvoice] = useState<CustomerRecord | null>(null)
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<CustomerRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

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

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data)
      }

      if (listRes.success && listRes.data) {
        setCustomers(listRes.data.data)
        setTotalRecords(listRes.data.meta?.totalCount ?? listRes.data.data.length)
        try {
          if (page === 1 && !search && selectedType === 'all' && selectedDueFilter === 'all') {
            PrintERPDataStore.set(STORAGE_KEYS.CUSTOMERS, listRes.data.data, false)
          }
        } catch {}
      } else {
        if (!isBackground && customers.length === 0) {
          setIsError(true)
          setErrorText(listRes.error || 'Failed to fetch customer directory.')
        }
      }
    } catch {
      if (!isBackground && customers.length === 0) {
        setIsError(true)
        setErrorText('Network error while connecting to customer database.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [companyId, page, pageSize, search, selectedType, selectedDueFilter, sortPreset, customers.length])

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

  const handleTrashCustomer = async (cust: CustomerRecord) => {
    if (!confirm(`Move customer "${cust.name}" to Trash / Recycle Bin?`)) {
      return
    }
    try {
      const res = await moveToTrashAction('customers', cust, companyId)
      if (res.success) {
        showNotification(`Customer "${cust.name}" moved to Trash.`)
        loadData()
      } else {
        showNotification(res.error || 'Failed to move customer to trash.')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error moving customer to trash.')
    }
  }

  // UTF-8 CSV Export for Excel
  const handleExportCSV = () => {
    const headers = ['ID', 'Customer Name', 'Bangla Name', 'Type', 'Company', 'Mobile', 'WhatsApp', 'Email', 'Area', 'Due Balance BDT', 'Credit Limit BDT']
    const rows = customers.map((c) => [
      c.id,
      `"${c.name}"`,
      `"${c.name_bn || ''}"`,
      c.customer_type || c.customer_category || 'regular',
      `"${c.company_name || ''}"`,
      c.mobile || (c as any).phone || '',
      c.whatsapp || '',
      c.email || '',
      `"${c.area || ''}"`,
      c.total_due_balance || 0,
      c.credit_limit || 0,
    ])

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `customers-directory-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showNotification('Customer directory exported to CSV.')
  }

  return (
    <div className="space-y-6 max-w-7xl pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span>Customers & Accounts</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete client directory with individualized price tiers, credit management, and 360° analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link href="/trash?tab=customers">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-semibold h-9 text-slate-600 dark:text-slate-300"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Trash Bin</span>
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
              Export
            </Button>
          )}

          {can('create', 'customers') && (
            <Button
              size="sm"
              onClick={handleOpenAddCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 px-4 shadow-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              + New Customer
            </Button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Customers */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Total Customers</span>
              <Users className="h-4 w-4 text-blue-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {summary.totalCustomers}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Registered business profiles
            </p>
          </CardContent>
        </Card>

        {/* Active Customers */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Active Customers</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {summary.activeCustomers}
            </div>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 truncate">
              Operational accounts
            </p>
          </CardContent>
        </Card>

        {/* Customers With Due */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Customers With Due</span>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
              {summary.customersWithDue}
            </div>
            <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 truncate">
              Outstanding receivables
            </p>
          </CardContent>
        </Card>

        {/* Total Outstanding Due */}
        <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Total Due Balance</span>
              <TrendingUp className="h-4 w-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 truncate">
              ৳{summary.totalOutstandingDue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 truncate">
              Receivable across all accounts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by customer name, company, phone, WhatsApp or area..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9 bg-slate-50/50 dark:bg-slate-900/50"
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
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="all">All Types (সব ধরণ)</option>
            <option value="retail">Retail (রিটেইল)</option>
            <option value="reseller">Reseller (রিসেলার)</option>
            <option value="corporate">Corporate (কর্পোরেট)</option>
            <option value="agency">Agency (এজেন্সি)</option>
            <option value="government">Government (সরকারি)</option>
          </select>

          {/* Due Status Filter */}
          <select
            value={selectedDueFilter}
            onChange={(e) => {
              setSelectedDueFilter(e.target.value as any)
              setPage(1)
            }}
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium"
          >
            <option value="all">All Balances (সব)</option>
            <option value="has_due">Has Outstanding Due (বকেয়া আছে)</option>
            <option value="no_due">No Due (বকেয়া নেই)</option>
          </select>

          {/* Sort Preset */}
          <select
            value={sortPreset}
            onChange={(e) => {
              setSortPreset(e.target.value as any)
              setPage(1)
            }}
            className="h-9 px-3 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="newest">Sort: Newest First</option>
            <option value="highest_billed">Sort: Highest Billed</option>
            <option value="highest_due">Sort: Highest Due Balance</option>
            <option value="latest_order">Sort: Latest Order</option>
            <option value="alphabetical">Sort: Alphabetical (A-Z)</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData()}
            disabled={isLoading}
            className="h-9 px-2.5 text-xs text-slate-500"
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
              Retry Data Load
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
              No Customers Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {search || selectedType !== 'all' || selectedDueFilter !== 'all'
                ? 'No customer records matched your query. Try resetting your search filters.'
                : 'Get started by creating your first customer profile to manage rates and invoices.'}
            </p>
          </div>
          {can('create', 'customers') && (
            <Button
              size="sm"
              onClick={handleOpenAddCustomer}
              className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              + Create First Customer
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Company</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3 text-right">Total Invoiced</th>
                    <th className="py-3 px-3 text-right">Due Balance</th>
                    <th className="py-3 px-3 text-right">Last Order</th>
                    <th className="py-3 px-4 text-center">Quick Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {customers.map((c) => {
                    const hasDue = (c.total_due_balance || 0) > 0
                    const custType = c.customer_category || c.customer_type || 'regular'

                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        {/* Customer Name */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/customers/${c.id}`}
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
                            {custType}
                          </Badge>
                        </td>

                        {/* Total Invoiced */}
                        <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Due Balance */}
                        <td className="py-3.5 px-3 text-right">
                          <span
                            className={cn(
                              'font-bold px-2 py-0.5 rounded-md text-xs',
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
                              <div className="text-[10px] text-slate-400">{c.last_order_date}</div>
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
                              href={`/quotations/new?customerId=${c.id}`}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Create Quotation"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>

                            {/* Create Invoice Shortcut (Modal) */}
                            <button
                              onClick={() => setSelectedCustomerForInvoice(c)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                              title="Create Invoice"
                            >
                              <Receipt className="h-4 w-4" />
                            </button>

                            {/* Record Payment (Modal) */}
                            {hasDue && (
                              <button
                                onClick={() => setSelectedCustomerForPayment(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Record Payment"
                              >
                                <CreditCard className="h-4 w-4" />
                              </button>
                            )}

                            {/* 360 View */}
                            <Link
                              href={`/customers/${c.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 font-semibold text-xs transition-colors ml-1"
                            >
                              <span>360</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>

                            {/* Trash / Move to Recycle Bin */}
                            {can('delete', 'customers') && (
                              <button
                                onClick={() => handleTrashCustomer(c)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
            {customers.map((c) => {
              const hasDue = (c.total_due_balance || 0) > 0
              const custType = c.customer_category || c.customer_type || 'regular'

              return (
                <Card
                  key={c.id}
                  className={cn(
                    'border shadow-sm p-4 space-y-3 bg-white dark:bg-slate-950 transition-colors',
                    hasDue
                      ? 'border-rose-200/80 dark:border-rose-950/80'
                      : 'border-slate-200 dark:border-slate-800'
                  )}
                >
                  {/* Top: Name, Type, Due Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/customers/${c.id}`}
                        className="font-bold text-base text-slate-900 dark:text-white hover:text-blue-600"
                      >
                        {c.name}
                      </Link>
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
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 font-semibold text-xs text-slate-800 dark:text-slate-200"
                    >
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      <span>{c.mobile}</span>
                    </a>

                    {c.whatsapp && (
                      <a
                        href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-900"
                        title="WhatsApp"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </a>
                    )}
                  </div>

                  {/* Financial Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-400">Total Billed</div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Due Balance</div>
                      <div
                        className={cn(
                          'font-bold',
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
                      href={`/quotations/new?customerId=${c.id}`}
                      className="flex-1 text-center py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      + Quote
                    </Link>
                    <button
                      onClick={() => setSelectedCustomerForInvoice(c)}
                      className="flex-1 text-center py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50"
                    >
                      + Invoice
                    </button>
                    {hasDue && (
                      <button
                        onClick={() => setSelectedCustomerForPayment(c)}
                        className="flex-1 text-center py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50"
                      >
                        Pay
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
                    href={`/customers/${c.id}`}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
                  >
                    <span>Open Customer 360 Workspace</span>
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
    </div>
  )
}
