'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  ArrowLeft,
  Plus,
  ArrowDownUp,
  MapPin,
  History,
  Scissors,
  AlertTriangle,
  Layers,
  Sparkles,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  MaterialRecord,
  InventoryLocationRecord,
  InventoryStockBalanceRecord,
  InventoryRemnantRecord,
  StockLedgerRecord,
} from '@/types/inventory.types'
import { InventoryService } from '@/services/inventory.service'
import { ReceiveStockModal } from '@/components/inventory/receive-stock-modal'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { cn } from '@/lib/utils'

export default function MaterialDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'
  const companyId = company?.id || 'default'
  const materialId = params.id as string

  const [material, setMaterial] = useState<MaterialRecord | null>(null)
  const [locations, setLocations] = useState<InventoryLocationRecord[]>([])
  const [balances, setBalances] = useState<InventoryStockBalanceRecord[]>([])
  const [remnants, setRemnants] = useState<InventoryRemnantRecord[]>([])
  const [ledger, setLedger] = useState<StockLedgerRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [isReceiveOpen, setIsReceiveOpen] = useState(false)
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false)

  const loadData = async () => {
    if (!materialId || !companyId) return
    setLoading(true)
    try {
      const [mat, locs, bals, rems, led] = await Promise.all([
        InventoryService.getMaterialById(materialId, companyId),
        InventoryService.getLocations(companyId),
        InventoryService.getStockBalances(companyId, { materialId }),
        InventoryService.getRemnants(companyId, { materialId }),
        InventoryService.getStockLedger(companyId, materialId),
      ])

      setMaterial(mat)
      setLocations(locs)
      setBalances(bals)
      setRemnants(rems)
      setLedger(led)
    } catch (err) {
      console.error('Error loading material details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [materialId, companyId])

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading material details...
      </div>
    )
  }

  if (!material) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-slate-700">Material not found.</p>
        <Link href={`/${slug}/inventory`}>
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Inventory Hub
          </Button>
        </Link>
      </div>
    )
  }

  const isLowStock =
    Number(material.reorder_level || material.min_stock_level || 0) > 0 &&
    Number(material.current_stock || 0) <= Number(material.reorder_level || material.min_stock_level || 0)
  const valuation = Number(material.current_stock || 0) * Number(material.average_cost || 0)

  return (
    <FeatureGate feature="inventory">
      <div className="space-y-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={`/${slug}/inventory`}>
              <Button size="sm" variant="outline" className="h-9 w-9 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">{material.sku}</span>
                <Badge variant="outline" className="capitalize text-[10px]">
                  {material.category.replace('_', ' ')}
                </Badge>
                {isLowStock && (
                  <Badge className="bg-red-600 text-white text-[10px] animate-pulse">Low Stock Alert</Badge>
                )}
              </div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{material.name}</h1>
              {material.name_bn && <p className="text-xs text-slate-500 font-normal">{material.name_bn}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAdjustmentOpen(true)}
              className="text-xs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-amber-600" />
              Reconcile
            </Button>
            <Button
              size="sm"
              onClick={() => setIsReceiveOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Receive Stock
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-emerald-600">
            <span className="text-xs text-slate-500 font-semibold">Total Stock Available</span>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
              {material.current_stock} {material.unit}
            </div>
            <span className="text-[11px] text-slate-400">
              Reorder threshold: {material.reorder_level || material.min_stock_level} {material.unit}
            </span>
          </Card>

          <Card className="p-4 border-l-4 border-l-blue-600">
            <span className="text-xs text-slate-500 font-semibold">Asset Valuation</span>
            <div className="text-2xl font-black text-emerald-600 mt-1">
              <CurrencyDisplay amount={valuation} />
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Avg Cost: ৳ {material.average_cost} / {material.unit}
            </span>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-600">
            <span className="text-xs text-slate-500 font-semibold">Active Remnants</span>
            <div className="text-2xl font-black text-purple-600 mt-1">{remnants.length}</div>
            <span className="text-[11px] text-slate-400">Reusable offcut rolls/sheets</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-600">
            <span className="text-xs text-slate-500 font-semibold">Specifications</span>
            <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
              {material.thickness || 'Standard'} {material.color ? `(${material.color})` : ''}
            </div>
            <span className="text-[11px] text-slate-400">
              {material.brand ? `Brand: ${material.brand}` : 'Generic Spec'}
            </span>
          </Card>
        </div>

        {/* Location-wise Stock Balances */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" /> Location-wise Stock Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {balances.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No specific location balances recorded. Stock is currently tracked globally.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {balances.map((bal) => (
                  <div key={bal.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-slate-900 dark:text-white">
                        {bal.location?.location_name || 'Warehouse Location'}
                      </strong>
                      <div className="text-[11px] text-slate-400 font-mono">{bal.location?.location_code}</div>
                    </div>
                    <div className="font-mono font-bold text-sm text-emerald-600">
                      {bal.available_quantity} {bal.unit}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remnants Rack for this Material */}
        {remnants.length > 0 && (
          <Card className="border-purple-200 dark:border-purple-900">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                <Scissors className="h-4 w-4 text-purple-600" /> Reusable Remnants for this Substrate ({remnants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {remnants.map((rem) => (
                  <div key={rem.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">
                        {rem.remnant_code}
                      </span>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {rem.width} × {rem.length} {rem.dimension_unit} ({rem.area_sft || rem.width * rem.length} SFT)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">
                        {rem.condition}
                      </Badge>
                      <Badge className="bg-emerald-600 text-white text-[10px] uppercase">{rem.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction History / Stock Ledger */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-slate-600" /> Stock Movement History ({ledger.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledger.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No stock movement recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900 font-semibold text-slate-500 border-b">
                    <tr>
                      <th className="py-2.5 px-4">Date & Time</th>
                      <th className="py-2.5 px-4">Event Type</th>
                      <th className="py-2.5 px-4">Change</th>
                      <th className="py-2.5 px-4">Balance After</th>
                      <th className="py-2.5 px-4">Performed By / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4 text-slate-500">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-bold uppercase">{l.transaction_type}</td>
                        <td className="py-2.5 px-4 font-mono font-bold">
                          <span className={l.quantity_change >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                            {l.quantity_change >= 0 ? `+${l.quantity_change}` : l.quantity_change} {l.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {l.balance_after} {l.unit}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          <div>{l.performed_by_name}</div>
                          {l.notes && <div className="text-[10px] text-slate-400 italic">{l.notes}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modals */}
        <ReceiveStockModal
          open={isReceiveOpen}
          onOpenChange={setIsReceiveOpen}
          materials={[material]}
          locations={locations}
          selectedMaterialId={material.id}
          onSuccess={loadData}
          companyId={companyId}
        />

        <StockAdjustmentModal
          open={isAdjustmentOpen}
          onOpenChange={setIsAdjustmentOpen}
          materials={[material]}
          locations={locations}
          selectedMaterial={material}
          onSuccess={loadData}
          companyId={companyId}
        />
      </div>
    </FeatureGate>
  )
}
