'use client'

import React, { useState } from 'react'
import {
  Tag,
  Search,
  Sliders,
  TrendingUp,
  Percent,
  Check,
  Edit2,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import type { ProductRecord } from '@/types/product.types'
import { formatBDT } from '@/lib/formatters'
import { CUSTOMER_TYPES_META, PricingCustomerType } from '@/types/pricing.types'

interface PricingMatrixTableProps {
  products: ProductRecord[]
  onOpenEditProductPrice: (product: ProductRecord) => void
  tenantSlug: string
}

export function PricingMatrixTable({
  products = [],
  onOpenEditProductPrice,
  tenantSlug,
}: PricingMatrixTableProps) {
  const { tBilingual } = useI18n()

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const safeProducts = Array.isArray(products) ? products : []
  const categories = Array.from(new Set(safeProducts.map((p) => p.category).filter(Boolean)))

  const filteredProducts = safeProducts.filter((p) => {
    const q = search.toLowerCase()
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      (p.name_bn && p.name_bn.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))

    const matchCat = selectedCategory === 'all' || p.category === selectedCategory
    return matchSearch && matchCat
  })

  return (
    <Card className="rounded-xl shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Header & Filter Bar */}
      <CardHeader className="py-3 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
              {tBilingual('Commercial Customer-Type Pricing Matrix', 'গ্রাহক ক্যাটাগরি ভিত্তিক মূল্য তালিকা')}
            </CardTitle>
            <CardDescription className="text-xs">
              {tBilingual(
                'Cross-tabulated pricing comparison across Retail, Reseller, Corporate, Agency, Government & Regular tiers.',
                'খুচরা, রিসেলার, কর্পোরেট, এজেন্সি ও সরকারি রেট তুলনা।'
              )}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder={tBilingual('Filter by product name, SKU...', 'পণ্যের নাম বা কোড দিয়ে খুঁজুন...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-xs h-8"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">{tBilingual('All Categories', 'সকল ক্যাটাগরি')}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      {/* Table Content */}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 dark:bg-slate-900/90 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 min-w-[200px]">{tBilingual('Product / Service', 'পণ্য / সেবা')}</th>
                <th className="py-3 px-3 text-center">{tBilingual('Base Cost', 'মূল খরচ')}</th>
                <th className="py-3 px-3 text-center text-emerald-700 dark:text-emerald-400">
                  {tBilingual('Retail', 'খুচরা')}
                </th>
                <th className="py-3 px-3 text-center text-blue-700 dark:text-blue-400">
                  {tBilingual('Reseller', 'রিসেলার')}
                </th>
                <th className="py-3 px-3 text-center text-purple-700 dark:text-purple-400">
                  {tBilingual('Corporate', 'কর্পোরেট')}
                </th>
                <th className="py-3 px-3 text-center text-amber-700 dark:text-amber-400">
                  {tBilingual('Agency', 'এজেন্সি')}
                </th>
                <th className="py-3 px-3 text-center text-rose-700 dark:text-rose-400">
                  {tBilingual('Govt', 'সরকারি')}
                </th>
                <th className="py-3 px-4 text-right">{tBilingual('Action', 'অ্যাকশন')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredProducts.map((p) => {
                const baseSell = Number(p.selling_price) || Number((p as any).base_price) || 0
                const baseCost = Number(p.base_cost) || Number((p as any).cost_price) || 0
                const tiers = (p.price_tiers as any) || {}

                const retailPrice = tiers.retail ?? baseSell
                const resellerPrice = tiers.reseller ?? (baseSell > 0 ? Math.round(baseSell * 0.85) : 0)
                const corporatePrice = tiers.corporate ?? (baseSell > 0 ? Math.round(baseSell * 0.9) : 0)
                const agencyPrice = tiers.agency ?? (baseSell > 0 ? Math.round(baseSell * 0.88) : 0)
                const govtPrice = tiers.government ?? (baseSell > 0 ? Math.round(baseSell * 0.95) : 0)

                const marginPct =
                  baseSell > 0 && baseCost > 0
                    ? Math.round(((baseSell - baseCost) / baseSell) * 100)
                    : null

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors"
                  >
                    {/* Name & Unit */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">{p.name}</div>
                      {p.name_bn && (
                        <div className="text-2xs text-teal-700 dark:text-teal-400 font-medium bangla-text">
                          {p.name_bn}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-2xs text-slate-400 font-mono mt-0.5">
                        <span className="uppercase">{p.unit || 'sft'}</span>
                        {p.category && <span>• {p.category}</span>}
                        {marginPct !== null && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                            • {marginPct}% margin
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-3 px-3 text-center font-mono text-slate-500">
                      {baseCost > 0 ? formatBDT(baseCost) : '—'}
                    </td>

                    {/* Retail */}
                    <td className="py-3 px-3 text-center font-mono font-black text-emerald-700 dark:text-emerald-400">
                      {formatBDT(retailPrice)}
                    </td>

                    {/* Reseller */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 dark:text-blue-400">
                      {formatBDT(resellerPrice)}
                    </td>

                    {/* Corporate */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-purple-700 dark:text-purple-400">
                      {formatBDT(corporatePrice)}
                    </td>

                    {/* Agency */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-700 dark:text-amber-400">
                      {formatBDT(agencyPrice)}
                    </td>

                    {/* Govt */}
                    <td className="py-3 px-3 text-center font-mono font-bold text-rose-700 dark:text-rose-400">
                      {formatBDT(govtPrice)}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenEditProductPrice(p)}
                        className="h-7 px-2.5 text-xs font-bold text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 bg-teal-50/50 hover:bg-teal-100/70"
                      >
                        <Edit2 className="h-3 w-3 mr-1 text-teal-600" />
                        {tBilingual('Edit Rates', 'দর পরিবর্তন')}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
