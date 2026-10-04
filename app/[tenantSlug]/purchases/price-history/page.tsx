'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
 TrendingUp,
 ArrowLeft,
 Search,
 Building,
 Calendar,
 Layers,
 Sparkles,
 ArrowDownRight,
 ArrowUpRight,
 Filter,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import { SupplierPriceHistoryRecord } from '@/types/purchase.types'
import { formatBDT } from '@/lib/formatters'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'

export default function SupplierPriceHistoryPage() {
 const params = useParams()
 const pathname = usePathname()
 const { company } = useTenant()
 const { locale, tBilingual } = useI18n()
 const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

 const [history] = useDataStore<SupplierPriceHistoryRecord[]>(STORAGE_KEYS.PRICE_HISTORY, [])
 const [search, setSearch] = useState('')
 const [selectedMaterial, setSelectedMaterial] = useState<string>('all')

 const filtered = history.filter((h) => {
 const matchMat = selectedMaterial === 'all' || h.material_id === selectedMaterial
 const matchSearch =
 h.material_name.toLowerCase().includes(search.toLowerCase()) ||
 h.supplier_name.toLowerCase().includes(search.toLowerCase())

 return matchMat && matchSearch
  })

  // Material benchmark metrics
 const uniqueMaterials = Array.from(new Set(history.map((h) => h.material_id)))

 return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
 href={getTenantNavHref('/inventory?view=purchases', pathname, slug)}
 className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground dark:hover:text-foreground mb-3 bangla-text">
          <ArrowLeft className="h-3.5 w-3.5"/>
          {tBilingual('Back to Purchases', 'ক্রয় তালিকায় ফিরুন')}
        </Link>

        <PageHeader
 titleEn="Supplier Price History"titleBn="মহাজনদের দর ইতিহাস ও অ্যানালিটিক্স"descriptionEn="Historical purchase costs across vendors, tracking price shifts, volume discounts, and lowest procurement ceilings."descriptionBn="বিভিন্ন মহাজনের ঐতিহাসিক ক্রয়মূল্য, মূল্য পরিবর্তন ট্র্যাকিং এবং সুলভ রেট যাচাই।"icon={TrendingUp}
 iconColor="text-primary"/>
      </div>

      {/* Material Benchmarks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {uniqueMaterials.slice(0, 3).map((matId) => {
 const matRecords = history.filter((h) => h.material_id === matId)
 const matName = matRecords[0].material_name
 const prices = matRecords.map((r) => r.purchase_price)
 const lastPrice = matRecords[0].purchase_price
 const lowest = Math.min(...prices)
 const highest = Math.max(...prices)
 const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

 return (
            <Card key={matId} className="p-4 border-border">
              <span className="tabular-nums text-xs uppercase text-primary font-bold block truncate">
                {matId.toUpperCase()}
              </span>
              <h4 className="font-bold text-xs text-foreground mt-0.5 truncate">
                {matName}
              </h4>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border text-xs">
                <div>
                  <span className="text-muted-foreground text-xs">Last Paid:</span>
                  <div className="tabular-nums font-bold text-foreground">
                    {formatBDT(lastPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Average:</span>
                  <div className="tabular-nums font-bold text-primary">
                    {formatBDT(avg)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Lowest:</span>
                  <div className="tabular-nums font-bold text-success">
                    {formatBDT(lowest)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs">Highest:</span>
                  <div className="tabular-nums font-bold text-destructive">
                    {formatBDT(highest)}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Filter and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
 placeholder="Search by material name or supplier..."value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 text-xs"/>
          </div>

          <div className="flex items-center gap-2">
            <select
 value={selectedMaterial}
 onChange={(e) => setSelectedMaterial(e.target.value)}
 className="h-9 px-3 rounded-md border border-input bg-card text-xs font-semibold">
              <option value="all">All Materials</option>
              {uniqueMaterials.map((mId) => (
                <option key={mId} value={mId}>
                  {history.find((h) => h.material_id === mId)?.material_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Price History Table & Mobile Cards */}
      <Card>
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-base">Procurement Price Audit Trail ({filtered.length})</CardTitle>
          <CardDescription className="text-xs">
 Historical invoice prices paid to vendors across procurement POs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">PO Date</th>
                  <th className="py-3 px-4">Material</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4 text-right">Purchase Price (৳)</th>
                  <th className="py-3 px-4 text-right">Previous Price</th>
                  <th className="py-3 px-4 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border dark:divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
 No supplier price history records available.
                    </td>
                  </tr>
                ) : (
 filtered.map((item) => {
 const diff = item.previous_price ? item.purchase_price - item.previous_price : 0
 const isIncreased = diff > 0

 return (
                      <tr key={item.id} className="hover:bg-muted">
                        <td className="py-3 px-4 tabular-nums text-muted-foreground">{item.po_date}</td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {item.material_name}
                        </td>
                        <td className="py-3 px-4 text-foreground">
                          {item.supplier_name}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-medium">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums font-bold text-foreground">
                          {formatBDT(item.purchase_price)}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-muted-foreground">
                          {item.previous_price ? formatBDT(item.previous_price) : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-right tabular-nums text-xs">
                          {item.previous_price ? (
                            <span
 className={`inline-flex items-center gap-0.5 font-bold ${
 isIncreased ? 'text-destructive' : 'text-success'
                              }`}
                            >
                              {isIncreased ? (
                                <ArrowUpRight className="h-3 w-3"/>
                              ) : (
                                <ArrowDownRight className="h-3 w-3"/>
                              )}
                              {isIncreased ? `+৳ ${diff}` : `-৳ ${Math.abs(diff)}`}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Baseline</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border dark:divide-border">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs">
 No supplier price history records available.
              </div>
            ) : (
 filtered.map((item) => {
 const diff = item.previous_price ? item.purchase_price - item.previous_price : 0
 const isIncreased = diff > 0

 return (
                  <div key={item.id} className="p-4 space-y-2 text-xs bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-foreground text-sm">{item.material_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building className="h-3 w-3 text-muted-foreground"/> {item.supplier_name}
                        </div>
                      </div>
                      <span className="tabular-nums text-xs text-muted-foreground shrink-0">{item.po_date}</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted tabular-nums">
                      <div>
                        <div className="text-xs text-muted-foreground">Qty: {item.quantity}</div>
                        <div className="text-sm font-black text-foreground">
                          {formatBDT(item.purchase_price)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
 Prev: {item.previous_price ? formatBDT(item.previous_price) : 'N/A'}
                        </div>
                        {item.previous_price ? (
                          <span
 className={`inline-flex items-center gap-0.5 font-bold text-xs ${
 isIncreased ? 'text-destructive' : 'text-success'
                            }`}
                          >
                            {isIncreased ? <ArrowUpRight className="h-3 w-3"/> : <ArrowDownRight className="h-3 w-3"/>}
                            {isIncreased ? `+৳ ${diff}` : `-৳ ${Math.abs(diff)}`}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Baseline</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
