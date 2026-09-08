'use client'

import React, { useState, use } from 'react'
import Link from 'next/link'
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

interface PriceHistoryPageProps {
  params: Promise<{ tenantSlug: string }>
}

export default function SupplierPriceHistoryPage({ params }: PriceHistoryPageProps) {
  const resolvedParams = use(params)
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

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
    <div className="space-y-6 max-w-6xl">
      {/* Back Link & Header */}
      <div>
        <Link
          href={`/${slug}/purchases`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white mb-3 bangla-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual('Back to Purchases', 'ক্রয় তালিকায় ফিরুন')}
        </Link>

        <PageHeader
          titleEn="Supplier Price History & Market Intelligence"
          titleBn="মহাজনদের দর ইতিহাস ও অ্যানালিটিক্স"
          descriptionEn="Historical purchase costs across vendors, tracking price shifts, volume discounts, and lowest procurement ceilings."
          descriptionBn="বিভিন্ন মহাজনের ঐতিহাসিক ক্রয়মূল্য, মূল্য পরিবর্তন ট্র্যাকিং এবং সুলভ রেট যাচাই।"
          icon={TrendingUp}
          iconColor="text-blue-600"
        />
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
            <Card key={matId} className="p-4 border-slate-200 dark:border-slate-800">
              <span className="font-mono text-[10px] uppercase text-blue-600 font-bold block truncate">
                {matId.toUpperCase()}
              </span>
              <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-0.5 truncate">
                {matName}
              </h4>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px]">Last Paid:</span>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    ৳ {formatBDT(lastPrice)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Average:</span>
                  <div className="font-mono font-bold text-blue-600">
                    ৳ {formatBDT(avg)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Lowest:</span>
                  <div className="font-mono font-bold text-emerald-600">
                    ৳ {formatBDT(lowest)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Highest:</span>
                  <div className="font-mono font-bold text-red-600">
                    ৳ {formatBDT(highest)}
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
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by material name or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="h-9 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
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

      {/* Price History Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base">Procurement Price Audit Trail ({filtered.length})</CardTitle>
          <CardDescription className="text-xs">
            Historical invoice prices paid to vendors across procurement POs.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No supplier price history records available.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const diff = item.previous_price ? item.purchase_price - item.previous_price : 0
                  const isIncreased = diff > 0

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono text-slate-500">{item.po_date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        {item.material_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {item.supplier_name}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium">
                        {item.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ৳ {formatBDT(item.purchase_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        {item.previous_price ? `৳ ${formatBDT(item.previous_price)}` : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {item.previous_price ? (
                          <span
                            className={`inline-flex items-center gap-0.5 font-bold ${
                              isIncreased ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {isIncreased ? (
                              <ArrowUpRight className="h-3 w-3" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3" />
                            )}
                            {isIncreased ? `+৳ ${diff}` : `-৳ ${Math.abs(diff)}`}
                          </span>
                        ) : (
                          <span className="text-slate-400">Baseline</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}
