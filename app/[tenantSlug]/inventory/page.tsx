'use client'

import React, { useState } from 'react'
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
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { Crown } from 'lucide-react'
import {
  MaterialRecord,
  MaterialCategory,
  MaterialUnit,
  InventoryTransactionType,
  StockLedgerRecord,
  MaterialWastageRecord,
} from '@/types/inventory.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'

export default function InventoryDashboardPage() {
  const { company } = useTenant()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, usage, refreshUsage } = useSubscription()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [materials, setMaterials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')

  const productCheck = checkCanCreate('max_products')

  const handleOpenNewMaterial = () => {
    if (!productCheck.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    setIsNewOpen(true)
  }


  // Modals
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [selectedMaterialForTx, setSelectedMaterialForTx] = useState<MaterialRecord | null>(null)
  const [selectedMaterialForWastage, setSelectedMaterialForWastage] = useState<MaterialRecord | null>(null)
  const [notification, setNotification] = useState<string | null>(null)

  // Transaction Form State
  const [txType, setTxType] = useState<InventoryTransactionType>('purchase')
  const [txQty, setTxQty] = useState<number>(1)
  const [txUnitCost, setTxUnitCost] = useState<number>(0)
  const [txRef, setTxRef] = useState('')
  const [txNotes, setTxNotes] = useState('')

  // Wastage Form State
  const [wasteExpected, setWasteExpected] = useState<number>(0)
  const [wasteActual, setWasteActual] = useState<number>(0)
  const [wasteReason, setWasteReason] = useState('')

  // New Material Form State
  const [newSku, setNewSku] = useState('')
  const [newName, setNewName] = useState('')
  const [newNameBn, setNewNameBn] = useState('')
  const [newCat, setNewCat] = useState<MaterialCategory>('roll_media')
  const [newUnit, setNewUnit] = useState<MaterialUnit>('roll')
  const [newIsRoll, setNewIsRoll] = useState(true)
  const [newWidth, setNewWidth] = useState<number>(0)
  const [newLength, setNewLength] = useState<number>(0)
  const [newCost, setNewCost] = useState<number>(0)
  const [newMinStock, setNewMinStock] = useState<number>(0)
  const [newCoverageRate, setNewCoverageRate] = useState<number>(0)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Filtered materials
  const filtered = materials.filter((m: MaterialRecord) => {
    const matchCat = selectedCategory === 'all' || m.category === selectedCategory
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.sku.toLowerCase().includes(search.toLowerCase()) ||
      (m.name_bn && m.name_bn.includes(search))

    return matchCat && matchSearch
  })

  // Executive Valuation & Analytics
  const totalValuation = materials.reduce((acc: number, m: MaterialRecord) => acc + m.current_stock * m.average_cost, 0)
  const lowStockCount = materials.filter((m: MaterialRecord) => m.current_stock <= m.min_stock_level).length
  const mountedRolls = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MOUNTED_ROLLS) || []
  const totalMountedArea = mountedRolls.reduce((acc: number, r: any) => acc + (r.remaining_area_sft || 0), 0)

  // Handle Record Transaction
  const handleRecordTransaction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterialForTx) return

    const isNegative = txType === 'consumption' || txType === 'wastage' || txType === 'return'
    const qtyChange = isNegative ? -Math.abs(txQty) : Math.abs(txQty)
    const newStock = Math.max(0, selectedMaterialForTx.current_stock + qtyChange)

    PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, selectedMaterialForTx.id, {
      current_stock: newStock,
      last_purchase_price: txType === 'purchase' ? txUnitCost : selectedMaterialForTx.last_purchase_price,
      updated_at: new Date().toISOString(),
    })

    const ledgerEntry: StockLedgerRecord = {
      id: `stl-${Date.now()}`,
      company_id: 'c-01',
      material_id: selectedMaterialForTx.id,
      material_name: selectedMaterialForTx.name,
      transaction_type: txType,
      quantity_change: qtyChange,
      balance_after: newStock,
      unit: selectedMaterialForTx.unit,
      unit_cost: txUnitCost || selectedMaterialForTx.average_cost,
      total_cost: (txUnitCost || selectedMaterialForTx.average_cost) * Math.abs(txQty),
      reference_id: txRef || `TX-${Date.now().toString().slice(-4)}`,
      performed_by_name: 'Inventory Manager',
      notes: txNotes || `${txType.toUpperCase()} of ${Math.abs(txQty)} ${selectedMaterialForTx.unit}`,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<StockLedgerRecord>(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)

    setSelectedMaterialForTx(null)
    showNotification(
      `Transaction recorded: ${txType.toUpperCase()} of ${Math.abs(txQty)} ${
        selectedMaterialForTx.unit
      }. New stock balance: ${newStock}.`
    )
  }

  // Handle Log Wastage
  const handleLogWastage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMaterialForWastage) return

    const wasted = Math.max(0, wasteActual - wasteExpected)
    const newStock = Math.max(0, selectedMaterialForWastage.current_stock - 1)

    PrintERPDataStore.updateItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, selectedMaterialForWastage.id, {
      current_stock: newStock,
      updated_at: new Date().toISOString(),
    })

    const ledgerEntry: StockLedgerRecord = {
      id: `stl-${Date.now()}`,
      company_id: 'c-01',
      material_id: selectedMaterialForWastage.id,
      material_name: selectedMaterialForWastage.name,
      transaction_type: 'wastage',
      quantity_change: -1,
      balance_after: newStock,
      unit: selectedMaterialForWastage.unit,
      unit_cost: selectedMaterialForWastage.average_cost,
      total_cost: selectedMaterialForWastage.average_cost * 1,
      reference_id: `WASTE-${Date.now().toString().slice(-4)}`,
      performed_by_name: 'Floor Operator',
      notes: `Scrap write-off: ${wasteReason || 'Excess offcut waste'}`,
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<StockLedgerRecord>(STORAGE_KEYS.STOCK_LEDGER, ledgerEntry)

    setSelectedMaterialForWastage(null)
    showNotification(
      `Material scrap registered: ${wasted} SFT logged with reason: "${wasteReason || 'Standard trim offcut'}".`
    )
  }

  // Handle Create Material
  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    if (!productCheck.allowed) {
      openLimitExceededModal('max_products')
      return
    }
    const rollArea = newIsRoll ? newWidth * newLength : undefined

    const newMat: MaterialRecord = {
      id: `mat-${Date.now()}`,
      company_id: 'c-01',
      sku: newSku || `MAT-${Date.now().toString().slice(-4)}`,
      name: newName,
      name_bn: newNameBn,
      category: newCat,
      unit: newUnit,
      is_roll: newIsRoll,
      roll_width_ft: newIsRoll ? newWidth : undefined,
      roll_length_ft: newIsRoll ? newLength : undefined,
      total_roll_area_sft: rollArea,
      current_stock: 5,
      min_stock_level: newMinStock,
      coverage_rate_sft_per_unit: newCat === 'ink_chemistry' ? newCoverageRate : undefined,
      last_purchase_price: newCost,
      average_cost: newCost,
      manual_cost: newCost,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, newMat)
    refreshUsage()
    setIsNewOpen(false)
    setNewSku('')
    setNewName('')
    setNewNameBn('')
    showNotification(`New raw material '${newMat.name}' registered into inventory.`)
  }

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Inventory & Raw Materials Hub"
        titleBn="কাঁচামাল ও স্টক ব্যবস্থাপনা"
        descriptionEn="Roll media area accounting, configurable ink coverage rates, immutable stock ledger, and scrap auditing."
        descriptionBn="রোল মিডিয়া স্কয়ার ফিট হিসাব, কালি ব্যবহার পর্যবেক্ষণ, অপরিবর্তনীয় স্টক লেজার ও অপচয় নিরীক্ষা।"
        icon={Package}
        iconColor="text-emerald-600"
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/${slug}/inventory/rolls`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                <Disc className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                {tBilingual('Active Mounted Rolls', 'মাউন্টেড রোল')}
              </Button>
            </Link>

            <Link href={`/${slug}/inventory/ledger`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                <History className="mr-1.5 h-3.5 w-3.5 text-purple-600" />
                {tBilingual('Stock Ledger', 'স্টক লেজার')}
              </Button>
            </Link>

            <Button
              size="sm"
              onClick={handleOpenNewMaterial}
              disabled={!productCheck.allowed}
              title={!productCheck.allowed ? productCheck.reason : undefined}
              className={cn("bg-emerald-600 hover:bg-emerald-700 text-xs text-white bangla-text", !productCheck.allowed && "opacity-60 cursor-not-allowed")}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Add Material', 'নতুন কাঁচামাল')}
            </Button>
          </div>
        }
      />

      {/* Inventory & Materials Quota Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'p-1.5 rounded-lg text-white font-bold shrink-0',
            productCheck.exceeded ? 'bg-red-500' : productCheck.warning ? 'bg-amber-500' : 'bg-emerald-600'
          )}>
            <Package className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {productCheck.exceeded
                ? tBilingual(
                    `Plan Limit Reached: Your current plan allows up to ${currentPlan.max_products.toLocaleString()} Products quota (currently at ${materials.length}). Please upgrade your subscription to continue.`,
                    `প্ল্যান লিমিট পূর্ণ: আপনার বর্তমান প্ল্যানে সর্বোচ্চ ${toBengaliDigits(currentPlan.max_products)} প্রোডাক্ট কোটা অনুমোদিত (বর্তমানে ${toBengaliDigits(materials.length)})। চালিয়ে যেতে অনুগ্রহ করে সাবস্ক্রিপশন আপগ্রেড করুন।`
                  )
                : tBilingual(
                    `Inventory SKU Quota: ${materials.length} of ${currentPlan.max_products.toLocaleString()} materials registered`,
                    `ইনভেন্টরি আইটেম কোটা: ${toBengaliDigits(currentPlan.max_products)} টির মধ্যে ${toBengaliDigits(materials.length)} টি কাঁচামাল নিবন্ধিত`
                  )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bangla-text">
              {productCheck.exceeded
                ? tBilingual('Inventory SKU capacity reached. Upgrade plan to register more materials.', 'আইটেমের ধারণক্ষমতা পূর্ণ হয়েছে। অতিরিক্ত প্রোডাক্ট যোগ করতে প্ল্যান আপগ্রেড করুন।')
                : tBilingual(`Active on ${currentPlan.name}.`, `${currentPlan.name_bn}-এ অন্তর্ভুক্ত।`)}
            </p>
          </div>
        </div>

        {currentPlan.code !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUpgradeModal('business')}
            className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 bangla-text shrink-0"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Expand Catalog Limit', 'ক্যাটালগ বৃদ্ধি')}
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

      {/* Valuation & KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-emerald-600">
          <span className="text-xs font-semibold text-slate-500">Total Inventory Asset Valuation</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            <CurrencyDisplay amount={totalValuation} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Weighted Average Cost Method</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">Mounted Rolls (Active on Presses)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {mountedRolls.length} Rolls
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {totalMountedArea} SFT remaining on presses
          </span>
        </Card>

        <Card className={`p-4 border-l-4 ${lowStockCount > 0 ? 'border-l-red-500 bg-red-50/20 dark:bg-red-950/10' : 'border-l-slate-300'}`}>
          <span className="text-xs font-semibold text-slate-500">Low Stock Reorder Alerts</span>
          <div className="text-2xl font-black text-red-600 mt-1">{lowStockCount}</div>
          <span className="text-[11px] text-red-600 font-medium">Below minimum floor threshold</span>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Ink Coverage Calibration</span>
          <div className="text-2xl font-black text-amber-600 mt-1">850 SFT / L</div>
          <span className="text-[11px] text-slate-400">Company-configured coverage</span>
        </Card>
      </div>

      {/* Search & Category Tabs */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by SKU, material name, Bengali description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'roll_media', label: 'Roll Media' },
              { id: 'rigid_sheet', label: 'Rigid Sheets' },
              { id: 'metal_framing', label: 'Metals & Pipes' },
              { id: 'led_electrical', label: 'LED & Power' },
              { id: 'ink_chemistry', label: 'Inks & Solvents' },
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
            <CardTitle className="text-base">Materials Catalog ({filtered.length})</CardTitle>
            <span className="text-xs text-slate-400">Active stock balances & valuation</span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">SKU & Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Roll Area / Coverage</th>
                <th className="py-3 px-4">Unit Cost (Avg)</th>
                <th className="py-3 px-4">Asset Value</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((mat: MaterialRecord) => {
                const isLow = mat.current_stock <= mat.min_stock_level
                const valuation = mat.current_stock * mat.average_cost

                return (
                  <tr key={mat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                    {/* SKU & Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {mat.sku}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white text-xs mt-0.5">
                        {mat.name}
                      </div>
                      {mat.name_bn && (
                        <div className="text-[11px] text-slate-400 font-normal">{mat.name_bn}</div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {mat.category.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                          {mat.current_stock} {mat.unit}
                        </span>
                        {isLow && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            <AlertTriangle className="h-2.5 w-2.5" /> Low Stock
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">Min floor: {mat.min_stock_level} {mat.unit}</div>
                    </td>

                    {/* Roll Area / Coverage */}
                    <td className="py-3.5 px-4 text-xs font-mono">
                      {mat.is_roll && mat.total_roll_area_sft ? (
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200">
                            {mat.total_roll_area_sft} SFT / roll
                          </strong>
                          <div className="text-[11px] text-slate-400">
                            ({mat.roll_width_ft}ft × {mat.roll_length_ft}ft)
                          </div>
                        </div>
                      ) : mat.coverage_rate_sft_per_unit ? (
                        <div>
                          <strong className="text-amber-600">
                            {mat.coverage_rate_sft_per_unit} SFT / {mat.unit}
                          </strong>
                          <div className="text-[10px] text-slate-400">Configured coverage</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Standard unit</span>
                      )}
                    </td>

                    {/* Unit Cost */}
                    <td className="py-3.5 px-4 text-xs">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        <CurrencyDisplay amount={mat.average_cost} />
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {mat.valuation_method.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* Asset Value */}
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                      <CurrencyDisplay amount={valuation} />
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMaterialForTx(mat)
                            setTxUnitCost(mat.average_cost)
                          }}
                          className="h-7 text-[11px] px-2"
                        >
                          <ArrowDownUp className="h-3 w-3 mr-1" />
                          Stock Tx
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMaterialForWastage(mat)}
                          className="h-7 text-[11px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900"
                        >
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Wastage
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* MODAL: RECORD INVENTORY TRANSACTION */}
      <ModalDialog
        open={Boolean(selectedMaterialForTx)}
        onOpenChange={(open) => !open && setSelectedMaterialForTx(null)}
        title="Record Inventory Stock Transaction"
        description="Append an immutable transaction entry directly to the master stock ledger."
      >
        {selectedMaterialForTx && (
          <form onSubmit={handleRecordTransaction} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500">Material: </span>
              <strong>{selectedMaterialForTx.name}</strong> ({selectedMaterialForTx.sku})
              <div className="text-emerald-600 font-mono font-bold mt-0.5">
                Current On-Hand Balance: {selectedMaterialForTx.current_stock} {selectedMaterialForTx.unit}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="txTyp" required>Transaction Type</Label>
                <select
                  id="txTyp"
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as InventoryTransactionType)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
                >
                  <option value="purchase">Purchase (GRN Receive +)</option>
                  <option value="consumption">Job Consumption (-)</option>
                  <option value="adjustment">Audit Adjustment (+/-)</option>
                  <option value="return">Supplier Return (-)</option>
                  <option value="wastage">Shop Floor Scrap (-)</option>
                  <option value="transfer">Inter-Branch Transfer</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="txQ" required>Quantity ({selectedMaterialForTx.unit})</Label>
                <Input
                  id="txQ"
                  type="number"
                  step="0.1"
                  value={txQty}
                  onChange={(e) => setTxQty(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="txCost">Unit Cost (৳ BDT)</Label>
                <Input
                  id="txCost"
                  type="number"
                  value={txUnitCost}
                  onChange={(e) => setTxUnitCost(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="txRef">Reference ID (PO / Job #)</Label>
                <Input
                  id="txRef"
                  placeholder="e.g. PO-2024-099 or JOB-101-A"
                  value={txRef}
                  onChange={(e) => setTxRef(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="txNot">Audit Remarks</Label>
              <Input
                id="txNot"
                placeholder="e.g. Physical stock count verification."
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedMaterialForTx(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                Log Ledger Transaction
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: LOG MATERIAL WASTAGE */}
      <ModalDialog
        open={Boolean(selectedMaterialForWastage)}
        onOpenChange={(open) => !open && setSelectedMaterialForWastage(null)}
        title="Log Material Wastage & Scrap Audit"
        description="Record difference between job expected substrate usage vs actual consumption."
      >
        {selectedMaterialForWastage && (
          <form onSubmit={handleLogWastage} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
              <span className="text-red-600 font-bold">Material: </span>
              <strong>{selectedMaterialForWastage.name}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="wExp" required>Expected Usage ({selectedMaterialForWastage.unit})</Label>
                <Input
                  id="wExp"
                  type="number"
                  value={wasteExpected}
                  onChange={(e) => setWasteExpected(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wAct" required>Actual Consumed ({selectedMaterialForWastage.unit})</Label>
                <Input
                  id="wAct"
                  type="number"
                  value={wasteActual}
                  onChange={(e) => setWasteActual(Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="p-2.5 bg-slate-100 dark:bg-slate-900 rounded-lg text-xs font-mono flex justify-between">
              <span>Calculated Scrap / Wastage:</span>
              <strong className="text-red-600">
                {Math.max(0, wasteActual - wasteExpected)} {selectedMaterialForWastage.unit}
              </strong>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="wRsn" required>Wastage Root Cause Reason</Label>
              <textarea
                id="wRsn"
                rows={2}
                placeholder="e.g. Media wrinkle during feeding; 4-pass color test strips; offcut margin trim."
                value={wasteReason}
                onChange={(e) => setWasteReason(e.target.value)}
                required
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedMaterialForWastage(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Log Wastage Entry
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: ADD MATERIAL */}
      <ModalDialog
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
        title="Add New Raw Material to Inventory"
        description="Configure unit of measure, roll specifications, and ink coverage rates."
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mSku" required>SKU Code</Label>
              <Input
                id="mSku"
                placeholder="e.g. MAT-FLX-05"
                value={newSku}
                onChange={(e) => setNewSku(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mCat" required>Category</Label>
              <select
                id="mCat"
                value={newCat}
                onChange={(e) => {
                  const cat = e.target.value as MaterialCategory
                  setNewCat(cat)
                  setNewIsRoll(cat === 'roll_media')
                }}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="roll_media">Roll Media (Flex, Vinyl)</option>
                <option value="rigid_sheet">Rigid Sheet (Acrylic, PVC)</option>
                <option value="metal_framing">Metal & Framing (MS Pipe)</option>
                <option value="led_electrical">LED & Electrical</option>
                <option value="ink_chemistry">Inks & Chemistry</option>
                <option value="hardware_accessories">Hardware & Fasteners</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mName" required>Material Name</Label>
            <Input
              id="mName"
              placeholder="e.g. Star Flex 380g Frontlit Solvent Roll"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mNameBn">Bengali Name (বাংলা নাম)</Label>
            <Input
              id="mNameBn"
              placeholder="e.g. স্টার ফ্লেক্স ৩৮০ গ্রাম ফ্রন্টলিট রোল"
              value={newNameBn}
              onChange={(e) => setNewNameBn(e.target.value)}
            />
          </div>

          {newIsRoll && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2 text-xs">
              <span className="font-bold text-blue-900 dark:text-blue-200">Roll Dimensions (SFT Accounting):</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="rw">Width (ft)</Label>
                  <Input
                    id="rw"
                    type="number"
                    value={newWidth}
                    onChange={(e) => setNewWidth(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="rl">Length (ft)</Label>
                  <Input
                    id="rl"
                    type="number"
                    value={newLength}
                    onChange={(e) => setNewLength(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label>Total Area</Label>
                  <div className="h-10 px-2 flex items-center bg-white dark:bg-slate-900 rounded border font-mono font-bold">
                    {newWidth * newLength} SFT
                  </div>
                </div>
              </div>
            </div>
          )}

          {newCat === 'ink_chemistry' && (
            <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5 text-xs">
              <Label htmlFor="covRate" required>Configurable Ink Coverage (SFT / Liter)</Label>
              <Input
                id="covRate"
                type="number"
                value={newCoverageRate}
                onChange={(e) => setNewCoverageRate(Number(e.target.value))}
              />
              <span className="text-[11px] text-amber-700 dark:text-amber-400">
                Company configured yield based on press pass count and droplet volume.
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mCost" required>Standard Cost (৳ BDT)</Label>
              <Input
                id="mCost"
                type="number"
                value={newCost}
                onChange={(e) => setNewCost(Number(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mMin" required>Min Stock Level Alert</Label>
              <Input
                id="mMin"
                type="number"
                value={newMinStock}
                onChange={(e) => setNewMinStock(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!productCheck.allowed}
              className={cn("bg-emerald-600 hover:bg-emerald-700 text-white", !productCheck.allowed && "opacity-60 cursor-not-allowed")}
            >
              Save Material
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  </FeatureGate>
  )
}
