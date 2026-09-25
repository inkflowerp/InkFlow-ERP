'use client'

import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react'
import { useParams, usePathname } from 'next/navigation'
import {
  Briefcase,
  Plus,
  Sparkles,
  Layers,
  Printer,
  Truck,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Wallet,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Button } from '@/components/ui/button'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { getOrdersAction, getJobOrdersAction } from '@/actions/order.actions'
import type { SalesOrderRecord, JobOrderRecord } from '@/types/order.types'
import type { InvoiceRecord } from '@/types/billing.types'

import {
  type OrderStage,
  type UnifiedOrderRecord,
  type OrderItemSpec,
  type OrderWhatsAppTemplateKey,
  type OrderLiveStatus,
  ORDER_LIVE_STATUSES,
} from '@/components/orders/types'
import { isReadyProduct, isOutsourceProduct } from '@/lib/units'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

function deriveOrderLiveStatus(o: any, stage: OrderStage, linkedJob?: any): OrderLiveStatus {
  if (o?.live_status && ORDER_LIVE_STATUSES.some((s) => s.id === o.live_status)) {
    return o.live_status as OrderLiveStatus
  }
  if (stage === 'delivered' || o?.status === 'delivered' || o?.status === 'completed') {
    return 'delivered'
  }
  if (stage === 'ready_delivery' || o?.status === 'ready' || o?.status === 'ready_for_delivery') {
    return 'ready_delivery'
  }
  if (stage === 'in_production') {
    if (o?.status === 'finishing' || linkedJob?.assigned_department === 'finishing') {
      return 'finishing_pending'
    }
    if (linkedJob?.status === 'in_progress' || o?.status === 'in_production' || o?.status === 'printing') {
      return 'printing'
    }
    return 'print_queue'
  }
  if (stage === 'in_design') {
    if (linkedJob?.artwork_status === 'pending') {
      return 'waiting_approval'
    }
    if (linkedJob?.status === 'in_progress') {
      return 'design_running'
    }
    return 'design_queue'
  }
  if (o?.items?.some((it: any) => it.design_required || it.workflow_routing === 'design_required')) {
    return 'design_queue'
  }
  return 'print_queue'
}

import { OrdersMetricsBar, type OrderMetrics } from '@/components/orders/orders-metrics-bar'
import { OrdersFilterToolbar, type OrderFilterState } from '@/components/orders/orders-filter-toolbar'
import { OrderCard } from '@/components/orders/order-card'
import { OrdersTableView } from '@/components/orders/orders-table-view'

import { OrderWhatsAppModal } from '@/components/orders/modals/order-whatsapp-modal'
import { OrderJobTicketModal } from '@/components/orders/modals/order-job-ticket-modal'
import { OrderQuickStatusModal } from '@/components/orders/modals/order-quick-status-modal'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import { PageHeader } from '@/components/shared/page-header'

