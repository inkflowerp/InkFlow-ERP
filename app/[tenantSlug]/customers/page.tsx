'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
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
 Eye,
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { KpiCard, KpiGrid } from '@/components/shared/kpi-card'
import { NewInvoiceModal } from '@/components/billing/new-invoice-modal'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import {
 getPaginatedCustomersAction,
 getCustomersSummaryAction,
 deleteCustomerAction,
} from '@/actions/customer.actions'
import { moveToTrashAction } from '@/actions/trash.actions'
import {
 CustomerRecord,
 CustomerSummaryStatistics,
 CustomerCategory,
} from '@/types/crm.types'
import { TrashRecord } from '@/types/trash.types'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { cn } from '@/lib/utils'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

import { formatCustomerIdNo as canonicalFormatCustomerIdNo } from '@/lib/formatters'

export function formatCustomerIdNo(c: Partial<CustomerRecord>, index?: number): string {
 return canonicalFormatCustomerIdNo(c, index)
}

function removeLocalCustomer(id: string, slug?: string, companySlug?: string, companyId?: string) {
 if (typeof window === 'undefined') return
 try {
 const candidateKeys = [
 slug ? `${STORAGE_KEYS.CUSTOMERS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.CUSTOMERS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.CUSTOMERS}__${companyId}` : null,
    ].filter(Boolean) as string[]

 candidateKeys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 const filtered = parsed.filter((c: any) => c?.id !== id)
 localStorage.setItem(key, JSON.stringify(filtered))
          }
        }
      } catch {}
    })

 if (slug) PrintERPDataStore.removeItem(STORAGE_KEYS.CUSTOMERS, id, slug)
 if (companySlug && companySlug !== slug) PrintERPDataStore.removeItem(STORAGE_KEYS.CUSTOMERS, id, companySlug)
 if (companyId) PrintERPDataStore.removeItem(STORAGE_KEYS.CUSTOMERS, id, companyId)
  } catch {}
}

function getLocalInvoices(slug?: string, companySlug?: string, companyId?: string): any[] {
 if (typeof window === 'undefined') return []
 const invMap = new Map<string, any>()
 const keys = [
 slug ? `${STORAGE_KEYS.INVOICES}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.INVOICES}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.INVOICES}__${companyId}` : null,
  ].filter(Boolean) as string[]

 const isMatching = (item: any) => {
 if (!item || !item.id) return false
 if (!companyId && !slug && !companySlug) return true
 const cId = item.company_id ? String(item.company_id).toLowerCase().trim() : null
 const targetId = companyId ? String(companyId).toLowerCase().trim() : null
 const targetSlug = slug ? String(slug).toLowerCase().trim() : null
 const targetCompanySlug = companySlug ? String(companySlug).toLowerCase().trim() : null
 if (cId) {
 return (targetId && cId === targetId) || (targetSlug && cId === targetSlug) || (targetCompanySlug && cId === targetCompanySlug)
    }
 return false
  }

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((inv) => {
 if (isMatching(inv)) invMap.set(inv.id, inv)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, companySlug) || []) : []),
    ...(companyId ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.INVOICES, companyId) || []) : []),
  ]
 storeItems.forEach((inv) => {
 if (isMatching(inv)) invMap.set(inv.id, inv)
  })

 return Array.from(invMap.values())
}

