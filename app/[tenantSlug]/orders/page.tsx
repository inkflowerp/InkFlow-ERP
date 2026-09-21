'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Clock,
  Printer,
  Building,
  AlertTriangle,
  Flame,
  Layers,
  Calendar,
  Phone,
  ArrowRight,
  Sparkles,
  Scissors,
  Truck,
  FileText,
  Filter,
  RefreshCw,
  Eye,
  SlidersHorizontal,
  FileCheck,
  ChevronDown,
  Wrench,
  Tag,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { SalesOrderRecord, OrderPriority, PaymentTerm, OrderStatus, JobOrderRecord } from '@/types/order.types'
import { CustomerRecord } from '@/types/crm.types'
import { NewCustomerModal } from '@/components/shared/new-customer-modal'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import { useDataStore } from '@/hooks/use-data-store'
import { usePermissions } from '@/hooks/use-permissions'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { getOrdersAction } from '@/actions/order.actions'
import { getInvoicesAction } from '@/actions/billing.actions'
import { Crown, ShoppingCart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'

export interface UnifiedWorkItem {
  id: string
  orderNumber: string
  invoiceNumber?: string
  origin: 'invoice_created' | 'sales_order' | 'work_order' | 'quotation'
  customerId?: string
  customerName: string
  customerNameBn?: string | null
  customerPhone?: string
  customerAddress?: string
  items: Array<{
    id: string
    itemName: string
    dimensions?: string
    width?: number
    height?: number
    dimensionUnit?: string
    quantity: number
    unit: string
    materialSpec?: string
    finishing?: string
    routing?: string
  }>
  jobsCount: number
  priority: OrderPriority
  deliveryDate: string
  orderDate: string
  createdAt: string
  workflowRouting?: string
  commercialStatus: 'invoice_created' | 'invoice_requested' | 'invoice_required'
  productionGateStatus?: string
  stage: 'queued' | 'design_queue' | 'design_ok' | 'in_production' | 'finishing' | 'ready_for_delivery' | 'completed'
  notes?: string
  salespersonName?: string
  rawOrder?: SalesOrderRecord
  rawInvoice?: any
}

export default function OrdersPage() {
  const { company } = useTenant()
  const { can, isReadOnly } = usePermissions()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, usage, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  // Datastore hooks
  const [orders, setOrders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [jobOrders] = useDataStore<JobOrderRecord[]>(STORAGE_KEYS.JOB_ORDERS, [])
  const [productionJobs] = useDataStore<any[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const [deliveryChallans] = useDataStore<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  const [designJobs] = useDataStore<any[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [customerList] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])

  // Filters & Search
  const [search, setSearch] = useState('')
  const [activeStageTab, setActiveStageTab] = useState<string>('all')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedRouting, setSelectedRouting] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'deadline_asc' | 'created_desc'>('deadline_asc')

  // Modals
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedTicketJob, setSelectedTicketJob] = useState<UnifiedWorkItem | null>(null)
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false)

  // New Order Form State (Operational Specs only - No pricing)
  const [itemDesc, setItemDesc] = useState('')
  const [itemWidth, setItemWidth] = useState<number>(0)
  const [itemHeight, setItemHeight] = useState<number>(0)
  const [itemQty, setItemQty] = useState<number>(1)
  const [itemMaterial, setItemMaterial] = useState('Standard Flex Banner')
  const [itemFinishing, setItemFinishing] = useState('Eyelets 4 Corners')
  const [orderPriority, setOrderPriority] = useState<OrderPriority>('normal')
  const [orderRouting, setOrderRouting] = useState<string>('ready_production')
  const [orderNotes, setOrderNotes] = useState('')
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]
  )
  const [notification, setNotification] = useState<string | null>(null)

  const orderCheck = checkCanCreate('monthly_orders')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Authoritative Server Data Synchronization on mount & realtime events
  useEffect(() => {
    let isMounted = true
    async function syncOrdersAndInvoices() {
      if (!company?.id) return
      try {
        const [ordersRes, invoicesRes] = await Promise.all([
          getOrdersAction(company.id),
          getInvoicesAction(undefined, company.id),
        ])
        if (!isMounted) return

        if (ordersRes.success && ordersRes.data) {
          const serverOrders = ordersRes.data
          const allStored = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
          const orderMap = new Map<string, SalesOrderRecord>()
          for (const o of allStored) {
            if (o?.id) orderMap.set(o.id, o)
          }
          for (const o of serverOrders) {
            if (o?.id) orderMap.set(o.id, o)
          }
          const merged = Array.from(orderMap.values())
          PrintERPDataStore.set(STORAGE_KEYS.ORDERS, merged)
          setOrders(merged)
        }

        if (invoicesRes.success && invoicesRes.data) {
          const serverInvoices = invoicesRes.data
          const allStored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
          const invMap = new Map<string, any>()
          for (const i of allStored) {
            if (i?.id) invMap.set(i.id, i)
          }
          for (const i of serverInvoices) {
            if (i?.id) invMap.set(i.id, i)
          }
          const merged = Array.from(invMap.values())
          PrintERPDataStore.set(STORAGE_KEYS.INVOICES, merged)
        }
      } catch (err) {
        console.error('Failed to sync orders page server data:', err)
      }
    }
    syncOrdersAndInvoices()

    const handleRealtimeOrderSync = () => {
      syncOrdersAndInvoices()
    }
    window.addEventListener('printerp_table_synced:sales_orders', handleRealtimeOrderSync)
    window.addEventListener('printerp_table_synced:job_orders', handleRealtimeOrderSync)
    window.addEventListener('printerp_table_synced:invoices', handleRealtimeOrderSync)
    window.addEventListener('printerp_data_sync', handleRealtimeOrderSync)

    return () => {
      isMounted = false
      window.removeEventListener('printerp_table_synced:sales_orders', handleRealtimeOrderSync)
      window.removeEventListener('printerp_table_synced:job_orders', handleRealtimeOrderSync)
      window.removeEventListener('printerp_table_synced:invoices', handleRealtimeOrderSync)
      window.removeEventListener('printerp_data_sync', handleRealtimeOrderSync)
    }
  }, [company?.id, slug, setOrders])

  // Combine Orders and Invoices into a Unified List of Jobs/Works
  const unifiedWorks: UnifiedWorkItem[] = useMemo(() => {
    const list: UnifiedWorkItem[] = []
    const seenOrderNumbers = new Set<string>()
    const seenIds = new Set<string>()

    // 1. Process explicit sales orders
    for (const ord of orders) {
      if (!ord || !ord.order_number) continue
      seenOrderNumbers.add(ord.order_number)
      seenIds.add(ord.id)

      // Resolve linked job stage from job_orders / production_jobs / delivery_challans / design_jobs
      const linkedJobs = jobOrders.filter(
        (j) => j.order_id === ord.id || j.order_id === ord.order_number || (ord.invoice_id && j.invoice_id === ord.invoice_id)
      )
      const linkedChallan = deliveryChallans.find(
        (c) => c.sales_order_id === ord.id || c.order_number === ord.order_number || (ord.invoice_id && c.invoice_id === ord.invoice_id)
      )
      const linkedDesign = designJobs.find(
        (d) => d.sales_order_id === ord.id || d.order_number === ord.order_number || (ord.invoice_id && d.invoice_id === ord.invoice_id)
      )

      let computedStage: UnifiedWorkItem['stage'] = 'queued'

      if (ord.status === 'completed' || linkedChallan?.status === 'delivered') {
        computedStage = 'completed'
      } else if (
        ord.status === 'ready_for_delivery' ||
        linkedChallan?.status === 'pending_dispatch' ||
        linkedJobs.some((j) => (j as any).status === 'ready_for_delivery' || j.status === 'completed')
      ) {
        computedStage = 'ready_for_delivery'
      } else if (
        ord.status === 'finishing' ||
        linkedJobs.some((j) => (j.status === 'in_progress' || (j as any).status === 'in_production') && j.assigned_department === 'finishing')
      ) {
        computedStage = 'finishing'
      } else if (
        ord.status === 'in_production' ||
        linkedJobs.some((j) => j.status === 'in_progress' || (j as any).status === 'in_production')
      ) {
        computedStage = 'in_production'
      } else if (linkedDesign && (linkedDesign.status === 'in_progress' || linkedDesign.status === 'pending_review')) {
        computedStage = 'design_queue'
      } else if (ord.workflow_routing === 'design_required' && (!linkedDesign || linkedDesign.status === 'pending')) {
        computedStage = 'design_queue'
      } else if (ord.workflow_routing === 'design_ok' || (linkedDesign && linkedDesign.status === 'approved')) {
        computedStage = 'design_ok'
      }

      const ordCommercial: UnifiedWorkItem['commercialStatus'] =
        ord.invoice_id || ord.commercial_status === 'invoice_created'
          ? 'invoice_created'
          : ord.commercial_status === 'invoice_requested'
          ? 'invoice_requested'
          : 'invoice_required'

      list.push({
        id: ord.id,
        orderNumber: ord.order_number,
        invoiceNumber: ord.invoice_number || undefined,
        origin: ord.invoice_id ? 'invoice_created' : 'sales_order',
        customerId: ord.customer_id || undefined,
        customerName: ord.customer_name || 'Walk-in Customer',
        customerNameBn: ord.customer_name_bn || undefined,
        customerPhone: ord.customer_phone || undefined,
        customerAddress: ord.customer_address || undefined,
      let orderItems = (ord.items || []).map((it, idx) => ({
        id: it.id || `oi-${idx}`,
        itemName: it.item_name || (it as any).description || (it as any).title || (it as any).name || (it as any).product_name || 'Print Order Job',
        dimensions: it.width && it.height ? `${it.width} × ${it.height} ${it.dimension_unit || 'ft'}` : ((it as any).dimensions || (it as any).size || undefined),
        width: it.width,
        height: it.height,
        dimensionUnit: it.dimension_unit || 'ft',
        quantity: it.quantity || 1,
        unit: it.unit || 'sft',
        materialSpec: it.material_spec || (it as any).material || undefined,
        finishing: (it as any).finishing || (it as any).remarks || undefined,
        routing: (it as any).workflow_routing || ord.workflow_routing,
      }))

      if (orderItems.length === 0 && linkedJobs.length > 0) {
        orderItems = linkedJobs.map((j, idx) => ({
          id: j.id || `lj-${idx}`,
          itemName: j.product_name || 'Print Order Job',
          dimensions: j.size_spec || undefined,
          width: undefined,
          height: undefined,
          dimensionUnit: 'ft',
          quantity: j.quantity || 1,
          unit: 'pcs',
          materialSpec: j.material_spec || undefined,
          finishing: undefined,
          routing: j.workflow_routing,
        }))
      }

      list.push({
        id: ord.id,
        orderNumber: ord.order_number,
        invoiceNumber: ord.invoice_number || undefined,
        origin: ord.invoice_id ? 'invoice_created' : 'sales_order',
        customerId: ord.customer_id || undefined,
        customerName: ord.customer_name || 'Walk-in Customer',
        customerNameBn: ord.customer_name_bn || undefined,
        customerPhone: ord.customer_phone || undefined,
        customerAddress: ord.customer_address || undefined,
        items: orderItems,
        jobsCount: ord.jobs_count || (orderItems.length || 1),
        priority: ord.priority || 'normal',
        deliveryDate: ord.delivery_date || new Date().toISOString().split('T')[0],
        orderDate: ord.order_date || new Date().toISOString().split('T')[0],
        createdAt: ord.created_at || new Date().toISOString(),
        workflowRouting: ord.workflow_routing || 'ready_production',
        commercialStatus: ordCommercial,
        productionGateStatus: ord.production_gate_status || (ord.invoice_id ? 'ready_for_production' : 'blocked_commercial'),
        stage: computedStage,
        notes: ord.notes || undefined,
        salespersonName: ord.salesperson_name || undefined,
        rawOrder: ord,
      })
    }

    // 2. Process all Invoices to ensure 100% of invoice-created works appear
    for (const inv of invoices) {
      if (!inv || !inv.invoice_number) continue
      const derivedOrderNumber = inv.order_number || inv.invoice_number.replace('INV-', 'ORD-')
      
      // If already added via sales_orders matching id or order_number, skip to avoid duplicates
      if (
        (inv.sales_order_id && seenIds.has(inv.sales_order_id)) ||
        seenOrderNumbers.has(derivedOrderNumber) ||
        seenOrderNumbers.has(inv.invoice_number)
      ) {
        continue
      }

      // Check linked jobs/challans/designs for this invoice
      const linkedJobs = jobOrders.filter((j) => j.invoice_id === inv.id || j.order_id === derivedOrderNumber)
      const linkedChallan = deliveryChallans.find((c) => c.invoice_id === inv.id || c.challan_number === `CHL-${inv.invoice_number.replace('INV-', '')}`)
      const linkedDesign = designJobs.find((d) => d.invoice_id === inv.id)

      let computedStage: UnifiedWorkItem['stage'] = 'in_production'

      if (inv.status === 'paid' && linkedChallan?.status === 'delivered') {
        computedStage = 'completed'
      } else if (linkedChallan?.status === 'pending_dispatch' || linkedJobs.some((j) => (j as any).status === 'ready_for_delivery')) {
        computedStage = 'ready_for_delivery'
      } else if (linkedJobs.some((j) => j.assigned_department === 'finishing')) {
        computedStage = 'finishing'
      } else if (linkedDesign && (linkedDesign.status === 'in_progress' || linkedDesign.status === 'pending_review')) {
        computedStage = 'design_queue'
      } else if (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_required' || it.design_required)) {
        computedStage = 'design_queue'
      } else if (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_ok')) {
        computedStage = 'design_ok'
      }

      let invoiceItems = (inv.items || []).map((it: any, idx: number) => ({
        id: it.id || `inv-item-${idx}`,
        itemName: it.item_description || it.description || it.item_name || it.product_name || it.name || `Invoiced Work ${idx + 1}`,
        dimensions: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : (it.size || it.dimensions || undefined)),
        width: it.width,
        height: it.height,
        dimensionUnit: it.unit || 'ft',
        quantity: it.quantity || 1,
        unit: it.unit || 'pcs',
        materialSpec: it.material_spec || it.material || 'Specified Media',
        finishing: it.finishing || it.remarks,
        routing: it.workflow_routing,
      }))

      if (invoiceItems.length === 0 && linkedJobs.length > 0) {
        invoiceItems = linkedJobs.map((j, idx) => ({
          id: j.id || `lj-inv-${idx}`,
          itemName: j.product_name || 'Invoiced Work',
          dimensions: j.size_spec || undefined,
          width: undefined,
          height: undefined,
          dimensionUnit: 'ft',
          quantity: j.quantity || 1,
          unit: 'pcs',
          materialSpec: j.material_spec || 'Specified Media',
          finishing: undefined,
          routing: j.workflow_routing,
        }))
      }

      list.push({
        id: inv.id,
        orderNumber: derivedOrderNumber,
        invoiceNumber: inv.invoice_number,
        origin: 'invoice_created',
        customerId: inv.customer_id,
        customerName: inv.customer_name || 'Counter Customer',
        customerPhone: inv.customer_phone,
        customerAddress: inv.customer_address,
        items: invoiceItems,
        jobsCount: invoiceItems.length || inv.items?.length || 1,
        priority: (inv.priority as OrderPriority) || 'normal',
        deliveryDate: inv.due_date || inv.invoice_date || new Date().toISOString().split('T')[0],
        orderDate: inv.invoice_date || new Date().toISOString().split('T')[0],
        createdAt: inv.created_at || new Date().toISOString(),
        workflowRouting: (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_required' || it.design_required))
          ? 'design_required'
          : (inv.items && inv.items.some((it: any) => it.workflow_routing === 'design_ok'))
          ? 'design_ok'
          : 'ready_production',
        commercialStatus: 'invoice_created',
        productionGateStatus: 'ready_for_production',
        stage: computedStage,
        notes: `Auto-linked from Invoicing (#${inv.invoice_number})`,
        salespersonName: inv.created_by_name || 'Commercial Billing',
        rawInvoice: inv,
      })
    }

    return list
  }, [orders, invoices, jobOrders, productionJobs, deliveryChallans, designJobs])

  // Operational KPI Counts
  const counts = useMemo(() => {
    return {
      total: unifiedWorks.length,
      design: unifiedWorks.filter((w) => w.stage === 'design_queue' || w.stage === 'design_ok').length,
      production: unifiedWorks.filter((w) => w.stage === 'in_production' || w.stage === 'queued').length,
      finishing: unifiedWorks.filter((w) => w.stage === 'finishing').length,
      ready: unifiedWorks.filter((w) => w.stage === 'ready_for_delivery').length,
      completed: unifiedWorks.filter((w) => w.stage === 'completed').length,
      urgent: unifiedWorks.filter((w) => w.priority === 'urgent' || w.priority === 'very_urgent').length,
    }
  }, [unifiedWorks])

  // Filter & Search Logic
  const filteredWorks = useMemo(() => {
    return unifiedWorks
      .filter((w) => {
        // Search Filter
        const term = search.toLowerCase().trim()
        const matchSearch =
          !term ||
          w.orderNumber.toLowerCase().includes(term) ||
          (w.invoiceNumber && w.invoiceNumber.toLowerCase().includes(term)) ||
          w.customerName.toLowerCase().includes(term) ||
          (w.customerPhone && w.customerPhone.toLowerCase().includes(term)) ||
          (w.salespersonName && w.salespersonName.toLowerCase().includes(term)) ||
          w.items.some((it) => it.itemName.toLowerCase().includes(term) || (it.materialSpec && it.materialSpec.toLowerCase().includes(term)))

        // Stage Tab Filter
        let matchStage = true
        if (activeStageTab === 'design') {
          matchStage = w.stage === 'design_queue' || w.stage === 'design_ok'
        } else if (activeStageTab === 'production') {
          matchStage = w.stage === 'in_production' || w.stage === 'queued'
        } else if (activeStageTab === 'finishing') {
          matchStage = w.stage === 'finishing'
        } else if (activeStageTab === 'ready') {
          matchStage = w.stage === 'ready_for_delivery'
        } else if (activeStageTab === 'completed') {
          matchStage = w.stage === 'completed'
        } else if (activeStageTab === 'urgent') {
          matchStage = w.priority === 'urgent' || w.priority === 'very_urgent'
        }

        // Priority Filter
        const matchPriority = selectedPriority === 'all' || w.priority === selectedPriority

        // Routing Filter
        const matchRouting = selectedRouting === 'all' || w.workflowRouting === selectedRouting

        return matchSearch && matchStage && matchPriority && matchRouting
      })
      .sort((a, b) => {
        if (sortBy === 'deadline_asc') {
          return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime()
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
  }, [unifiedWorks, search, activeStageTab, selectedPriority, selectedRouting, sortBy])

  // Quick Stage Update
  const handleUpdateStage = (work: UnifiedWorkItem, newStage: UnifiedWorkItem['stage']) => {
    // 1. Update Sales Order if present
    if (work.rawOrder) {
      let mappedOrderStatus: OrderStatus = 'in_production'
      if (newStage === 'completed') mappedOrderStatus = 'completed'
      else if (newStage === 'ready_for_delivery') mappedOrderStatus = 'ready_for_delivery'
      else if (newStage === 'finishing') mappedOrderStatus = 'finishing'
      else if (newStage === 'in_production') mappedOrderStatus = 'in_production'
      else if (newStage === 'queued') mappedOrderStatus = 'confirmed'

      PrintERPDataStore.updateItem<SalesOrderRecord>(STORAGE_KEYS.ORDERS, work.rawOrder.id, {
        status: mappedOrderStatus,
        updated_at: new Date().toISOString(),
      })
    }

    // 2. Update linked Job Orders
    const allJobOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.JOB_ORDERS) || []
    let jobChanged = false
    for (const jo of allJobOrders) {
      if (
        jo.order_id === work.id ||
        jo.order_id === work.orderNumber ||
        (work.invoiceNumber && jo.invoice_number === work.invoiceNumber)
      ) {
        if (newStage === 'completed') jo.status = 'completed'
        else if (newStage === 'ready_for_delivery') jo.status = 'ready_for_delivery'
        else if (newStage === 'finishing') {
          jo.status = 'in_production'
          jo.assigned_department = 'finishing'
        } else if (newStage === 'in_production') {
          jo.status = 'in_production'
          jo.assigned_department = 'wide_format_print'
        } else if (newStage === 'design_queue') {
          jo.status = 'queued'
          jo.assigned_department = 'design'
        }
        jo.updated_at = new Date().toISOString()
        jobChanged = true
      }
    }
    if (jobChanged) {
      PrintERPDataStore.set(STORAGE_KEYS.JOB_ORDERS, allJobOrders)
    }

    // 3. Update linked Delivery Challans
    if (newStage === 'ready_for_delivery' || newStage === 'completed') {
      const challans = PrintERPDataStore.get<any[]>(STORAGE_KEYS.DELIVERY_CHALLANS) || []
      let chlChanged = false
      for (const chl of challans) {
        if (
          chl.order_number === work.orderNumber ||
          chl.sales_order_id === work.id ||
          (work.invoiceNumber && chl.invoice_number === work.invoiceNumber)
        ) {
          chl.status = newStage === 'completed' ? 'delivered' : 'pending_dispatch'
          chl.updated_at = new Date().toISOString()
          chlChanged = true
        }
      }
      if (chlChanged) {
        PrintERPDataStore.set(STORAGE_KEYS.DELIVERY_CHALLANS, challans)
      }
    }

    // Dispatch global datastore sync
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.ORDERS } }))
      window.dispatchEvent(new CustomEvent('printerp_datastore_sync', { detail: { key: STORAGE_KEYS.JOB_ORDERS } }))
    }

    showNotification(
      tBilingual(
        `Work #${work.orderNumber} stage updated to: ${getStageLabel(newStage).en}`,
        `কাজ #${work.orderNumber} এর স্ট্যাটাস পরিবর্তিত হয়েছে: ${getStageLabel(newStage).bn}`
      )
    )
  }

  // Open Job Ticket Print Modal
  const handleOpenTicket = (work: UnifiedWorkItem) => {
    setSelectedTicketJob(work)
    setIsTicketModalOpen(true)
  }

  // Handle Quick Order Creation
  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault()
    if (!orderCheck.allowed) {
      openLimitExceededModal('monthly_orders')
      return
    }
    const customer = customerList.find((c) => c.id === selectedCustomerId)
    if (!customer) {
      showNotification(tBilingual('Please select or add a customer first.', 'অনুগ্রহ করে প্রথমে একজন গ্রাহক নির্বাচন করুন।'))
      return
    }

    const orderNum = `ORD-${new Date().getFullYear()}-${String(orders.length + 1).padStart(4, '0')}`

    const newOrder: SalesOrderRecord = {
      id: `ord-${Date.now()}`,
      company_id: company?.id || 'default',
      order_number: orderNum,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_name_bn: customer.name_bn,
      customer_phone: customer.mobile,
      customer_address: customer.address,
      salesperson_name: 'Current Operator',
      order_date: new Date().toISOString().split('T')[0],
      delivery_date: deliveryDate,
      priority: orderPriority,
      workflow_routing: orderRouting as any,
      status: 'confirmed',
      payment_terms: 'cash',
      subtotal: 0,
      discount_amount: 0,
      vat_amount: 0,
      final_price: 0,
      advance_amount: 0,
      due_amount: 0,
      notes: orderNotes || 'Direct job intake from Orders & Job Flow.',
      items: [
        {
          id: `oi-${Date.now()}`,
          item_name: itemDesc || 'Custom Print Job',
          width: itemWidth || 0,
          height: itemHeight || 0,
          dimension_unit: 'ft',
          quantity: itemQty || 1,
          unit: 'sft',
          unit_price: 0,
          total_price: 0,
          material_spec: itemMaterial,
          finishing: itemFinishing,
        } as any,
      ],
      jobs_count: 1,
      commercial_status: 'invoice_required',
      production_gate_status: 'ready_for_production',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.createSalesOrderWithIntegrations(newOrder)
    refreshUsage()
    setIsNewOpen(false)
    setItemDesc('')
    setItemWidth(0)
    setItemHeight(0)
    setItemQty(1)
    setOrderNotes('')

    showNotification(
      tBilingual(
        `Order ${orderNum} booked & routed into Job Flow!`,
        `অর্ডার ${orderNum} তৈরি করা হয়েছে এবং জব ফ্লো-তে যুক্ত হয়েছে!`
      )
    )
  }

  const getPriorityBadge = (priority: OrderPriority) => {
    switch (priority) {
      case 'very_urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse whitespace-nowrap">
            <Flame className="h-3 w-3 text-rose-600 shrink-0" />
            <span>Very Urgent</span>
          </span>
        )
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 whitespace-nowrap">
            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
            <span>Urgent</span>
          </span>
        )
      case 'normal':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
            Normal
          </span>
        )
    }
  }

  const getStageLabel = (stage: UnifiedWorkItem['stage']) => {
    switch (stage) {
      case 'design_queue':
        return {
          en: '🎨 Design Queue',
          bn: '🎨 ডিজাইন কিউ',
          color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
        }
      case 'design_ok':
        return {
          en: '⚡ Design Checked',
          bn: '⚡ ডিজাইন চেক সম্পন্ন',
          color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
        }
      case 'in_production':
        return {
          en: '🖨️ In Production',
          bn: '🖨️ প্রোডাকশন চলছে',
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
        }
      case 'finishing':
        return {
          en: '✂️ Finishing & QA',
          bn: '✂️ ফিনিশিং ও কোয়ালিটি',
          color: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        }
      case 'ready_for_delivery':
        return {
          en: '🚚 Ready for Delivery',
          bn: '🚚 ডেলিভারির জন্য প্রস্তুত',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        }
      case 'completed':
        return {
          en: '✅ Completed',
          bn: '✅ সম্পন্ন',
          color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        }
      case 'queued':
      default:
        return {
          en: '⏳ Queued / Awaiting',
          bn: '⏳ অপেক্ষমান',
          color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        }
    }
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Orders & Job Flow"
        titleBn="অর্ডার ও জব ফ্লো"
        descriptionEn="Real-time visibility into all sales orders, work orders, and invoice-created jobs across design, printing, finishing, and delivery."
        descriptionBn="ডিজাইন, প্রিন্টিং, ফিনিশিং ও ডেলিভারির সমস্ত সেলস ও ইনভয়েস ভিত্তিক কাজের রিয়েল-টাইম ট্র্যাকিং।"
        icon={Briefcase}
        iconColor="text-indigo-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!orderCheck.allowed) {
                  openLimitExceededModal('monthly_orders')
                  return
                }
                setIsWorkOrderOpen(true)
              }}
              title={!orderCheck.allowed ? orderCheck.reason : undefined}
              className="text-xs font-semibold bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {tBilingual('Add Work Order', 'ওয়ার্ক অর্ডার')}
            </Button>
            {can('create', 'orders') && (
              <Button
                size="sm"
                onClick={() => {
                  if (!orderCheck.allowed) {
                    openLimitExceededModal('monthly_orders')
                    return
                  }
                  setIsNewOpen(true)
                }}
                title={!orderCheck.allowed ? orderCheck.reason : undefined}
                className="bg-indigo-600 hover:bg-indigo-700 text-xs text-white font-semibold bangla-text shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('New Order', 'নতুন অর্ডার')}
              </Button>
            )}
          </div>
        }
      />

      {/* Monthly Orders Quota Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              'p-1.5 rounded-lg text-white font-bold shrink-0',
              orderCheck.exceeded ? 'bg-red-500' : orderCheck.warning ? 'bg-amber-500' : 'bg-indigo-600'
            )}
          >
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {orderCheck.exceeded
                ? tBilingual(
                    `Plan Limit Reached: Your current plan allows up to ${currentPlan.monthly_orders.toLocaleString()} Monthly Orders quota (currently at ${usage.orders_this_month}). Please upgrade your subscription to continue.`,
                    `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${toBengaliDigits(currentPlan.monthly_orders)} মাসিক অর্ডার কোটা অনুমোদিত (বর্তমানে ${toBengaliDigits(usage.orders_this_month)})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`
                  )
                : tBilingual(
                    `Monthly Order Quota: ${usage.orders_this_month} of ${currentPlan.monthly_orders.toLocaleString()} orders booked this month`,
                    `মাসিক অর্ডার কোটা: এই মাসে ${toBengaliDigits(currentPlan.monthly_orders)} টির মধ্যে ${toBengaliDigits(usage.orders_this_month)} টি অর্ডার বুক করা হয়েছে`
                  )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bangla-text">
              {orderCheck.exceeded
                ? tBilingual('Monthly order quota reached. Upgrade to unlock more monthly job bookings.', 'চলতি মাসের অর্ডার কোটা পূর্ণ হয়েছে। নতুন অর্ডার বুক করতে প্ল্যান আপগ্রেড করুন।')
                : tBilingual(`Resets at the start of next calendar month (${currentPlan.name}).`, `পরবর্তী মাসের শুরুতে কোটা পুনরায় রিসেট হবে (${currentPlan.name_bn})।`)}
            </p>
          </div>
        </div>

        {currentPlan.code !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUpgradeModal('business')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 bangla-text shrink-0"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Unlimited Orders', 'আনলিমিটেড অর্ডার')}
          </Button>
        )}
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* OPERATIONAL JOB FLOW KPIS (Non-Monetary) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Works */}
        <Card
          onClick={() => setActiveStageTab('all')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-indigo-400',
            activeStageTab === 'all' && 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tBilingual('Total Works', 'মোট কাজ')}</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {counts.total}
          </div>
          <span className="text-[10px] text-slate-400">{tBilingual('All active jobs', 'সব সক্রিয় কাজ')}</span>
        </Card>

        {/* Design Queue */}
        <Card
          onClick={() => setActiveStageTab('design')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-purple-400 border-l-4 border-l-purple-500',
            activeStageTab === 'design' && 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">{tBilingual('Design Queue', 'ডিজাইন কিউ')}</span>
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1">
            {counts.design}
          </div>
          <span className="text-[10px] text-purple-600/80">{tBilingual('Artwork & Proofing', 'ডিজাইন ও প্রুফ')}</span>
        </Card>

        {/* In Production */}
        <Card
          onClick={() => setActiveStageTab('production')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-indigo-400 border-l-4 border-l-indigo-500',
            activeStageTab === 'production' && 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{tBilingual('In Production', 'প্রোডাকশনে')}</span>
            <Printer className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-indigo-700 dark:text-indigo-300 mt-1">
            {counts.production}
          </div>
          <span className="text-[10px] text-indigo-600/80">{tBilingual('Printing / Press', 'প্রিন্ট চলছে')}</span>
        </Card>

        {/* Finishing & QA */}
        <Card
          onClick={() => setActiveStageTab('finishing')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-amber-400 border-l-4 border-l-amber-500',
            activeStageTab === 'finishing' && 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{tBilingual('Finishing & QA', 'ফিনিশিং ও কিউএ')}</span>
            <Scissors className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-1">
            {counts.finishing}
          </div>
          <span className="text-[10px] text-amber-600/80">{tBilingual('Cutting & Fitting', 'কাটিং ও ফিটিং')}</span>
        </Card>

        {/* Ready for Delivery */}
        <Card
          onClick={() => setActiveStageTab('ready')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-emerald-400 border-l-4 border-l-emerald-500',
            activeStageTab === 'ready' && 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">{tBilingual('Ready for Delivery', 'ডেলিভারি প্রস্তুত')}</span>
            <Truck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {counts.ready}
          </div>
          <span className="text-[10px] text-emerald-600/80">{tBilingual('Pending dispatch', 'ডিসপ্যাচ বাকি')}</span>
        </Card>

        {/* Urgent Works */}
        <Card
          onClick={() => setActiveStageTab('urgent')}
          className={cn(
            'p-3.5 cursor-pointer transition-all hover:border-red-400 border-l-4 border-l-red-500',
            activeStageTab === 'urgent' && 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20'
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 dark:text-red-300">{tBilingual('Urgent / Priority', 'জরুরি কাজ')}</span>
            <Flame className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-700 dark:text-red-300 mt-1">
            {counts.urgent}
          </div>
          <span className="text-[10px] text-red-600/80">{tBilingual('Immediate action', 'তাৎক্ষণিক প্রয়োজন')}</span>
        </Card>
      </div>

      {/* FILTER TABS & SEARCH BAR */}
      <Card className="p-4 space-y-3">
        {/* Stage Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { id: 'all', labelEn: 'All Works', labelBn: 'সব কাজ', count: counts.total },
            { id: 'design', labelEn: '🎨 Design Queue', labelBn: '🎨 ডিজাইন কিউ', count: counts.design },
            { id: 'production', labelEn: '🖨️ In Production', labelBn: '🖨️ প্রোডাকশনে', count: counts.production },
            { id: 'finishing', labelEn: '✂️ Finishing', labelBn: '✂️ ফিনিশিং', count: counts.finishing },
            { id: 'ready', labelEn: '🚚 Ready for Delivery', labelBn: '🚚 ডেলিভারি প্রস্তুত', count: counts.ready },
            { id: 'completed', labelEn: '✅ Completed', labelBn: '✅ সম্পন্ন', count: counts.completed },
            { id: 'urgent', labelEn: '🔥 Urgent Only', labelBn: '🔥 শুধু জরুরি', count: counts.urgent },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveStageTab(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5',
                activeStageTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <span>{tBilingual(tab.labelEn, tab.labelBn)}</span>
              <span
                className={cn(
                  'px-1.5 py-0.2 rounded-full text-[10px]',
                  activeStageTab === tab.id
                    ? 'bg-indigo-800 text-indigo-100'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Secondary Filters */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder={tBilingual(
                'Search by order #, invoice #, customer name, mobile, item specs...',
                'অর্ডার #, ইনভয়েস #, গ্রাহক, ফোন বা কাজের বিবরণ দিয়ে খুঁজুন...'
              )}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Priority Filter */}
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">{tBilingual('All Priorities', 'সকল প্রায়োরিটি')}</option>
              <option value="normal">{tBilingual('Normal Priority', 'স্বাভাবিক')}</option>
              <option value="urgent">{tBilingual('Urgent', 'জরুরি')}</option>
              <option value="very_urgent">{tBilingual('Very Urgent (জরুরি)', 'খুব জরুরি')}</option>
            </select>

            {/* Workflow Routing Filter */}
            <select
              value={selectedRouting}
              onChange={(e) => setSelectedRouting(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">{tBilingual('All Routings', 'সব রাউটিং')}</option>
              <option value="design_required">🎨 Design Required</option>
              <option value="design_ok">⚡ Design OK</option>
              <option value="ready_production">🚀 Ready Production</option>
              <option value="ready_product">📦 Ready Product</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="deadline_asc">{tBilingual('Target Deadline (Earliest)', 'ডেলিভারি তারিখ অনুযায়ী')}</option>
              <option value="created_desc">{tBilingual('Newest Created First', 'নতুন তৈরি অনুযায়ী')}</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ORDERS & WORK DIRECTORY TABLE */}
      <Card className="overflow-hidden shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                {tBilingual('Orders & Job Flow Directory', 'অর্ডার ও জব ফ্লো ডিরেক্টরি')}
              </span>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold">
                {filteredWorks.length}
              </Badge>
            </CardTitle>
            <span className="text-xs text-slate-400">
              {tBilingual('Real-time operational floor tracking (0% pricing)', 'রিয়েল-টাইম ফ্লোর ট্র্যাকিং')}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto scrollbar-thin">
            <table className="w-full text-left text-sm min-w-[1050px]">
              <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 min-w-[170px]">{tBilingual('Order / Work #', 'অর্ডার ও রেফারেন্স')}</th>
                  <th className="py-3 px-4 min-w-[170px]">{tBilingual('Customer', 'গ্রাহক')}</th>
                  <th className="py-3 px-4 min-w-[220px]">{tBilingual('Work & Specifications', 'কাজের বিবরণ ও সাইজ')}</th>
                  <th className="py-3 px-4 min-w-[150px]">{tBilingual('Routing & Gate', 'রাউটিং ও গেট')}</th>
                  <th className="py-3 px-4 min-w-[160px]">{tBilingual('Current Stage', 'বর্তমান পর্যায়')}</th>
                  <th className="py-3 px-4 min-w-[135px]">{tBilingual('Target Delivery', 'ডেলিভারি ডেডলাইন')}</th>
                  <th className="py-3 px-4 min-w-[280px] text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">
                {filteredWorks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                      <Briefcase className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                      {tBilingual('No active orders or invoice-created works found matching filters.', 'ফিল্টার অনুযায়ী কোন অর্ডার বা ইনভয়েস কাজ পাওয়া যায়নি।')}
                    </td>
                  </tr>
                ) : (
                  filteredWorks.map((work) => {
                    const stageInfo = getStageLabel(work.stage)
                    const isOverdue = new Date(work.deliveryDate).getTime() < Date.now() && work.stage !== 'completed'

                    return (
                      <tr key={work.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Order / Work # & Origin */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/${slug}/orders/${work.id}`}
                                className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline flex items-center gap-1 group whitespace-nowrap"
                              >
                                <span>{work.orderNumber}</span>
                                <ExternalLink className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0" />
                              </Link>
                            </div>
                            
                            {/* Invoice origin reference */}
                            {work.invoiceNumber && (
                              <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 whitespace-nowrap">
                                <FileCheck className="h-3 w-3 shrink-0" />
                                <span>#{work.invoiceNumber}</span>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {getPriorityBadge(work.priority)}
                              <span className={cn(
                                'text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap',
                                work.origin === 'invoice_created'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                              )}>
                                {work.origin === 'invoice_created' ? 'Invoice Origin' : 'Sales Order'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                                {(work.customerName || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div className="font-semibold text-slate-900 dark:text-white text-xs leading-tight">
                                {work.customerName}
                              </div>
                            </div>
                            {work.customerPhone && (
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pl-9 whitespace-nowrap">
                                <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                                <span>{work.customerPhone}</span>
                              </div>
                            )}
                            {work.customerAddress && (
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[180px] pl-9" title={work.customerAddress}>
                                {work.customerAddress}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Works & Specifications */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="space-y-1.5">
                            {work.items && work.items.length > 0 ? (
                              <>
                                {work.items.slice(0, 2).map((it, idx) => (
                                  <div key={idx} className="text-xs space-y-0.5">
                                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                                      <span className="text-slate-400 font-mono text-[10px]">{idx + 1}.</span>
                                      <span>{it.itemName}</span>
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5 pl-3">
                                      {it.dimensions && (
                                        <span className="font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded text-[10px] border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                                          {it.dimensions}
                                        </span>
                                      )}
                                      <span className="font-medium whitespace-nowrap">
                                        Qty: <strong className="text-slate-800 dark:text-slate-200">{it.quantity} {it.unit}</strong>
                                      </span>
                                      {it.materialSpec && (
                                        <span className="text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                          • {it.materialSpec}
                                        </span>
                                      )}
                                      {it.finishing && (
                                        <span className="text-amber-700 dark:text-amber-400 text-[10px] font-medium whitespace-nowrap bg-amber-50 dark:bg-amber-950/40 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-800">
                                          {it.finishing}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {work.items.length > 2 && (
                                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block pl-3">
                                    + {work.items.length - 2} more items...
                                  </span>
                                )}
                              </>
                            ) : (
                              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 py-1">
                                <Tag className="h-3.5 w-3.5 text-slate-400" />
                                <span className="font-medium">Standard Print Work</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Routing & Commercial Gate */}
                        <td className="py-3.5 px-4 align-top">
                          <div className="flex flex-col gap-1.5 items-start">
                            {work.workflowRouting && (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap shadow-xs',
                                  work.workflowRouting === 'design_required'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                                    : work.workflowRouting === 'design_ok'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                                )}
                              >
                                <span>
                                  {work.workflowRouting === 'design_required'
                                    ? '🎨 Design Req'
                                    : work.workflowRouting === 'design_ok'
                                    ? '⚡ Design OK'
                                    : '🚀 Ready Prod'}
                                </span>
                              </span>
                            )}

                            <div>
                              {work.commercialStatus === 'invoice_created' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" /> Invoice OK
                                </span>
                              ) : work.commercialStatus === 'invoice_requested' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800 whitespace-nowrap">
                                  <Clock className="h-3 w-3 text-amber-600 shrink-0" /> Inv Requested
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800 whitespace-nowrap">
                                  <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" /> Inv Required
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Current Stage & Status */}
                        <td className="py-3.5 px-4 align-top">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border whitespace-nowrap shadow-xs',
                              stageInfo.color
                            )}
                          >
                            {tBilingual(stageInfo.en, stageInfo.bn)}
                          </span>
                        </td>

                        {/* Target Delivery */}
                        <td className="py-3.5 px-4 align-top text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono">{work.deliveryDate}</span>
                            </div>
                            {isOverdue && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 whitespace-nowrap">
                                ⚠️ Overdue
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 align-top text-right">
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            {/* Quick Stage Progression Dropdown */}
                            <select
                              value={work.stage}
                              onChange={(e) => handleUpdateStage(work, e.target.value as any)}
                              className="h-8 px-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer"
                              title="Update Work Stage"
                            >
                              <option value="queued">⏳ Queued</option>
                              <option value="design_queue">🎨 Design Queue</option>
                              <option value="in_production">🖨️ In Production</option>
                              <option value="finishing">✂️ Finishing & QA</option>
                              <option value="ready_for_delivery">🚚 Ready Delivery</option>
                              <option value="completed">✅ Completed</option>
                            </select>

                            {/* Job Ticket Print Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenTicket(work)}
                              className="h-8 px-2.5 text-xs font-semibold rounded-lg border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-xs flex items-center gap-1"
                              title="Print Technical Job Ticket"
                            >
                              <FileText className="h-3.5 w-3.5 text-slate-500" />
                              <span>Job Ticket</span>
                            </Button>

                            {/* Shop Floor Board Link */}
                            <Link
                              href={`/${slug}/orders/${work.id}`}
                              className="h-8 px-3 text-xs font-bold rounded-lg inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors whitespace-nowrap"
                            >
                              <span>Floor Board</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {filteredWorks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                {tBilingual('No active works found matching filters.', 'কোন কাজ পাওয়া যায়নি।')}
              </div>
            ) : (
              filteredWorks.map((work) => {
                const stageInfo = getStageLabel(work.stage)

                return (
                  <div key={work.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Header Row: Order Number & Priority */}
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/${slug}/orders/${work.id}`}
                        className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <span>{work.orderNumber}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                      </Link>
                      <div className="flex items-center gap-1.5">
                        {getPriorityBadge(work.priority)}
                        <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold border', stageInfo.color)}>
                          {tBilingual(stageInfo.en, stageInfo.bn)}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">{work.customerName}</div>
                        {work.customerPhone && (
                          <div className="font-mono text-slate-500">{work.customerPhone}</div>
                        )}
                      </div>
                      <div className="text-right">
                        {work.invoiceNumber && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 block">
                            Invoice #{work.invoiceNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Items Specs Block */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800 space-y-1">
                      {work.items && work.items.length > 0 ? (
                        work.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {it.itemName}
                            </span>
                            <span className="font-mono text-slate-500">
                              {it.dimensions || `${it.quantity} ${it.unit}`}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 italic">Standard Print Work</div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                        <span>Target: {work.deliveryDate}</span>
                        <span className="font-semibold">{work.items?.length || 1} Job Items</span>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenTicket(work)}
                        className="text-xs font-semibold h-8"
                      >
                        <FileText className="h-3.5 w-3.5 mr-1" />
                        Job Ticket
                      </Button>

                      <Link
                        href={`/${slug}/orders/${work.id}`}
                        className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white min-h-[32px]"
                      >
                        Shop Floor Board →
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL: PRINTABLE TECHNICAL JOB TICKET (Shop Floor Job Sheet - 0% Pricing) */}
      <ModalDialog
        open={isTicketModalOpen}
        onOpenChange={setIsTicketModalOpen}
        title="Production Job Ticket / ওয়ার্ক অর্ডার টিকেট"
        description="Technical shop floor specifications and operator workflow instructions."
        hideFooter
      >
        {selectedTicketJob && (
          <div className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1 print:p-0">
            {/* Header Box */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-900/60 dark:border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-slate-900 dark:text-white font-mono">
                    JOB TICKET: {selectedTicketJob.orderNumber}
                  </h3>
                  {selectedTicketJob.invoiceNumber && (
                    <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      Linked Invoice: #{selectedTicketJob.invoiceNumber}
                    </span>
                  )}
                </div>
                <div>
                  {getPriorityBadge(selectedTicketJob.priority)}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Customer</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedTicketJob.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Phone</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedTicketJob.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Order Date</span>
                  <span>{selectedTicketJob.orderDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Target Delivery</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTicketJob.deliveryDate}</span>
                </div>
              </div>
            </div>

            {/* Technical Works & Line Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                Production Job Specifications ({selectedTicketJob.items.length} Items)
              </h4>
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800/80 font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Item & Description</th>
                      <th className="p-2.5">Dimensions (W × H)</th>
                      <th className="p-2.5">Quantity</th>
                      <th className="p-2.5">Media / Material</th>
                      <th className="p-2.5">Finishing Requirement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {selectedTicketJob.items.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="p-2.5 font-bold text-slate-900 dark:text-white">
                          {idx + 1}. {it.itemName}
                        </td>
                        <td className="p-2.5 font-mono">
                          {it.dimensions || (it.width && it.height ? `${it.width} × ${it.height} ${it.dimensionUnit || 'ft'}` : 'Standard')}
                        </td>
                        <td className="p-2.5 font-bold">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-400">
                          {it.materialSpec || 'Standard Media'}
                        </td>
                        <td className="p-2.5 text-amber-700 dark:text-amber-400 font-semibold">
                          {it.finishing || 'None specified'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quality & Production Checklist */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
              <h5 className="text-[11px] font-bold uppercase text-slate-500">Shop Floor Production Checklist</h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-600" />
                  <span>Artwork Approved</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-600" />
                  <span>RIP & Print Done</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-600" />
                  <span>Finishing & Lamination</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="rounded text-indigo-600" />
                  <span>Final QA Passed</span>
                </label>
              </div>
            </div>

            {/* Operator Notes */}
            {selectedTicketJob.notes && (
              <div className="p-3 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/50 text-xs">
                <span className="font-bold text-amber-800 dark:text-amber-300 block mb-0.5">Special Instructions:</span>
                <p className="text-amber-900 dark:text-amber-200">{selectedTicketJob.notes}</p>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 font-mono">
                Operator Sign-off: ____________________
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsTicketModalOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (typeof window !== 'undefined') window.print()
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Job Sheet
                </Button>
              </div>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* MODAL: CREATE ORDER (Non-monetary shop floor intake) */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="New Order Intake"
        description="Record customer job specifications, dimensions, and dispatch to the shop floor flow."
        hideFooter
      >
        <form onSubmit={handleCreateOrder} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="soCust" required>Select Customer</Label>
              <button
                type="button"
                onClick={() => setIsCustomerModalOpen(true)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                + New Customer
              </button>
            </div>
            <select
              id="soCust"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              required
            >
              <option value="">-- Choose Customer Profile --</option>
              {customerList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile}) - {c.area || 'Dhaka'}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soPri" required>Priority Level</Label>
              <select
                id="soPri"
                value={orderPriority}
                onChange={(e) => setOrderPriority(e.target.value as OrderPriority)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
              >
                <option value="normal">Normal Priority</option>
                <option value="urgent">Urgent</option>
                <option value="very_urgent">Very Urgent (জরুরি)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soRouting" required>Workflow Routing</Label>
              <select
                id="soRouting"
                value={orderRouting}
                onChange={(e) => setOrderRouting(e.target.value)}
                className="w-full h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="ready_production">🚀 Direct to Production</option>
                <option value="design_required">🎨 Design Required</option>
                <option value="design_ok">⚡ Design Check (Customer File)</option>
                <option value="ready_product">📦 Ready Product (No Press)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soDelDate" required>Target Delivery Date</Label>
              <Input
                id="soDelDate"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="soItem" required>Item Name & Product Title</Label>
            <Input
              id="soItem"
              placeholder="e.g. Star Flex Billboard Banner, Vinyl Sticker, Acrylic Letter"
              value={itemDesc}
              onChange={(e) => setItemDesc(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soW">Width (ft)</Label>
              <Input
                id="soW"
                type="number"
                value={itemWidth || ''}
                onChange={(e) => setItemWidth(Number(e.target.value))}
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soH">Height (ft)</Label>
              <Input
                id="soH"
                type="number"
                value={itemHeight || ''}
                onChange={(e) => setItemHeight(Number(e.target.value))}
                placeholder="4"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soQty">Quantity</Label>
              <Input
                id="soQty"
                type="number"
                min={1}
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="soMat">Media / Material Spec</Label>
              <Input
                id="soMat"
                value={itemMaterial}
                onChange={(e) => setItemMaterial(e.target.value)}
                placeholder="Star Flex 280gsm, 3M Vinyl, 3mm Acrylic"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="soFin">Finishing Instructions</Label>
              <Input
                id="soFin"
                value={itemFinishing}
                onChange={(e) => setItemFinishing(e.target.value)}
                placeholder="Eyelets 4 corners, Gloss Lamination, Pipe Pocket"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="soNotes">Operator Notes & Job Instructions</Label>
            <Input
              id="soNotes"
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Machine bay preferences, packaging guidelines..."
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
            >
              Confirm & Dispatch to Shop Floor
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: NEW CUSTOMER */}
      <NewCustomerModal
        open={isCustomerModalOpen}
        onOpenChange={setIsCustomerModalOpen}
        onCustomerCreated={(newCust) => {
          setSelectedCustomerId(newCust.id)
          showNotification(`Selected customer: ${newCust.name}`)
        }}
        companyId={company?.id || 'c-01'}
      />

      {/* MODAL: WORK ORDER */}
      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        companyId={company?.id || 'c-01'}
        onSuccess={(order, sentToManager) => {
          showNotification(
            sentToManager
              ? tBilingual(
                  `Work Order #${order.order_number} saved & Invoice Request sent to Manager!`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সংরক্ষিত এবং ম্যানেজারের কাছে ইনভয়েস রিকোয়েস্ট পাঠানো হয়েছে!`
                )
              : tBilingual(
                  `Work Order #${order.order_number} saved successfully.`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সফলভাবে সংরক্ষিত হয়েছে।`
                )
          )
        }}
      />
    </div>
  )
}
