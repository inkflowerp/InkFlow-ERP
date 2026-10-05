'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
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
 LayoutGrid,
 Scissors,
 Printer,
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
import { PageContainer } from '@/components/ui/page-container'
import { FeatureGate } from '@/components/shared/feature-gate'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { calculateLogisticsKpis } from '@/lib/logistics/kpis'
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

import { DeliveryKpiBar } from '@/components/delivery/delivery-kpi-bar'
import { DeliveryFilterToolbar } from '@/components/delivery/delivery-filter-toolbar'
import { DeliveryChallanTable } from '@/components/delivery/delivery-challan-table'
import { DeliveryInstallationTable } from '@/components/delivery/delivery-installation-table'

export default function DeliveryLogisticsPage() {
 const params = useParams()
 const pathname = usePathname()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const routeSlug = (params?.tenantSlug as string) || ''
 const slug = routeSlug || company?.slug || company?.id || 'my-company'

 const [mounted, setMounted] = useState(false)
 useEffect(() => {
 setMounted(true)
  }, [])

 const [challans, setChallans] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])
 const [installations, setInstallations] = useDataStore<InstallationRecord[]>(STORAGE_KEYS.INSTALLATIONS, [])
 const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
 const [designJobs] = useDataStore<any[]>(STORAGE_KEYS.DESIGN_JOBS, [])
 const [productionTasks] = useDataStore<any[]>(STORAGE_KEYS.PRODUCTION_TASKS, [])
 const [viewMode, setViewMode] = useState<'challans' | 'installations' | 'calendar'>('challans')
 const [selectedKpiFilter, setSelectedKpiFilter] = useState<string>('all')
 const [selectedMethod, setSelectedMethod] = useState<'all' | DeliveryMethod>('all')
 const [dueOnly, setDueOnly] = useState<boolean>(false)
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
 getChallansAction(targetCompanyId).catch(() => ({ success: false, data: [] })),
 getInstallationsAction(targetCompanyId).catch(() => ({ success: false, data: [] })),
      ])

 if (challansRes && challansRes.success && Array.isArray(challansRes.data)) {
 setChallans(challansRes.data)
      }
 if (insRes && insRes.success && Array.isArray(insRes.data)) {
 setInstallations(insRes.data)
      }
    } catch (err) {
 console.warn('Failed to load logistics data:', err)
    } finally {
 setIsLoading(false)
    }
  }, [routeSlug, company?.id, company?.slug, slug])

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

  // Update Installation Status
 const handleUpdateInstallationStatus = (installationId: string, status: InstallationStatus) => {
 PrintERPDataStore.updateItem<InstallationRecord>(STORAGE_KEYS.INSTALLATIONS, installationId, {
 status,
 updated_at: new Date().toISOString(),
    })
 showNotification(`Installation status updated to ${status.toUpperCase()}.`)
 loadLogisticsData(true)
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

  // KPIs
 const metrics = React.useMemo(() => {
 return calculateLogisticsKpis(tenantChallans, tenantInstallations)
  }, [tenantChallans, tenantInstallations])

  // Handle KPI Click Filter
 const handleKpiFilterSelect = (filter: string) => {
 if (filter === 'installations') {
 setViewMode('installations')
 setSelectedKpiFilter('all')
    } else {
 setSelectedKpiFilter(filter)
 if (viewMode !== 'challans') {
 setViewMode('challans')
      }
    }
  }

  // Filtered Challans
 const filteredChallans = React.useMemo(() => {
 const todayStr = new Date().toISOString().split('T')[0]
 return tenantChallans.filter((ch) => {
      // 1. Search Query
 if (search.trim()) {
 const q = search.toLowerCase()
 const matches =
 ch.challan_number?.toLowerCase().includes(q) ||
 ch.invoice_number?.toLowerCase().includes(q) ||
 ch.order_number?.toLowerCase().includes(q) ||
 ch.customer_name?.toLowerCase().includes(q) ||
 ch.customer_phone?.includes(q) ||
 ch.delivery_address?.toLowerCase().includes(q) ||
 ch.vehicle_info?.toLowerCase().includes(q) ||
 ch.delivery_person_name?.toLowerCase().includes(q) ||
 ch.items?.some((i) => i.product_description?.toLowerCase().includes(q))
 if (!matches) return false
      }

      // 2. Delivery Method
 if (selectedMethod !== 'all' && ch.delivery_method !== selectedMethod) {
 return false
      }

      // 3. Due Only Filter
 if (dueOnly && (!ch.due_amount || Number(ch.due_amount) <= 0)) {
 return false
      }

      // 4. Selected KPI Filter
 if (selectedKpiFilter === 'scheduled_today' && ch.scheduled_date !== todayStr) {
 return false
      }
 if (selectedKpiFilter === 'out_for_delivery' && ch.status !== 'out_for_delivery') {
 return false
      }
 if (selectedKpiFilter === 'partially_delivered' && ch.status !== 'partially_delivered') {
 return false
      }
 if (selectedKpiFilter === 'has_due' && (!ch.due_amount || Number(ch.due_amount) <= 0)) {
 return false
      }
 if (selectedKpiFilter === 'delivered' && ch.status !== 'delivered') {
 return false
      }

 return true
    })
  }, [tenantChallans, search, selectedMethod, dueOnly, selectedKpiFilter])

  // Filtered Installations
 const filteredInstallations = React.useMemo(() => {
 if (!search.trim()) return tenantInstallations
 const q = search.toLowerCase()
 return tenantInstallations.filter(
      (ins) =>
 ins.installation_number?.toLowerCase().includes(q) ||
 ins.customer_name?.toLowerCase().includes(q) ||
 ins.site_location?.toLowerCase().includes(q) ||
 ins.installer_lead_name?.toLowerCase().includes(q) ||
 ins.equipment_used?.toLowerCase().includes(q)
    )
  }, [tenantInstallations, search])

 const getItemStatusBadge = (status: string) => {
 switch (status) {
 case 'ready_for_delivery':
 return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-success bg-success-surface px-2 py-0.5 rounded border border-success-border bg-success-surface/60 text-success border-success-border">
            <CheckCircle2 className="h-3 w-3 text-success"/>
            {locale === 'bn' ? 'ডেলিভারি প্রস্তুত' : 'Ready for Dispatch'}
          </span>
        )
 case 'design_pending':
 return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-warning bg-warning-surface px-2 py-0.5 rounded border border-warning-border bg-warning-surface/60 text-warning border-warning-border">
            <Clock className="h-3 w-3 text-warning"/>
            {locale === 'bn' ? 'ডিজাইন পেন্ডিং' : 'Design Pending'}
          </span>
        )
 case 'design_check':
 return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary border-border">
            <Sparkles className="h-3 w-3 text-primary"/>
            {locale === 'bn' ? 'ডিজাইন ওকে' : 'Design OK'}
          </span>
        )
 case 'printing_pending':
 case 'in_production':
 return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary border-border">
            <Layers className="h-3 w-3 text-primary"/>
            {locale === 'bn' ? 'প্রিন্টিং চলছে' : 'Printing / Production'}
          </span>
        )
 case 'finishing_pending':
 return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 bg-primary/10 text-primary border-border">
            <Wrench className="h-3 w-3 text-primary"/>
            {locale === 'bn' ? 'ফিনিশিং চলছে' : 'Finishing Floor'}
          </span>
        )
 default:
 return (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-foreground bg-muted px-2 py-0.5 rounded border border-border">
            {status.replace(/_/g, ' ')}
          </span>
        )
    }
  }
  // Prioritized Attention Queue: Urgent dispatches, Overdue COD collections, Active Signage Rigging
  const attentionItems = React.useMemo(() => {
    const items: Array<{
      id: string
      type: 'gate_release' | 'cod_overdue' | 'active_rigging'
      titleEn: string
      titleBn: string
      subtitleEn: string
      subtitleBn: string
      badgeText: string
      badgeVariant: 'warning' | 'destructive' | 'primary'
      actionLabelEn: string
      actionLabelBn: string
      onAction: () => void
    }> = []

    const todayStr = new Date().toISOString().split('T')[0]

    // 1. Pending Gate Release / Vehicle Loading
    const pendingDispatches = tenantChallans.filter(
      (ch: DeliveryChallanRecord) => ch.status === 'scheduled' || (ch.status as string) === 'pending_dispatch'
    )
    pendingDispatches.slice(0, 3).forEach((ch: DeliveryChallanRecord) => {
      items.push({
        id: `gate-${ch.id}`,
        type: 'gate_release',
        titleEn: `Gate Release: ${ch.challan_number}`,
        titleBn: `গেট পাস ও গাড়ি রিলিজ: ${ch.challan_number}`,
        subtitleEn: `${ch.customer_name} • ${ch.delivery_address || 'Factory Pickup'} • ${ch.vehicle_info || 'Company Vehicle'}`,
        subtitleBn: `${ch.customer_name} • ${ch.delivery_address || 'ফ্যাক্টরি পিকআপ'} • ${ch.vehicle_info || 'কোম্পানি গাড়ি'}`,
        badgeText: ch.scheduled_date === todayStr ? 'TODAY' : 'READY',
        badgeVariant: 'warning',
        actionLabelEn: 'Release & Dispatch',
        actionLabelBn: 'গেট পাস ও রিলিজ',
        onAction: () => handleMarkOutForDelivery(ch.id),
      })
    })

    // 2. High COD Due Pending Handover
    const codChallans = tenantChallans.filter(
      (ch: DeliveryChallanRecord) => Number(ch.due_amount) > 0 && (ch.status === 'out_for_delivery' || ch.status === 'partially_delivered')
    )
    codChallans.slice(0, 3).forEach((ch: DeliveryChallanRecord) => {
      items.push({
        id: `cod-${ch.id}`,
        type: 'cod_overdue',
        titleEn: `Pending COD: ${formatBDT(Number(ch.due_amount))}`,
        titleBn: `বকেয়া সিওডি আদায়: ${formatBDT(Number(ch.due_amount))}`,
        subtitleEn: `${ch.challan_number} • ${ch.customer_name} • Collect cash before sign-off`,
        subtitleBn: `${ch.challan_number} • ${ch.customer_name} • মাল হস্তান্তরের পূর্বে আদায় নিশ্চিত করুন`,
        badgeText: 'COD DUE',
        badgeVariant: 'destructive',
        actionLabelEn: 'Collect & POD',
        actionLabelBn: 'আদায় ও সাইন-অফ',
        onAction: () => openDeliveryModal(ch),
      })
    })

    // 3. Active On-Site Rigging Installations
    const pendingInstallations = tenantInstallations.filter(
      (ins: InstallationRecord) => ins.status === 'scheduled' || ins.status === 'on_site'
    )
    pendingInstallations.slice(0, 2).forEach((ins: InstallationRecord) => {
      items.push({
        id: `rig-${ins.id}`,
        type: 'active_rigging',
        titleEn: `Rigging: ${ins.installation_number}`,
        titleBn: `সাইনেজ ইনস্টলেশন: ${ins.installation_number}`,
        subtitleEn: `${ins.customer_name} • ${ins.site_location || 'Customer Site'} • Crew: ${ins.installer_lead_name || 'Lead Officer'}`,
        subtitleBn: `${ins.customer_name} • ${ins.site_location || 'সাইট লোকেশন'} • লিড: ${ins.installer_lead_name || 'লিড অফিসার'}`,
        badgeText: ins.status === 'on_site' ? 'ON SITE' : 'SCHEDULED',
        badgeVariant: 'primary',
        actionLabelEn: ins.status === 'scheduled' ? 'Start On-Site' : 'Sign Off Rigging',
        actionLabelBn: ins.status === 'scheduled' ? 'অন-সাইট শুরু' : 'কাজ সম্পন্ন',
        onAction: () => handleUpdateInstallationStatus(ins.id, ins.status === 'scheduled' ? 'on_site' : 'completed'),
      })
    })

    return items
  }, [tenantChallans, tenantInstallations, handleMarkOutForDelivery, openDeliveryModal, handleUpdateInstallationStatus])


 if (!mounted) {
 return (
      <div className="space-y-6 pb-12 p-4 sm:p-6 animate-pulse">
        <div className="h-10 bg-muted rounded-xl w-1/3"/>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 sm:gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[72px] bg-muted rounded-xl"/>
          ))}
        </div>
        <div className="h-12 bg-muted rounded-xl"/>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-xl"/>
          ))}
        </div>
      </div>
    )
  }

 return (
    <PanelAccessGuard
 module="delivery"action="view"panelTitle="Delivery & Logistics"panelTitleBn="ডেলিভারি ও চালান">
      <FeatureGate feature="delivery_challan">
        <PageContainer className="space-y-6">
        {/* Header */}
        <PageHeader
 titleEn="Delivery & Fitting"titleBn="ডেলিভারি চালান ও অন-সাইট ইনস্টলেশন"descriptionEn="Track multi-method dispatches, printable delivery challans, and on-site rigging crew installations."descriptionBn="মাল ডেলিভারি চালানপত্র, কুরিয়ার ট্র্যাকিং এবং সাইট ফিটিং ও সাইনেজ স্থাপন পরিচালনা করুন।"icon={Truck}
 iconColor="text-primary"actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={getTenantNavHref('/production', pathname, slug)}>
                <Button variant="outline"size="sm"className="text-xs gap-1.5 border-border">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary"/>
                  <span className="hidden sm:inline bangla-text">{tBilingual('Production', 'প্রোডাকশন')}</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/finishing', pathname, slug)}>
                <Button variant="outline"size="sm"className="text-xs gap-1.5 border-border">
                  <Scissors className="h-3.5 w-3.5 text-primary"/>
                  <span className="hidden sm:inline bangla-text">{tBilingual('Finishing', 'ফিনিশিং')}</span>
                </Button>
              </Link>

              <Link href={getTenantNavHref('/operator', pathname, slug)}>
                <Button variant="outline"size="sm"className="text-xs gap-1.5 border-border">
                  <Printer className="h-3.5 w-3.5 text-primary"/>
                  <span className="hidden sm:inline bangla-text">{tBilingual('Terminal', 'টার্মিনাল')}</span>
                </Button>
              </Link>

              <Button
 size="sm"variant="outline"onClick={() => loadLogisticsData()}
 disabled={isLoading}
 className="h-9 w-9 p-0 flex items-center justify-center shrink-0 cursor-pointer text-foreground"title={tBilingual('Refresh', 'রিফ্রেশ')}
 aria-label={tBilingual('Refresh', 'রিফ্রেশ')}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
 size="sm"variant="outline"onClick={() => setIsNewInstallationOpen(true)}
 className="text-xs border-border text-foreground hover:bg-muted font-semibold bangla-text">
                <Wrench className="mr-1.5 h-3.5 w-3.5"/>
                {tBilingual('Schedule Installation', 'ইনস্টলেশন শিডিউল')}
              </Button>

              <Button
 size="sm"onClick={() => setIsNewChallanOpen(true)}
 className="bg-primary hover:bg-primary/90 text-xs text-primary-foreground bangla-text font-bold">
                <Plus className="mr-1.5 h-3.5 w-3.5"/>
                {tBilingual('New Delivery Challan', 'নতুন ডেলিভারি চালান')}
              </Button>
            </div>
          }
        />

        {/* Notification */}
        {notification && (
          <div className="p-3 bg-success-surface text-success rounded-lg text-xs font-semibold flex items-center gap-2 border border-success-border animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-success shrink-0"/>
            <span>{notification}</span>
          </div>
        )}

        {/* Executive Logistics & COD Metrics KPI Bar */}
        <DeliveryKpiBar
 metrics={metrics}
 selectedFilter={selectedKpiFilter}
 onSelectFilter={handleKpiFilterSelect}
        />

        {/* View Switcher, Search & Filters Toolbar */}

        {/* Prioritized Attention Queue */}
        <Card className="border-border shadow-xs bg-card">
          <CardHeader className="py-3 px-4 border-b border-border bg-muted/40">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span>{tBilingual('Needs Your Attention Now', 'জরুরি মনোযোগ প্রয়োজন')}</span>
                <Badge variant="outline" className="text-xs tabular-nums font-bold bg-warning-surface text-warning border-warning-border">
                  {attentionItems.length}
                </Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground hidden sm:inline bangla-text">
                {tBilingual('Immediate dock gate release, COD collections, and rigging handovers', 'তাৎক্ষণিক গেট পাস, বকেয়া আদায় ও সাইট ইনস্টলেশন')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {attentionItems.length === 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-success-surface/50 border border-success-border text-success">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold">{tBilingual('All Delivery & Fitting Operations Normal', 'সকল ডেলিভারি ও সাইট ইনস্টলেশন স্বাভাবিক আছে')}</p>
                  <p className="text-muted-foreground">{tBilingual('Zero consignments blocked at dock and zero overdue COD balances.', 'কোনো চালান গেটে আটকে নেই এবং বকেয়া আদায় নিয়মিত রয়েছে।')}</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {attentionItems.map((item: any) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-border bg-card flex flex-col justify-between gap-3 shadow-2xs hover:border-primary/40 transition-colors"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          variant="outline"
                          className={
                            item.badgeVariant === 'destructive'
                              ? 'bg-destructive/10 text-destructive border-destructive/20 text-xs font-bold'
                              : item.badgeVariant === 'warning'
                              ? 'bg-warning-surface text-warning border-warning-border text-xs font-bold'
                              : 'bg-primary/10 text-primary border-primary/20 text-xs font-bold'
                          }
                        >
                          {item.badgeText}
                        </Badge>
                      </div>
                      <h4 className="text-xs font-bold text-foreground leading-snug">
                        {tBilingual(item.titleEn, item.titleBn)}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {tBilingual(item.subtitleEn, item.subtitleBn)}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border flex items-center justify-end">
                      <Button
                        size="sm"
                        onClick={item.onAction}
                        className={
                          item.badgeVariant === 'destructive'
                            ? 'h-7 text-xs px-2.5 font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer shadow-xs'
                            : item.badgeVariant === 'warning'
                            ? 'h-7 text-xs px-2.5 font-bold bg-warning hover:bg-warning/90 text-warning-foreground cursor-pointer shadow-xs'
                            : 'h-7 text-xs px-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs'
                        }
                      >
                        {tBilingual(item.actionLabelEn, item.actionLabelBn)}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <DeliveryFilterToolbar
 viewMode={viewMode}
 onViewModeChange={setViewMode}
 selectedMethod={selectedMethod}
 onMethodChange={setSelectedMethod}
 search={search}
 onSearchChange={setSearch}
 dueOnly={dueOnly}
 onDueOnlyChange={setDueOnly}
 totalCount={viewMode === 'challans' ? filteredChallans.length : filteredInstallations.length}
        />

        {/* =========================================================================
 VIEW 1: CHALLAN DELIVERIES TABLE
           ========================================================================= */}
        {viewMode === 'challans' && (
          <Card className="border-border shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{tBilingual('Delivery Challans & Dispatches', 'ডেলিভারি চালান ও ট্রানজিট তালিকা')}</span>
                  <Badge variant="secondary"className="text-xs tabular-nums font-bold bg-primary/10 text-primary">
                    {filteredChallans.length}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground hidden sm:inline bangla-text">
                  {tBilingual('Transit slips with COD due balance & receiver verification', 'বকেয়া বিল আদায় সতর্কবার্তা ও গ্রহীতার স্বাক্ষর ট্র্যাকিং')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredChallans.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  <Truck className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
                  <p className="font-semibold text-muted-foreground">
                    {search ? tBilingual('No challans matching search criteria.', 'অনুসন্ধানের সাথে মিল রেখে কোন চালান পাওয়া যায়নি।') : tBilingual('No delivery challans found.', 'কোন ডেলিভারি চালান পাওয়া যায়নি।')}
                  </p>
                </div>
              ) : (
                <DeliveryChallanTable
 challans={filteredChallans}
 tenantSlug={slug}
 companyName={company?.name || 'PrintFlow Printing & Signage'}
 onOpenDeliveryModal={openDeliveryModal}
 onMarkOutForDelivery={handleMarkOutForDelivery}
 getLiveItemStatus={getLiveItemStatus}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
 VIEW 2: ON-SITE INSTALLATIONS TABLE
           ========================================================================= */}
        {viewMode === 'installations' && (
          <Card className="border-border shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-border bg-muted">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <span>{tBilingual('On-Site Signage Installations', 'অন-সাইট সাইনেজ ইনস্টলেশন')}</span>
                  <Badge variant="secondary"className="text-xs tabular-nums font-bold bg-primary/10 text-primary bg-primary/10 text-primary">
                    {filteredInstallations.length}
                  </Badge>
                </CardTitle>
                <span className="text-xs text-muted-foreground hidden sm:inline bangla-text">
                  {tBilingual('Field rigging, crane hookups, and customer sign-offs', 'মাঠ পর্যায়ের রিগিং, ক্রেন সংযোগ ও সাইট সাইন-অফ')}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInstallations.length === 0 ? (
                <div className="p-12 text-center text-xs text-muted-foreground">
                  <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-2"/>
                  <p className="font-semibold text-muted-foreground">
                    {search ? tBilingual('No installations matching search criteria.', 'কোন ইনস্টলেশন কাজ পাওয়া যায়নি।') : tBilingual('No on-site installations scheduled.', 'কোন অন-সাইট সাইনেজ কাজ শিডিউল করা নেই।')}
                  </p>
                </div>
              ) : (
                <DeliveryInstallationTable
 installations={filteredInstallations}
 onUpdateStatus={handleUpdateInstallationStatus}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* =========================================================================
 VIEW 3: DELIVERY & INSTALLATION CALENDAR
           ========================================================================= */}
        {viewMode === 'calendar' && (
          <Card className="p-6 space-y-4 border-border shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary"/>
                  {tBilingual('Logistics & Field Dispatch Agenda', 'লজিস্টিক ও ফিল্ড ডিসপ্যাচ ক্যালেন্ডার')}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 bangla-text">
                  {tBilingual('Consolidated schedule view of outgoing delivery transit vans and on-site fitting jobs.', 'চলতি সপ্তাহে আউটগোয়িং ডেলিভারি ভ্যান ও সাইট ফিটিং কাজের ক্যালেন্ডার।')}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 bg-primary/10 text-primary border-border">
                  <span className="h-2 w-2 rounded-full bg-primary"/> {tBilingual('Delivery Runs', 'ডেলিভারি ট্রানজিট')}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 bg-primary/10 text-primary border-border">
                  <span className="h-2 w-2 rounded-full bg-primary"/> {tBilingual('Site Installations', 'সাইনেজ ফিটিং')}
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
                    <div className="p-10 text-center text-muted-foreground text-xs">
                      {tBilingual('No scheduled deliveries or installations found in this period.', 'এই সময়ের মধ্যে কোন শিডিউল করা ডেলিভারি বা ফিটিং নেই।')}
                    </div>
                  )
                }

 return dates.map((dateStr) => {
 const dayChallans = challans.filter((ch: DeliveryChallanRecord) => ch.scheduled_date === dateStr)
 const dayInstallations = installations.filter((ins: InstallationRecord) => ins.installation_date === dateStr)

 return (
                    <div key={dateStr} className="p-4 rounded-xl border border-border bg-muted space-y-2.5">
                      <div className="flex items-center justify-between tabular-nums text-xs">
                        <span className="font-black text-sm text-foreground">
                          📅 {dateStr}
                        </span>
                        <span className="text-muted-foreground">
                          {dayChallans.length} {tBilingual('Deliveries', 'টি ডেলিভারি')} • {dayInstallations.length} {tBilingual('Installations', 'টি ইনস্টলেশন')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Deliveries */}
                        {dayChallans.map((ch: DeliveryChallanRecord) => (
                          <div key={ch.id} className="p-3 rounded-lg bg-card border border-primary/20 border-border space-y-1 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-primary tabular-nums">{ch.challan_number}</span>
                              <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary bg-primary/10 text-primary">
                                {ch.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="font-semibold text-foreground">{ch.customer_name}</div>
                            <div className="text-xs text-muted-foreground truncate">📍 {ch.delivery_address}</div>
                          </div>
                        ))}

                        {/* Installations */}
                        {dayInstallations.map((ins: InstallationRecord) => (
                          <div key={ins.id} className="p-3 rounded-lg bg-card border border-primary/20 border-border space-y-1 text-xs">
                            <div className="flex justify-between font-bold">
                              <span className="text-primary tabular-nums">{ins.installation_number}</span>
                              <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary bg-primary/10 text-primary">
                                {ins.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="font-semibold text-foreground">{ins.customer_name}</div>
                            <div className="text-xs text-muted-foreground truncate">📍 {ins.site_location}</div>
                            <div className="text-xs text-muted-foreground tabular-nums">Lead: {ins.installer_lead_name}</div>
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
 size="2xl"title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Truck className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground">
                  {tBilingual('Delivery & Consignment Handover', 'ডেলিভারি হ্যান্ডওভার ও প্রাপ্তিস্বীকার')}
                </span>
                <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 bg-primary/10 text-primary text-primary border-primary/20 border-border">
                  {selectedChallanForDelivery?.status === 'partially_delivered' ? 'Partial Fulfillment' : 'Consignment Proof'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
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
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-xs">
                <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-muted-foreground uppercase tracking-wider text-xs">Invoice ID:</span>
                    <Badge className="tabular-nums font-bold text-xs px-2.5 py-0.5 shadow-xs">
                      {selectedChallanForDelivery.invoice_number || `INV-${selectedChallanForDelivery.challan_number.replace('CHL-', '').replace('CH-', '')}`}
                    </Badge>
                    {selectedChallanForDelivery.order_number && (
                      <Badge variant="outline"className="tabular-nums text-xs">
 Order: {selectedChallanForDelivery.order_number}
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline"className="tabular-nums text-xs font-bold">
 Challan #{selectedChallanForDelivery.challan_number}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-muted-foreground block font-medium">Customer:</span>
                    <strong className="text-foreground text-xs">{selectedChallanForDelivery.customer_name}</strong>
                    <div className="text-muted-foreground tabular-nums mt-0.5">📞 {selectedChallanForDelivery.customer_phone}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground block font-medium">Destination & Dispatch:</span>
                    <div className="text-foreground line-clamp-2">📍 {selectedChallanForDelivery.delivery_address}</div>
                    <div className="text-muted-foreground text-xs mt-0.5">
                      📅 Scheduled: <span className="tabular-nums font-semibold text-foreground">{selectedChallanForDelivery.scheduled_date}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Commercial Due Alert Banner */}
              <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 shadow-xs ${
                (selectedChallanForDelivery.due_amount || 0) > 0
                  ? 'bg-danger-surface/90 border-danger-border text-destructive bg-danger-surface border-danger-border text-destructive'
                  : 'bg-success-surface/90 border-success-border text-success bg-success-surface border-success-border text-success'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${
                    (selectedChallanForDelivery.due_amount || 0) > 0 ? 'text-destructive' : 'text-success'
                  }`} />
                  <div>
                    <div className="font-bold flex items-center gap-1.5 flex-wrap">
                      <span>
                        {(selectedChallanForDelivery.due_amount || 0) > 0
                          ? '⚠️ বকেয়া বিল আদায় সতর্কবার্তা (Commercial Due Alert)'
                          : '✅ সম্পূর্ণ পরিশোধিত বিল (Fully Paid Invoice)'}
                      </span>
                    </div>
                    <p className="text-xs opacity-85 mt-0.5">
                      {(selectedChallanForDelivery.due_amount || 0) > 0
                        ? `ডেলিভারি হস্তান্তরের পূর্বে অনুগ্রহ করে বকেয়া ${formatBDT(selectedChallanForDelivery.due_amount || 0)} আদায় নিশ্চিত করুন।`
                        : 'গ্রাহকের কোন বকেয়া নেই। পণ্য ডেলিভারি সম্পন্ন করতে পারেন।'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className="text-xs text-muted-foreground">মোট: {formatBDT(selectedChallanForDelivery.grand_total || 0)}</div>
                  {(selectedChallanForDelivery.due_amount || 0) > 0 ? (
                    <div className="font-black text-destructive text-destructive text-sm">
                      বকেয়া: {formatBDT(selectedChallanForDelivery.due_amount || 0)}
                    </div>
                  ) : (
                    <div className="font-bold text-success text-success text-xs">
                      পরিশোধিত: {formatBDT(selectedChallanForDelivery.paid_amount || selectedChallanForDelivery.grand_total || 0)}
                    </div>
                  )}
                </div>
              </div>

              {/* 2. Itemized Products & Services with Status Badges */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-primary"/>
 Invoice Products & Operational Status ({items.length})
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {nonDeliveredItems.length === 0
                      ? 'All items delivered'
                      : `${selectedItemIds.length} of ${nonDeliveredItems.length} selected for delivery`}
                  </span>
                </div>

                <div className="divide-y divide-border border rounded-lg border-border overflow-hidden">
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
                            ? 'bg-muted opacity-75 cursor-default'
                            : isSelected
                            ? 'bg-primary/10/40 bg-primary/10'
                            : 'hover:bg-muted dark:hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 min-w-0">
                          <input
 type="checkbox"checked={isDelivered || isSelected}
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
 className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-ring"/>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                              <span>Item {idx + 1}: {it.product_description}</span>
                              <span className="tabular-nums text-muted-foreground text-xs">
                                - {it.quantity} {it.unit}
                              </span>
                              {it.item_kind === 'ready_product' ? (
                                <span className="text-xs font-bold bg-success-surface text-success bg-success-surface text-success px-1.5 py-0.5 rounded border border-success-border border-success-border">
                                  📦 রেডি প্রোডাক্ট (ইন-স্টক)
                                </span>
                              ) : it.item_kind === 'outsource' ? (
                                <span className="text-xs font-bold bg-primary/10 text-primary bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 border-border">
                                  🤝 আউটসোর্স
                                </span>
                              ) : (
                                <span className="text-xs font-bold bg-primary/10 text-primary bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 border-border">
                                  🎨 কাস্টম প্রিন্ট
                                </span>
                              )}
                            </div>
                            {it.dimensions_spec && (
                              <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                📐 Specs: {it.dimensions_spec}
                              </div>
                            )}
                            {it.remarks && (
                              <div className="text-xs text-muted-foreground mt-0.5">
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
              <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Receiver Full Name', 'গ্রহণকারীর নাম')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
 value={receiverName}
 onChange={(e) => setReceiverName(e.target.value)}
 className="text-xs h-9"placeholder="e.g. Md. Zahid Hassan"required
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-1 block">
                      {tBilingual('Receiver Mobile Number', 'মোবাইল নম্বর')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
 value={receiverPhone}
 onChange={(e) => setReceiverPhone(e.target.value)}
 className="text-xs h-9 tabular-nums"placeholder="+8801700000000"required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Receiver Signature / Remarks', 'প্রাপ্তিস্বীকার বা মন্তব্য')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
 placeholder="e.g. Received by client representative"value={receiverSignature}
 onChange={(e) => setReceiverSignature(e.target.value)}
 className="text-xs h-9"required
                  />
                </div>
              </div>

              {/* 4. Action Footer: [Close] and Dynamic [Mark as delivered] vs [Partial Delivery] */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
                <Button
 type="button"variant="outline"onClick={() => setSelectedChallanForDelivery(null)}
 className="w-full sm:w-auto min-h-[40px] text-xs font-semibold">
                  {tBilingual('Close', 'বন্ধ করুন')}
                </Button>

                {isFullDelivery ? (
                  <Button
 type="submit"disabled={selectedItemIds.length === 0}
 className="w-full sm:w-auto min-h-[40px] text-xs bg-success hover:bg-success text-white font-bold shadow-sm px-6 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4"/>
                    {tBilingual('Mark as delivered', 'ডেলিভারি সম্পন্ন করুন')}
                  </Button>
                ) : (
                  <Button
 type="submit"disabled={selectedItemIds.length === 0}
 className="w-full sm:w-auto min-h-[40px] text-xs bg-warning hover:bg-warning/90 text-white font-bold shadow-sm px-6 flex items-center gap-1.5">
                    <Truck className="h-4 w-4"/>
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
 size="3xl"title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Truck className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground">
                  {tBilingual('Generate New Delivery Challan', 'নতুন ডেলিভারি চালানপত্র তৈরি করুন')}
                </span>
                <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 bg-primary/10 text-primary text-primary border-primary/20 border-border">
 Logistics
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Dispatch printed products or signage structures to the customer site', 'গ্রাহকের ঠিকানায় পণ্য পরিবহনের চালানপত্র প্রস্তুত করুন')}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateChallan} className="space-y-4 pt-1">
          {/* Section 1: Customer & Method */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary bg-primary/60 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Customer & Transport Method', 'গ্রাহক ও পরিবহন মাধ্যম')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Customer', 'গ্রাহক')} <span className="text-destructive">*</span>
                </Label>
                <select
 value={chCustomer}
 onChange={(e) => {
 setChCustomer(e.target.value)
 const found = customers.find((c: CustomerRecord) => c.id === e.target.value)
 if (found) setChAddress(found.address || '')
                  }}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium"required
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
                  {tBilingual('Delivery Method', 'ডেলিভারি পদ্ধতি')} <span className="text-destructive">*</span>
                </Label>
                <select
 value={chMethod}
 onChange={(e) => setChMethod(e.target.value as DeliveryMethod)}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium">
                  <option value="company_vehicle">Company Vehicle (Pickup/Van)</option>
                  <option value="courier">Courier (Sundarban / SA Paribahan)</option>
                  <option value="local_transport">Local Transport (CNG / Hired Truck)</option>
                  <option value="customer_pickup">Customer Self-Pickup</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Delivery Site Address', 'ডেলিভারি সাইটের ঠিকানা')} <span className="text-destructive">*</span>
              </Label>
              <Input
 value={chAddress}
 onChange={(e) => setChAddress(e.target.value)}
 className="text-xs h-9"required
              />
            </div>
          </div>

          {/* Section 2: Vehicle & Transit Details */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary bg-primary/60 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Transit & Vehicle Info', 'যানবাহন ও চালকের তথ্য')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Vehicle No. / Consignment', 'গাড়ির নম্বর / ট্র্যাকিং নম্বর')}
                </Label>
                <Input
 placeholder="e.g. Dhaka Metro-Tha 11-4829 or SBN-9948102"value={chVehicle}
 onChange={(e) => setChVehicle(e.target.value)}
 className="text-xs h-9 tabular-nums"/>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Driver / Delivery Person', 'চালক / ডেলিভারিম্যান')}
                </Label>
                <Input
 placeholder="e.g. Selim Mia (01711998877)"value={chPerson}
 onChange={(e) => setChPerson(e.target.value)}
 className="text-xs h-9"/>
              </div>
            </div>
          </div>

          {/* Section 3: Goods & Dispatch Date */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary bg-primary/60 text-primary flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Goods & Dispatch Schedule', 'পণ্যের বিবরণ ও তারিখ')}
              </h3>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Product Description', 'পণ্যের বিবরণ')} <span className="text-destructive">*</span>
              </Label>
              <Input
 value={chDesc}
 onChange={(e) => setChDesc(e.target.value)}
 placeholder="e.g. Panaflex Signboard Print (10ft x 4ft)"className="text-xs h-9"required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Quantity', 'পরিমাণ')} <span className="text-destructive">*</span>
                </Label>
                <Input
 type="number"min="1"value={chQty || ''}
 onChange={(e) => setChQty(Number(e.target.value))}
 className="text-xs h-9 font-bold"required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Transport Cost', 'পরিবহন খরচ')}
                </Label>
                <Input
 type="number"value={chCost || ''}
 onChange={(e) => setChCost(Number(e.target.value))}
 className="text-xs h-9 tabular-nums"/>
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Scheduled Date', 'নির্ধারিত তারিখ')} <span className="text-destructive">*</span>
                </Label>
                <Input
 type="date"value={chDate}
 onChange={(e) => setChDate(e.target.value)}
 className="text-xs h-9"required
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
            <Button
 type="button"variant="outline"onClick={() => setIsNewChallanOpen(false)}
 className="w-full sm:w-auto min-h-[40px] text-xs font-semibold">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"className="w-full sm:w-auto min-h-[40px] text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm px-5">
              {tBilingual('Issue Delivery Challan', 'চালানপত্র জারি করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: SCHEDULE INSTALLATION */}
      <ModalDialog
 open={isNewInstallationOpen}
 onOpenChange={setIsNewInstallationOpen}
 size="3xl"title={
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary bg-primary/20 text-primary font-bold shrink-0">
              <Wrench className="h-5 w-5"/>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-foreground">
                  {tBilingual('Schedule On-Site Signage Installation', 'সাইট ইনস্টলেশন শিডিউল করুন')}
                </span>
                <Badge variant="outline"className="text-xs uppercase tabular-nums py-0.5 px-1.5 bg-primary/10 bg-primary/10 text-primary text-primary border-primary/20 border-border">
 Rigging & Setup
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {tBilingual('Deploy rigging technicians, cranes, and safety gear to the client installation site', 'সাইটে ফিটিংস টেকনিশিয়ান ও সরঞ্জাম প্রেরণ শিডিউল করুন')}
              </p>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateInstallation} className="space-y-4 pt-1">
          {/* Section 1: Customer & Site */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary bg-primary/60 text-primary flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Customer & Site Location', 'গ্রাহক ও সাইট লোকেশন')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Customer', 'গ্রাহক')} <span className="text-destructive">*</span>
                </Label>
                <select
 value={insCustomer}
 onChange={(e) => setInsCustomer(e.target.value)}
 className="w-full h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium"required
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
                  {tBilingual('Installation Date', 'ইনস্টলেশন তারিখ')} <span className="text-destructive">*</span>
                </Label>
                <Input
 type="date"value={insDate}
 onChange={(e) => setInsDate(e.target.value)}
 className="text-xs h-9"required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Site Address & Mounting Location', 'সাইট ঠিকানা ও ফিটিংস লোকেশন')} <span className="text-destructive">*</span>
              </Label>
              <Input
 placeholder="e.g. 19 Dhanmondi R/A, Road 7 (Main Entrance Facade)"value={insSite}
 onChange={(e) => setInsSite(e.target.value)}
 className="text-xs h-9"required
              />
            </div>
          </div>

          {/* Section 2: Rigging Crew & Safety Gear */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-primary/10 text-primary bg-primary/60 text-primary flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                {tBilingual('Crew Team & Equipment', 'টেকনিশিয়ান টিম ও সরঞ্জাম')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Lead Technician', 'প্রধান টেকনিশিয়ান')} <span className="text-destructive">*</span>
                </Label>
                <Input
 value={insLead}
 onChange={(e) => setInsLead(e.target.value)}
 className="text-xs h-9"required
                />
              </div>

              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Crew Members', 'অন্যান্য সদস্য')}
                </Label>
                <Input
 placeholder="e.g. Jamal, Rafiq, Biplob"value={insCrew}
 onChange={(e) => setInsCrew(e.target.value)}
 className="text-xs h-9"/>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Required Safety Gear & Rigging Equipment', 'প্রয়োজনীয় নিরাপত্তা সরঞ্জাম ও যন্ত্রপাতি')}
              </Label>
              <Input
 placeholder="e.g. Scaffolding, Safety Harness Belts, Heavy Power Drill, Crane"value={insEquipment}
 onChange={(e) => setInsEquipment(e.target.value)}
 className="text-xs h-9"/>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-border">
            <Button
 type="button"variant="outline"onClick={() => setIsNewInstallationOpen(false)}
 className="w-full sm:w-auto min-h-[40px] text-xs font-semibold">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
 type="submit"className="w-full sm:w-auto min-h-[40px] text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-sm px-5">
              {tBilingual('Dispatch Installation Team', 'টিম শিডিউল করুন')}
            </Button>
          </div>
        </form>
      </ModalDialog>
        </PageContainer>
      </FeatureGate>
    </PanelAccessGuard>
  )
}
