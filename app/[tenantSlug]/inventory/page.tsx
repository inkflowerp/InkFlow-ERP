'use client'

import React, { useState, useEffect, useMemo, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import {
  Package,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowDownUp,
  Layers,
  History,
  TrendingDown,
  DollarSign,
  Fuel,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Disc,
  MapPin,
  FileText,
  Send,
  Scissors,
  ArrowRightLeft,
  Check,
  X,
  SlidersHorizontal,
  RefreshCw,
  Building2,
  AlertOctagon,
  Boxes,
  ShoppingBag,
  Truck,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  Flame,
  Clock,
  User,
  Crown,
  Calendar,
  Eye,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  Trash2,
  Cpu,
  Printer,
  LayoutGrid,
} from 'lucide-react'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  InventoryRemnantRecord,
  StockLedgerRecord,
  InventorySummaryStats,
  InventoryRollRecord,
  InventoryTransactionType,
  FloorConsumptionRecord,
} from '@/types/inventory.types'
import type { PurchaseOrderRecord, GoodsReceivedNoteRecord } from '@/types/purchase.types'
import type { ProductRecord } from '@/types/product.types'
import type { MachineryRecord } from '@/types/machinery.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { isMaterialProduct, isReadyProduct, getMaterialWarehouseStockBreakdown, formatFloorPieceDisplay } from '@/lib/units'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  approveMaterialRequestAction,
  rejectMaterialRequestAction,
  updateRemnantStatusAction,
  getInventoryDashboardDataAction,
  mountRollToMachineAction,
  unmountRollFromMachineAction,
} from '@/actions/inventory.actions'
import { moveToTrashAction } from '@/actions/trash.actions'

// Modals
import { ReceiveStockModal } from '@/components/inventory/receive-stock-modal'
import { MaterialRequestModal } from '@/components/inventory/material-request-modal'
import { MaterialIssueModal } from '@/components/inventory/material-issue-modal'
import { LogConsumptionModal } from '@/components/inventory/log-consumption-modal'
import { StockTransferModal } from '@/components/inventory/stock-transfer-modal'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { NewLocationModal } from '@/components/inventory/new-location-modal'
import { NewPurchaseModal } from '@/components/purchases/new-purchase-modal'

// Upgraded UI Components
import { InventoryKpiBar } from '@/components/inventory/inventory-kpi-bar'
import { InventoryActionBar } from '@/components/inventory/inventory-action-bar'
import { InventoryTabsNavigation, InventoryViewTab } from '@/components/inventory/inventory-tabs-navigation'
import { PrintFloorConsumptionUnit } from '@/components/inventory/print-floor-consumption-unit'
import { IssueMasterRollModal } from '@/components/inventory/issue-master-roll-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PromptDialog } from '@/components/shared/prompt-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

