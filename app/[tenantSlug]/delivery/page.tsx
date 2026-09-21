'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  MapPin,
  Users,
  Wrench,
  Package,
  ExternalLink,
  ShieldCheck,
  Camera,
  Star,
  FileCheck2,
  Send,
  Sparkles,
  Layers,
  RefreshCw,
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
import { FeatureGate } from '@/components/shared/feature-gate'
import {
  DeliveryChallanRecord,
  InstallationRecord,
  DeliveryMethod,
  DeliveryStatus,
  InstallationStatus,
} from '@/types/logistics.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'
import {
  getChallansAction,
  getChallanByIdAction,
  createChallanAction,
  getInstallationsAction,
  updateChallanStatusAction,
} from '@/actions/logistics.actions'

export default function DeliveryLogisticsPage() {
  const params = useParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const routeSlug = (params?.tenantSlug as string) || ''
  const slug = routeSlug || company?.slug || company?.id || 'my-company'

  const [challans, setChallans] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
  const [installations, setInstallations] = useDataStore<InstallationRecord[]>(STORAGE_KEYS.INSTALLATIONS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [designJobs] = useDataStore<any[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [productionTasks] = useDataStore<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, [])
  const [viewMode, setViewMode] = useState<'challans' | 'installations' | 'calendar'>('challans')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Load authoritative logistics data from PostgreSQL / Supabase
  const loadLogisticsData = React.useCallback(async (isBackground = false) => {
    const targetCompanyId = routeSlug || company?.slug || company?.id || slug
    if (!targetCompanyId) return
    if (!isBackground && (!challans || challans.length === 0)) {
      setIsLoading(true)
    }
    try {
      const [challansRes, insRes] = await Promise.all([
        getChallansAction(targetCompanyId),
        getInstallationsAction(targetCompanyId),
      ])

      if (challansRes.success && Array.isArray(challansRes.data)) {
        setChallans(challansRes.data)
      }
      if (insRes.success && Array.isArray(insRes.data)) {
        setInstallations(insRes.data)
      }
    } catch (err) {
      console.error('Failed to load logistics data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [routeSlug, company?.id, company?.slug, slug, setChallans, setInstallations, challans?.length])

  React.useEffect(() => {
    loadLogisticsData(false)

    const handleRealtimeSync = () => {
      loadLogisticsData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:delivery_challans', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:installations', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:delivery_challans', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:installations', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [loadLogisticsData])

  // Modals
  const [isNewChallanOpen, setIsNewChallanOpen] = useState(false)
  const [isNewInstallationOpen, setIsNewInstallationOpen] = useState(false)
  const [selectedChallanForDelivery, setSelectedChallanForDelivery] = useState<DeliveryChallanRecord | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  // Delivery Confirmation State
  const [receiverName, setReceiverName] = useState('')
  const [receiverPhone, setReceiverPhone] = useState('')
  const [receiverSignature, setReceiverSignature] = useState('')

  // New Challan Form State
  const [chCustomer, setChCustomer] = useState('')
  const [chMethod, setChMethod] = useState<DeliveryMethod>('company_vehicle')
  const [chAddress, setChAddress] = useState('')
  const [chPerson, setChPerson] = useState('')
  const [chVehicle, setChVehicle] = useState('')
  const [chCost, setChCost] = useState<number>(0)
  const [chDate, setChDate] = useState(new Date().toISOString().split('T')[0])
  const [chDesc, setChDesc] = useState('')
  const [chQty, setChQty] = useState<number>(1)

  // New Installation Form State
  const [insCustomer, setInsCustomer] = useState('')
  const [insSite, setInsSite] = useState('')
  const [insLead, setInsLead] = useState('')
  const [insCrew, setInsCrew] = useState('')
  const [insEquipment, setInsEquipment] = useState('')
  const [insDate, setInsDate] = useState(new Date().toISOString().split('T')[0])
  const [insCost, setInsCost] = useState<number>(4500)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Dynamic Live Status Resolver per Item
  const getLiveItemStatus = (it: any, ch?: DeliveryChallanRecord | null): string => {
    if (it.is_delivered) return 'delivered'
    if (it.item_kind === 'ready_product' || it.workflow_routing === 'ready_product' || it.status === 'ready_for_delivery') {
      return 'ready_for_delivery'
    }

    if (ch) {
      const matchedTasks = productionTasks.filter(
        (t) =>
          t.company_id === ch.company_id &&
          (t.job_number === ch.invoice_number ||
            t.job_number === ch.order_number ||
            t.task_name?.toLowerCase().includes(it.product_description?.toLowerCase() || ''))
      )

      if (matchedTasks.length > 0) {
        const allCompleted = matchedTasks.every((t) => t.status === 'completed')
        if (allCompleted) return 'ready_for_delivery'

        const hasFinishing = matchedTasks.some((t) => t.task_type === 'finishing' || t.department === 'finishing')
        const printingTask = matchedTasks.find((t) => t.task_type === 'printing' || t.department === 'printing')
        if (printingTask && printingTask.status === 'completed' && hasFinishing) {
          return 'finishing_pending'
        }
        return 'in_production'
      }

      const matchedDsn = designJobs.find(
        (d) =>
          d.company_id === ch.company_id &&
          (d.invoice_id === ch.invoice_id ||
            d.invoice_number === ch.invoice_number ||
            (ch.sales_order_id && d.sales_order_id === ch.sales_order_id) ||
            d.title?.toLowerCase().includes(it.product_description?.toLowerCase() || ''))
      )

      if (matchedDsn) {
        if (matchedDsn.status === 'approved' || matchedDsn.workflow_routing === 'ready_production') {
          return 'printing_pending'
        }
        if (matchedDsn.workflow_routing === 'design_ok' || it.workflow_routing === 'design_ok') {
          return 'design_check'
        }
        return 'design_pending'
      }
    }

    return it.status || 'ready_for_delivery'
  }

  // Open Delivery Modal with intelligent item selection
  const openDeliveryModal = (ch: DeliveryChallanRecord) => {
    setSelectedChallanForDelivery(ch)
    const items = ch.items || []
    const readyIds = items
      .filter((it) => !it.is_delivered && (getLiveItemStatus(it, ch) === 'ready_for_delivery' || it.item_kind === 'ready_product'))
      .map((it) => it.id)

    setSelectedItemIds(readyIds)
    setReceiverName(ch.customer_name || '')
    setReceiverPhone(ch.customer_phone || '')
    setReceiverSignature('')
  }

  // Quick Action: Confirm Delivery (Full or Partial)
  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChallanForDelivery) return

    const items = selectedChallanForDelivery.items || []
    const now = new Date().toISOString()

    const updatedItems = items.map((it) => {
      if (selectedItemIds.includes(it.id)) {
        return {
          ...it,
          is_delivered: true,
          delivered_at: now,
          status: 'delivered' as const,
        }
      }
      return it
    })

    const remainingNonDelivered = updatedItems.filter((it) => !it.is_delivered)
    const isAllDelivered = remainingNonDelivered.length === 0
    const nextChallanStatus: DeliveryStatus = isAllDelivered ? 'delivered' : 'partially_delivered'

    PrintERPDataStore.updateItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, selectedChallanForDelivery.id, {
      status: nextChallanStatus,
      delivered_at: isAllDelivered ? now : (selectedChallanForDelivery.delivered_at || null),
      receiver_name: receiverName,
      receiver_phone: receiverPhone,
      receiver_signature: receiverSignature,
      items: updatedItems,
      updated_at: now,
    })

    // Update matching Sales Orders to delivered / partially_delivered
    try {
      const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
      const matchedOrder = orders.find(
        (o) =>
          (selectedChallanForDelivery.sales_order_id && o.id === selectedChallanForDelivery.sales_order_id) ||
          (selectedChallanForDelivery.order_number && o.order_number === selectedChallanForDelivery.order_number) ||
          (selectedChallanForDelivery.invoice_number && o.invoice_number === selectedChallanForDelivery.invoice_number)
      )
      if (matchedOrder) {
        PrintERPDataStore.updateItem<any>(STORAGE_KEYS.ORDERS, matchedOrder.id, {
          status: isAllDelivered ? 'delivered' : 'in_production',
          delivery_status: isAllDelivered ? 'delivered' : 'partially_delivered',
          delivered_at: isAllDelivered ? now : undefined,
          updated_at: now,
        })
      }

      // Update matching Invoices delivery_status
      const invoices = PrintERPDataStore.get<any[]>(STORAGE_KEYS.INVOICES) || []
      const matchedInv = invoices.find(
        (i) =>
          (selectedChallanForDelivery.invoice_id && i.id === selectedChallanForDelivery.invoice_id) ||
          (selectedChallanForDelivery.invoice_number && i.invoice_number === selectedChallanForDelivery.invoice_number) ||
          (selectedChallanForDelivery.order_number && i.order_number === selectedChallanForDelivery.order_number)
      )
      if (matchedInv) {
        PrintERPDataStore.updateItem<any>(STORAGE_KEYS.INVOICES, matchedInv.id, {
          delivery_status: isAllDelivered ? 'delivered' : 'partially_delivered',
          delivered_at: isAllDelivered ? now : undefined,
          updated_at: now,
        })
      }
    } catch {}

    try {
      await updateChallanStatusAction(selectedChallanForDelivery.id, nextChallanStatus, company?.id || company?.slug || slug, {
        delivered_at: isAllDelivered ? now : (selectedChallanForDelivery.delivered_at || null),
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_signature: receiverSignature,
        items: updatedItems,
      })
    } catch {}

    setSelectedChallanForDelivery(null)
    showNotification(
      isAllDelivered
        ? `Challan ${selectedChallanForDelivery.challan_number} (Invoice #${selectedChallanForDelivery.invoice_number || 'N/A'}) fully MARKED AS DELIVERED!`
        : `Partial Delivery confirmed for ${selectedChallanForDelivery.challan_number} (${selectedItemIds.length} item(s) delivered).`
    )
    loadLogisticsData()
  }

  // Quick Action: Mark Out for Delivery
  const handleMarkOutForDelivery = async (challanId: string) => {
    PrintERPDataStore.updateItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, challanId, {
      status: 'out_for_delivery',
      updated_at: new Date().toISOString(),
    })
    try {
      await updateChallanStatusAction(challanId, 'out_for_delivery', company?.id || company?.slug || slug)
    } catch {}
    showNotification('Consignment is now OUT FOR DELIVERY on vehicle.')
    loadLogisticsData()
  }

  // Quick Action: Create Challan
  const handleCreateChallan = async (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c: CustomerRecord) => c.id === chCustomer) || customers[0]
    const chNum = `CH-${Date.now().toString().slice(-4)}`
    const targetCompanyId = company?.id || company?.slug || slug || 'c-01'

    const newCh: DeliveryChallanRecord = {
      id: `ch-${Date.now()}`,
      company_id: targetCompanyId,
      challan_number: chNum,
      order_number: 'ORD-000001',
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      customer_phone: customer?.mobile || '',
      delivery_address: chAddress,
      delivery_method: chMethod,
      delivery_person_name: chPerson,
      vehicle_info: chVehicle,
      transport_cost: chCost,
      scheduled_date: chDate,
      status: 'scheduled',
      created_by_name: 'Logistics Officer',
      items: [
        {
          id: `ci-${Date.now()}`,
          product_description: chDesc,
          dimensions_spec: 'Custom Specs',
          quantity: chQty,
          unit: 'piece',
          remarks: 'Inspected for damage prior to transit',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DeliveryChallanRecord>(STORAGE_KEYS.DELIVERY_CHALLANS, newCh)
    try {
      await createChallanAction(newCh, targetCompanyId)
    } catch {}

    setIsNewChallanOpen(false)
    showNotification(`Delivery Challan ${chNum} issued.`)
    loadLogisticsData()
  }

  // Quick Action: Schedule Installation
  const handleCreateInstallation = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c: CustomerRecord) => c.id === insCustomer) || customers[0]
    const insNum = `INS-${Date.now().toString().slice(-4)}`

    const newIns: InstallationRecord = {
      id: `ins-${Date.now()}`,
      company_id: company?.id || 'c-01',
      installation_number: insNum,
      order_number: 'ORD-000001',
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      site_location: insSite,
      installer_lead_name: insLead,
      crew_members: insCrew.split(',').map((s) => s.trim()),
      installation_date: insDate,
      scheduled_time: '10:00 AM - 03:00 PM',
      status: 'scheduled',
      transport_cost: 1500,
      labor_cost: insCost,
      equipment_used: insEquipment,
      site_photos: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<InstallationRecord>(STORAGE_KEYS.INSTALLATIONS, newIns)
    setIsNewInstallationOpen(false)
    showNotification(`Installation job ${insNum} scheduled at ${insSite}.`)
  }

  // Tenant-scoped Challans & Installations
  const tenantChallans = React.useMemo(() => {
    if (!company?.id && !company?.slug && !routeSlug) return challans
    return challans.filter((ch: DeliveryChallanRecord) => {
      if (company?.id && ch.company_id === company.id) return true
      if (company?.slug && (ch.company_id === company.slug || (ch as any).tenant_slug === company.slug)) return true
      if (routeSlug && (ch.company_id === routeSlug || (ch as any).tenant_slug === routeSlug)) return true
      if (ch.company_id) {
        if (company?.id && ch.company_id.toLowerCase() === company.id.toLowerCase()) return true
        if (company?.slug && ch.company_id.toLowerCase() === company.slug.toLowerCase()) return true
        if (routeSlug && ch.company_id.toLowerCase() === routeSlug.toLowerCase()) return true
      }
      if (!ch.company_id || ch.company_id === 'c-01' || ch.company_id === 'default-company') return true
      return true
    })
  }, [challans, company, routeSlug])

  const tenantInstallations = React.useMemo(() => {
    if (!company?.id && !company?.slug && !routeSlug) return installations
    return installations.filter((ins: InstallationRecord) => {
      if (company?.id && ins.company_id === company.id) return true
      if (company?.slug && (ins.company_id === company.slug || (ins as any).tenant_slug === company.slug)) return true
      if (routeSlug && (ins.company_id === routeSlug || (ins as any).tenant_slug === routeSlug)) return true
      if (ins.company_id) {
        if (company?.id && ins.company_id.toLowerCase() === company.id.toLowerCase()) return true
        if (company?.slug && ins.company_id.toLowerCase() === company.slug.toLowerCase()) return true
        if (routeSlug && ins.company_id.toLowerCase() === routeSlug.toLowerCase()) return true
      }
      if (!ins.company_id || ins.company_id === 'c-01' || ins.company_id === 'default-company') return true
      return true
    })
  }, [installations, company, routeSlug])

  const filteredChallans = React.useMemo(() => {
    if (!search.trim()) return tenantChallans
    const q = search.toLowerCase()
    return tenantChallans.filter(
      (ch) =>
        ch.challan_number?.toLowerCase().includes(q) ||
        ch.invoice_number?.toLowerCase().includes(q) ||
        ch.order_number?.toLowerCase().includes(q) ||
        ch.customer_name?.toLowerCase().includes(q) ||
        ch.delivery_address?.toLowerCase().includes(q) ||
        ch.items?.some((i) => i.product_description?.toLowerCase().includes(q))
    )
  }, [tenantChallans, search])

  // Executive Metrics
  const countScheduledToday = tenantChallans.filter(
    (ch: DeliveryChallanRecord) => ch.scheduled_date === new Date().toISOString().split('T')[0]
  ).length
  const countOutForDelivery = tenantChallans.filter((ch: DeliveryChallanRecord) => ch.status === 'out_for_delivery').length
  const countActiveInstallations = tenantInstallations.filter(
    (ins: InstallationRecord) => ins.status === 'on_site' || ins.status === 'scheduled'
  ).length
  const countDelivered = tenantChallans.filter((ch: DeliveryChallanRecord) => ch.status === 'delivered').length

  const getMethodBadge = (method: DeliveryMethod) => {
    switch (method) {
      case 'company_vehicle':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            Company Vehicle
          </span>
        )
      case 'courier':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
            Courier Service
          </span>
        )
      case 'local_transport':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
            Local Hired Transport
          </span>
        )
      case 'customer_pickup':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
            Customer Self-Pickup
          </span>
        )
    }
  }

  const getDeliveryStatusBadge = (status: DeliveryStatus) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
          </span>
        )
      case 'partially_delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <Package className="h-3 w-3 text-amber-600" /> Partially Delivered
          </span>
        )
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 animate-pulse dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            <Truck className="h-3 w-3 text-blue-600" /> Out for Delivery
          </span>
        )
      case 'assigned':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
            Vehicle Assigned
          </span>
        )
      case 'pending_dispatch':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3 w-3 text-emerald-600" /> Ready to Dispatch
          </span>
        )
      case 'scheduled':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Scheduled
          </span>
        )
    }
  }

  const getItemStatusBadge = (status?: string) => {
    switch (status) {
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Delivered
          </span>
        )
      case 'ready_for_delivery':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Ready for Delivery
          </span>
        )
      case 'design_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="h-3 w-3 text-amber-600" /> Design Pending
          </span>
        )
      case 'design_check':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <FileCheck2 className="h-3 w-3 text-blue-600" /> Design Check (Pre-Press)
          </span>
        )
      case 'in_production':
      case 'printing_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300">
            <Wrench className="h-3 w-3 text-cyan-600" /> Printing Pending
          </span>
        )
      case 'finishing_pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300">
            <Layers className="h-3 w-3 text-purple-600" /> Finishing Pending
          </span>
        )
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status || 'Pending'}
          </span>
        )
    }
  }

  const getInstallationStatusBadge = (status: InstallationStatus) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Completed & Signed
          </span>
        )
      case 'on_site':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
            <Wrench className="h-3 w-3 text-purple-600" /> On Site Fitting
          </span>
        )
      case 'scheduled':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            Crew Scheduled
          </span>
        )
    }
  }

  return (
    <FeatureGate feature="delivery_challan">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
      <PageHeader
        titleEn="Delivery, Logistics & On-Site Installation"
        titleBn="ডেলিভারি চালান ও অন-সাইট ইনস্টলেশন"
        descriptionEn="Track multi-method dispatches, printable delivery challans, and on-site rigging crew installations."
        descriptionBn="মাল ডেলিভারি চালানপত্র, কুরিয়ার ট্র্যাকিং এবং সাইট ফিটিং ও সাইনেজ স্থাপন পরিচালনা করুন।"
        icon={Truck}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => loadLogisticsData()}
              disabled={isLoading}
              className="text-xs text-slate-700 dark:text-slate-300"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {tBilingual('Refresh', 'রিফ্রেশ')}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewInstallationOpen(true)}
              className="text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-800 bangla-text"
            >
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Schedule Installation', 'ইনস্টলেশন শিডিউল')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewChallanOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Delivery Challan', 'নতুন ডেলিভারি চালান')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Executive Logistics Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-600">
          <span className="text-xs font-semibold text-slate-500">Scheduled Today</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{countScheduledToday} Dispatches</div>
          <span className="text-[11px] text-slate-400">Loading at factory dock</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Out for Delivery (চলমান)</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{countOutForDelivery} Vans / Trucks</div>
          <span className="text-[11px] text-amber-600 font-medium">In transit to site</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">On-Site Installations</span>
          <div className="text-2xl font-black text-purple-600 mt-1">{countActiveInstallations} Sites</div>
          <span className="text-[11px] text-purple-600 font-medium">Rigging & electrical crews</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500">Successfully Delivered</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{countDelivered} Jobs</div>
          <span className="text-[11px] text-emerald-600 font-medium">Receiver signatures verified</span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant={viewMode === 'challans' ? 'default' : 'ghost'}
            onClick={() => setViewMode('challans')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'challans' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Truck className="h-3.5 w-3.5 mr-1.5" />
            Challan Deliveries (চালান সমূহ)
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'installations' ? 'default' : 'ghost'}
            onClick={() => setViewMode('installations')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'installations' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wrench className="h-3.5 w-3.5 mr-1.5" />
            On-Site Installations (ফিটিং)
          </Button>

          <Button
            size="sm"
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            onClick={() => setViewMode('calendar')}
            className={`text-xs h-8 px-3.5 ${
              viewMode === 'calendar' ? 'bg-slate-800 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            Dispatch Calendar (ক্যালেন্ডার)
          </Button>
        </div>

        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search by challan #, customer, or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: CHALLAN DELIVERIES TABLE
         ========================================================================= */}
      {viewMode === 'challans' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Delivery Challans & Dispatches ({filteredChallans.length})</CardTitle>
              <span className="text-xs text-slate-400">Transit slips with receiver verification</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Challan #</th>
                    <th className="py-3 px-4">Customer & Destination</th>
                    <th className="py-3 px-4">Delivery Method</th>
                    <th className="py-3 px-4">Vehicle / Consignment</th>
                    <th className="py-3 px-4">Scheduled Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredChallans.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                        {search ? tBilingual('No challans matching search criteria.', 'অনুসন্ধানের সাথে মিল রেখে কোন চালান পাওয়া যায়নি।') : tBilingual('No delivery challans found.', 'কোন ডেলিভারি চালান পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  ) : (
                    filteredChallans.map((ch: DeliveryChallanRecord) => {
                    const items = ch.items || []
                    const readyCount = items.filter((it) => !it.is_delivered && (getLiveItemStatus(it, ch) === 'ready_for_delivery' || it.item_kind === 'ready_product')).length
                    const pendingCount = items.filter((it) => !it.is_delivered && getLiveItemStatus(it, ch) !== 'ready_for_delivery').length
                    const deliveredCount = items.filter((it) => it.is_delivered).length

                    return (
                      <tr key={ch.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                        {/* Challan & Invoice ID */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/delivery/${ch.id}`}
                            className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 group"
                          >
                            <span>{ch.challan_number}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap font-mono">
                            <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                              {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                            </Badge>
                            {ch.order_number && (
                              <span className="text-[10px] text-slate-400">({ch.order_number})</span>
                            )}
                            {ch.due_amount !== undefined && ch.due_amount > 0 ? (
                              <Badge className="text-[9px] py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                                বকেয়া: {formatBDT(ch.due_amount)}
                              </Badge>
                            ) : ch.grand_total ? (
                              <Badge className="text-[9px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                                পরিশোধিত
                              </Badge>
                            ) : null}
                          </div>
                        </td>

                        {/* Customer & Destination + Products Breakdown */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white text-xs">
                            {ch.customer_name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[220px]">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{ch.delivery_address}</span>
                          </div>
                          {items.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-slate-400 font-medium">{items.length} Item(s):</span>
                              {readyCount > 0 && (
                                <Badge className="text-[9px] py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                                  {readyCount} Ready
                                </Badge>
                              )}
                              {pendingCount > 0 && (
                                <Badge className="text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                  {pendingCount} Pending
                                </Badge>
                              )}
                              {deliveredCount > 0 && (
                                <Badge className="text-[9px] py-0 px-1 bg-slate-100 text-slate-600 border-slate-200">
                                  {deliveredCount} Delivered
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Delivery Method */}
                        <td className="py-3.5 px-4">
                          {getMethodBadge(ch.delivery_method)}
                        </td>

                        {/* Vehicle */}
                        <td className="py-3.5 px-4 text-xs font-mono">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {ch.vehicle_info || 'Company Vehicle'}
                          </div>
                          <div className="text-[10px] text-slate-400">{ch.delivery_person_name}</div>
                        </td>

                        {/* Scheduled Date */}
                        <td className="py-3.5 px-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                          {ch.scheduled_date}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getDeliveryStatusBadge(ch.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <Link
                              href={`/delivery/${ch.id}`}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                            >
                              PDF
                            </Link>

                            <Button
                              size="sm"
                              onClick={() => openDeliveryModal(ch)}
                              className={`h-7 text-[11px] px-2.5 font-bold shadow-xs ${
                                ch.status === 'delivered'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                                  : ch.status === 'partially_delivered'
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                  : readyCount > 0
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                              }`}
                            >
                              {ch.status === 'delivered'
                                ? 'View Sign-off'
                                : ch.status === 'partially_delivered'
                                ? 'Fulfill Balance'
                                : 'Deliver / Dispatch'}
                            </Button>
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
              {filteredChallans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {search ? tBilingual('No challans matching search criteria.', 'অনুসন্ধানের সাথে মিল রেখে কোন চালান পাওয়া যায়নি।') : tBilingual('No delivery challans found.', 'কোন ডেলিভারি চালান পাওয়া যায়নি।')}
                </div>
              ) : (
                filteredChallans.map((ch: DeliveryChallanRecord) => {
                  const items = ch.items || []
                  const readyCount = items.filter((it) => !it.is_delivered && (getLiveItemStatus(it, ch) === 'ready_for_delivery' || it.item_kind === 'ready_product')).length
                  const pendingCount = items.filter((it) => !it.is_delivered && getLiveItemStatus(it, ch) !== 'ready_for_delivery').length
                  const deliveredCount = items.filter((it) => it.is_delivered).length

                  return (
                    <div key={ch.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      {/* Top: Challan # & Status */}
                      <div className="flex items-center justify-between gap-2">
                        <Link
                          href={`/delivery/${ch.id}`}
                          className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          <span>{ch.challan_number}</span>
                          <ExternalLink className="h-3.5 w-3.5 opacity-70" />
                        </Link>
                        {getDeliveryStatusBadge(ch.status)}
                      </div>

                      <div className="flex items-center gap-2 font-mono flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                          {ch.invoice_number || `INV-${ch.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                        </Badge>
                        {ch.order_number && (
                          <span className="text-[10px] text-slate-400">({ch.order_number})</span>
                        )}
                        {ch.due_amount !== undefined && ch.due_amount > 0 ? (
                          <Badge className="text-[9px] py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 font-bold">
                            বকেয়া: {formatBDT(ch.due_amount)}
                          </Badge>
                        ) : ch.grand_total ? (
                          <Badge className="text-[9px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold">
                            পরিশোধিত
                          </Badge>
                        ) : null}
                      </div>

                      {/* Customer & Address */}
                      <div>
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{ch.customer_name}</div>
                        <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                          <span>{ch.delivery_address}</span>
                        </div>
                        {items.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <span className="text-[10px] text-slate-400 font-medium">{items.length} Items:</span>
                            {readyCount > 0 && (
                              <Badge className="text-[9px] py-0 px-1 bg-emerald-50 text-emerald-700 border-emerald-200">
                                {readyCount} Ready
                              </Badge>
                            )}
                            {pendingCount > 0 && (
                              <Badge className="text-[9px] py-0 px-1 bg-amber-50 text-amber-700 border-amber-200">
                                {pendingCount} Pending
                              </Badge>
                            )}
                            {deliveredCount > 0 && (
                              <Badge className="text-[9px] py-0 px-1 bg-slate-100 text-slate-600 border-slate-200">
                                {deliveredCount} Delivered
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meta Grid */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Method</span>
                          <div className="mt-0.5">{getMethodBadge(ch.delivery_method)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Scheduled Date</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">{ch.scheduled_date}</span>
                        </div>
                        {ch.vehicle_info && (
                          <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                            Vehicle: <strong className="font-mono text-slate-800 dark:text-slate-200">{ch.vehicle_info}</strong>
                            {ch.delivery_person_name && <span> ({ch.delivery_person_name})</span>}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <Link
                          href={`/delivery/${ch.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 min-h-[36px]"
                        >
                          Challan PDF
                        </Link>

                        <Button
                          size="sm"
                          onClick={() => openDeliveryModal(ch)}
                          className={`h-9 text-xs px-3 font-bold ${
                            ch.status === 'delivered'
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200'
                              : ch.status === 'partially_delivered'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : readyCount > 0
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {ch.status === 'delivered'
                            ? 'View Sign-off'
                            : ch.status === 'partially_delivered'
                            ? 'Fulfill Balance'
                            : 'Deliver / Dispatch'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW 2: ON-SITE INSTALLATIONS TABLE
         ========================================================================= */}
      {viewMode === 'installations' && (
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">On-Site Signage Installations ({installations.length})</CardTitle>
              <span className="text-xs text-slate-400">Field rigging, crane hookups, and customer sign-offs</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Installation #</th>
                    <th className="py-3 px-4">Customer & Site Location</th>
                    <th className="py-3 px-4">Crew Lead & Riggers</th>
                    <th className="py-3 px-4">Scheduled Window</th>
                    <th className="py-3 px-4">Equipment Used</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Customer Confirmation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {installations.map((ins: InstallationRecord) => (
                    <tr key={ins.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                      {/* Installation # */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                          {ins.installation_number}
                        </span>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">{ins.order_number}</div>
                      </td>

                      {/* Customer & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white text-xs">
                          {ins.customer_name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate max-w-[200px]">
                          <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                          <span className="truncate">{ins.site_location}</span>
                        </div>
                      </td>

                      {/* Crew */}
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {ins.installer_lead_name}
                        </div>
                        <div className="text-[10px] text-slate-400">+{ins.crew_members.length} technicians</div>
                      </td>

                      {/* Scheduled Time */}
                      <td className="py-3.5 px-4 text-xs font-mono">
                        <div>{ins.installation_date}</div>
                        <div className="text-[10px] text-slate-400">{ins.scheduled_time}</div>
                      </td>

                      {/* Equipment */}
                      <td className="py-3.5 px-4 text-xs truncate max-w-[180px] text-slate-600 dark:text-slate-300">
                        {ins.equipment_used || 'Standard Hand Tools'}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {getInstallationStatusBadge(ins.status)}
                      </td>

                      {/* Confirmation */}
                      <td className="py-3.5 px-4 text-xs">
                        {ins.customer_confirmed_by ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200">
                              <Star className="h-3 w-3 fill-emerald-500 text-emerald-500" /> Sign-Off Verified
                            </span>
                            <div className="text-[10px] text-slate-500">{ins.customer_confirmed_by}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Pending site sign-off</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {installations.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {tBilingual('No installation jobs found.', 'কোন ইনস্টলেশন কাজ পাওয়া যায়নি।')}
                </div>
              ) : (
                installations.map((ins: InstallationRecord) => (
                  <div key={ins.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* Top: Installation # & Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-purple-600 dark:text-purple-400">
                        {ins.installation_number}
                      </span>
                      {getInstallationStatusBadge(ins.status)}
                    </div>

                    {/* Customer & Location */}
                    <div>
                      <div className="font-semibold text-sm text-slate-900 dark:text-white">{ins.customer_name}</div>
                      <div className="text-xs text-slate-500 flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                        <span>{ins.site_location}</span>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 text-xs border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Lead Tech</span>
                        <strong className="text-slate-800 dark:text-slate-200">{ins.installer_lead_name}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Date & Window</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">{ins.installation_date}</span>
                      </div>
                      {ins.equipment_used && (
                        <div className="col-span-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-800">
                          Gear: <span>{ins.equipment_used}</span>
                        </div>
                      )}
                    </div>

                    {/* Sign-off badge if present */}
                    {ins.customer_confirmed_by && (
                      <div className="flex items-center gap-1.5 p-2 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs border border-emerald-200">
                        <Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" />
                        <span>Signed off by: <strong>{ins.customer_confirmed_by}</strong></span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          VIEW 3: DELIVERY & INSTALLATION CALENDAR
         ========================================================================= */}
      {viewMode === 'calendar' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Logistics & Field Dispatch Agenda (চলতি সপ্তাহ)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Consolidated schedule view of outgoing delivery transit vans and on-site fitting jobs.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                <span className="h-2 w-2 rounded-full bg-blue-600" /> Delivery Runs
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200">
                <span className="h-2 w-2 rounded-full bg-purple-600" /> Site Installations
              </span>
            </div>
          </div>

          {/* Agenda Days */}
          <div className="space-y-4">
            {(() => {
              const dates = Array.from(
                new Set([
                  ...challans.map((ch: DeliveryChallanRecord) => ch.scheduled_date).filter(Boolean),
                  ...installations.map((ins: InstallationRecord) => ins.installation_date).filter(Boolean),
                ])
              ).sort()

              if (dates.length === 0) {
                return (
                  <div className="p-10 text-center text-slate-500 text-xs">
                    No scheduled deliveries or installations found in this period.
                  </div>
                )
              }

              return dates.map((dateStr) => {
                const dayChallans = challans.filter((ch: DeliveryChallanRecord) => ch.scheduled_date === dateStr)
                const dayInstallations = installations.filter((ins: InstallationRecord) => ins.installation_date === dateStr)

                return (
                  <div key={dateStr} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="font-black text-sm text-slate-900 dark:text-white">
                        📅 {dateStr}
                      </span>
                      <span className="text-slate-400">
                        {dayChallans.length} Deliveries • {dayInstallations.length} Installations
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Deliveries */}
                      {dayChallans.map((ch: DeliveryChallanRecord) => (
                        <div key={ch.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-blue-200 dark:border-blue-900 space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-blue-600 font-mono">{ch.challan_number}</span>
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800">
                              {ch.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{ch.customer_name}</div>
                          <div className="text-[11px] text-slate-500 truncate">{ch.delivery_address}</div>
                        </div>
                      ))}

                      {/* Installations */}
                      {dayInstallations.map((ins: InstallationRecord) => (
                        <div key={ins.id} className="p-3 rounded-lg bg-white dark:bg-slate-950 border border-purple-200 dark:border-purple-900 space-y-1 text-xs">
                          <div className="flex justify-between font-bold">
                            <span className="text-purple-600 font-mono">{ins.installation_number}</span>
                            <span className="capitalize text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-800">
                              {ins.status.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{ins.customer_name}</div>
                          <div className="text-[11px] text-slate-500 truncate">📍 {ins.site_location}</div>
                          <div className="text-[10px] text-slate-400 font-mono">Lead: {ins.installer_lead_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </Card>
      )}

      {/* MODAL: DELIVERY CONSIGNMENT HANDOVER & STATUS TRACKING */}
      <ModalDialog
        open={Boolean(selectedChallanForDelivery)}
        onOpenChange={(open) => !open && setSelectedChallanForDelivery(null)}
        size="2xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {tBilingual('Delivery & Consignment Handover', 'ডেলিভারি হ্যান্ডওভার ও প্রাপ্তিস্বীকার')}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  {selectedChallanForDelivery?.status === 'partially_delivered' ? 'Partial Fulfillment' : 'Consignment Proof'}
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tBilingual('Review line-item fulfillment statuses, select items to dispatch, and record sign-off.', 'আইটেমভিত্তিক ডেলিভারি স্ট্যাটাস পর্যালোচনা করুন এবং প্রাপ্তিস্বীকার সম্পন্ন করুন।')}
              </p>
            </div>
          </div>
        }
      >
        {selectedChallanForDelivery && (() => {
          const items = selectedChallanForDelivery.items || []
          const nonDeliveredItems = items.filter((it) => !it.is_delivered)
          const allItemsReady =
            nonDeliveredItems.length > 0 &&
            nonDeliveredItems.every((it) => getLiveItemStatus(it, selectedChallanForDelivery) === 'ready_for_delivery')
          const isAllSelected =
            nonDeliveredItems.length > 0 &&
            nonDeliveredItems.every((it) => selectedItemIds.includes(it.id))
          const isFullDelivery = (allItemsReady && isAllSelected) || (nonDeliveredItems.length === 0)

          return (
            <form onSubmit={handleConfirmDelivery} className="space-y-4 pt-1">
              {/* 1. Header: Invoice ID & Customer Information */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-800/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/60 dark:from-blue-950/40 dark:to-indigo-950/30 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-blue-200/60 dark:border-blue-800/50">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Invoice ID:</span>
                    <Badge className="font-mono font-black text-xs bg-blue-600 text-white px-2.5 py-0.5 shadow-xs">
                      {selectedChallanForDelivery.invoice_number || `INV-${selectedChallanForDelivery.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                    </Badge>
                    {selectedChallanForDelivery.order_number && (
                      <Badge variant="outline" className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                        Order: {selectedChallanForDelivery.order_number}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px] bg-white dark:bg-slate-900 font-bold">
                    Challan #{selectedChallanForDelivery.challan_number}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 block font-medium">Customer:</span>
                    <strong className="text-slate-900 dark:text-slate-100 text-xs">{selectedChallanForDelivery.customer_name}</strong>
                    <div className="text-slate-600 dark:text-slate-400 font-mono mt-0.5">📞 {selectedChallanForDelivery.customer_phone}</div>
                  </div>
                  <div>
                    <span className="text-slate-500 block font-medium">Destination & Dispatch:</span>
                    <div className="text-slate-700 dark:text-slate-300 line-clamp-2">📍 {selectedChallanForDelivery.delivery_address}</div>
                    <div className="text-slate-500 text-[10px] mt-0.5">
                      📅 Scheduled: <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{selectedChallanForDelivery.scheduled_date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial Due Alert Banner */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
                (selectedChallanForDelivery.due_amount || 0) > 0
                  ? 'bg-rose-50/90 border-rose-200 text-rose-900 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200'
                  : 'bg-emerald-50/90 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${
                    (selectedChallanForDelivery.due_amount || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`} />
                  <div>
                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {(selectedChallanForDelivery.due_amount || 0) > 0
                          ? '⚠️ বকেয়া বিল আদায় সতর্কবার্তা (Commercial Due Alert)'
                          : '✅ সম্পূর্ণ পরিশোধিত বিল (Fully Paid Invoice)'}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-85 mt-0.5">
                      {(selectedChallanForDelivery.due_amount || 0) > 0
                        ? `ডেলিভারি হস্তান্তরের পূর্বে অনুগ্রহ করে বকেয়া ${formatBDT(selectedChallanForDelivery.due_amount || 0)} আদায় নিশ্চিত করুন।`
                        : 'গ্রাহকের কোন বকেয়া নেই। পণ্য ডেলিভারি সম্পন্ন করতে পারেন।'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 font-mono">
                  <div className="text-[10px] text-slate-500">মোট: {formatBDT(selectedChallanForDelivery.grand_total || 0)}</div>
                  {(selectedChallanForDelivery.due_amount || 0) > 0 ? (
                    <div className="font-black text-rose-600 dark:text-rose-400 text-sm">
                      বকেয়া: {formatBDT(selectedChallanForDelivery.due_amount || 0)}
                    </div>
                  ) : (
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                      পরিশোধিত: {formatBDT(selectedChallanForDelivery.paid_amount || selectedChallanForDelivery.grand_total || 0)}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Itemized Products & Services with Status Badges */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    Invoice Products & Operational Status ({items.length})
                  </Label>
                  <span className="text-[10px] text-slate-500">
                    {nonDeliveredItems.length === 0
                      ? 'All items delivered'
                      : `${selectedItemIds.length} of ${nonDeliveredItems.length} selected for delivery`}
                  </span>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800 overflow-hidden">
                  {items.map((it, idx) => {
                    const liveStatus = getLiveItemStatus(it, selectedChallanForDelivery)
                    const isDelivered = it.is_delivered
                    const isSelected = selectedItemIds.includes(it.id)

                    return (
                      <div
                        key={it.id || idx}
                        onClick={() => {
                          if (isDelivered) return
                          if (isSelected) {
                            setSelectedItemIds(selectedItemIds.filter((id) => id !== it.id))
                          } else {
                            setSelectedItemIds([...selectedItemIds, it.id])
                          }
                        }}
                        className={`p-3 flex items-start justify-between gap-3 text-xs transition-colors cursor-pointer ${
                          isDelivered
                            ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-75 cursor-default'
                            : isSelected
                            ? 'bg-blue-50/40 dark:bg-blue-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isDelivered || isSelected}
                            disabled={isDelivered}
                            onChange={(e) => {
                              e.stopPropagation()
                              if (isDelivered) return
                              if (e.target.checked) {
                                setSelectedItemIds([...selectedItemIds, it.id])
                              } else {
                                setSelectedItemIds(selectedItemIds.filter((id) => id !== it.id))
                              }
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                              <span>Item {idx + 1}: {it.product_description}</span>
                              <span className="font-mono text-slate-500 text-[11px]">
                                - {it.quantity} {it.unit}
                              </span>
                              {it.item_kind === 'ready_product' ? (
                                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                                  📦 রেডি প্রোডাক্ট (ইন-স্টক)
                                </span>
                              ) : it.item_kind === 'outsource' ? (
                                <span className="text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.5 rounded border border-purple-300 dark:border-purple-800">
                                  🤝 আউটসোর্স
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  🎨 কাস্টম প্রিন্ট
                                </span>
                              )}
                            </div>
                            {it.dimensions_spec && (
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                📐 Specs: {it.dimensions_spec}
                              </div>
                            )}
                            {it.remarks && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Note: {it.remarks}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1.5">
                          {getItemStatusBadge(liveStatus)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. Receiver Information */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Receiver Full Name', 'গ্রহণকারীর নাম')} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="text-xs h-9"
                      placeholder="e.g. Md. Zahid Hassan"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Receiver Mobile Number', 'মোবাইল নম্বর')} <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      value={receiverPhone}
                      onChange={(e) => setReceiverPhone(e.target.value)}
                      className="text-xs h-9 font-mono"
                      placeholder="+8801700000000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Receiver Signature / Remarks', 'প্রাপ্তিস্বীকার বা মন্তব্য')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Received by client representative"
                    value={receiverSignature}
                    onChange={(e) => setReceiverSignature(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* 4. Action Footer: [Close] and Dynamic [Mark as delivered] vs [Partial Delivery] */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedChallanForDelivery(null)}
                  className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
                >
                  {tBilingual('Close', 'বন্ধ করুন')}
                </Button>

                {isFullDelivery ? (
                  <Button
                    type="submit"
                    disabled={selectedItemIds.length === 0}
                    className="w-full sm:w-auto min-h-[40px] text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm px-6 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {tBilingual('Mark as delivered', 'ডেলিভারি সম্পন্ন করুন')}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={selectedItemIds.length === 0}
                    className="w-full sm:w-auto min-h-[40px] text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-sm px-6 flex items-center gap-1.5"
                  >
                    <Truck className="h-4 w-4" />
                    {tBilingual(
                      `Partial Delivery (${selectedItemIds.length} Selected)`,
                      `আংশিক ডেলিভারি (${selectedItemIds.length}টি নির্বাচিত)`
                    )}
                  </Button>
                )}
              </div>
            </form>
          )
        })()}
      </ModalDialog>

      {/* MODAL: GENERATE DELIVERY CHALLAN */}
      <ModalDialog
        open={isNewChallanOpen}
        onOpenChange={setIsNewChallanOpen}
        size="3xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {tBilingual('Generate New Delivery Challan', 'নতুন ডেলিভারি চালানপত্র তৈরি করুন')}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  Logistics
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tBilingual('Dispatch printed products or signage structures to the customer site', 'গ্রাহকের ঠিকানায় পণ্য পরিবহনের চালানপত্র প্রস্তুত করুন')}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateChallan} className="space-y-4 pt-1">
          {/* Section 1: Customer & Method */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Customer & Transport Method', 'গ্রাহক ও পরিবহন মাধ্যম')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Customer', 'গ্রাহক')} <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={chCustomer}
                  onChange={(e) => {
                    setChCustomer(e.target.value)
                    const found = customers.find((c: CustomerRecord) => c.id === e.target.value)
                    if (found) setChAddress(found.address || '')
                  }}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((c: CustomerRecord) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Delivery Method', 'ডেলিভারি পদ্ধতি')} <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={chMethod}
                  onChange={(e) => setChMethod(e.target.value as DeliveryMethod)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                >
                  <option value="company_vehicle">Company Vehicle (Pickup/Van)</option>
                  <option value="courier">Courier (Sundarban / SA Paribahan)</option>
                  <option value="local_transport">Local Transport (CNG / Hired Truck)</option>
                  <option value="customer_pickup">Customer Self-Pickup</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Site Address', 'ডেলিভারি সাইটের ঠিকানা')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={chAddress}
                onChange={(e) => setChAddress(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Section 2: Vehicle & Transit Details */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Transit & Vehicle Info', 'যানবাহন ও চালকের তথ্য')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Vehicle No. / Consignment', 'গাড়ির নম্বর / ট্র্যাকিং নম্বর')}
                </Label>
                <Input
                  placeholder="e.g. Dhaka Metro-Tha 11-4829 or SBN-9948102"
                  value={chVehicle}
                  onChange={(e) => setChVehicle(e.target.value)}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Driver / Delivery Person', 'চালক / ডেলিভারিম্যান')}
                </Label>
                <Input
                  placeholder="e.g. Selim Mia (01711998877)"
                  value={chPerson}
                  onChange={(e) => setChPerson(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Goods & Dispatch Date */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Goods & Dispatch Schedule', 'পণ্যের বিবরণ ও তারিখ')}
              </h3>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Product Description', 'পণ্যের বিবরণ')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                value={chDesc}
                onChange={(e) => setChDesc(e.target.value)}
                placeholder="e.g. Panaflex Signboard Print (10ft x 4ft)"
                className="text-xs h-9"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Quantity', 'পরিমাণ')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={chQty || ''}
                  onChange={(e) => setChQty(Number(e.target.value))}
                  className="text-xs h-9 font-bold"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Transport Cost (৳ BDT)', 'পরিবহন খরচ (৳)')}
                </Label>
                <Input
                  type="number"
                  value={chCost || ''}
                  onChange={(e) => setChCost(Number(e.target.value))}
                  className="text-xs h-9 font-mono"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Scheduled Date', 'নির্ধারিত তারিখ')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={chDate}
                  onChange={(e) => setChDate(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewChallanOpen(false)}
              className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm px-5"
            >
              {tBilingual('Issue Delivery Challan', 'চালানপত্র জারি করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: SCHEDULE INSTALLATION */}
      <ModalDialog
        open={isNewInstallationOpen}
        onOpenChange={setIsNewInstallationOpen}
        size="3xl"
        title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 font-bold shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 dark:text-white">
                  {tBilingual('Schedule On-Site Signage Installation', 'সাইট ইনস্টলেশন শিডিউল করুন')}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono py-0.5 px-1.5 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                  Rigging & Setup
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {tBilingual('Deploy rigging technicians, cranes, and safety gear to the client installation site', 'সাইটে ফিটিংস টেকনিশিয়ান ও সরঞ্জাম প্রেরণ শিডিউল করুন')}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateInstallation} className="space-y-4 pt-1">
          {/* Section 1: Customer & Site */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Customer & Site Location', 'গ্রাহক ও সাইট লোকেশন')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Customer', 'গ্রাহক')} <span className="text-rose-500">*</span>
                </Label>
                <select
                  value={insCustomer}
                  onChange={(e) => setInsCustomer(e.target.value)}
                  className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-medium"
                  required
                >
                  <option value="">Select customer...</option>
                  {customers.map((c: CustomerRecord) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.customer_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Installation Date', 'ইনস্টলেশন তারিখ')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={insDate}
                  onChange={(e) => setInsDate(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Site Address & Mounting Location', 'সাইট ঠিকানা ও ফিটিংস লোকেশন')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 19 Dhanmondi R/A, Road 7 (Main Entrance Facade)"
                value={insSite}
                onChange={(e) => setInsSite(e.target.value)}
                className="text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Section 2: Rigging Crew & Safety Gear */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {tBilingual('Crew Team & Equipment', 'টেকনিশিয়ান টিম ও সরঞ্জাম')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Lead Technician', 'প্রধান টেকনিশিয়ান')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  value={insLead}
                  onChange={(e) => setInsLead(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Crew Members', 'অন্যান্য সদস্য')}
                </Label>
                <Input
                  placeholder="e.g. Jamal, Rafiq, Biplob"
                  value={insCrew}
                  onChange={(e) => setInsCrew(e.target.value)}
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Required Safety Gear & Rigging Equipment', 'প্রয়োজনীয় নিরাপত্তা সরঞ্জাম ও যন্ত্রপাতি')}
              </Label>
              <Input
                placeholder="e.g. Scaffolding, Safety Harness Belts, Heavy Power Drill, Crane"
                value={insEquipment}
                onChange={(e) => setInsEquipment(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewInstallationOpen(false)}
              className="w-full sm:w-auto min-h-[40px] text-xs font-semibold"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto min-h-[40px] text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm px-5"
            >
              {tBilingual('Dispatch Installation Team', 'টিম শিডিউল করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}
