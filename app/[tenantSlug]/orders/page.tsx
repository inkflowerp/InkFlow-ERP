'use client'

import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react'
import { useParams, usePathname, useSearchParams } from 'next/navigation'
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
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { OrderRepository } from '@/lib/repositories/order.repository'
import { BillingRepository } from '@/lib/repositories/billing.repository'
import { getOrdersAction, getJobOrdersAction, updateOrderStatusAction } from '@/actions/order.actions'
import { useRealtime } from '@/components/providers/realtime-provider'
import { getInvoicesAction } from '@/actions/billing.actions'
import { getProductionTasksAction } from '@/actions/production-planning.actions'
import { getDesignJobsAction } from '@/actions/design.actions'
import { getChallansAction } from '@/actions/logistics.actions'
import { resolveOrderJobWorkflow } from '@/lib/workflow/workflow-engine'
import type { SalesOrderRecord, JobOrderRecord } from '@/types/order.types'
import type { InvoiceRecord } from '@/types/billing.types'
import type { ProductionTaskRecord } from '@/types/production.types'
import type { DesignJobRecord } from '@/types/design.types'
import type { DeliveryChallanRecord } from '@/types/logistics.types'
import { AlertTriangle, AlertOctagon, Clock } from 'lucide-react'

import {
 type OrderStage,
 type UnifiedOrderRecord,
 type OrderItemSpec,
 type OrderWhatsAppTemplateKey,
 type OrderLiveStatus,
 ORDER_LIVE_STATUSES,
 inferMaterialFromItemName,
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
  const { registerOptimisticMutation } = useRealtime()
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

  // 1. Authoritative Data Loader: Server actions backed by Supabase with workflow resolution
 const loadData = useCallback(async () => {
 try {
      // 1. Fetch live authoritative records across workflow pillars
 let serverOrders: SalesOrderRecord[] = []
 let serverJobs: JobOrderRecord[] = []
 let serverInvoices: InvoiceRecord[] = []
 let serverProdTasks: ProductionTaskRecord[] = []
 let serverDesignJobs: DesignJobRecord[] = []
 let serverChallans: DeliveryChallanRecord[] = []

 try {
 const [ordersRes, jobsRes, invoicesRes, prodRes, designRes, challansRes] = await Promise.allSettled([
 getOrdersAction(companyId),
 getJobOrdersAction(companyId),
 getInvoicesAction({}, companyId),
 getProductionTasksAction({}, companyId),
 getDesignJobsAction(companyId),
 getChallansAction(companyId),
        ])

 if (ordersRes.status === 'fulfilled' && ordersRes.value.success && ordersRes.value.data) {
 serverOrders = ordersRes.value.data
        }
 if (jobsRes.status === 'fulfilled' && jobsRes.value.success && jobsRes.value.data) {
 serverJobs = jobsRes.value.data
        }
 if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success && invoicesRes.value.data) {
 serverInvoices = invoicesRes.value.data
        }
 if (prodRes.status === 'fulfilled' && prodRes.value.success && prodRes.value.data) {
 serverProdTasks = prodRes.value.data
        }
 if (designRes.status === 'fulfilled' && designRes.value.success && designRes.value.data) {
 serverDesignJobs = designRes.value.data
        }
 if (challansRes.status === 'fulfilled' && challansRes.value.success && challansRes.value.data) {
 serverChallans = challansRes.value.data
        }
      } catch (e) {
 console.warn('[OrdersPage] Server action fetch fallback:', e)
      }

      // Update local cache partitions as fallback cache ONLY
 if (serverOrders.length > 0) {
 PrintERPDataStore.set(STORAGE_KEYS.ORDERS, serverOrders, true, tenantSlug)
      }
 if (serverJobs.length > 0) {
 PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, serverJobs, true, tenantSlug)
      }
 if (serverInvoices.length > 0) {
 PrintERPDataStore.set(STORAGE_KEYS.INVOICES, serverInvoices, true, tenantSlug)
      }

      // Offline fallback: if server returned empty, fallback to cached partition
 const rawOrders: SalesOrderRecord[] =
 serverOrders.length > 0
          ? serverOrders
          : (PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, tenantSlug) ||
 PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) ||
             [])

 const rawJobs: JobOrderRecord[] =
 serverJobs.length > 0
          ? serverJobs
          : (PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, tenantSlug) ||
 PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) ||
             [])

 const rawInvoices: InvoiceRecord[] =
 serverInvoices.length > 0
          ? serverInvoices
          : (PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, tenantSlug) ||
 PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) ||
             [])

 const rawProdTasks: ProductionTaskRecord[] =
 serverProdTasks.length > 0
          ? serverProdTasks
          : (PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS, tenantSlug) ||
 PrintERPDataStore.get<ProductionTaskRecord[]>(STORAGE_KEYS.PRODUCTION_TASKS) ||
             [])

 const rawDesignJobs: DesignJobRecord[] =
 serverDesignJobs.length > 0
          ? serverDesignJobs
          : (PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, tenantSlug) ||
 PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) ||
             [])

 const rawChallans: DeliveryChallanRecord[] =
 serverChallans.length > 0
          ? serverChallans
          : (PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, tenantSlug) ||
 PrintERPDataStore.get<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS) ||
             [])

 const isMatchingTenant = (itemCompId?: string | null) => {
 if (!itemCompId || itemCompId === 'default' || !companyId || companyId === 'default') return true
 const c1 = String(itemCompId).toLowerCase()
 const c2 = String(companyId).toLowerCase()
 const s = String(tenantSlug).toLowerCase()
 return c1 === c2 || c1 === s
      }

 const tenantOrders = rawOrders.filter((o) => isMatchingTenant(o.company_id))
 const tenantJobs = rawJobs.filter((j) => isMatchingTenant(j.company_id))
 const tenantInvoices = rawInvoices.filter((i) => isMatchingTenant(i.company_id))
 const tenantProdTasks = rawProdTasks.filter((t) => isMatchingTenant(t.company_id))
 const tenantDesignJobs = rawDesignJobs.filter((d) => isMatchingTenant(d.company_id))
 const tenantChallans = rawChallans.filter((c) => isMatchingTenant(c.company_id))

      // Deduplicate orders by order_number or id (prefer record with non-empty line items)
 const orderDedupMap = new Map<string, SalesOrderRecord>()
 tenantOrders.forEach((o) => {
 const key = o.order_number && o.order_number.trim()
          ? `ORD_${o.order_number.trim().toUpperCase()}`
          : `ID_${o.id}`
 if (!orderDedupMap.has(key)) {
 orderDedupMap.set(key, o)
        } else {
 const prev = orderDedupMap.get(key)!
 const prevItems = Array.isArray(prev.items) ? prev.items : []
 const incomingItems = Array.isArray(o.items) ? o.items : []
 const items = incomingItems.length > 0 ? incomingItems : prevItems
 orderDedupMap.set(key, { ...prev, ...o, items })
        }
      })
 const deduplicatedOrders = Array.from(orderDedupMap.values())

 const unifiedMap = new Map<string, UnifiedOrderRecord>()

      // A. Process Sales Orders (Master Order Container)
 deduplicatedOrders.forEach((o) => {
 const orderKey = (o.order_number && o.order_number.trim())
          ? `ORD_${o.order_number.trim().toUpperCase()}`
          : `ID_${o.id}`

 const orderId = o.id || o.order_number

        // Find child jobs belonging to this order
 const linkedJobs = tenantJobs.filter(
          (j) =>
 j.order_id === o.id ||
            (j.order_number && o.order_number && j.order_number.trim().toUpperCase() === o.order_number.trim().toUpperCase()) ||
            (j.sales_order_id && (j.sales_order_id === o.id || (o.order_number && j.sales_order_id === o.order_number)))
        )

        // Find linked invoice
 const linkedInvoice = tenantInvoices.find(
          (inv) =>
            (inv.id && o.invoice_id && inv.id === o.invoice_id) ||
            (inv.sales_order_id && (inv.sales_order_id === o.id || (o.order_number && inv.sales_order_id === o.order_number))) ||
            (inv.order_number && o.order_number && inv.order_number.trim().toUpperCase() === o.order_number.trim().toUpperCase()) ||
            (inv.invoice_number && o.invoice_number && inv.invoice_number.trim().toUpperCase() === o.invoice_number.trim().toUpperCase())
        )

        // Find linked production tasks
 const linkedProdTasks = tenantProdTasks.filter((t) =>
 linkedJobs.some((j) => j.id === t.job_order_id)
        )

        // Find linked design jobs
 const linkedDesignJobs = tenantDesignJobs.filter(
          (d) =>
 d.order_id === o.id ||
 d.sales_order_id === o.id ||
            (d.order_number && o.order_number && d.order_number.trim().toUpperCase() === o.order_number.trim().toUpperCase()) ||
 linkedJobs.some((j) => j.id && d.job_order_id === j.id)
        )

        // Find linked delivery challans
 const linkedChallans = tenantChallans.filter(
          (c) =>
 c.sales_order_id === o.id ||
            (c.order_number && o.order_number && c.order_number.trim().toUpperCase() === o.order_number.trim().toUpperCase()) ||
            (c.items && c.items.some((it: any) => it.order_id === o.id || (o.order_number && it.order_number === o.order_number)))
        )

        // Authoritative workflow engine resolution
 const workflowResolution = resolveOrderJobWorkflow(
 o,
 linkedJobs,
 linkedProdTasks,
 linkedDesignJobs,
 linkedChallans,
 tenantSlug
        )

        // Map line items
 let mappedItems: OrderItemSpec[] = (o.items || []).map((it: any, idx: number) => {
 const isReady = isReadyProduct(it) || it.workflow_routing === 'ready_product' || it.item_kind === 'ready_product'
 const isOutsource = isOutsourceProduct(it) || it.item_kind === 'outsource'
 const itemKind = isOutsource ? 'outsource' : isReady ? 'ready_product' : (it.item_kind || 'custom')
 const itemName = it.product_name || it.item_name || it.service_name || 'Printing Item'
 const serviceName = it.service_name || it.serviceName || it.product_name || it.item_name || 'Printing Work'

 return {
 id: it.id || `item-${orderId}-${idx}`,
 serviceName,
 itemName,
 dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || it.unit || 'ft'}` : undefined),
 width: it.width,
 height: it.height,
 dimensionUnit: it.dimension_unit || it.unit,
 quantity: Number(it.quantity) || 1,
 unit: it.unit || it.dimension_unit || 'pcs',
 unitPrice: it.unit_price,
 totalPrice: it.total_price,
 materialSpec: it.material_spec || it.material || inferMaterialFromItemName(serviceName || itemName),
 finishing: it.finishing || (Array.isArray(it.selected_finishing) ? it.selected_finishing.map((f: any) => f.name || f).join(', ') : undefined),
 addOn: it.add_on || it.addOn || it.addon || (Array.isArray(it.selected_add_ons) ? it.selected_add_ons.map((a: any) => a.name || a).join(', ') : undefined),
 itemKind,
 workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'ready_production')),
 designRequired: isReady ? false : it.design_required,
 notes: it.notes || it.remarks,
          }
        })

        // If no line items on sales order, synthesize from child jobs
 if (mappedItems.length === 0 && linkedJobs.length > 0) {
 mappedItems = linkedJobs.map((j, idx) => ({
 id: j.id || `job-item-${orderId}-${idx}`,
 serviceName: j.product_name || 'Printing Work',
 itemName: j.product_name || 'Printing Item',
 dimensions: j.size_spec || undefined,
 quantity: Number(j.quantity) || 1,
 unit: 'pcs',
 unitPrice: 0,
 totalPrice: 0,
 materialSpec: j.material_spec || undefined,
 finishing: j.production_instructions?.match(/Finishing:\s*([^|;]+)/i)?.[1]?.trim(),
 addOn: j.production_instructions?.match(/Add-?on:\s*([^|;]+)/i)?.[1]?.trim(),
 itemKind: 'custom',
 workflowRouting: (j.workflow_routing as any) || 'ready_production',
 designRequired: j.artwork_status === 'pending' || j.workflow_routing === 'design_required',
 notes: j.production_instructions || undefined,
          }))
        }

        // Authoritative financial state: invoice takes precedence if present; no heuristic Math.max
 let total = Number(o.final_price ?? o.subtotal ?? (o as any).total_amount ?? 0)
 let advance = Number(o.advance_amount ?? (o as any).paid_amount ?? 0)
 let due = o.due_amount !== undefined && o.due_amount !== null ? Number(o.due_amount) : Math.max(0, total - advance)

 if (linkedInvoice) {
 if (linkedInvoice.grand_total !== undefined && linkedInvoice.grand_total !== null) {
 total = Number(linkedInvoice.grand_total)
          }
 if (linkedInvoice.paid_amount !== undefined && linkedInvoice.paid_amount !== null) {
 advance = Number(linkedInvoice.paid_amount)
          }
 due = Math.max(0, total - advance)
        }

 const payStatus = due <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid'

        // Canonical stage mapping
 let calculatedStage: OrderStage = 'new_orders'
 if (workflowResolution.derivedOrderStatus === 'Delivered' || (o.status as string) === 'delivered' || (o.status as string) === 'completed') {
 calculatedStage = 'delivered'
        } else if (workflowResolution.derivedOrderStatus === 'Ready' || (o.status as string) === 'ready' || o.status === 'ready_for_delivery') {
 calculatedStage = 'ready_delivery'
        } else if (workflowResolution.overallStage === 'delivery') {
 calculatedStage = 'delivery'
        } else if (workflowResolution.overallStage === 'finishing') {
 calculatedStage = 'finishing'
        } else if (workflowResolution.overallStage === 'production' || o.status === 'in_production') {
 calculatedStage = 'in_production'
        } else if (workflowResolution.overallStage === 'approval') {
 calculatedStage = 'approval'
        } else if (workflowResolution.overallStage === 'design' || (o.status as string) === 'in_design') {
 calculatedStage = 'in_design'
        }

 const isWalk =
 o.customer_name?.toLowerCase().includes('walk') ||
 o.customer_name?.toLowerCase().includes('counter') ||
          (o as any).is_walkin

 const originVal: any =
          (o as any).quotation_id || (o as any).quotation_number ? 'quotation' : 'sales_order'

 unifiedMap.set(orderKey, {
 id: o.id,
 orderNumber: o.order_number,
 jobNumber: linkedJobs[0]?.job_number,
 jobOrderId: linkedJobs[0]?.id,
 invoiceId: linkedInvoice?.id || o.invoice_id || undefined,
 invoiceNumber: linkedInvoice?.invoice_number || o.invoice_number || undefined,
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
 currentStatus: deriveOrderLiveStatus(o, calculatedStage, linkedJobs[0]),
 paymentStatus: payStatus,
 totalAmount: total,
 advanceAmount: advance,
 dueAmount: due,
 salespersonName: o.salesperson_name,
 notes: o.notes || undefined,
 rawOrder: o,
 rawJob: linkedJobs[0],
 rawInvoice: linkedInvoice,
 workflowResolution,
          version: o.version || 1,
        })
      })

      // B. Process Standalone Job Orders (if not covered by existing sales order)
 tenantJobs.forEach((j) => {
 const jobOrderNumber = j.order_number?.trim().toUpperCase() || j.job_number?.replace('JOB-', 'ORD-').replace(/-[A-Z]$/, '').trim().toUpperCase()
 const isMapped = Array.from(unifiedMap.values()).some(
          (u) =>
 u.id === j.order_id ||
 u.id === (j as any).sales_order_id ||
            (j.order_number && u.orderNumber?.toUpperCase() === j.order_number.trim().toUpperCase()) ||
            (jobOrderNumber && u.orderNumber?.toUpperCase() === jobOrderNumber) ||
 u.jobNumber === j.job_number ||
 u.jobOrderId === j.id
        )

 if (!isMapped) {
 const synthOrderNumber = j.order_number || j.job_number?.replace('JOB-', 'ORD-').replace(/-[A-Z]$/, '') || `ORD-${j.id.slice(-6)}`
 const synthKey = `ORD_${synthOrderNumber.trim().toUpperCase()}`
 if (unifiedMap.has(synthKey)) return

 const linkedProdTasks = tenantProdTasks.filter((t) => j.id && t.job_order_id === j.id)
 const linkedDesignJobs = tenantDesignJobs.filter(
            (d) => (j.id && d.job_order_id === j.id) || (j.order_id && d.order_id === j.order_id)
          )

 const synthOrder: SalesOrderRecord = {
 id: j.order_id || j.id,
 company_id: j.company_id,
 order_number: synthOrderNumber,
 customer_name: j.customer_name || 'Production Job Client',
 status: (j.status as any) || 'confirmed',
 created_at: j.created_at || new Date().toISOString(),
 items: [],
 due_amount: 0,
 final_price: 0,
          } as unknown as SalesOrderRecord

 const workflowResolution = resolveOrderJobWorkflow(
 synthOrder,
            [j],
 linkedProdTasks,
 linkedDesignJobs,
            [],
 tenantSlug
          )

 let jobStage: OrderStage = 'new_orders'
 if (workflowResolution.derivedOrderStatus === 'Delivered' || (j.status as string) === 'completed') jobStage = 'delivered'
 else if (workflowResolution.derivedOrderStatus === 'Ready' || (j.status as string) === 'ready') jobStage = 'ready_delivery'
 else if (workflowResolution.overallStage === 'finishing') jobStage = 'finishing'
 else if (workflowResolution.overallStage === 'production' || j.status === 'in_progress') jobStage = 'in_production'
 else if (workflowResolution.overallStage === 'approval') jobStage = 'approval'
 else if (workflowResolution.overallStage === 'design' || j.artwork_status === 'pending') jobStage = 'in_design'

 unifiedMap.set(synthKey, {
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
 serviceName: j.product_name || (j as any).title || 'Production Print Job',
 itemName: j.product_name || (j as any).title || 'Production Print Job',
 dimensions: j.size_spec || (j.quantity ? `${j.quantity} pcs` : undefined),
 quantity: Number(j.quantity) || 1,
 unit: 'pcs',
 materialSpec: j.material_spec || inferMaterialFromItemName(j.product_name || (j as any).title),
 finishing: j.production_instructions?.match(/Finishing:\s*([^|;]+)/i)?.[1]?.trim() || (j.production_instructions?.startsWith('Finishing:') ? j.production_instructions.replace(/^Finishing:\s*/, '').split('|')[0].trim() : undefined),
 addOn: j.production_instructions?.match(/Add-?on:\s*([^|;]+)/i)?.[1]?.trim() || undefined,
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
 workflowResolution,
          })
        }
      })

      // C. Process Invoices (Merge or Synthesize Orders)
 tenantInvoices.forEach((inv) => {
 const invOrderNum = inv.order_number?.trim().toUpperCase() || inv.invoice_number?.replace('INV-', 'ORD-').trim().toUpperCase()
 const matchingKey = inv.sales_order_id || inv.order_number || inv.id
 const existing = Array.from(unifiedMap.values()).find(
          (u) =>
 u.id === matchingKey ||
            (inv.order_number && u.orderNumber?.toUpperCase() === inv.order_number.trim().toUpperCase()) ||
            (invOrderNum && u.orderNumber?.toUpperCase() === invOrderNum) ||
            (inv.sales_order_id && u.id === inv.sales_order_id)
        )

 if (existing) {
          // Authoritative invoice finance enrichment (no Math.max heuristics)
 existing.invoiceId = inv.id
 existing.invoiceNumber = inv.invoice_number
 if (inv.grand_total !== undefined && inv.grand_total !== null) {
 existing.totalAmount = Number(inv.grand_total)
          }
 if (inv.paid_amount !== undefined && inv.paid_amount !== null) {
 existing.advanceAmount = Number(inv.paid_amount)
          }
 existing.dueAmount = Math.max(0, existing.totalAmount - existing.advanceAmount)
 existing.paymentStatus = existing.dueAmount <= 0 ? 'paid' : existing.advanceAmount > 0 ? 'partial' : 'unpaid'
 existing.rawInvoice = inv

          // Hydrate line items if order currently has 0 items
 if (existing.items.length === 0 && inv.items && inv.items.length > 0) {
 const invMapped: OrderItemSpec[] = inv.items.map((it: any, idx: number) => {
 const isReady = isReadyProduct(it) || it.workflow_routing === 'ready_product' || it.item_kind === 'ready_product'
 const isOutsource = isOutsourceProduct(it) || it.item_kind === 'outsource'
 const itemKind = isOutsource ? 'outsource' : isReady ? 'ready_product' : (it.item_kind || 'custom')
 const itName = it.item_description || it.description || it.item_name || 'Printing Item'
 return {
 id: it.id || `inv-item-${inv.id}-${idx}`,
 serviceName: it.service_name || it.product_name || itName,
 itemName: itName,
 dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : undefined),
 width: it.width,
 height: it.height,
 dimensionUnit: it.unit || 'ft',
 quantity: Number(it.quantity) || 1,
 unit: it.unit || 'pcs',
 unitPrice: it.unit_price,
 totalPrice: it.total_price,
 materialSpec: it.material_spec || it.material,
 finishing: it.finishing || (Array.isArray(it.selected_finishing) ? it.selected_finishing.map((f: any) => f.name || f).join(', ') : undefined),
 addOn: it.add_on || it.addOn || it.addon || (Array.isArray(it.selected_add_ons) ? it.selected_add_ons.map((a: any) => a.name || a).join(', ') : undefined),
 itemKind,
 workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'ready_production')),
 designRequired: isReady ? false : it.design_required,
 notes: it.notes || it.remarks,
              }
            })
 existing.items = invMapped
 existing.itemsCount = invMapped.reduce((acc, it) => acc + it.quantity, 0)
          }
        } else {
 const synthOrderNumber = inv.order_number || inv.invoice_number?.replace('INV-', 'ORD-') || `ORD-${inv.id.slice(-4)}`
 const synthKey = `ORD_${synthOrderNumber.trim().toUpperCase()}`
 if (unifiedMap.has(synthKey)) {
 const ord = unifiedMap.get(synthKey)!
 ord.invoiceId = inv.id
 ord.invoiceNumber = inv.invoice_number
 if (inv.grand_total !== undefined && inv.grand_total !== null) {
 ord.totalAmount = Number(inv.grand_total)
            }
 if (inv.paid_amount !== undefined && inv.paid_amount !== null) {
 ord.advanceAmount = Number(inv.paid_amount)
            }
 ord.dueAmount = Math.max(0, ord.totalAmount - ord.advanceAmount)
 ord.paymentStatus = ord.dueAmount <= 0 ? 'paid' : ord.advanceAmount > 0 ? 'partial' : 'unpaid'
 ord.rawInvoice = inv
 return
          }

          // Synthesize Order from Direct Counter Invoice
 const mappedItems: OrderItemSpec[] = (inv.items || []).map((it: any, idx: number) => {
 const isReady = isReadyProduct(it) || it.workflow_routing === 'ready_product' || it.item_kind === 'ready_product'
 const isOutsource = isOutsourceProduct(it) || it.item_kind === 'outsource'
 const itemKind = isOutsource ? 'outsource' : isReady ? 'ready_product' : (it.item_kind || 'custom')
 const itName = it.item_description || it.description || it.item_name || 'Printing Item'

 return {
 id: it.id || `inv-item-${inv.id}-${idx}`,
 serviceName: it.service_name || it.product_name || itName,
 itemName: itName,
 dimensions:
 it.dimensions_spec ||
                (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : undefined) ||
                ((it.unit || '').toLowerCase() === 'sft' && it.quantity ? `${it.quantity} sft` : undefined),
 width: it.width,
 height: it.height,
 dimensionUnit: it.unit,
 quantity: Number(it.quantity) || 1,
 unit: it.unit || 'pcs',
 unitPrice: it.unit_price,
 totalPrice: it.total_price,
 materialSpec: it.material || it.material_spec || inferMaterialFromItemName(itName),
 finishing: it.finishing || (Array.isArray(it.selected_finishing) ? it.selected_finishing.map((f: any) => f.name || f).join(', ') : undefined),
 addOn: it.add_on || it.addOn || it.addon || (Array.isArray(it.selected_add_ons) ? it.selected_add_ons.map((a: any) => a.name || a).join(', ') : undefined),
 itemKind,
 workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'design_ok')),
 designRequired: isReady ? false : it.design_required,
 notes: it.remarks || it.notes,
            }
          })

 const total = Number(inv.grand_total ?? (inv as any).total_amount ?? 0)
 const advance = Number(inv.paid_amount ?? 0)
 const due = Math.max(0, total - advance)
 const payStatus = due <= 0 ? 'paid' : advance > 0 ? 'partial' : 'unpaid'

 const synthOrderFromInv: SalesOrderRecord = {
 id: inv.sales_order_id || inv.id,
 company_id: inv.company_id,
 order_number: synthOrderNumber,
 customer_name: inv.customer_name || 'Client',
 status: 'confirmed',
 created_at: inv.created_at || new Date().toISOString(),
 items: [],
 due_amount: due,
 final_price: total,
          } as unknown as SalesOrderRecord

 const workflowResolution = resolveOrderJobWorkflow(
 synthOrderFromInv,
            [],
            [],
            [],
            [],
 tenantSlug
          )

 let calculatedStage: OrderStage = 'new_orders'
 const isDelivered = (inv as any).delivery_status === 'delivered' || (inv as any).status === 'delivered'

 if (isDelivered) {
 calculatedStage = 'delivered'
          } else {
 const hasDesignReq = mappedItems.some((it) => it.workflowRouting === 'design_required')
 calculatedStage = hasDesignReq ? 'in_design' : 'in_production'
          }

 const isWalk =
 inv.customer_name?.toLowerCase().includes('walk') ||
 inv.customer_name?.toLowerCase().includes('counter')

 unifiedMap.set(synthKey, {
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
 workflowResolution,
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
 const metrics = useMemo(() => {
 const todayStr = new Date().toISOString().split('T')[0]
 let total = orders.length
 let newOrders = 0
 let inDesign = 0
 let inApproval = 0
 let inProduction = 0
 let inFinishing = 0
 let readyDelivery = 0
 let outDelivery = 0
 let delivered = 0
 let dueToday = 0
 let totalDueAmount = 0
 let blockedCount = 0
 let overdueCount = 0
 let paymentDueCount = 0
 let needsAttentionCount = 0

 orders.forEach((o) => {
 const isBlocked = o.workflowResolution?.isBlocked || o.workflowResolution?.childJobs.some((j) => j.isBlocked)
 const isApproval = o.workflowResolution?.overallStage === 'approval' || o.stage === 'approval'
 const isNeedsAttention = isBlocked || isApproval

 if (isBlocked) blockedCount++
 if (isNeedsAttention) needsAttentionCount++
 if (o.dueAmount > 0) paymentDueCount++
 if (o.deliveryDate?.includes(todayStr)) dueToday++
 if (o.deliveryDate && o.deliveryDate < todayStr && o.stage !== 'delivered' && o.workflowResolution?.derivedOrderStatus !== 'Delivered') overdueCount++
 totalDueAmount += o.dueAmount || 0

 if (o.stage === 'delivered' || o.workflowResolution?.derivedOrderStatus === 'Delivered') delivered++
 else if (o.stage === 'ready' || o.stage === 'ready_delivery' || o.workflowResolution?.derivedOrderStatus === 'Ready') readyDelivery++
 else if (o.stage === 'delivery' || o.workflowResolution?.overallStage === 'delivery') outDelivery++
 else if (o.stage === 'finishing' || o.workflowResolution?.overallStage === 'finishing') inFinishing++
 else if (o.stage === 'in_production' || o.stage === 'production' || o.workflowResolution?.overallStage === 'production') inProduction++
 else if (isApproval) inApproval++
 else if (o.stage === 'in_design' || o.stage === 'design' || o.workflowResolution?.overallStage === 'design') inDesign++
 else newOrders++
    })

 return {
 total,
 newOrders,
 inDesign,
 inApproval,
 inProduction,
 inFinishing,
 readyDelivery,
 outDelivery,
 delivered,
 dueToday,
 totalDueAmount,
 blockedCount,
 overdueCount,
 paymentDueCount,
 needsAttentionCount,
    }
  }, [orders])

  // 3. Filtered Orders
 const filteredOrders = useMemo(() => {
 const query = filters.searchQuery.toLowerCase().trim()
 const todayStr = new Date().toISOString().split('T')[0]

 return orders.filter((order) => {
      // Stage Filter
 if (activeStage === 'needs_attention') {
 const isBlocked = order.workflowResolution?.isBlocked || order.workflowResolution?.childJobs.some((j) => j.isBlocked)
 const isApproval = order.workflowResolution?.overallStage === 'approval' || order.stage === 'approval'
 if (!isBlocked && !isApproval) return false
      } else if (activeStage === 'design') {
 if (order.stage !== 'in_design' && order.stage !== 'design' && order.workflowResolution?.overallStage !== 'design') return false
      } else if (activeStage === 'approval') {
 if (order.stage !== 'approval' && order.workflowResolution?.overallStage !== 'approval') return false
      } else if (activeStage === 'production') {
 if (order.stage !== 'in_production' && order.stage !== 'production' && order.workflowResolution?.overallStage !== 'production') return false
      } else if (activeStage === 'finishing') {
 if (order.stage !== 'finishing' && order.workflowResolution?.overallStage !== 'finishing') return false
      } else if (activeStage === 'ready') {
 if (order.stage !== 'ready_delivery' && order.stage !== 'ready' && order.workflowResolution?.derivedOrderStatus !== 'Ready') return false
      } else if (activeStage === 'delivery') {
 if (order.stage !== 'delivery' && order.workflowResolution?.overallStage !== 'delivery') return false
      } else if (activeStage === 'delivered') {
 if (order.stage !== 'delivered' && order.workflowResolution?.overallStage !== 'completed' && order.workflowResolution?.derivedOrderStatus !== 'Delivered') return false
      } else if (activeStage !== 'all') {
 if (order.stage !== activeStage) return false
      }

      // Quick Chips Filter
 if (filters.quickFilter === 'due_today') {
 if (!order.deliveryDate?.includes(todayStr)) return false
      } else if (filters.quickFilter === 'blocked') {
 const isBlocked = order.workflowResolution?.isBlocked || order.workflowResolution?.childJobs.some((j) => j.isBlocked)
 if (!isBlocked) return false
      } else if (filters.quickFilter === 'overdue') {
 if (!order.deliveryDate || order.deliveryDate >= todayStr || order.stage === 'delivered' || order.workflowResolution?.derivedOrderStatus === 'Delivered') return false
      } else if (filters.quickFilter === 'payment_due' || filters.quickFilter === 'unpaid_due') {
 if (order.dueAmount <= 0) return false
      } else if (filters.quickFilter === 'urgent') {
 if (order.priority !== 'urgent' && order.priority !== 'very_urgent') return false
      } else if (filters.quickFilter === 'walk_in') {
 if (!order.isWalkIn) return false
      }

      // Priority Dropdown Filter
 if (filters.selectedPriority !== 'all' && order.priority !== filters.selectedPriority) {
 return false
      }

      // Search Query across Order #, Job #, Customer, Phone, Invoice #, Item, Operator, Machine
 if (query) {
 const matchCust = order.customerName?.toLowerCase().includes(query)
 const matchPhone = order.customerPhone?.toLowerCase().includes(query)
 const matchOrd = order.orderNumber?.toLowerCase().includes(query)
 const matchJob =
 order.jobNumber?.toLowerCase().includes(query) ||
 order.workflowResolution?.childJobs.some((j) => j.jobNumber?.toLowerCase().includes(query))
 const matchInv = order.invoiceNumber?.toLowerCase().includes(query)
 const matchItem = order.items.some(
          (it) => it.itemName.toLowerCase().includes(query) || it.serviceName?.toLowerCase().includes(query)
        )
 const matchOp = order.workflowResolution?.childJobs.some((j) => j.assignedOperator?.toLowerCase().includes(query))
 const matchMachine = order.workflowResolution?.childJobs.some((j) => j.assignedMachine?.toLowerCase().includes(query))
 if (!matchCust && !matchPhone && !matchOrd && !matchJob && !matchInv && !matchItem && !matchOp && !matchMachine) return false
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
    { id: 'all', label: tBilingual('All', 'সব'), count: metrics.total, icon: Layers },
    { id: 'needs_attention', label: tBilingual('Needs Attention', 'দৃষ্টি আকর্ষণ'), count: metrics.needsAttentionCount, icon: AlertTriangle },
    { id: 'design', label: tBilingual('Design', 'ডিজাইন'), count: metrics.inDesign, icon: Sparkles },
    { id: 'approval', label: tBilingual('Approval', 'অনুমোদন'), count: metrics.inApproval, icon: CheckCircle2 },
    { id: 'production', label: tBilingual('Production', 'প্রোডাকশন'), count: metrics.inProduction, icon: Printer },
    { id: 'finishing', label: tBilingual('Finishing', 'ফিনিশিং'), count: metrics.inFinishing, icon: Briefcase },
    { id: 'ready', label: tBilingual('Ready', 'রেডি'), count: metrics.readyDelivery, icon: PackageCheck },
    { id: 'delivery', label: tBilingual('Delivery', 'ডেলিভারি'), count: metrics.outDelivery, icon: Truck },
    { id: 'delivered', label: tBilingual('Delivered', 'সম্পন্ন'), count: metrics.delivered, icon: CheckCircle2 },
  ]

 return (
    <PanelAccessGuard
 module="orders"action="view"panelTitle="Orders & Jobs"panelTitleBn="অর্ডার ও জব">
      <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
 className={`p-3 rounded-lg text-xs font-bold flex items-center justify-between shadow-lg transition-all animate-in fade-in slide-in- duration-200 ${
 notification.type === 'warning'
              ? 'bg-warning text-warning-foreground'
              : notification.type === 'info'
              ? 'bg-primary text-primary-foreground'
              : 'bg-success text-success-foreground'
          }`}
        >
          <span>{notification.msg}</span>
          <button
 type="button"onClick={() => setNotification(null)}
 className="text-foreground/80 hover:text-foreground ml-2 text-xs tabular-nums">
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          1. HEADER: Standardized PageHeader matching Quotations & Billing
         ========================================================================= */}
      <PageHeader
 titleEn="Orders & Jobs"titleBn="অর্ডার ও জব"descriptionEn="Master workflow hub: intake, child jobs, production, and delivery tracking."descriptionBn="মাস্টার ওয়ার্কফ্লো হাব: অর্ডার গ্রহণ, চাইল্ড জব, প্রোডাকশন ও ডেলিভারি ট্র্যাকিং।"icon={Briefcase}
 actions={
          <>
            <Button
 variant="outline"size="sm"onClick={handleRefresh}
 disabled={isRefreshing}
 className="h-9 w-9 p-0"title="Refresh Orders"aria-label="Refresh Orders">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            </Button>

            <Button
 size="sm"onClick={() => setIsWorkOrderModalOpen(true)}
 className="gap-1.5">
              <Plus className="w-4 h-4"/>
              <span>{tBilingual('+ New Work', '+ নতুন কাজ')}</span>
            </Button>
          </>
        }
      />

      {/* Owner Dashboard Needs Attention Summary Banner (Section 50) */}
      {metrics.needsAttentionCount > 0 && (
        <div className="bg-warning-surface border border-warning-border/60 rounded-xl p-3 px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold text-warning">
            <AlertTriangle className="w-4 h-4 text-warning"/>
            <span>{tBilingual('NEEDS ATTENTION', 'দৃষ্টি আকর্ষণ')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {metrics.inApproval > 0 && (
              <button
 type="button"onClick={() => {
 setActiveStage('approval')
 setFilters((f) => ({ ...f, quickFilter: 'all' }))
                }}
 className="px-2.5 py-1 rounded-lg bg-card border border-warning-border/60 text-warning font-medium hover:bg-warning-surface/50 transition-colors cursor-pointer">
                {metrics.inApproval} {tBilingual('jobs waiting approval', 'অনুমোদনের অপেক্ষায়')}
              </button>
            )}
            {metrics.blockedCount > 0 && (
              <button
 type="button"onClick={() => {
 setFilters((f) => ({ ...f, quickFilter: 'blocked' }))
                }}
 className="px-2.5 py-1 rounded-lg bg-card border border-danger-border border-danger-border/60 text-destructive font-medium hover:bg-danger-surface transition-colors cursor-pointer">
                {metrics.blockedCount} {tBilingual('blocked jobs', 'স্থগিত কাজ')}
              </button>
            )}
            {metrics.readyDelivery > 0 && (
              <button
 type="button"onClick={() => {
 setActiveStage('ready')
 setFilters((f) => ({ ...f, quickFilter: 'all' }))
                }}
 className="px-2.5 py-1 rounded-lg bg-card border border-success-border border-success-border/60 text-success font-medium hover:bg-success-surface transition-colors cursor-pointer">
                {metrics.readyDelivery} {tBilingual('delivery ready', 'ডেলিভারি প্রস্তুত')}
              </button>
            )}
            {metrics.paymentDueCount > 0 && (
              <button
 type="button"onClick={() => {
 setFilters((f) => ({ ...f, quickFilter: 'payment_due' }))
                }}
 className="px-2.5 py-1 rounded-lg bg-card border border-primary/20 border-border/60 text-primary font-medium hover:bg-primary/10 transition-colors cursor-pointer">
                {metrics.paymentDueCount} {tBilingual('customer dues', 'গ্রাহকের বকেয়া')}
              </button>
            )}
          </div>
        </div>
      )}

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

      {/* 6 Lifecycle Stage Tabs (Pill Row matching Design Panel) */}
      <div className="flex flex-wrap items-center gap-2">
        {stagesConfig.map((s) => {
 const isActive = activeStage === s.id && filters.quickFilter === 'all'
 return (
            <button
 key={s.id}
 type="button"onClick={() => {
 setActiveStage(s.id)
 setFilters((f) => ({ ...f, quickFilter: 'all' }))
              }}
 className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-2xs ${
 isActive
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border/80 text-foreground hover:bg-muted dark:hover:bg-muted/80'
              }`}
            >
              <span>{s.label}</span>
              <span
 className={`text-xs px-2 py-0.5 rounded-full font-bold tabular-nums ${
 isActive
                    ? 'bg-card text-primary'
                    : 'bg-muted text-muted-foreground '
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
        <div className="p-12 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-primary"/>
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
 key={order.orderNumber ? `ord-${order.orderNumber}` : order.id}
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
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
              <div className="text-sm font-bold text-foreground">
                {tBilingual('No orders found', 'কোনো অর্ডার পাওয়া যায়নি')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
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
 companyAddress="Paltan / Fakirapool, Dhaka"companyPhone="01700-000000"/>
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
    </PanelAccessGuard>
  )
}
