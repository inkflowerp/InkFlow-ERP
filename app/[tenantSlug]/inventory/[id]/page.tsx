'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
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
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { PageContainer } from '@/components/ui/page-container'
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
import { getMaterialDetailsAction } from '@/actions/inventory.actions'
import { ReceiveStockModal } from '@/components/inventory/receive-stock-modal'
import { StockAdjustmentModal } from '@/components/inventory/stock-adjustment-modal'
import { getMaterialWarehouseStockBreakdown } from '@/lib/units'
import { cn } from '@/lib/utils'

export default function MaterialDetailPage() {
 const params = useParams()
 const router = useRouter()
 const pathname = usePathname()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = company?.slug || 'my-company'
 const companyId = company?.id || 'default'
 const materialId = params.id as string

 const [mounted, setMounted] = useState(false)
 useEffect(() => {
 setMounted(true)
  }, [])

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
 const res = await getMaterialDetailsAction(materialId, companyId)
 if (res.success && res.data) {
 const { material: mat, locations: locs, balances: bals, remnants: rems, ledger: led } = res.data
 setMaterial(mat)
 setLocations(locs)
 setBalances(bals)
 setRemnants(rems)
 setLedger(led)
      }
    } catch (err) {
 console.error('Error loading material details:', err)
    } finally {
 setLoading(false)
    }
  }

 useEffect(() => {
 loadData()
  }, [materialId, companyId])

 if (!mounted || loading) {
 return (
      <div className="space-y-6 p-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3"/>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl"/>
          ))}
        </div>
        <div className="h-48 bg-muted rounded-xl"/>
      </div>
    )
  }

 if (!material) {
 return (
      <div className="p-8 text-center space-y-3">
        <p className="text-sm font-bold text-foreground">Material not found.</p>
        <Link href={getTenantNavHref('/inventory', pathname, slug)}>
          <Button size="sm"variant="outline">
            <ArrowLeft className="h-4 w-4 mr-1"/> Back to Inventory Hub
          </Button>
        </Link>
      </div>
    )
  }

 const isLowStock =
 Number(material.reorder_level || material.min_stock_level || 0) > 0 &&
 Number(material.current_stock || 0) <= Number(material.reorder_level || material.min_stock_level || 0)
  
 const breakdown = getMaterialWarehouseStockBreakdown(material)

 return (
    <FeatureGate feature="inventory">
      <PageContainer className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href={getTenantNavHref('/inventory', pathname, slug)}>
              <Button size="sm"variant="outline"className="h-9 w-9 p-0">
                <ArrowLeft className="h-4 w-4"/>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-black text-foreground">{material.name}</h1>
              {material.name_bn && <p className="text-xs text-muted-foreground font-normal">{material.name_bn}</p>}
              <div className="flex items-center gap-2 mt-1">
                <span className="tabular-nums text-xs text-muted-foreground font-medium">SKU: {material.sku}</span>
                <Badge variant="outline"className="capitalize text-xs">
                  {material.category.replace('_', ' ')}
                </Badge>
                {isLowStock && (
                  <Badge className="bg-destructive text-destructive-foreground text-xs animate-pulse">Low Stock Alert</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
 size="sm"variant="outline"onClick={() => setIsAdjustmentOpen(true)}
 className="text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1 text-warning"/>
 Reconcile
            </Button>
            <Button
 size="sm"onClick={() => setIsReceiveOpen(true)}
 className="bg-success hover:bg-success/90 text-xs text-success-foreground font-semibold">
              <Plus className="h-3.5 w-3.5 mr-1"/>
 Receive Stock
            </Button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-success">
            <span className="text-xs text-muted-foreground font-semibold">Total Stock Available</span>
            <div className="text-2xl font-black text-foreground mt-1">
              {breakdown.purchase_unit_display || `${material.current_stock} ${material.unit}`}
            </div>
            {breakdown.consumption_unit_display && breakdown.purchase_unit_display !== breakdown.consumption_unit_display && (
              <span className="text-xs text-success font-semibold block mt-0.5">
                {breakdown.consumption_unit_display}
              </span>
            )}
            <span className="text-xs text-muted-foreground block mt-0.5">
 Reorder threshold: {material.reorder_level || material.min_stock_level || 0} {material.unit}
            </span>
          </Card>

          <Card className="p-4 border-l-4 border-l-primary">
            <span className="text-xs text-muted-foreground font-semibold">Asset Valuation</span>
            <div className="text-2xl font-black text-success mt-1">
              <CurrencyDisplay amount={breakdown.total_valuation} />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums block mt-0.5">
              {breakdown.cost_display_primary || `Avg Cost: ৳ ${material.average_cost} / ${material.unit}`}
            </span>
            {breakdown.cost_display_secondary && (
              <span className="text-xs text-muted-foreground font-sans block">
                {breakdown.cost_display_secondary}
              </span>
            )}
          </Card>

          <Card className="p-4 border-l-4 border-l-primary/60">
            <span className="text-xs text-muted-foreground font-semibold">Active Remnants</span>
            <div className="text-2xl font-black text-primary mt-1">{remnants.length}</div>
            <span className="text-xs text-muted-foreground">Reusable offcut rolls/sheets</span>
          </Card>

          <Card className="p-4 border-l-4 border-l-warning">
            <span className="text-xs text-muted-foreground font-semibold">Specifications</span>
            <div className="text-sm font-bold text-foreground mt-1">
              {material.thickness || 'Standard'} {material.color ? `(${material.color})` : ''}
            </div>
            <span className="text-xs text-muted-foreground">
              {material.brand ? `Brand: ${material.brand}` : 'Generic Spec'}
            </span>
          </Card>
        </div>

        {/* Location-wise Stock Balances */}
        <Card>
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-success"/> Location-wise Stock Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {balances.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
 No specific location balances recorded. Stock is currently tracked globally.
              </div>
            ) : (
              <div className="divide-y divide-border dark:divide-border">
                {balances.map((bal) => (
                  <div key={bal.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <strong className="text-foreground">
                        {bal.location?.location_name || 'Warehouse Location'}
                      </strong>
                      <div className="text-xs text-muted-foreground tabular-nums">{bal.location?.location_code}</div>
                    </div>
                    <div className="tabular-nums font-bold text-sm text-success">
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
          <Card className="border-primary/20">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                <Scissors className="h-4 w-4 text-primary"/> Reusable Remnants for this Substrate ({remnants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border dark:divide-border">
                {remnants.map((rem) => (
                  <div key={rem.id} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="tabular-nums text-primary font-bold">
                        {rem.remnant_code}
                      </span>
                      <div className="font-medium text-foreground">
                        {rem.width} × {rem.length} {rem.dimension_unit} ({rem.area_sft || rem.width * rem.length} SFT)
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline"className="capitalize text-xs">
                        {rem.condition}
                      </Badge>
                      <Badge className="bg-success-surface text-success border border-success-border text-xs uppercase">{rem.status}</Badge>
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
              <History className="h-4 w-4 text-muted-foreground"/> Stock Movement History ({ledger.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {ledger.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">No stock movement recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="py-2.5 px-4">Date & Time</th>
                      <th className="py-2.5 px-4">Event Type</th>
                      <th className="py-2.5 px-4">Change</th>
                      <th className="py-2.5 px-4">Balance After</th>
                      <th className="py-2.5 px-4">Performed By / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border dark:divide-border">
                    {ledger.map((l) => (
                      <tr key={l.id} className="hover:bg-muted">
                        <td className="py-2.5 px-4 text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                        <td className="py-2.5 px-4 font-bold uppercase">{l.transaction_type}</td>
                        <td className="py-2.5 px-4 tabular-nums font-bold">
                          <span className={l.quantity_change >= 0 ? 'text-success' : 'text-destructive'}>
                            {l.quantity_change >= 0 ? `+${l.quantity_change}` : l.quantity_change} {l.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums font-bold text-foreground">
                          {l.balance_after} {l.unit}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          <div>{l.performed_by_name}</div>
                          {l.notes && <div className="text-xs text-muted-foreground italic">{l.notes}</div>}
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
      </PageContainer>
    </FeatureGate>
  )
}
