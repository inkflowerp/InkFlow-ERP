'use client'

import React, { useState, useMemo, useEffect, useCallback, useTransition } from 'react'
import { useParams } from 'next/navigation'
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
import type { SalesOrderRecord, JobOrderRecord } from '@/types/order.types'
import type { InvoiceRecord } from '@/types/billing.types'

import {
  type OrderStage,
  type UnifiedOrderRecord,
  type OrderItemSpec,
  type OrderWhatsAppTemplateKey,
} from '@/components/orders/types'
import { isReadyProduct, isOutsourceProduct } from '@/lib/units'

import { OrdersMetricsBar, type OrderMetrics } from '@/components/orders/orders-metrics-bar'
import { OrdersFilterToolbar, type OrderFilterState } from '@/components/orders/orders-filter-toolbar'
import { OrderCard } from '@/components/orders/order-card'
import { OrdersTableView } from '@/components/orders/orders-table-view'

import { OrderWhatsAppModal } from '@/components/orders/modals/order-whatsapp-modal'
import { OrderJobTicketModal } from '@/components/orders/modals/order-job-ticket-modal'
import { OrderQuickStatusModal } from '@/components/orders/modals/order-quick-status-modal'
import { WorkOrderModal } from '@/components/shared/work-order-modal'

export default function OrdersPage() {
  const params = useParams()
  const { company } = useTenant()
  const { tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'default'
  const companyId = company?.id || tenantSlug

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
      // Ingest from PrintERPDataStore & Repositories
      const localOrders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
      const localInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
      const localJobOrders = PrintERPDataStore.get<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS) || []

      const isMatchingTenant = (itemCompId?: string | null) => {
        if (!itemCompId || itemCompId === 'default' || !companyId || companyId === 'default') return true
        if (itemCompId === companyId || itemCompId === tenantSlug) return true
        return false
      }

      const tenantOrders = localOrders.filter((o) => isMatchingTenant(o.company_id))
      const tenantInvoices = localInvoices.filter((i) => isMatchingTenant(i.company_id))

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
            dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : undefined),
            width: it.width,
            height: it.height,
            dimensionUnit: it.unit,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pcs',
            unitPrice: it.unit_price,
            totalPrice: it.total_price,
            materialSpec: it.material_spec || it.material,
            finishing: it.finishing,
            itemKind,
            workflowRouting: isReady ? 'ready_product' : (it.workflow_routing || (it.design_required ? 'design_required' : 'ready_production')),
            designRequired: isReady ? false : it.design_required,
            notes: it.notes,
          }
        })

        let calculatedStage: OrderStage = 'new_orders'
        const ordStatus = String(o.status || '')
        const allReady = mappedItems.length > 0 && mappedItems.every((it) => it.itemKind === 'ready_product' || it.workflowRouting === 'ready_product')

        if (ordStatus === 'completed' || ordStatus === 'delivered') {
          calculatedStage = 'delivered'
        } else if (allReady) {
          calculatedStage = 'ready_delivery'
        } else if (ordStatus === 'ready' || ordStatus === 'ready_for_delivery') {
          calculatedStage = 'ready_delivery'
        } else if (ordStatus === 'in_production' || ordStatus === 'production') {
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

        unifiedMap.set(orderId, {
          id: o.id,
          orderNumber: o.order_number,
          origin: 'sales_order',
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
          paymentStatus: payStatus,
          totalAmount: total,
          advanceAmount: advance,
          dueAmount: due,
          salespersonName: o.salesperson_name,
          notes: o.notes || undefined,
          rawOrder: o,
        })
      })

      // B. Process Invoices (Merge or Synthesize Orders)
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
    loadData()

    const handleSync = () => {
      loadData()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_data_sync', handleSync)
      window.addEventListener('storage', handleSync)
      window.addEventListener(`${STORAGE_KEYS.ORDERS}_updated`, handleSync)
      window.addEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleSync)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_data_sync', handleSync)
        window.removeEventListener('storage', handleSync)
        window.removeEventListener(`${STORAGE_KEYS.ORDERS}_updated`, handleSync)
        window.removeEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleSync)
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
        showNotification(`অর্ডারের স্ট্যাটাস পরিবর্তিত হয়েছে! (${nextStage.replace('_', ' ')})`, 'success')
      })
    },
    [showNotification]
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

  const handleOpenQuickStatus = useCallback((order: UnifiedOrderRecord) => {
    setQuickStatusModalState({ isOpen: true, order })
  }, [])

  const stagesConfig: Array<{ id: OrderStage; label: string; sub: string; count: number; icon: any }> = [
    { id: 'all', label: 'সব অর্ডার', sub: 'All Orders', count: metrics.total, icon: Layers },
    { id: 'new_orders', label: '১. নতুন অর্ডার', sub: 'New Intake', count: metrics.newOrders, icon: Sparkles },
    { id: 'in_design', label: '২. ডিজাইন ও চেক', sub: 'In Design', count: metrics.inDesign, icon: Sparkles },
    { id: 'in_production', label: '৩. মেশিন প্রোডাকশন', sub: 'In Machine Floor', count: metrics.inProduction, icon: Printer },
    { id: 'ready_delivery', label: '৪. ডেলিভারি রেডি', sub: 'Ready for Pickup', count: metrics.readyDelivery, icon: Truck },
    { id: 'delivered', label: '৫. ডেলিভারি সম্পন্ন', sub: 'Completed', count: metrics.delivered, icon: PackageCheck },
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

      {/* Top Header & New Order Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Orders & Job Floor Hub (অর্ডার ও প্রোডাকশন হাব)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            প্রেস অর্ডার বুকিং, অগ্রিম ও বাকি ট্র্যাকিং, ৩-মুখী ফ্লো ও ডেলিভারি ব্যবস্থাপনা
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => setIsWorkOrderModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-md"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            <span>+ নতুন অর্ডার বুকিং (New Order)</span>
          </Button>
        </div>
      </div>

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
          <span>অর্ডার লোড হচ্ছে...</span>
        </div>
      ) : filters.viewMode === 'table' ? (
        <OrdersTableView
          orders={filteredOrders}
          tenantSlug={tenantSlug}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenJobTicket={handleOpenJobTicket}
          onOpenQuickStatus={handleOpenQuickStatus}
          onAdvanceStage={handleAdvanceStage}
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
              onOpenQuickStatus={handleOpenQuickStatus}
              onAdvanceStage={handleAdvanceStage}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                কোনো অর্ডার পাওয়া যায়নি
              </div>
              <p className="text-xs text-slate-400 mt-1">
                ফিল্টার বা সার্চ পরিবর্তন করুন অথবা নতুন অর্ডার বুকিং করুন।
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
