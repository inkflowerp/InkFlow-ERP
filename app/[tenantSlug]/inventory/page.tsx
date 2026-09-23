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
  ChevronDown,
  ChevronRight,
  Building,
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
import { isMaterialProduct, isReadyProduct, getMaterialWarehouseStockBreakdown, formatFloorPieceDisplay, normalizeInventoryGroupAttributes, createInventoryGroupingKey } from '@/lib/units'
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
import { IssueMasterRollModal } from '@/components/inventory/issue-master-roll-modal'
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
  const [isFloorIssueOpen, setIsFloorIssueOpen] = useState(false)
  const [floorIssueMaterialId, setFloorIssueMaterialId] = useState<string>('')
  const [floorIssueWidthFt, setFloorIssueWidthFt] = useState<number | undefined>(undefined)
  const [floorIssueLengthFt, setFloorIssueLengthFt] = useState<number | undefined>(undefined)
  const [rollViewMode, setRollViewMode] = useState<'grouped' | 'serialized'>('grouped')
  const [expandedGroupKeys, setExpandedGroupKeys] = useState<Set<string>>(new Set())
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isNewLocationOpen, setIsNewLocationOpen] = useState(false)

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

    let syncTimeout: any = null
    const handleRealtimeSync = () => {
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(() => {
        loadAllData(true)
      }, 300)
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
        if (syncTimeout) clearTimeout(syncTimeout)
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

  // Canonical 7-Attribute Inventory Group Rows (strictly separate row per discrete 7-attribute combination)
  const inventoryGroupRows = useMemo(() => {
    const rowsList: {
      key: string
      material_id: string
      material: MaterialRecord
      name: string
      name_bn?: string | null
      display_title: string
      sku: string
      category?: string
      specification?: string | null
      is_roll: boolean
      width_ft: number
      length_ft: number
      allowance_ft: number
      purchase_price: number
      gsm: number
      finishing: string
      stock_quantity: number
      stock_unit: string
      consumption_qty: number
      consumption_unit: string
      avg_unit_cost: number
      total_valuation: number
      reorder_level: number
      status: 'available' | 'low_stock' | 'out_of_stock'
      cost_display_primary: string
      cost_display_secondary?: string | null
      stock_display_primary: string
      stock_display_secondary?: string | null
    }[] = []

    for (const mat of materials) {
      const breakdown = getMaterialWarehouseStockBreakdown(mat, rolls)
      const isRoll = breakdown.is_roll
      const reorder = Number(mat.reorder_level || mat.min_stock_level || 0)
      const baseCost = Number(mat.average_cost || mat.last_purchase_price || mat.cost_per_unit || 0)
      const globalAllowance = Number(
        mat.production_width_allowance ||
        (mat.material_config as any)?.extra_width_allowance_ft ||
        0
      )

      if (isRoll && breakdown.roll_items && breakdown.roll_items.length > 0) {
        // Expand each distinct 7-attribute inventory group as its own first-class table row
        for (const item of breakdown.roll_items) {
          const canonicalAttrs = normalizeInventoryGroupAttributes({
            name: mat.name,
            width_ft: item.width_ft,
            length_ft: item.length_ft,
            allowance_ft: item.allowance_ft ?? globalAllowance,
            purchase_price: item.purchase_price ?? baseCost,
            gsm: item.gsm ?? Number(mat.gsm || 0),
            finishing: item.finishing ?? String(mat.default_finishing || 'none'),
            specification: mat.specification,
            material_spec: (mat as any)?.material_spec,
          })
          const key = createInventoryGroupingKey(canonicalAttrs)
          const rollCount = item.roll_count
          const totalSft = item.total_sft
          const itemVal = item.total_valuation || (rollCount * (canonicalAttrs.purchase_price > 150 ? canonicalAttrs.purchase_price : canonicalAttrs.purchase_price * (canonicalAttrs.width_ft * canonicalAttrs.length_ft)))

          const isOut = rollCount <= 0
          const isLow = !isOut && (reorder > 0 ? rollCount <= reorder : false)
          const status = isOut ? 'out_of_stock' : isLow ? 'low_stock' : 'available'

          const pricePerRoll = canonicalAttrs.purchase_price > 0
            ? (canonicalAttrs.purchase_price > 150 ? canonicalAttrs.purchase_price : canonicalAttrs.purchase_price * (canonicalAttrs.width_ft * canonicalAttrs.length_ft))
            : (baseCost > 150 ? baseCost : baseCost * (canonicalAttrs.width_ft * canonicalAttrs.length_ft))
          const pricePerSft = canonicalAttrs.width_ft * canonicalAttrs.length_ft > 0
            ? pricePerRoll / (canonicalAttrs.width_ft * canonicalAttrs.length_ft)
            : 0

          rowsList.push({
            key,
            material_id: mat.id,
            material: mat,
            name: mat.name,
            name_bn: mat.name_bn || null,
            display_title: `${mat.name} — ${canonicalAttrs.width_ft}ft × ${canonicalAttrs.length_ft}ft`,
            sku: mat.sku,
            category: mat.category,
            specification: mat.specification,
            is_roll: true,
            width_ft: canonicalAttrs.width_ft,
            length_ft: canonicalAttrs.length_ft,
            allowance_ft: canonicalAttrs.allowance_ft,
            purchase_price: canonicalAttrs.purchase_price,
            gsm: canonicalAttrs.gsm,
            finishing: canonicalAttrs.finishing,
            stock_quantity: rollCount,
            stock_unit: rollCount === 1 ? 'Roll' : 'Rolls',
            consumption_qty: totalSft,
            consumption_unit: 'SFT',
            avg_unit_cost: pricePerRoll,
            total_valuation: itemVal,
            reorder_level: reorder,
            status,
            cost_display_primary: pricePerRoll > 0 ? `৳ ${pricePerRoll.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} / Roll` : '—',
            cost_display_secondary: pricePerSft > 0 ? `(৳ ${pricePerSft.toFixed(2)} / SFT)` : null,
            stock_display_primary: `${rollCount} ${rollCount === 1 ? 'Roll' : 'Rolls'}`,
            stock_display_secondary: `${totalSft.toLocaleString()} SFT`,
          })
        }
      } else {
        // Non-roll material or roll material with 0 stock and no configured roll sizes
        const stockQty = Number(mat.current_stock || 0)
        const isOut = stockQty <= 0
        const isLow = !isOut && (reorder > 0 ? stockQty <= reorder : false)
        const status = isOut ? 'out_of_stock' : isLow ? 'low_stock' : 'available'
        const totalVal = breakdown.total_valuation > 0 ? breakdown.total_valuation : (stockQty * baseCost)

        const defaultWidth = Number(mat.roll_width_ft || mat.width || 0)
        const defaultLength = Number(mat.standard_roll_length_ft || mat.roll_length_ft || mat.length || 0)

        const canonicalAttrs = normalizeInventoryGroupAttributes({
          name: mat.name,
          width_ft: defaultWidth,
          length_ft: defaultLength,
          allowance_ft: globalAllowance,
          purchase_price: baseCost,
          gsm: Number(mat.gsm || 0),
          finishing: String(mat.default_finishing || 'none'),
          specification: mat.specification,
        })
        const key = createInventoryGroupingKey(canonicalAttrs)

        rowsList.push({
          key,
          material_id: mat.id,
          material: mat,
          name: mat.name,
          name_bn: mat.name_bn || null,
          display_title: isRoll && defaultWidth > 0 && defaultLength > 0
            ? `${mat.name} — ${defaultWidth}ft × ${defaultLength}ft`
            : mat.name,
          sku: mat.sku,
          category: mat.category,
          specification: mat.specification,
          is_roll: isRoll,
          width_ft: canonicalAttrs.width_ft,
          length_ft: canonicalAttrs.length_ft,
          allowance_ft: canonicalAttrs.allowance_ft,
          purchase_price: canonicalAttrs.purchase_price,
          gsm: canonicalAttrs.gsm,
          finishing: canonicalAttrs.finishing,
          stock_quantity: stockQty,
          stock_unit: isRoll ? 'Rolls' : (mat.unit || 'pcs'),
          consumption_qty: stockQty,
          consumption_unit: mat.unit || 'pcs',
          avg_unit_cost: baseCost,
          total_valuation: totalVal,
          reorder_level: reorder,
          status,
          cost_display_primary: breakdown.cost_display_primary || (baseCost > 0 ? `৳ ${baseCost.toLocaleString()}` : '—'),
          cost_display_secondary: breakdown.cost_display_secondary,
          stock_display_primary: breakdown.purchase_unit_display || `${stockQty.toLocaleString()} ${mat.unit || 'pcs'}`,
          stock_display_secondary: breakdown.consumption_unit_display !== breakdown.purchase_unit_display ? breakdown.consumption_unit_display : null,
        })
      }
    }

    return rowsList
  }, [materials, rolls])

  // Filtered Canonical 7-Attribute Inventory Group Rows
  const filteredInventoryGroupRows = useMemo(() => {
    return inventoryGroupRows.filter((row) => {
      const matchCat = selectedCategory === 'all' || row.category === selectedCategory
      const q = search.trim().toLowerCase()
      if (!matchCat) return false
      if (!q) return true

      const matchBasic =
        row.name.toLowerCase().includes(q) ||
        row.display_title.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q) ||
        (row.name_bn && row.name_bn.includes(q)) ||
        (row.category && row.category.toLowerCase().includes(q)) ||
        (row.specification && row.specification.toLowerCase().includes(q))

      const matchSpec =
        row.is_roll && (
          `${row.width_ft}ft`.includes(q) ||
          `${row.width_ft} ft`.includes(q) ||
          `${row.width_ft}`.includes(q) ||
          `${row.length_ft}ft`.includes(q) ||
          `${row.length_ft} ft`.includes(q) ||
          `${row.length_ft}`.includes(q) ||
          (row.gsm > 0 && (`${row.gsm}gsm`.includes(q) || `${row.gsm} gsm`.includes(q) || `${row.gsm}`.includes(q))) ||
          (row.finishing && row.finishing !== 'none' && row.finishing.toLowerCase().includes(q)) ||
          (row.purchase_price > 0 && `${row.purchase_price}`.includes(q))
        )

      return matchBasic || matchSpec
    })
  }, [inventoryGroupRows, selectedCategory, search])

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

  // Filtered Rolls (Serialized individual items)
  const filteredRolls = useMemo(() => {
    return rolls.filter((r) => {
      const matchStatus =
        selectedRollStatus === 'all' ||
        r.status === selectedRollStatus ||
        (selectedRollStatus === 'available' && (r.status === 'available' || r.status === 'in_warehouse' || !r.status)) ||
        (selectedRollStatus === 'mounted' && (r.status === 'mounted' || r.status === 'in_use' || r.status === 'on_floor')) ||
        (selectedRollStatus === 'depleted' && (r.status === 'depleted' || (r.remaining_length_ft != null && r.remaining_length_ft <= 0.5)))
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        (r.roll_code && r.roll_code.toLowerCase().includes(q)) ||
        (r.roll_tag && r.roll_tag.toLowerCase().includes(q)) ||
        (r.material?.name && r.material.name.toLowerCase().includes(q)) ||
        (r.material?.name_bn && r.material.name_bn.includes(q)) ||
        (r.material?.sku && r.material.sku.toLowerCase().includes(q)) ||
        (r.location_name && r.location_name.toLowerCase().includes(q)) ||
        (r.mounted_machine_name && r.mounted_machine_name.toLowerCase().includes(q)) ||
        (r.mounted_press_name && r.mounted_press_name.toLowerCase().includes(q)) ||
        (r.batch_lot_number && r.batch_lot_number.toLowerCase().includes(q))
      return matchStatus && matchSearch
    })
  }, [rolls, selectedRollStatus, search])

  // Grouped Physical Rolls by Width & Length
  // Grouped Physical Rolls Strictly by 7 Canonical Attributes (Name, Width, Length, Allowance, Purchase Price, GSM, Finishing) + Location
  const groupedRolls = useMemo(() => {
    const list: {
      key: string
      sku: string
      material_id: string
      material_name: string
      material_name_bn?: string | null
      category?: string
      width_ft: number
      length_ft: number
      allowance_ft: number
      purchase_price: number
      gsm: number
      finishing: string
      quantity_rolls: number
      total_area_sft: number
      total_valuation: number
      location_name: string
      status: string
      material?: MaterialRecord
      rolls: InventoryRollRecord[]
    }[] = []
    const processedMatIds = new Set<string>()

    const isRollMaterial = (m: MaterialRecord) => {
      const cat = String(m.category || '').toLowerCase()
      const name = String(m.name || '').toLowerCase()
      const pUnit = String(m.purchase_unit || m.master_purchase_unit || (m.material_config as any)?.purchase_unit || '').toLowerCase()
      const unit = String(m.unit || '').toLowerCase()
      return Boolean(
        m.is_roll ||
        pUnit === 'roll' ||
        unit === 'roll' ||
        ['sft', 'sqft'].includes(unit) ||
        (m.roll_width_ft && Number(m.roll_width_ft) > 0) ||
        ['flex', 'vinyl', 'banner', 'sticker', 'canvas', 'mesh', 'paper_roll', 'fabric', 'film', 'roll_media', 'roll', 'pvc', 'flex_banner'].some((c) => cat.includes(c)) ||
        ['flex', 'vinyl', 'banner', 'sticker', 'canvas', 'mesh', 'roll', 'sav', 'pvc'].some((c) => name.includes(c))
      )
    }

    // 1. Process materials that are roll media
    const rollMats = materials.filter(isRollMaterial)

    for (const mat of rollMats) {
      processedMatIds.add(mat.id)
      const matRolls = rolls.filter(
        (r) =>
          r.material_id === mat.id ||
          (mat.sku && r.material?.sku && r.material.sku.toLowerCase() === mat.sku.toLowerCase())
      )

      const allowance = Number(
        mat.production_width_allowance ||
        (mat.material_config as any)?.extra_width_allowance_ft ||
        (mat.pricing_formula as any)?.production_width_allowance ||
        0
      )

      if (matRolls.length > 0) {
        // Group by the 7 canonical attributes + location
        const map = new Map<string, {
          sku: string
          name: string
          name_bn?: string | null
          attrs: any
          loc: string
          items: InventoryRollRecord[]
        }>()

        for (const r of matRolls) {
          const w = Number(r.width_ft || mat.roll_width_ft || 4)
          const l = Number(r.current_length_ft ?? r.initial_length_ft ?? mat.standard_roll_length_ft ?? 164)
          const allow = Number((r as any).allowance_ft ?? (r as any).extra_allowance ?? (r as any).allowance ?? allowance ?? 0)
          const pPrice = Number(r.unit_cost ?? mat.average_cost ?? mat.last_purchase_price ?? mat.cost_per_unit ?? 0)
          const gsm = Number((r as any).gsm ?? mat.gsm ?? (mat as any)?.weight_gsm ?? 0)
          const fin = String((r as any).finishing ?? (r as any).finish ?? mat.default_finishing ?? (mat as any)?.finish ?? 'none')
          const loc = r.location_name || mat.location || 'Main Store'

          const canonicalAttrs = normalizeInventoryGroupAttributes({
            name: mat.name,
            width_ft: w,
            length_ft: l,
            allowance_ft: allow,
            purchase_price: pPrice,
            gsm: gsm,
            finishing: fin,
            specification: mat.specification,
            material_spec: (mat as any)?.material_spec,
          })
          const baseKey = createInventoryGroupingKey(canonicalAttrs)
          const k = `${baseKey}|loc:${loc}`

          if (!map.has(k)) {
            map.set(k, {
              sku: mat.sku || 'MAT',
              name: mat.name,
              name_bn: mat.name_bn,
              attrs: canonicalAttrs,
              loc,
              items: [],
            })
          }
          map.get(k)!.items.push(r)
        }

        for (const [k, grp] of map) {
          const totalArea = grp.items.reduce(
            (sum, r) => {
              const curLen = Number(r.current_length_ft ?? r.initial_length_ft ?? grp.attrs.length_ft)
              const storedArea = Number(r.remaining_area_sft ?? r.initial_area_sft ?? (grp.attrs.width_ft * curLen))
              return sum + storedArea
            },
            0
          )
          const rollCost = grp.attrs.purchase_price > 0
            ? (grp.attrs.purchase_price > 150 ? grp.attrs.purchase_price : grp.attrs.purchase_price * (grp.attrs.width_ft * grp.attrs.length_ft))
            : (Number(mat.average_cost || mat.last_purchase_price || 0) > 150 ? Number(mat.average_cost || mat.last_purchase_price || 0) : Number(mat.average_cost || mat.last_purchase_price || 0) * (grp.attrs.width_ft * grp.attrs.length_ft))
          const totalValuation = grp.items.length * rollCost

          const hasMounted = grp.items.some((r) => r.status === 'mounted')
          const hasAvailable = grp.items.some((r) => r.status === 'available' || r.status === 'in_warehouse' || !r.status)
          const hasDepleted = grp.items.some((r) => r.status === 'depleted')
          const st = hasMounted && hasAvailable ? 'mixed' : hasMounted ? 'mounted' : hasDepleted && !hasAvailable ? 'depleted' : 'available'

          list.push({
            key: k,
            sku: grp.sku,
            material_id: mat.id,
            material_name: grp.name,
            material_name_bn: grp.name_bn || null,
            category: mat.category,
            width_ft: grp.attrs.width_ft,
            length_ft: grp.attrs.length_ft,
            allowance_ft: grp.attrs.allowance_ft,
            purchase_price: grp.attrs.purchase_price,
            gsm: grp.attrs.gsm,
            finishing: grp.attrs.finishing,
            quantity_rolls: grp.items.length,
            total_area_sft: totalArea,
            total_valuation: totalValuation,
            location_name: grp.loc,
            status: st,
            material: mat,
            rolls: grp.items,
          })
        }
      } else {
        // Derive from stock breakdown (configured roll sizes / stock)
        const breakdown = getMaterialWarehouseStockBreakdown(mat, rolls)
        if (breakdown.roll_items && breakdown.roll_items.length > 0) {
          for (const item of breakdown.roll_items) {
            const count = item.roll_count || (item.total_sft > 0 && item.width_ft * item.length_ft > 0 ? Math.round(item.total_sft / (item.width_ft * item.length_ft)) : 0)
            const area = item.total_sft || (count * item.width_ft * item.length_ft)
            const allow = item.allowance_ft ?? allowance
            const price = item.purchase_price ?? Number(mat.average_cost || mat.last_purchase_price || 0)
            const gsm = item.gsm ?? Number(mat.gsm || (mat as any)?.weight_gsm || 0)
            const fin = item.finishing ?? String(mat.default_finishing || (mat as any)?.finish || 'none')
            const loc = mat.location || 'Main Store'

            const canonicalAttrs = normalizeInventoryGroupAttributes({
              name: mat.name,
              width_ft: item.width_ft,
              length_ft: item.length_ft,
              allowance_ft: allow,
              purchase_price: price,
              gsm: gsm,
              finishing: fin,
              specification: mat.specification,
              material_spec: (mat as any)?.material_spec,
            })
            const baseKey = createInventoryGroupingKey(canonicalAttrs)
            const k = `${baseKey}|loc:${loc}`

            if (count > 0 || area > 0) {
              const rollCost = canonicalAttrs.purchase_price > 0
                ? (canonicalAttrs.purchase_price > 150 ? canonicalAttrs.purchase_price : canonicalAttrs.purchase_price * (canonicalAttrs.width_ft * canonicalAttrs.length_ft))
                : 0
              const itemVal = item.total_valuation || (count * rollCost)

              list.push({
                key: k,
                sku: mat.sku || 'MAT',
                material_id: mat.id,
                material_name: mat.name,
                material_name_bn: mat.name_bn || null,
                category: mat.category,
                width_ft: canonicalAttrs.width_ft,
                length_ft: canonicalAttrs.length_ft,
                allowance_ft: canonicalAttrs.allowance_ft,
                purchase_price: canonicalAttrs.purchase_price,
                gsm: canonicalAttrs.gsm,
                finishing: canonicalAttrs.finishing,
                quantity_rolls: count,
                total_area_sft: area,
                total_valuation: itemVal,
                location_name: loc,
                status: 'available',
                material: mat,
                rolls: [],
              })
            }
          }
        }
      }
    }

    // 2. Process any remaining physical rolls not linked to the above materials
    const remainingRolls = rolls.filter((r) => r.material_id && !processedMatIds.has(r.material_id))
    if (remainingRolls.length > 0) {
      const map = new Map<string, {
        sku: string
        name: string
        name_bn?: string | null
        matId: string
        attrs: any
        loc: string
        items: InventoryRollRecord[]
      }>()

      for (const r of remainingRolls) {
        const sku = r.material?.sku || 'MAT'
        const name = r.material?.name || 'Roll Media'
        const name_bn = r.material?.name_bn || null
        const matId = r.material_id
        const w = Number(r.width_ft || 3)
        const l = Number(r.current_length_ft ?? r.initial_length_ft ?? 164)
        const allow = Number((r as any).allowance_ft ?? (r as any).extra_allowance ?? 0)
        const pPrice = Number(r.unit_cost ?? 0)
        const gsm = Number((r as any).gsm ?? 0)
        const fin = String((r as any).finishing ?? 'none')
        const loc = r.location_name || 'Main Store'

        const canonicalAttrs = normalizeInventoryGroupAttributes({
          name,
          width_ft: w,
          length_ft: l,
          allowance_ft: allow,
          purchase_price: pPrice,
          gsm: gsm,
          finishing: fin,
        })
        const baseKey = createInventoryGroupingKey(canonicalAttrs)
        const k = `${baseKey}|loc:${loc}`

        if (!map.has(k)) {
          map.set(k, { sku, name, name_bn, matId, attrs: canonicalAttrs, loc, items: [] })
        }
        map.get(k)!.items.push(r)
      }

      for (const [k, grp] of map) {
        const totalArea = grp.items.reduce(
          (sum, r) => sum + Number(r.remaining_area_sft ?? r.initial_area_sft ?? (grp.attrs.width_ft * grp.attrs.length_ft)),
          0
        )
        const rollCost = grp.attrs.purchase_price > 0
          ? (grp.attrs.purchase_price > 150 ? grp.attrs.purchase_price : grp.attrs.purchase_price * (grp.attrs.width_ft * grp.attrs.length_ft))
          : 0
        const totalValuation = grp.items.length * rollCost

        const hasMounted = grp.items.some((r) => r.status === 'mounted')
        const hasAvailable = grp.items.some((r) => r.status === 'available' || r.status === 'in_warehouse' || !r.status)
        const hasDepleted = grp.items.some((r) => r.status === 'depleted')
        const st = hasMounted && hasAvailable ? 'mixed' : hasMounted ? 'mounted' : hasDepleted && !hasAvailable ? 'depleted' : 'available'

        list.push({
          key: k,
          sku: grp.sku,
          material_id: grp.matId,
          material_name: grp.name,
          material_name_bn: grp.name_bn,
          width_ft: grp.attrs.width_ft,
          length_ft: grp.attrs.length_ft,
          allowance_ft: grp.attrs.allowance_ft,
          purchase_price: grp.attrs.purchase_price,
          gsm: grp.attrs.gsm,
          finishing: grp.attrs.finishing,
          quantity_rolls: grp.items.length,
          total_area_sft: totalArea,
          total_valuation: totalValuation,
          location_name: grp.loc,
          status: st,
          rolls: grp.items,
        })
      }
    }

    return list
  }, [materials, rolls])

  // Total count of physical rolls across all sizes
  const totalPhysicalRollsCount = useMemo(() => {
    return groupedRolls.reduce((sum, g) => sum + (g.quantity_rolls || 0), 0)
  }, [groupedRolls])

  // Filtered Grouped Rolls by Search & Status
  const filteredGroupedRolls = useMemo(() => {
    return groupedRolls.filter((g) => {
      const matchStatus =
        selectedRollStatus === 'all' ||
        g.status === selectedRollStatus ||
        (selectedRollStatus === 'available' && (g.status === 'available' || g.status === 'in_warehouse' || g.status === 'mixed' || !g.status)) ||
        (selectedRollStatus === 'mounted' && (g.status === 'mounted' || g.status === 'in_use' || g.status === 'on_floor' || g.rolls.some((r) => r.status === 'mounted'))) ||
        (selectedRollStatus === 'depleted' && (g.status === 'depleted' || g.quantity_rolls === 0))
      const q = search.trim().toLowerCase()
      const matchSearch =
        !q ||
        g.sku.toLowerCase().includes(q) ||
        g.material_name.toLowerCase().includes(q) ||
        (g.material_name_bn && g.material_name_bn.includes(q)) ||
        `${g.width_ft}ft`.includes(q) ||
        `${g.width_ft}`.includes(q) ||
        `${g.length_ft}ft`.includes(q) ||
        `${g.length_ft}`.includes(q) ||
        (g.gsm > 0 && `${g.gsm}gsm`.includes(q)) ||
        (g.finishing !== 'none' && g.finishing.toLowerCase().includes(q)) ||
        (g.purchase_price > 0 && `${g.purchase_price}`.includes(q)) ||
        g.location_name.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [groupedRolls, selectedRollStatus, search])

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
            setFloorIssueMaterialId('')
            setSelectedRequestForIssue(null)
            setIsFloorIssueOpen(true)
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
          materialsCount={inventoryGroupRows.length}
          readyProductsCount={readyProducts.length}
          rollsCount={totalPhysicalRollsCount || rolls.length}
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
                    placeholder={isBn ? "কাঁচামাল গ্রুপ, মাপ (যেমন ২.২৫ft, ১৬৪ft), SKU, স্পেসিফিকেশন খুঁজুন..." : "Search material group, size (e.g. 2.25ft, 164ft), SKU, brand, GSM, specs..."}
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
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'কাঁচামাল গ্রুপ ও এসকেইউ' : 'Material Group & SKU'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'ক্যাটাগরি ও স্পেক' : 'Category & Spec'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'বর্তমান স্টক' : 'Available Stock'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'একক' : 'Unit'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'একক খরচ' : 'Unit Cost'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'মোট মূল্যায়ন' : 'Total Valuation'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'রিঅর্ডার লেভেল' : 'Reorder Point'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredInventoryGroupRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          <Layers className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো কাঁচামাল গ্রুপ পাওয়া যায়নি।' : 'No inventory groups match your search.'}</p>
                          <Button
                            size="sm"
                            onClick={() => setIsReceiveStockOpen(true)}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {isBn ? 'স্টক রিসিভ (GRN)' : 'Receive Stock (GRN)'}
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredInventoryGroupRows.map((row) => {
                        const isOut = row.status === 'out_of_stock'
                        const isLow = row.status === 'low_stock'

                        return (
                          <tr key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4">
                              <Link
                                href={getTenantNavHref(`/inventory/${row.material_id}`, pathname, slug)}
                                className="font-bold text-slate-900 dark:text-white hover:text-emerald-600 flex items-center gap-1.5 transition-colors"
                              >
                                <span>{row.display_title}</span>
                                <ExternalLink className="h-3 w-3 opacity-60" />
                              </Link>
                              {row.name_bn && <div className="text-[11px] text-slate-400 font-bengali mt-0.5">{row.name_bn}</div>}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="text-[10px] text-slate-500 font-mono font-medium">SKU: {row.sku}</span>
                                {row.is_roll && row.width_ft > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    {row.width_ft}ft × {row.length_ft}ft
                                  </span>
                                )}
                                {row.allowance_ft > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    +{row.allowance_ft}ft allow
                                  </span>
                                )}
                                {row.gsm > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    {row.gsm} GSM
                                  </span>
                                )}
                                {row.finishing && row.finishing !== 'none' && (
                                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 capitalize">
                                    {row.finishing}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {row.category?.replace('_', ' ') || 'Substrate'}
                              </span>
                              {row.is_roll && row.width_ft * row.length_ft > 0 && (
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                                  {(row.width_ft * row.length_ft).toLocaleString()} SFT / roll
                                </div>
                              )}
                              {row.specification && (
                                <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{row.specification}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap">
                              <div>
                                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                                  {row.stock_display_primary}
                                </span>
                                {row.stock_display_secondary && (
                                  <div className="text-[10px] font-medium text-slate-500 font-sans mt-0.5">
                                    {row.stock_display_secondary}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold uppercase text-[10px] border border-slate-200 dark:border-slate-700">
                                {row.is_roll ? 'ROLL' : row.stock_unit.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white">{row.cost_display_primary}</span>
                                {row.cost_display_secondary && (
                                  <div className="text-[10px] text-slate-400 font-sans font-normal mt-0.5">
                                    {row.cost_display_secondary}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              {row.total_valuation > 0 ? (
                                <span className="font-extrabold text-slate-900 dark:text-white">
                                  <CurrencyDisplay amount={row.total_valuation} />
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium"><CurrencyDisplay amount={0} /></span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 font-mono text-xs text-slate-500 text-center whitespace-nowrap">
                              {row.reorder_level > 0 ? `${row.reorder_level} ${row.stock_unit}` : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span>{isBn ? 'স্টক শেষ' : 'Out of Stock'}</span>
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                  <span>{isBn ? 'কম স্টক' : 'Low Stock'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{isBn ? 'স্টকে আছে' : 'Available'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(row.material)
                                    setFloorIssueMaterialId(row.material_id)
                                    setFloorIssueWidthFt(row.is_roll ? row.width_ft : undefined)
                                    setFloorIssueLengthFt(row.is_roll ? row.length_ft : undefined)
                                    setSelectedRequestForIssue(null)
                                    setIsFloorIssueOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 font-medium cursor-pointer"
                                >
                                  {isBn ? 'ইস্যু' : 'Issue'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(row.material)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-emerald-600 hover:bg-emerald-50 border-emerald-200 dark:border-emerald-800 font-medium cursor-pointer"
                                >
                                  {isBn ? 'রিসিভ' : 'Receive'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(row.material)
                                    setIsAdjustmentOpen(true)
                                  }}
                                  className="h-7 px-2 text-[11px] text-amber-600 hover:bg-amber-50 border-amber-200 dark:border-amber-800 font-medium cursor-pointer"
                                >
                                  {isBn ? 'এডজাস্ট' : 'Adjust'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTrashMaterial(row.material)}
                                  className="h-7 px-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                                  title={isBn ? 'ট্র্যাশে পাঠান' : 'Move to Trash'}
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
              <Link href={getTenantNavHref('/production/floor-consumption', pathname, slug)}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-500 text-white gap-2 font-medium shrink-0 cursor-pointer">
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
            <Card className="p-3.5 shadow-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={isBn ? 'রেডি পণ্য, ডিসপ্লে স্ট্যান্ড, স্টেন্ডি, পিওপি হার্ডওয়্যার খুঁজুন...' : 'Search ready products, display hardware, standees, POP displays...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </Card>

            {/* Ready Products Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'পণ্যের নাম ও এসকেইউ' : 'Product Name & SKU'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'প্যাকেজিং ও স্পেক্স' : 'Packaging & Specs'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'বর্তমান স্টক' : 'Stock On Hand'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'একক' : 'Unit'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'একক বেস খরচ' : 'Unit Base Cost'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'বিক্রয় দর' : 'Selling Rate'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'মোট মূল্যায়ন' : 'Total Valuation'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredReadyProducts.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো রেডি পণ্যের স্টক রেকর্ড পাওয়া যায়নি।' : 'No ready products stock recorded.'}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {isBn ? 'রোল-আপ স্ট্যান্ডি, এক্স-স্ট্যান্ড এবং ডিসপ্লে হার্ডওয়্যার এখানে স্টক হিসাব করা হয়।' : 'Ready products like roll-up standees, X-stands, and POP hardware are managed here.'}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsReceiveStockOpen(true)}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer font-semibold"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {isBn ? 'স্টক রিসিভ (GRN)' : 'Receive Stock (GRN)'}
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
                        const totalBalanceQty = locBalances.reduce((sum, b) => sum + (Number(b.available_quantity ?? (b as any).quantity) || 0), 0)

                        const matchingLedgerEntries = ledger.filter(
                          (l) => l.material_id === p.id || (p.sku && ((l as any).material_sku?.toLowerCase() === p.sku.toLowerCase() || l.material?.sku?.toLowerCase() === p.sku.toLowerCase())) || (matchingMat && l.material_id === matchingMat.id)
                        )
                        const latestLedgerEntry = matchingLedgerEntries.length > 0 ? matchingLedgerEntries[matchingLedgerEntries.length - 1] : null
                        const ledgerStock = latestLedgerEntry && latestLedgerEntry.balance_after !== undefined && latestLedgerEntry.balance_after !== null && !isNaN(Number(latestLedgerEntry.balance_after))
                          ? Number(latestLedgerEntry.balance_after)
                          : null

                        const rawFormula = (p as any).pricing_formula
                        const formula =
                          typeof rawFormula === 'object' && rawFormula !== null
                            ? rawFormula
                            : typeof rawFormula === 'string' && rawFormula.trim()
                            ? (() => {
                                try {
                                  return JSON.parse(rawFormula)
                                } catch {
                                  return {}
                                }
                              })()
                            : {}

                        const candidateStocks = [
                          Number(p.current_stock),
                          Number(p.stock),
                          Number(formula.current_stock),
                          Number(formula.stock),
                          Number(p.opening_stock),
                          Number(formula.opening_stock),
                          Number((p.material_config as any)?.opening_stock),
                          Number((p.material_config as any)?.current_stock),
                          Number(matchingMat?.current_stock),
                        ]
                        const positiveDirectStock = candidateStocks.find((v) => !isNaN(v) && v > 0)

                        const stockQty = totalBalanceQty > 0
                          ? totalBalanceQty
                          : ledgerStock !== null && ledgerStock > 0
                          ? ledgerStock
                          : positiveDirectStock !== undefined
                          ? positiveDirectStock
                          : (ledgerStock !== null ? ledgerStock : (Number(p.current_stock) || Number(formula.current_stock) || Number(p.opening_stock) || Number(formula.opening_stock) || 0))

                        const cost = Number(
                          p.base_cost ||
                          p.purchase_price ||
                          (p as any).cost_per_unit ||
                          matchingMat?.average_cost ||
                          matchingMat?.last_purchase_price ||
                          formula.base_cost ||
                          formula.purchase_price ||
                          (p.material_config as any)?.purchase_price ||
                          0
                        )

                        const sellingRate = Number(
                          p.selling_price ||
                          p.price_tiers?.retail ||
                          (p as any).retail_price ||
                          (p as any).price ||
                          formula.selling_price ||
                          formula.price ||
                          0
                        )

                        const totalValuation = stockQty * cost
                        const reorderPoint = Number(p.reorder_level || p.min_stock_level || formula.reorder_level || formula.min_stock_level || matchingMat?.reorder_level || matchingMat?.min_stock_level || 0)
                        const isOut = stockQty <= 0
                        const isLow = !isOut && reorderPoint > 0 && stockQty <= reorderPoint

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                              {p.name_bn && <div className="text-[11px] text-slate-400 font-bengali font-normal mt-0.5">{p.name_bn}</div>}
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5 font-medium">SKU: {p.sku}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {p.dimensions_spec || p.material_spec || 'Standard Spec'}
                              </div>
                              {(p.min_order_quantity || (p as any).moq) && (
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">MOQ: {p.min_order_quantity || (p as any).moq}</div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap">
                              {stockQty <= 0 ? (
                                <span className="text-slate-400 font-bold">0</span>
                              ) : (
                                <span className="text-slate-900 dark:text-white font-extrabold">{stockQty.toLocaleString()}</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold uppercase text-[10px] border border-slate-200 dark:border-slate-700">
                                {p.selling_unit || p.unit || 'pcs'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap font-medium">
                              <CurrencyDisplay amount={cost} />
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                              <CurrencyDisplay amount={sellingRate} />
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                              {totalValuation > 0 ? (
                                <span className="font-extrabold text-slate-900 dark:text-white"><CurrencyDisplay amount={totalValuation} /></span>
                              ) : (
                                <span className="text-slate-400 font-medium"><CurrencyDisplay amount={0} /></span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {isOut ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span>{isBn ? 'স্টক শেষ' : 'Out of Stock'}</span>
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                  <span>{isBn ? 'কম স্টক' : 'Low Stock'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{isBn ? 'স্টকে আছে' : 'In Stock'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
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
                                  className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 font-semibold cursor-pointer"
                                >
                                  {isBn ? 'রিসিভ' : 'Receive'}
                                </Button>
                                <Link href={getTenantNavHref(`/products/${p.id}`, pathname, slug)}>
                                  <Button size="sm" variant="outline" className="h-7 px-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer">
                                    <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                    {isBn ? 'দেখুন' : 'View'}
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
            {/* Rolls Filter & Control Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={isBn ? 'এসকেইউ, মেটেরিয়াল, সাইজ (উদাঃ 2ft, 5.25ft, 164ft) বা লোকেশন খুঁজুন...' : 'Search SKU, material, width (e.g. 2ft, 5.25ft, 3ft), length or location...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                  {/* View Mode Toggle: Grouped vs Serialized */}
                  <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setRollViewMode('grouped')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-bold transition-all text-xs cursor-pointer',
                        rollViewMode === 'grouped'
                          ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      )}
                    >
                      {isBn ? 'গ্রুপ অনুযায়ী সাইজ' : 'Grouped by Size'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRollViewMode('serialized')}
                      className={cn(
                        'px-2.5 py-1 rounded-md font-bold transition-all text-xs cursor-pointer',
                        rollViewMode === 'serialized'
                          ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      )}
                    >
                      {isBn ? 'সিরিয়ালাইজড রোল' : 'Serialized Rolls'}
                    </button>
                  </div>

                  {/* Status Filters */}
                  <div className="flex items-center gap-1 overflow-x-auto shrink-0">
                    {[
                      { id: 'all', label: isBn ? 'সকল' : 'All Rolls' },
                      { id: 'available', label: isBn ? 'স্টকে আছে' : 'Available' },
                      { id: 'mounted', label: isBn ? 'মাউন্ট' : 'Mounted' },
                      { id: 'depleted', label: isBn ? 'শেষ' : 'Depleted' },
                    ].map((st) => (
                      <Button
                        key={st.id}
                        size="sm"
                        variant={selectedRollStatus === st.id ? 'default' : 'outline'}
                        onClick={() => setSelectedRollStatus(st.id)}
                        className="text-xs h-8 px-2.5 cursor-pointer shrink-0"
                      >
                        {st.label}
                      </Button>
                    ))}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedMaterialForAction(null)
                      setFloorIssueMaterialId('')
                      setFloorIssueWidthFt(undefined)
                      setFloorIssueLengthFt(undefined)
                      setSelectedRequestForIssue(null)
                      setIsFloorIssueOpen(true)
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 px-3 cursor-pointer shrink-0 gap-1 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isBn ? 'ফ্লোরে রোল ইস্যু' : 'Issue Roll to Floor'}</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* ROLLS TABLE: GROUPED BY WIDTH & LENGTH (Default View) */}
            {rollViewMode === 'grouped' ? (
              <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'এসকেইউ (SKU)' : 'SKU'}</th>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'মেটেরিয়াল ও স্পেসিফিকেশন' : 'Material & Specs'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'প্রস্থ (Width)' : 'Width'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'দৈর্ঘ্য (Length)' : 'Length'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'ক্রয়মূল্য (Rate)' : 'Purchase Rate'}</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'পরিমাণ (Quantity)' : 'Quantity'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'মোট এরিয়া ও মূল্য' : 'Total Area & Value'}</th>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'লোকেশন' : 'Location'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredGroupedRolls.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-slate-500">
                            <Disc className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            <p className="font-bold">{isBn ? 'কোনো রোল পাওয়া যায়নি।' : 'No physical roll stock found.'}</p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {isBn ? 'নতুন রোল মেটেরিয়াল তৈরি করুন অথবা জিআরএন দিয়ে রিসিভ করুন।' : 'Add roll media materials with configured sizes or receive rolls via GRN.'}
                            </p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedMaterialForAction(null)
                                  setFloorIssueMaterialId('')
                                  setFloorIssueWidthFt(undefined)
                                  setFloorIssueLengthFt(undefined)
                                  setSelectedRequestForIssue(null)
                                  setIsFloorIssueOpen(true)
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                {isBn ? 'ফ্লোরে রোল ইস্যু' : 'Issue Roll to Floor'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsReceiveStockOpen(true)}
                                className="text-xs cursor-pointer font-semibold"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                {isBn ? 'জিআরএন দিয়ে রিসিভ' : 'Receive Stock via GRN'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredGroupedRolls.map((group) => {
                          const isExpanded = expandedGroupKeys.has(group.key)
                          const hasSerializedRolls = group.rolls && group.rolls.length > 0

                          return (
                            <React.Fragment key={group.key}>
                              <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-900/50 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {group.sku}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                                  <div className="flex items-start gap-2">
                                    <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                                      <Disc className="h-3.5 w-3.5" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="font-bold text-xs">{isBn && group.material_name_bn ? group.material_name_bn : group.material_name}</div>
                                      {group.material_name_bn && !isBn && (
                                        <div className="text-[10px] text-slate-400 font-normal">{group.material_name_bn}</div>
                                      )}
                                      <div className="flex flex-wrap items-center gap-1">
                                        {group.gsm > 0 && (
                                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                            {group.gsm} GSM
                                          </span>
                                        )}
                                        {group.finishing && group.finishing !== 'none' && (
                                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 capitalize">
                                            {group.finishing}
                                          </span>
                                        )}
                                        {group.allowance_ft > 0 && (
                                          <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                            +{group.allowance_ft}ft allow
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                                  {group.width_ft}ft
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                                  {group.length_ft}ft
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap text-xs">
                                  <CurrencyDisplay amount={group.purchase_price} />
                                </td>
                                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 font-mono shadow-2xs">
                                    {group.quantity_rolls} {group.quantity_rolls === 1 ? 'Roll' : 'Rolls'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap text-xs">
                                  <div className="font-black text-emerald-600 dark:text-emerald-400">
                                    {Math.round(group.total_area_sft).toLocaleString()} Sft
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-semibold">
                                    <CurrencyDisplay amount={group.total_valuation} />
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    <span>{group.location_name}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        const mat = group.material || materials.find((m) => m.id === group.material_id) || null
                                        setSelectedMaterialForAction(mat)
                                        setFloorIssueMaterialId(group.material_id)
                                        setFloorIssueWidthFt(group.width_ft)
                                        setFloorIssueLengthFt(group.length_ft)
                                        setSelectedRequestForIssue(null)
                                        setIsFloorIssueOpen(true)
                                      }}
                                      className="h-7 px-2.5 text-[11px] text-indigo-600 hover:bg-indigo-50 border-indigo-200 dark:border-indigo-800 font-bold cursor-pointer gap-1"
                                    >
                                      <Send className="h-3 w-3" />
                                      <span>{isBn ? 'ইস্যু' : 'Issue'}</span>
                                    </Button>

                                    {hasSerializedRolls && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setExpandedGroupKeys((prev) => {
                                            const next = new Set(prev)
                                            if (next.has(group.key)) next.delete(group.key)
                                            else next.add(group.key)
                                            return next
                                          })
                                        }}
                                        className="h-7 px-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                                        title={isExpanded ? 'Collapse serialized rolls' : 'Expand serialized rolls'}
                                      >
                                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* EXPANDABLE SERIALIZED ROLLS SUB-TABLE */}
                              {isExpanded && hasSerializedRolls && (
                                <tr className="bg-slate-50/80 dark:bg-slate-900/60">
                                  <td colSpan={9} className="py-3 px-6">
                                    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-3 space-y-2">
                                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 dark:text-slate-400">
                                        <span>Serialized Master Rolls ({group.rolls.length} items registered):</span>
                                        <span className="font-mono text-emerald-600 dark:text-emerald-400">{group.width_ft}ft × {group.length_ft}ft</span>
                                      </div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-[11px]">
                                          <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                                              <th className="py-1 px-2 font-semibold">Roll Code / Tag</th>
                                              <th className="py-1 px-2 text-right font-semibold">Remaining Length</th>
                                              <th className="py-1 px-2 text-right font-semibold">Current Area</th>
                                              <th className="py-1 px-2 font-semibold">Machine / Location</th>
                                              <th className="py-1 px-2 text-center font-semibold">Status</th>
                                              <th className="py-1 px-2 text-right font-semibold">Action</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                                            {group.rolls.map((r) => {
                                              const curLen = Number(r.current_length_ft ?? r.remaining_area_sft / (r.width_ft || 1))
                                              const area = Number(r.remaining_area_sft || curLen * r.width_ft)
                                              return (
                                                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900">
                                                  <td className="py-1.5 px-2 font-bold text-slate-900 dark:text-white">
                                                    {r.roll_code || r.roll_tag || r.id.slice(0, 8)}
                                                  </td>
                                                  <td className="py-1.5 px-2 text-right">
                                                    {curLen.toFixed(1)} ft
                                                  </td>
                                                  <td className="py-1.5 px-2 text-right text-emerald-600 font-bold">
                                                    {area.toFixed(1)} SFT
                                                  </td>
                                                  <td className="py-1.5 px-2 font-sans">
                                                    {r.mounted_machine_name || r.mounted_press_name ? (
                                                      <span className="text-blue-600 font-bold flex items-center gap-1">
                                                        <Cpu className="h-3 w-3" /> {r.mounted_machine_name || r.mounted_press_name}
                                                      </span>
                                                    ) : (
                                                      r.location_name || 'Main Warehouse'
                                                    )}
                                                  </td>
                                                  <td className="py-1.5 px-2 text-center font-sans">
                                                    <span className={cn(
                                                      'px-1.5 py-0.5 rounded text-[10px] font-bold',
                                                      r.status === 'mounted' ? 'bg-blue-50 text-blue-700' :
                                                      r.status === 'depleted' ? 'bg-rose-50 text-rose-700' :
                                                      'bg-emerald-50 text-emerald-700'
                                                    )}>
                                                      {r.status || 'available'}
                                                    </span>
                                                  </td>
                                                  <td className="py-1.5 px-2 text-right font-sans">
                                                    {r.status === 'mounted' ? (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleUnmountRoll(r)}
                                                        className="h-6 px-2 text-[10px] text-amber-700 hover:bg-amber-50"
                                                      >
                                                        Unmount
                                                      </Button>
                                                    ) : (
                                                      <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                          setRollToMount(r)
                                                          setSelectedMachineForMount(machines[0]?.id || '')
                                                          setIsMountModalOpen(true)
                                                        }}
                                                        className="h-6 px-2 text-[10px] text-blue-600 hover:bg-blue-50"
                                                      >
                                                        Mount
                                                      </Button>
                                                    )}
                                                  </td>
                                                </tr>
                                              )
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : (
              /* SERIALIZED INDIVIDUAL ROLLS TABLE */
              <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                      <tr>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রোল আইডি / কোড' : 'Roll ID / Code'}</th>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'মেটেরিয়াল নাম' : 'Material Name'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'প্রস্থ' : 'Nominal Width'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অবশিষ্ট দৈর্ঘ্য' : 'Remaining Length'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'বর্তমান এরিয়া' : 'Current Area'}</th>
                        <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'লোকেশন / প্রেস' : 'Location / Press'}</th>
                        <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredRolls.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            <Disc className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            <p className="font-bold">{isBn ? 'কোনো সিরিয়ালাইজড রোল পাওয়া যায়নি।' : 'No individual serialized rolls registered yet.'}</p>
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedMaterialForAction(null)
                                  setFloorIssueMaterialId('')
                                  setFloorIssueWidthFt(undefined)
                                  setFloorIssueLengthFt(undefined)
                                  setSelectedRequestForIssue(null)
                                  setIsFloorIssueOpen(true)
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                {isBn ? 'ফ্লোরে রোল ইস্যু' : 'Issue Roll to Floor'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredRolls.map((roll) => {
                          const currentLen = Number(roll.current_length_ft ?? roll.remaining_area_sft / (roll.width_ft || 1))
                          const area = Number(roll.remaining_area_sft || currentLen * roll.width_ft)

                          return (
                            <tr key={roll.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {roll.roll_code || roll.roll_tag || roll.id.slice(0, 8)}
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                                <div>{isBn && roll.material?.name_bn ? roll.material.name_bn : (roll.material?.name || 'Roll Media')}</div>
                                {roll.material?.sku && <div className="text-[10px] text-slate-400 font-mono font-normal">{roll.material.sku}</div>}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                {roll.width_ft} ft
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                <div>{currentLen.toFixed(2)} ft <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 font-sans">— 1 Pcs</span></div>
                                <div className="text-[10px] text-slate-400 font-normal font-sans">Initial: {roll.initial_length_ft} ft</div>
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-black whitespace-nowrap">
                                {area.toFixed(1)} SFT
                              </td>
                              <td className="py-3.5 px-4">
                                {roll.mounted_machine_name || roll.mounted_press_name ? (
                                  <span className="inline-flex items-center gap-1.5 font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800 whitespace-nowrap text-xs">
                                    <Cpu className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                    {roll.mounted_machine_name || roll.mounted_press_name}
                                  </span>
                                ) : (
                                  <span className="text-slate-600 dark:text-slate-400 font-medium">
                                    {roll.location_name || 'Main Warehouse'}
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                {roll.status === 'available' || roll.status === 'in_warehouse' || !roll.status ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span>{isBn ? 'অ্যাভেইলেবল' : 'Available'}</span>
                                  </span>
                                ) : roll.status === 'mounted' || roll.status === 'in_use' || roll.status === 'on_floor' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                                    <span>{isBn ? 'মেশিনে মাউন্ট' : 'Mounted / In Use'}</span>
                                  </span>
                                ) : roll.status === 'depleted' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <span>{isBn ? 'শেষ হয়েছে' : 'Depleted'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 whitespace-nowrap shadow-2xs">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                    <span>{roll.status}</span>
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {roll.status === 'mounted' || roll.mounted_machine_id ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleUnmountRoll(roll)}
                                      className="h-7 px-2.5 text-[11px] text-amber-700 dark:text-amber-300 hover:bg-amber-50 border-amber-300 dark:border-amber-700 font-semibold cursor-pointer"
                                      title="Unmount from machine back to warehouse"
                                    >
                                      {isBn ? 'আনমাউন্ট' : 'Unmount'}
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
                                      className="h-7 px-2.5 text-[11px] text-blue-600 dark:text-blue-400 hover:bg-blue-50 border-blue-300 dark:border-blue-700 font-semibold cursor-pointer"
                                      title="Mount onto printing or fabrication machine"
                                    >
                                      <Cpu className="h-3 w-3 mr-1" />
                                      {isBn ? 'মাউন্ট' : 'Mount'}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedRollForAction(roll)
                                      setIsConsumptionOpen(true)
                                    }}
                                    className="h-7 px-2.5 text-[11px] text-purple-600 hover:bg-purple-50 border-purple-200 dark:border-purple-800 font-semibold cursor-pointer"
                                  >
                                    <Scissors className="h-3 w-3 mr-1" />
                                    {isBn ? 'কাট / সাইন-অফ' : 'Cut / Sign-Off'}
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
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 4: FLOOR MATERIAL REQUESTS TAB */}
        {/* ========================================================= */}
        {currentView === 'requests' && (
          <div className="space-y-4">
            <Card className="p-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={isBn ? 'রিকোয়েস্ট নম্বর, টাস্ক নাম, আবেদনকারীর নাম খুঁজুন...' : 'Search request number, task title, requested by...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsRequestOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {isBn ? '+ নতুন মেটেরিয়াল রিকোয়েস্ট' : '+ New Material Request'}
                </Button>
              </div>
            </Card>

            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রিকোয়েস্ট #' : 'Request #'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'প্রোডাকশন টাস্ক' : 'Production Task'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'আবেদনকারী' : 'Requested By'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'অগ্রাধিকার' : 'Priority'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'আইটেম সংখ্যা' : 'Items Count'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'তারিখ' : 'Date'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Send className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো মেটেরিয়াল রিক্যুইজিশন পাওয়া যায়নি।' : 'No material requisitions found.'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {req.request_number}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {req.production_task?.title || 'Production Task'}
                            </div>
                            {req.production_task?.task_code && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.production_task.task_code}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-medium">
                            {req.requested_by_name}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
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
                          <td className="py-3.5 px-4 font-mono text-xs text-center whitespace-nowrap">
                            {req.items?.length || 1} items
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(req.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {req.status === 'approved' || req.status === 'issued' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{req.status === 'issued' ? (isBn ? 'ইস্যুকৃত' : 'Issued') : (isBn ? 'অনুমোদিত' : 'Approved')}</span>
                              </span>
                            ) : req.status === 'rejected' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                <span>{isBn ? 'বাতিলকৃত' : 'Rejected'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 animate-pulse" />
                                <span>{isBn ? 'অনুরোধকৃত' : 'Requested'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {req.status === 'requested' && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => handleApproveRequest(req.id)}
                                    className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                                  >
                                    {isBn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="h-7 px-2.5 text-[11px] text-rose-600 hover:bg-rose-50 border-rose-200 font-semibold cursor-pointer"
                                  >
                                    {isBn ? 'বাতিল' : 'Reject'}
                                  </Button>
                                </>
                              )}
                              {req.status === 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequestForIssue(req)
                                    setFloorIssueMaterialId(req.items?.[0]?.material_id || '')
                                    setIsFloorIssueOpen(true)
                                  }}
                                  className="h-7 px-2.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  {isBn ? 'স্টক ইস্যু করুন' : 'Issue Stock'}
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
            <Card className="p-3.5 shadow-xs">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder={isBn ? 'রেমন্যান্ট কোড, প্যারেন্ট সাবস্ট্রেট, লোকেশন খুঁজুন...' : 'Search remnant code, parent substrate, location...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-xs h-9"
                />
              </div>
            </Card>

            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রেমন্যান্ট কোড' : 'Remnant Code'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'প্যারেন্ট সাবস্ট্রেট' : 'Parent Substrate'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'পরিমাপ (W × L)' : 'Dimensions (W × L)'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'হিসাবকৃত এরিয়া' : 'Calculated Area'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'স্টোর লোকেশন' : 'Store Location'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'কন্ডিশন' : 'Condition'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRemnants.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Scissors className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো অফ-কাট বা রেমন্যান্ট রেকর্ড নেই।' : 'No off-cuts or remnants currently logged.'}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {isBn ? 'কাটিং সাইন-অফ করার সময় স্বয়ংক্রিয়ভাবে রেমন্যান্ট সেভ হয়।' : 'Remnants are automatically saved when logging large format cutting sign-offs.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredRemnants.map((rem) => {
                        const area = Number(rem.area_sft || (rem.width * rem.length))

                        return (
                          <tr key={rem.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {rem.remnant_code}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                              {rem.parent_material?.name || 'Raw Material'}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                              {rem.width} {rem.dimension_unit} × {rem.length} {rem.dimension_unit}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-black text-purple-600 whitespace-nowrap">
                              {area.toFixed(1)} SFT
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 font-medium">
                              {rem.location?.location_name || 'Remnant Rack'}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {rem.condition?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              {rem.status === 'available' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span>{isBn ? 'অ্যাভেইলেবল' : 'Available'}</span>
                                </span>
                              ) : rem.status === 'consumed' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                  <span>{isBn ? 'ব্যবহার হয়েছে' : 'Consumed'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 whitespace-nowrap shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                                  <span>{isBn ? 'স্ক্র্যাপ' : 'Scrapped'}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {rem.status === 'available' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleRemnantStatusChange(rem.id, 'consumed')}
                                      className="h-7 px-2.5 text-[11px] text-blue-600 hover:bg-blue-50 border-blue-200 font-semibold cursor-pointer"
                                    >
                                      {isBn ? 'ব্যবহার করুন' : 'Use in Job'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleRemnantStatusChange(rem.id, 'scrapped')}
                                      className="h-7 px-2 text-[11px] text-rose-500 hover:bg-rose-50 font-semibold cursor-pointer"
                                    >
                                      {isBn ? 'স্ক্র্যাপ' : 'Scrap'}
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
            <Card className="p-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={isBn ? 'লোকেশন কোড, নাম, ধরন খুঁজুন...' : 'Search location code, name, type...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsNewLocationOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {isBn ? '+ স্টোর লোকেশন যোগ করুন' : '+ Add Store Location'}
                </Button>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.length === 0 ? (
                <div className="col-span-full p-12 text-center text-slate-500">
                  <MapPin className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                  <p className="font-bold">{isBn ? 'কোনো স্টোর লোকেশন পাওয়া যায়নি।' : 'No store locations found.'}</p>
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
                      <span className="text-slate-400">{isBn ? 'স্ট্যাটাস:' : 'Status:'}</span>
                      <span className="font-bold text-emerald-600">{isBn ? 'সক্রিয় লোকেশন' : 'Active Location'}</span>
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
            <Card className="p-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={isBn ? 'পিও নম্বর, সরবরাহকারীর নাম, নোট খুঁজুন...' : 'Search PO number, supplier name, notes...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: isBn ? 'সকল পিও' : 'All POs' },
                    { id: 'issued', label: isBn ? 'ইস্যুকৃত' : 'Issued' },
                    { id: 'partially_received', label: isBn ? 'আংশিক' : 'Partial' },
                    { id: 'received', label: isBn ? 'রিসিভড' : 'Received' },
                  ].map((st) => (
                    <Button
                      key={st.id}
                      size="sm"
                      variant={selectedPoStatus === st.id ? 'default' : 'outline'}
                      onClick={() => setSelectedPoStatus(st.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0 font-medium"
                    >
                      {st.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* POs Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'পিও নম্বর' : 'PO Number'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'সরবরাহকারী' : 'Supplier Name'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'পিও তারিখ' : 'PO Date'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'ডেলিভারি প্রত্যাশিত' : 'Expected Date'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'সর্বমোট' : 'Grand Total'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'বকেয়া' : 'Due Amount'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'অ্যাকশন' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো পারচেজ অর্ডার পাওয়া যায়নি।' : 'No purchase orders found.'}</p>
                          <Button
                            size="sm"
                            onClick={() => setIsNewPurchaseOpen(true)}
                            className="mt-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            {isBn ? 'পারচেজ অর্ডার তৈরি করুন' : 'Create Purchase Order'}
                          </Button>
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <Link href={getTenantNavHref(`/purchases/${po.id}`, pathname, slug)} className="hover:underline text-indigo-600 dark:text-indigo-400">
                              {po.po_number}
                            </Link>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {po.supplier_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{po.po_date}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{po.expected_delivery_date || '—'}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <CurrencyDisplay amount={po.grand_total} />
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                            <CurrencyDisplay amount={po.due_amount} />
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {po.status === 'received' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span>{isBn ? 'রিসিভড' : 'Received'}</span>
                              </span>
                            ) : po.status === 'partially_received' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                                <span>{isBn ? 'আংশিক রিসিভ' : 'Partially Received'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 whitespace-nowrap shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                <span>{isBn ? 'ইস্যুকৃত' : 'Issued'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {po.status !== 'received' && po.status !== 'cancelled' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedPoForReceive(po)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 px-2.5 text-[11px] text-emerald-600 hover:bg-emerald-50 border-emerald-200 font-semibold cursor-pointer"
                                >
                                  <Truck className="h-3 w-3 mr-1" />
                                  {isBn ? 'জিআরএন রিসিভ' : 'Receive GRN'}
                                </Button>
                              )}
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2 text-[11px] cursor-pointer">
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
            <Card className="p-4 border border-blue-200 dark:border-blue-900/50 bg-blue-50/10 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isBn ? `অপেক্ষমান ডেলিভারি চালান (${pendingInwardPOs.length})` : `Pending Inward Shipments (${pendingInwardPOs.length})`}
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => setIsReceiveStockOpen(true)}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {isBn ? 'ম্যানুয়াল জিআরএন এন্ট্রি' : 'Manual GRN Ingestion'}
                </Button>
              </div>

              {pendingInwardPOs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">{isBn ? 'রিসিভের জন্য কোনো অপেক্ষমান পিও নেই।' : 'No pending POs awaiting receipt.'}</p>
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
                        className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                      >
                        {isBn ? 'রিসিভ' : 'Receive'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Posted Goods Received Notes History */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="p-3.5 border-b bg-slate-50 dark:bg-slate-900/60 font-bold text-xs flex items-center justify-between">
                <span>{isBn ? 'সাম্প্রতিক রিসিভকৃত গুডস রিসিভড নোট (GRN)' : 'Recent Posted Goods Received Notes (GRN)'}</span>
                <span className="text-slate-400 font-normal">{goodsReceivedNotes.length} GRNs logged</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'জিআরএন নম্বর' : 'GRN Number'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'পিও রেফারেন্স' : 'PO Reference'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'সরবরাহকারী' : 'Supplier Name'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'চালান #' : 'Challan #'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রিসিভ তারিখ' : 'Received Date'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রিসিভকারী' : 'Received By'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'গৃহীত মূল্য' : 'Accepted Value'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {goodsReceivedNotes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Truck className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো জিআরএন পোস্ট করা হয়নি।' : 'No Goods Received Notes posted yet.'}</p>
                        </td>
                      </tr>
                    ) : (
                      goodsReceivedNotes.map((grn) => (
                        <tr key={grn.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            {grn.grn_number}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-indigo-600 whitespace-nowrap">
                            {grn.purchase_order_id ? 'PO' : 'Direct'}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                            {grn.supplier_name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-500 whitespace-nowrap">
                            {grn.challan_number || '—'}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">{grn.received_date}</td>
                          <td className="py-3.5 px-4 text-slate-500 font-medium">{grn.received_by_name}</td>
                          <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                            <CurrencyDisplay amount={grn.accepted_total || 0} />
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 whitespace-nowrap shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>{isBn ? 'পোস্টেড' : 'Posted'}</span>
                            </span>
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
            <Card className="p-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder={isBn ? 'মেটেরিয়াল, ইউজার, জব অর্ডার, রেফারেন্স আইডি খুঁজুন...' : 'Search material, user, job order, reference ID, notes...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: isBn ? 'সকল লেনদেন' : 'All Tx' },
                    { id: 'purchase', label: isBn ? 'ক্রয় (GRN)' : 'Purchases (GRN)' },
                    { id: 'issue', label: isBn ? 'ফ্লোর ইস্যু' : 'Floor Issues' },
                    { id: 'consumption', label: isBn ? 'কনজাম্পশন' : 'Consumptions' },
                    { id: 'remnant', label: isBn ? 'রেমন্যান্ট' : 'Remnants' },
                    { id: 'wastage', label: isBn ? 'ওয়েস্টেজ' : 'Waste' },
                    { id: 'adjustment', label: isBn ? 'এডজাস্টমেন্ট' : 'Adjustments' },
                  ].map((tx) => (
                    <Button
                      key={tx.id}
                      size="sm"
                      variant={selectedLedgerType === tx.id ? 'default' : 'outline'}
                      onClick={() => setSelectedLedgerType(tx.id)}
                      className="text-xs h-8 px-3 cursor-pointer shrink-0 font-medium"
                    >
                      {tx.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Ledger Table */}
            <Card className="overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/90 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold text-xs">
                    <tr>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'সময়' : 'Timestamp'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'মেটেরিয়াল / আইটেম' : 'Material / Item'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'লেনদেনের ধরন' : 'Transaction Type'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'পরিমাণ পরিবর্তন' : 'Quantity Change'}</th>
                      <th className="py-3.5 px-4 text-center whitespace-nowrap font-bold">{isBn ? 'একক' : 'Unit'}</th>
                      <th className="py-3.5 px-4 text-right whitespace-nowrap font-bold">{isBn ? 'পরবর্তী ব্যালেন্স' : 'Balance After'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'রেফারেন্স / ইউজার' : 'Reference / User'}</th>
                      <th className="py-3.5 px-4 text-left whitespace-nowrap font-bold">{isBn ? 'নোট' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">{isBn ? 'কোনো খতিয়ান রেকর্ড পাওয়া যায়নি।' : 'No stock ledger mutations found.'}</p>
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((entry) => {
                        const qtyChange = Number(entry.quantity_change || 0)
                        const isPositive = qtyChange > 0

                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors">
                            <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                              {entry.material_name || entry.material?.name || 'Stock Item'}
                            </td>
                            <td className="py-3.5 px-4">
                              {getLedgerTxBadge(entry.transaction_type)}
                            </td>
                            <td
                              className={cn(
                                'py-3.5 px-4 text-right font-black font-mono text-sm whitespace-nowrap',
                                isPositive ? 'text-emerald-600' : 'text-slate-900 dark:text-white'
                              )}
                            >
                              {isPositive ? `+${qtyChange.toLocaleString()}` : qtyChange.toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4 text-center whitespace-nowrap">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold uppercase text-[10px] border border-slate-200 dark:border-slate-700">
                                {entry.unit || 'pcs'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {Number(entry.balance_after || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-mono text-[10px] text-slate-600 dark:text-slate-400">
                                {entry.reference_id || '—'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {entry.performed_by_name || 'System'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate" title={entry.notes || ''}>
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

        {/* Unified Direct Material Issue & Print Floor Requisition Modal */}
        <IssueMasterRollModal
          open={isFloorIssueOpen}
          onOpenChange={(open) => {
            setIsFloorIssueOpen(open)
            if (!open) {
              setSelectedRequestForIssue(null)
              setFloorIssueMaterialId('')
              setSelectedMaterialForAction(null)
            }
          }}
          materials={materials}
          locations={locations}
          requests={requests}
          rolls={rolls}
          request={selectedRequestForIssue}
          initialMaterialId={floorIssueMaterialId || selectedMaterialForAction?.id}
          selectedMaterialId={floorIssueMaterialId || selectedMaterialForAction?.id}
          initialWidthFt={floorIssueWidthFt}
          initialLengthFt={floorIssueLengthFt}
          companyId={companyId}
          onSuccess={() => {
            showNotification('Material issued to print floor successfully.')
            loadAllData(true)
          }}
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