export default function OrdersPage() {
  const params = useParams()
  const pathname = usePathname()
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'default'
  const companyId = company?.id || tenantSlug

  // Hydration state
  const [isMounted, setIsMounted] = useState(false)

  // Data States
  const [orders, setOrders] = useState<UnifiedOrderRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

  // Notification Banner
  const [notification, setNotification] = useState<{
    msg: string
    type: 'success' | 'warning' | 'info'
  } | null>(null)

  const showNotification = useCallback((msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Active Stage Tab
  const [activeStage, setActiveStage] = useState<OrderStage>('all')

  // Filter Toolbar State
  const [filters, setFilters] = useState<OrderFilterState>({
    searchQuery: '',
    quickFilter: 'all',
    selectedPriority: 'all',
    viewMode: 'cards',
  })

  // Modal States
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean
    order: UnifiedOrderRecord | null
    template: OrderWhatsAppTemplateKey
  }>({ isOpen: false, order: null, template: 'order_confirmed' })

  const [jobTicketModalState, setJobTicketModalState] = useState<{
    isOpen: boolean
    order: UnifiedOrderRecord | null
  }>({ isOpen: false, order: null })

  const [quickStatusModalState, setQuickStatusModalState] = useState<{
    isOpen: boolean
    order: UnifiedOrderRecord | null
  }>({ isOpen: false, order: null })

  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false)

  // 1. Data Loader: Unify Sales Orders, Invoices, and Job Orders
  const loadData = useCallback(async () => {
    try {
      // 1. Ingest from Server Actions (Supabase backed)
      let serverOrders: SalesOrderRecord[] = []
      let serverJobs: JobOrderRecord[] = []

      try {
        const [ordersRes, jobsRes] = await Promise.allSettled([
          getOrdersAction(companyId),
          getJobOrdersAction(companyId),
        ])
        if (ordersRes.status === 'fulfilled' && ordersRes.value.success && ordersRes.value.data) {
          serverOrders = ordersRes.value.data
        }
        if (jobsRes.status === 'fulfilled' && jobsRes.value.success && jobsRes.value.data) {
          serverJobs = jobsRes.value.data
        }
      } catch (e) {
        console.warn('[OrdersPage] Server action fetch fallback:', e)
      }

      // 2. Ingest from PrintERPDataStore & Browser Storage across all partitions
      const rawOrders: SalesOrderRecord[] = [...serverOrders]
      const rawJobs: JobOrderRecord[] = [...serverJobs]
      const rawInvoices: InvoiceRecord[] = []

      // Ingest orders across unpartitioned and tenant-partitioned keys
      const localOrdersGlobal = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
      const localOrdersTenant = tenantSlug ? PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, tenantSlug) || [] : []
      const localOrdersCompany = companyId && companyId !== tenantSlug ? PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, companyId) || [] : []
      rawOrders.push(...localOrdersGlobal, ...localOrdersTenant, ...localOrdersCompany)

      // Ingest job orders across unpartitioned and tenant-partitioned keys
      const localJobsGlobal = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []
      const localJobsTenant = tenantSlug ? PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, tenantSlug) || [] : []
      const localJobsCompany = companyId && companyId !== tenantSlug ? PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, companyId) || [] : []
      rawJobs.push(...localJobsGlobal, ...localJobsTenant, ...localJobsCompany)

      // Ingest invoices across unpartitioned and tenant-partitioned keys
      const localInvoicesGlobal = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
      const localInvoicesTenant = tenantSlug ? PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, tenantSlug) || [] : []
      const localInvoicesCompany = companyId && companyId !== tenantSlug ? PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, companyId) || [] : []
      rawInvoices.push(...localInvoicesGlobal, ...localInvoicesTenant, ...localInvoicesCompany)

      // Scan localStorage directly for any uncommitted records across partitions
      if (typeof window !== 'undefined') {
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i)
            if (!k) continue
            if (k.includes('order') || k.includes('job') || k.includes('invoice')) {
              const val = window.localStorage.getItem(k)
              if (val && val.startsWith('[')) {
                try {
                  const parsed = JSON.parse(val)
                  if (Array.isArray(parsed)) {
                    parsed.forEach((item) => {
                      if (item && typeof item === 'object') {
                        if (item.order_number && (item.items || item.final_price !== undefined || item.subtotal !== undefined)) {
                          rawOrders.push(item)
                        } else if (item.job_number) {
                          rawJobs.push(item)
                        } else if (item.invoice_number) {
                          rawInvoices.push(item)
                        }
                      }
                    })
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }

      const isMatchingTenant = (itemCompId?: string | null) => {
        if (!itemCompId || itemCompId === 'default' || !companyId || companyId === 'default') return true
        const c1 = String(itemCompId).toLowerCase()
        const c2 = String(companyId).toLowerCase()
        const s = String(tenantSlug).toLowerCase()
        return c1 === c2 || c1 === s
      }

      // Deduplicate Sales Orders by ID or Order Number
      const orderDedupMap = new Map<string, SalesOrderRecord>()
      rawOrders.filter((o) => isMatchingTenant(o.company_id)).forEach((o) => {
        const key = o.id || o.order_number
        if (key && !orderDedupMap.has(key)) {
          orderDedupMap.set(key, o)
        }
      })
      const tenantOrders = Array.from(orderDedupMap.values())

      // Deduplicate Job Orders by ID or Job Number
      const jobDedupMap = new Map<string, JobOrderRecord>()
      rawJobs.filter((j) => isMatchingTenant(j.company_id)).forEach((j) => {
        const key = j.id || j.job_number
        if (key && !jobDedupMap.has(key)) {
          jobDedupMap.set(key, j)
        }
      })
      const tenantJobOrders = Array.from(jobDedupMap.values())

      // Deduplicate Invoices by ID or Invoice Number
      const invoiceDedupMap = new Map<string, InvoiceRecord>()
      rawInvoices.filter((i) => isMatchingTenant(i.company_id)).forEach((i) => {
        const key = i.id || i.invoice_number
        if (key && !invoiceDedupMap.has(key)) {
          invoiceDedupMap.set(key, i)
        }
      })
      const tenantInvoices = Array.from(invoiceDedupMap.values())

      const unifiedMap = new Map<string, UnifiedOrderRecord>()

      // A. Process Sales Orders
      tenantOrders.forEach((o) => {
        const orderId = o.id || o.order_number
        const mappedItems: OrderItemSpec[] = (o.items || []).map((it: any, idx: number) => {
          const isReady = isReadyProduct(it) || it.workflow_routing === 'ready_product' || it.item_kind === 'ready_product'
          const isOutsource = isOutsourceProduct(it) || it.item_kind === 'outsource'
          const itemKind = isOutsource ? 'outsource' : isReady ? 'ready_product' : (it.item_kind || 'custom')

          return {
            id: it.id || `item-${orderId}-${idx}`,
            itemName: it.product_name || it.item_name || 'Printing Item',
            dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || it.unit || 'ft'}` : undefined),
            width: it.width,
            height: it.height,
            dimensionUnit: it.dimension_unit || it.unit,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || it.dimension_unit || 'pcs',
            unitPrice: it.unit_price,
            totalPrice: it.total_price,
            materialSpec: it.material_spec || it.material || it.media_type,
            finishing: it.finishing,
            itemKind,
            workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'ready_production')),
            designRequired: isReady ? false : it.design_required,
            notes: it.notes,
          }
        })

        // Find linked job order if any
        const linkedJob = tenantJobOrders.find(
          (j) =>
            j.order_id === o.id ||
            j.order_id === o.order_number ||
            (j as any).sales_order_id === o.id ||
            (j as any).sales_order_id === o.order_number ||
            j.order_number === o.order_number ||
            (j.job_number && o.order_number && j.job_number.replace('JOB-', '').replace(/-[A-Z]$/, '') === o.order_number.replace('ORD-', ''))
        )

        let calculatedStage: OrderStage = 'new_orders'
        const ordStatus = String(o.status || '')
        const allReady = mappedItems.length > 0 && mappedItems.every((it) => it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product')

        if (ordStatus === 'completed' || ordStatus === 'delivered') {
          calculatedStage = 'delivered'
        } else if (allReady) {
          calculatedStage = 'ready_delivery'
        } else if (ordStatus === 'ready' || ordStatus === 'ready_for_delivery') {
          calculatedStage = 'ready_delivery'
        } else if (ordStatus === 'in_production' || ordStatus === 'production' || (linkedJob && linkedJob.status === 'in_progress')) {
          calculatedStage = 'in_production'
        } else if (ordStatus === 'in_design' || ordStatus === 'designing') {
          calculatedStage = 'in_design'
        } else if (ordStatus === 'confirmed' || ordStatus === 'draft') {
          calculatedStage = 'new_orders'
        }

        const total = Number(o.final_price || (o as any).total_amount || 0)
        const advance = Number(o.advance_amount || (o as any).paid_amount || 0)
        const due = Math.max(0, total - advance)
        const payStatus = due <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid'

        const isWalk =
          o.customer_name?.toLowerCase().includes('walk') ||
          o.customer_name?.toLowerCase().includes('counter') ||
          (o as any).is_walkin

        const originVal: any =
          (o as any).quotation_id || (o as any).quotation_number ? 'quotation' : 'sales_order'

        unifiedMap.set(orderId, {
          id: o.id,
          orderNumber: o.order_number,
          jobNumber: linkedJob?.job_number,
          jobOrderId: linkedJob?.id,
          origin: originVal,
          customerId: o.customer_id || undefined,
          customerName: o.customer_name,
          customerPhone: o.customer_phone || (o as any).mobile,
          customerAddress: o.customer_address || (o as any).address || undefined,
          customerType: o.customer_type || (o as any).customer_category || undefined,
          isWalkIn: isWalk,
          items: mappedItems,
          itemsCount: mappedItems.reduce((acc, it) => acc + it.quantity, 0),
          priority: o.priority || 'normal',
          orderDate: o.order_date || o.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
          deliveryDate: o.delivery_date || '',
          createdAt: o.created_at || new Date().toISOString(),
          stage: calculatedStage,
          currentStatus: deriveOrderLiveStatus(o, calculatedStage, linkedJob),
          paymentStatus: payStatus,
          totalAmount: total,
          advanceAmount: advance,
          dueAmount: due,
          salespersonName: o.salesperson_name,
          notes: o.notes || undefined,
          rawOrder: o,
          rawJob: linkedJob,
        })
      })

      // B. Process Standalone Job Orders (if not already mapped)
      tenantJobOrders.forEach((j) => {
        const isMapped = Array.from(unifiedMap.values()).some(
          (u) =>
            u.id === j.order_id ||
            u.id === (j as any).sales_order_id ||
            u.orderNumber === j.order_number ||
            u.jobNumber === j.job_number ||
            u.jobOrderId === j.id
        )

        if (!isMapped) {
          const synthOrderNumber = j.order_number || j.job_number?.replace('JOB-', 'ORD-') || `ORD-${j.id.slice(-6)}`
          let jobStage: OrderStage = 'new_orders'
          if (j.status === 'completed') jobStage = 'ready_delivery'
          else if (j.status === 'in_progress') jobStage = 'in_production'
          else if (j.artwork_status === 'pending' || j.workflow_routing === 'design_required') jobStage = 'in_design'

          unifiedMap.set(j.id, {
            id: j.id,
            orderNumber: synthOrderNumber,
            jobNumber: j.job_number,
            jobOrderId: j.id,
            origin: 'job_order',
            customerId: (j as any).customer_id || undefined,
            customerName: j.customer_name || 'Production Job Client',
            customerPhone: (j as any).customer_phone || (j as any).mobile || undefined,
            isWalkIn: false,
            items: [
              {
                id: `job-item-${j.id}`,
                itemName: j.product_name || (j as any).title || 'Production Print Job',
                dimensions: j.size_spec,
                quantity: Number(j.quantity) || 1,
                unit: 'pcs',
                materialSpec: j.material_spec,
                itemKind: 'custom',
                workflowRouting: j.workflow_routing || 'ready_production',
                notes: j.production_instructions ? j.production_instructions : undefined,
              },
            ],
            itemsCount: Number(j.quantity) || 1,
            priority: (j.priority as any) || 'normal',
            orderDate: j.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            deliveryDate: j.deadline ? j.deadline.split('T')[0] : '',
            createdAt: j.created_at || new Date().toISOString(),
            stage: jobStage,
            currentStatus: deriveOrderLiveStatus(j, jobStage, j),
            paymentStatus: 'unpaid',
            totalAmount: 0,
            advanceAmount: 0,
            dueAmount: 0,
            notes: j.production_instructions || undefined,
            rawJob: j,
          })
        }
      })

      // C. Process Invoices (Merge or Synthesize Orders)
      tenantInvoices.forEach((inv) => {
        const matchingKey = inv.sales_order_id || inv.order_number || inv.id
        const existing = Array.from(unifiedMap.values()).find(
          (u) =>
            u.id === matchingKey ||
            u.orderNumber === inv.order_number ||
            (inv.sales_order_id && u.id === inv.sales_order_id)
        )

        if (existing) {
          // Enrich with Invoice Reference & Live Payment Balance
          existing.invoiceId = inv.id
          existing.invoiceNumber = inv.invoice_number
          existing.totalAmount = Number(inv.grand_total || existing.totalAmount)
          existing.advanceAmount = Number(inv.paid_amount || existing.advanceAmount)
          existing.dueAmount = Math.max(0, existing.totalAmount - existing.advanceAmount)
          existing.paymentStatus = existing.dueAmount <= 0 ? 'paid' : existing.advanceAmount > 0 ? 'partial' : 'unpaid'
          existing.rawInvoice = inv
        } else {
          // Synthesize Order from Direct Counter Invoice
          const mappedItems: OrderItemSpec[] = (inv.items || []).map((it: any, idx: number) => {
            const isReady = isReadyProduct(it) || it.workflow_routing === 'ready_product' || it.item_kind === 'ready_product'
            const isOutsource = isOutsourceProduct(it) || it.item_kind === 'outsource'
            const itemKind = isOutsource ? 'outsource' : isReady ? 'ready_product' : (it.item_kind || 'custom')

            return {
              id: it.id || `inv-item-${inv.id}-${idx}`,
              itemName: it.item_description || it.item_name || 'Printing Item',
              dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : undefined),
              width: it.width,
              height: it.height,
              dimensionUnit: it.unit,
              quantity: Number(it.quantity) || 1,
              unit: it.unit || 'pcs',
              unitPrice: it.unit_price,
              totalPrice: it.total_price,
              materialSpec: it.material || it.material_spec,
              finishing: it.finishing,
              itemKind,
              workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'design_ok')),
              designRequired: isReady ? false : it.design_required,
              notes: it.remarks || it.notes,
            }
          })

          const total = Number(inv.grand_total || (inv as any).total_amount || 0)
          const advance = Number(inv.paid_amount || 0)
          const due = Math.max(0, total - advance)
          const payStatus = due <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid'

          let calculatedStage: OrderStage = 'new_orders'
          const allReady = mappedItems.length > 0 && mappedItems.every((it) => it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product')
          const isDelivered = (inv as any).delivery_status === 'delivered' || (inv as any).status === 'delivered'

          if (isDelivered) {
            calculatedStage = 'delivered'
          } else if (allReady) {
            calculatedStage = 'ready_delivery'
          } else {
            const hasDesignReq = mappedItems.some((it) => it.workflowRouting === 'design_required')
            calculatedStage = hasDesignReq ? 'in_design' : 'in_production'
          }

          const isWalk =
            inv.customer_name?.toLowerCase().includes('walk') ||
            inv.customer_name?.toLowerCase().includes('counter')

          const synthOrderNumber = inv.order_number || inv.invoice_number?.replace('INV-', 'ORD-') || `ORD-${inv.id.slice(-4)}`

          unifiedMap.set(inv.id, {
            id: inv.id,
            orderNumber: synthOrderNumber,
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            origin: 'invoice_created',
            customerId: inv.customer_id || undefined,
            customerName: inv.customer_name || 'Walk-in Customer',
            customerPhone: inv.customer_phone || (inv as any).mobile,
            customerAddress: inv.customer_address || (inv as any).address || undefined,
            isWalkIn: isWalk,
            items: mappedItems,
            itemsCount: mappedItems.reduce((acc, it) => acc + it.quantity, 0),
            priority: ((inv as any).priority as any) || 'normal',
            orderDate: inv.invoice_date || inv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
            deliveryDate: inv.due_date || '',
            createdAt: inv.created_at || new Date().toISOString(),
            stage: calculatedStage,
            currentStatus: deriveOrderLiveStatus(inv, calculatedStage),
            paymentStatus: payStatus,
            totalAmount: total,
            advanceAmount: advance,
            dueAmount: due,
            salespersonName: inv.created_by_name || 'Counter Desk',
            notes: inv.notes || undefined,
            rawInvoice: inv,
          })
        }
      })

      const list = Array.from(unifiedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setOrders(list)
    } catch (err: any) {
      showNotification(err.message || 'Error loading orders', 'warning')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [companyId, tenantSlug, showNotification])

  useEffect(() => {
    setIsMounted(true)
    loadData()

    const handleSync = () => {
      loadData()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_data_sync', handleSync)
      window.addEventListener('printerp_table_synced', handleSync)
      window.addEventListener('printerp_table_synced:sales_orders', handleSync)
      window.addEventListener('printerp_table_synced:job_orders', handleSync)
      window.addEventListener('printerp_table_synced:quotations', handleSync)
      window.addEventListener('printerp_table_synced:invoices', handleSync)
      window.addEventListener('printerp_table_synced:production_jobs', handleSync)
      window.addEventListener('printerp_table_synced:production_tasks', handleSync)
      window.addEventListener('printerp_table_synced:delivery_challans', handleSync)
      window.addEventListener('printerp_table_synced:payments', handleSync)
      window.addEventListener('printerp_order_items_updated', handleSync)
      window.addEventListener('printerp_invoice_items_updated', handleSync)
      window.addEventListener('printerp_timeline_updated', handleSync)
      window.addEventListener('storage', handleSync)
      window.addEventListener(`${STORAGE_KEYS.ORDERS}_updated`, handleSync)
      window.addEventListener(`${STORAGE_KEYS.JOB_ORDERS}_updated`, handleSync)
      window.addEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleSync)
      window.addEventListener(`${STORAGE_KEYS.QUOTATIONS}_updated`, handleSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_data_sync', handleSync)
        window.removeEventListener('printerp_table_synced', handleSync)
        window.removeEventListener('printerp_table_synced:sales_orders', handleSync)
        window.removeEventListener('printerp_table_synced:job_orders', handleSync)
        window.removeEventListener('printerp_table_synced:quotations', handleSync)
        window.removeEventListener('printerp_table_synced:invoices', handleSync)
        window.removeEventListener('printerp_table_synced:production_jobs', handleSync)
        window.removeEventListener('printerp_table_synced:production_tasks', handleSync)
        window.removeEventListener('printerp_table_synced:delivery_challans', handleSync)
        window.removeEventListener('printerp_table_synced:payments', handleSync)
        window.removeEventListener('printerp_order_items_updated', handleSync)
        window.removeEventListener('printerp_invoice_items_updated', handleSync)
        window.removeEventListener('printerp_timeline_updated', handleSync)
        window.removeEventListener('storage', handleSync)
        window.removeEventListener(`${STORAGE_KEYS.ORDERS}_updated`, handleSync)
        window.removeEventListener(`${STORAGE_KEYS.JOB_ORDERS}_updated`, handleSync)
        window.removeEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleSync)
        window.removeEventListener(`${STORAGE_KEYS.QUOTATIONS}_updated`, handleSync)
      }
    }
  }, [loadData])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadData()
  }, [loadData])

  // 2. Metrics KPI Calculations
  const metrics: OrderMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let total = orders.length
    let newOrders = 0
    let inDesign = 0
    let inProduction = 0
    let readyDelivery = 0
    let delivered = 0
    let dueToday = 0
    let totalDueAmount = 0

    orders.forEach((o) => {
      if (o.stage === 'new_orders') newOrders++
      else if (o.stage === 'in_design') inDesign++
      else if (o.stage === 'in_production') inProduction++
      else if (o.stage === 'ready_delivery') readyDelivery++
      else if (o.stage === 'delivered') delivered++

      if (o.deliveryDate?.includes(todayStr)) dueToday++
      totalDueAmount += o.dueAmount || 0
    })

    return {
      total,
      newOrders,
      inDesign,
      inProduction,
      readyDelivery,
      delivered,
      dueToday,
      totalDueAmount,
    }
  }, [orders])

  // 3. Filtered Orders
  const filteredOrders = useMemo(() => {
    const query = filters.searchQuery.toLowerCase().trim()
    const todayStr = new Date().toISOString().split('T')[0]

    return orders.filter((order) => {
      // Stage Filter
      if (activeStage !== 'all' && order.stage !== activeStage) return false

      // Quick Chips Filter
      if (filters.quickFilter === 'urgent') {
        if (order.priority !== 'urgent' && order.priority !== 'very_urgent') return false
      } else if (filters.quickFilter === 'walk_in') {
        if (!order.isWalkIn) return false
      } else if (filters.quickFilter === 'due_today') {
        if (!order.deliveryDate?.includes(todayStr)) return false
      } else if (filters.quickFilter === 'unpaid_due') {
        if (order.dueAmount <= 0) return false
      } else if (filters.quickFilter === 'has_design') {
        const hasDesign = order.items.some((it) => it.workflowRouting === 'design_required')
        if (!hasDesign) return false
      }

      // Priority Dropdown Filter
      if (filters.selectedPriority !== 'all' && order.priority !== filters.selectedPriority) {
        return false
      }

      // Search Query
      if (query) {
        const matchCust = order.customerName?.toLowerCase().includes(query)
        const matchPhone = order.customerPhone?.toLowerCase().includes(query)
        const matchOrd = order.orderNumber?.toLowerCase().includes(query)
        const matchInv = order.invoiceNumber?.toLowerCase().includes(query)
        const matchItem = order.items.some((it) => it.itemName.toLowerCase().includes(query))
        if (!matchCust && !matchPhone && !matchOrd && !matchInv && !matchItem) return false
      }

      return true
    })
  }, [orders, activeStage, filters])

  // 4. Action Handlers
  const handleAdvanceStage = useCallback(
    (orderId: string, nextStage: OrderStage) => {
      startTransition(() => {
        const allLocalOrders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
        const updatedLocal = allLocalOrders.map((o) => {
          if (o.id === orderId || o.order_number === orderId) {
            let dbStatus: any = 'in_production'
            if (nextStage === 'delivered') dbStatus = 'completed'
            else if (nextStage === 'ready_delivery') dbStatus = 'ready'
            else if (nextStage === 'in_design') dbStatus = 'in_design'
            else if (nextStage === 'new_orders') dbStatus = 'confirmed'
            return { ...o, status: dbStatus, updated_at: new Date().toISOString() }
          }
          return o
        })
        PrintERPDataStore.set(STORAGE_KEYS.ORDERS, updatedLocal)

        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, stage: nextStage } : o))
        )
        const stageLabel =
          nextStage === 'delivered'
            ? tBilingual('Delivered', 'ডেলিভারি সম্পন্ন')
            : nextStage === 'ready_delivery'
            ? tBilingual('Ready for Delivery', 'ডেলিভারি রেডি')
            : nextStage === 'in_production'
            ? tBilingual('In Production', 'প্রোডাকশনে')
            : nextStage === 'in_design'
            ? tBilingual('In Design', 'ডিজাইনে')
            : tBilingual('New Order', 'নতুন অর্ডার')

        showNotification(
          tBilingual(`Order stage updated to: ${stageLabel}`, `অর্ডারের স্টেজ পরিবর্তিত হয়েছে: ${stageLabel}`),
          'success'
        )
      })
    },
    [showNotification, tBilingual]
  )

  const handleUpdateLiveStatus = useCallback(
    async (orderId: string, nextLiveStatus: OrderLiveStatus, note?: string) => {
      startTransition(() => {
        const statusMeta = ORDER_LIVE_STATUSES.find((s) => s.id === nextLiveStatus)
        const nextStage = statusMeta ? statusMeta.stage : 'in_production'

        // 1. Update local orders
        const allLocalOrders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
        const updatedLocal = allLocalOrders.map((o) => {
          if (o.id === orderId || o.order_number === orderId) {
            let dbStatus: any = 'in_production'
            if (nextLiveStatus === 'delivered') dbStatus = 'completed'
            else if (nextLiveStatus === 'ready_delivery') dbStatus = 'ready'
            else if (nextLiveStatus.startsWith('design') || nextLiveStatus === 'waiting_approval') dbStatus = 'in_design'

            return {
              ...o,
              live_status: nextLiveStatus,
              status: dbStatus,
              notes: note ? (o.notes ? `${o.notes} | ${note}` : note) : o.notes,
              updated_at: new Date().toISOString(),
            }
          }
          return o
        })
        PrintERPDataStore.set(STORAGE_KEYS.ORDERS, updatedLocal)

        // 2. Also update production tasks
        const allTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const updatedTasks = allTasks.map((t) => {
          if (t.order_id === orderId || t.order_number === orderId) {
            let taskStatus = 'pending'
            if (nextLiveStatus === 'printing') taskStatus = 'in_progress'
            else if (nextLiveStatus === 'finishing_pending') taskStatus = 'finishing'
            else if (nextLiveStatus === 'ready_delivery' || nextLiveStatus === 'delivered') taskStatus = 'completed'
            return {
              ...t,
              status: taskStatus,
              live_status: nextLiveStatus,
              notes: note ? (t.notes ? `${t.notes} | ${note}` : note) : t.notes,
              updated_at: new Date().toISOString(),
            }
          }
          return t
        })
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, updatedTasks)

        // 3. Update React state
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  currentStatus: nextLiveStatus,
                  stage: nextStage,
                  notes: note ? (o.notes ? `${o.notes} | ${note}` : note) : o.notes,
                }
              : o
          )
        )

        const statusLabel = statusMeta ? tBilingual(statusMeta.labelEn, statusMeta.labelBn) : nextLiveStatus
        showNotification(
          tBilingual(`Live status updated: ${statusLabel}`, `লাইভ স্ট্যাটাস আপডেট হয়েছে: ${statusLabel}`),
          'success'
        )
      })
    },
    [showNotification, tBilingual]
  )

  const handleUpdateStageFromModal = useCallback(
    async (orderId: string, newStage: OrderStage) => {
      handleAdvanceStage(orderId, newStage)
    },
    [handleAdvanceStage]
  )

  const handleOpenWhatsApp = useCallback((order: UnifiedOrderRecord, tpl: OrderWhatsAppTemplateKey = 'order_confirmed') => {
    setWhatsAppModalState({ isOpen: true, order, template: tpl })
  }, [])

  const handleOpenJobTicket = useCallback((order: UnifiedOrderRecord) => {
    setJobTicketModalState({ isOpen: true, order })
  }, [])

  const handlePrintJobTicket = useCallback((order: UnifiedOrderRecord) => {
    setJobTicketModalState({ isOpen: true, order })
    setTimeout(() => {
      window.print()
    }, 150)
  }, [])

  const handleOpenQuickStatus = useCallback((order: UnifiedOrderRecord) => {
    setQuickStatusModalState({ isOpen: true, order })
  }, [])

  const stagesConfig: Array<{ id: OrderStage; label: string; count: number; icon: any }> = [
    { id: 'all', label: tBilingual('All Orders', 'সব অর্ডার'), count: metrics.total, icon: Layers },
    { id: 'new_orders', label: tBilingual('1. New Orders', '১. নতুন অর্ডার'), count: metrics.newOrders, icon: Sparkles },
    { id: 'in_design', label: tBilingual('2. Design & Proof', '২. ডিজাইন ও চেক'), count: metrics.inDesign, icon: Sparkles },
    { id: 'in_production', label: tBilingual('3. Machine Floor', '৩. মেশিন প্রোডাকশন'), count: metrics.inProduction, icon: Printer },
    { id: 'ready_delivery', label: tBilingual('4. Ready for Delivery', '৪. ডেলিভারি রেডি'), count: metrics.readyDelivery, icon: Truck },
    { id: 'delivered', label: tBilingual('5. Delivery Completed', '৫. ডেলিভারি সম্পন্ন'), count: metrics.delivered, icon: PackageCheck },
  ]

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'warning'
              ? 'bg-amber-600 text-white'
              : notification.type === 'info'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          <span>{notification.msg}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-white/80 hover:text-white ml-2 text-xs font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Commercial Orders & Job Hub"
        titleBn="অর্ডার ও প্রোডাকশন হাব"
        descriptionEn="End-to-end commercial order intake, payment gating, design proofing, production routing, and customer dispatch."
        descriptionBn="প্রেস অর্ডার বুকিং, অগ্রিম ও বাকি ট্র্যাকিং, ৩-মুখী ফ্লো, ডিজাইন অনুমোদন ও কারখানা ডেলিভারি ব্যবস্থাপনা।"
        icon={Briefcase}
        iconColor="text-indigo-600 dark:text-indigo-400"
        actions={
          <Button
            type="button"
            onClick={() => setIsWorkOrderModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>{tBilingual('New Order Booking', 'নতুন অর্ডার বুকিং')}</span>
          </Button>
        }
      />

      {/* Top Metrics KPI Bar */}
      <OrdersMetricsBar
        metrics={metrics}
        activeStage={activeStage}
        activeQuickFilter={filters.quickFilter}
        onSelectStage={(stage) => {
          setActiveStage(stage)
          setFilters((f) => ({ ...f, quickFilter: 'all' }))
        }}
        onSelectQuickFilter={(qFilter) => {
          if (qFilter === 'due_today') {
            setFilters((f) => ({ ...f, quickFilter: 'due_today' }))
          } else if (qFilter === 'unpaid_due') {
            setFilters((f) => ({ ...f, quickFilter: 'unpaid_due' }))
          }
        }}
      />

      {/* 6 Lifecycle Stage Tabs Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-slate-100 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
        {stagesConfig.map((s) => {
          const Icon = s.icon
          const isActive = activeStage === s.id && filters.quickFilter === 'all'
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setActiveStage(s.id)
                setFilters((f) => ({ ...f, quickFilter: 'all' }))
              }}
              className={`p-2.5 rounded-lg text-left transition-all flex items-center justify-between ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-indigo-950 dark:text-white shadow-sm font-bold border border-indigo-200 dark:border-indigo-800'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span className="text-xs truncate">{s.label}</span>
              </div>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {s.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <OrdersFilterToolbar
        filters={filters}
        onFilterChange={(newF) => setFilters((prev) => ({ ...prev, ...newF }))}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Content Rendering: Card View vs High-Density Table View */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span>{tBilingual('Loading orders...', 'অর্ডার লোড হচ্ছে...')}</span>
        </div>
      ) : filters.viewMode === 'table' ? (
        <OrdersTableView
          orders={filteredOrders}
          tenantSlug={tenantSlug}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenJobTicket={handleOpenJobTicket}
          onPrintJobTicket={handlePrintJobTicket}
          onOpenQuickStatus={handleOpenQuickStatus}
          onAdvanceStage={handleAdvanceStage}
          onUpdateLiveStatus={handleUpdateLiveStatus}
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              tenantSlug={tenantSlug}
              onOpenWhatsApp={handleOpenWhatsApp}
              onOpenJobTicket={handleOpenJobTicket}
              onPrintJobTicket={handlePrintJobTicket}
              onOpenQuickStatus={handleOpenQuickStatus}
              onAdvanceStage={handleAdvanceStage}
              onUpdateLiveStatus={handleUpdateLiveStatus}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                {tBilingual('No orders found', 'কোনো অর্ডার পাওয়া যায়নি')}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {tBilingual(
                  'Change your search or filter criteria, or book a new order.',
                  'ফিল্টার বা সার্চ পরিবর্তন করুন অথবা নতুন অর্ডার বুকিং করুন।'
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modals Layer */}
      {whatsAppModalState.isOpen && (
        <OrderWhatsAppModal
          isOpen={whatsAppModalState.isOpen}
          onClose={() => setWhatsAppModalState({ isOpen: false, order: null, template: 'order_confirmed' })}
          order={whatsAppModalState.order}
          companyName={company?.name || 'PrintERP Commercial Press'}
          initialTemplate={whatsAppModalState.template}
          onShowNotification={showNotification}
        />
      )}

      {jobTicketModalState.isOpen && (
        <OrderJobTicketModal
          isOpen={jobTicketModalState.isOpen}
          onClose={() => setJobTicketModalState({ isOpen: false, order: null })}
          order={jobTicketModalState.order}
          companyName={company?.name || 'PrintERP Commercial Press'}
          companyAddress="Paltan / Fakirapool, Dhaka"
          companyPhone="01700-000000"
        />
      )}

      {quickStatusModalState.isOpen && (
        <OrderQuickStatusModal
          isOpen={quickStatusModalState.isOpen}
          onClose={() => setQuickStatusModalState({ isOpen: false, order: null })}
          order={quickStatusModalState.order}
          onUpdateStage={handleUpdateStageFromModal}
          onUpdateLiveStatus={handleUpdateLiveStatus}
          onShowNotification={showNotification}
        />
      )}

      {isWorkOrderModalOpen && (
        <WorkOrderModal
          isOpen={isWorkOrderModalOpen}
          onClose={() => {
            setIsWorkOrderModalOpen(false)
            loadData()
          }}
          onSuccess={() => {
            setIsWorkOrderModalOpen(false)
            loadData()
          }}
          companyId={companyId}
        />
      )}
    </div>
  )
}