function getLocalPayments(slug?: string, companySlug?: string, companyId?: string): any[] {
 if (typeof window === 'undefined') return []
 const payMap = new Map<string, any>()
 const keys = [
 slug ? `${STORAGE_KEYS.PAYMENTS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.PAYMENTS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.PAYMENTS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 const isMatching = (item: any) => {
 if (!item || !item.id) return false
 if (!companyId && !slug && !companySlug) return true
 const cId = item.company_id ? String(item.company_id).toLowerCase().trim() : null
 const targetId = companyId ? String(companyId).toLowerCase().trim() : null
 const targetSlug = slug ? String(slug).toLowerCase().trim() : null
 const targetCompanySlug = companySlug ? String(companySlug).toLowerCase().trim() : null
 if (cId) {
 return (targetId && cId === targetId) || (targetSlug && cId === targetSlug) || (targetCompanySlug && cId === targetCompanySlug)
    }
 return false
  }

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((pay) => {
 if (isMatching(pay)) payMap.set(pay.id, pay)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, companySlug) || []) : []),
    ...(companyId ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.PAYMENTS, companyId) || []) : []),
  ]
 storeItems.forEach((pay) => {
 if (isMatching(pay)) payMap.set(pay.id, pay)
  })

 return Array.from(payMap.values())
}

function getLocalOrders(slug?: string, companySlug?: string, companyId?: string): any[] {
 if (typeof window === 'undefined') return []
 const ordMap = new Map<string, any>()
 const keys = [
 slug ? `${STORAGE_KEYS.ORDERS}__${slug}` : null,
 companySlug && companySlug !== slug ? `${STORAGE_KEYS.ORDERS}__${companySlug}` : null,
 companyId ? `${STORAGE_KEYS.ORDERS}__${companyId}` : null,
  ].filter(Boolean) as string[]

 const isMatching = (item: any) => {
 if (!item || !item.id) return false
 if (!companyId && !slug && !companySlug) return true
 const cId = item.company_id ? String(item.company_id).toLowerCase().trim() : null
 const targetId = companyId ? String(companyId).toLowerCase().trim() : null
 const targetSlug = slug ? String(slug).toLowerCase().trim() : null
 const targetCompanySlug = companySlug ? String(companySlug).toLowerCase().trim() : null
 if (cId) {
 return (targetId && cId === targetId) || (targetSlug && cId === targetSlug) || (targetCompanySlug && cId === targetCompanySlug)
    }
 return false
  }

 keys.forEach((key) => {
 try {
 const raw = localStorage.getItem(key)
 if (raw) {
 const parsed = JSON.parse(raw)
 if (Array.isArray(parsed)) {
 parsed.forEach((ord) => {
 if (isMatching(ord)) ordMap.set(ord.id, ord)
          })
        }
      }
    } catch {}
  })

 const storeItems = [
    ...(slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, slug) || []) : []),
    ...(companySlug && companySlug !== slug ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, companySlug) || []) : []),
    ...(companyId ? (PrintERPDataStore.getAll<any>(STORAGE_KEYS.ORDERS, companyId) || []) : []),
  ]
 storeItems.forEach((ord) => {
 if (isMatching(ord)) ordMap.set(ord.id, ord)
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
  const searchParams = useSearchParams()
  const router = useRouter()
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
  const [page, setPage] = useState(() => { const p = parseInt(searchParams?.get('page') || '1', 10); return isNaN(p) || p < 1 ? 1 : p; })
 const [pageSize, setPageSize] = useState(25)

  const [search, setSearch] = useState(() => searchParams?.get('q') || searchParams?.get('search') || '')
  const [selectedType, setSelectedType] = useState<string>(() => searchParams?.get('type') || 'all')
  const [selectedDueFilter, setSelectedDueFilter] = useState<'all' | 'has_due' | 'no_due'>(() => { const due = searchParams?.get('due'); return due === 'has_due' || due === 'no_due' ? due : 'all'; })
  const [sortPreset, setSortPreset] = useState<'newest' | 'highest_billed' | 'highest_due' | 'latest_order' | 'alphabetical'>(() => { const s = searchParams?.get('sort'); return s && ['newest', 'highest_billed', 'highest_due', 'latest_order', 'alphabetical'].includes(s) ? (s as any) : 'newest'; })

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

  // 3-dot dropdown menu state for customer row actions
 const [activeMenuCustomerId, setActiveMenuCustomerId] = useState<string | null>(null)

 useEffect(() => {
 const handleDocumentClick = (e: MouseEvent) => {
 const target = e.target as HTMLElement | null
 if (!target?.closest('[data-customer-menu]')) {
 setActiveMenuCustomerId(null)
      }
    }
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === 'Escape') {
 setActiveMenuCustomerId(null)
      }
    }
 document.addEventListener('click', handleDocumentClick)
 document.addEventListener('keydown', handleKeyDown)
 return () => {
 document.removeEventListener('click', handleDocumentClick)
 document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

 useEffect(() => {
 setActiveMenuCustomerId(null)
  }, [search, selectedType, selectedDueFilter, sortPreset, page])

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
            (c.customer_id_no && c.customer_id_no.toLowerCase().includes(q)) ||
            (c.customer_code && c.customer_code.toLowerCase().includes(q)) ||
 formatCustomerIdNo(c).toLowerCase().includes(q)
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

  // Synchronize state with URL search parameters
  useEffect(() => {
    if (!isMounted) return
    const currentParams = new URLSearchParams()
    if (search.trim()) currentParams.set('q', search.trim())
    if (selectedType !== 'all') currentParams.set('type', selectedType)
    if (selectedDueFilter !== 'all') currentParams.set('due', selectedDueFilter)
    if (sortPreset !== 'newest') currentParams.set('sort', sortPreset)
    if (page > 1) currentParams.set('page', String(page))

    const qs = currentParams.toString()
    const targetUrl = qs ? `${pathname}?${qs}` : pathname
    router.replace(targetUrl, { scroll: false })
  }, [search, selectedType, selectedDueFilter, sortPreset, page, pathname, router, isMounted])

  // Prioritized Attention Queue: identify high-due, exceeded-credit-limit, and inactive overdue accounts
  const attentionCustomers = useMemo(() => {
    return customers
      .filter((c) => (c.total_due_balance || 0) > 0)
      .map((c) => {
        const due = c.total_due_balance || 0
        const limit = Number(c.credit_limit) || 0
        let reason: 'exceeded_limit' | 'high_due' | 'inactive_due' = 'high_due'
        let reasonLabelEn = 'Outstanding Due'
        let reasonLabelBn = 'বকেয়া পাওনা'

        if (c.is_active === false) {
          reason = 'inactive_due'
          reasonLabelEn = 'Inactive Account with Due'
          reasonLabelBn = 'নিষ্ক্রিয় গ্রাহকের বকেয়া'
        } else if (limit > 0 && due >= limit) {
          reason = 'exceeded_limit'
          reasonLabelEn = 'Credit Limit Exceeded'
          reasonLabelBn = 'ক্রেডিট সীমা অতিক্রান্ত'
        } else if (due >= 25000) {
          reason = 'high_due'
          reasonLabelEn = 'High Priority Due'
          reasonLabelBn = 'জরুরি বকেয়া কালেকশন'
        }
        return {
          customer: c,
          due,
          limit,
          reason,
          reasonLabelEn,
          reasonLabelBn,
        }
      })
      .sort((a, b) => {
        const weight = (r: 'exceeded_limit' | 'high_due' | 'inactive_due') => (r === 'exceeded_limit' ? 3 : r === 'inactive_due' ? 2 : 1)
        if (weight(b.reason) !== weight(a.reason)) {
          return weight(b.reason) - weight(a.reason)
        }
        return b.due - a.due
      })
      .slice(0, 3)
  }, [customers])

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
 const targetCust = customerToTrash
 const targetId = targetCust.id

 try {
      // 1. Authoritative DB deletion check: ensure customer has no existing transactions (invoices, payments, orders)
 const delRes = await deleteCustomerAction(targetId, companyId)
 if (!delRes.success) {
 showNotification(
 delRes.error ||
 tBilingual(
              'Cannot delete customer with existing invoice, payment, or order history. Please deactivate them instead.',
              'ইনভয়েস, পেমেন্ট বা অর্ডার হিস্ট্রি থাকা কাস্টমার ডিলিট করা সম্ভব নয়। তাদের নিষ্ক্রিয় করুন।'
            ),
          'error'
        )
 setIsTrashConfirmOpen(false)
 return
      }

      // 2. Move to Trash / Recycle Bin on server
 const res = await moveToTrashAction('customers', targetCust, companyId, slug)

      // 3. Purge from browser localStorage and client DataStore across all keys
 removeLocalCustomer(targetId, slug, company?.slug, companyId)

      // 4. Update local state immediately
 setCustomers((prev) => prev.filter((c) => c.id !== targetId))
 setSummary((prev) => ({
        ...prev,
 totalCustomers: Math.max(0, prev.totalCustomers - 1),
 activeCustomers: targetCust.is_active ? Math.max(0, prev.activeCustomers - 1) : prev.activeCustomers,
      }))

      // 5. Sync to client TRASH_ITEMS so Trash page sees it immediately
 if (res.success && res.record) {
 const localTrash = PrintERPDataStore.get<TrashRecord[]>(STORAGE_KEYS.TRASH_ITEMS) || []
 PrintERPDataStore.set(STORAGE_KEYS.TRASH_ITEMS, [res.record, ...localTrash.filter((t) => t.id !== res.record.id)])
      }

 setIsTrashConfirmOpen(false)
 setCustomerToTrash(null)
 showNotification(
 tBilingual(
          `Customer"${targetCust.name}"moved to Trash.`,
          `গ্রাহক"${targetCust.name}"সফলভাবে ট্র্যাশে স্থানান্তর করা হয়েছে।`
        ),
        'success'
      )

 loadData()
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
    <PanelAccessGuard
 module="customers"action="view"panelTitle="Customers & CRM"panelTitleBn="কাস্টমার ও হিসাব">
      <div className="space-y-6 pb-16">
      {/* Page Header */}
      <PageHeader
 titleEn="Customers & Accounts Directory"titleBn="গ্রাহক ও ক্লায়েন্ট খতিয়ান"descriptionEn="Complete client directory with individualized price tiers, credit management, and 360° analytics."descriptionBn="গ্রাহক ডিরেক্টরি, কাস্টম দর তালিকা, বকেয়া বাকি ট্র্যাকিং ও ৩৬০ ডিগ্রি ব্যবসায়িক বিশ্লেষণ।"icon={Users}
 iconColor="text-primary"actions={
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {can('export', 'customers') && (
              <Button
 variant="outline"size="sm"onClick={handleExportCSV}
 className="gap-1.5">
                <Download className="h-3.5 w-3.5"/>
                <span>{tBilingual('Export', 'এক্সপোর্ট')}</span>
              </Button>
            )}

            {can('create', 'customers') && (
              <Button
 size="sm"onClick={handleOpenAddCustomer}
 className="gap-1.5">
                <Plus className="h-4 w-4"/>
                <span>{tBilingual('New Customer', 'নতুন গ্রাহক')}</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Notification Banner */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-success-surface border border-success-border text-success text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
          <CheckCircle2 className="h-4 w-4 shrink-0"/>
          <span>{notification}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <KpiGrid columns={4}>
        {/* 1. Total Customers */}
        <KpiCard
 titleEn="Total Customers"titleBn="মোট গ্রাহক"value={summary.totalCustomers}
 icon={Users}
 colorVariant="blue"subtitleEn="Registered business profiles"subtitleBn="নিবন্ধিত অ্যাকাউন্ট"/>

        {/* 2. Active Customers */}
        <KpiCard
 titleEn="Active Customers"titleBn="সক্রিয় গ্রাহক"value={summary.activeCustomers}
 icon={CheckCircle2}
 colorVariant="emerald"subtitleEn="Operational accounts"subtitleBn="চলমান হিসাব"/>

        {/* 3. Customers With Due */}
        <KpiCard
 titleEn="Customers With Due"titleBn="বকেয়া বিশিষ্ট গ্রাহক"value={summary.customersWithDue}
 icon={AlertCircle}
 colorVariant="amber"subtitleEn="Customer due"subtitleBn="পাওনা বাকি যুক্ত ক্লায়েন্ট"/>

        {/* 4. Total Outstanding Due */}
        <KpiCard
 titleEn="Total Due Balance"titleBn="মোট বকেয়া স্থিতি"value={summary.totalOutstandingDue}
 isCurrency
 icon={TrendingUp}
 colorVariant="danger"subtitleEn="Receivable across all accounts"subtitleBn="সর্বমোট আদায়যোগ্য বকেয়া"/>
      </KpiGrid>

      {/* Needs Your Attention Now - Prioritized Accounts Queue */}
      {attentionCustomers.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-warning-surface text-warning border border-warning-border">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                  <span>{tBilingual('Needs Your Attention Now', 'জরুরি মনোযোগ প্রয়োজন')}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning-surface text-warning font-semibold border border-warning-border tabular-nums">
                    {attentionCustomers.length} {tBilingual('Accounts', 'টি অ্যাকাউন্ট')}
                  </span>
                </h3>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  {tBilingual(
                    'High receivable balances and credit limit threshold alerts requiring recovery',
                    'উচ্চ বকেয়া ও ক্রেডিট লিমিট অতিক্রম করা গ্রাহক হিসাব'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {attentionCustomers.map(({ customer: c, due, limit, reasonLabelEn, reasonLabelBn, reason }) => (
              <div
                key={c.id}
                className="flex flex-col justify-between p-3.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
                      className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <span>{c.name}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                    <div className="text-xs text-muted-foreground">
                      {c.company_name || c.mobile}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-xs font-semibold px-2 py-0.5 rounded-md border shrink-0',
                      reason === 'exceeded_limit'
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : 'bg-warning-surface text-warning border-warning-border'
                    )}
                  >
                    {tBilingual(reasonLabelEn, reasonLabelBn)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between pt-1 border-t border-border">
                  <span className="text-xs text-muted-foreground font-medium">
                    {tBilingual('Due Balance', 'বকেয়া পাওনা')}:
                  </span>
                  <span className="text-sm font-bold text-destructive font-numeric tabular-nums">
                    ৳{due.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => setSelectedCustomerForPayment(c)}
                    className="flex-1 h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{tBilingual('Collect Due', 'কালেকশন')}</span>
                  </Button>
                  {c.mobile && (
                    <a
                      href={`https://wa.me/${(c.whatsapp || c.mobile).replace(/\D/g, '')}?text=${encodeURIComponent(
                        tBilingual(
                          `Dear ${c.name}, greetings from PrintFlow. Your outstanding balance is ৳${due.toLocaleString('en-IN')}. Please settle the payment at your earliest convenience. Thank you.`,
                          `আসসালামু আলাইকুম ${c.name}, PrintFlow থেকে শুভেচ্ছা। আপনার বকেয়া বিল ৳${due.toLocaleString('en-IN')} পরিশোধের জন্য বিনীত অনুরোধ করা হচ্ছে। ধন্যবাদ।`
                        )
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="h-8 px-2.5 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors"
                      title={tBilingual('Send WhatsApp Reminder', 'হোয়াটসঅ্যাপে তাগাদা পাঠান')}
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-success" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card shadow-xs">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
          <Input
 placeholder={tBilingual(
              'Search by ID, name, company, phone, WhatsApp or area...',
              'আইডি, নাম, কোম্পানি, মোবাইল, হোয়াটসঅ্যাপ বা এলাকা দিয়ে খুঁজুন...'
            )}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 text-xs h-9 bg-muted rounded-xl"/>
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
 className="h-9 px-3 text-xs rounded-xl border border-border bg-card font-medium">
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
 className="h-9 px-3 text-xs rounded-xl border border-border bg-card font-medium">
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
 className="h-9 px-3 text-xs rounded-xl border border-border bg-card font-medium text-foreground">
            <option value="newest">{tBilingual('Sort: Newest First', 'ক্রম: নতুন প্রথমে')}</option>
            <option value="highest_billed">{tBilingual('Sort: Highest Billed', 'ক্রম: সর্বোচ্চ বিল')}</option>
            <option value="highest_due">{tBilingual('Sort: Highest Due', 'ক্রম: সর্বোচ্চ বকেয়া')}</option>
            <option value="latest_order">{tBilingual('Sort: Latest Order', 'ক্রম: সর্বশেষ অর্ডার')}</option>
            <option value="alphabetical">{tBilingual('Sort: Alphabetical (A-Z)', 'ক্রম: বর্ণানুক্রমিক (A-Z)')}</option>
          </select>

          <Button
 variant="outline"size="sm"onClick={() => loadData()}
 disabled={isLoading}
 className="h-9 px-2.5 text-xs text-muted-foreground rounded-xl"title="Refresh List">
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
 className="h-20 rounded-xl border border-border bg-muted animate-pulse"/>
          ))}
        </div>
      ) : isError ? (
        /* Error State with Retry */
        <Card className="border-danger-border bg-danger-surface p-8 text-center space-y-3">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto"/>
          <div className="text-sm font-bold text-destructive">
            {errorText}
          </div>
          <div>
            <Button size="sm"onClick={() => loadData()} className="text-xs bg-destructive hover:bg-destructive">
              {tBilingual('Retry Data Load', 'পুনরায় লোড করুন')}
            </Button>
          </div>
        </Card>
      ) : customers.length === 0 ? (
        /* Empty State */
        <Card className="border-border p-12 text-center space-y-4 bg-card">
          <div className="p-3 rounded-full bg-primary/10 text-primary w-fit mx-auto">
            <Users className="h-8 w-8"/>
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {tBilingual('No Customers Found', 'কোনো গ্রাহক পাওয়া যায়নি')}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              {search || selectedType !== 'all' || selectedDueFilter !== 'all'
                ? tBilingual('No customer records matched your query. Try resetting your search filters.', 'আপনার সার্চের সাথে কোনো গ্রাহক মেলেনি। ফিল্টার রিসেট করে দেখুন।')
                : tBilingual('Get started by creating your first customer profile to manage rates and invoices.', 'কাস্টমার প্রোফাইল তৈরি করে রেট ও ইনভয়েস ব্যবস্থাপনা শুরু করুন।')}
            </p>
          </div>
          {can('create', 'customers') && (
            <Button
 size="sm"onClick={handleOpenAddCustomer}
 className="bg-primary hover:bg-primary text-xs font-bold">
              <Plus className="mr-1.5 h-3.5 w-3.5"/>
              <span>{tBilingual('Create First Customer', 'প্রথম কাস্টমার তৈরি করুন')}</span>
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card shadow-xs">
            <div className="overflow-x-auto min-h-[340px] pb-12">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted border-b border-border text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3 px-3">{tBilingual('Customer ID', 'কাস্টমার আইডি')}</th>
                    <th className="py-3 px-4">{tBilingual('Customer Name', 'গ্রাহকের নাম')}</th>
                    <th className="py-3 px-3">{tBilingual('Company', 'কোম্পানি')}</th>
                    <th className="py-3 px-3">{tBilingual('Contact', 'যোগাযোগ')}</th>
                    <th className="py-3 px-3">{tBilingual('Type', 'ধরণ')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Total Invoiced', 'মোট ইনভয়েস')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Due Balance', 'বকেয়া স্থিতি')}</th>
                    <th className="py-3 px-3 text-right">{tBilingual('Last Order', 'সর্বশেষ অর্ডার')}</th>
                    <th className="py-3 px-4 text-center w-[70px] min-w-[70px]">{tBilingual('Actions', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {customers.map((c, idx) => {
 const hasDue = (c.total_due_balance || 0) > 0
 const custType = c.customer_category || c.customer_type || 'retail'
 const custIdNo = c.customer_id_no || formatCustomerIdNo(c, idx)

 return (
                      <tr
 key={c.id}
 className="hover:bg-muted dark:hover:bg-muted/40 transition-colors group">
                        {/* Customer ID */}
                        <td className="py-3.5 px-3">
                          <span className="tabular-nums text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border">
                            {custIdNo}
                          </span>
                        </td>

                        {/* Customer Name */}
                        <td className="py-3.5 px-4">
                          <Link
 href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
 className="font-bold text-foreground hover:text-primary dark:hover:text-primary flex items-center gap-1.5">
                            <span>{c.name}</span>
                            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"/>
                          </Link>
                          {c.name_bn && (
                            <div className="text-xs text-muted-foreground">{c.name_bn}</div>
                          )}
                          {c.area && (
                            <div className="text-xs text-muted-foreground mt-0.5">{c.area}</div>
                          )}
                        </td>

                        {/* Company */}
                        <td className="py-3.5 px-3">
                          {c.company_name ? (
                            <div className="font-semibold text-foreground">
                              {c.company_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <a
 href={`tel:${c.mobile}`}
 className="tabular-nums text-foreground hover:text-primary flex items-center gap-1"title="Call">
                              <Phone className="h-3 w-3 text-muted-foreground"/>
                              <span>{c.mobile}</span>
                            </a>
                            {c.whatsapp && (
                              <a
 href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
 target="_blank"rel="noreferrer"className="text-success hover:text-success"title="Chat on WhatsApp">
                                <MessageSquare className="h-3.5 w-3.5"/>
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Customer Type Badge */}
                        <td className="py-3.5 px-3">
                          <Badge
 variant="outline"className={cn(
                              'text-xs font-semibold capitalize',
 custType === 'corporate' && 'bg-primary/10 text-primary border-primary/20',
 custType === 'agency' && 'bg-primary/10 text-primary border-primary/20',
 custType === 'reseller' && 'bg-primary/10 text-primary border-primary/20',
 custType === 'government' && 'bg-warning-surface text-warning border-warning-border',
 custType === 'retail' && 'bg-success-surface text-success border-success-border'
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
                        <td className="py-3.5 px-3 text-right font-medium text-foreground font-numeric tabular-nums">
                          ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                        </td>

                        {/* Due Balance */}
                        <td className="py-3.5 px-3 text-right">
                          <span
 className={cn(
                              'font-bold px-2 py-0.5 rounded-md text-xs font-numeric tabular-nums',
 hasDue
                                ? 'bg-danger-surface text-destructive border border-danger-border'
                                : 'text-muted-foreground'
                            )}
                          >
                            ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Last Order */}
                        <td className="py-3.5 px-3 text-right text-muted-foreground">
                          {c.last_order_date || c.last_order_number ? (
                            <div>
                              <div className="font-medium text-foreground">
                                {c.last_order_number || 'Order'}
                              </div>
                              <div className="text-xs text-muted-foreground font-numeric">{c.last_order_date}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap w-[70px] min-w-[70px]">
                          <div className="relative inline-block text-left"data-customer-menu>
                            <Button
 size="sm"variant="ghost"onClick={(e) => {
 e.stopPropagation()
 setActiveMenuCustomerId(activeMenuCustomerId === c.id ? null : c.id)
                              }}
 className={cn(
                                'h-8 w-8 p-0 rounded-lg transition-colors cursor-pointer mx-auto flex items-center justify-center',
 activeMenuCustomerId === c.id
                                  ? 'bg-muted text-foreground'
                                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                              )}
 title={tBilingual('Actions', 'অ্যাকশন')}
 aria-label="Customer Actions"aria-expanded={activeMenuCustomerId === c.id}
                            >
                              <MoreVertical className="h-4 w-4"/>
                            </Button>

                            {activeMenuCustomerId === c.id && (
                              <div
 className={cn(
                                  'absolute right-0 w-56 bg-card border border-border rounded-xl shadow-xs z-50 py-1.5 text-xs animate-in fade-in-0 zoom-in-95 duration-100',
 idx >= customers.length - 2 && customers.length >= 3
                                    ? 'bottom-full mb-1'
                                    : 'top-full mt-1'
                                )}
                              >
                                {/* 1. 360 View */}
                                <Link
 href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
 onClick={() => setActiveMenuCustomerId(null)}
 className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2.5 text-foreground transition-colors">
                                  <Eye className="h-3.5 w-3.5 text-primary shrink-0"/>
                                  <span className="font-medium">
                                    {tBilingual('Profile & History', '৩৬০ প্রোফাইল ও লেজার')}
                                  </span>
                                </Link>

                                {/* 2. Create Quotation */}
                                <Link
 href={getTenantNavHref(`/quotations/new?customerId=${c.id}`, pathname, slug)}
 onClick={() => setActiveMenuCustomerId(null)}
 className="w-full text-left px-3 py-2 hover:bg-warning-surface flex items-center gap-2.5 text-foreground hover:text-warning transition-colors">
                                  <FileText className="h-3.5 w-3.5 text-warning shrink-0"/>
                                  <span>{tBilingual('Create Quotation', 'কোটেশন তৈরি করুন')}</span>
                                </Link>

                                {/* 3. Create Invoice */}
                                <button
 type="button"onClick={() => {
 setActiveMenuCustomerId(null)
 setSelectedCustomerForInvoice(c)
                                  }}
 className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center gap-2.5 text-foreground hover:text-primary transition-colors cursor-pointer">
                                  <Receipt className="h-3.5 w-3.5 text-primary shrink-0"/>
                                  <span>{tBilingual('Create Invoice', 'নতুন ইনভয়েস তৈরি')}</span>
                                </button>

                                {/* 4. Record Payment */}
                                {hasDue && (
                                  <button
 type="button"onClick={() => {
 setActiveMenuCustomerId(null)
 setSelectedCustomerForPayment(c)
                                    }}
 className="w-full text-left px-3 py-2 hover:bg-success-surface flex items-center gap-2.5 text-success transition-colors cursor-pointer">
                                    <CreditCard className="h-3.5 w-3.5 text-success shrink-0"/>
                                    <div className="flex flex-col text-left">
                                      <span className="font-semibold">{tBilingual('Record Payment', 'পেমেন্ট গ্রহণ')}</span>
                                      <span className="text-xs text-success/80 text-success/80 font-numeric">
 Due: ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                  </button>
                                )}

                                {/* Divider if delete permitted */}
                                {can('delete', 'customers') && (
                                  <div className="my-1 border-t border-border"/>
                                )}

                                {/* 5. Move to Trash */}
                                {can('delete', 'customers') && (
                                  <button
 type="button"onClick={() => {
 setActiveMenuCustomerId(null)
 handleTrashCustomer(c)
                                    }}
 className="w-full text-left px-3 py-2 hover:bg-danger-surface dark:hover:bg-danger-surface flex items-center gap-2.5 text-destructive transition-colors cursor-pointer">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive shrink-0"/>
                                    <span>{tBilingual('Move to Trash', 'ট্র্যাশে পাঠান')}</span>
                                  </button>
                                )}
                              </div>
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
                    'border shadow-sm p-4 space-y-3 bg-card transition-colors rounded-xl relative overflow-hidden',
 hasDue
                      ? 'border-danger-border'
                      : 'border-border '
                  )}
                >
                  {/* Top: Name, Type, ID, Due Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
 href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
 className="font-bold text-base text-foreground hover:text-primary">
                          {c.name}
                        </Link>
                        <span className="tabular-nums text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {custIdNo}
                        </span>
                      </div>
                      {c.name_bn && (
                        <div className="text-xs text-muted-foreground">{c.name_bn}</div>
                      )}
                      {c.company_name && (
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 text-muted-foreground"/>
                          <span>{c.company_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline"className="text-xs capitalize">
                        {custType}
                      </Badge>
                      {hasDue && (
                        <span className="text-xs font-black text-destructive bg-danger-surface px-2 py-0.5 rounded-md border border-danger-border">
 Due: ৳{(c.total_due_balance || 0).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact Actions (Call & WhatsApp) */}
                  <div className="flex items-center gap-2 pt-1 border-t border-border">
                    <a
 href={`tel:${c.mobile}`}
 className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-muted hover:bg-muted font-semibold text-xs text-foreground">
                      <Phone className="h-3.5 w-3.5 text-primary"/>
                      <span>{c.mobile}</span>
                    </a>

                    {c.whatsapp && (
                      <a
 href={`https://wa.me/${c.whatsapp.replace(/\D/g, '')}`}
 target="_blank"rel="noreferrer"className="flex items-center justify-center p-2 rounded-xl bg-success-surface bg-success-surface/60 text-success hover:bg-success-surface border border-success-border"title="WhatsApp">
                        <MessageSquare className="h-4 w-4"/>
                      </a>
                    )}
                  </div>

                  {/* Financial Stats Bar */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted text-xs">
                    <div>
                      <div className="text-xs text-muted-foreground">{tBilingual('Total Billed', 'মোট বিল')}</div>
                      <div className="font-bold text-foreground font-numeric">
                        ৳{(c.total_invoiced_amount || 0).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{tBilingual('Due Balance', 'বকেয়া স্থিতি')}</div>
                      <div
 className={cn(
                          'font-bold font-numeric',
 hasDue ? 'text-destructive' : 'text-muted-foreground '
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
 className="flex-1 text-center py-1.5 rounded-lg border border-border text-xs font-semibold text-foreground hover:bg-muted">
                      {tBilingual('Quote', 'কোটেশন')}
                    </Link>
                    <button
 onClick={() => setSelectedCustomerForInvoice(c)}
 className="flex-1 text-center py-1.5 rounded-lg border border-primary/20 border-border text-xs font-semibold text-primary hover:bg-primary/10">
                      {tBilingual('Invoice', 'ইনভয়েস')}
                    </button>
                    {hasDue && (
                      <button
 onClick={() => setSelectedCustomerForPayment(c)}
 className="flex-1 text-center py-1.5 rounded-lg border border-success-border text-xs font-bold text-success text-success hover:bg-success-surface">
                        {tBilingual('Pay', 'পরিশোধ')}
                      </button>
                    )}
                    {can('delete', 'customers') && (
                      <button
 onClick={() => handleTrashCustomer(c)}
 className="p-1.5 rounded-lg border border-danger-border text-destructive hover:bg-danger-surface"title="Move to Trash">
                        <Trash2 className="h-3.5 w-3.5"/>
                      </button>
                    )}
                  </div>

                  {/* Bottom: View 360 Workspace Button */}
                  <Link
 href={getTenantNavHref(`/customers/${c.id}`, pathname, slug)}
 className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-xs">
                    <span>{tBilingual('Open Customer 360 Workspace', 'কাস্টমার ৩৬০ ওয়ার্কস্পেস খুলুন')}</span>
                    <ArrowRight className="h-3.5 w-3.5"/>
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
 title={`Move"${customerToTrash?.name || 'Customer'}"to Trash?`}
 titleBn={`"${customerToTrash?.name || 'কাস্টমার'}"ট্র্যাশে স্থানান্তর করবেন?`}
 message="Are you sure you want to move this customer to Trash / Recycle Bin? Outstanding invoices and history will be preserved."messageBn="আপনি কি এই কাস্টমারকে রিসাইকেল বিনে সরাতে চান? পূর্বের ইনভয়েস ও লেনদেন রেকর্ড সংরক্ষিত থাকবে।"confirmText="Move to Trash"confirmTextBn="ট্র্যাশে সরান"cancelText="Cancel"cancelTextBn="বাতিল"isDestructive={true}
 isLoading={isTrashing}
 onConfirm={confirmTrashCustomer}
      />
    </div>
    </PanelAccessGuard>
  )
}