function UnifiedInventoryContent() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
  const slug = company?.slug || 'my-company'
  const companyId = company?.id || 'default'

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // URL-addressable view tab
  const rawView = searchParams.get('view')
  const currentView: InventoryViewTab = useMemo(() => {
    if (rawView === 'ready_products' || rawView === 'products') return 'ready_products'
    if (rawView === 'floor_consumption' || rawView === 'floor' || rawView === 'consumption') return 'floor_consumption'
    if (rawView === 'rolls') return 'rolls'
    if (rawView === 'requests') return 'requests'
    if (rawView === 'remnants') return 'remnants'
    if (rawView === 'locations') return 'locations'
    if (rawView === 'purchases') return 'purchases'
    if (rawView === 'receiving') return 'receiving'
    if (rawView === 'ledger') return 'ledger'
    return 'materials'
  }, [rawView])

  const setViewTab = (tab: InventoryViewTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'materials') {
      params.delete('view')
    } else {
      params.set('view', tab)
    }
    const queryString = params.toString()
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }

  // Core Data States with Zero-Latency SWR Initial Cache Hydration
  const [materials, setMaterials] = useState<MaterialRecord[]>(() => {
    try {
      const mats = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS) || []
      const prods = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
      const matProds = prods.filter(isMaterialProduct)
      const seen = new Set(mats.map((m) => m.id))
      const combined = [...mats]
      for (const p of matProds) {
        if (!seen.has(p.id)) {
          seen.add(p.id)
          const isRoll = Boolean(p.roll_width_ft || (p as any).is_roll || (p.category && p.category.includes('roll')) || (p.material_config as any)?.material_type === 'roll' || p.purchase_unit === 'roll')
          const purchaseUnit = p.purchase_unit || (p.material_config as any)?.purchase_unit || (p.pricing_formula as any)?.material_config?.purchase_unit || (isRoll ? 'roll' : p.unit)

          combined.push({
            id: p.id,
            company_id: p.company_id || 'default',
            sku: p.sku || 'MAT',
            name: p.name,
            name_bn: p.name_bn || null,
            category: (p.category as any) || 'raw_materials',
            unit: (p.selling_unit || p.unit || 'pcs') as any,
            purchase_unit: purchaseUnit,
            master_purchase_unit: purchaseUnit,
            current_stock: Number(p.current_stock ?? (p as any).stock ?? 0),
            min_stock_level: Number((p as any).min_stock_level ?? 0),
            average_cost: Number(p.purchase_price ?? p.base_cost ?? 0),
            last_purchase_price: Number(p.purchase_price ?? p.base_cost ?? 0),
            cost_per_unit: Number(p.purchase_price ?? p.base_cost ?? 0),
            is_roll: isRoll,
            roll_width_ft: p.roll_width_ft ? Number(p.roll_width_ft) : null,
            roll_length_ft: p.roll_length_ft ? Number(p.roll_length_ft) : null,
            available_widths_ft: p.available_widths_ft || (p.material_config as any)?.available_widths_ft,
            standard_roll_length_ft: p.standard_roll_length_ft ? Number(p.standard_roll_length_ft) : ((p.material_config as any)?.standard_roll_length_ft ? Number((p.material_config as any).standard_roll_length_ft) : undefined),
            available_sheet_sizes: p.available_sheet_sizes || (p.material_config as any)?.available_sheet_sizes,
            roll_sizes: p.roll_sizes || (p.material_config as any)?.roll_sizes || (p.pricing_formula as any)?.roll_sizes,
            material_config: p.material_config || (p.pricing_formula as any)?.material_config || null,
            purchase_price_per_sft: (p.material_config as any)?.purchase_price_per_sft || (p.pricing_formula as any)?.purchase_price_per_sft || null,
            production_width_allowance: p.production_width_allowance || (p.material_config as any)?.extra_width_allowance_ft || 0,
            liquid_volume_capacity: (p as any).liquid_volume_capacity || (p.material_config as any)?.liquid_volume_ml ? `${(p.material_config as any).liquid_volume_ml}ml` : null,
            pack_quantity: (p as any).pack_quantity || (p.material_config as any)?.pack_quantity || null,
            variants: p.variants || [],
            is_active: p.is_active !== false,
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
          })
        }
      }
      return combined
    } catch {
      return []
    }
  })
  const [readyProducts, setReadyProducts] = useState<ProductRecord[]>(() => {
    try {
      const allProds = PrintERPDataStore.get<ProductRecord[]>(STORAGE_KEYS.PRODUCTS) || []
      return allProds.filter(
        (p) =>
          p.entity_type === 'product' ||
          p.is_ready_product ||
          (p.product_type as any) === 'product' ||
          p.product_type === 'PRODUCT' ||
          p.product_type === 'ready_product' ||
          p.commercial_type === 'ready_product' ||
          isReadyProduct(p)
      )
    } catch {
      return []
    }
  })
  const [locations, setLocations] = useState<InventoryLocationRecord[]>(() => {
    try {
      return PrintERPDataStore.get<InventoryLocationRecord[]>(STORAGE_KEYS.LOCATIONS) || []
    } catch {
      return []
    }
  })
  const [balances, setBalances] = useState<InventoryStockBalanceRecord[]>([])
  const [requests, setRequests] = useState<MaterialRequestRecord[]>([])
  const [issues, setIssues] = useState<MaterialIssueRecord[]>([])
  const [floorConsumptions, setFloorConsumptions] = useState<FloorConsumptionRecord[]>(() => {
    try {
      return PrintERPDataStore.get<FloorConsumptionRecord[]>(STORAGE_KEYS.FLOOR_CONSUMPTIONS) || []
    } catch {
      return []
    }
  })
  const [remnants, setRemnants] = useState<InventoryRemnantRecord[]>([])
  const [ledger, setLedger] = useState<StockLedgerRecord[]>([])
  const [rolls, setRolls] = useState<InventoryRollRecord[]>(() => {
    try {
      return PrintERPDataStore.get<InventoryRollRecord[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
    } catch {
      return []
    }
  })
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([])
  const [goodsReceivedNotes, setGoodsReceivedNotes] = useState<GoodsReceivedNoteRecord[]>([])
  const [summary, setSummary] = useState<InventorySummaryStats>({
    totalMaterials: 0,
    totalAvailableStockValue: 0,
    lowStockCount: 0,
    pendingRequestsCount: 0,
    totalRemnantsCount: 0,
    totalWastageRecordsCount: 0,
  })

  const [loading, setLoading] = useState(() => {
    try {
      const cached = PrintERPDataStore.get<MaterialRecord[]>(STORAGE_KEYS.MATERIALS)
      return !cached || cached.length === 0
    } catch {
      return true
    }
  })
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRollStatus, setSelectedRollStatus] = useState('all')
  const [selectedPoStatus, setSelectedPoStatus] = useState('all')
  const [selectedLedgerType, setSelectedLedgerType] = useState('all')
  const [notification, setNotification] = useState<string | null>(null)

  // Modals state
  const [isReceiveStockOpen, setIsReceiveStockOpen] = useState(false)
  const [isNewPurchaseOpen, setIsNewPurchaseOpen] = useState(false)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isIssueOpen, setIsIssueOpen] = useState(false)
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isNewLocationOpen, setIsNewLocationOpen] = useState(false)
  const [isIssueMasterRollOpen, setIsIssueMasterRollOpen] = useState(false)
  const [initialRollMaterialId, setInitialRollMaterialId] = useState<string>('')

  // Target items for contextual actions
  const [selectedMaterialForAction, setSelectedMaterialForAction] = useState<MaterialRecord | null>(null)
  const [selectedRollForAction, setSelectedRollForAction] = useState<InventoryRollRecord | null>(null)
  const [selectedFloorRecordForConsumption, setSelectedFloorRecordForConsumption] = useState<FloorConsumptionRecord | null>(null)
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrderRecord | null>(null)
  const [selectedRequestForIssue, setSelectedRequestForIssue] = useState<MaterialRequestRecord | null>(null)

  // Machinery fleet integration for physical rolls
  const [machines, setMachines] = useState<MachineryRecord[]>(() => {
    try {
      return PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
    } catch {
      return []
    }
  })
  const [rollToMount, setRollToMount] = useState<InventoryRollRecord | null>(null)
  const [selectedMachineForMount, setSelectedMachineForMount] = useState<string>('')
  const [isMountModalOpen, setIsMountModalOpen] = useState(false)
  const [isMounting, setIsMounting] = useState(false)

  // Trash & Reject confirmation states
  const [materialToTrash, setMaterialToTrash] = useState<MaterialRecord | null>(null)
  const [isTrashConfirmOpen, setIsTrashConfirmOpen] = useState(false)
  const [isTrashing, setIsTrashing] = useState(false)

  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null)
  const [isRejectPromptOpen, setIsRejectPromptOpen] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const showNotification = (msg: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setNotification(msg)
    dispatchToast({
      type,
      title: type === 'success' ? 'Success' : type === 'error' ? 'Error' : 'Notification',
      titleBn: type === 'success' ? 'সফল হয়েছে' : type === 'error' ? 'ত্রুটি' : 'বিজ্ঞপ্তি',
      message: msg,
    })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleMountRoll = async () => {
    if (!rollToMount || !selectedMachineForMount) return
    const targetMach = machines.find((m) => m.id === selectedMachineForMount)
    setIsMounting(true)
    try {
      const res = await mountRollToMachineAction(
        {
          roll_id: rollToMount.id,
          machine_id: selectedMachineForMount,
          machine_name: targetMach?.name || 'Press Machine',
        },
        companyId
      )
      if (res.success) {
        showNotification(`Mounted roll onto ${targetMach?.name || 'machine'} successfully!`)
        setIsMountModalOpen(false)
        setRollToMount(null)
        loadAllData(true)
      } else {
        showNotification(`Failed: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    } finally {
      setIsMounting(false)
    }
  }

  const handleUnmountRoll = async (roll: InventoryRollRecord) => {
    try {
      const res = await unmountRollFromMachineAction(
        {
          roll_id: roll.id,
          machine_id: roll.mounted_machine_id || undefined,
        },
        companyId
      )
      if (res.success) {
        showNotification('Unmounted roll successfully! It is now returned to warehouse stock.')
        loadAllData(true)
      } else {
        showNotification(`Failed: ${res.error}`)
      }
    } catch (err: any) {
      showNotification(`Error: ${err.message}`)
    }
  }

  const loadAllData = async (isBackground = false) => {
    if (!isBackground && materials.length === 0) {
      setLoading(true)
    }
    try {
      const res = await getInventoryDashboardDataAction(companyId)
      if (res.success && res.data) {
        setMaterials(res.data.materials || [])
        setLocations(res.data.locations || [])
        setBalances(res.data.balances || [])
        setRequests(res.data.requests || [])
        setIssues(res.data.issues || [])
        setFloorConsumptions(res.data.floorConsumptions || [])
        setRemnants(res.data.remnants || [])
        setLedger(res.data.ledger || [])
        setRolls(res.data.rolls || [])
        setOrders(res.data.orders || [])
        setGoodsReceivedNotes(res.data.goodsReceivedNotes || [])
        setReadyProducts(res.data.readyProducts || [])
        if (res.data.summary) {
          setSummary(res.data.summary)
        }
        try {
          if (res.data.materials) PrintERPDataStore.set(STORAGE_KEYS.MATERIALS, res.data.materials, false)
          if (res.data.rolls) PrintERPDataStore.set(STORAGE_KEYS.MOUNTED_ROLLS, res.data.rolls, false)
          if (res.data.locations) PrintERPDataStore.set(STORAGE_KEYS.LOCATIONS, res.data.locations, false)
          if (res.data.floorConsumptions) PrintERPDataStore.set(STORAGE_KEYS.FLOOR_CONSUMPTIONS, res.data.floorConsumptions, false)
          const mList = PrintERPDataStore.get<MachineryRecord[]>(STORAGE_KEYS.MACHINERIES) || []
          setMachines(mList)
        } catch {}
      }
    } catch (err: any) {
      console.error('Failed to load inventory data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData(false)

    const handleRealtimeSync = () => {
      loadAllData(true)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_table_synced:materials', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:products', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:inventory_rolls', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:stock_ledger', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:inventory_locations', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:material_requests', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:material_issues', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:floor_consumption', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:purchase_orders', handleRealtimeSync)
      window.addEventListener('printerp_table_synced:goods_received_notes', handleRealtimeSync)
      window.addEventListener('printerp_table_synced', handleRealtimeSync)
      window.addEventListener('printerp_data_sync', handleRealtimeSync)
      window.addEventListener('storage', handleRealtimeSync)

      return () => {
        window.removeEventListener('printerp_table_synced:materials', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:products', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:inventory_rolls', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:stock_ledger', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:inventory_locations', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:material_requests', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:material_issues', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:floor_consumption', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:purchase_orders', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced:goods_received_notes', handleRealtimeSync)
        window.removeEventListener('printerp_table_synced', handleRealtimeSync)
        window.removeEventListener('printerp_data_sync', handleRealtimeSync)
        window.removeEventListener('storage', handleRealtimeSync)
      }
    }
  }, [companyId])

  // Filtered Materials
  const filteredMaterials = useMemo(() => {
    return materials.filter((m) => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        m.name.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        (m.name_bn && m.name_bn.includes(q)) ||
        (m.brand && m.brand.toLowerCase().includes(q)) ||
        (m.specification && m.specification.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [materials, selectedCategory, search])

  // Filtered Ready Products
  const filteredReadyProducts = useMemo(() => {
    return readyProducts.filter((p) => {
      const isReady =
        p.entity_type === 'product' ||
        p.is_ready_product ||
        (p.product_type as any) === 'product' ||
        p.product_type === 'PRODUCT' ||
        p.product_type === 'ready_product' ||
        p.commercial_type === 'ready_product' ||
        isReadyProduct(p)
      if (!isReady) return false

      const q = search.trim().toLowerCase()
      return (
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.name_bn && p.name_bn.includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.dimensions_spec && p.dimensions_spec.toLowerCase().includes(q))
      )
    })
  }, [readyProducts, search])

  // Filtered Rolls
  const filteredRolls = useMemo(() => {
    return rolls.filter((r) => {
      const matchStatus = selectedRollStatus === 'all' || r.status === selectedRollStatus
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        (r.roll_code && r.roll_code.toLowerCase().includes(q)) ||
        (r.roll_tag && r.roll_tag.toLowerCase().includes(q)) ||
        (r.material?.name && r.material.name.toLowerCase().includes(q)) ||
        (r.location_name && r.location_name.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [rolls, selectedRollStatus, search])

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = search.trim().toLowerCase()
      return (
        !q ||
        r.request_number.toLowerCase().includes(q) ||
        (r.requested_by_name && r.requested_by_name.toLowerCase().includes(q)) ||
        (r.production_task?.title && r.production_task.title.toLowerCase().includes(q)) ||
        (r.production_task?.task_code && r.production_task.task_code.toLowerCase().includes(q)) ||
        (r.notes && r.notes.toLowerCase().includes(q))
      )
    })
  }, [requests, search])

  // Filtered Remnants
  const filteredRemnants = useMemo(() => {
    return remnants.filter((rem) => {
      const q = search.trim().toLowerCase()
      return (
        !q ||
        rem.remnant_code.toLowerCase().includes(q) ||
        (rem.parent_material?.name && rem.parent_material.name.toLowerCase().includes(q)) ||
        (rem.location?.location_name && rem.location.location_name.toLowerCase().includes(q)) ||
        (rem.notes && rem.notes.toLowerCase().includes(q))
      )
    })
  }, [remnants, search])

  // Filtered Locations
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const q = search.trim().toLowerCase()
      return (
        !q ||
        loc.location_name.toLowerCase().includes(q) ||
        loc.location_code.toLowerCase().includes(q) ||
        loc.location_type.toLowerCase().includes(q) ||
        (loc.description && loc.description.toLowerCase().includes(q))
      )
    })
  }, [locations, search])

  // Filtered Purchase Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      const matchStatus = selectedPoStatus === 'all' || po.status === selectedPoStatus
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        po.po_number.toLowerCase().includes(q) ||
        po.supplier_name.toLowerCase().includes(q) ||
        (po.notes && po.notes.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [orders, selectedPoStatus, search])

  // Filtered Ledger
  const filteredLedger = useMemo(() => {
    return ledger.filter((l) => {
      const matchType = selectedLedgerType === 'all' || l.transaction_type?.toLowerCase() === selectedLedgerType.toLowerCase()
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        (l.material?.name && l.material.name.toLowerCase().includes(q)) ||
        (l.material_name && l.material_name.toLowerCase().includes(q)) ||
        (l.reference_id && l.reference_id.toLowerCase().includes(q)) ||
        (l.performed_by_name && l.performed_by_name.toLowerCase().includes(q)) ||
        (l.notes && l.notes.toLowerCase().includes(q))
      return matchType && matchSearch
    })
  }, [ledger, selectedLedgerType, search])

  // Low stock materials count
  const lowStockMaterials = useMemo(() => {
    return materials.filter((m) => {
      const threshold = Number(m.reorder_level || m.min_stock_level || 0)
      return threshold > 0 && Number(m.current_stock || 0) <= threshold
    })
  }, [materials])

  // Out of stock materials count
  const outOfStockMaterials = useMemo(() => {
    return materials.filter((m) => Number(m.current_stock || 0) <= 0)
  }, [materials])

  // Pending Inward POs for Receiving
  const pendingInwardPOs = useMemo(() => {
    return orders.filter((po) => po.status === 'issued' || po.status === 'partially_received' || po.status === 'approved')
  }, [orders])

  // Pending Requests count
  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === 'requested').length
  }, [requests])

  // Handlers for Request Actions
  const handleApproveRequest = async (id: string) => {
    const res = await approveMaterialRequestAction(id, companyId)
    if (res.success) {
      showNotification('Material request approved.', 'success')
      loadAllData()
    } else {
      showNotification(`Failed: ${res.error}`, 'error')
    }
  }

  const handleRejectRequest = (id: string) => {
    setRejectRequestId(id)
    setIsRejectPromptOpen(true)
  }

  const confirmRejectRequest = async (reason: string) => {
    if (!rejectRequestId) return
    setIsRejecting(true)
    try {
      const res = await rejectMaterialRequestAction(rejectRequestId, reason || 'Rejected by inventory manager', companyId)
      if (res.success) {
        showNotification('Material request rejected.', 'info')
        setIsRejectPromptOpen(false)
        setRejectRequestId(null)
        loadAllData()
      } else {
        showNotification(`Failed: ${res.error}`, 'error')
      }
    } finally {
      setIsRejecting(false)
    }
  }

  const handleRemnantStatusChange = async (id: string, status: any) => {
    const res = await updateRemnantStatusAction(id, status, companyId)
    if (res.success) {
      showNotification(`Remnant marked as ${status}.`, 'info')
      loadAllData()
    }
  }

  const handleTrashMaterial = (mat: MaterialRecord) => {
    setMaterialToTrash(mat)
    setIsTrashConfirmOpen(true)
  }

  const confirmTrashMaterial = async () => {
    if (!materialToTrash) return
    setIsTrashing(true)
    try {
      const res = await moveToTrashAction('materials', materialToTrash, companyId)
      if (res.success) {
        showNotification(`Material "${materialToTrash.name}" moved to Trash.`, 'success')
        setIsTrashConfirmOpen(false)
        setMaterialToTrash(null)
        loadAllData()
      } else {
        showNotification(res.error || 'Failed to move material to trash.', 'error')
      }
    } catch (err: any) {
      showNotification(err.message || 'Error moving material to trash.', 'error')
    } finally {
      setIsTrashing(false)
    }
  }

  const getLedgerTxBadge = (type?: string) => {
    const t = (type || '').toLowerCase()
    if (t.includes('purchase') || t.includes('grn')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <ArrowDownLeft className="h-3 w-3" /> Purchase (GRN)
        </span>
      )
    }
    if (t.includes('consumption') || t.includes('issue')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <ArrowUpRight className="h-3 w-3" /> Production Issue
        </span>
      )
    }
    if (t.includes('adjustment')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          <RotateCcw className="h-3 w-3" /> Stock Audit Adjustment
        </span>
      )
    }
    if (t.includes('transfer')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          <ArrowRightLeft className="h-3 w-3" /> Inter-Store Transfer
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
        {type || 'General Transaction'}
      </span>
    )
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl pb-16 p-4 sm:p-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6 max-w-7xl pb-16">
        {/* ========================================================= */}
        {/* TOP LEVEL PAGE HEADER & FAST TRANSACTION SHORTCUTS */}
        {/* ========================================================= */}
        <PageHeader
          titleEn="Inventory & Warehouse Operations"
          titleBn="ইনভেন্টরি ও ওয়্যারহাউস কন্ট্রোল"
          descriptionEn="Real-time media rolls, raw stock valuation, store transfers, and live ledger accounting"
          descriptionBn="লাইভ রোল ম্যানেজমেন্ট, কাঁচামাল স্টক হিসাব, স্টোর ট্রান্সফার ও স্বয়ংক্রিয় খতিয়ান"
          icon={Package}
          iconColor="text-emerald-600"
          actions={
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setSelectedMaterialForAction(null)
                  setIsReceiveStockOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-9 shadow-xs font-bold cursor-pointer gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{isBn ? 'স্টক রিসিভ (GRN)' : 'Receive Stock'}</span>
              </Button>
            </div>
          }
        />

        {/* Notification Toast Alert */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-xs">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* INTERACTIVE KPI METRICS HUD COMMAND BAR */}
        {/* ========================================================= */}
        <InventoryKpiBar
          summary={summary}
          materials={materials}
          readyProducts={readyProducts}
          lowStockMaterials={lowStockMaterials}
          outOfStockMaterials={outOfStockMaterials}
          rolls={rolls}
          pendingInwardPOs={pendingInwardPOs}
          remnants={remnants}
          activeFilter={currentView}
          onFilterClick={(key) => {
            if (key === 'rolls' || key === 'receiving' || key === 'remnants') {
              setViewTab(key as any)
            } else if (key === 'low_stock' || key === 'out_of_stock' || key === 'all') {
              setViewTab('materials')
            }
          }}
        />

        {/* ========================================================= */}
        {/* OPERATIONS COMMAND BAR & CONNECTED DEPARTMENTS */}
        {/* ========================================================= */}
        <InventoryActionBar
          pathname={pathname}
          slug={slug}
          loading={loading}
          onReceiveStock={() => {
            setSelectedMaterialForAction(null)
            setIsReceiveStockOpen(true)
          }}
          onFloorIssue={() => {
            setSelectedMaterialForAction(null)
            setIsIssueOpen(true)
          }}
          onLogConsumption={() => {
            setSelectedFloorRecordForConsumption(null)
            setIsConsumptionOpen(true)
          }}
          onTransfer={() => setIsTransferOpen(true)}
          onAdjustment={() => setIsAdjustmentOpen(true)}
          onNewPurchase={() => setIsNewPurchaseOpen(true)}
          onRefresh={() => loadAllData()}
        />

        {/* ========================================================= */}
        {/* 10-TAB PRIMARY WORKSPACE NAVIGATION */}
        {/* ========================================================= */}
        <InventoryTabsNavigation
          currentView={currentView}
          onSelectTab={(tab) => setViewTab(tab)}
          materialsCount={materials.length}
          readyProductsCount={readyProducts.length}
          rollsCount={rolls.length}
          floorConsumptionsCount={floorConsumptions.length}
          activeFloorCount={floorConsumptions.filter((f) => f.status === 'on_floor' || f.status === 'partially_consumed').length}
          requestsCount={requests.length}
          pendingRequestsCount={pendingRequestsCount}
          remnantsCount={remnants.length}
          locationsCount={locations.length}
          ordersCount={orders.length}
          pendingInwardCount={pendingInwardPOs.length}
          ledgerCount={ledger.length}
        />

        {/* ========================================================= */}
        {/* VIEW 1: RAW MATERIALS & MEDIA SUBSTRATES TAB */}
        {/* ========================================================= */}
        {currentView === 'materials' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search raw material name, SKU, brand, specifications..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto scrollbar-thin">
                  {[
                    { id: 'all', label: 'All Substrates' },
                    { id: 'flex', label: 'Flex' },
                    { id: 'vinyl', label: 'Vinyl' },
                    { id: 'acrylic', label: 'Acrylic' },
                    { id: 'pvc', label: 'PVC Board' },
                    { id: 'ink', label: 'Inks' },
                    { id: 'lamination_film', label: 'Lamination' },
                  ].map((cat) => (
                    <Button
                      key={cat.id}
                      size="sm"
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0"
                    >
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Stock Items Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Material & SKU</th>
                      <th className="p-3">Category & Spec</th>
                      <th className="p-3 text-right">Available Stock</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Avg Unit Cost</th>
                      <th className="p-3 text-right">Total Valuation</th>
                      <th className="p-3">Reorder Point</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No raw materials match your search.</p>
                          <Button
                            size="sm"
                            onClick={() => setIsReceiveStockOpen(true)}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Receive Stock (GRN)
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredMaterials.map((mat) => {
                        const stockQty = Number(mat.current_stock || 0)
                        const reorder = Number(mat.reorder_level || mat.min_stock_level || 0)
                        const isLow = stockQty <= reorder && stockQty > 0
                        const isOut = stockQty <= 0
                        const avgCost = Number(mat.average_cost || mat.last_purchase_price || 0)
                        const breakdown = getMaterialWarehouseStockBreakdown(mat, rolls)

                        return (
                          <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3">
                              <Link
                                href={getTenantNavHref(`/inventory/${mat.id}`, pathname, slug)}
                                className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 flex items-center gap-1.5"
                              >
                                <span>{mat.name}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              {mat.name_bn && <div className="text-[11px] text-slate-400 font-bengali">{mat.name_bn}</div>}
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {mat.sku}</div>
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {mat.category?.replace('_', ' ')}
                              </span>
                              {mat.specification && (
                                <div className="text-[10px] text-slate-400 mt-0.5">{mat.specification}</div>
                              )}
                            </td>
                            <td className="p-3 text-right font-black font-mono text-sm text-slate-900 dark:text-white">
                              {breakdown.total_rolls > 0 ? (
                                <div>
                                  <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">{breakdown.purchase_unit_display}</span>
                                  <div className="text-[10px] font-medium text-slate-500 font-sans mt-0.5">
                                    {stockQty.toLocaleString()} {mat.unit}
                                  </div>
                                </div>
                              ) : (
                                <span>{stockQty.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className="text-slate-500 uppercase font-mono font-bold text-[11px] block">
                                {breakdown.total_rolls > 0 ? 'Rolls (Purchase Unit)' : mat.unit}
                              </span>
                              {breakdown.total_rolls > 0 && breakdown.formatted_summary && (
                                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium block whitespace-normal mt-0.5 font-sans">
                                  {breakdown.formatted_summary}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              <CurrencyDisplay amount={avgCost} />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              <CurrencyDisplay amount={stockQty * avgCost} />
                            </td>
                            <td className="p-3 font-mono text-xs text-slate-500">
                              {reorder > 0 ? `${reorder} ${mat.unit}` : '—'}
                            </td>
                            <td className="p-3">
                              {isOut ? (
                                <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                              ) : isLow ? (
                                <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300">Low Stock</Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">Available</Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(mat)
                                    setIsIssueOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-indigo-600 hover:bg-indigo-50"
                                >
                                  Issue
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(mat)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-emerald-600 hover:bg-emerald-50"
                                >
                                  Receive
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(mat)
                                    setIsAdjustmentOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-amber-600 hover:bg-amber-50"
                                >
                                  Adjust
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTrashMaterial(mat)}
                                  className="h-7 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                  title="Move to Trash"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW: PRINT FLOOR CONSUMPTION & SCRAP UNIT TAB */}
        {/* ========================================================= */}
        {currentView === 'floor_consumption' && (
          <div className="space-y-4">
            <Card className="border-amber-500/30 bg-amber-950/20 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Flame className="h-6 w-6 text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-amber-200">
                    {isBn ? 'প্রিন্ট ফ্লোর কনজাম্পশন স্থানান্তরিত হয়েছে' : 'Floor Consumption moved to Factory & Floor'}
                  </h4>
                  <p className="text-xs text-amber-300/80">
                    {isBn
                      ? 'এখন থেকে সাইডবারের "কারখানা ও প্রোডাকশন" (Factory & Floor) মেনুতে ডেডিকেটেড ফ্লোর কনজাম্পশন ওয়ার্কস্টেশন পাবেন।'
                      : 'You can now access the full dedicated Floor Consumption workstation directly from the "Factory & Floor" sidebar menu.'}
                  </p>
                </div>
              </div>
              <Link href={getTenantNavHref(slug, '/production/floor-consumption')}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white gap-2 font-medium shrink-0">
                  <span>{isBn ? 'ফ্লোর কনজাম্পশনে যান' : 'Go to Floor Consumption'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Card>

            <PrintFloorConsumptionUnit
              floorConsumptions={floorConsumptions}
              materials={materials}
              locations={locations}
              issues={issues}
              rolls={rolls}
              onOpenLogConsumption={(record) => {
                setSelectedFloorRecordForConsumption(record || null)
                setIsConsumptionOpen(true)
              }}
              onRefresh={() => loadAllData()}
              companyId={companyId}
            />
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: READY PRODUCTS STOCK TAB */}
        {/* ========================================================= */}
        {currentView === 'ready_products' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <Card className="p-3.5">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search ready products, display hardware, standees, POP displays..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </Card>

            {/* Ready Products Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Product Name & SKU</th>
                      <th className="p-3">Packaging & Specs</th>
                      <th className="p-3 text-right">Stock On Hand</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Unit Base Cost</th>
                      <th className="p-3 text-right">Selling Rate</th>
                      <th className="p-3 text-right">Total Valuation</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredReadyProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No ready products stock recorded.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Ready products like roll-up standees and POP hardware are managed here.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsReceiveStockOpen(true)}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Receive Stock (GRN)
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredReadyProducts.map((p) => {
                        const matchingMat = materials.find(
                          (m) => m.id === p.id || (p.sku && m.sku?.toLowerCase() === p.sku?.toLowerCase())
                        )
                        const locBalances = balances.filter(
                          (b) => b.material_id === p.id || (matchingMat && b.material_id === matchingMat.id)
                        )
                        const totalBalanceQty = locBalances.reduce((sum, b) => sum + (Number(b.available_quantity || (b as any).quantity) || 0), 0)

                        const stockQty = Number(
                          totalBalanceQty > 0
                            ? totalBalanceQty
                            : (p as any).current_stock !== undefined && (p as any).current_stock !== null && !isNaN(Number((p as any).current_stock))
                            ? (p as any).current_stock
                            : (p as any).opening_stock !== undefined && (p as any).opening_stock !== null && !isNaN(Number((p as any).opening_stock))
                            ? (p as any).opening_stock
                            : (p.pricing_formula as any)?.current_stock !== undefined && (p.pricing_formula as any)?.current_stock !== null && !isNaN(Number((p.pricing_formula as any).current_stock))
                            ? (p.pricing_formula as any).current_stock
                            : (p.pricing_formula as any)?.opening_stock !== undefined && (p.pricing_formula as any)?.opening_stock !== null && !isNaN(Number((p.pricing_formula as any).opening_stock))
                            ? (p.pricing_formula as any).opening_stock
                            : matchingMat?.current_stock !== undefined && matchingMat?.current_stock !== null && !isNaN(Number(matchingMat.current_stock))
                            ? matchingMat.current_stock
                            : (p as any).stock || 0
                        )
                        const cost = Number(
                          p.base_cost || p.purchase_price || matchingMat?.average_cost || matchingMat?.last_purchase_price || 0
                        )
                        const sellingRate = Number(p.selling_price || 0)
                        const totalValuation = stockQty * cost

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              <div>{p.name}</div>
                              {p.name_bn && <div className="text-[11px] text-slate-400 font-bengali font-normal">{p.name_bn}</div>}
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">SKU: {p.sku}</div>
                            </td>
                            <td className="p-3">
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {p.dimensions_spec || p.material_spec || 'Standard Spec'}
                              </span>
                              {p.min_order_quantity && (
                                <div className="text-[10px] text-slate-400 font-mono">MOQ: {p.min_order_quantity}</div>
                              )}
                            </td>
                            <td className="p-3 text-right font-black font-mono text-sm text-slate-900 dark:text-white">
                              {stockQty.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-500 uppercase font-mono font-bold text-[11px]">
                              {p.selling_unit || p.unit || 'pcs'}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              <CurrencyDisplay amount={cost} />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                              <CurrencyDisplay amount={sellingRate} />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              <CurrencyDisplay amount={totalValuation} />
                            </td>
                            <td className="p-3">
                              {stockQty <= 0 ? (
                                <Badge variant="destructive" className="text-[10px]">
                                  Out of Stock
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  In Stock
                                </Badge>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction({
                                      id: p.id,
                                      company_id: p.company_id,
                                      sku: p.sku,
                                      name: p.name,
                                      name_bn: p.name_bn || null,
                                      category: (p.category || 'ready_product') as any,
                                      unit: (p.selling_unit || p.unit || 'pcs') as any,
                                      current_stock: stockQty,
                                      average_cost: cost,
                                      last_purchase_price: cost,
                                      selling_price: sellingRate,
                                      is_active: p.is_active !== false,
                                      is_roll: false,
                                      min_stock_level: 0,
                                      created_at: p.created_at || new Date().toISOString(),
                                      updated_at: p.updated_at || new Date().toISOString(),
                                    } as unknown as MaterialRecord)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-emerald-600 hover:bg-emerald-50"
                                >
                                  Receive
                                </Button>
                                <Link href={getTenantNavHref(`/products/${p.id}`, pathname, slug)}>
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]">
                                    <Eye className="h-3.5 w-3.5 mr-1" />
                                    View
                                  </Button>
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
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 3: PHYSICAL ROLLS TRACKER TAB */}
        {/* ========================================================= */}
        {currentView === 'rolls' && (
          <div className="space-y-4">
            {/* Rolls Filter Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search roll code, material name, tag, location..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All Rolls' },
                    { id: 'available', label: 'Available' },
                    { id: 'mounted', label: 'Mounted / In Use' },
                    { id: 'depleted', label: 'Depleted' },
                  ].map((st) => (
                    <Button
                      key={st.id}
                      size="sm"
                      variant={selectedRollStatus === st.id ? 'default' : 'outline'}
                      onClick={() => setSelectedRollStatus(st.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0"
                    >
                      {st.label}
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    onClick={() => {
                      setInitialRollMaterialId('')
                      setIsIssueMasterRollOpen(true)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-8 px-3 cursor-pointer shrink-0 gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Issue Roll to Floor</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Rolls Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Roll ID / Code</th>
                      <th className="p-3">Material Name</th>
                      <th className="p-3 text-right">Nominal Width</th>
                      <th className="p-3 text-right">Remaining Length</th>
                      <th className="p-3 text-right">Current Area</th>
                      <th className="p-3">Location / Press</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRolls.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Disc className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No physical rolls registered yet.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Issue a master roll from warehouse stock or receive new roll media in GRN.
                          </p>
                          <div className="flex items-center justify-center gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => {
                                setInitialRollMaterialId('')
                                setIsIssueMasterRollOpen(true)
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Issue Roll to Floor
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setIsReceiveStockOpen(true)}
                              className="text-xs"
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Receive Roll via GRN
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredRolls.map((roll) => {
                        const currentLen = Number(roll.current_length_ft ?? roll.remaining_area_sft / (roll.width_ft || 1))
                        const area = Number(roll.remaining_area_sft || currentLen * roll.width_ft)

                        return (
                          <tr key={roll.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                              {roll.roll_code || roll.roll_tag || roll.id.slice(0, 8)}
                            </td>
                            <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                              {roll.material?.name || 'Roll Media'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {roll.width_ft} ft
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              <div>{currentLen.toFixed(2)} ft <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-sans">— 1 Pcs</span></div>
                              <div className="text-[10px] text-slate-400 font-normal">Initial: {roll.initial_length_ft} ft</div>
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-black">
                              {area.toFixed(1)} SFT
                            </td>
                            <td className="p-3">
                              {roll.mounted_machine_name || roll.mounted_press_name ? (
                                <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  <Cpu className="h-3 w-3 text-blue-600" />
                                  {roll.mounted_machine_name || roll.mounted_press_name}
                                </span>
                              ) : (
                                <span className="text-slate-600 dark:text-slate-400">
                                  {roll.location_name || 'Main Warehouse'}
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  'capitalize px-2 py-0.5 rounded text-[10px] font-bold border',
                                  roll.status === 'available'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : roll.status === 'mounted' || roll.status === 'in_use'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                                )}
                              >
                                {roll.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {roll.status === 'mounted' || roll.mounted_machine_id ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnmountRoll(roll)}
                                    className="h-7 px-2 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-50 border-amber-300 dark:border-amber-700 cursor-pointer"
                                    title="Unmount from machine back to warehouse"
                                  >
                                    Unmount
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setRollToMount(roll)
                                      setSelectedMachineForMount(machines[0]?.id || '')
                                      setIsMountModalOpen(true)
                                    }}
                                    className="h-7 px-2 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 border-blue-300 dark:border-blue-700 cursor-pointer"
                                    title="Mount onto printing or fabrication machine"
                                  >
                                    <Cpu className="h-3 w-3 mr-1" />
                                    Mount
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedRollForAction(roll)
                                    setIsConsumptionOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-purple-600 hover:bg-purple-50 border-purple-200"
                                >
                                  <Scissors className="h-3 w-3 mr-1" />
                                  Cut / Sign-Off
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
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: FLOOR MATERIAL REQUESTS TAB */}
        {/* ========================================================= */}
        {currentView === 'requests' && (
          <div className="space-y-4">
            <Card className="p-3.5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search request number, task title, requested by..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRequestOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  + New Material Request
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Request #</th>
                      <th className="p-3">Production Task</th>
                      <th className="p-3">Requested By</th>
                      <th className="p-3">Priority</th>
                      <th className="p-3">Items Count</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Send className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No material requisitions found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {req.request_number}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {req.production_task?.title || 'Production Task'}
                            </div>
                            {req.production_task?.task_code && (
                              <div className="text-[10px] text-slate-400 font-mono">{req.production_task.task_code}</div>
                            )}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {req.requested_by_name}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] capitalize font-bold',
                                req.priority === 'urgent'
                                  ? 'bg-rose-50 text-rose-700 border-rose-300'
                                  : req.priority === 'high'
                                  ? 'bg-amber-50 text-amber-700 border-amber-300'
                                  : 'bg-slate-50 text-slate-600'
                              )}
                            >
                              {req.priority}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            {req.items?.length || 1} items
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                'capitalize px-2 py-0.5 rounded text-[10px] font-bold border',
                                req.status === 'approved' || req.status === 'issued'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : req.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-300'
                              )}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'requested' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="h-7 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}
                              {req.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequestForIssue(req)
                                    setIsIssueOpen(true)
                                  }}
                                  className="h-7 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Issue Stock
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 5: REMNANTS & USABLE OFF-CUTS TAB */}
        {/* ========================================================= */}
        {currentView === 'remnants' && (
          <div className="space-y-4">
            <Card className="p-3.5">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search remnant code, parent substrate, location..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </Card>

            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Remnant Code</th>
                      <th className="p-3">Parent Substrate</th>
                      <th className="p-3 text-right">Dimensions (W × L)</th>
                      <th className="p-3 text-right">Calculated Area</th>
                      <th className="p-3">Store Location</th>
                      <th className="p-3">Condition</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRemnants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Scissors className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No off-cuts or remnants currently logged.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Remnants are automatically saved when logging large format cutting sign-offs.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRemnants.map((rem) => {
                        const area = Number(rem.area_sft || (rem.width * rem.length))

                        return (
                          <tr key={rem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                              {rem.remnant_code}
                            </td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {rem.parent_material?.name || 'Raw Material'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {rem.width} {rem.dimension_unit} × {rem.length} {rem.dimension_unit}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-purple-600">
                              {area.toFixed(1)} SFT
                            </td>
                            <td className="p-3 text-slate-500">
                              {rem.location?.location_name || 'Remnant Rack'}
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {rem.condition?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span
                                className={cn(
                                  'capitalize px-2 py-0.5 rounded text-[10px] font-bold border',
                                  rem.status === 'available'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : rem.status === 'consumed'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                )}
                              >
                                {rem.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {rem.status === 'available' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemnantStatusChange(rem.id, 'consumed')}
                                      className="h-7 px-2 text-[11px] text-blue-600"
                                    >
                                      Use in Job
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemnantStatusChange(rem.id, 'scrapped')}
                                      className="h-7 px-2 text-[11px] text-rose-500 hover:bg-rose-50"
                                    >
                                      Scrap
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 6: WAREHOUSES & LOCATIONS TAB */}
        {/* ========================================================= */}
        {currentView === 'locations' && (
          <div className="space-y-4">
            <Card className="p-3.5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search location code, name, type..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewLocationOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  + Add Store Location
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="font-bold">No store locations found.</p>
                </div>
              ) : (
                filteredLocations.map((loc) => (
                  <Card key={loc.id} className="p-4 space-y-3 border shadow-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-blue-600">{loc.location_code}</div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">{loc.location_name}</h4>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {loc.location_type?.replace('_', ' ')}
                      </Badge>
                    </div>
                    {loc.description && <p className="text-xs text-slate-500">{loc.description}</p>}
                    <div className="flex items-center justify-between pt-2 border-t text-xs">
                      <span className="text-slate-400">Status:</span>
                      <span className="font-bold text-emerald-600">Active Location</span>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 7: PURCHASES VIEW (PURCHASE ORDERS) */}
        {/* ========================================================= */}
        {currentView === 'purchases' && (
          <div className="space-y-4">
            {/* PO Filter Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search PO number, supplier name, notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All POs' },
                    { id: 'issued', label: 'Issued' },
                    { id: 'partially_received', label: 'Partial' },
                    { id: 'received', label: 'Received' },
                  ].map((st) => (
                    <Button
                      key={st.id}
                      size="sm"
                      variant={selectedPoStatus === st.id ? 'default' : 'outline'}
                      onClick={() => setSelectedPoStatus(st.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0"
                    >
                      {st.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* POs Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">PO Number</th>
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3">PO Date</th>
                      <th className="p-3">Expected Date</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-right">Due Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No purchase orders found.</p>
                          <Button
                            size="sm"
                            onClick={() => setIsNewPurchaseOpen(true)}
                            className="mt-3 bg-violet-600 hover:bg-violet-700 text-white text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Create Purchase Order
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            <Link href={getTenantNavHref(`/purchases/${po.id}`, pathname, slug)} className="hover:underline text-indigo-600 dark:text-indigo-400">
                              {po.po_number}
                            </Link>
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {po.supplier_name}
                          </td>
                          <td className="p-3 text-slate-500">{po.po_date}</td>
                          <td className="p-3 text-slate-500">{po.expected_delivery_date || '—'}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            <CurrencyDisplay amount={po.grand_total} />
                          </td>
                          <td className="p-3 text-right font-mono text-slate-500">
                            <CurrencyDisplay amount={po.due_amount} />
                          </td>
                          <td className="p-3">
                            <span
                              className={cn(
                                'capitalize px-2 py-0.5 rounded text-[10px] font-bold border',
                                po.status === 'received'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : po.status === 'partially_received'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                                  : 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                              )}
                            >
                              {po.status?.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {po.status !== 'received' && po.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPoForReceive(po)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 px-2.5 text-[11px] text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  Receive GRN
                                </Button>
                              )}
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                                <Link href={getTenantNavHref(`/purchases/${po.id}`, pathname, slug)}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 8: RECEIVING VIEW (GOODS RECEIVED NOTES / INWARD) */}
        {/* ========================================================= */}
        {currentView === 'receiving' && (
          <div className="space-y-4">
            {/* Inward Pending Deliveries Queue */}
            <Card className="p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pending Inward Shipments ({pendingInwardPOs.length})
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsReceiveStockOpen(true)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Manual GRN Ingestion
                </Button>
              </div>

              {pendingInwardPOs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">No pending POs awaiting receipt.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingInwardPOs.map((po) => (
                    <div
                      key={po.id}
                      className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-mono font-bold text-xs text-indigo-600">{po.po_number}</div>
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200">{po.supplier_name}</div>
                        <div className="text-[10px] text-slate-500">
                          {po.items?.length || 0} line items • Expected: {po.expected_delivery_date || 'ASAP'}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedPoForReceive(po)
                          setIsReceiveStockOpen(true)
                        }}
                        className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                      >
                        Receive
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Posted Goods Received Notes History */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-3.5 border-b bg-slate-50 dark:bg-slate-900/60 font-bold text-xs flex items-center justify-between">
                <span>Recent Posted Goods Received Notes (GRN)</span>
                <span className="text-slate-400 font-normal">{goodsReceivedNotes.length} GRNs logged</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">GRN Number</th>
                      <th className="p-3">PO Reference</th>
                      <th className="p-3">Supplier Name</th>
                      <th className="p-3">Challan #</th>
                      <th className="p-3">Received Date</th>
                      <th className="p-3">Received By</th>
                      <th className="p-3 text-right">Accepted Value</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {goodsReceivedNotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Truck className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No Goods Received Notes posted yet.</p>
                        </td>
                      </tr>
                    ) : (
                      goodsReceivedNotes.map((grn) => (
                        <tr key={grn.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                            {grn.grn_number}
                          </td>
                          <td className="p-3 font-mono text-indigo-600">
                            {grn.purchase_order_id ? 'PO' : 'Direct'}
                          </td>
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200">
                            {grn.supplier_name}
                          </td>
                          <td className="p-3 font-mono text-slate-500">
                            {grn.challan_number || '—'}
                          </td>
                          <td className="p-3 text-slate-500">{grn.received_date}</td>
                          <td className="p-3 text-slate-500">{grn.received_by_name}</td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                            <CurrencyDisplay amount={grn.accepted_total || 0} />
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                              Posted
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 9: STOCK AUDIT LEDGER TAB */}
        {/* ========================================================= */}
        {currentView === 'ledger' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search material, user, job order, reference ID, notes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'All Tx' },
                    { id: 'purchase', label: 'Purchases (GRN)' },
                    { id: 'issue', label: 'Floor Issues' },
                    { id: 'consumption', label: 'Consumptions' },
                    { id: 'remnant', label: 'Remnants' },
                    { id: 'wastage', label: 'Waste' },
                    { id: 'adjustment', label: 'Adjustments' },
                  ].map((tx) => (
                    <Button
                      key={tx.id}
                      size="sm"
                      variant={selectedLedgerType === tx.id ? 'default' : 'outline'}
                      onClick={() => setSelectedLedgerType(tx.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0"
                    >
                      {tx.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Ledger Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 border-b font-bold">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Material / Item</th>
                      <th className="p-3">Transaction Type</th>
                      <th className="p-3 text-right">Quantity Change</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Balance After</th>
                      <th className="p-3">Reference / User</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No stock ledger mutations found.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry) => {
                        const qtyChange = Number(entry.quantity_change || 0)
                        const isPositive = qtyChange > 0

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                              {entry.material_name || entry.material?.name || 'Stock Item'}
                            </td>
                            <td className="p-3">
                              {getLedgerTxBadge(entry.transaction_type)}
                            </td>
                            <td
                              className={cn(
                                'p-3 text-right font-black font-mono text-sm',
                                isPositive ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                              )}
                            >
                              {isPositive ? `+${qtyChange.toLocaleString()}` : qtyChange.toLocaleString()}
                            </td>
                            <td className="p-3 uppercase font-mono text-slate-500 font-bold text-[11px]">
                              {entry.unit || 'pcs'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                              {Number(entry.balance_after || 0).toLocaleString()}
                            </td>
                            <td className="p-3">
                              <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                                {entry.reference_id || '—'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {entry.performed_by_name || 'System'}
                              </div>
                            </td>
                            <td className="p-3 text-slate-500 max-w-xs truncate" title={entry.notes || ''}>
                              {entry.notes || '—'}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* REUSABLE INTEGRATED MODALS */}
        {/* ========================================================= */}
        <ReceiveStockModal
          open={isReceiveStockOpen}
          onOpenChange={(open) => {
            setIsReceiveStockOpen(open)
            if (!open) setSelectedPoForReceive(null)
          }}
          materials={materials}
          products={readyProducts}
          locations={locations}
          orders={orders}
          purchaseOrder={selectedPoForReceive}
          selectedMaterialId={selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Stock received and ledger updated successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <NewPurchaseModal
          open={isNewPurchaseOpen}
          onOpenChange={setIsNewPurchaseOpen}
          onPurchaseCreated={(po) => {
            showNotification(`Purchase Order ${po.po_number} created successfully.`)
            loadAllData()
          }}
        />

        <MaterialRequestModal
          open={isRequestOpen}
          onOpenChange={setIsRequestOpen}
          materials={materials}
          locations={locations}
          onSuccess={() => {
            showNotification('Material requisition submitted successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <MaterialIssueModal
          open={isIssueOpen}
          onOpenChange={(open) => {
            setIsIssueOpen(open)
            if (!open) setSelectedRequestForIssue(null)
          }}
          materials={materials}
          locations={locations}
          requests={requests}
          rolls={rolls}
          request={selectedRequestForIssue}
          selectedMaterialId={selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Material issued to print floor successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <LogConsumptionModal
          open={isConsumptionOpen}
          onOpenChange={(open) => {
            setIsConsumptionOpen(open)
            if (!open) {
              setSelectedRollForAction(null)
              setSelectedFloorRecordForConsumption(null)
            }
          }}
          materials={materials}
          locations={locations}
          rolls={rolls}
          selectedRollId={selectedRollForAction?.id}
          selectedMaterialId={selectedRollForAction?.material_id || selectedMaterialForAction?.id || selectedFloorRecordForConsumption?.material_id}
          selectedFloorRecord={selectedFloorRecordForConsumption}
          onSuccess={() => {
            showNotification('Actual consumption recorded and remnants evaluated.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <StockTransferModal
          open={isTransferOpen}
          onOpenChange={(open) => {
            setIsTransferOpen(open)
            if (!open) setSelectedMaterialForAction(null)
          }}
          materials={materials}
          locations={locations}
          rolls={rolls}
          selectedMaterialId={selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Stock transferred between locations successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <StockAdjustmentModal
          open={isAdjustmentOpen}
          onOpenChange={(open) => {
            setIsAdjustmentOpen(open)
            if (!open) setSelectedMaterialForAction(null)
          }}
          materials={materials}
          locations={locations}
          selectedMaterial={selectedMaterialForAction}
          selectedMaterialId={selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Stock adjustment recorded successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <NewLocationModal
          open={isNewLocationOpen}
          onOpenChange={setIsNewLocationOpen}
          onSuccess={() => {
            showNotification('Store location created successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        {/* Mount Physical Roll to Machine Modal */}
        {isMountModalOpen && rollToMount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base font-bold">Mount Roll to Press Fleet</CardTitle>
                      <CardDescription className="text-xs">
                        Assign roll to active printing or fabrication machine
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsMountModalOpen(false)
                      setRollToMount(null)
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Roll Specs Summary */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="font-bold text-slate-900 dark:text-white flex justify-between">
                    <span>{rollToMount.roll_code || rollToMount.roll_tag || `Roll #${rollToMount.id.slice(0, 8)}`}</span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                      {rollToMount.width_ft} ft Width
                    </Badge>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400 font-medium">
                    {rollToMount.material?.name || 'Roll Media'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Remaining: {Number(rollToMount.remaining_area_sft || 0).toFixed(1)} SFT ({Number(rollToMount.current_length_ft || (rollToMount.remaining_area_sft / (rollToMount.width_ft || 1))).toFixed(1)} LF)
                  </div>
                </div>

                {/* Machine Fleet Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Select Destination Machine / Press *</Label>
                  {machines.length === 0 ? (
                    <div className="text-xs text-amber-600 p-2.5 bg-amber-50 rounded border border-amber-200">
                      No machines found in fleet. Add machines in the Machineries section first.
                    </div>
                  ) : (
                    <select
                      value={selectedMachineForMount}
                      onChange={(e) => setSelectedMachineForMount(e.target.value)}
                      className="w-full text-xs h-9 px-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="">-- Choose Machine / Press --</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.code}) — {m.machine_type || m.category || 'Press'} {m.status !== 'available' ? `[${m.status}]` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsMountModalOpen(false)
                      setRollToMount(null)
                    }}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={!selectedMachineForMount || isMounting}
                    onClick={handleMountRoll}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    {isMounting ? 'Mounting...' : 'Confirm & Mount Roll'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Upgraded Issue Master Roll to Print Floor Modal */}
        <IssueMasterRollModal
          open={isIssueMasterRollOpen}
          onOpenChange={setIsIssueMasterRollOpen}
          materials={materials}
          locations={locations}
          initialMaterialId={initialRollMaterialId}
          companyId={companyId}
          onSuccess={() => loadAllData(true)}
        />

        {/* Material Trash Confirmation Dialog */}
        <ConfirmDialog
          open={isTrashConfirmOpen}
          onOpenChange={setIsTrashConfirmOpen}
          title={`Move "${materialToTrash?.name || 'Material'}" to Trash?`}
          titleBn={`"${materialToTrash?.name || 'ম্যাটেরিয়াল'}" ট্র্যাশে স্থানান্তর করবেন?`}
          message={`Are you sure you want to move this material to the Trash / Recycle Bin? It can be restored from system settings later.`}
          messageBn={`আপনি কি এই কাঁচামালটি রিসাইকেল বিনে সরাতে চান? পরবর্তীতে সেটিংস থেকে এটি রিস্টোর করা যাবে।`}
          confirmText="Move to Trash"
          confirmTextBn="ট্র্যাশে সরান"
          cancelText="Cancel"
          cancelTextBn="বাতিল"
          isDestructive={true}
          isLoading={isTrashing}
          onConfirm={confirmTrashMaterial}
        />

        {/* Reject Request Prompt Dialog */}
        <PromptDialog
          open={isRejectPromptOpen}
          onOpenChange={setIsRejectPromptOpen}
          title="Reject Material Request"
          titleBn="রিকুইজিশন বাতিল করুন"
          message="Enter reason for rejecting this material requisition:"
          messageBn="কাঁচামাল রিকুইজিশন বাতিলের কারণ উল্লেখ করুন:"
          placeholder="e.g. Insufficient stock, duplicate request, etc."
          placeholderBn="যেমনঃ স্টকে স্বল্পতা, ডুপ্লিকেট রিকুইজিশন ইত্যাদি..."
          confirmText="Reject Request"
          confirmTextBn="বাতিল নিশ্চিত করুন"
          isLoading={isRejecting}
          onConfirm={confirmRejectRequest}
        />
      </div>
    </FeatureGate>
  )
}

export default function UnifiedInventoryPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Package className="h-6 w-6 text-indigo-500 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Inventory...</p>
        </div>
      }
    >
      <UnifiedInventoryContent />
    </React.Suspense>
  )
}

