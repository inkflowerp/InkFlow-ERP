'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
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
import { Crown } from 'lucide-react'
import {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  MaterialRequestRecord,
  MaterialIssueRecord,
  InventoryRemnantRecord,
  StockLedgerRecord,
  InventorySummaryStats,
  MaterialCategory,
  MaterialUnit,
} from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'
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

export default function InventoryDashboardPage() {
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const companyId = company?.id || 'default'

  const [activeTab, setActiveTab] = useState<
    'materials' | 'locations' | 'requests' | 'issues' | 'remnants' | 'ledger' | 'low_stock'
  >('materials')

  // Core Data States
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [balances, setBalances] = useState<InventoryStockBalanceRecord[]>([])
  const [requests, setRequests] = useState<MaterialRequestRecord[]>([])
  const [issues, setIssues] = useState<MaterialIssueRecord[]>([])
  const [remnants, setRemnants] = useState<InventoryRemnantRecord[]>([])
  const [ledger, setLedger] = useState<StockLedgerRecord[]>([])
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
  const [selectedLocationFilter, setSelectedLocationFilter] = useState('all')
  const [notification, setNotification] = useState<string | null>(null)

  // Modals state
  const [isReceiveStockOpen, setIsReceiveStockOpen] = useState(false)
  const [isRequestOpen, setIsRequestOpen] = useState(false)
  const [isIssueOpen, setIsIssueOpen] = useState(false)
  const [isConsumptionOpen, setIsConsumptionOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)
  const [isNewLocationOpen, setIsNewLocationOpen] = useState(false)

  // Target items for contextual actions
  const [selectedMaterialForAction, setSelectedMaterialForAction] = useState<MaterialRecord | null>(null)
  const [selectedRequestForIssue, setSelectedRequestForIssue] = useState<MaterialRequestRecord | null>(null)

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
        const {
          materials: matData,
          locations: locData,
          balances: balData,
          requests: reqData,
          issues: issData,
          remnants: remData,
          ledger: ledData,
          summary: sumData,
        } = res.data

        setMaterials(matData)
        setLocations(locData)
        setBalances(balData)
        setRequests(reqData)
        setIssues(issData)
        setRemnants(remData)
        setLedger(ledData)
        setSummary(sumData)
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
  const filteredMaterials = materials.filter((m) => {
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.name_bn && m.name_bn.includes(search)) ||
      (m.brand && m.brand.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  // Low stock materials
  const lowStockMaterials = materials.filter((m) => {
    const threshold = Number(m.reorder_level || m.min_stock_level || 0)
    return threshold > 0 && Number(m.current_stock || 0) <= threshold
  })

  // Filtered Ledger
  const filteredLedger = ledger.filter((l) => {
    if (selectedLocationFilter !== 'all' && l.location_id !== selectedLocationFilter) return false
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (l.material?.name && l.material.name.toLowerCase().includes(q)) ||
      (l.material?.sku && l.material.sku.toLowerCase().includes(q)) ||
      (l.transaction_type && l.transaction_type.toLowerCase().includes(q)) ||
      (l.notes && l.notes.toLowerCase().includes(q))
    )
  })

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

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <PageHeader
          titleEn="Advanced Inventory Management Hub"
          titleBn="উন্নত ইনভেন্টরি ও কাঁচামাল হাব"
          descriptionEn="Multi-store locations, physical stock movements, requisition & issue approvals, consumption sign-off, and reusable remnants."
          descriptionBn="মাল্টি-স্টোর লোকেশন, স্টক মুভমেন্ট, রিকুইজিশন ও ইস্যু অনুমোদন, অপচয় এবং অবশিষ্টাংশ ট্র্যাকিং।"
          icon={Boxes}
          iconColor="text-emerald-600"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferOpen(true)}
                className="text-xs"
              >
                <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                Transfer
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdjustmentOpen(true)}
                className="text-xs"
              >
                <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                Reconcile
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsConsumptionOpen(true)}
                className="text-xs"
              >
                <Scissors className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                Sign-Off
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setSelectedMaterialForAction(null)
                  setIsReceiveStockOpen(true)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Receive GRN
              </Button>
            </div>
          }
        />

        {/* Plan Quota Alert */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-2.5">
            <div
              className={cn(
                'p-1.5 rounded-lg text-white font-bold shrink-0',
                productCheck.exceeded ? 'bg-red-500' : productCheck.warning ? 'bg-amber-500' : 'bg-emerald-600'
              )}
            >
              <Package className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">
                Inventory Catalog Quota: {materials.length} of {currentPlan.max_products.toLocaleString()} materials registered
              </div>
              <p className="text-[11px] text-slate-500">
                Active on {currentPlan.name}. Physical stock movements are audited immutably.
              </p>
            </div>
          </div>

          {currentPlan.code !== 'enterprise' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openUpgradeModal('business')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 shrink-0"
            >
              <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
              Expand Catalog Limit
            </Button>
          )}
        </div>

        {/* Notification Alert */}
        {notification && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Executive Valuation & KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-emerald-600">
            <span className="text-xs font-semibold text-slate-500">Total Stock Valuation</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              <CurrencyDisplay amount={summary.totalAvailableStockValue} />
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">{summary.totalMaterials} Material Masters</span>
          </Card>

          <Card
            className={cn(
              'p-4 border-l-4 cursor-pointer hover:shadow-md transition-all',
              summary.lowStockCount > 0 ? 'border-l-red-500 bg-red-50/20' : 'border-l-slate-300'
            )}
            onClick={() => setActiveTab('low_stock')}
          >
            <span className="text-xs font-semibold text-slate-500">Low Stock Warnings</span>
            <div className="text-2xl font-black text-red-600 mt-1">{summary.lowStockCount}</div>
            <span className="text-[11px] text-red-600 font-medium">Below reorder threshold</span>
          </Card>

          <Card
            className="p-4 border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setActiveTab('requests')}
          >
            <span className="text-xs font-semibold text-slate-500">Pending Requisitions</span>
            <div className="text-2xl font-black text-blue-600 mt-1">{summary.pendingRequestsCount}</div>
            <span className="text-[11px] text-blue-600 font-medium">Awaiting store approval / issue</span>
          </Card>

          <Card
            className="p-4 border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition-all"
            onClick={() => setActiveTab('remnants')}
          >
            <span className="text-xs font-semibold text-slate-500">Reusable Remnants</span>
            <div className="text-2xl font-black text-purple-600 mt-1">{summary.totalRemnantsCount}</div>
            <span className="text-[11px] text-purple-600 font-medium">Available offcut inventory</span>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2">
          {[
            { id: 'materials', label: 'Materials Master', count: materials.length },
            { id: 'locations', label: 'Store Balances', count: locations.length },
            { id: 'requests', label: 'Requisitions Queue', count: requests.length },
            { id: 'issues', label: 'Issue History', count: issues.length },
            { id: 'remnants', label: 'Remnants Rack', count: remnants.length },
            { id: 'ledger', label: 'Movement Ledger', count: ledger.length },
            { id: 'low_stock', label: 'Low Stock Alerts', count: lowStockMaterials.length, alert: lowStockMaterials.length > 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    tab.alert
                      ? 'bg-red-500 text-white font-black'
                      : activeTab === tab.id
                      ? 'bg-slate-700 text-slate-200 dark:bg-slate-200 dark:text-slate-800'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: MATERIALS MASTER */}
        {/* ========================================================= */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            {/* Search & Categories Filter */}
            <Card className="p-3.5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by SKU, material name, brand, Bengali Unicode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
                  {[
                    { id: 'all', label: 'All Categories' },
                    { id: 'flex', label: 'Flex' },
                    { id: 'vinyl', label: 'Vinyl' },
                    { id: 'acrylic', label: 'Acrylic' },
                    { id: 'pvc', label: 'PVC' },
                    { id: 'ink', label: 'Inks' },
                    { id: 'lamination_film', label: 'Lamination' },
                  ].map((tab) => (
                    <Button
                      key={tab.id}
                      size="sm"
                      variant={selectedCategory === tab.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(tab.id)}
                      className="text-xs h-8 px-3"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Materials Table */}
            <Card>
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Materials Catalog ({filteredMaterials.length})</CardTitle>
                  <Button size="sm" variant="ghost" onClick={loadAllData} className="h-7 text-xs">
                    <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4">SKU & Item Name</th>
                        <th className="py-3 px-4">Category & Brand</th>
                        <th className="py-3 px-4">Available Stock</th>
                        <th className="py-3 px-4">Dimensions / Specs</th>
                        <th className="py-3 px-4">Standard Cost</th>
                        <th className="py-3 px-4">Asset Value</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredMaterials.map((mat) => {
                        const isLow =
                          Number(mat.reorder_level || mat.min_stock_level || 0) > 0 &&
                          Number(mat.current_stock || 0) <= Number(mat.reorder_level || mat.min_stock_level || 0)
                        const val = (Number(mat.current_stock) || 0) * (Number(mat.average_cost) || 0)

                        return (
                          <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                            <td className="py-3.5 px-4">
                              <Link
                                href={`/${slug}/inventory/${mat.id}`}
                                className="font-mono text-xs font-bold text-blue-600 hover:underline"
                              >
                                {mat.sku}
                              </Link>
                              <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                                {mat.name}
                              </div>
                              {mat.name_bn && (
                                <div className="text-[11px] text-slate-400 font-normal">{mat.name_bn}</div>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {mat.category.replace('_', ' ')}
                              </span>
                              {mat.brand && <div className="text-[10px] text-slate-400 mt-0.5">{mat.brand}</div>}
                            </td>

                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                                  {mat.current_stock} {mat.unit}
                                </span>
                                {isLow && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 animate-pulse">
                                    <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Reorder: {mat.reorder_level || mat.min_stock_level || 0} {mat.unit}
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-xs font-mono">
                              {mat.is_roll && mat.roll_width_ft && mat.roll_length_ft ? (
                                <div>
                                  <strong className="text-slate-800 dark:text-slate-200">
                                    {mat.roll_width_ft * mat.roll_length_ft} SFT / roll
                                  </strong>
                                  <div className="text-[11px] text-slate-400">
                                    ({mat.roll_width_ft}ft × {mat.roll_length_ft}ft)
                                  </div>
                                </div>
                              ) : mat.thickness ? (
                                <div>
                                  <strong className="text-slate-800 dark:text-slate-200">{mat.thickness}</strong>
                                  {mat.color && <span className="text-slate-400"> ({mat.color})</span>}
                                </div>
                              ) : (
                                <span className="text-slate-400">Standard</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-xs font-mono font-bold text-slate-900 dark:text-white">
                              <CurrencyDisplay amount={mat.average_cost || mat.cost_per_unit || 0} />
                            </td>

                            <td className="py-3.5 px-4 font-mono font-black text-emerald-600 text-sm">
                              <CurrencyDisplay amount={val} />
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedMaterialForAction(mat)
                                    setIsReceiveStockOpen(true)
                                  }}
                                  className="h-7 text-[11px] px-2"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Receive
                                </Button>

                                <Link href={`/${slug}/inventory/${mat.id}`}>
                                  <Button size="sm" variant="ghost" className="h-7 text-[11px] px-2 text-blue-600">
                                    <ExternalLink className="h-3 w-3 mr-1" /> Details
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredMaterials.map((mat) => (
                    <div key={mat.id} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Link href={`/${slug}/inventory/${mat.id}`} className="font-mono text-xs font-bold text-blue-600">
                          {mat.sku}
                        </Link>
                        <span className="capitalize px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {mat.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{mat.name}</div>
                        {mat.name_bn && <div className="text-xs text-slate-400">{mat.name_bn}</div>}
                      </div>
                      <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Stock:</span>
                          <span className="font-mono font-bold text-sm">
                            {mat.current_stock} {mat.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Valuation:</span>
                          <span className="font-mono font-bold text-emerald-600 text-sm">
                            <CurrencyDisplay amount={mat.current_stock * (mat.average_cost || mat.cost_per_unit || 0)} />
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMaterialForAction(mat)
                            setIsReceiveStockOpen(true)
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          Receive
                        </Button>
                        <Link href={`/${slug}/inventory/${mat.id}`} className="flex-1">
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs text-blue-600">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: STORE LOCATIONS & BALANCES */}
        {/* ========================================================= */}
        {activeTab === 'locations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Warehouse Locations & Stock Breakdown</h3>
              <Button size="sm" onClick={() => setIsNewLocationOpen(true)} className="h-8 text-xs bg-emerald-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Location
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => {
                const locBalances = balances.filter((b) => b.location_id === loc.id)
                return (
                  <Card key={loc.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">{loc.location_name}</h4>
                          <span className="font-mono text-[11px] text-slate-400">{loc.location_code}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {loc.location_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="text-xs text-slate-500">
                      {loc.description || 'Designated storage facility for materials.'}
                    </div>

                    <div className="border-t pt-2 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Stock on Location ({locBalances.length})</span>
                      {locBalances.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No inventory stored in this location.</p>
                      ) : (
                        <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                          {locBalances.map((bal) => (
                            <div key={bal.id} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="font-medium text-slate-800 dark:text-slate-200">
                                {bal.material?.sku} - {bal.material?.name}
                              </span>
                              <strong className="font-mono text-emerald-600">
                                {bal.available_quantity} {bal.unit}
                              </strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: MATERIAL REQUISITIONS QUEUE */}
        {/* ========================================================= */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Material Requisitions Queue</h3>
              <Button size="sm" onClick={() => setIsRequestOpen(true)} className="h-8 text-xs bg-blue-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" /> New Requisition
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {requests.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No active material requests in queue.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requests.map((req) => (
                      <div key={req.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-mono text-xs font-bold text-blue-600">{req.request_number}</span>
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                              Requested by: {req.requested_by_name}
                              {req.production_task && ` for Task: ${req.production_task.title}`}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] font-bold uppercase',
                                req.priority === 'urgent' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-slate-100'
                              )}
                            >
                              {req.priority}
                            </Badge>
                            <Badge
                              className={cn(
                                'text-[10px] font-bold uppercase text-white',
                                req.status === 'approved'
                                  ? 'bg-blue-600'
                                  : req.status === 'issued'
                                  ? 'bg-emerald-600'
                                  : req.status === 'partially_issued'
                                  ? 'bg-amber-600'
                                  : req.status === 'rejected'
                                  ? 'bg-red-600'
                                  : 'bg-slate-600'
                              )}
                            >
                              {req.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        {/* Items list */}
                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                          {req.items?.map((it) => (
                            <div key={it.id} className="flex justify-between">
                              <span>
                                {it.material?.sku} - {it.material?.name}
                              </span>
                              <span className="font-mono">
                                Requested: <strong>{it.requested_quantity} {it.unit}</strong> | Issued:{' '}
                                <strong className="text-emerald-600">{it.issued_quantity || 0} {it.unit}</strong>
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          {req.status === 'requested' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectRequest(req.id)}
                                className="h-8 text-xs text-red-600 border-red-200"
                              >
                                <X className="h-3.5 w-3.5 mr-1" /> Reject
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleApproveRequest(req.id)}
                                className="h-8 text-xs bg-blue-600 text-white"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" /> Approve
                              </Button>
                            </>
                          )}

                          {(req.status === 'approved' || req.status === 'partially_issued') && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequestForIssue(req)
                                setIsIssueOpen(true)
                              }}
                              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Send className="h-3.5 w-3.5 mr-1" /> Issue Materials
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MATERIAL ISSUES HISTORY */}
        {/* ========================================================= */}
        {activeTab === 'issues' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Material Release & Issuance History</h3>
            <Card>
              <CardContent className="p-0">
                {issues.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">No material issuance records found.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {issues.map((iss) => (
                      <div key={iss.id} className="p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-xs font-bold text-emerald-600">{iss.issue_number}</span>
                            <div className="text-xs text-slate-500">
                              Issued by: <strong>{iss.issued_by_name}</strong> | Handed to:{' '}
                              <strong>{iss.received_by_name || 'Floor Operator'}</strong>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(iss.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                          {iss.items?.map((it) => (
                            <div key={it.id} className="flex justify-between">
                              <span>
                                {it.material?.sku} - {it.material?.name}
                              </span>
                              <strong className="font-mono text-emerald-600">
                                {it.issued_quantity} {it.unit}
                              </strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: REUSABLE REMNANTS RACK */}
        {/* ========================================================= */}
        {activeTab === 'remnants' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Discrete Reusable Remnants Rack</h3>
              <Button size="sm" onClick={() => setIsConsumptionOpen(true)} className="h-8 text-xs bg-purple-600 text-white">
                <Scissors className="h-3.5 w-3.5 mr-1" /> Log Offcut Remnant
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {remnants.map((rem) => (
                <Card key={rem.id} className="p-4 space-y-3 border-purple-200 dark:border-purple-900">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                      {rem.remnant_code}
                    </span>
                    <Badge
                      className={cn(
                        'text-[10px] uppercase font-bold text-white',
                        rem.status === 'available'
                          ? 'bg-emerald-600'
                          : rem.status === 'consumed'
                          ? 'bg-blue-600'
                          : 'bg-slate-600'
                      )}
                    >
                      {rem.status}
                    </Badge>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                      {rem.parent_material?.sku} - {rem.parent_material?.name}
                    </h4>
                    <div className="text-xs text-purple-700 dark:text-purple-300 font-mono font-bold mt-1">
                      Dimensions: {rem.width} × {rem.length} {rem.dimension_unit} ({rem.area_sft || rem.width * rem.length} SFT)
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 border-t pt-2">
                    <span>Rack: {rem.location?.location_name || 'Main Staging'}</span>
                    <span className="capitalize font-semibold">Condition: {rem.condition}</span>
                  </div>

                  {rem.status === 'available' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemnantStatusChange(rem.id, 'consumed')}
                        className="flex-1 h-8 text-xs"
                      >
                        Consume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemnantStatusChange(rem.id, 'scrapped')}
                        className="h-8 text-xs text-red-600"
                      >
                        Scrap
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: IMMUTABLE STOCK MOVEMENT LEDGER */}
        {/* ========================================================= */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Audited Stock Movement Ledger</h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedLocationFilter}
                  onChange={(e) => setSelectedLocationFilter(e.target.value)}
                  className="h-8 px-2 rounded border text-xs bg-white dark:bg-slate-900"
                >
                  <option value="all">All Locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.location_name}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="outline" onClick={loadAllData} className="h-8 text-xs">
                  <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b">
                      <tr>
                        <th className="py-3 px-4">Date & Time</th>
                        <th className="py-3 px-4">Material Master</th>
                        <th className="py-3 px-4">Event Type</th>
                        <th className="py-3 px-4">Movement Qty</th>
                        <th className="py-3 px-4">Balance After</th>
                        <th className="py-3 px-4">Actor / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredLedger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 text-xs">
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {new Date(item.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                            {item.material?.name || item.material_id}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cn(
                                'font-bold uppercase text-[10px] px-2 py-0.5 rounded',
                                item.transaction_type === 'RECEIPT' || item.transaction_type === 'opening_stock'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.transaction_type === 'ISSUE' || item.transaction_type === 'CONSUMPTION'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.transaction_type === 'WASTAGE' || item.transaction_type === 'wastage'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-100 text-slate-800'
                              )}
                            >
                              {item.transaction_type}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold">
                            <span className={item.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                              {item.quantity_change >= 0 ? `+${item.quantity_change}` : item.quantity_change} {item.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                            {item.balance_after} {item.unit}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            <div>{item.performed_by_name}</div>
                            {item.notes && <div className="text-[10px] text-slate-400 italic">{item.notes}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: LOW STOCK ALERTS */}
        {/* ========================================================= */}
        {activeTab === 'low_stock' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Low Stock Reorder Dashboard
            </h3>

            {lowStockMaterials.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-500">
                <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                All inventory materials are currently stocked above their reorder safety thresholds.
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {lowStockMaterials.map((mat) => (
                  <Card key={mat.id} className="p-4 space-y-3 border-l-4 border-l-red-500 bg-red-50/20">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600">{mat.sku}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                        CRITICAL
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{mat.name}</h4>
                      {mat.name_bn && <div className="text-xs text-slate-500">{mat.name_bn}</div>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-white dark:bg-slate-900 rounded-lg border">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Available:</span>
                        <strong className="text-red-600 font-mono text-sm">
                          {mat.current_stock} {mat.unit}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Reorder Floor:</span>
                        <strong className="font-mono text-sm">
                          {mat.reorder_level || mat.min_stock_level} {mat.unit}
                        </strong>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedMaterialForAction(mat)
                        setIsReceiveStockOpen(true)
                      }}
                      className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Reorder / Receive GRN
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODALS */}
        <ReceiveStockModal
          open={isReceiveStockOpen}
          onOpenChange={setIsReceiveStockOpen}
          materials={materials}
          locations={locations}
          selectedMaterialId={selectedMaterialForAction?.id}
          onSuccess={() => {
            showNotification('Stock received and added to inventory ledger.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <MaterialRequestModal
          open={isRequestOpen}
          onOpenChange={setIsRequestOpen}
          materials={materials}
          locations={locations}
          onSuccess={() => {
            showNotification('Material requisition submitted.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <MaterialIssueModal
          open={isIssueOpen}
          onOpenChange={setIsIssueOpen}
          materials={materials}
          locations={locations}
          request={selectedRequestForIssue}
          onSuccess={() => {
            showNotification('Material issued successfully.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <LogConsumptionModal
          open={isConsumptionOpen}
          onOpenChange={setIsConsumptionOpen}
          materials={materials}
          locations={locations}
          onSuccess={() => {
            showNotification('Consumption and remnants signed off.')
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
            showNotification('Stock transfer executed successfully.')
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
            showNotification('Physical count reconciliation applied.')
            loadAllData()
          }}
          companyId={companyId}
        />

        <NewLocationModal
          open={isNewLocationOpen}
          onOpenChange={setIsNewLocationOpen}
          onSuccess={() => {
            showNotification('Warehouse location created.')
            loadAllData()
          }}
          companyId={companyId}
        />
      </div>
    </FeatureGate>
  )
}
