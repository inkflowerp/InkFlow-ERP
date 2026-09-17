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
  Clock,
  User,
  Crown,
  Calendar,
  Eye,
  FileSpreadsheet,
} from 'lucide-react'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'
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
} from '@/types/inventory.types'
import type { PurchaseOrderRecord, GoodsReceivedNoteRecord } from '@/types/purchase.types'
import type { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  approveMaterialRequestAction,
  rejectMaterialRequestAction,
  updateRemnantStatusAction,
  getInventoryDashboardDataAction,
} from '@/actions/inventory.actions'

// Modals
import { ReceiveStockModal } from '@/components/inventory/receive-stock-modal'
import { MaterialRequestModal } from '@/components/inventory/material-request-modal'
import { MaterialIssueModal } from '@/components/inventory/material-issue-modal'
import { LogConsumptionModal } from '@/components/inventory/log-consumption-modal'
import { StockTransferModal } from '@/components/inventory/stock-transfer-modal'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { NewLocationModal } from '@/components/inventory/new-location-modal'
import { NewPurchaseModal } from '@/components/purchases/new-purchase-modal'

export type InventoryViewTab = 'stock' | 'rolls' | 'purchases' | 'receiving' | 'ledger'

export default function UnifiedInventoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const companyId = company?.id || 'default'

  // URL-addressable view tab
  const rawView = searchParams.get('view')
  const currentView: InventoryViewTab = useMemo(() => {
    if (rawView === 'rolls') return 'rolls'
    if (rawView === 'purchases') return 'purchases'
    if (rawView === 'receiving') return 'receiving'
    if (rawView === 'ledger') return 'ledger'
    return 'stock'
  }, [rawView])

  const setViewTab = (tab: InventoryViewTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'stock') {
      params.delete('view')
    } else {
      params.set('view', tab)
    }
    const queryString = params.toString()
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false })
  }

  // Sub-tabs inside Stock view
  const [stockSubTab, setStockSubTab] = useState<'materials' | 'ready_products' | 'locations' | 'requests' | 'remnants'>('materials')

  // Core Data States
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [readyProducts, setReadyProducts] = useState<ProductRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [balances, setBalances] = useState<InventoryStockBalanceRecord[]>([])
  const [requests, setRequests] = useState<MaterialRequestRecord[]>([])
  const [issues, setIssues] = useState<MaterialIssueRecord[]>([])
  const [remnants, setRemnants] = useState<InventoryRemnantRecord[]>([])
  const [ledger, setLedger] = useState<StockLedgerRecord[]>([])
  const [rolls, setRolls] = useState<InventoryRollRecord[]>([])
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

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRollStatus, setSelectedRollStatus] = useState('all')
  const [selectedPoStatus, setSelectedPoStatus] = useState('all')
  const [selectedLedgerType, setSelectedLedgerType] = useState('all')
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('all')
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

  // Target items for contextual actions
  const [selectedMaterialForAction, setSelectedMaterialForAction] = useState<MaterialRecord | null>(null)
  const [selectedRollForAction, setSelectedRollForAction] = useState<InventoryRollRecord | null>(null)
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<PurchaseOrderRecord | null>(null)

  const productCheck = checkCanCreate('max_products')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAllData = async () => {
    setLoading(true)
    try {
      const res = await getInventoryDashboardDataAction(companyId)
      if (res.success && res.data) {
        setMaterials(res.data.materials || [])
        setLocations(res.data.locations || [])
        setBalances(res.data.balances || [])
        setRequests(res.data.requests || [])
        setIssues(res.data.issues || [])
        setRemnants(res.data.remnants || [])
        setLedger(res.data.ledger || [])
        setRolls(res.data.rolls || [])
        setOrders(res.data.orders || [])
        setGoodsReceivedNotes(res.data.goodsReceivedNotes || [])
        setReadyProducts(res.data.readyProducts || [])
        if (res.data.summary) {
          setSummary(res.data.summary)
        }
      }
    } catch (err: any) {
      console.error('Failed to load inventory data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
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
        (m.brand && m.brand.toLowerCase().includes(q))
      return matchCat && matchSearch
    })
  }, [materials, selectedCategory, search])

  // Filtered Ready Products
  const filteredReadyProducts = useMemo(() => {
    return readyProducts.filter((p) => {
      const q = search.trim().toLowerCase()
      return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
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

  // Handlers for Request Actions
  const handleApproveRequest = async (id: string) => {
    const res = await approveMaterialRequestAction(id, companyId)
    if (res.success) {
      showNotification('Material request approved.')
      loadAllData()
    } else {
      showNotification(`Failed: ${res.error}`)
    }
  }

  const handleRejectRequest = async (id: string) => {
    const reason = window.prompt('Enter rejection reason:')
    if (!reason) return
    const res = await rejectMaterialRequestAction(id, reason, companyId)
    if (res.success) {
      showNotification('Material request rejected.')
      loadAllData()
    } else {
      showNotification(`Failed: ${res.error}`)
    }
  }

  const handleRemnantStatusChange = async (id: string, status: any) => {
    const res = await updateRemnantStatusAction(id, status, companyId)
    if (res.success) {
      showNotification(`Remnant marked as ${status}.`)
      loadAllData()
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
    if (t.includes('issue')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800">
          <Send className="h-3 w-3" /> Issued to Floor
        </span>
      )
    }
    if (t.includes('consumption')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
          <Scissors className="h-3 w-3" /> Actual Consumption
        </span>
      )
    }
    if (t.includes('remnant') || t.includes('return')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
          <Sparkles className="h-3 w-3" /> Remnant Restock
        </span>
      )
    }
    if (t.includes('waste') || t.includes('scrap')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
          <RotateCcw className="h-3 w-3" /> Waste / Scrap
        </span>
      )
    }
    if (t.includes('adjustment')) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
          Audit Adjustment
        </span>
      )
    }
    return (
      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {type || 'Movement'}
      </span>
    )
  }

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6 max-w-7xl pb-16">
        {/* ========================================================= */}
        {/* UNIFIED PAGE HEADER & PRIMARY WORKSPACE ACTIONS */}
        {/* ========================================================= */}
        <PageHeader
          titleEn="Inventory & Store Workspace"
          titleBn="ইনভেন্টরি ও স্টোর হাব"
          descriptionEn="Consolidated control center for raw materials, physical rolls, procurement, goods receiving (GRN), and stock audit."
          descriptionBn="কাঁচামাল, রোল ইনভেন্টরি, কেনাকাটা (PO), রিসিভিং (GRN) এবং স্টক লেজারের একীভূত কর্মক্ষেত্র।"
          icon={Boxes}
          iconColor="text-emerald-600"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferOpen(true)}
                className="text-xs h-9"
              >
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                Transfer
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentOpen(true)}
                className="text-xs h-9"
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                Adjust Stock
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsIssueOpen(true)}
                className="text-xs h-9"
              >
                <Send className="mr-1.5 h-3.5 w-3.5 text-indigo-600" />
                Issue to Floor
              </Button>

              <Button
                size="sm"
                onClick={() => setIsNewPurchaseOpen(true)}
                className="bg-violet-600 hover:bg-violet-700 text-xs text-white h-9 shadow-sm"
              >
                <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
                + New Purchase Order
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedMaterialForAction(null)
                  setIsReceiveStockOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white h-9 shadow-sm"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                + Receive Stock (GRN)
              </Button>
            </div>
          }
        />

        {/* Notification Toast Alert */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5-TAB PRIMARY WORKSPACE NAVIGATION (URL ADDRESSABLE) */}
        {/* ========================================================= */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'stock', label: 'Stock Balances', labelBn: 'স্টক ব্যালেন্স', icon: Package, count: materials.length + readyProducts.length },
            { id: 'rolls', label: 'Physical Rolls', labelBn: 'রোল তালিকা', icon: Disc, count: rolls.length },
            { id: 'purchases', label: 'Purchase Orders', labelBn: 'কেনাকাটা (PO)', icon: ShoppingBag, count: orders.length },
            { id: 'receiving', label: 'Receiving (GRN)', labelBn: 'রিসিভিং (GRN)', icon: Truck, count: pendingInwardPOs.length, alert: pendingInwardPOs.length > 0 },
            { id: 'ledger', label: 'Stock Ledger', labelBn: 'স্টক খতিয়ান', icon: FileText, count: ledger.length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = currentView === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id as InventoryViewTab)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm ring-2 ring-slate-900/10 dark:ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400')} />
                <span>{tBilingual(tab.label, tab.labelBn)}</span>
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                      tab.alert
                        ? 'bg-amber-500 text-white'
                        : isActive
                        ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: STOCK BALANCES & MATERIAL MASTERS */}
        {/* ========================================================= */}
        {currentView === 'stock' && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-emerald-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Total Stock Value</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  <CurrencyDisplay amount={summary.totalAvailableStockValue} />
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">{materials.length} Materials + {readyProducts.length} Products</span>
              </Card>

              <Card className={cn('p-3.5 border-l-4', lowStockMaterials.length > 0 ? 'border-l-amber-500 bg-amber-50/10' : 'border-l-slate-300')}>
                <span className="text-[11px] font-semibold text-slate-500">Low Stock Warning</span>
                <div className="text-xl font-black text-amber-600 mt-0.5">{lowStockMaterials.length}</div>
                <span className="text-[10px] text-amber-600 font-medium">Below reorder point</span>
              </Card>

              <Card className={cn('p-3.5 border-l-4', outOfStockMaterials.length > 0 ? 'border-l-red-500 bg-red-50/10' : 'border-l-slate-300')}>
                <span className="text-[11px] font-semibold text-slate-500">Out of Stock</span>
                <div className="text-xl font-black text-red-600 mt-0.5">{outOfStockMaterials.length}</div>
                <span className="text-[10px] text-red-600 font-medium">Zero warehouse stock</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-blue-500 bg-blue-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Pending Inward</span>
                <div className="text-xl font-black text-blue-600 mt-0.5">{pendingInwardPOs.length} POs</div>
                <span className="text-[10px] text-blue-600 font-medium">Awaiting GRN receipt</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-purple-500 bg-purple-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Usable Remnants</span>
                <div className="text-xl font-black text-purple-600 mt-0.5">{remnants.length}</div>
                <span className="text-[10px] text-purple-600 font-medium">Available offcuts</span>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="p-3.5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search material/product name, SKU, brand, Bengali Unicode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs h-9"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                  {[
                    { id: 'all', label: 'All Media' },
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
                      className="text-xs h-8 px-3"
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
                      <th className="p-3">Item / Material</th>
                      <th className="p-3">Category / Type</th>
                      <th className="p-3 text-right">Available Stock</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3 text-right">Unit Avg Cost</th>
                      <th className="p-3 text-right">Total Valuation</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredMaterials.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500">
                          <Package className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                          <p className="font-bold">No stock items match your search.</p>
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
                        const avgCost = Number(mat.average_cost || 0)

                        return (
                          <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                <span>{mat.name}</span>
                                {mat.name_bn && <span className="text-[11px] text-slate-400 font-normal">({mat.name_bn})</span>}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono">SKU: {mat.sku}</div>
                            </td>
                            <td className="p-3">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {mat.category?.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-right font-black font-mono text-sm text-slate-900 dark:text-white">
                              {stockQty.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-500 uppercase font-mono font-bold text-[11px]">
                              {mat.unit}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-300">
                              <CurrencyDisplay amount={avgCost} />
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              <CurrencyDisplay amount={stockQty * avgCost} />
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
        {/* VIEW 2: PHYSICAL ROLLS TRACKER */}
        {/* ========================================================= */}
        {currentView === 'rolls' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3.5 border-l-4 border-l-indigo-600 bg-indigo-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Active Physical Rolls</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{rolls.length}</div>
                <span className="text-[10px] text-indigo-600 font-medium">Discrete tracked rolls</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-emerald-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Available in Warehouse</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {rolls.filter((r) => r.status === 'available').length}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Ready for job mounting</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-blue-500 bg-blue-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Mounted on Press</span>
                <div className="text-xl font-black text-blue-600 mt-0.5">
                  {rolls.filter((r) => r.status === 'mounted' || r.status === 'in_use').length}
                </div>
                <span className="text-[10px] text-blue-600 font-medium">Currently printing</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-purple-500 bg-purple-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Usable Remnants Rack</span>
                <div className="text-xl font-black text-purple-600 mt-0.5">{remnants.length}</div>
                <span className="text-[10px] text-purple-600 font-medium">Offcuts $\ge$ usable width</span>
              </Card>
            </div>

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
                      className="text-xs h-8 px-3"
                    >
                      {st.label}
                    </Button>
                  ))}
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
                            Physical rolls are automatically created when receiving roll media in GRN.
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setIsReceiveStockOpen(true)}
                            className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Receive Roll via GRN
                          </Button>
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
                              {currentLen.toFixed(1)} ft / {roll.initial_length_ft} ft
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-black">
                              {area.toFixed(1)} SFT
                            </td>
                            <td className="p-3 text-slate-500">
                              {roll.location_name || roll.mounted_press_name || 'Main Warehouse'}
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedRollForAction(roll)
                                  setIsConsumptionOpen(true)
                                }}
                                className="h-7 px-2.5 text-[11px] text-purple-600 hover:bg-purple-50"
                              >
                                <Scissors className="h-3 w-3 mr-1" />
                                Cut / Sign-Off
                              </Button>
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
        {/* VIEW 3: PURCHASES VIEW (PURCHASE ORDERS) */}
        {/* ========================================================= */}
        {currentView === 'purchases' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-3.5 border-l-4 border-l-violet-600 bg-violet-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Total Purchase Orders</span>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{orders.length}</div>
                <span className="text-[10px] text-violet-600 font-medium">Recorded POs</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-blue-500 bg-blue-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Awaiting Delivery</span>
                <div className="text-xl font-black text-blue-600 mt-0.5">
                  {orders.filter((p) => p.status === 'issued' || p.status === 'approved').length}
                </div>
                <span className="text-[10px] text-blue-600 font-medium">In transit from vendor</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-amber-500 bg-amber-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Partially Received</span>
                <div className="text-xl font-black text-amber-600 mt-0.5">
                  {orders.filter((p) => p.status === 'partially_received').length}
                </div>
                <span className="text-[10px] text-amber-600 font-medium">Partial shipments arrived</span>
              </Card>

              <Card className="p-3.5 border-l-4 border-l-emerald-600 bg-emerald-50/10">
                <span className="text-[11px] font-semibold text-slate-500">Fully Received</span>
                <div className="text-xl font-black text-emerald-600 mt-0.5">
                  {orders.filter((p) => p.status === 'received').length}
                </div>
                <span className="text-[10px] text-emerald-600 font-medium">Completed & in stock</span>
              </Card>
            </div>

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
                      className="text-xs h-8 px-3"
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
                            <Link href={`/${slug}/purchases/${po.id}`} className="hover:underline text-indigo-600 dark:text-indigo-400">
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
                                <Link href={`/${slug}/purchases/${po.id}`}>
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
        {/* VIEW 4: RECEIVING VIEW (GOODS RECEIVED NOTES / INWARD) */}
        {/* ========================================================= */}
        {currentView === 'receiving' && (
          <div className="space-y-6">
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
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
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
                      className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-center justify-between gap-2 shadow-sm"
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
        {/* VIEW 5: STOCK AUDIT LEDGER */}
        {/* ========================================================= */}
        {currentView === 'ledger' && (
          <div className="space-y-6">
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
                      className="text-xs h-8 px-3"
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
          locations={locations}
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

        <MaterialIssueModal
          open={isIssueOpen}
          onOpenChange={setIsIssueOpen}
          materials={materials}
          locations={locations}
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
            if (!open) setSelectedRollForAction(null)
          }}
          materials={materials}
          locations={locations}
          selectedMaterialId={selectedRollForAction?.material_id || selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Actual consumption recorded and remnants evaluated.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <StockTransferModal
          open={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          materials={materials}
          locations={locations}
          onSuccess={() => {
            showNotification('Stock transferred between locations successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <StockAdjustmentModal
          open={isAdjustmentOpen}
          onOpenChange={setIsAdjustmentOpen}
          materials={materials}
          locations={locations}
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
      </div>
    </FeatureGate>
  )
}
